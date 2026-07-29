import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, User, Menu, X, LogOut, Package, LayoutDashboard, Home } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { useCategories } from '../../hooks/useProducts';
import { cartKeys } from '../../hooks/useCart';
import { authApi } from '../../api/auth';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [cartBumping, setCartBumping] = useState(false);

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const logout = useAuthStore((s) => s.logout);
  const itemCount = useCartStore((s) => s.itemCount);
  const { data: categories } = useCategories();

  // Category links live at the same pathname (/products) and differ only by
  // ?category= query param, so NavLink's built-in isActive (pathname-only) can't
  // tell them apart. Compute the active one manually from the query string.
  const activeCategorySlug =
    location.pathname === '/products' ? new URLSearchParams(location.search).get('category') : null;

  const isHomePage = location.pathname === '/';

  const prevItemCount = useRef(itemCount);
  useEffect(() => {
    if (itemCount !== prevItemCount.current && itemCount > prevItemCount.current) {
      setCartBumping(true);
      const t = setTimeout(() => setCartBumping(false), 420);
      prevItemCount.current = itemCount;
      return () => clearTimeout(t);
    }
    prevItemCount.current = itemCount;
  }, [itemCount]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?q=${encodeURIComponent(query.trim())}`);
      setMobileOpen(false);
    }
  };

  const queryClient = useQueryClient();

  const handleLogout = () => {
    setAccountOpen(false);
    setShowSignOutConfirm(true);
  };

  const confirmLogout = async () => {
    try { await authApi.logout(); } catch { /* proceed even if revocation fails */ }
    logout();
    queryClient.removeQueries({ queryKey: cartKeys.all });
    setShowSignOutConfirm(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-border safe-top">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">

          {/* ── LEFT SECTION: Logo + Nav Links ── */}
          <div className="flex items-center gap-6 flex-shrink-0">
            {/* Mobile hamburger */}
            <button
              className="lg:hidden -ml-2 p-2 text-text"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Logo + Company Name */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-9 h-9 bg-primary rounded-standard flex items-center justify-center">
                <span className="text-white font-mono font-bold text-sm">AMK</span>
              </div>
              <span className="hidden sm:block text-headline-md text-text font-mono tracking-tight">
                AMK Steels
              </span>
            </Link>

            {/* Nav Links: Home + Categories */}
            <nav className="hidden lg:flex items-center gap-1.5">
              <Link
                to="/"
                className={clsx(
                  'px-3 py-1.5 rounded-md text-body-sm whitespace-nowrap transition-all duration-200 flex items-center gap-1.5',
                  isHomePage
                    ? 'bg-primary-light text-primary font-medium'
                    : 'text-text-secondary hover:bg-bg hover:text-text'
                )}
              >
                <Home className="w-4 h-4" />
                Home
              </Link>

              {categories?.slice(0, 5)?.map((cat) => {
                const isActive = activeCategorySlug === cat.slug;
                return (
                  <Link
                    key={cat.id}
                    to={`/products?category=${cat.slug}`}
                    className={clsx(
                      'px-3 py-1.5 rounded-md text-body-sm whitespace-nowrap transition-all duration-200',
                      isActive
                        ? 'bg-primary-light text-primary font-medium'
                        : 'text-text-secondary hover:bg-bg hover:text-text'
                    )}
                  >
                    {cat.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* ── CENTER SECTION: Search Bar ── */}
          <div className="hidden md:flex flex-1 justify-center px-8">
            <form onSubmit={handleSearch} className="w-full max-w-xl">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search TMT bars, pipes, sheets, grades…"
                  className="w-full h-10 pl-10 pr-4 rounded-standard border border-border bg-bg text-body-sm focus:border-primary outline-none transition-colors"
                />
              </div>
            </form>
          </div>

          {/* ── RIGHT SECTION: Cart + User ── */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isAdmin && (
              <Link
                to="/cart"
                className="relative p-2.5 text-text hover:text-primary transition-colors"
                aria-label="View cart"
              >
                <ShoppingCart className={clsx('w-5.5 h-5.5', cartBumping && 'animate-cart-bump')} />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Link>
            )}

            <div className="relative">
              <button
                onClick={() => setAccountOpen((v) => !v)}
                className="p-2.5 text-text hover:text-primary transition-colors"
                aria-label="Account menu"
              >
                <User className="w-5.5 h-5.5" />
              </button>

              <AnimatePresence>
                {accountOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setAccountOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 top-12 z-20 w-56 bg-surface border border-border rounded-container shadow-lift py-2 origin-top-right"
                    >
                    {isAuthenticated ? (
                      <>
                        <div className="px-4 py-2 border-b border-border mb-1">
                          <p className="text-label-md text-text truncate">{user?.name}</p>
                          <p className="text-body-sm text-text-secondary truncate">{user?.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-body-sm text-text hover:bg-bg"
                        >
                          <User className="w-4 h-4" /> My profile
                        </Link>
                        {!isAdmin && (
                          <Link
                            to="/orders"
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-body-sm text-text hover:bg-bg"
                          >
                            <Package className="w-4 h-4" /> My orders
                          </Link>
                        )}
                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-body-sm text-text hover:bg-bg"
                          >
                            <LayoutDashboard className="w-4 h-4" /> Admin dashboard
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-body-sm text-danger hover:bg-bg text-left"
                        >
                          <LogOut className="w-4 h-4" /> Sign out
                        </button>
                      </>
                    ) : (
                      <div className="px-4 py-2 flex flex-col gap-2">
                        <Link
                          to="/login"
                          onClick={() => setAccountOpen(false)}
                          className="h-9 rounded-standard bg-primary text-white flex items-center justify-center text-label-md"
                        >
                          Sign in
                        </Link>
                        <Link
                          to="/register"
                          onClick={() => setAccountOpen(false)}
                          className="h-9 rounded-standard border border-border text-text flex items-center justify-center text-label-md"
                        >
                          Create account
                        </Link>
                      </div>
                    )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <form onSubmit={handleSearch} className="md:hidden pb-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, grades, sizes…"
              className="w-full h-10 pl-10 pr-4 rounded-standard border border-border bg-bg text-body-sm outline-none focus:border-primary"
            />
          </div>
        </form>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="lg:hidden border-t border-border bg-surface px-4 overflow-hidden"
          >
            <div className="py-3 flex flex-col gap-1">
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0 }}
              >
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 py-2.5 text-body-md text-text border-b border-border hover:text-primary transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Home
                </Link>
              </motion.div>
              {categories?.map((cat, i) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: (i + 1) * 0.03 }}
                >
                  <Link
                    to={`/products?category=${cat.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2.5 text-body-md text-text border-b border-border last:border-0 hover:text-primary transition-colors"
                  >
                    {cat.name}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
      {/* Sign out confirmation modal */}
      <Modal isOpen={showSignOutConfirm} onClose={() => setShowSignOutConfirm(false)} size="sm">
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center mb-4">
            <LogOut className="w-7 h-7 text-danger" />
          </div>
          <h3 className="text-headline-md text-text mb-1">Sign out?</h3>
          <p className="text-body-sm text-text-secondary mb-6">
            You're signed in as <span className="font-medium text-text">{user?.name || user?.email}</span>. Are you sure you want to sign out?
          </p>
          <div className="flex gap-3 w-full">
            <Button variant="outline" fullWidth onClick={() => setShowSignOutConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" fullWidth onClick={confirmLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </Modal>
    </header>
  );
}
