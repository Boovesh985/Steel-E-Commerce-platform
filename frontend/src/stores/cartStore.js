import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useCartStore = create()(
  persist(
    (set) => ({
      itemCount: 0,
      isDrawerOpen: false,

      setItemCount: (itemCount) => set({ itemCount: Math.max(0, itemCount) }),

      incrementBadge: (by = 1) => set((state) => ({ itemCount: Math.max(0, state.itemCount + by) })),

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      reset: () => set({ itemCount: 0, isDrawerOpen: false }),
    }),
    {
      name: 'amk-cart-ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ itemCount: state.itemCount }),
    }
  )
);
