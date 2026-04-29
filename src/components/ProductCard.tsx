import { Link } from 'react-router-dom';
import { MessageCircle, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { siteContent } from '../data/siteContent';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const whatsappUrl = `https://wa.me/${siteContent.contact.whatsappNumber}?text=${encodeURIComponent(
    `Hello EMutex Nig, I am interested in ${product.name}. Please send me the price, details, delivery options, and how I can order.`
  )}`;

  return (
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="card group bg-white border border-brand-champagne/20 rounded-[22px] overflow-hidden hover:border-brand-gold/40 hover:shadow-2xl hover:shadow-brand-gold/5 transition-all duration-300"
    >
      <Link to={`/products/${product.slug}`} className="block aspect-[4/5] bg-brand-mist/20 relative overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            width={400}
            height={500}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles size={48} className="text-brand-gold opacity-10" />
          </div>
        )}
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase text-[#0E3B2E] shadow-sm border border-brand-champagne/20">
            {product.category}
          </div>
        </div>
      </Link>
      
      <div className="p-6 space-y-4">
        <div className="space-y-1">
          <Link to={`/products/${product.slug}`}>
            <h3 className="text-xl text-[#0E3B2E] font-serif group-hover:text-brand-emerald transition-colors line-clamp-1 leading-tight">
              {product.name}
            </h3>
          </Link>
          <p className="text-xs text-brand-grey line-clamp-2 min-h-[2.5rem] leading-relaxed opacity-80">
            {product.shortDescription}
          </p>
          {product.bestFor && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brand-mist/50">
              <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.15em]">
                Optimal Support
              </span>
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center gap-2">
          <Link 
            to={`/products/${product.slug}`} 
            className="bg-[#0E3B2E] text-white py-3.5 px-4 text-xs font-bold rounded-xl flex-grow text-center flex items-center justify-center gap-2 hover:bg-[#0a2b22] active:scale-[0.98] transition-all"
          >
            Details
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#FAF7F0] text-[#0E3B2E] border border-brand-champagne/30 p-3 rounded-xl flex items-center justify-center hover:bg-brand-gold hover:text-white hover:border-brand-gold active:scale-[0.98] transition-all shadow-sm"
            title="Confirm Availability on WhatsApp"
          >
            <MessageCircle size={20} />
          </a>
        </div>
      </div>
    </motion.article>
  );
}
