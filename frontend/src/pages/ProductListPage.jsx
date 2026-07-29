import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { useProductList, useFlatCategories } from '../hooks/useProducts';
import { useDebounce } from '../hooks/useDebounce';
import ProductGrid from '../components/product/ProductGrid';
import Button from '../components/ui/Button';

const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: Low to high' },
  { value: 'price_desc', label: 'Price: High to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
];

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'newest';
  const debouncedQ = useDebounce(q, 300);

  const { data: categories } = useFlatCategories();

  const params = useMemo(
    () => ({ q: debouncedQ || undefined, category: category || undefined, sort, page, limit: 20 }),
    [debouncedQ, category, sort, page]
  );

  const { data, isLoading, isFetching } = useProductList(params);
  const products = data?.items || data?.products || [];
  const totalPages = data?.totalPages || 1;

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchParams({});
    setPage(1);
  };

  const hasActiveFilters = category || (sort && sort !== 'newest');

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-headline-lg text-text">
          {q ? `Results for "${q}"` : category ? categories?.find((c) => c.slug === category)?.name || 'Products' : 'All products'}
        </h1>
      </div>
      <p className="text-body-sm text-text-secondary mb-6">
        {isLoading ? 'Loading…' : `${data?.total ?? products.length} products`}
      </p>

      <div className="flex gap-6">
        {/* Desktop filter sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <p className="text-label-sm text-text-secondary mb-3">Category</p>
          <div className="flex flex-col gap-1 mb-6">
            <button
              onClick={() => updateParam('category', '')}
              className={`text-left text-body-sm py-1.5 ${!category ? 'text-primary font-semibold' : 'text-text-secondary hover:text-text'}`}
            >
              All categories
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => updateParam('category', cat.slug)}
                className={`text-left text-body-sm py-1.5 ${category === cat.slug ? 'text-primary font-semibold' : 'text-text-secondary hover:text-text'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} fullWidth>
              Clear filters
            </Button>
          )}
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 gap-3">
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(true)} leftIcon={<SlidersHorizontal className="w-4 h-4" />}>
              Filters
            </Button>

            <div className="relative ml-auto">
              <select
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="appearance-none h-10 pl-3 pr-9 rounded-standard border border-border bg-surface text-body-sm outline-none focus:border-primary"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    Sort: {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
          </div>

          <ProductGrid products={products} isLoading={isLoading} />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-body-sm text-text-secondary px-2">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages || isFetching} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-text/50" onClick={() => setFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-container max-h-[75vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline-md text-text">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
            <p className="text-label-sm text-text-secondary mb-3">Category</p>
            <div className="flex flex-col gap-1 mb-6">
              <button
                onClick={() => { updateParam('category', ''); setFiltersOpen(false); }}
                className={`text-left text-body-md py-2 ${!category ? 'text-primary font-semibold' : 'text-text'}`}
              >
                All categories
              </button>
              {categories?.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { updateParam('category', cat.slug); setFiltersOpen(false); }}
                  className={`text-left text-body-md py-2 ${category === cat.slug ? 'text-primary font-semibold' : 'text-text'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <Button fullWidth onClick={() => setFiltersOpen(false)}>
              Show results
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
