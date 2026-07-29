import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { productsApi, flattenCategories, fetchRelatedProducts } from '../api/products';
import { useToastStore } from '../stores/toastStore';
import { apiErrorMessage } from '../api/client';

export const productKeys = {
  all: ['products'],
  lists: () => [...productKeys.all, 'list'],
  list: (params) => [...productKeys.lists(), params],
  details: () => [...productKeys.all, 'detail'],
  detail: (idOrSlug) => [...productKeys.details(), idOrSlug],
  featured: (limit) => [...productKeys.all, 'featured', limit],
  related: (id) => [...productKeys.all, 'related', id],
  reviews: (id) => [...productKeys.all, 'reviews', id],
  categories: ['categories'],
  wishlist: ['wishlist'],
};

export function useProductList(params = {}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(idOrSlug) {
  return useQuery({
    queryKey: productKeys.detail(idOrSlug),
    queryFn: () => productsApi.get(idOrSlug),
    enabled: !!idOrSlug,
  });
}

// There's no dedicated "featured" endpoint — approximate it with the newest
// active listings.
export function useFeaturedProducts(limit = 8) {
  return useQuery({
    queryKey: productKeys.featured(limit),
    queryFn: async () => {
      const data = await productsApi.list({ sort: 'newest', limit });
      return data?.items || data?.products || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// No related-products endpoint either — derived client-side from the same category.
export function useRelatedProducts(product) {
  return useQuery({
    queryKey: productKeys.related(product?.id),
    queryFn: () => fetchRelatedProducts(product),
    enabled: !!product?.id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories,
    queryFn: productsApi.categories,
    staleTime: 1000 * 60 * 10,
  });
}

export function useFlatCategories() {
  const { data, ...rest } = useCategories();
  return { data: data ? flattenCategories(data) : undefined, ...rest };
}

export function useProductReviews(productId) {
  return useQuery({
    queryKey: productKeys.reviews(productId),
    queryFn: () => productsApi.reviews(productId),
    enabled: !!productId,
  });
}

export function useAddReview(productId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => productsApi.addReview(productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.reviews(productId) });
      useToastStore.getState().success('Your review has been posted.');
    },
    onError: (err) => useToastStore.getState().error(apiErrorMessage(err, 'Could not post your review.')),
  });
}

export function useWishlist() {
  return useQuery({
    queryKey: productKeys.wishlist,
    queryFn: productsApi.wishlist.list,
  });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, isWishlisted }) =>
      isWishlisted ? productsApi.wishlist.remove(productId) : productsApi.wishlist.add(productId),
    onSuccess: (_, { isWishlisted }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.wishlist });
      useToastStore.getState().success(isWishlisted ? 'Removed from wishlist.' : 'Added to wishlist.');
    },
    onError: (err) => useToastStore.getState().error(apiErrorMessage(err, 'Could not update your wishlist.')),
  });
}
