import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bundle } from '../types';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, MessageCircle, ChevronRight, Zap, Target, RefreshCcw, Heart, Loader2 } from 'lucide-react';
import { useSiteContent } from '../context/SiteContentContext';
import SEO from '../components/SEO';

export default function Bundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const { content } = useSiteContent();

  useEffect(() => {
    async function fetchBundles() {
      if (!db) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const q = query(
          collection(db, 'bundles'), 
          where('visible', '==', true),
          orderBy('order', 'asc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bundle));
        setBundles(data);
      } catch (error) {
        console.error("Error fetching bundles:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchBundles();
  }, []);

  return (
    <div className="min-h-screen pt-12 pb-24 space-y-24">
      <SEO 
        title="Wellness Bundles"
        description="Save more and get better results with our curated wellness bundles. Expertly combined products for vitality, body reset, and premium self-care from EMutex Nig."
        url="https://emutexnig.com/bundles"
      />
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-bold uppercase tracking-[0.2em]">
          <Sparkles size={14} />
          Limited Combinations
        </div>
        <h1 className="text-4xl lg:text-7xl">Wellness <span className="text-brand-emerald italic">Bundles</span></h1>
        <p className="text-brand-grey text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed">
          Expertly combined products designed to work together for your specific wellness goals. Save more with our curated sets.
        </p>
      </section>

      {/* Bundle Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <Loader2 className="animate-spin text-brand-gold" size={40} />
             <p className="text-brand-grey font-serif italic text-lg">Curating premium bundles for you...</p>
          </div>
        ) : bundles.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {bundles.map((bundle, i) => (
              <motion.div
                key={bundle.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card group overflow-hidden bg-brand-cream/30 border-brand-champagne/30"
              >
                <div className="flex flex-col md:flex-row h-full">
                  {/* Visual Side */}
                  <div className="md:w-1/3 bg-brand-emerald p-8 flex flex-col justify-between text-white relative overflow-hidden">
                    {bundle.imageUrl && (
                      <div className="absolute inset-0 opacity-20">
                        <img src={bundle.imageUrl} alt="" className="w-full h-full object-cover grayscale brightness-50" />
                      </div>
                    )}
                    <div className="relative z-10 space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <Package size={24} className="text-brand-champagne" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-champagne/60">Bundle Focus</p>
                        <p className="text-sm font-medium">Wellness Combo</p>
                      </div>
                    </div>
                    <div className="relative z-10 pt-10">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-brand-champagne/60 mb-2">Benefit Tier</p>
                       <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => <div key={star} className="w-2 h-2 bg-brand-gold rounded-full" />)}
                       </div>
                    </div>
                  </div>

                  {/* Content Side */}
                  <div className="md:w-2/3 p-8 lg:p-10 space-y-8 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="space-y-2">
                         <h3 className="text-3xl font-serif text-brand-emerald">{bundle.name}</h3>
                         <p className="text-brand-gold font-medium italic text-sm line-clamp-1">{bundle.shortDescription}</p>
                      </div>
                      
                      <div className="pt-2">
                        <p className="text-[10px] font-bold text-brand-emerald uppercase tracking-widest mb-3">Included in this bundle:</p>
                        <ul className="space-y-2">
                           {bundle.includedItems?.slice(0, 3).map((item, idx) => (
                             <li key={idx} className="flex items-center gap-3 text-xs font-semibold text-brand-charcoal">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                                {item}
                             </li>
                           ))}
                           {bundle.includedProductSlugs?.slice(0, 3).map((slug, idx) => (
                             <li key={`slug-${idx}`} className="flex items-center gap-3 text-xs font-semibold text-brand-charcoal italic capitalize">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
                                {slug.replace(/-/g, ' ')}
                             </li>
                           ))}
                           {(bundle.includedItems?.length > 3 || bundle.includedProductSlugs?.length > 3) && (
                             <li className="text-[10px] text-brand-grey italic">+ more items</li>
                           )}
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-brand-emerald uppercase tracking-widest border-t border-brand-champagne/20 pt-6">Pricing & Availability</p>
                      <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-6">
                        <div className="text-center sm:text-left flex-grow">
                          <p className="text-sm font-bold text-brand-emerald">
                            {bundle.price ? `Price: ${bundle.price}` : 'Confirm Price'}
                          </p>
                          <p className="text-[10px] text-brand-grey">
                            Please confirm price on WhatsApp
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                          <Link
                            to={`/bundles/${bundle.slug}`}
                            className="bg-brand-mist/30 text-brand-emerald hover:bg-brand-mist/50 px-6 py-2 rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-2"
                          >
                            View Details <ChevronRight size={14} />
                          </Link>
                          <button
                            onClick={() => {
                              const message = bundle.whatsappMessage || `Hello EMutex Nig, I am interested in the ${bundle.name}. Please send me the current bundle price, products included, delivery options, and how I can order.`;
                              window.open(`https://wa.me/${content.contact.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
                            }}
                            className="btn-primary w-full sm:w-auto px-6 py-2 flex items-center justify-center gap-2 shadow-lg shadow-brand-emerald/10 text-xs"
                          >
                            <MessageCircle size={16} />
                            Order Bundle
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 card bg-white">
             <Package size={60} className="mx-auto text-brand-gold opacity-20 mb-6" />
             <h2 className="text-2xl font-serif text-[#0E3B2E]">No Bundles Available</h2>
             <p className="text-brand-grey max-w-sm mx-auto">We are currently updating our wellness combinations. Please check back soon or contact us for custom recommendations.</p>
             <div className="mt-8">
                <a href={`https://wa.me/${content.contact.whatsappNumber}`} className="btn-primary inline-flex items-center gap-2 px-8">
                   <MessageCircle size={20} /> Talk to Specialist
                </a>
             </div>
          </div>
        )}
      </section>

      {/* Custom Bundle Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card p-12 lg:p-20 text-center space-y-8 bg-brand-emerald text-white overflow-hidden relative">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
              <Sparkles size={400} />
           </div>
           <div className="relative z-10 space-y-8">
              <h2 className="text-4xl lg:text-5xl text-white">Need a <span className="text-brand-gold italic">Custom Combination?</span></h2>
              <p className="text-lg lg:text-xl text-brand-champagne/80 max-w-2xl mx-auto leading-relaxed">
                Not sure which bundle is right for you? Our wellness specialists can create a custom-tailored package based on your unique wellness goals and preferences.
              </p>
              <div className="pt-4">
                <button
                   onClick={() => window.open(`https://wa.me/${content.contact.whatsappNumber}?text=${encodeURIComponent(`Hello EMutex Nig, I would like a custom wellness bundle recommendation.`)}`, '_blank')}
                   className="btn-primary bg-brand-gold text-white px-12 py-5 text-xl inline-flex items-center gap-3 shadow-2xl"
                >
                  <MessageCircle size={24} />
                  Talk to Us Before You Order
                </button>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
}

// Re-using Package Icon (not imported originally in Bundles.tsx)
import { Package } from 'lucide-react';
