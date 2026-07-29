import apiClient from './client';

export const cartApi = {
  get: () => apiClient.get('/cart').then((r) => r.data),

  addItem: (payload) => apiClient.post('/cart/items', payload).then((r) => r.data),

  updateItem: (itemId, payload) => apiClient.put(`/cart/items/${itemId}`, payload).then((r) => r.data),

  removeItem: (itemId) => apiClient.delete(`/cart/items/${itemId}`).then((r) => r.data),

  clear: () => apiClient.delete('/cart').then((r) => r.data),
};
