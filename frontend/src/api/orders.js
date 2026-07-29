import apiClient from './client';

export const ordersApi = {
  // { addressId, buyerGstin?, notes? }
  create: (payload) => apiClient.post('/orders', payload).then((r) => r.data),

  list: (params) => apiClient.get('/orders', { params }).then((r) => r.data),

  getById: (orderId) => apiClient.get(`/orders/${orderId}`).then((r) => r.data),

  // Returns TrackingEvent[] directly.
  track: (orderId) => apiClient.get(`/orders/${orderId}/tracking`).then((r) => r.data),

  // Cancellable while PENDING, CONFIRMED, or PROCESSING. Auto-refunds paid orders.
  cancel: (orderId, reason) => apiClient.put(`/orders/${orderId}/cancel`, { reason }).then((r) => r.data),
};
