import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, ShieldCheck, Truck, Factory } from 'lucide-react';

const footerLinks = {
  Shop: [
    { label: 'TMT Bars', href: '/products?category=tmt-bars' },
    { label: 'Structural Steel', href: '/products?category=structural-steel' },
    { label: 'Pipes & Tubes', href: '/products?category=pipes-tubes' },
    { label: 'Sheets & Plates', href: '/products?category=sheets-plates' },
  ],
  Account: [
    { label: 'My orders', href: '/orders' },
    { label: 'Wishlist', href: '/wishlist' },
    { label: 'Track an order', href: '/orders' },
    { label: 'Profile settings', href: '/profile' },
  ],
  Company: [
    { label: 'About AMK Steels', href: '/about' },
    { label: 'Bulk & institutional orders', href: '/contact' },
    { label: 'Quality certifications', href: '/about' },
    { label: 'Contact us', href: '/contact' },
  ],
};

export default function Footer() {
  return (
    <footer className="hidden lg:block bg-text text-white mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-4 gap-10 border-b border-white/10 pb-6 mb-10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-accent flex-shrink-0" />
            <div>
              <p className="text-label-md text-white">IS-certified mills</p>
              <p className="text-body-sm text-white/60">Every batch lab-tested</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-accent flex-shrink-0" />
            <div>
              <p className="text-label-md text-white">Pan-India dispatch</p>
              <p className="text-body-sm text-white/60">Tracked freight & GPS</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Factory className="w-6 h-6 text-accent flex-shrink-0" />
            <div>
              <p className="text-label-md text-white">Mill-direct pricing</p>
              <p className="text-body-sm text-white/60">No middleman markup</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-6 h-6 text-accent flex-shrink-0" />
            <div>
              <p className="text-label-md text-white">Dedicated order desk</p>
              <p className="text-body-sm text-white/60">+91 44 4567 8900</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 bg-primary rounded-standard flex items-center justify-center">
                <span className="text-white font-mono font-bold text-sm">AMK</span>
              </div>
              <span className="text-headline-md text-white font-mono">AMK Steels</span>
            </div>
            <p className="text-body-sm text-white/60 max-w-xs leading-relaxed">
              Industrial-grade steel — TMT bars, structural sections, pipes and sheets — sourced direct
              from certified mills and delivered to your site.
            </p>
            <div className="flex items-center gap-2 mt-4 text-body-sm text-white/60">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              Ambattur Industrial Estate, Chennai, Tamil Nadu 600058
            </div>
            <div className="flex items-center gap-2 mt-2 text-body-sm text-white/60">
              <Mail className="w-4 h-4 flex-shrink-0" />
              orders@amksteels.in
            </div>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <p className="text-label-sm text-white/50 mb-4">{heading}</p>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-body-sm text-white/70 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/10 text-body-sm text-white/40">
          <p>© {new Date().getFullYear()} AMK Steels Marketplace. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-white/70">Terms</Link>
            <Link to="/privacy" className="hover:text-white/70">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
