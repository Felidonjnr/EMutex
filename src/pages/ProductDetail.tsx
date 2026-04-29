import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product } from '../types';
import { siteContent } from '../data/siteContent';
import LeadPopup from '../components/LeadPopup';
import { motion } from 'framer-motion';
import { MessageCircle, CheckCircle2, ChevronLeft, Sparkles, ShoppingBag, Info, Shield, HelpCircle, Heart, ChevronRight, MapPin, Share2, Award, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { useSEO } from '../hooks/useSEO';
import { DetailedProductSkeleton } from '../components/Skeleton';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useSEO({
    title: product ? `${product.name} | EMutex Nig` : 'Wellness Product | EMutex Nig',
    description: product?.shortDescription || 'EMutex Nig offers premium wellness products for balanced living.',
    image: product?.imageUrl
  });

  useEffect(() => {
    async function fetchProduct() {
      if (!db) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const productsRef = collection(db, 'products');
        const q = query(productsRef, where('slug', '==', slug), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const productData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Product;
          setProduct(productData);

          if (productData.category) {
            const relatedQ = query(
              productsRef, 
              where('category', '==', productData.category), 
              where('slug', '!=', slug),
              where('visible', '==', true),
              limit(3)
            );
            const relatedSnap = await getDocs(relatedQ);
            const relatedData = relatedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setRelatedProducts(relatedData);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `products/${slug}`);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-brand-cream min-h-screen pt-20">
        <DetailedProductSkeleton />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6 px-4 bg-brand-cream">
        <h2 className="text-3xl font-serif text-[#0E3B2E]">Product Not Found</h2>
        <p className="text-brand-grey">The wellness product you're looking for might have been moved or renamed.</p>
        <Link to="/products" className="btn-primary flex items-center gap-2">
          <ChevronLeft size={20} />
          Back to Catalogue
        </Link>
      </div>
    );
  }

  const defaultWhatsappMsg = `Hello EMutex Nig, I am interested in ${product.name}. Please send me the price, details, delivery options, and how I can order.`;
  const whatsappUrl = `https://wa.me/${siteContent.contact.whatsappNumber}?text=${encodeURIComponent(
    product.whatsappMessage || defaultWhatsappMsg
  )}`;

  return (
    <div className="pb-24 bg-brand-cream/30 min-h-screen">
      <LeadPopup productName={product.name} productSlug={product.slug} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/products" className="inline-flex items-center gap-2 text-brand-emerald font-semibold hover:text-brand-gold transition-colors text-sm uppercase tracking-widest">
          <ChevronLeft size={16} />
          All Wellness Products
        </Link>
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="card aspect-square bg-white flex items-center justify-center relative overflow-hidden shadow-2xl shadow-brand-emerald/5 rounded-[32px] border border-brand-champagne/20">
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Sparkles size={120} className="text-brand-gold opacity-10" />
              )}
              {product.featured && (
                <div className="absolute top-8 left-8 bg-brand-emerald text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
                  Curated Selection
                </div>
              )}
              <button className="absolute bottom-8 right-8 p-4 bg-white/90 backdrop-blur rounded-2xl text-brand-emerald shadow-xl hover:bg-white transition-all">
                <Share2 size={20} />
              </button>
            </div>
          </motion.div>

          <div className="space-y-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-block px-3 py-1 bg-brand-gold/10 text-brand-gold rounded-lg text-[9px] font-black uppercase tracking-[0.25em]">
                  {product.category}
                </span>
              </div>
              <h1 className="text-4xl lg:text-6xl lg:leading-tight text-[#0E3B2E] font-serif tracking-tight">{product.name}</h1>
              <p className="text-xl lg:text-2xl text-brand-grey font-medium leading-relaxed italic border-l-4 border-brand-gold pl-6 py-2">
                {product.shortDescription}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 p-1 bg-brand-mist/20 rounded-[28px] border border-brand-champagne/20 overflow-hidden">
               <div className="p-6 space-y-2 text-center border-r border-brand-champagne/20">
                  <p className="text-[10px] uppercase font-black tracking-widest text-brand-grey/60">Status</p>
                  <div className="flex items-center justify-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full animate-pulse", product.availability === 'In Stock' ? "bg-brand-emerald" : "bg-brand-gold")} />
                    <p className="text-lg font-bold text-[#0E3B2E]">{product.availability}</p>
                  </div>
               </div>
               <div className="p-6 space-y-2 text-center">
                  <p className="text-[10px] uppercase font-black tracking-widest text-brand-grey/60">Investment</p>
                  <p className="text-lg font-bold text-brand-emerald">
                    {product.price ? `₦${product.price.toLocaleString()}` : "Confirm Price"}
                  </p>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {product.wellnessSupportPoints?.slice(0, 4).map((point, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-medium text-[#0E3B2E] bg-white p-4 rounded-2xl border border-brand-champagne/10 shadow-sm">
                  <Award size={18} className="text-brand-gold shrink-0" />
                  <span>{point}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-4">
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-6 text-xl rounded-[22px] flex items-center justify-center gap-3 bg-[#0E3B2E] text-white font-black hover:bg-[#0a2b22] shadow-2xl shadow-brand-emerald/20 transition-all active:scale-[0.98]"
              >
                <MessageCircle size={28} />
                {product.price ? "Order / Confirm Availability" : "Confirm Price on WhatsApp"}
              </a>
              
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-brand-grey/60 uppercase tracking-[0.15em]">
                  <Zap size={14} className="text-brand-gold"/> Simple WhatsApp Ordering
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-brand-grey/60 uppercase tracking-[0.15em]">
                  <Shield size={14} className="text-brand-gold"/> Product Guidance
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-brand-grey/60 uppercase tracking-[0.15em]">
                  <ShoppingBag size={14} className="text-brand-gold"/> Delivery Available
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          <div className="lg:col-span-8 space-y-20">
            <div className="space-y-10">
              <div className="inline-flex items-center gap-3 text-[#0E3B2E] border-b-2 border-brand-gold/20 pb-4">
                <Info size={32} className="text-brand-gold" />
                <h2 className="text-4xl font-serif">Deep Product Care</h2>
              </div>
              <div className="markdown-body text-[#0E3B2E] text-lg leading-relaxed space-y-6 opacity-90 prose prose-emerald max-w-none">
                <ReactMarkdown>{product.fullDescription}</ReactMarkdown>
              </div>
            </div>

            {product.benefits && product.benefits.length > 0 && (
              <div className="space-y-10">
                <div className="inline-flex items-center gap-3 text-[#0E3B2E] border-b-2 border-brand-gold/20 pb-4">
                  <Award size={32} className="text-brand-gold" />
                  <h2 className="text-4xl font-serif">Main Advantages</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {product.benefits.map((benefit, i) => (
                    <div key={i} className="bg-white p-8 rounded-[28px] border border-brand-champagne/20 flex gap-5 shadow-sm hover:border-brand-emerald/20 transition-all">
                      <div className="p-3 h-fit bg-brand-emerald/5 rounded-2xl text-brand-emerald shrink-0">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="text-[#0E3B2E] font-medium leading-relaxed text-sm lg:text-base">{benefit}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-12">
            <div className="p-10 bg-[#0E3B2E] text-white rounded-[32px] shadow-2xl border-0 sticky top-28 overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                <ShoppingBag size={180} />
              </div>
              <div className="relative z-10 space-y-8">
                <h3 className="text-2xl text-white font-serif border-b border-white/10 pb-4">Order Process</h3>
                <div className="space-y-8 text-sm">
                  {[
                    "Click the WhatsApp order button",
                    "Send our specialized inquiry message",
                    "A specialist confirms price & stock",
                    "Secure delivery is arranged nationwide"
                  ].map((step, i) => (
                    <div key={i} className="flex gap-5 items-start">
                      <div className="w-8 h-8 rounded-full bg-brand-gold text-[#0E3B2E] flex items-center justify-center shrink-0 font-black shadow-lg">
                        {i + 1}
                      </div>
                      <p className="text-brand-champagne/80 font-medium py-1">{step}</p>
                    </div>
                  ))}
                </div>
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full bg-brand-gold text-[#0E3B2E] py-5 rounded-2xl font-black block text-center shadow-xl hover:shadow-brand-gold/30 hover:-translate-y-0.5 transition-all"
                >
                  Message Support
                </a>
              </div>
            </div>

            {product.disclaimer && (
                <div className="p-8 rounded-[28px] bg-white border border-brand-gold/10 text-[11px] lg:text-xs text-brand-grey/80 leading-relaxed flex gap-4 shadow-sm italic ring-1 ring-brand-gold/5">
                    <Shield size={20} className="shrink-0 text-brand-gold" />
                    <p>{product.disclaimer}</p>
                </div>
            )}

            <div className="p-8 rounded-[28px] bg-brand-emerald/[0.03] border border-brand-emerald/10 text-xs text-brand-grey text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <MapPin size={28} className="text-brand-gold" />
                </div>
                <div className="space-y-1">
                  <p className="font-black text-[#0E3B2E] text-sm uppercase tracking-widest">Akwa Ibom Hub</p>
                  <p className="leading-relaxed opacity-70 font-medium">Nationwide delivery is available. We ship carefully from our regional headquarters.</p>
                </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

