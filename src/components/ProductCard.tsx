import { Link } from 'react-router-dom';
import { MessageCircle, ChevronRight, Sparkles } from 'lucide-react';
import { Product } from '../types';
import { useSiteContent } from '../context/SiteContentContext';
import { generateSlug, cn } from '../lib/utils';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { content } = useSiteContent();

  const safeSlug = product.slug && product.slug.trim() 
    ? generateSlug(product.slug) 
    : generateSlug(product.name || product.id);

  const whatsappUrl = `https://wa.me/${content.contact.whatsappNumber}?text=${encodeURIComponent(
    product.whatsappMessage || `Hello ${content.brand.name}, I am interested in ${product.name}. Please send me the current price, product details, delivery options, and how I can order.`
  )}`;

  const displayPrice = () => {
    if (!product.price || product.price === 'Confirm on WhatsApp' || product.price.trim() === '') {
      return (
        <p className="text-sm font-bold text-brand-gold">Price: WhatsApp</p>
      );
    }
    return (
      <p className="text-sm font-bold text-brand-emerald">₦{product.price}</p>
    );
  };

  return (
    <article className="product-card group bg-white border border-brand-champagne/20 rounded-3xl overflow-hidden flex flex-col h-full">
      <div className="image-wrapper aspect-product bg-brand-mist/10 flex items-center justify-center relative overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={`${product.name} - EMutex Nig`}
            width="400"
            height="500"
            loading="lazy"
            className="w-full h-full object-cover md:group-hover:scale-105 transition-transform duration-500 product-image"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Sparkles size={48} className="text-brand-gold opacity-10" />
        )}
        
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <div className="bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-widest uppercase text-brand-emerald shadow-sm">
            {product.category}
          </div>
          {product.featured && (
            <div className="bg-brand-gold text-white px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-widest uppercase shadow-sm">
              Featured
            </div>
          )}
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow space-y-3">
        <div className="flex-grow space-y-1">
          <h3 className="text-lg text-brand-emerald font-serif group-hover:text-brand-gold transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs text-brand-grey line-clamp-2 leading-relaxed min-h-[2.5rem]">
            {product.shortDescription}
          </p>
          
          <div className="pt-2">
            {displayPrice()}
          </div>
        </div>

        <div className="pt-3 flex items-center gap-2 border-t border-brand-champagne/10">
          <Link 
            to={`/products/${safeSlug}`} 
            className="bg-brand-emerald text-white py-3 px-4 text-[10px] font-bold rounded-xl flex-grow text-center flex items-center justify-center gap-1 hover:opacity-90 transition-all uppercase tracking-wider"
          >
            Details <ChevronRight size={14} />
          </Link>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-brand-cream text-brand-emerald border border-brand-emerald/10 p-3 rounded-xl flex items-center justify-center hover:bg-brand-mist transition-all shadow-sm"
          >
            <MessageCircle size={18} />
          </a>
        </div>
      </div>
    </article>
  );
}
