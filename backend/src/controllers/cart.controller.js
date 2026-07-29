/**
 * Cart controller.
 */
const { authPrisma, catalogPrisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// GET /api/cart
async function getCart(req, res, next) {
  try {
    let cart = await authPrisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: true },
    });

    if (!cart) {
      cart = await authPrisma.cart.create({
        data: { userId: req.user.id },
        include: { items: true },
      });
    }

    // Batch-fetch all product data from catalog in a single query (M8 fix — no N+1)
    const productIds = cart.items.map((item) => item.productId);
    const products = productIds.length > 0
      ? await catalogPrisma.product.findMany({
          where: { id: { in: productIds } },
          include: {
            images: { orderBy: { displayOrder: 'asc' }, take: 1 },
            inventory: { select: { quantityAvailable: true } },
          },
        })
      : [];

    const productMap = new Map(products.map((p) => [p.id, p]));

    const enrichedItems = cart.items.map((item) => {
      const product = productMap.get(item.productId);
      const totalStock = product
        ? product.inventory.reduce((sum, inv) => sum + inv.quantityAvailable, 0)
        : 0;
      return {
        ...item,
        currentPrice: product ? product.pricePerUnit : item.unitPrice,
        totalStock,
        inStock: totalStock > 0,
        image: product?.images?.[0]?.url || null,
      };
    });

    res.json({ success: true, data: { ...cart, items: enrichedItems } });
  } catch (err) { next(err); }
}

// POST /api/cart/items
async function addItem(req, res, next) {
  try {
    const { productId, quantity } = req.body;

    // Verify product exists and get current data
    const product = await catalogPrisma.product.findUnique({
      where: { id: productId },
      include: { inventory: { select: { quantityAvailable: true } } },
    });
    if (!product || !product.isActive) {
      throw new AppError(404, 'NOT_FOUND', 'Product not found or inactive.');
    }

    // M5 fix: Check available stock before adding to cart
    const totalStock = product.inventory.reduce((sum, inv) => sum + inv.quantityAvailable, 0);

    // Get or create cart
    let cart = await authPrisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) {
      cart = await authPrisma.cart.create({ data: { userId: req.user.id } });
    }

    // Check if item already in cart — factor existing qty into stock check
    const existingItem = await authPrisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    const totalRequestedQty = (existingItem ? existingItem.quantity : 0) + quantity;
    if (totalRequestedQty > totalStock) {
      throw new AppError(409, 'INSUFFICIENT_STOCK',
        `Only ${totalStock} unit(s) available. You already have ${existingItem?.quantity || 0} in your cart.`);
    }

    // Enforce minOrderQty
    if (totalRequestedQty < product.minOrderQty) {
      throw new AppError(400, 'MIN_ORDER_QTY',
        `Minimum order quantity for this product is ${product.minOrderQty}.`);
    }

    if (existingItem) {
      // Update quantity
      const updated = await authPrisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
      return res.json({ success: true, data: updated });
    }

    // Calculate per-piece price
    const unitPrice = product.discountPrice || product.pricePerUnit;

    const item = await authPrisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        productName: product.name,
        unitPrice,
        quantity,
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
}

// PUT /api/cart/items/:itemId
async function updateItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = await authPrisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) throw new AppError(404, 'NOT_FOUND', 'Cart not found.');

    const item = await authPrisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new AppError(404, 'NOT_FOUND', 'Cart item not found.');

    // Check stock for the updated quantity
    const product = await catalogPrisma.product.findUnique({
      where: { id: item.productId },
      include: { inventory: { select: { quantityAvailable: true } } },
    });
    if (product) {
      const totalStock = product.inventory.reduce((sum, inv) => sum + inv.quantityAvailable, 0);
      if (quantity > totalStock) {
        throw new AppError(409, 'INSUFFICIENT_STOCK',
          `Only ${totalStock} unit(s) available for "${item.productName}".`);
      }
    }

    const updated = await authPrisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

// DELETE /api/cart/items/:itemId
async function removeItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const cart = await authPrisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) throw new AppError(404, 'NOT_FOUND', 'Cart not found.');

    const item = await authPrisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new AppError(404, 'NOT_FOUND', 'Cart item not found.');

    await authPrisma.cartItem.delete({ where: { id: itemId } });
    res.json({ success: true, data: { message: 'Item removed from cart.' } });
  } catch (err) { next(err); }
}

// DELETE /api/cart
async function clearCart(req, res, next) {
  try {
    const cart = await authPrisma.cart.findUnique({ where: { userId: req.user.id } });
    if (cart) {
      await authPrisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    res.json({ success: true, data: { message: 'Cart cleared.' } });
  } catch (err) { next(err); }
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
