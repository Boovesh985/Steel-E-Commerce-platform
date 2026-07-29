import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { ordersApi } from '../api/orders';
import { cartKeys } from './useCart';
import { useToastStore } from '../stores/toastStore';
import { apiErrorMessage } from '../api/client';

export const orderKeys = {
  all: ['orders'],
  lists: () => [...orderKeys.all, 'list'],
  list: (params) => [...orderKeys.lists(), params],
  details: () => [...orderKeys.all, 'detail'],
  detail: (id) => [...orderKeys.details(), id],
  tracking: (id) => [...orderKeys.all, 'tracking', id],
};

export function useOrders(params = {}) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => ordersApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(orderId) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => ordersApi.getById(orderId),
    enabled: !!orderId,
  });
}

export function useOrderTracking(orderId) {
  return useQuery({
    queryKey: orderKeys.tracking(orderId),
    queryFn: () => ordersApi.track(orderId),
    enabled: !!orderId,
    refetchInterval: 1000 * 60,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => ordersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
    onError: (err) => useToastStore.getState().error(apiErrorMessage(err, 'Could not place your order.')),
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }) => ordersApi.cancel(orderId, reason),
    onSuccess: (data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      const isRefunded = data?.paymentStatus === 'REFUNDED';
      useToastStore.getState().success(
        isRefunded
          ? 'Order cancelled. Refund will be credited in 5–7 business days.'
          : 'Order cancelled successfully.'
      );
    },
    onError: (err) => useToastStore.getState().error(apiErrorMessage(err, 'Could not cancel this order.')),
  });
}
