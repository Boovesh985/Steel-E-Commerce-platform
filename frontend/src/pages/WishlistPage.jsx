import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '../hooks/useProducts';
import ProductGrid from '../components/product/ProductGrid';
import Button from '../components/ui/Button';

export default function WishlistPage() {
  const { data: products, isLoading } = useWishlist();

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <h1 className="text-headline-lg text-text mb-6">My wishlist</h1>

      {!isLoading && (!products || products.length === 0) ? (
        <div className="flex flex-col items-center text-center gap-3 py-16">
          <Heart className="w-10 h-10 text-text-secondary" />
          <p className="text-headline-md text-text">Your wishlist is empty</p>
          <p className="text-body-sm text-text-secondary">Tap the heart icon on any product to save it here.</p>
          <Link to="/products">
            <Button variant="accent">Browse products</Button>
          </Link>
        </div>
      ) : (
        <ProductGrid products={products} isLoading={isLoading} />
      )}
    </div>
  );
}
