import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { useToastStore } from '../stores/toastStore';
import { apiErrorMessage } from '../api/client';

export const adminKeys = {
  dashboard: (params) => ['admin', 'dashboard', params],
  orders: (params) => ['admin', 'orders', params],
  products: (params) => ['admin', 'products', params],
  categories: ['admin', 'categories'],
  inventory: (params) => ['admin', 'inventory', params],
  users: (params) => ['admin', 'users', params],
};

// ---- Dashboard ----
export function useAdminDashboard(params = {}) {
  return useQuery({ queryKey: adminKeys.dashboard(params), queryFn: () => adminApi.dashboard(params) });
}

// ---- Orders ----
export function useAdminOrders(params = {}) {
  return useQuery({
    queryKey: adminKeys.orders(params),
    queryFn: () => adminApi.orders.list(params),
    placeholderData: keepPreviousData,
  });
}
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => adminApi.orders.updateStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      useToastStore.getState().success('Order updated.');
    },
    onError: (err) => useToastStore.getState().error(apiErrorMessage(err, 'Could not update this order.')),
  });
}

// ---- Products ----
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi.products.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      useToastStore.getState().success('Product created.');
    },
    onError: (err) => useToastStore.getState().error(apiErrorMessage(err, 'Could not create product.')),
  });
}
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => adminApi.products.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      useToastStore.getState().success('Product updated.');
    },
    onError: (err) => useToastStore.getState().error(apiErrorMessage(err, 'Could not update product.')),
  });
}
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminApi.products.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      useToastStore.getState().success('Product deactivated.');
    },
  });
}
export function useBulkImportProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (products) => adminApi.products.bulkImport(products),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      useToastStore.getState().success(`Imported ${data?.imported ?? data?.count ?? 'the'} products.`);
    },
    onError: (err) => useToastStore.getState().error(apiErrorMessage(err, 'Bulk import failed. Check your JSON and try again.')),
  });
}

// ---- Categories ----
export function useAdminCategories() {
  return useQuery({ queryKey: adminKeys.categories, queryFn: adminApi.categories.list });
}
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi.categories.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categories });
      useToastStore.getState().success('Category created.');
    },
    onError: (err) => useToastStore.getState().error(apiErrorMessage(err, 'Could not create category.')),
  });
}

// ---- Inventory ----
export function useAdminInventory(params = {}) {
  return useQuery({
    queryKey: adminKeys.inventory(params),
    queryFn: () => adminApi.inventory.list(params),
    placeholderData: keepPreviousData,
  });
}
export function useUpdateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, payload }) => adminApi.inventory.update(productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] });
      useToastStore.getState().success('Stock updated.');
    },
    onError: (err) => useToastStore.getState().error(apiErrorMessage(err, 'Could not update stock.')),
  });
}

// ---- Users ----
export function useAdminUsers(params = {}) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => adminApi.users.list(params),
    placeholderData: keepPreviousData,
  });
}
export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }) => adminApi.users.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      useToastStore.getState().success('User role updated.');
    },
    onError: (err) => useToastStore.getState().error(apiErrorMessage(err, 'Could not update user role.')),
  });
}
