import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bundle, Product } from '../types';
import { useSiteContent } from '../context/SiteContentContext';
import { motion } from 'framer-motion';
import { MessageCircle, ChevronLeft, Sparkles, Package, Shield, Heart, CheckCircle2, ShoppingBag, ArrowUpRight, AlertTriangle, Loader2, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn, generateSlug } from '../lib/utils';
import SEO from '../components/SEO';

export default function BundleDetail() {
  const { content } = useSiteContent();
  const { slug: bundleKey } = useParams<{ slug: string }>();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [linkedProducts, setLinkedProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function fetchBundle() {
      if (!db || !bundleKey) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorType(null);
      const normalizedKey = generateSlug(bundleKey);

      try {
        const bundlesRef = collection(db, 'bundles');
        let bundleData: Bundle | null = null;
        
        // --- STEP 1: Exact Slug Match ---
        const exactSlugQuery = query(
          bundlesRef, 
          where('slug', '==', bundleKey), 
          where('visible', '==', true),
          limit(1)
        );
        const exactSnap = await getDocs(exactSlugQuery);
        if (!exactSnap.empty) {
          bundleData = { id: exactSnap.docs[0].id, ...exactSnap.docs[0].data() } as Bundle;
        }

        // --- STEP 2: Normalized Slug Match ---
        if (!bundleData && normalizedKey !== bundleKey) {
          const normQuery = query(
            bundlesRef,
            where('slug', '==', normalizedKey),
            where('visible', '==', true),
            limit(1)
          );
          const normSnap = await getDocs(normQuery);
          if (!normSnap.empty) {
            bundleData = { id: normSnap.docs[0].id, ...normSnap.docs[0].data() } as Bundle;
          }
        }

        // --- STEP 3: Document ID Match ---
        if (!bundleData) {
          try {
            const docRef = doc(db, 'bundles', bundleKey);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.visible !== false) {
                bundleData = { id: docSnap.id, ...data } as Bundle;
              }
            }
          } catch (e) { }
        }

        // --- STEP 4: Frontend Fuzzy Match ---
        if (!bundleData) {
          const allVisibleQuery = query(bundlesRef, where('visible', '==', true));
          const allSnap = await getDocs(allVisibleQuery);
          const allBundles = allSnap.docs.map(d => ({ id: d.id, ...d.data() } as Bundle));
          
          bundleData = allBundles.find(b => 
            generateSlug(b.slug || '') === normalizedKey ||
            generateSlug(b.name || '') === normalizedKey ||
            b.id === bundleKey
          ) || null;

          // Repair Slug if found by name/id fallback
          if (bundleData && (!bundleData.slug || generateSlug(bundleData.slug) !== generateSlug(bundleData.name))) {
            try {
              const newSlug = generateSlug(bundleData.name);
              await updateDoc(doc(db, 'bundles', bundleData.id), { slug: newSlug });
              bundleData.slug = newSlug;
            } catch (e) {
              console.warn("Failed to repair bundle slug on the fly", e);
            }
          }
        }

        if (bundleData) {
          setBundle(bundleData);

          // Fetch linked products
          if (bundleData.includedProductIds && bundleData.includedProductIds.length > 0) {
             const productsRef = collection(db, 'products');
             const productDocs = await Promise.all(
                bundleData.includedProductIds.map(id => getDoc(doc(productsRef, id)))
             );
             const products = productDocs
                .filter(d => d.exists())
                .map(d => ({ id: d.id, ...d.data() } as Product));
             setLinkedProducts(products);
          }
        }
      } catch (error: any) {
        console.error(`Bundle resolution error for ${bundleKey}:`, error);
        if (error.message?.includes('permission') || error.message?.includes('offline')) {
          setErrorType("NETWORK_ERROR");
        } else {
          setErrorType("NOT_FOUND");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchBundle();
  }, [bundleKey]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-brand-cream/30 text-center">
        <Loader2 className="animate-spin text-brand-emerald mb-4" size={48} />
        <p className="text-brand-grey font-medium">Resolving bundle details...</p>
      </div>
    );
  }

  if (!bundle) {
    const isNetworkError = errorType === "NETWORK_ERROR";
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-8 px-4 bg-brand-cream/30 text-center">
        <div className="w-24 h-24 bg-brand-gold/10 rounded-full flex items-center justify-center text-brand-gold">
          {isNetworkError ? <AlertTriangle size={48} /> : <Package size={48} />}
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-serif text-[#0E3B2E]">
            {isNetworkError ? 'Connection Issue' : 'Bundle Not Found'}
          </h2>
          <p className="text-brand-grey max-w-sm mx-auto leading-relaxed">
            {isNetworkError 
              ? "We could not load this bundle right now. Please refresh or contact us on WhatsApp."
              : "This wellness combination might have been moved or is no longer available. Please check our updated catalogue."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Link to="/bundles" className="btn-primary flex items-center justify-center gap-2 px-10 py-4 shadow-xl shadow-brand-emerald/10">
            <ChevronLeft size={20} />
            Explore Bundles
          </Link>
          <a 
            href={`https://wa.me/${content.brand.whatsappNumber.replace(/\+/g, '')}?text=${encodeURIComponent(`Hello, I'm looking for bundle: ${bundleKey}. Can you help me find it?`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center justify-center gap-2 px-10 py-4 bg-white"
          >
            <MessageCircle size={20} />
            Ask on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  const defaultWhatsappMsg = `Hello EMutex Nig, I am interested in the ${bundle.name}. Please send me the current bundle price, products included, delivery options, and how I can order.`;
  const whatsappUrl = `https://wa.me/${content.contact.whatsappNumber}?text=${encodeURIComponent(
    bundle.whatsappMessage || defaultWhatsappMsg
  )}`;

  return (
    <div className="pb-24 bg-brand-cream/30 min-h-screen">
      <SEO 
        title={bundle.name}
        description={bundle.shortDescription}
        image={bundle.imageUrl}
        type="website"
        url={`https://emutexnig.com/bundles/${bundle.slug}`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/bundles" className="inline-flex items-center gap-2 text-brand-emerald font-medium hover:text-brand-gold transition-colors">
          <ChevronLeft size={18} />
          Back to all bundles
        </Link>
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card aspect-[4/3] bg-white flex items-center justify-center relative overflow-hidden shadow-sm border border-brand-champagne/30 hero-card contain-paint"
          >
            {bundle.imageUrl ? (
              <img src={bundle.imageUrl} alt={bundle.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Package size={120} className="text-brand-gold opacity-10" />
            )}
            {bundle.featured && (
              <div className="absolute top-6 left-6 bg-brand-gold text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                Featured Bundle
              </div>
            )}
          </motion.div>

          <div className="space-y-8">
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-brand-gold/10 text-brand-gold rounded-lg text-xs font-bold uppercase tracking-widest">
                Wellness Combination
              </span>
              <h1 className="text-4xl lg:text-5xl lg:leading-tight text-[#0E3B2E] font-serif">{bundle.name}</h1>
              <p className="text-xl text-brand-grey font-medium leading-relaxed italic border-l-4 border-brand-gold pl-4">
                {bundle.shortDescription}
              </p>
            </div>

            <div className="card p-6 bg-[#FAF7F0] border-brand-champagne/30">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-brand-grey/60">Bundle Price</p>
                    <p className="text-2xl font-bold text-brand-emerald">
                       {bundle.price ? `Price: ₦${bundle.price.replace('₦', '').trim()}` : 'Confirm current price on WhatsApp'}
                    </p>
                    {bundle.price && <p className="text-[10px] text-brand-grey italic">Please confirm the latest price before ordering.</p>}
                  </div>
                  <div className="shrink-0">
                    <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm",
                        bundle.availability === 'In Stock' ? "bg-emerald-100 text-emerald-600" : "bg-brand-gold/10 text-brand-gold"
                    )}>
                      {bundle.availability}
                    </span>
                  </div>
               </div>
            </div>

            <div className="space-y-4 pt-4">
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-primary w-full py-5 text-xl flex items-center justify-center gap-3 shadow-2xl"
              >
                <MessageCircle size={28} />
                Confirm Bundle Price on WhatsApp
              </a>
              {bundle.disclaimer && (
                <p className="text-[10px] text-brand-grey bg-brand-mist/20 p-4 rounded-xl border border-brand-champagne/10 italic">
                   <strong>Note:</strong> {bundle.disclaimer}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* New Details Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8 space-y-16">
            
            {/* Benefits & Best For */}
            {(bundle.benefits?.length > 0 || bundle.bestFor) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {bundle.benefits?.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-serif text-brand-emerald flex items-center gap-2">
                       <Sparkles size={20} className="text-brand-gold" /> Key Benefits
                    </h3>
                    <ul className="space-y-3">
                      {bundle.benefits.map((benefit, i) => (
                        <li key={i} className="flex gap-3 text-sm text-brand-charcoal">
                           <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                           {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {bundle.bestFor && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-serif text-brand-emerald flex items-center gap-2">
                       <Heart size={20} className="text-brand-gold" /> Ideal For
                    </h3>
                    <p className="text-sm text-brand-charcoal leading-relaxed bg-brand-mist/20 p-6 rounded-2xl border border-brand-champagne/10">
                       {bundle.bestFor}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-8">
              <div className="flex items-center gap-3 text-[#0E3B2E] border-b border-brand-champagne/30 pb-4">
                <Shield size={28} className="text-brand-gold" />
                <h2 className="text-3xl font-serif">What’s Included</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Linked Products */}
                 {linkedProducts.map(product => (
                    <div key={product.id} className="card p-6 bg-white flex items-center gap-4 group hover:border-brand-gold transition-all">
                       <div className="w-16 h-16 rounded-xl bg-brand-mist/20 overflow-hidden shrink-0">
                          {product.imageUrl ? <img src={product.imageUrl} alt="" className="w-full h-full object-cover" /> : <ShoppingBag className="w-full h-full p-4 text-brand-gold" />}
                       </div>
                       <div className="flex-grow">
                          <h4 className="font-bold text-brand-emerald leading-tight">{product.name}</h4>
                          <Link to={`/products/${product.slug}`} className="text-[10px] font-bold text-brand-gold uppercase tracking-widest hover:underline flex items-center gap-1 mt-1">
                             View Details <ArrowUpRight size={10} />
                          </Link>
                       </div>
                    </div>
                 ))}

                 {/* Manual Items */}
                 {bundle.includedItems?.map((item, idx) => (
                    <div key={`manual-${idx}`} className="card p-6 bg-brand-mist/10 flex items-center gap-4 border-dashed">
                       <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-brand-gold shrink-0 shadow-sm">
                          <CheckCircle2 size={24} />
                       </div>
                       <div>
                          <p className="font-bold text-brand-charcoal">{item}</p>
                          <p className="text-[10px] text-brand-grey uppercase tracking-widest">Included Item</p>
                       </div>
                    </div>
                 ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-3 text-[#0E3B2E] border-b border-brand-champagne/30 pb-4">
                <Heart size={28} className="text-brand-gold" />
                <h2 className="text-3xl font-serif">Bundle Description</h2>
              </div>
              <div className="markdown-body text-brand-charcoal text-lg leading-relaxed">
                <ReactMarkdown>{bundle.fullDescription}</ReactMarkdown>
              </div>
            </div>

            {/* Usage Notes & FAQ */}
            {(bundle.usageNote || (bundle.faq && bundle.faq.length > 0)) && (
              <div className="space-y-16">
                 {bundle.usageNote && (
                   <div className="space-y-6">
                      <h3 className="text-2xl font-serif text-brand-emerald flex items-center gap-3">
                         <Info size={24} className="text-brand-gold" /> Usage Recommendation
                      </h3>
                      <div className="p-8 bg-brand-charcoal text-white rounded-3xl shadow-xl relative overflow-hidden contain-paint">
                         <div className="absolute right-0 top-0 p-12 text-white/5 decorative-layer">
                            <Sparkles size={100} />
                         </div>
                         <p className="relative z-10 italic leading-relaxed text-brand-champagne/90">
                            {bundle.usageNote}
                         </p>
                      </div>
                   </div>
                 )}

                 {bundle.faq && bundle.faq.length > 0 && (
                   <div className="space-y-8">
                      <h3 className="text-2xl font-serif text-brand-emerald flex items-center gap-3 border-b border-brand-champagne/30 pb-4">
                         Frequently Asked Questions
                      </h3>
                      <div className="space-y-4">
                         {bundle.faq.map((item: any, i: number) => (
                           <div key={i} className="card p-6 bg-white border-brand-champagne/10">
                              <h4 className="font-bold text-brand-emerald mb-2 flex items-start gap-3">
                                 <span className="w-6 h-6 bg-brand-gold/10 text-brand-gold rounded flex items-center justify-center shrink-0 text-xs">Q</span>
                                 {item.question}
                              </h4>
                              <p className="text-sm text-brand-grey leading-relaxed ml-9">
                                 {item.answer}
                              </p>
                           </div>
                         ))}
                      </div>
                   </div>
                 )}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-12">
            <div className="card p-8 bg-brand-emerald text-white border-0 shadow-2xl relative overflow-hidden contain-paint cta-card">
              <div className="relative z-10 space-y-8 text-center sm:text-left">
                <h3 className="text-2xl text-white font-serif border-b border-white/10 pb-4">How to Order</h3>
                <div className="space-y-4">
                  <p className="text-sm text-brand-champagne/80">Bundles are highly curated and availability can change. To order:</p>
                  <ol className="space-y-4 text-xs">
                    <li className="flex gap-4">
                       <span className="w-5 h-5 rounded-full bg-brand-gold text-brand-emerald flex items-center justify-center font-bold shrink-0">1</span>
                       <span>Click the WhatsApp button below</span>
                    </li>
                    <li className="flex gap-4">
                       <span className="w-5 h-5 rounded-full bg-brand-gold text-brand-emerald flex items-center justify-center font-bold shrink-0">2</span>
                       <span>Confirm the items you want</span>
                    </li>
                    <li className="flex gap-4">
                       <span className="w-5 h-5 rounded-full bg-brand-gold text-brand-emerald flex items-center justify-center font-bold shrink-0">3</span>
                       <span>Get final pricing & delivery info</span>
                    </li>
                  </ol>
                </div>
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full bg-brand-gold text-brand-emerald p-4 rounded-xl font-bold block text-center"
                >
                  Order on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
