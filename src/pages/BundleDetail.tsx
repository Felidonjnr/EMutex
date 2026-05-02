import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bundle, Product } from '../types';
import { useSiteContent } from '../context/SiteContentContext';
import { motion } from 'framer-motion';
import { MessageCircle, ChevronLeft, Sparkles, Package, Shield, Heart, CheckCircle2, ShoppingBag, ArrowUpRight, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import SEO from '../components/SEO';

export default function BundleDetail() {
  const { content } = useSiteContent();
  const { slug } = useParams<{ slug: string }>();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [linkedProducts, setLinkedProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function fetchBundle() {
      if (!db || !slug) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const bundlesRef = collection(db, 'bundles');
        
        // Fetch by slug
        const q = query(
          bundlesRef, 
          where('slug', '==', slug), 
          where('visible', '==', true),
          limit(1)
        );
        let querySnapshot;
        try {
          querySnapshot = await getDocs(q);
        } catch (err: any) {
          if (err.message?.includes('Missing or insufficient permissions') || err.message?.includes('offline')) {
            setErrorType("CONNECTION_ERROR");
            return;
          }
          throw err;
        }

        let bundleData: Bundle | null = null;

        if (!querySnapshot.empty) {
          bundleData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Bundle;
        } else {
           // Fallback catch-all for document ID
           try {
             const docRef = doc(db, 'bundles', slug);
             const docSnap = await getDoc(docRef);
             if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.visible === true || (data.visible as any) === 'true') {
                  bundleData = { id: docSnap.id, ...data } as Bundle;
                }
             }
           } catch (e) {
             // ID lookup failed
           }
        }

        if (bundleData) {
          setBundle(bundleData);

          // Fetch linked products if any
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
      } catch (error) {
        console.warn(`Bundle detail access issues for ${slug}.`, error);
      } finally {
        setLoading(false);
      }
    }

    fetchBundle();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-emerald"></div>
      </div>
    );
  }

  if (!bundle) {
    const isError = errorType === "CONNECTION_ERROR";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6 px-4 bg-brand-cream text-center">
        <div className="w-20 h-20 bg-brand-gold/10 rounded-full flex items-center justify-center text-brand-gold">
          {isError ? <AlertTriangle size={40} /> : <Package size={40} />}
        </div>
        <h2 className="text-3xl font-serif text-[#0E3B2E]">{isError ? 'Connection Issue' : 'Bundle Not Found'}</h2>
        <p className="text-brand-grey max-w-sm">
          {isError 
            ? "We could not load this bundle right now. Please refresh or contact us on WhatsApp."
            : "This wellness combination might have been moved or is no longer available. Please check our updated catalogue."}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/bundles" className="btn-primary flex items-center gap-2">
            <ChevronLeft size={20} />
            Back to Bundles
          </Link>
          {isError && (
            <a 
              href={`https://wa.me/${content.contact.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center justify-center gap-2 px-8"
            >
              <MessageCircle size={20} />
              Ask on WhatsApp
            </a>
          )}
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card aspect-[4/3] bg-white flex items-center justify-center relative overflow-hidden shadow-sm border border-brand-champagne/30"
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
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8 space-y-16">
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
          </div>

          <div className="lg:col-span-4 space-y-12">
            <div className="card p-8 bg-brand-emerald text-white border-0 shadow-2xl relative overflow-hidden">
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
