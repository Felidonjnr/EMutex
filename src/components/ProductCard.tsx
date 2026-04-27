import { Link } from 'react-router-dom';
import { MessageCircle, ChevronRight, Sparkles } from 'lucide-react';
import { Product } from '../types';
import { siteContent } from '../data/siteContent';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const whatsappUrl = `https://wa.me/${siteContent.contact.whatsappNumber}?text=${encodeURIComponent(
    product.whatsappMessage || `Hello EMutex Nig, I am interested in ${product.name}. Please shared more details and how I can get it.`
  )}`;

  return (
    <div className="card group hover:border-brand-gold/50 transition-all duration-300 bg-white">
      <div className="aspect-[4/5] bg-brand-mist/30 flex items-center justify-center relative overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Sparkles size={64} className="text-brand-gold opacity-10" />
        )}
        <div className="absolute top-4 left-4">
          <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-[10px] font-bold tracking-widest uppercase text-[#0E3B2E] shadow-sm">
            {product.category}
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-xl text-[#0E3B2E] font-serif group-hover:text-brand-gold transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs text-brand-grey line-clamp-2 min-h-[2.5rem] leading-relaxed">
            {product.shortDescription}
          </p>
          {product.bestFor && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-1.5 h-1.5 bg-brand-gold rounded-full" />
              <p className="text-[10px] font-bold text-[#0E3B2E] uppercase tracking-wider">
                Support: {product.bestFor}
              </p>
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center gap-2">
          <Link 
            to={`/products/${product.slug}`} 
            className="bg-[#0E3B2E] text-white py-3 px-4 text-xs font-bold rounded-xl flex-grow text-center flex items-center justify-center gap-2 hover:opacity-90 transition-all"
          >
            View Details
            <ChevronRight size={14} />
          </Link>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#FAF7F0] text-[#0E3B2E] border border-[#0E3B2E]/10 p-3 rounded-xl flex items-center justify-center hover:bg-brand-mist transition-all shadow-sm"
            title="Ask on WhatsApp"
          >
            <MessageCircle size={18} />
          </a>
        </div>
      </div>
    </div>
  );
}
