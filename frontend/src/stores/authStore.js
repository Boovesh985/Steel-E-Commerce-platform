import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create()(
  persist(
    (set, get) => ({
      user: null, // { id, name, email, phone, role: 'customer' | 'admin' | 'staff' }
      accessToken: null,
      refreshToken: null,
      isHydrated: false,

      isAuthenticated: () => !!get().accessToken,
      // Backend Role enum is uppercase: CUSTOMER | ADMIN | STAFF.
      // Only actual ADMIN users get full admin panel access.
      isAdmin: () => get().user?.role?.toUpperCase() === 'ADMIN',
      isStaff: () => {
        const role = get().user?.role?.toUpperCase();
        return role === 'ADMIN' || role === 'STAFF';
      },

      setTokens: ({ accessToken, refreshToken }) =>
        set((state) => ({
          accessToken: accessToken ?? state.accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
        })),

      setUser: (user) => set({ user }),

      login: ({ user, accessToken, refreshToken }) => set({ user, accessToken, refreshToken }),

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        // Also clear the cart badge so stale count doesn't persist
        try { const { useCartStore } = require('./cartStore'); useCartStore.getState().reset(); } catch {}
      },

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'amk-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
