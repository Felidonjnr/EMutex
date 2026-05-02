import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { CATEGORIES } from '../constants';
import { useSiteContent } from '../context/SiteContentContext';
import { Filter, Search, RotateCcw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import SEO from '../components/SEO';

export default function Products() {
  const { content } = useSiteContent();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchProducts() {
      if (!db) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const productsRef = collection(db, 'products');
        // SECURE QUERY: Simplified to only check visibility to allow frontend sorting/filtering
        const q = query(
          productsRef, 
          where('visible', '==', true)
        );

        const querySnapshot = await getDocs(q);
        const allProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        
        // Filter and sort in memory for catalogue specifics and ordering robustness
        const data = allProducts
          .filter(p => {
            const isShowInCatalogue = p.showInCatalogue !== false; // Include if missing/true, exclude if false
            const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
            return isShowInCatalogue && matchesCategory;
          })
          .sort((a, b) => (a.productOrder ?? 999) - (b.productOrder ?? 999));

        setProducts(data);
      } catch (error) {
        console.warn("Products access issues. Showing empty state.", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [activeCategory]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.shortDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-12 pb-24 space-y-12 bg-brand-mist/10">
      <SEO 
        title="Wellness Catalogue"
        description="Explore our curated collection of premium Nigerian wellness and vitality products. Carefully selected support for daily wellness, body balance, and better living."
        url="https://emutexnig.com/products"
      />
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 text-brand-gold text-[10px] font-bold uppercase tracking-widest">
           <Sparkles size={12} />
           Premium Selection
        </div>
        <h1 className="text-4xl lg:text-6xl text-[#0E3B2E] font-serif">Our Wellness <span className="text-brand-gold italic">Catalogue</span></h1>
        <p className="text-brand-grey text-lg max-w-2xl mx-auto">
          {content.hero.subheadline}
        </p>
      </section>

      {/* Filters & Search */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/80 border border-brand-champagne/30 p-4 lg:p-6 backdrop-blur shadow-sm rounded-3xl">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            {/* Search */}
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-grey/50" size={18} />
              <input
                type="text"
                placeholder="Search for a wellness product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-5 py-3.5 bg-white border border-brand-champagne/30 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto scrollbar-hide">
              <div className="flex items-center gap-2 text-[#0E3B2E] font-bold text-xs uppercase tracking-wider mr-2 shrink-0">
                <Filter size={14} className="text-brand-gold" /> Filter By
              </div>
              <button
                onClick={() => setActiveCategory('all')}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider",
                  activeCategory === 'all' ? "bg-[#0E3B2E] text-white" : "bg-white text-brand-charcoal border border-[#0E3B2E]/10 hover:bg-brand-mist"
                )}
              >
                All Products
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.name)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider",
                    activeCategory === cat.name ? "bg-[#0E3B2E] text-white" : "bg-white text-brand-charcoal border border-[#0E3B2E]/10 hover:bg-brand-mist"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card h-96 animate-pulse bg-brand-cream/50" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-24 space-y-6 bg-white/50 rounded-3xl border border-dashed border-brand-champagne/50 max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-brand-mist/50 rounded-full flex items-center justify-center mx-auto text-brand-gold">
              <ShoppingBag size={40} />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-serif text-[#0E3B2E]">No products are currently available</h3>
              <p className="text-brand-grey max-w-sm mx-auto">Please contact us on WhatsApp for information about available products and current stock.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href={`https://wa.me/${content.brand.whatsappNumber.replace(/\+/g, '')}?text=${encodeURIComponent("Hello EMutex Nig, I am looking for your current product list.")}`}
                target="_blank"
                className="px-8 py-3 bg-[#0E3B2E] text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all border-0 shadow-lg shadow-brand-emerald/20"
              >
                Inquire on WhatsApp
              </a>
              {(searchTerm || activeCategory !== 'all') && (
                <button 
                  onClick={() => { setActiveCategory('all'); setSearchTerm(''); }}
                  className="px-8 py-3 bg-white text-[#0E3B2E] border border-brand-champagne/30 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-mist transition-all"
                >
                  <RotateCcw size={16} />
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

