import { Link } from 'react-router-dom';
import { CATEGORIES } from '../../constants';
import { siteContent } from '../../data/siteContent';

export default function Footer() {
  return (
    <footer className="bg-brand-emerald text-brand-ivory pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Column 1 */}
          <div className="space-y-4">
            <Link to="/" className="flex flex-col gap-3">
              <img
                src={siteContent.brand.logoPath}
                alt={`${siteContent.brand.name} Logo`}
                className="h-12 md:h-14 w-auto object-contain brightness-0 invert"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="leading-tight">
                <p className="text-2xl font-serif font-bold text-white">
                  {siteContent.brand.name}
                </p>
                <p className="text-brand-champagne font-medium italic text-sm">
                  {siteContent.brand.tagline}
                </p>
              </div>
            </Link>
            <p className="text-brand-ivory/80 text-sm leading-relaxed">
              {siteContent.about.description}
            </p>
          </div>

          {/* Column 2 */}
          <div>
            <h4 className="text-white font-serif font-bold text-lg mb-6">Quick Links</h4>
            <ul className="space-y-4">
              <li><Link to="/" className="hover:text-brand-gold transition-colors">Home</Link></li>
              <li><Link to="/products" className="hover:text-brand-gold transition-colors">Products</Link></li>
              <li><Link to="/bundles" className="hover:text-brand-gold transition-colors">Bundles</Link></li>
              <li><Link to="/#how-to-order" className="hover:text-brand-gold transition-colors">How to Order</Link></li>
              <li><Link to="/faq" className="hover:text-brand-gold transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h4 className="text-white font-serif font-bold text-lg mb-6">Product Categories</h4>
            <ul className="space-y-4">
              {CATEGORIES.map(cat => (
                <li key={cat.id}>
                  <Link to={`/products?category=${cat.id}`} className="hover:text-brand-gold transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <h4 className="text-white font-serif font-bold text-lg mb-6">Contact</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <span className="block text-brand-champagne font-medium mb-1">WhatsApp</span>
                <a href={`https://wa.me/${siteContent.contact.whatsappNumber}`} className="hover:text-brand-gold transition-colors">
                  +{siteContent.contact.whatsappNumber}
                </a>
              </li>
              <li>
                <span className="block text-brand-champagne font-medium mb-1">Location</span>
                <p>{siteContent.contact.address}</p>
              </li>
              <li>
                <span className="block text-brand-champagne font-medium mb-1">Follow Us</span>
                <div className="flex gap-4 mt-2">
                  <a href={siteContent.social.facebook || '#'} className="hover:text-brand-gold transition-colors">Facebook</a>
                  <a href={siteContent.social.instagram || '#'} className="hover:text-brand-gold transition-colors">Instagram</a>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 text-center">
          <p className="text-xs text-brand-ivory/60">
            © {new Date().getFullYear()} {siteContent.brand.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
