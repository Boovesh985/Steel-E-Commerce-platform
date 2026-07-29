import apiClient from './client';

export const productsApi = {
  // Query params: category (slug), q, minPrice, maxPrice, brand,
  // sort ('price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest'), page, limit
  list: (params) => apiClient.get('/products', { params }).then((r) => r.data),

  // Backend accepts either a product id or a slug on this one route.
  get: (idOrSlug) => apiClient.get(`/products/${idOrSlug}`).then((r) => r.data),

  // Returns Review[] directly (not paginated).
  reviews: (productId) => apiClient.get(`/products/${productId}/reviews`).then((r) => r.data),

  addReview: (productId, payload) =>
    apiClient.post(`/products/${productId}/reviews`, payload).then((r) => r.data),

  categories: () => apiClient.get('/categories').then((r) => r.data),

  wishlist: {
    // Returns the wishlisted products directly.
    list: () => apiClient.get('/wishlist').then((r) => r.data),
    add: (productId) => apiClient.post('/wishlist', { productId }).then((r) => r.data),
    remove: (productId) => apiClient.delete(`/wishlist/${productId}`).then((r) => r.data),
  },
};

/**
 * Flattens the recursive category tree returned by GET /categories into a
 * single-level list (used for select inputs and simple nav rendering).
 */
export function flattenCategories(tree = []) {
  const out = [];
  const walk = (nodes) => {
    nodes.forEach((node) => {
      out.push(node);
      if (node.children?.length) walk(node.children);
    });
  };
  walk(tree);
  return out;
}

/**
 * There's no dedicated "related products" endpoint, so we derive it by
 * fetching a page of products from the same category and excluding the
 * current one.
 */
export async function fetchRelatedProducts(product, limit = 4) {
  if (!product?.category?.slug && !product?.categoryId) return [];
  const params = product.category?.slug ? { category: product.category.slug, limit: limit + 1 } : { limit: limit + 1 };
  const data = await productsApi.list(params);
  const items = data?.items || data?.products || [];
  return items.filter((p) => p.id !== product.id).slice(0, limit);
}
