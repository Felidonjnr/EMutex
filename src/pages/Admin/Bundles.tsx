import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, orderBy, query, where, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../../lib/firebase';
import AdminLayout from '../../components/layout/AdminLayout';
import { Bundle, Product } from '../../types';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Star, 
  Image as ImageIcon, 
  Upload, 
  AlertTriangle, 
  Loader2,
  ArrowUpRight,
  Package,
  Wrench,
  Shield,
  RefreshCcw,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, generateSlug } from '../../lib/utils';
import BundleForm from './BundleForm';
import BundleCSVImport from './BundleCSVImport';

export default function AdminBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Bundle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [flushing, setFlushing] = useState(false);

  useEffect(() => {
    fetchBundles();
    fetchProducts();
  }, []);

  async function fetchBundles() {
    if (!db) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const q = query(collection(db, 'bundles'), orderBy('bundleOrder', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bundle));
      setBundles(data);
    } catch (error) {
      // If bundleOrder field doesn't exist yet, fallback to createdAt or just docs
      try {
        const q2 = query(collection(db, 'bundles'), orderBy('createdAt', 'desc'));
        const snapshot2 = await getDocs(q2);
        const data2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bundle));
        setBundles(data2);
      } catch (e) {
        const snapshotRaw = await getDocs(collection(db, 'bundles'));
        const dataRaw = snapshotRaw.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bundle));
        setBundles(dataRaw);
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchProducts() {
    if (!db) return;
    try {
      const q = query(collection(db, 'products'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products for selection:", error);
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteError(null);
    
    if (!auth.currentUser) {
      setDeleteError("You are not signed in. Please log in again.");
      return;
    }

    try {
      setIsDeleting(true);
      await deleteDoc(doc(db!, 'bundles', deleteConfirm.id));

      // Verify deletion
      const verifySnap = await getDoc(doc(db!, 'bundles', deleteConfirm.id));
      if (verifySnap.exists()) {
        throw new Error("Delete failed. Bundle still exists in Firestore.");
      }

      setBundles(bundles.filter(b => b.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error("Delete error:", error);
      let errorMessage = error.message || String(error);
      try {
        const parsed = JSON.parse(errorMessage);
        errorMessage = parsed.error || errorMessage;
      } catch (e) { }
      setDeleteError(`Delete failed: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const flushBundles = async () => {
    const confirmation = window.prompt("Type 'FLUSH' to permanently delete ALL bundles. Data cannot be recovered.");
    if (confirmation !== 'FLUSH') return;

    try {
      setFlushing(true);
      const snap = await getDocs(collection(db!, 'bundles'));
      const batchSize = 500;
      let count = 0;
      
      for (let i = 0; i < snap.docs.length; i += batchSize) {
        const batch = writeBatch(db!);
        const chunk = snap.docs.slice(i, i + batchSize);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
        count += chunk.length;
      }
      
      alert(`Flushed ${count} bundles successfully.`);
      fetchBundles();
    } catch (error) {
       console.error("Flush error:", error);
       alert("Flush failed. Check console.");
    } finally {
      setFlushing(false);
    }
  };

  const toggleField = async (bundle: Bundle, field: keyof Bundle) => {
    try {
      const newVal = !bundle[field];
      await updateDoc(doc(db!, 'bundles', bundle.id), { [field]: newVal, updatedAt: serverTimestamp() });
      setBundles(bundles.map(b => b.id === bundle.id ? { ...b, [field]: newVal } : b));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bundles/${bundle.id}`);
    }
  };

  const repairBundles = async () => {
    if (!window.confirm("Repair all bundle fields? This will regenerate slugs from names, fix missing defaults, and normalize existing bundles.")) return;
    
    try {
      setRepairing(true);
      const snapshot = await getDocs(collection(db!, 'bundles'));
      const usedSlugs = new Set<string>();
      
      const batchSize = 500;
      let repairCount = 0;

      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db!);
        const chunk = snapshot.docs.slice(i, i + batchSize);
        
        chunk.forEach(docSnap => {
          const data = docSnap.data();
          const updates: any = {};
          
          // 1. Slug Regeneration & Uniqueness
          let baseSlug = generateSlug(data.name || 'bundle');
          let finalSlug = baseSlug;
          let counter = 2;
          while (usedSlugs.has(finalSlug)) {
             finalSlug = `${baseSlug}-${counter}`;
             counter++;
          }
          usedSlugs.add(finalSlug);
          if (data.slug !== finalSlug) updates.slug = finalSlug;

          // 2. Types & Booleans
          if (typeof data.visible !== 'boolean') updates.visible = data.visible !== false;
          if (typeof data.featured !== 'boolean') updates.featured = !!data.featured;
          if (typeof data.showOnHomepage !== 'boolean') updates.showOnHomepage = !!data.showOnHomepage;
          if (typeof data.showInBundlesPage !== 'boolean') updates.showInBundlesPage = data.showInBundlesPage !== false;
          
          // 3. Numbers
          const order = parseInt(String(data.bundleOrder ?? data.order)) || 999;
          if (data.bundleOrder !== order) updates.bundleOrder = order;

          // 4. Defaults
          if (!data.category) updates.category = "Wellness Bundle";
          if (!data.shortDescription) updates.shortDescription = "A carefully selected wellness bundle for better living.";
          if (!data.fullDescription) updates.fullDescription = data.shortDescription || "A carefully selected wellness bundle for better living.";
          if (!data.imageUrl) updates.imageUrl = 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800';
          if (!data.price) updates.price = "Confirm on WhatsApp";
          if (!data.availability) updates.availability = "In Stock";
          if (!data.whatsappCtaText) updates.whatsappCtaText = "Confirm Bundle Price on WhatsApp";
          if (!data.disclaimer) updates.disclaimer = "This product bundle is for wellness support. Please confirm current details on WhatsApp before ordering.";
          
          if (!Array.isArray(data.includedItems)) updates.includedItems = [];
          if (!Array.isArray(data.includedProductIds)) updates.includedProductIds = [];
          if (!Array.isArray(data.benefits)) updates.benefits = [];
          if (!Array.isArray(data.galleryImages)) updates.galleryImages = [];
          if (!Array.isArray(data.faq)) updates.faq = [];

          if (!data.whatsappMessage) {
             const itemsStr = (data.includedItems || []).length > 0 ? `\nIncluded: ${data.includedItems.join(', ')}` : '';
             updates.whatsappMessage = `Hello EMutex Nig, I am interested in the ${data.name}.${itemsStr}\n\nPlease send me the current bundle price, delivery options, and how I can order.`;
          }

          if (Object.keys(updates).length > 0) {
            batch.update(docSnap.ref, { ...updates, updatedAt: serverTimestamp() });
            repairCount++;
          }
        });
        await batch.commit();
      }
      
      alert(`Successfully repaired ${repairCount} bundles.`);
      fetchBundles();
    } catch (error) {
      console.error("Repair failed:", error);
      alert("Repair failed.");
    } finally {
      setRepairing(false);
    }
  };

  const filteredBundles = bundles.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.shortDescription?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-brand-gold font-bold text-xs uppercase tracking-widest">
               <Package size={14} /> Admin Portal
            </div>
            <h1 className="text-4xl font-serif text-brand-emerald">Wellness Bundles</h1>
            <p className="text-brand-grey font-medium">Manage curated wellness combinations and bulk offers.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => { setEditingBundle(null); setIsFormOpen(true); }}
              className="btn-primary flex items-center justify-center gap-2 px-8 py-4 bg-brand-emerald shadow-xl shadow-brand-emerald/10 flex-grow md:flex-grow-0"
            >
              <Plus size={20} />
              Add Bundle
            </button>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
          <div className="xl:col-span-4 card p-2 bg-white shadow-xl shadow-brand-mist/20">
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-grey" size={20} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or description..."
                  className="w-full pl-12 pr-4 py-4 bg-brand-ivory/30 border border-brand-champagne/10 rounded-2xl text-sm focus:outline-none focus:border-brand-gold outline-none transition-all"
                />
             </div>
          </div>

          <div className="xl:col-span-8 flex flex-wrap items-center justify-end gap-3">
            <div className="flex bg-white px-4 py-2 border border-brand-champagne/10 rounded-2xl gap-6 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" /> <span className="text-[10px] font-bold text-brand-grey uppercase">Visible: <span className="text-brand-charcoal">{bundles.filter(b => b.visible).length}</span></span></div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-brand-gold shadow-sm" /> <span className="text-[10px] font-bold text-brand-grey uppercase">Featured: <span className="text-brand-charcoal">{bundles.filter(b => b.featured).length}</span></span></div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-gray-400 shadow-sm" /> <span className="text-[10px] font-bold text-brand-grey uppercase">Hidden: <span className="text-brand-charcoal">{bundles.filter(b => !b.visible).length}</span></span></div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-brand-charcoal shadow-sm" /> <span className="text-[10px] font-bold text-brand-grey uppercase">Total: <span className="text-brand-charcoal">{bundles.length}</span></span></div>
            </div>

            <div className="h-8 w-px bg-brand-champagne/20 mx-2 hidden md:block" />

            <button
               onClick={repairBundles}
               disabled={repairing}
               className="btn-secondary flex items-center gap-2 px-5 py-3 border-emerald-100 bg-emerald-50/30 text-emerald-700 hover:bg-emerald-50"
               title="Repair slugs and normalize fields"
            >
               {repairing ? <Loader2 size={18} className="animate-spin" /> : <Wrench size={18} />}
               <span className="hidden sm:inline">Repair Fields</span>
            </button>

            <button 
              onClick={() => setIsImportOpen(true)}
              className="btn-secondary flex items-center gap-2 px-5 py-3 border-blue-100 bg-blue-50/30 text-blue-700 hover:bg-blue-50"
            >
              <Upload size={18} />
              <span className="hidden sm:inline">Import CSV</span>
            </button>

            <button 
              onClick={fetchBundles}
              className="p-3 bg-white border border-brand-champagne/20 rounded-2xl text-brand-grey hover:text-brand-emerald transition-all"
              title="Refresh List"
            >
              <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
           {loading ? (
             [1, 2, 3, 4].map(i => (
               <div key={i} className="card h-[450px] animate-pulse bg-white border-brand-champagne/10" />
             ))
           ) : filteredBundles.length > 0 ? (
             filteredBundles.map(bundle => (
               <div key={bundle.id} className="card bg-white hover:border-brand-gold transition-all group overflow-hidden flex flex-col shadow-xl shadow-brand-mist/5">
                  <div className="h-56 bg-brand-mist flex items-center justify-center relative overflow-hidden shrink-0">
                     {bundle.imageUrl ? (
                        <img src={bundle.imageUrl} alt={bundle.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" referrerPolicy="no-referrer" />
                     ) : (
                        <ImageIcon size={64} className="text-brand-gold opacity-10" />
                     )}
                     <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <div className={cn(
                          "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xl backdrop-blur-md flex items-center gap-2",
                          bundle.visible ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
                        )}>
                          {bundle.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                          {bundle.visible ? 'Visible' : 'Hidden'}
                        </div>
                     </div>
                     <div className="absolute bottom-4 left-4 flex gap-2">
                        {bundle.featured && <div className="px-3 py-1 bg-brand-gold text-white rounded-full text-[9px] font-bold uppercase tracking-widest shadow-xl">Featured</div>}
                        <div className="px-3 py-1 bg-brand-charcoal/80 text-white rounded-full text-[9px] font-bold uppercase tracking-widest shadow-xl backdrop-blur-sm">Order: {bundle.bundleOrder ?? bundle.order}</div>
                     </div>
                  </div>
                  <div className="p-6 space-y-6 flex-grow flex flex-col">
                     <div className="space-y-2 flex-grow">
                        <div className="flex justify-between items-start">
                           <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">{bundle.category || 'Wellness Bundle'}</p>
                        </div>
                        <h3 className="font-serif text-xl text-brand-emerald leading-tight">{bundle.name}</h3>
                        <p className="text-xs text-brand-grey line-clamp-2 leading-relaxed h-8">{bundle.shortDescription}</p>
                        
                        <div className="pt-2 flex items-center justify-between">
                           <p className="text-sm font-black text-brand-charcoal">{bundle.price || 'Contact WhatsApp'}</p>
                           <span className={cn(
                             "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border",
                             bundle.availability === 'Out of Stock' ? "bg-red-50 text-red-500 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                           )}>
                             {bundle.availability}
                           </span>
                        </div>

                        <div className="pt-4 space-y-2">
                           <div className="flex items-center gap-2">
                              <div className="h-px bg-brand-gold/20 flex-grow" />
                              <p className="text-[9px] font-black text-brand-gold uppercase tracking-[0.15em] shrink-0">Included items</p>
                              <div className="h-px bg-brand-gold/20 flex-grow" />
                           </div>
                           <div className="flex flex-wrap gap-1.5 h-12 overflow-y-auto scrollbar-hide pt-1">
                              {bundle.includedItems?.slice(0, 3).map((item, idx) => (
                                 <span key={idx} className="px-2 py-1 bg-brand-mist/40 text-brand-emerald text-[9px] font-bold rounded-lg border border-brand-champagne/10 whitespace-nowrap">
                                    {item}
                                 </span>
                              ))}
                              {bundle.includedProductSlugs?.slice(0, 2).map((slug, idx) => (
                                 <span key={`prod-${idx}`} className="px-2 py-1 bg-blue-50 text-blue-600 text-[9px] font-bold rounded-lg border border-blue-100 whitespace-nowrap">
                                    Link: {slug}
                                 </span>
                              ))}
                              {(bundle.includedItems?.length + bundle.includedProductSlugs?.length) > 5 && (
                                <span className="text-[10px] text-brand-grey italic pt-1">+{ (bundle.includedItems?.length + bundle.includedProductSlugs?.length) - 5 } more</span>
                              )}
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-2 p-1 bg-brand-mist/20 rounded-2xl">
                        <button 
                          onClick={() => toggleField(bundle, 'visible')}
                          className={cn(
                            "flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all",
                            bundle.visible ? "bg-white text-emerald-600 shadow-sm" : "bg-transparent text-brand-grey hover:bg-white/50"
                          )}
                        >
                          <Eye size={14} /> Visible
                        </button>
                        <button 
                          onClick={() => toggleField(bundle, 'featured')}
                          className={cn(
                            "flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all",
                            bundle.featured ? "bg-white text-brand-gold shadow-sm" : "bg-transparent text-brand-grey hover:bg-white/50"
                          )}
                        >
                          <Star size={14} /> Featured
                        </button>
                     </div>

                     <div className="flex items-center justify-between gap-3 pt-2">
                        <div className="flex gap-2">
                           <button 
                             onClick={() => { setEditingBundle(bundle); setIsFormOpen(true); }}
                             className="p-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-2xl transition-all border border-emerald-100 group/edit"
                           >
                              <Edit2 size={18} className="group-hover/edit:scale-110 transition-transform" />
                           </button>
                           <Link 
                             to={`/bundles/${bundle.slug}`}
                             target="_blank"
                             className="p-3 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 rounded-2xl transition-all border border-brand-gold/10 group/view"
                           >
                              <ArrowUpRight size={18} className="group-hover/view:scale-110 group-hover/view:translate-x-0.5 group-hover/view:-translate-y-0.5 transition-transform" />
                           </Link>
                        </div>
                        <button 
                           onClick={() => setDeleteConfirm(bundle)}
                           className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 bg-red-50/50 rounded-2xl transition-all border border-red-50 group/del"
                        >
                           <Trash2 size={18} className="group-hover/del:rotate-12 transition-transform" />
                        </button>
                     </div>
                  </div>
               </div>
             ))
           ) : (
             <div className="col-span-full py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-brand-champagne/20 shadow-inner">
                <div className="w-24 h-24 bg-brand-mist/50 rounded-full flex items-center justify-center mx-auto text-brand-gold mb-6 opacity-30">
                   <Package size={48} />
                </div>
                <h3 className="text-3xl font-serif text-brand-charcoal mb-2">No Bundles Matched</h3>
                <p className="text-brand-grey font-medium mb-8 max-w-sm mx-auto">Either start by adding bundles or adjust your filter terms.</p>
                {searchTerm && (
                   <button onClick={() => setSearchTerm('')} className="btn-secondary px-8">Clear Search Filters</button>
                )}
             </div>
           )}
        </div>

        {/* Danger Zone */}
        <div className="pt-20 border-t border-brand-champagne/20">
           <div className="bg-red-50/50 border border-red-100 rounded-[2.5rem] p-10 overflow-hidden relative group">
              <div className="absolute right-0 top-0 p-12 text-red-500 opacity-5 group-hover:opacity-10 transition-opacity">
                 <AlertTriangle size={200} />
              </div>
              <div className="relative z-10 space-y-6">
                 <div>
                    <h2 className="text-2xl font-serif text-red-800 flex items-center gap-3">
                       <Shield className="text-red-600" size={28} /> Danger Zone
                    </h2>
                    <p className="text-red-600/70 max-w-lg mt-2 font-medium">Permanently delete all bundle documents. This action is irreversible and products will remain safe in their own collection.</p>
                 </div>
                 <button 
                   onClick={flushBundles}
                   disabled={flushing}
                   className="btn-primary bg-red-600 hover:bg-red-700 text-white px-10 py-4 flex items-center gap-3 shadow-xl shadow-red-600/20 disabled:opacity-50"
                 >
                    {flushing ? <Loader2 size={24} className="animate-spin" /> : <Trash2 size={24} />}
                    <span className="text-lg">{flushing ? 'Flushing Database...' : 'Flush All Bundles'}</span>
                 </button>
              </div>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {isFormOpen && (
           <BundleForm 
             bundle={editingBundle} 
             products={products}
             onClose={() => setIsFormOpen(false)} 
             onSuccess={() => { setIsFormOpen(false); fetchBundles(); }} 
           />
        )}
        {isImportOpen && (
           <BundleCSVImport 
              onClose={() => setIsImportOpen(false)} 
              onSuccess={() => { setIsImportOpen(false); fetchBundles(); }} 
           />
        )}
        {deleteConfirm && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white max-w-md w-full rounded-[2.5rem] p-10 space-y-8 shadow-2xl overflow-hidden relative"
              >
                  <div className="absolute top-0 right-0 p-12 text-red-500 opacity-5">
                     <AlertTriangle size={150} />
                  </div>
                  
                  <div className="relative space-y-6">
                    <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center shadow-lg shadow-red-100/50">
                      <AlertTriangle size={40} />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-3xl font-serif text-brand-emerald">Confirm Deletion</h3>
                      <p className="text-brand-grey leading-relaxed">
                        Are you sure you want to permanently delete <span className="font-bold text-brand-charcoal italic">"{deleteConfirm.name}"</span>?
                      </p>
                      <ul className="text-xs text-red-500 space-y-1 font-bold uppercase tracking-widest list-disc ml-4 pt-2">
                         <li>This cannot be undone</li>
                         <li>Linked products are safe</li>
                         <li>Slug will be freed</li>
                      </ul>
                    </div>

                    {deleteError && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex gap-3 items-center animate-shake">
                         <AlertCircle size={20} className="shrink-0" />
                         <p>{deleteError}</p>
                      </div>
                    )}

                    <div className="flex gap-4 pt-4">
                      <button 
                        onClick={() => { setDeleteConfirm(null); setDeleteError(null); }}
                        disabled={isDeleting}
                        className="flex-grow btn-secondary py-4"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-grow py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-red-600/20 disabled:opacity-50"
                      >
                        {isDeleting ? <Loader2 size={24} className="animate-spin" /> : <Trash2 size={24} />}
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                    
                    <button 
                      onClick={async () => {
                        await toggleField(deleteConfirm, 'visible');
                        setDeleteConfirm(null);
                        setDeleteError(null);
                      }}
                      disabled={isDeleting}
                      className="w-full py-4 text-brand-grey text-xs font-bold uppercase tracking-widest hover:text-brand-emerald transition-colors bg-brand-mist/20 rounded-2xl"
                    >
                      Hide from website instead
                    </button>
                  </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
