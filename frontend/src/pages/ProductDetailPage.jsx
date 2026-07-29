import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart, Minus, Plus, ShoppingCart, ShieldCheck, Truck, ChevronRight } from 'lucide-react';
import { useProduct, useRelatedProducts, useProductReviews, useToggleWishlist, useAddReview } from '../hooks/useProducts';
import { useAddToCart } from '../hooks/useCart';
import { useAuthStore } from '../stores/authStore';
import { LayoutDashboard } from 'lucide-react';
import ProductSpecs from '../components/product/ProductSpecs';
import ProductGrid from '../components/product/ProductGrid';
import StarRating from '../components/ui/StarRating';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { FullPageSpinner } from '../components/ui/Spinner';
import { STOCK_LABELS, aggregateStock, productImageUrls, productPrice, productOriginalPrice } from '../utils/product';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const { data: product, isLoading } = useProduct(slug);
  const { data: related } = useRelatedProducts(product);
  const { data: reviews } = useProductReviews(product?.id);
  const addToCart = useAddToCart();
  const toggleWishlist = useToggleWishlist();
  const addReview = useAddReview(product?.id);

  if (isLoading) return <FullPageSpinner />;
  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-headline-md text-text">Product not found</p>
        <Link to="/products" className="text-primary text-body-sm mt-2 inline-block">Back to catalog</Link>
      </div>
    );
  }

  const { status: stockStatus } = aggregateStock(product);
  const stock = STOCK_LABELS[stockStatus];
  const images = productImageUrls(product).length ? productImageUrls(product) : ['https://placehold.co/800x800?text=AMK+Steels'];
  const minQty = product.minOrderQty || 1;
  const price = productPrice(product);
  const original = productOriginalPrice(product);
  const hasDiscount = price < original;

  const handleAddToCart = () => {
    if (!isAuthenticated) return navigate('/login', { state: { from: `/products/${slug}` } });
    addToCart.mutate({ productId: product.id, quantity });
  };

  const handleWishlist = () => {
    if (!isAuthenticated) return navigate('/login');
    toggleWishlist.mutate({ productId: product.id, isWishlisted: product.isWishlisted });
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!isAuthenticated) return navigate('/login');
    addReview.mutate(reviewForm, { onSuccess: () => setReviewForm({ rating: 5, comment: '' }) });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-body-sm text-text-secondary mb-5 overflow-x-auto whitespace-nowrap">
        <Link to="/" className="hover:text-primary">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/products" className="hover:text-primary">Products</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-text">{product.category?.name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery */}
        <div>
          <div className="aspect-square bg-surface border border-border rounded-container overflow-hidden mb-3">
            <img src={images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-16 h-16 flex-shrink-0 rounded-standard overflow-hidden border-2 ${activeImage === idx ? 'border-primary' : 'border-border'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-label-sm text-text-secondary mb-2">{product.category?.name}</p>
          <h1 className="text-headline-lg text-text mb-2">{product.name}</h1>

          {product.avgRating > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <StarRating value={product.avgRating} count={product.reviewCount} />
            </div>
          )}

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-headline-xl text-text font-mono">₹{price.toLocaleString('en-IN')}</span>
            <span className="text-body-md text-text-secondary">/ {product.baseUnit}</span>
            {hasDiscount && (
              <span className="text-body-md text-text-secondary line-through font-mono">₹{original.toLocaleString('en-IN')}</span>
            )}
          </div>
          {product.gstRate && (
            <p className="text-body-sm text-text-secondary mb-4">+{Number(product.gstRate)}% GST applicable</p>
          )}

          <Badge variant={stock.variant} withDot className="mb-5">{stock.label}</Badge>

          {product.description && (
            <p className="text-body-md text-text-secondary leading-relaxed mb-6">{product.description}</p>
          )}

          {/* Quantity + Actions */}
          {isAdmin ? (
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex items-center gap-3 p-3.5 rounded-standard bg-primary-light/20 border border-primary/30">
                <LayoutDashboard className="w-5 h-5 text-primary flex-shrink-0" />
                <p className="text-body-sm text-text">You're signed in as admin. Admins can't place orders.</p>
              </div>
              <Button
                onClick={() => navigate('/admin/products')}
                leftIcon={<LayoutDashboard className="w-4 h-4" />}
                variant="outline"
                size="lg"
                fullWidth
              >
                Manage in Admin
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center border border-border rounded-standard">
                  <button
                    onClick={() => setQuantity((q) => Math.max(minQty, q - 1))}
                    className="w-10 h-11 flex items-center justify-center text-text-secondary hover:text-text"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-body-md font-mono">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-11 flex items-center justify-center text-text-secondary hover:text-text"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-body-sm text-text-secondary">Min order: {minQty} {product.baseUnit}</span>
              </div>

              <div className="flex gap-3 mb-6">
                <Button
                  onClick={handleAddToCart}
                  isLoading={addToCart.isPending}
                  disabled={stockStatus === 'out_of_stock'}
                  leftIcon={<ShoppingCart className="w-4 h-4" />}
                  variant="accent"
                  size="lg"
                  fullWidth
                >
                  Add to cart
                </Button>
                <button
                  onClick={handleWishlist}
                  aria-label="Toggle wishlist"
                  className="w-13 h-13 flex-shrink-0 flex items-center justify-center border border-border rounded-standard hover:border-accent transition-colors"
                >
                  <Heart className={product.isWishlisted ? 'w-5 h-5 fill-accent text-accent' : 'w-5 h-5 text-text-secondary'} />
                </button>
              </div>
            </>
          )}

          <div className="flex flex-col gap-3 border-t border-border pt-5">
            <div className="flex items-center gap-2.5 text-body-sm text-text-secondary">
              <ShieldCheck className="w-4.5 h-4.5 text-success flex-shrink-0" /> Lab-tested, IS-certified stock
            </div>
            <div className="flex items-center gap-2.5 text-body-sm text-text-secondary">
              <Truck className="w-4.5 h-4.5 text-primary flex-shrink-0" /> Freight quoted at checkout by pincode
            </div>
          </div>
        </div>
      </div>

      {/* Specifications */}
      {product.specifications && Object.keys(product.specifications).length > 0 && (
        <section className="mt-12">
          <h2 className="text-headline-md text-text mb-4">Technical specifications</h2>
          <ProductSpecs specs={product.specifications} />
        </section>
      )}

      {/* Reviews */}
      <section className="mt-12 max-w-2xl">
        <h2 className="text-headline-md text-text mb-4">Reviews {reviews?.length ? `(${reviews.length})` : ''}</h2>

        <form onSubmit={handleReviewSubmit} className="border border-border rounded-container p-4 mb-6">
          <p className="text-label-md text-text mb-2">Write a review</p>
          <StarRating
            value={reviewForm.rating}
            onChange={(rating) => setReviewForm((f) => ({ ...f, rating }))}
            readOnly={false}
            size="lg"
            className="mb-3"
          />
          <textarea
            value={reviewForm.comment}
            onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
            placeholder="Share your experience with this product…"
            rows={3}
            className="w-full rounded-standard border border-border p-3 text-body-sm outline-none focus:border-primary resize-none mb-3"
          />
          <Button type="submit" size="sm" isLoading={addReview.isPending}>Submit review</Button>
        </form>

        <div className="flex flex-col gap-5">
          {reviews?.map((review) => (
            <div key={review.id} className="border-b border-border pb-5 last:border-0">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-label-md text-text">{review.user?.name || review.userName || 'Verified buyer'}</p>
                <span className="text-body-sm text-text-secondary">{new Date(review.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
              <StarRating value={review.rating} size="sm" className="mb-2" />
              {review.comment && <p className="text-body-sm text-text-secondary leading-relaxed">{review.comment}</p>}
            </div>
          ))}
          {!reviews?.length && (
            <p className="text-body-sm text-text-secondary">No reviews yet. Be the first to review this product.</p>
          )}
        </div>
      </section>

      {/* Related */}
      {related?.length > 0 && (
        <section className="mt-14">
          <h2 className="text-headline-md text-text mb-4">You may also need</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
