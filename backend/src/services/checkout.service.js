/**
 * Checkout service — cross-database stock reservation and order creation.
 *
 * CRITICAL: Two separate databases, no cross-DB transactions.
 * Flow:
 *   1. Reserve stock in amk_catalog (conditional UPDATE ... WHERE quantityAvailable >= qty)
 *   2. Create Order + OrderItems in amk_auth with snapshotted product data
 *   3. On failure in step 2, compensate by restoring stock in amk_catalog
 */
const { authPrisma, catalogPrisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique order number: AMK-YYYYMMDD-XXXXXX
 */
function generateOrderNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = uuidv4().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `AMK-${date}-${rand}`;
}

/**
 * Execute checkout: reserve stock → create order → compensate on failure.
 *
 * @param {string} userId
 * @param {string} addressId
 * @param {string|null} buyerGstin
 * @param {string|null} notes
 * @returns {object} Created order
 */
async function checkout(userId, addressId, buyerGstin, notes) {
  // ── Pre-checkout: verify user profile completeness ──────────────────
  const user = await authPrisma.user.findUnique({
    where: { id: userId },
    select: { phoneVerified: true, phone: true },
  });

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found.');
  }
  if (!user.phone) {
    throw new AppError(400, 'PHONE_REQUIRED', 'Please add a phone number to your profile before placing an order.');
  }
  if (!user.phoneVerified) {
    throw new AppError(400, 'PHONE_NOT_VERIFIED', 'Please verify your phone number before placing an order.');
  }

  // 1. Fetch cart with items
  const cart = await authPrisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!cart || cart.items.length === 0) {
    throw new AppError(400, 'EMPTY_CART', 'Your cart is empty.');
  }

  // 2. Fetch shipping address
  const address = await authPrisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!address) {
    throw new AppError(404, 'NOT_FOUND', 'Shipping address not found.');
  }

  // 3. For each cart item, get current product data from catalog & verify
  const lineItems = [];
  for (const item of cart.items) {
    const product = await catalogPrisma.product.findUnique({
      where: { id: item.productId },
      include: { inventory: true },
    });
    if (!product || !product.isActive) {
      throw new AppError(400, 'PRODUCT_UNAVAILABLE', `Product "${item.productName}" is no longer available.`);
    }

    const totalStock = product.inventory.reduce((sum, inv) => sum + inv.quantityAvailable, 0);
    if (totalStock < item.quantity) {
      throw new AppError(409, 'INSUFFICIENT_STOCK',
        `Insufficient stock for "${product.name}". Available: ${totalStock}, Requested: ${item.quantity}`);
    }

    const unitPrice = product.discountPrice || product.pricePerUnit;
    lineItems.push({
      cartItem: item,
      product,
      unitPrice: Number(unitPrice),
      quantity: item.quantity,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: Reserve stock in amk_catalog
  // ═══════════════════════════════════════════════════════════════════════
  const reservedInventoryIds = []; // Track for compensation

  for (const lineItem of lineItems) {
    let remainingQty = lineItem.quantity;

    // Sort inventory by available quantity descending (fill from largest stock first)
    const sortedInventory = [...lineItem.product.inventory]
      .filter((inv) => inv.quantityAvailable > 0)
      .sort((a, b) => b.quantityAvailable - a.quantityAvailable);

    for (const inv of sortedInventory) {
      if (remainingQty <= 0) break;

      const decrementQty = Math.min(remainingQty, inv.quantityAvailable);

      // Atomic conditional update: only succeeds if stock >= requested
      // Uses Prisma updateMany with WHERE condition — single SQL statement, no raw query needed
      const result = await catalogPrisma.inventory.updateMany({
        where: {
          id: inv.id,
          quantityAvailable: { gte: decrementQty },
        },
        data: {
          quantityAvailable: { decrement: decrementQty },
          quantityReserved: { increment: decrementQty },
        },
      });

      if (result.count === 0) {
        // Race condition: stock changed between check and update → compensate
        await compensateReservations(reservedInventoryIds);
        throw new AppError(409, 'INSUFFICIENT_STOCK',
          `Stock for "${lineItem.product.name}" was just purchased by another buyer. Please try again.`);
      }

      reservedInventoryIds.push({ inventoryId: inv.id, qty: decrementQty });
      remainingQty -= decrementQty;
    }

    if (remainingQty > 0) {
      // Not enough stock across all warehouses → compensate
      await compensateReservations(reservedInventoryIds);
      throw new AppError(409, 'INSUFFICIENT_STOCK',
        `Insufficient stock for "${lineItem.product.name}".`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: Create Order in amk_auth
  // ═══════════════════════════════════════════════════════════════════════
  let order;
  try {
    const subtotal = lineItems.reduce(
      (sum, li) => sum + li.unitPrice * li.quantity, 0
    );

    // Calculate GST per line item using each product's individual GST rate
    const gstAmount = lineItems.reduce((sum, li) => {
      const rate = li.product?.gstRate ? Number(li.product.gstRate) : 18;
      return sum + Math.round(li.unitPrice * li.quantity * (rate / 100) * 100) / 100;
    }, 0);
    const totalAmount = Math.round((subtotal + gstAmount) * 100) / 100;

    const addressSnapshot = {
      label: address.label,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    };

    order = await authPrisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        shippingAddress: addressSnapshot,
        buyerGstin,
        subtotal,
        gstAmount,
        totalAmount,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        items: {
          create: lineItems.map((li) => ({
            productId: li.product.id,
            productName: li.product.name,
            specs: li.product.specifications || {},
            unitPrice: li.unitPrice,
            quantity: li.quantity,
            subtotal: Math.round(li.unitPrice * li.quantity * 100) / 100,
          })),
        },
        trackingEvents: {
          create: {
            status: 'PENDING',
            note: 'Order placed',
          },
        },
      },
      include: { items: true, trackingEvents: true },
    });

    // Clear cart after successful order
    await authPrisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  } catch (err) {
    // STEP 3: Compensate — restore stock
    await compensateReservations(reservedInventoryIds);
    throw err;
  }

  return order;
}

/**
 * Compensating transaction: restore stock for all reserved inventory.
 */
async function compensateReservations(reservations) {
  for (const { inventoryId, qty } of reservations) {
    try {
      // Restore stock atomically
      await catalogPrisma.inventory.updateMany({
        where: { id: inventoryId },
        data: {
          quantityAvailable: { increment: qty },
          quantityReserved: { decrement: qty },
        },
      });
    } catch (compErr) {
      console.error(`⚠️ CRITICAL: Failed to compensate inventory ${inventoryId} +${qty}:`, compErr);
      // In production, this should trigger an alert/monitoring system
    }
  }
}

/**
 * Restore stock when an order is cancelled.
 * Guards against negative quantityReserved by capping the decrement.
 */
async function restoreStockForOrder(orderId) {
  const order = await authPrisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;

  for (const item of order.items) {
    // Find inventory entries for this product
    const inventories = await catalogPrisma.inventory.findMany({
      where: { productId: item.productId },
    });

    let remainingQty = item.quantity;
    for (const inv of inventories) {
      if (remainingQty <= 0) break;

      // Cap the restore to what's actually reserved to prevent negative quantityReserved
      const restoreQty = Math.min(remainingQty, inv.quantityReserved);

      if (restoreQty > 0) {
        await catalogPrisma.inventory.updateMany({
          where: { id: inv.id, quantityReserved: { gte: restoreQty } },
          data: {
            quantityAvailable: { increment: restoreQty },
            quantityReserved: { decrement: restoreQty },
          },
        });
      }

      remainingQty -= restoreQty;
    }

    // If there's still remaining quantity (quantityReserved was already 0),
    // just restore to quantityAvailable without decrementing reserved
    if (remainingQty > 0 && inventories.length > 0) {
      await catalogPrisma.inventory.update({
        where: { id: inventories[0].id },
        data: { quantityAvailable: { increment: remainingQty } },
      });
    }
  }
}

module.exports = { checkout, restoreStockForOrder, generateOrderNumber };
