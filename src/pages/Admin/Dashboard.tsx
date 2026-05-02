import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, getCountFromServer, addDoc, serverTimestamp, doc, setDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import AdminLayout from '../../components/layout/AdminLayout';
import { Lead } from '../../types';
import { Users, ShoppingBag, Clock, ArrowUpRight, TrendingUp, Sparkles, Database, ChevronRight, Settings, Loader2, Package, Layers } from 'lucide-react';
import { formatDate, cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

const DEMO_PRODUCTS = [
  {
    name: 'Ginseng Tonic Wine',
    slug: 'ginseng-tonic-wine',
    category: 'Energy & Vitality Support',
    shortDescription: 'Support your daily energy and vitality with our premium ginseng-infused tonic.',
    fullDescription: '# Premium Ginseng Tonic Wine\n\nOur Ginseng Tonic Wine is a carefully crafted wellness drink designed for adults who need a natural energy boost. Combining traditional ginseng roots with a smooth tonic base, it supports daily performance and overall well-being.\n\n### Key Features:\n- Naturally sourced Ginseng\n- Smooth, rich taste\n- Perfect for daily vitality\n\n### Usage:\nTake one small glass daily after meals.',
    imageUrl: 'https://images.unsplash.com/photo-1556911223-e1236577549a?auto=format&fit=crop&q=80&w=800',
    price: 'Confirm on WhatsApp',
    availability: 'In Stock',
    wellnessSupportPoints: ['Daily energy boost', 'Focus support', 'Natural vitality'],
    benefits: ['Supports physical performance', 'Enhances mental clarity', 'Promotes overall well-being'],
    bestFor: 'Busy professionals and active adults',
    usageNote: '1 small glass daily',
    featured: true,
    showOnHomepage: true,
    showInCatalogue: true,
    visible: true,
    productOrder: 1,
  },
  {
    name: 'NMN Capsules',
    slug: 'nmn-capsules',
    category: 'Daily Wellness Support',
    shortDescription: 'Advanced wellness support for cellular health and steady vitality.',
    fullDescription: '# NMN Capsules\n\nSupport your body at the cellular level with our high-purity NMN capsules. Designed for longevity and daily wellness, these capsules are a staple for the modern health-conscious adult.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
    price: 'Confirm on WhatsApp',
    availability: 'In Stock',
    wellnessSupportPoints: ['Cellular health', 'Longevity support', 'Steady energy'],
    benefits: ['Supports metabolism', 'Promotes cellular repair', 'Boosts daily energy levels'],
    bestFor: 'Longevity-focused adults',
    usageNote: '2 capsules daily before breakfast',
    featured: true,
    showOnHomepage: true,
    showInCatalogue: true,
    visible: true,
    productOrder: 2,
  },
  {
    name: 'Ganoderma Coffee',
    slug: 'ganoderma-coffee',
    category: 'Coffee, Tea & Routine Products',
    shortDescription: 'A premium coffee blend infused with Ganoderma for daily balance.',
    fullDescription: '# Ganoderma Coffee\n\nEnjoy the rich taste of coffee with the added wellness benefits of Ganoderma Lucidum. A perfect start to your daily routine, providing balance and energy without the jitters.',
    imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=800',
    price: 'Confirm on WhatsApp',
    availability: 'In Stock',
    wellnessSupportPoints: ['Calm focus', 'Daily routine support', 'Lower acidity than regular coffee'],
    benefits: ['Supports immune system', 'Balanced energy levels', 'Rich in antioxidants'],
    bestFor: 'Coffee lovers seeking wellness',
    usageNote: '1 cup in the morning',
    featured: true,
    showOnHomepage: true,
    showInCatalogue: true,
    visible: true,
    productOrder: 3,
  },
  {
    name: 'Herbal Detox Tea',
    slug: 'herbal-detox-tea',
    category: 'Detox & Body Reset',
    shortDescription: 'A gentle but effective herbal blend to support your body naturally cleansing process.',
    fullDescription: '# Herbal Detox Tea\n\nReset your body with our premium herbal detox blend. Specifically formulated to support digestion and natural detoxification pathways, helping you feel lighter and more balanced.',
    imageUrl: 'https://images.unsplash.com/photo-1544787210-2213d24295c2?auto=format&fit=crop&q=80&w=800',
    price: 'Confirm on WhatsApp',
    availability: 'In Stock',
    wellnessSupportPoints: ['Digestive support', 'Natural cleansing', 'Toxin elimination'],
    benefits: ['Reduced bloating', 'Improved energy', 'Supports healthy digestion'],
    bestFor: 'Adults looking for a natural reset',
    usageNote: 'One cup before bed',
    featured: false,
    showOnHomepage: false,
    showInCatalogue: true,
    visible: true,
    productOrder: 4,
  },
  {
    name: 'Maca Root Extract',
    slug: 'maca-root-extract',
    category: 'Energy & Vitality Support',
    shortDescription: 'Powerful natural support for hormonal balance and sustained vitality.',
    fullDescription: '# Maca Root Extract\n\nSourced from high-quality roots, our Maca extract provides natural support for energy, stamina, and hormonal balance. A great addition to your wellness routine for natural power.',
    imageUrl: 'https://images.unsplash.com/photo-1611241893603-3c359704e0ee?auto=format&fit=crop&q=80&w=800',
    price: 'Confirm on WhatsApp',
    availability: 'In Stock',
    wellnessSupportPoints: ['Hormonal balance', 'Stamina support', 'Natural energy'],
    benefits: ['Improved endurance', 'Balanced mood', 'Natural vitality'],
    bestFor: 'Active adults and fitness enthusiasts',
    usageNote: '1-2 capsules daily with food',
    featured: false,
    showOnHomepage: false,
    showInCatalogue: true,
    visible: true,
    productOrder: 5,
  },
  {
    name: 'Omega-3 Fish Oil',
    slug: 'omega-3-fish-oil',
    category: 'Daily Wellness Support',
    shortDescription: 'Essential fatty acids for heart, brain, and joint support.',
    fullDescription: '# Omega-3 Fish Oil\n\nOur high-potency Omega-3 fish oil provides essential EPA and DHA to support your body daily cardiovascular and neurological functions.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
    price: 'Confirm on WhatsApp',
    availability: 'In Stock',
    wellnessSupportPoints: ['Heart health', 'Brain function', 'Joint flexibility'],
    benefits: ['Supports cognitive health', 'Maintains healthy heart', 'Reduces joint stiffness'],
    bestFor: 'Anyone seeking head-to-toe wellness',
    usageNote: '2 softgels daily',
    featured: false,
    showOnHomepage: false,
    showInCatalogue: true,
    visible: true,
    productOrder: 6,
  },
  {
    name: 'Probiotic Multi-Strain',
    slug: 'probiotic-multi-strain',
    category: 'Daily Wellness Support',
    shortDescription: 'A diverse blend of beneficial bacteria to support your gut health.',
    fullDescription: '# Probiotic Multi-Strain\n\nSupport your digestive system and immunity with our multi-strain probiotic capsules, bringing balance back to your gut microbiome.',
    imageUrl: 'https://images.unsplash.com/photo-1550573105-34305417ab46?auto=format&fit=crop&q=80&w=800',
    price: 'Confirm on WhatsApp',
    availability: 'In Stock',
    wellnessSupportPoints: ['Gut microbiome balance', 'Immune function', 'Digestive comfort'],
    benefits: ['Better nutrient absorption', 'Regularity support', 'Stronger defenses'],
    bestFor: 'Individuals with sensitive digestion',
    usageNote: '1 capsule daily on an empty stomach',
    featured: false,
    showOnHomepage: false,
    showInCatalogue: true,
    visible: true,
    productOrder: 7,
  },
  {
    name: 'Zinc & Vitamin C Immune Plus',
    slug: 'zinc-vitamin-c',
    category: 'Daily Wellness Support',
    shortDescription: 'Dual-action support for your immune system, especially during seasonal changes.',
    fullDescription: '# Zinc & Vitamin C Immune Plus\n\nGive your immune system the nutrients it needs to perform at its best. Our combination of Zinc and Vitamin C is essential for daily defense.',
    imageUrl: 'https://images.unsplash.com/photo-1616671285410-667793d56a31?auto=format&fit=crop&q=80&w=800',
    price: 'Confirm on WhatsApp',
    availability: 'In Stock',
    wellnessSupportPoints: ['Immune defense', 'Antioxidant support', 'Skin health'],
    benefits: ['Supports resilient health', 'Protects against oxidative stress', 'Aids recovery'],
    bestFor: 'Daily immune maintenance',
    usageNote: '1 tablet daily',
    featured: false,
    showOnHomepage: false,
    showInCatalogue: true,
    visible: true,
    productOrder: 8,
  },
  {
    name: 'Joint Vitality Complex',
    slug: 'joint-vitality-complex',
    category: 'Daily Wellness Support',
    shortDescription: 'Specialized nutrients for joint comfort and structural support.',
    fullDescription: '# Joint Vitality Complex\n\nKeep moving with comfort. Our Joint Vitality Complex combines Glucosamine and Chondroitin with natural extracts to support joint health as you age.',
    imageUrl: 'https://images.unsplash.com/photo-1550573105-34305417ab46?auto=format&fit=crop&q=80&w=800',
    price: 'Confirm on WhatsApp',
    availability: 'In Stock',
    wellnessSupportPoints: ['Joint mobility', 'Cartilage support', 'Reduced discomfort'],
    benefits: ['Easier movement', 'Lower inflammation', 'Structural integrity'],
    bestFor: 'Seniors and active adults',
    usageNote: '3 tablets daily with food',
    featured: false,
    showOnHomepage: false,
    showInCatalogue: true,
    visible: true,
    productOrder: 9,
  },
  {
    name: 'Sleep Support Melatonin Blend',
    slug: 'sleep-support-melatonin',
    category: 'Daily Wellness Support',
    shortDescription: 'Fall asleep faster and wake up refreshed with our gentle sleep aid.',
    fullDescription: '# Sleep Support Melatonin Blend\n\nDesigned to help regulate your body sleep-wake cycle, our Melatonin blend is perfect for those who struggle with occasionally disturbed sleep or jet lag.',
    imageUrl: 'https://images.unsplash.com/photo-1544787210-2213d24295c2?auto=format&fit=crop&q=80&w=800',
    price: 'Confirm on WhatsApp',
    availability: 'In Stock',
    wellnessSupportPoints: ['Sleep quality', 'Faster onset of sleep', 'Jet lag recovery'],
    benefits: ['Non-habit forming', 'Restorative rest', 'Morning freshness'],
    bestFor: 'Shift workers and frequent travelers',
    usageNote: '1 tablet 30 minutes before bed',
    featured: false,
    showOnHomepage: false,
    showInCatalogue: true,
    visible: true,
    productOrder: 10,
  }
];

const DEMO_LEADS = [
  { fullName: 'John Doe', whatsappNumber: '+2348011223344', location: 'Lagos', productInterested: 'Ginseng Tonic Wine', productSlug: 'ginseng-tonic-wine', status: 'New', notes: 'Interested in bulk purchase.', createdAt: serverTimestamp() },
  { fullName: 'Jane Smith', whatsappNumber: '+2347055667788', location: 'Abuja', productInterested: 'NMN Capsules', productSlug: 'nmn-capsules', status: 'Contacted', notes: 'Asked about dosage.', createdAt: serverTimestamp() },
  { fullName: 'Ahmed Musa', whatsappNumber: '+2349033221100', location: 'Kano', productInterested: 'Ganoderma Coffee', productSlug: 'ganoderma-coffee', status: 'Interested', notes: 'Wants to know if you deliver to Kano.', createdAt: serverTimestamp() },
];

const DEMO_WELLNESS_NEEDS = [
  { title: 'Energy & Vitality', description: 'Natural solutions to boost your daily performance.', buttonText: 'Explore Energy Boosters', whatsappTopic: 'Energy & Vitality' },
  { title: 'Sleep & Relaxation', description: 'Restorative products for a better night rest.', buttonText: 'Improve My Sleep', whatsappTopic: 'Sleep & Relaxation' },
  { title: 'Immune Support', description: 'Strengthen your body natural defenses.', buttonText: 'Boost Immunity', whatsappTopic: 'Immune Support' },
];

const INITIAL_SETTINGS = {
  whatsappNumber: '+2341234567890',
  heroHeadline: 'Experience Holistic Wellness with EMutex Nig.',
  heroSubheadline: 'Your trusted partner for premium herbal remedies and health supplements curated for your vitality.',
  tagline: 'Embrace Nature, Empower Health.',
  locationText: 'Direct Delivery Across Nigeria',
  finalCtaText: 'Start Your Journey to Better Health Today',
  defaultWhatsappMessage: 'Hello EMutex Nig, I would like to inquire about your wellness products.',
  businessAddress: 'Lagos, Nigeria',
  deliveryNote: 'We deliver nationwide within 2-5 business days.',
  socialMediaLinks: { facebook: 'https://facebook.com/emutexnig', instagram: 'https://instagram.com/emutexnig' }
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalBundles: 0,
    totalLeads: 0,
    newLeads: 0,
  });
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState<{current: number, total: number, status: string} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!db) {
      setLoading(false);
      setError("Firebase database is not initialized. Please check your environment variables (VITE_FIREBASE_API_KEY, etc.) in Settings.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const productsCount = await getCountFromServer(collection(db, 'products'));
      const bundlesCount = await getCountFromServer(collection(db, 'bundles'));
      const leadsCount = await getCountFromServer(collection(db, 'leads'));
      
      const recentLeadsQuery = query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(5));
      const recentSnapshot = await getDocs(recentLeadsQuery);
      const leadsData = recentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));

      setStats({
        totalProducts: productsCount.data().count,
        totalBundles: bundlesCount.data().count,
        totalLeads: leadsCount.data().count,
        newLeads: leadsData.filter(l => l.status === 'New').length,
      });
      setRecentLeads(leadsData);
    } catch (err: any) {
      console.error('Dashboard data fetch error:', err);
      // Don't crash the whole UI, but show error
      setError(err.message || String(err));
      try {
        handleFirestoreError(err, OperationType.GET, 'dashboard');
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const seedDemoData = async () => {
    const totalSteps = DEMO_PRODUCTS.length + DEMO_LEADS.length + DEMO_WELLNESS_NEEDS.length + 1;
    if (!confirm('This will seed 10 demo products, leads, wellness needs, and initial site settings. Continue?')) return;
    try {
      setIsSeeding(true);
      setSeedProgress({ current: 0, total: totalSteps, status: 'Starting...' });
      setError(null);
      
      if (!db) {
        throw new Error("Database not initialized. Please check your Firebase configuration.");
      }

      let count = 0;

      // 1. Seed Products
      for (const product of DEMO_PRODUCTS) {
        setSeedProgress({ current: count, total: totalSteps, status: `Adding Product: ${product.name}...` });
        await addDoc(collection(db, 'products'), {
          ...product,
          disclaimer: 'Disclaimer: These products are wellness supplements and are not intended to diagnose, treat, cure, or prevent any disease. Results may vary between individuals.',
          whatsappCtaText: 'Confirm Details on WhatsApp',
          whatsappMessage: `Hello EMutex Nig, I am interested in ${product.name}. Please send me the current price, product details, delivery options, and how I can order.`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        count++;
      }

      // 2. Seed Leads
      for (const lead of DEMO_LEADS) {
        setSeedProgress({ current: count, total: totalSteps, status: `Adding Lead: ${lead.fullName}...` });
        await addDoc(collection(db, 'leads'), {
          ...lead,
          createdAt: serverTimestamp(),
        });
        count++;
      }

      // 3. Seed Wellness Needs
      for (const need of DEMO_WELLNESS_NEEDS) {
        setSeedProgress({ current: count, total: totalSteps, status: `Adding Wellness Need: ${need.title}...` });
        await addDoc(collection(db, 'wellnessNeeds'), need);
        count++;
      }

      // 4. Seed Settings
      setSeedProgress({ current: count, total: totalSteps, status: 'Configuring Initial Settings...' });
      await setDoc(doc(db, 'settings', 'site'), INITIAL_SETTINGS);
      count++;
      
      setSeedProgress({ current: count, total: totalSteps, status: 'Finalizing...' });
      
      // Final confirmation report
      const productsSnap = await getDocs(collection(db, 'products'));
      const allProducts = productsSnap.docs.map(d => d.data());
      
      const report = `
10 products seeded successfully. 10 products available in Firestore.

Summary Report:
- Total products in database: ${allProducts.length}
- Visible products: ${allProducts.filter(p => p.visible).length}
- Catalogue products: ${allProducts.filter(p => p.showInCatalogue).length}
- Homepage products: ${allProducts.filter(p => p.showOnHomepage).length}
- Featured products: ${allProducts.filter(p => p.featured).length}
      `;
      
      alert(report);
      fetchDashboardData();
    } catch (err: any) {
      console.error('Seeding error:', err);
      setError(`Seeding failed at step ${seedProgress?.current || 0}: ${err.message || String(err)}`);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'demo-seed');
      } catch (e) {}
    } finally {
      setIsSeeding(false);
      setSeedProgress(null);
    }
  };

  const statCards = [
    { name: 'Total Products', value: stats.totalProducts, icon: Package, color: 'text-brand-emerald', bg: 'bg-brand-emerald/10', path: '/em-admin/products' },
    { name: 'Total Bundles', value: stats.totalBundles, icon: ShoppingBag, color: 'text-brand-gold', bg: 'bg-brand-gold/10', path: '/em-admin/bundles' },
    { name: 'Total Leads', value: stats.totalLeads, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', path: '/em-admin/leads' },
    { name: 'New Leads', value: stats.newLeads, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/em-admin/leads' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-10">
        {/* welcome */}
        <div className="space-y-1">
          <h1 className="text-3xl font-serif">Welcome back, Admin</h1>
          <p className="text-brand-grey">Here's what's happening with EMutex Nig today.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-100 border border-red-200 text-red-700 rounded-xl flex flex-col gap-2">
            <p className="font-bold">Error encountered:</p>
            <pre className="text-xs whitespace-pre-wrap">{error}</pre>
            <p className="text-xs mt-2 italic">Tip: If this is a permission error, ensure you have deployed your Firestore rules.</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => stat.path && navigate(stat.path)}
              className={cn(
                "card p-8 flex items-center justify-between cursor-pointer group hover:border-brand-gold transition-all",
                stat.name === 'Total Bundles' ? "bg-white" : ""
              )}
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-brand-grey uppercase tracking-wider">{stat.name}</p>
                <p className="text-4xl font-bold text-brand-charcoal">{stat.value}</p>
              </div>
              <div className={cn("p-4 rounded-2xl", stat.bg)}>
                <stat.icon className={stat.color} size={32} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Initial Setup Info */}
        {stats.totalProducts === 0 && (
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="card p-8 bg-brand-gold/10 border-brand-gold/30 flex flex-col md:flex-row items-center gap-8"
           >
              <div className="w-20 h-20 rounded-full bg-brand-gold flex items-center justify-center text-white shrink-0 shadow-lg animate-bounce">
                 <Database size={40} />
              </div>
              <div className="flex-grow space-y-2 text-center md:text-left">
                 <h3 className="text-2xl font-serif text-brand-emerald">Launch Your Catalogue</h3>
                 <p className="text-brand-grey max-w-xl">
                   Your product database is currently empty. You can start by adding a new product manually or seed our initial demo products to see how the website looks.
                 </p>
              </div>
              <div className="flex flex-col gap-3 shrink-0">
                 <button 
                   onClick={seedDemoData}
                   disabled={isSeeding}
                   className="btn-primary flex items-center justify-center gap-2 px-8 py-3 bg-brand-gold hover:bg-opacity-80 border-none relative overflow-hidden"
                 >
                   {isSeeding ? (
                     <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Seeding {seedProgress?.current}/{seedProgress?.total}...</span>
                        {seedProgress && (
                           <div className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300" style={{ width: `${(seedProgress.current / seedProgress.total) * 100}%` }} />
                        )}
                     </>
                   ) : (
                     <>
                        <Sparkles size={18} />
                        Seed Demo Data
                     </>
                   )}
                 </button>
                 <Link to="/em-admin/products" className="btn-secondary text-center px-8 py-3 text-sm">
                    Add First Product
                 </Link>
              </div>
           </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Recent Leads */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold font-serif flex items-center gap-2">
                <Clock size={20} className="text-brand-gold" />
                Recent Leads
              </h3>
              <Link to="/em-admin/leads" className="text-sm font-bold text-brand-emerald flex items-center gap-1 hover:text-brand-gold transition-all">
                View All <ArrowUpRight size={16} />
              </Link>
            </div>
            
            <div className="card overflow-hidden">
               <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-brand-mist/50 text-[10px] font-bold uppercase tracking-widest text-brand-grey">
                    <tr>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Product Interested</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-champagne/10">
                    {loading ? (
                      [1, 2, 3].map(i => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={4} className="px-6 py-8 bg-white/50"></td>
                        </tr>
                      ))
                    ) : recentLeads.length > 0 ? (
                      recentLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-brand-mist/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-brand-charcoal">{lead.fullName}</div>
                            <div className="text-xs text-brand-grey">{lead.whatsappNumber}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-brand-gold/10 text-brand-gold text-[10px] font-bold uppercase tracking-wider">
                                {lead.productInterested}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-brand-grey">
                            {formatDate(lead.createdAt.toDate())}
                          </td>
                          <td className="px-6 py-4">
                             <StatusBadge status={lead.status} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-brand-grey italic">No leads found yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
               </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold font-serif">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-4">
               <Link to="/em-admin/products" className="card p-6 flex items-center gap-4 hover:border-brand-gold transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-brand-emerald text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Package size={24} />
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold text-brand-emerald">Manage Products</h4>
                    <p className="text-xs text-brand-grey">Update inventory & details</p>
                  </div>
                  <ChevronRight size={20} className="text-brand-champagne" />
               </Link>

               <Link to="/em-admin/bundles" className="card p-6 flex items-center gap-4 hover:border-brand-gold transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-brand-gold text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <ShoppingBag size={24} />
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold text-brand-emerald">Manage Bundles</h4>
                    <p className="text-xs text-brand-grey">Bundle offers & items</p>
                  </div>
                  <ChevronRight size={20} className="text-brand-champagne" />
               </Link>
               
               <Link to="/em-admin/settings" className="card p-6 flex items-center gap-4 hover:border-brand-gold transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-brand-gold text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Settings size={24} />
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold text-brand-emerald">Site Settings</h4>
                    <p className="text-xs text-brand-grey">WhatsApp, Hero, Tagline</p>
                  </div>
                  <ChevronRight size={20} className="text-brand-champagne" />
               </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'New': 'bg-emerald-100 text-emerald-700',
    'Contacted': 'bg-blue-100 text-blue-700',
    'Interested': 'bg-purple-100 text-purple-700',
    'Ordered': 'bg-brand-gold/20 text-brand-gold',
    'Not Ready': 'bg-gray-100 text-gray-700',
    'Follow Up Later': 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", colors[status] || 'bg-gray-100 text-gray-700')}>
      {status}
    </span>
  );
}
