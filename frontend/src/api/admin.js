import apiClient from './client';

export const adminApi = {
  // Single endpoint covering all dashboard telemetry (revenue, order counts,
  // low-stock warnings, etc.) — exact shape isn't fully documented, so hooks
  // that consume this read defensively across a few plausible key names.
  dashboard: (params) => apiClient.get('/admin/dashboard', { params }).then((r) => r.data),

  orders: {
    list: (params) => apiClient.get('/admin/orders', { params }).then((r) => r.data),
    // { status, note?, location? } — note/location create a TrackingEvent server-side.
    updateStatus: (id, payload) => apiClient.put(`/admin/orders/${id}/status`, payload).then((r) => r.data),
  },

  products: {
    create: (payload) => apiClient.post('/admin/products', payload).then((r) => r.data),
    update: (id, payload) => apiClient.put(`/admin/products/${id}`, payload).then((r) => r.data),
    // Soft delete — flips isActive to false.
    delete: (id) => apiClient.delete(`/admin/products/${id}`).then((r) => r.data),
    // { products: Product[] } — a JSON array, not a CSV/multipart upload.
    bulkImport: (products) => apiClient.post('/admin/products/import', { products }).then((r) => r.data),
  },

  categories: {
    // No dedicated admin list route documented — reuse the public tree endpoint.
    list: () => apiClient.get('/categories').then((r) => r.data),
    // { name, slug, parentId?, imageUrl? }
    create: (payload) => apiClient.post('/admin/categories', payload).then((r) => r.data),
  },

  inventory: {
    // Query: page, limit, lowStock, warehouseId
    list: (params) => apiClient.get('/admin/inventory', { params }).then((r) => r.data),
    // { quantityAvailable?, quantityReserved?, reorderLevel? } — keyed by productId.
    // The route doesn't take a warehouseId segment; if a product has stock in
    // multiple warehouses, pass warehouseId in the body (best-effort — confirm
    // this against your actual handler).
    update: (productId, payload) => apiClient.put(`/admin/inventory/${productId}`, payload).then((r) => r.data),
  },

  users: {
    // Query: page, limit, role, q
    list: (params) => apiClient.get('/admin/users', { params }).then((r) => r.data),
    updateRole: (id, role) => apiClient.put(`/admin/users/${id}/role`, { role }).then((r) => r.data),
  },
};
