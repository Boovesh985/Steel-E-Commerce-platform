import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import ToastContainer from '../ui/Toast';
import { useCart } from '../../hooks/useCart';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';

export default function Layout() {
  const location = useLocation();

  // Scroll to top on every route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Sync the cart badge with the server on every page (not just /cart)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  useCart({ enabled: isAuthenticated });

  // If not logged in, clear any stale badge count from localStorage
  useEffect(() => {
    if (!isAuthenticated) {
      useCartStore.getState().reset();
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Navbar />
      <main className="flex-1 pb-20 lg:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <MobileBottomNav />
      <ToastContainer />
    </div>
  );
}
