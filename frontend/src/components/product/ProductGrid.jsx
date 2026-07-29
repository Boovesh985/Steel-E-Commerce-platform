import { motion } from 'framer-motion';
import { PackageSearch } from 'lucide-react';
import ProductCard from './ProductCard';

function SkeletonCard() {
  return (
    <div className="flex flex-col bg-surface border border-border rounded-container overflow-hidden">
      <div className="aspect-square animate-shimmer" />
      <div className="p-3.5 flex flex-col gap-2">
        <div className="h-3 w-20 rounded animate-shimmer" />
        <div className="h-4 w-full rounded animate-shimmer" />
        <div className="h-4 w-2/3 rounded animate-shimmer" />
        <div className="h-6 w-24 rounded mt-1 animate-shimmer" />
        <div className="h-10 w-full rounded mt-2 animate-shimmer" />
      </div>
    </div>
  );
}

const gridVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export default function ProductGrid({ products, isLoading, skeletonCount = 8 }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-bg flex items-center justify-center">
          <PackageSearch className="w-7 h-7 text-text-secondary" />
        </div>
        <p className="text-headline-md text-text">No products found</p>
        <p className="text-body-sm text-text-secondary max-w-xs">
          Try adjusting your filters or search for a different grade, size, or category.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      key={products[0]?.id || 'grid'}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
      variants={gridVariants}
      initial="hidden"
      animate="show"
    >
      {products.map((product) => (
        <motion.div key={product.id} variants={cardVariants}>
          <ProductCard product={product} />
        </motion.div>
      ))}
    </motion.div>
  );
}
