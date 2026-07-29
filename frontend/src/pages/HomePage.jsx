import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Truck, BadgePercent, Phone } from 'lucide-react';
import { useFeaturedProducts, useFlatCategories } from '../hooks/useProducts';
import ProductGrid from '../components/product/ProductGrid';

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const heroItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const sectionReveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function HomePage() {
  const { data: featured, isLoading: loadingFeatured } = useFeaturedProducts();
  const { data: categories, isLoading: loadingCategories } = useFlatCategories();

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-text overflow-hidden">
        {/* Ambient molten-seam glow drifting behind the hero content */}
        <div className="absolute inset-0 opacity-40 molten-seam animate-seam-drift" aria-hidden="true" />
        <div className="absolute inset-0 bg-text/70" aria-hidden="true" />

        <motion.div
          variants={heroContainer}
          initial="hidden"
          animate="show"
          className="relative max-w-7xl mx-auto px-4 lg:px-6 py-14 lg:py-20 grid lg:grid-cols-2 gap-10 items-center"
        >
          <div>
            <motion.span
              variants={heroItem}
              className="inline-block text-label-sm text-accent bg-accent/10 px-3 py-1.5 rounded-standard mb-5 font-mono"
            >
              MILL-DIRECT · IS-CERTIFIED · PAN-INDIA DISPATCH
            </motion.span>
            <motion.h1
              variants={heroItem}
              className="text-headline-xl-mobile lg:text-headline-xl text-white mb-4"
            >
              Structural steel, ordered like it's 2026.
            </motion.h1>
            <motion.p variants={heroItem} className="text-body-lg text-white/70 mb-8 max-w-lg">
              TMT bars, structural sections, pipes and sheets — priced transparently, tested for spec, and
              tracked from mill to site.
            </motion.p>
            <motion.div variants={heroItem} className="flex flex-wrap gap-3">
              <Link
                to="/products"
                className="relative overflow-hidden btn-sheen h-12 px-6 rounded-standard bg-accent text-white font-semibold flex items-center gap-2 hover:bg-accent-dark hover:-translate-y-0.5 hover:shadow-lift transition-all duration-200"
              >
                Browse catalog <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/contact"
                className="h-12 px-6 rounded-standard border border-white/20 text-white font-semibold flex items-center hover:bg-white/5 hover:-translate-y-0.5 transition-all duration-200"
              >
                Bulk order enquiry
              </Link>
            </motion.div>
          </div>
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {[
              { label: 'Fe 500D TMT', spec: 'IS 1786:2008', price: '₹52,400 / MT' },
              { label: 'MS Structural Angle', spec: '50×50×6mm', price: '₹56.20 / kg' },
              { label: 'ERW MS Pipe', spec: 'Sch 40', price: '₹64.80 / kg' },
              { label: 'HR Sheet', spec: '3mm, IS 2062', price: '₹58.90 / kg' },
            ].map((card) => (
              <motion.div
                key={card.label}
                variants={heroItem}
                whileHover={{ y: -4 }}
                className="bg-white/5 border border-white/10 rounded-container p-4 backdrop-blur-sm transition-colors hover:border-accent/40 hover:bg-white/[0.07]"
              >
                <p className="text-label-sm text-accent font-mono mb-2">{card.spec}</p>
                <p className="text-body-md text-white font-semibold mb-1">{card.label}</p>
                <p className="text-body-sm text-white/60 font-mono">{card.price}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Trust bar */}
      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="max-w-7xl mx-auto px-4 lg:px-6 -mt-6 lg:-mt-8 relative z-10"
      >
        <div className="grid grid-cols-3 gap-3 bg-surface border border-border rounded-container shadow-panel p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row items-center lg:items-center gap-2 text-center lg:text-left">
            <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0" />
            <span className="text-body-sm text-text-secondary">IS-certified, lab-tested</span>
          </div>
          <div className="flex flex-col lg:flex-row items-center lg:items-center gap-2 text-center lg:text-left">
            <Truck className="w-6 h-6 text-primary flex-shrink-0" />
            <span className="text-body-sm text-text-secondary">Tracked freight dispatch</span>
          </div>
          <div className="flex flex-col lg:flex-row items-center lg:items-center gap-2 text-center lg:text-left">
            <BadgePercent className="w-6 h-6 text-primary flex-shrink-0" />
            <span className="text-body-sm text-text-secondary">Transparent mill pricing</span>
          </div>
        </div>
      </motion.section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
        <h2 className="text-headline-lg text-text mb-6">Shop by category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(loadingCategories ? Array.from({ length: 6 }) : categories)?.map((cat, i) =>
            cat ? (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.35, delay: i * 0.04, ease: 'easeOut' }}
              >
                <Link
                  to={`/products?category=${cat.slug}`}
                  className="group flex flex-col items-center gap-3 p-4 bg-surface border border-border rounded-container hover:border-primary hover:shadow-panel hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-standard bg-primary-light flex items-center justify-center text-primary font-mono font-bold group-hover:scale-110 transition-transform duration-200">
                    {cat.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-body-sm text-text text-center font-medium">{cat.name}</span>
                </Link>
              </motion.div>
            ) : (
              <div key={i} className="h-28 rounded-container animate-shimmer" />
            )
          )}
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-4 lg:px-6 pb-14">
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="flex items-center justify-between mb-6"
        >
          <h2 className="text-headline-lg text-text">Featured products</h2>
          <Link to="/products" className="text-body-sm text-primary font-semibold flex items-center gap-1 hover:text-primary-dark">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
        <ProductGrid products={featured} isLoading={loadingFeatured} skeletonCount={8} />
      </section>

      {/* CTA strip */}
      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="molten-seam"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="text-center lg:text-left">
            <p className="text-headline-md text-white mb-1">Need volumes beyond catalog stock?</p>
            <p className="text-body-sm text-white/80">Talk to our order desk for project-scale quotes and freight planning.</p>
          </div>
          <a
            href="tel:+914445678900"
            className="h-12 px-6 rounded-standard bg-white text-primary font-semibold flex items-center gap-2 flex-shrink-0 hover:-translate-y-0.5 hover:shadow-lift transition-all duration-200"
          >
            <Phone className="w-4 h-4" /> +91 44 4567 8900
          </a>
        </div>
      </motion.section>
    </div>
  );
}
