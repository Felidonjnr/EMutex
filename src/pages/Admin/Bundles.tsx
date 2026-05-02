import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, orderBy, query, where, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
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
  Wrench
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
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
      const q = query(collection(db, 'bundles'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bundle));
      setBundles(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'bundles');
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
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db!, 'bundles', deleteConfirm.id));
      setBundles(bundles.filter(b => b.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bundles/${deleteConfirm.id}`);
    } finally {
      setIsDeleting(false);
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

  const [repairing, setRepairing] = useState(false);

  const repairBundles = async () => {
    if (!window.confirm("Are you sure you want to repair all bundle fields? This will fix missing slugs, ensure correct visibility, repair numeric orders, and normalize linked products.")) return;
    
    try {
      setRepairing(true);
      const snapshot = await getDocs(collection(db!, 'bundles'));
      const batch: Promise<void>[] = [];
      const usedSlugs = new Set<string>();

      const generateSlug = (name: string) => {
        return name?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
      };
      
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const updates: any = {};
        
        // 1. Repair Slug
        let currentSlug = String(data.slug || '').trim();
        if (!currentSlug) {
           currentSlug = generateSlug(data.name || 'bundle');
        }

        // Deduplicate slug
        let finalSlug = currentSlug;
        let counter = 2;
        while (usedSlugs.has(finalSlug)) {
           finalSlug = `${currentSlug}-${counter}`;
           counter++;
        }
        usedSlugs.add(finalSlug);

        if (finalSlug !== data.slug) {
           updates.slug = finalSlug;
        }

        // 2. Ensure booleans
        if (typeof data.visible !== 'boolean') updates.visible = data.visible === 'true' || data.visible === true || data.visible === undefined;
        if (typeof data.featured !== 'boolean') updates.featured = data.featured === 'true' || data.featured === true;
        
        // 3. Ensure number
        if (typeof data.order !== 'number') updates.order = parseInt(data.order as any) || 999;
        
        // 4. Defaults
        if (!data.category) updates.category = "Wellness Bundle";
        if (!data.availability) updates.availability = "In Stock";
        if (!data.price) updates.price = "Confirm on WhatsApp";
        if (!data.shortDescription) updates.shortDescription = "A carefully selected wellness bundle for better living.";
        if (!data.fullDescription) updates.fullDescription = data.shortDescription || updates.shortDescription;
        if (!data.imageUrl) updates.imageUrl = 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800';
        
        // 5. Fix includedProductIds if strings instead of array
        if (typeof data.includedProductIds === 'string') {
           updates.includedProductIds = (data.includedProductIds as string).split('|').map(s => s.trim()).filter(Boolean);
        }
        
        if (Object.keys(updates).length > 0) {
          batch.push(updateDoc(docSnap.ref, { ...updates, updatedAt: serverTimestamp() }));
        }
      });
      
      if (batch.length > 0) {
        await Promise.all(batch);
        alert(`Successfully repaired ${batch.length} bundles with proper slugs and fields.`);
        fetchBundles();
      } else {
        alert("All bundles are already in perfect shape.");
      }
    } catch (error) {
      console.error("Repair failed:", error);
      alert("Repair failed. Please check the console for details.");
    } finally {
      setRepairing(false);
    }
  };

  const filteredBundles = bundles.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.shortDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-serif">Wellness Bundles</h1>
            <p className="text-brand-grey">Manage your curated wellness combinations.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
               onClick={repairBundles}
               disabled={repairing}
               className="px-4 py-3 bg-white border border-brand-gold/30 text-brand-gold rounded-xl hover:bg-brand-gold/5 transition-all flex items-center gap-2 text-xs font-bold disabled:opacity-50"
            >
               <Wrench size={18} className={repairing ? "animate-spin" : "" } />
               {repairing ? 'Repairing...' : 'Repair Visibility'}
            </button>
            <button 
              onClick={() => setIsImportOpen(true)}
              className="px-4 py-3 bg-white border border-brand-champagne/30 text-brand-emerald rounded-xl hover:bg-brand-mist/20 transition-all flex items-center gap-2 text-xs font-bold"
            >
              <Upload size={18} />
              Import CSV
            </button>
            <button 
              onClick={() => { setEditingBundle(null); setIsFormOpen(true); }}
              className="btn-primary flex items-center gap-2 px-6"
            >
              <Plus size={20} />
              Add Bundle
            </button>
          </div>
        </div>

        {/* Search & Stats Section */}
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
          <div className="card p-2 bg-white shadow-sm w-full lg:max-w-md">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-grey" size={18} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search bundles..."
                  className="w-full pl-10 pr-4 py-3 bg-brand-ivory/50 border border-brand-champagne/30 rounded-xl text-sm focus:outline-none focus:border-brand-gold outline-none"
                />
             </div>
          </div>
          <div className="flex gap-4 text-[10px] font-bold text-brand-grey uppercase tracking-widest bg-white p-4 rounded-2xl shadow-sm border border-brand-champagne/10">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Total: {bundles.length}</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-brand-gold" /> Featured: {bundles.filter(b => b.featured).length}</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gray-400" /> Hidden: {bundles.filter(b => !b.visible).length}</div>
          </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {loading ? (
             [1, 2, 3].map(i => <div key={i} className="card h-96 animate-pulse bg-white" />)
           ) : filteredBundles.length > 0 ? (
             filteredBundles.map(bundle => (
               <div key={bundle.id} className="card bg-white hover:border-brand-gold transition-all group overflow-hidden flex flex-col">
                  <div className="h-48 bg-brand-mist flex items-center justify-center relative overflow-hidden shrink-0">
                     {bundle.imageUrl ? (
                        <img src={bundle.imageUrl} alt={bundle.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                     ) : (
                        <ImageIcon size={48} className="text-brand-gold opacity-20" />
                     )}
                     <div className="absolute top-3 right-3 flex flex-col gap-2">
                        <div className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm backdrop-blur flex items-center gap-1.5",
                          bundle.visible ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
                        )}>
                          {bundle.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                          {bundle.visible ? 'Visible' : 'Hidden'}
                        </div>
                        <div className="px-2 py-1 bg-white/90 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm backdrop-blur">
                          {bundle.availability}
                        </div>
                     </div>
                     <div className="absolute bottom-3 left-3 flex gap-1.5">
                        {bundle.featured && <div className="px-2 py-0.5 bg-brand-gold text-white rounded text-[8px] font-bold uppercase tracking-widest shadow-lg">Featured</div>}
                        <div className="px-2 py-0.5 bg-brand-charcoal text-white rounded text-[8px] font-bold uppercase tracking-widest shadow-lg">Order: {bundle.order}</div>
                     </div>
                  </div>
                  <div className="p-6 space-y-6 flex-grow flex flex-col">
                     <div className="space-y-1 flex-grow">
                        <h3 className="font-serif text-xl text-brand-emerald group-hover:text-brand-gold transition-colors">{bundle.name}</h3>
                        <p className="text-xs text-brand-grey line-clamp-2 leading-relaxed">{bundle.shortDescription}</p>
                        
                        <div className="pt-2">
                           <p className="text-sm font-bold text-brand-charcoal">Price: {bundle.price || 'Confirm on WhatsApp'}</p>
                        </div>

                        <div className="pt-4 space-y-2">
                           <p className="text-[10px] font-bold text-brand-gold uppercase tracking-widest">Includes:</p>
                           <div className="flex flex-wrap gap-1">
                              {bundle.includedItems?.map((item, idx) => (
                                 <span key={idx} className="px-2 py-0.5 bg-brand-mist/30 text-brand-emerald text-[9px] font-medium rounded-md border border-brand-champagne/10">
                                    {item}
                                 </span>
                              ))}
                              {bundle.includedProductSlugs?.map((slug, idx) => (
                                 <span key={`prod-${idx}`} className="px-2 py-0.5 bg-brand-gold/10 text-brand-gold text-[9px] font-medium rounded-md border border-brand-gold/20">
                                    Linked: {slug}
                                 </span>
                              ))}
                           </div>
                        </div>
                     </div>

                     {/* Quick Toggles */}
                     <div className="grid grid-cols-2 gap-2 p-3 bg-brand-mist/20 rounded-xl">
                        <button 
                          onClick={() => toggleField(bundle, 'visible')}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all",
                            bundle.visible ? "bg-white text-brand-emerald shadow-sm" : "bg-transparent text-brand-grey hover:bg-white/50"
                          )}
                        >
                          <Eye size={12} className={cn(bundle.visible ? "text-brand-gold" : "text-brand-grey")} />
                          Visible
                        </button>
                        <button 
                          onClick={() => toggleField(bundle, 'featured')}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all",
                            bundle.featured ? "bg-white text-brand-emerald shadow-sm" : "bg-transparent text-brand-grey hover:bg-white/50"
                          )}
                        >
                          <Star size={12} className={cn(bundle.featured ? "text-brand-gold" : "text-brand-grey")} />
                          Featured
                        </button>
                     </div>

                     <div className="pt-2 flex items-center justify-between gap-4 border-t border-brand-champagne/10">
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => { setEditingBundle(bundle); setIsFormOpen(true); }}
                             className="p-2.5 text-brand-emerald hover:bg-brand-emerald/10 rounded-xl transition-all border border-brand-emerald/10 hover:border-brand-emerald/30 group/edit"
                           >
                              <Edit2 size={18} className="group-hover/edit:scale-110 transition-transform" />
                           </button>
                           <Link 
                             to={`/bundles`}
                             target="_blank"
                             className="p-2.5 text-brand-gold hover:bg-brand-gold/10 rounded-xl transition-all border border-brand-gold/10 hover:border-brand-gold/30 group/view"
                           >
                              <ArrowUpRight size={18} className="group-hover/view:scale-110 group-hover/view:translate-x-0.5 group-hover/view:-translate-y-0.5 transition-transform" />
                           </Link>
                        </div>
                        <button 
                           onClick={() => setDeleteConfirm(bundle)}
                           className="p-2.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-red-100 hover:border-red-200 group/del"
                        >
                           <Trash2 size={18} className="group-hover/del:scale-110 transition-transform" />
                        </button>
                     </div>
                  </div>
               </div>
             ))
           ) : (
             <div className="col-span-full py-32 text-center bg-white rounded-3xl border-2 border-dashed border-brand-champagne/20">
                <div className="w-16 h-16 bg-brand-mist/50 rounded-full flex items-center justify-center mx-auto text-brand-gold mb-4 opacity-40">
                   <Package size={32} />
                </div>
                <h3 className="text-xl font-serif text-brand-charcoal mb-1">No Bundles Found</h3>
                <p className="text-brand-grey text-sm mb-6">Start by adding your first wellness bundle.</p>
                {searchTerm && (
                   <button onClick={() => setSearchTerm('')} className="text-brand-gold font-bold text-sm hover:underline">Clear search filters</button>
                )}
             </div>
           )}
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
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white max-w-md w-full rounded-3xl p-8 space-y-6 shadow-2xl"
              >
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                    <AlertTriangle size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-serif text-brand-emerald">Delete Bundle?</h3>
                    <p className="text-brand-grey leading-relaxed">
                      Are you sure you want to permanently delete <span className="font-bold text-brand-charcoal">"{deleteConfirm.name}"</span>?
                    </p>
                  </div>
                  <div className="flex gap-4 pt-2">
                    <button 
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-grow btn-secondary"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-grow py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                    >
                      {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                      {isDeleting ? 'Deleting...' : 'Delete Forever'}
                    </button>
                  </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
