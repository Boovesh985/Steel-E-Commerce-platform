import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cart';
import { productsApi } from '../api/products';
import { useCartStore } from '../stores/cartStore';
import { useToastStore } from '../stores/toastStore';
import { apiErrorMessage } from '../api/client';
import { toNumber, productThumbnail } from '../utils/product';

export const cartKeys = {
  all: ['cart'],
};

/**
 * The backend's CartItem only stores { productId, productName, unitPrice,
 * quantity } — no image, slug, unit, or min-order-qty. We enrich each line
 * with a product lookup so the UI has something to render. This costs one
 * request per distinct cart line; fine for a cart's realistic size.
 */
async function fetchEnrichedCart() {
  const cart = await cartApi.get();
  const rawItems = cart?.items || [];

  const items = await Promise.all(
    rawItems.map(async (item) => {
      let product = null;
      try {
        product = await productsApi.get(item.productId);
      } catch {
        // Product may have been deactivated/removed — degrade gracefully.
      }
      return {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        unitPrice: toNumber(item.unitPrice),
        quantity: item.quantity,
        productSlug: product?.slug || null,
        thumbnail: product ? productThumbnail(product) : null,
        unit: product?.baseUnit || '',
        minOrderQty: product?.minOrderQty || 1,
      };
    })
  );

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  return { ...cart, items, subtotal };
}

export function useCart(options = {}) {
  const query = useQuery({
    queryKey: cartKeys.all,
    queryFn: fetchEnrichedCart,
    staleTime: 1000 * 10,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });

  // Auto-sync the navbar badge whenever the cart query settles
  const { data: cart, isError, isFetched } = query;
  const setItemCount = useCartStore.getState().setItemCount;

  if (isFetched) {
    if (isError || !cart?.items?.length) {
      // Query failed (401) or cart is empty → badge should be 0
      if (useCartStore.getState().itemCount !== 0) setItemCount(0);
    } else {
      const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      if (count !== useCartStore.getState().itemCount) setItemCount(count);
    }
  }

  return query;
}

// Keep exported for backward compat, but useCart now auto-syncs
export function useSyncCartBadge(cart) {
  const setItemCount = useCartStore((s) => s.setItemCount);
  if (cart) {
    const count = cart.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
    if (count !== useCartStore.getState().itemCount) setItemCount(count);
  }
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => cartApi.addItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
      useToastStore.getState().success('Added to cart.');
    },
    onError: (err) => useToastStore.getState().error(apiErrorMessage(err, 'Could not add item to cart.')),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }) => cartApi.updateItem(itemId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cartKeys.all }),
    onError: (err) => useToastStore.getState().error(apiErrorMessage(err, 'Could not update quantity.')),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId) => cartApi.removeItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
      useToastStore.getState().info('Item removed from cart.');
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cartApi.clear,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cartKeys.all }),
  });
}
