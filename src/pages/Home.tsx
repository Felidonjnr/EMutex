import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageCircle, CheckCircle2, ChevronRight, MapPin, ShieldCheck, Heart, Zap, Sparkles, ShoppingBag, Loader2 } from 'lucide-react';
import { CATEGORIES } from '../constants';
import { siteContent } from '../data/siteContent';
import { cn } from '../lib/utils';
import { collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, WellnessNeed } from '../types';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';

// Trust Strip Cards
const trustCards = [
  { icon: MapPin, title: 'Akwa Ibom-Based', desc: siteContent.trust.locationSignal },
  { icon: ShieldCheck, title: 'Selected Quality', desc: 'Wellness support for adults.' },
  { icon: MessageCircle, title: 'WhatsApp Ordering', desc: 'Ask, confirm, and order easily.' },
  { icon: Heart, title: 'Clear Guidance', desc: 'Choose without confusion.' },
];

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [wellnessNeeds, setWellnessNeeds] = useState<WellnessNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsLoading, setNeedsLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      if (!db) {
        setLoading(false);
        return;
      }
      try {
        const productsRef = collection(db, 'products');
        const q = query(
          productsRef, 
          where('visible', '==', true), 
          where('featured', '==', true),
          limit(3)
        );
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setFeaturedProducts(products);
      } catch (error) {
        console.error("Error fetching featured products:", error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchNeeds() {
      if (!db) {
        setNeedsLoading(false);
        return;
      }
      try {
        const snapshot = await getDocs(collection(db, 'wellnessNeeds'));
        const needs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WellnessNeed));
        setWellnessNeeds(needs);
      } catch (error) {
        console.error("Error fetching wellness needs:", error);
      } finally {
        setNeedsLoading(false);
      }
    }

    fetchFeatured();
    fetchNeeds();
  }, []);
  return (
    <div className="space-y-20 pb-24">
      <SEO 
        title="EMutex Nig — Wellness Products for Better Living"
        description="Premium Nigerian wellness and vitality products for adults who want daily wellness support, body balance, confidence, and better living. Based in Akwa Ibom, serving customers across Nigeria."
      />
      {/* 10. Hero Section */}
      <section className="relative pt-12 lg:pt-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 text-brand-gold text-sm font-semibold uppercase tracking-wider">
                <Sparkles size={14} />
                {siteContent.hero.label}
              </div>
              <h1 className="text-5xl lg:text-7xl font-serif leading-tight text-[#0E3B2E]">
                {siteContent.hero.headline.split('for')[0]} <span className="text-brand-gold italic text-6xl block md:inline">for Better Living</span>
              </h1>
              <p className="text-lg lg:text-xl text-brand-grey max-w-lg leading-relaxed">
                {siteContent.hero.subheadline}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/products" className="btn-primary flex items-center justify-center gap-2 px-8 py-4 text-lg">
                  {siteContent.hero.ctaPrimary}
                  <ChevronRight size={20} />
                </Link>
                <button
                  onClick={() => window.open(`https://wa.me/${siteContent.contact.whatsappNumber}?text=${encodeURIComponent(siteContent.finalCta.subtitle)}`, '_blank')}
                  className="btn-secondary flex items-center justify-center gap-2 px-8 py-4 text-lg"
                >
                  <MessageCircle size={20} />
                  {siteContent.hero.ctaSecondary}
                </button>
              </div>
              <p className="text-sm text-brand-grey/70 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-brand-emerald" />
                {siteContent.trust.locationSignal}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-square rounded-full bg-gradient-to-br from-brand-gold/20 to-brand-emerald/10 absolute -z-10 blur-3xl scale-125" />
              <div className="relative z-10 card aspect-square max-w-lg mx-auto flex flex-col items-center justify-center p-8 border-brand-gold/20 bg-[#FFFDF8]">
                <div className="text-center space-y-6">
                  <div className="w-64 h-64 mx-auto bg-brand-mist/30 rounded-2xl flex items-center justify-center">
                    <ShoppingBag size={100} className="text-brand-gold opacity-40" />
                  </div>
                  <p className="text-[#0E3B2E] font-serif text-2xl italic">Premium Wellness Support</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 11. Trust Strip */}
      <section className="bg-[#0E3B2E] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {trustCards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center group"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-brand-gold transition-colors">
                  <card.icon className="text-white" size={24} />
                </div>
                <h3 className="text-white text-lg font-serif mb-1">{card.title}</h3>
                <p className="text-brand-champagne/70 text-xs">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. About Section */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-4xl lg:text-5xl text-[#0E3B2E]">{siteContent.about.title.split(' ').slice(0,-1).join(' ')} <span className="text-brand-gold">{siteContent.about.title.split(' ').slice(-1)}</span></h2>
            <div className="w-20 h-1.5 bg-brand-gold rounded-full" />
            <p className="text-lg text-brand-grey leading-relaxed">
              {siteContent.about.description}
            </p>
            <p className="text-lg text-brand-grey leading-relaxed">
              Our goal is simple: to help customers understand available product options, choose what fits their wellness routine, and order with confidence through WhatsApp.
            </p>
            <div className="bg-brand-mist/50 p-6 rounded-2xl border-l-4 border-brand-emerald italic text-[#0E3B2E] font-medium">
              "We focus on clear product guidance, premium presentation, and trusted wellness support."
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="card aspect-[4/3] bg-[#0E3B2E] flex items-center justify-center text-brand-champagne p-12 overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Sparkles size={200} />
              </div>
              <div className="relative z-10 space-y-4 text-center">
                <MapPin size={48} className="mx-auto text-brand-gold" />
                <h3 className="text-3xl text-white">Based in Akwa Ibom</h3>
                <p className="text-brand-champagne/80 max-w-xs">{siteContent.contact.serving}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 14. Wellness Needs Section */}
      <section id="needs" className="bg-[#FAF7F0] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className="text-4xl lg:text-5xl text-[#0E3B2E]">{siteContent.categories.title.split(' ').slice(0,-1).join(' ')} <span className="text-brand-gold">{siteContent.categories.title.split(' ').slice(-1)}</span></h2>
            <p className="text-brand-grey text-lg">
              {siteContent.categories.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {needsLoading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="card h-64 animate-pulse bg-brand-cream/50" />
              ))
            ) : wellnessNeeds.length > 0 ? (
              wellnessNeeds.map((need, i) => (
                <motion.div
                  key={need.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="card p-8 flex flex-col justify-between"
                >
                  <div className="space-y-4 text-left">
                    <div className="w-12 h-12 rounded-xl bg-brand-mist flex items-center justify-center text-brand-emerald">
                      {i % 4 === 0 && <Zap size={24} />}
                      {i % 4 === 1 && <Sparkles size={24} />}
                      {i % 4 === 2 && <Heart size={24} />}
                      {i % 4 === 3 && <ShoppingBag size={24} />}
                    </div>
                    <h3 className="text-xl font-bold text-[#0E3B2E]">{need.title}</h3>
                    <p className="text-brand-grey text-sm">{need.description}</p>
                  </div>
                  <button
                    onClick={() => window.open(`https://wa.me/${siteContent.contact.whatsappNumber}?text=${encodeURIComponent(`Hello EMutex Nig, I am interested in ${need.whatsappTopic}. Please guide me.`)}`, '_blank')}
                    className="mt-8 btn-secondary w-full text-sm"
                  >
                    {need.buttonText}
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-brand-grey italic">
                Wellness guides coming soon.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 16. Featured Products Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="flex justify-between items-end flex-wrap gap-4 border-b border-brand-champagne/30 pb-8">
          <div className="space-y-2">
            <h2 className="text-4xl text-[#0E3B2E]">Featured <span className="text-brand-gold">Wellness Products</span></h2>
            <p className="text-brand-grey">Explore our top picks for your daily routine.</p>
          </div>
          <Link to="/products" className="text-brand-emerald font-semibold flex items-center gap-1 hover:text-brand-gold transition-all">
            See all products
            <ChevronRight size={20} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="card h-96 animate-pulse bg-brand-cream/50" />
            ))
          ) : featuredProducts.length > 0 ? (
            featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-brand-grey italic">
              New collections arriving soon. Check back shortly.
            </div>
          )}
        </div>
      </section>

      {/* 25. How to Order Section */}
      <section id="how-to-order" className="bg-[#FAF7F0] py-24 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16 relative z-10">
          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className="text-4xl lg:text-5xl text-[#0E3B2E]">How to Order from <span className="text-brand-gold italic">EMutex Nig</span></h2>
            <p className="text-brand-grey text-lg">
              We make it easy to get the wellness support you need through a simple WhatsApp conversation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {siteContent.howToOrder.steps.map((step, i) => (
              <div key={i} className="bg-white border border-brand-champagne/30 p-8 rounded-2xl shadow-sm space-y-4 text-left">
                <div className="text-4xl font-bold text-brand-gold/30">0{i+1}</div>
                <h3 className="text-xl font-bold text-[#0E3B2E]">{step.title}</h3>
                <p className="text-brand-grey text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 27. Final WhatsApp CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="card p-10 lg:p-16 space-y-8 bg-[#0E3B2E] text-white border-0 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <MessageCircle size={300} />
          </div>
          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl lg:text-5xl text-white">{siteContent.finalCta.title.split(' ').slice(0,-1).join(' ')} <span className="text-brand-gold italic">{siteContent.finalCta.title.split(' ').slice(-1)}</span></h2>
            <p className="text-lg lg:text-xl text-brand-champagne/80 max-w-3xl mx-auto leading-relaxed">
              {siteContent.finalCta.subtitle}
            </p>
            <div className="pt-4 space-y-6">
              <button
                onClick={() => window.open(`https://wa.me/${siteContent.contact.whatsappNumber}?text=${encodeURIComponent(siteContent.finalCta.subtitle)}`, '_blank')}
                className="btn-primary px-12 py-5 text-xl inline-flex items-center gap-3 bg-brand-gold hover:bg-white hover:text-brand-emerald transition-all font-bold border-0 text-white"
              >
                <MessageCircle size={24} />
                {siteContent.finalCta.buttonText}
              </button>
              <div className="flex items-center justify-center flex-wrap gap-4 text-[10px] sm:text-xs font-medium text-brand-champagne/60 uppercase tracking-widest">
                <span>Fast Response</span>
                <span className="w-1 h-1 bg-brand-gold rounded-full" />
                <span>Simple Guidance</span>
                <span className="w-1 h-1 bg-brand-gold rounded-full" />
                <span>Easy Ordering</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
