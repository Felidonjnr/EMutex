import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { siteContent } from '../../data/siteContent';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/#about' },
  { name: 'Products', href: '/products' },
  { name: 'Bundles', href: '/bundles' },
  { name: 'FAQ', href: '/faq' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const handleWhatsAppClick = () => {
    const url = `https://wa.me/${siteContent.contact.whatsappNumber}?text=${encodeURIComponent(siteContent.finalCta.subtitle)}`;
    window.open(url, '_blank');
  };

  return (
    <nav className="sticky top-0 z-50 bg-brand-ivory/80 backdrop-blur-md border-b border-brand-champagne/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center gap-4 group">
              <div className="relative">
                <img
                  src={siteContent.brand.logoPath}
                  alt={`${siteContent.brand.name} Logo`}
                  className="h-10 md:h-12 w-auto object-contain transition-transform group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg md:text-xl font-bold text-[#0E3B2E] tracking-tight leading-none mb-1">
                  {siteContent.brand.name}
                </h1>
                <p className="hidden md:block text-[10px] text-brand-emerald/70 uppercase tracking-[0.2em] font-bold leading-none">
                  {siteContent.brand.tagline}
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-brand-gold",
                  location.pathname === link.href ? "text-brand-gold" : "text-brand-charcoal"
                )}
              >
                {link.name}
              </Link>
            ))}
            <button
              onClick={handleWhatsAppClick}
              className="px-5 py-2 bg-brand-emerald text-white rounded-full text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all"
            >
              <MessageCircle size={18} />
              WhatsApp
            </button>
          </div>

          {/* Mobile Menu Icons */}
          <div className="flex lg:hidden items-center gap-4">
            <button
              onClick={handleWhatsAppClick}
              className="p-2 text-brand-emerald hover:bg-brand-mist rounded-full transition-colors"
              aria-label="WhatsApp"
            >
              <MessageCircle size={24} />
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-brand-charcoal hover:bg-brand-mist rounded-full transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-brand-cream border-t border-brand-champagne/20 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-4 text-base font-medium text-brand-charcoal hover:text-brand-gold hover:bg-brand-ivory rounded-lg transition-all"
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-4 px-3">
                <button
                  onClick={handleWhatsAppClick}
                  className="w-full py-4 bg-brand-emerald text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <MessageCircle size={20} />
                  Chat on WhatsApp
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
