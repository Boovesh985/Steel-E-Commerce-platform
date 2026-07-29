import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Check, LayoutDashboard } from 'lucide-react';
import clsx from 'clsx';
import Badge from '../ui/Badge';
import StarRating from '../ui/StarRating';
import { useAddToCart } from '../../hooks/useCart';
import { useToggleWishlist } from '../../hooks/useProducts';
import { useAuthStore } from '../../stores/authStore';
import { STOCK_LABELS, aggregateStock, productThumbnail, productPrice, productOriginalPrice } from '../../utils/product';

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const addToCart = useAddToCart();
  const toggleWishlist = useToggleWishlist();
  const [justAdded, setJustAdded] = useState(false);
  const [heartPopping, setHeartPopping] = useState(false);

  const { status: stockStatus } = aggregateStock(product);
  const stock = STOCK_LABELS[stockStatus];
  const isOutOfStock = stockStatus === 'out_of_stock';
  const price = productPrice(product);
  const original = productOriginalPrice(product);
  const hasDiscount = price < original;

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${product.slug}` } });
      return;
    }
    addToCart.mutate(
      { productId: product.id, quantity: product.minOrderQty || 1 },
      {
        onSuccess: () => {
          setJustAdded(true);
          setTimeout(() => setJustAdded(false), 1400);
        },
      }
    );
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setHeartPopping(true);
    setTimeout(() => setHeartPopping(false), 380);
    toggleWishlist.mutate({ productId: product.id, isWishlisted: product.isWishlisted });
  };

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group flex flex-col bg-surface border border-border rounded-container overflow-hidden hover:shadow-lift hover:-translate-y-1 hover:border-primary/30 transition-all duration-300"
    >
      <div className="relative aspect-square bg-bg overflow-hidden">
        <img
          src={productThumbnail(product) || 'https://placehold.co/600x600?text=AMK+Steels'}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
        />
        <button
          onClick={handleWishlist}
          aria-label={product.isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute top-2.5 right-2.5 w-9 h-9 flex items-center justify-center rounded-full bg-surface/90 backdrop-blur-sm hover:bg-surface hover:scale-110 transition-all duration-200"
        >
          <Heart
            className={clsx(
              'w-4.5 h-4.5 transition-colors',
              heartPopping && 'animate-heart-pop',
              product.isWishlisted ? 'fill-accent text-accent' : 'text-text-secondary'
            )}
          />
        </button>
        {product.specifications?.grade && (
          <span className="absolute top-2.5 left-2.5 px-2 py-1 bg-text/80 text-white text-label-sm rounded-standard font-mono">
            {product.specifications.grade}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-3.5 gap-2">
        <p className="text-label-sm text-text-secondary">{product.category?.name}</p>
        <h3 className="text-body-md font-semibold text-text line-clamp-2 leading-snug">{product.name}</h3>

        {product.avgRating > 0 && (
          <StarRating value={product.avgRating} count={product.reviewCount} size="sm" />
        )}

        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-headline-md text-text font-mono">₹{price.toLocaleString('en-IN')}</span>
          <span className="text-body-sm text-text-secondary">/ {product.baseUnit}</span>
          {hasDiscount && (
            <span className="text-body-sm text-text-secondary line-through font-mono">₹{original.toLocaleString('en-IN')}</span>
          )}
        </div>

        <div className="flex items-center justify-between mt-1">
          <Badge variant={stock.variant} withDot>
            {stock.label}
          </Badge>
        </div>

        {isAdmin ? (
          <span
            onClick={(e) => { e.preventDefault(); navigate('/admin/products'); }}
            className="mt-2 h-10 rounded-standard flex items-center justify-center gap-2 text-label-md font-semibold border border-border text-text-secondary hover:border-primary hover:text-primary transition-colors cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            Manage in Admin
          </span>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || addToCart.isPending}
            className={clsx(
              'relative overflow-hidden mt-2 h-10 rounded-standard flex items-center justify-center gap-2 text-label-md font-semibold transition-all duration-200',
              isOutOfStock
                ? 'bg-border text-text-secondary cursor-not-allowed'
                : justAdded
                ? 'bg-success text-white'
                : 'btn-sheen bg-accent text-white hover:bg-accent-dark active:scale-[0.98]'
            )}
          >
            {justAdded ? (
              <Check className="w-4 h-4 animate-check-pop" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
            {isOutOfStock ? 'Out of stock' : justAdded ? 'Added' : 'Add to cart'}
          </button>
        )}
      </div>
    </Link>
  );
}
