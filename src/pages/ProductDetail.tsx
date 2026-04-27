import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product } from '../types';
import { siteContent } from '../data/siteContent';
import LeadPopup from '../components/LeadPopup';
import { motion } from 'framer-motion';
import { MessageCircle, CheckCircle2, ChevronLeft, Sparkles, ShoppingBag, Info, Shield, HelpCircle, Heart, ChevronRight, MapPin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const productsRef = collection(db, 'products');
        const q = query(productsRef, where('slug', '==', slug), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const productData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Product;
          setProduct(productData);

          // Fetch related products
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
      <div className="flex items-center justify-center min-h-screen bg-brand-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-emerald"></div>
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

  const defaultWhatsappMsg = `Hello EMutex Nig, I am interested in ${product.name}. Please shared more details and how I can get it.`;
  const whatsappUrl = `https://wa.me/${siteContent.contact.whatsappNumber}?text=${encodeURIComponent(
    product.whatsappMessage || defaultWhatsappMsg
  )}`;

  return (
    <div className="pb-24 bg-brand-cream/30 min-h-screen">
      {/* Lead Capture Popup */}
      <LeadPopup productName={product.name} productSlug={product.slug} />

      {/* Navigation Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/products" className="inline-flex items-center gap-2 text-brand-emerald font-medium hover:text-brand-gold transition-colors">
          <ChevronLeft size={18} />
          Back to all products
        </Link>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Images */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="card aspect-square bg-[#FFFDF8] flex items-center justify-center relative overflow-hidden shadow-sm border border-brand-champagne/30">
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
                <div className="absolute top-6 left-6 bg-brand-gold text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                  Top Recommended
                </div>
              )}
            </div>
          </motion.div>

          {/* Info */}
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-brand-mist/50 text-brand-emerald rounded-lg text-xs font-bold uppercase tracking-widest">
                {product.category}
              </span>
              <h1 className="text-4xl lg:text-5xl lg:leading-tight text-[#0E3B2E] font-serif">{product.name}</h1>
              <p className="text-xl text-brand-grey font-medium leading-relaxed italic border-l-4 border-brand-gold pl-4">
                {product.shortDescription}
              </p>
            </div>

            {/* Quick Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {product.wellnessSupportPoints?.map((point, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-medium text-[#0E3B2E]">
                  <CheckCircle2 size={20} className="text-brand-emerald shrink-0" />
                  <span>{point}</span>
                </div>
              ))}
            </div>

            <div className="card p-6 bg-[#FAF7F0] border-brand-champagne/30 space-y-4">
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-brand-grey/60">Current Availability</p>
                    <p className={cn(
                        "text-lg font-bold",
                        product.availability === 'In Stock' ? "text-brand-emerald" : "text-brand-gold"
                    )}>{product.availability}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-brand-grey/60">Price & Delivery</p>
                    <p className="text-lg font-bold text-brand-gold">WhatsApp to Confirm</p>
                  </div>
               </div>
            </div>

            <div className="space-y-4 pt-4">
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-primary w-full py-5 text-xl flex items-center justify-center gap-3 bg-[#0E3B2E] border-0 hover:opacity-95 shadow-2xl shadow-brand-emerald/20"
              >
                <MessageCircle size={28} />
                {product.whatsappCtaText || "Confirm Details on WhatsApp"}
              </a>
              <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-brand-grey/50 uppercase tracking-[0.15em]">
                <span className="flex items-center gap-1.5"><Shield size={12} className="text-brand-gold"/> Selected Quality</span>
                <span className="flex items-center gap-1.5"><ShoppingBag size={12} className="text-brand-gold"/> Easy Delivery</span>
              </div>
            </div>

            {product.bestFor && (
               <div className="card p-6 border-brand-gold/10 flex gap-4 bg-[#FFFDF8]">
                  <div className="w-10 h-10 bg-brand-gold/5 rounded-full flex items-center justify-center text-brand-gold shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-[#0E3B2E]">Ideal For:</h4>
                    <p className="text-sm text-brand-grey leading-relaxed">{product.bestFor}</p>
                  </div>
               </div>
            )}
          </div>
        </div>
      </section>

      {/* Full Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Main Info */}
          <div className="lg:col-span-8 space-y-16">
            <div className="space-y-8">
              <div className="flex items-center gap-3 text-[#0E3B2E] border-b border-brand-champagne/30 pb-4">
                <Info size={28} className="text-brand-gold" />
                <h2 className="text-3xl font-serif">Product Overview</h2>
              </div>
              <div className="markdown-body text-brand-charcoal text-lg leading-relaxed space-y-6">
                <ReactMarkdown>{product.fullDescription}</ReactMarkdown>
              </div>
            </div>

            {product.benefits && product.benefits.length > 0 && (
              <div className="space-y-8">
                <div className="flex items-center gap-3 text-[#0E3B2E] border-b border-brand-champagne/30 pb-4">
                  <Heart size={28} className="text-brand-gold" />
                  <h2 className="text-3xl font-serif">Key Benefits</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {product.benefits.map((benefit, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-brand-champagne/20 flex gap-4 shadow-sm">
                      <div className="p-2 h-fit bg-brand-mist/50 rounded-xl text-brand-emerald">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="text-[#0E3B2E] font-medium leading-relaxed">{benefit}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.faq && product.faq.length > 0 && (
              <div className="space-y-8">
                <div className="flex items-center gap-3 text-[#0E3B2E] border-b border-brand-champagne/30 pb-4">
                  <HelpCircle size={28} className="text-brand-gold" />
                  <h2 className="text-3xl font-serif">Product FAQ</h2>
                </div>
                <div className="space-y-4">
                  {product.faq.map((item, i) => (
                    <details key={i} className="card group bg-white">
                      <summary className="p-6 cursor-pointer flex items-center justify-between font-bold text-[#0E3B2E] hover:text-brand-gold transition-all list-none">
                        {item.question}
                        <ChevronRight className="group-open:rotate-90 transition-transform text-brand-gold" />
                      </summary>
                      <div className="px-6 pb-6 text-brand-grey leading-relaxed border-t border-brand-mist pt-4">
                        {item.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar / Additional Info */}
          <div className="lg:col-span-4 space-y-12">
            <div className="card p-8 bg-[#0E3B2E] text-white border-0 shadow-2xl sticky top-28 overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <ShoppingBag size={150} />
              </div>
              <div className="relative z-10 space-y-8">
                <h3 className="text-2xl text-white font-serif border-b border-white/10 pb-4">How to Order</h3>
                <div className="space-y-6 text-sm">
                  <div className="flex gap-4 items-start">
                    <span className="w-6 h-6 rounded-full bg-brand-gold text-[#0E3B2E] flex items-center justify-center shrink-0 font-bold">1</span>
                    <p className="text-brand-champagne/80">Click "Confirm Details on WhatsApp"</p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <span className="w-6 h-6 rounded-full bg-brand-gold text-[#0E3B2E] flex items-center justify-center shrink-0 font-bold">2</span>
                    <p className="text-brand-champagne/80">Send our pre-filled message directly</p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <span className="w-6 h-6 rounded-full bg-brand-gold text-[#0E3B2E] flex items-center justify-center shrink-0 font-bold">3</span>
                    <p className="text-brand-champagne/80">We discuss price, payment, and delivery</p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <span className="w-6 h-6 rounded-full bg-brand-gold text-[#0E3B2E] flex items-center justify-center shrink-0 font-bold">4</span>
                    <p className="text-brand-champagne/80">Order is confirmed and shipped from Akwa Ibom</p>
                  </div>
                </div>
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full bg-brand-gold text-[#0E3B2E] py-4 rounded-xl font-bold block text-center shadow-lg hover:shadow-brand-gold/20 transition-all border-0"
                >
                  Message Specialist
                </a>
              </div>
            </div>
            
            {product.disclaimer && (
                <div className="p-6 rounded-2xl bg-[#FFFDF8] border border-brand-gold/10 text-[11px] text-brand-grey leading-relaxed flex gap-3 shadow-sm italic">
                    <Shield size={16} className="shrink-0 text-brand-gold" />
                    <p>{product.disclaimer}</p>
                </div>
            )}

            <div className="p-6 rounded-2xl bg-brand-mist/20 border border-brand-emerald/10 text-xs text-brand-grey text-center space-y-2">
                <MapPin size={24} className="mx-auto text-brand-gold mb-2" />
                <p className="font-bold text-[#0E3B2E]">Fast Nationwide Delivery</p>
                <p>Shipped directly from our hub in Akwa Ibom to any location in Nigeria.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final WhatsApp CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-24">
        <div className="card p-12 lg:p-20 space-y-8 border-brand-gold/30 bg-[#FFFDF8] shadow-xl relative overflow-hidden">
          <div className="absolute bottom-0 right-0 p-8 opacity-5">
            <Sparkles size={200} />
          </div>
          <h2 className="text-4xl lg:text-5xl text-[#0E3B2E] font-serif">Have more questions about <span className="text-brand-gold italic">{product.name}?</span></h2>
          <p className="text-xl text-brand-grey max-w-3xl mx-auto leading-relaxed">
            Our wellness support team is available on WhatsApp to provide personalized guidance and handle your order details privately.
          </p>
          <div className="pt-4">
            <a 
              href={whatsappUrl}
              className="btn-primary px-12 py-5 text-xl inline-flex items-center gap-3 bg-[#0E3B2E] border-0 hover:scale-[1.02] transition-all"
            >
              <MessageCircle size={24} />
              Message Specialists
            </a>
          </div>
          <p className="text-xs text-brand-grey/50 uppercase tracking-[0.2em] font-bold">Fast Response During Business Hours</p>
        </div>
      </section>
    </div>
  );
}

