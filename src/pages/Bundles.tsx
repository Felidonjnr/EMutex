import { useState, useEffect } from 'react';
import { Package, MessageCircle, ChevronRight, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bundle } from '../types';
import { useSiteContent } from '../context/SiteContentContext';
import { cn } from '../lib/utils';

export default function Bundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const { content } = useSiteContent();

  useEffect(() => {
    async function fetchBundles() {
      if (!db) return;
      try {
        const q = query(
          collection(db, 'bundles'), 
          where('visible', '==', true),
          orderBy('bundleOrder', 'asc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bundle));
        setBundles(data);
      } catch (error) {
        console.error("Error fetching bundles:", error);
        // Fallback or simple fetch
        try {
          const snapshot = await getDocs(collection(db, 'bundles'));
          setBundles(snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Bundle))
            .filter(b => b.visible !== false)
          );
        } catch (e) {
          console.error("Critical fetch error:", e);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchBundles();
  }, []);

  const scrollToWhatsApp = (bundle: Bundle) => {
    const message = `Hello ${content.brand.name}, I am interested in the ${bundle.name} bundle. Please send me the current price, delivery options, and how I can order.`;
    window.open(`https://wa.me/${content.contact.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-brand-cream/20 pb-24">
      {/* Hero Header */}
      <section className="bg-brand-emerald pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10" />
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-brand-champagne text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-white/10"
          >
            <Package size={14} className="text-brand-gold" />
            Curated Collections
          </motion.div>
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-serif text-white max-w-3xl mx-auto leading-tight">
              Premium Wellness <span className="text-brand-gold">Bundles</span>
            </h1>
            <p className="text-brand-champagne/80 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
              Carefully curated selections designed to address specific health needs and goals. 
              Save more when you purchase our professional health combinations.
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bundles-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bundle-card h-[400px] animate-pulse" />
            ))}
          </div>
        ) : bundles.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bundles-grid">
            {bundles.map((bundle) => (
              <div
                key={bundle.id}
                className="bundle-card group bg-white border border-brand-champagne/20 rounded-3xl overflow-hidden flex flex-col h-full"
              >
                <div className="flex flex-col h-full">
                  {/* Image Header */}
                  <div className="image-wrapper aspect-[3/4] bg-brand-mist/10 relative overflow-hidden flex items-center justify-center p-4">
                    {bundle.imageUrl ? (
                      <img 
                        src={bundle.imageUrl} 
                        alt={bundle.name} 
                        width="600"
                        height="800"
                        loading="lazy"
                        className="w-full h-full object-contain" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={64} className="text-brand-gold opacity-20" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4 flex flex-col justify-between flex-grow">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gold mb-1">{bundle.category || 'Wellness Package'}</p>
                        <h3 className="text-xl font-serif text-brand-emerald group-hover:text-brand-gold transition-colors">{bundle.name}</h3>
                      </div>
                      
                      <p className="text-xs text-brand-grey leading-relaxed line-clamp-2">
                        {bundle.shortDescription}
                      </p>
                      
                      <div className="space-y-2 pt-2 border-t border-brand-champagne/10">
                        <p className="text-[10px] font-bold text-brand-emerald uppercase tracking-widest">Included Items:</p>
                        <ul className="space-y-1.5">
                           {bundle.includedItems?.slice(0, 3).map((item, idx) => (
                             <li key={idx} className="flex items-center gap-2 text-[11px] font-semibold text-brand-charcoal">
                                <span className="w-1 h-1 rounded-full bg-brand-gold shrink-0" />
                                <span className="truncate">{item}</span>
                             </li>
                           ))}
                           {(bundle.includedItems?.length || 0) > 3 && (
                             <li className="text-[10px] text-brand-grey italic pl-3">
                               + {(bundle.includedItems?.length || 0) - 3} more items
                             </li>
                           )}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-brand-champagne/10 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <div className="text-brand-emerald font-bold text-base">
                           {bundle.price || 'WhatsApp for Price'}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 bg-brand-mist/30 text-brand-emerald rounded">
                          {bundle.availability}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link 
                          to={`/bundles/${bundle.slug}`}
                          className="flex-1 bg-brand-emerald text-white px-4 py-3 rounded-xl text-[10px] font-bold text-center flex items-center justify-center gap-1 uppercase tracking-wider hover:bg-brand-emerald/90 transition-all shadow-sm"
                        >
                          Details <ChevronRight size={14} />
                        </Link>
                        <button 
                          onClick={() => scrollToWhatsApp(bundle)}
                          className="p-3 bg-brand-cream text-brand-emerald border border-brand-emerald/10 rounded-xl hover:bg-brand-mist transition-all shadow-sm"
                          title="Contact on WhatsApp"
                        >
                          <MessageCircle size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 space-y-6 bg-white/50 rounded-3xl border border-dashed border-brand-champagne/50 max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-brand-mist/50 rounded-full flex items-center justify-center mx-auto text-brand-gold">
              <ShoppingBag size={40} />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-serif text-brand-emerald">No bundles available yet</h3>
              <p className="text-brand-grey max-w-sm mx-auto">We are currently curating new premium bundles. Check back soon or contact us for custom health combinations.</p>
            </div>
            <a 
              href={`https://wa.me/${content.contact.whatsappNumber}?text=${encodeURIComponent("Hello EMutex Nig, I am looking for custom wellness bundles.")}`}
              target="_blank"
              className="inline-flex px-8 py-3 bg-brand-emerald text-white rounded-xl font-bold items-center gap-2 hover:opacity-90 transition-all border-0 shadow-lg shadow-brand-emerald/20"
            >
              Contact Specialist
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
