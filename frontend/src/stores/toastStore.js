import { create } from 'zustand';

let idCounter = 0;

export const useToastStore = create((set) => ({
  toasts: [], // { id, type: 'success' | 'error' | 'warning' | 'info', title, message }

  showToast: ({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++idCounter;
    set((state) => ({ toasts: [...state.toasts, { id, type, title, message }] }));
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
    return id;
  },

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  success: (message, title = 'Done') =>
    useToastStore.getState().showToast({ type: 'success', title, message }),
  error: (message, title = 'Something went wrong') =>
    useToastStore.getState().showToast({ type: 'error', title, message }),
  warning: (message, title = 'Heads up') =>
    useToastStore.getState().showToast({ type: 'warning', title, message }),
  info: (message, title = 'Note') => useToastStore.getState().showToast({ type: 'info', title, message }),
}));
