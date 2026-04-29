import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, MessageCircle, ChevronRight, Zap, Target, RefreshCcw, Heart } from 'lucide-react';
import { DEFAULT_SETTINGS } from '../constants';
import SEO from '../components/SEO';

const bundleTypes = [
  {
    id: 'vitality',
    title: 'Daily Vitality Bundle',
    subtitle: 'For adults who want general energy and vitality support.',
    icon: Zap,
    color: 'emerald',
    description: 'A curated selection of our most effective vitality products designed to keep you powered through your busy day.',
    priceLine: 'Best value for daily performance',
    features: ['Long-lasting energy', 'Mental clarity support', 'Overall wellness baseline']
  },
  {
    id: 'refresh',
    title: 'Refresh & Balance Bundle',
    subtitle: 'For people interested in body balance and feeling refreshed.',
    icon: RefreshCcw,
    color: 'gold',
    description: 'Focuses on internal harmony and steady energy levels. Perfect for those looking to reset their body balance.',
    priceLine: 'Expert-recommended for balance',
    features: ['Digestive comfort support', 'Natural body reset', 'Clean label ingredients']
  },
  {
    id: 'selfcare',
    title: 'Premium Self-Care Bundle',
    subtitle: 'For wellness-conscious adults who want full support.',
    icon: Target,
    color: 'charcoal',
    description: 'Our most comprehensive package for individuals who prioritize long-term wellness and premium self-care.',
    priceLine: 'The complete premium experience',
    features: ['Holistic wellness support', 'Daily routine essential', 'Maximum vitality support']
  },
  {
    id: 'combo',
    title: 'Wellness Combo',
    subtitle: 'For customers who want a fuller product combination.',
    icon: Heart,
    color: 'mist',
    description: 'The perfect introduction to EMutex Nig. Get a taste of our core products at a special introductory rate.',
    priceLine: 'Ideal starter combination',
    features: ['Versatile support', 'Trial size availability', 'Core wellness staples']
  }
];

export default function Bundles() {
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {bundleTypes.map((bundle, i) => (
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
                  <div className="absolute -bottom-10 -left-10 opacity-10">
                     <bundle.icon size={160} />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <bundle.icon size={24} className="text-brand-champagne" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-champagne/60">Bundle Focus</p>
                      <p className="text-sm font-medium">Daily Lifestyle</p>
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
                       <h3 className="text-3xl font-serif text-brand-emerald">{bundle.title}</h3>
                       <p className="text-brand-gold font-medium italic text-sm">{bundle.subtitle}</p>
                    </div>
                    <p className="text-brand-grey text-sm leading-relaxed">
                      {bundle.description}
                    </p>
                    <ul className="space-y-3 pt-2">
                       {bundle.features.map(f => (
                         <li key={f} className="flex items-center gap-3 text-xs font-semibold text-brand-charcoal">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                            {f}
                         </li>
                       ))}
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-brand-emerald uppercase tracking-widest border-t border-brand-champagne/20 pt-6">Pricing & Availability</p>
                    <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-6">
                      <div className="text-center sm:text-left flex-grow">
                        <p className="text-sm font-bold text-brand-emerald">{bundle.priceLine}</p>
                        <p className="text-[10px] text-brand-grey underline">Confirm price on WhatsApp</p>
                      </div>
                      <button
                        onClick={() => window.open(`https://wa.me/${DEFAULT_SETTINGS.whatsappNumber}?text=${encodeURIComponent(`Hello EMutex Nig, I am interested in the ${bundle.title}. Please guide me on options and price.`)}`, '_blank')}
                        className="btn-primary w-full sm:w-auto px-8 flex items-center justify-center gap-2 shadow-lg shadow-brand-emerald/10"
                      >
                        <MessageCircle size={18} />
                        Help Me Choose
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
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
                   onClick={() => window.open(`https://wa.me/${DEFAULT_SETTINGS.whatsappNumber}?text=${encodeURIComponent(`Hello EMutex Nig, I would like a custom wellness bundle recommendation.`)}`, '_blank')}
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
