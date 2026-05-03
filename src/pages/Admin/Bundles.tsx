import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, orderBy, query, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';
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
      const verifySnap = await getDoc(doc(db!, 'bundles', deleteConfirm.id));
      if (verifySnap.exists()) {
        throw new Error("Delete failed. Bundle still exists in Firestore.");
      }
      setBundles(bundles.filter(b => b.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error("Delete error:", error);
      let errorMessage = error.message || String(error);
      setDeleteError(`Delete failed: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const flushBundles = async () => {
    const confirmation = window.prompt("Type 'FLUSH' to permanently delete ALL bundles.");
    if (confirmation !== 'FLUSH') return;
    try {
      setFlushing(true);
      const snap = await getDocs(collection(db!, 'bundles'));
      const batchSize = 500;
      for (let i = 0; i < snap.docs.length; i += batchSize) {
        const batch = writeBatch(db!);
        const chunk = snap.docs.slice(i, i + batchSize);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      fetchBundles();
    } catch (error) {
       console.error("Flush error:", error);
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
    if (!window.confirm("Repair all bundle fields?")) return;
    try {
      setRepairing(true);
      const snapshot = await getDocs(collection(db!, 'bundles'));
      const batchSize = 500;
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db!);
        const chunk = snapshot.docs.slice(i, i + batchSize);
        chunk.forEach(docSnap => {
          const data = docSnap.data();
          const updates: any = {};
          if (!data.slug) updates.slug = generateSlug(data.name || 'bundle');
          if (data.visible === undefined) updates.visible = true;
          if (data.featured === undefined) updates.featured = false;
          if (data.bundleOrder === undefined) updates.bundleOrder = 999;
          if (Object.keys(updates).length > 0) {
            batch.update(docSnap.ref, { ...updates, updatedAt: serverTimestamp() });
          }
        });
        await batch.commit();
      }
      fetchBundles();
    } catch (error) {
      console.error("Repair failed:", error);
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
              className="btn-primary flex items-center justify-center gap-2 px-8 py-4 bg-brand-emerald shadow-xl flex-grow md:flex-grow-0"
            >
              <Plus size={20} />
              Add Bundle
            </button>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
          <div className="xl:col-span-4 p-2 bg-white shadow-sm border border-brand-champagne/10 rounded-2xl">
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-grey" size={20} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search bundles..."
                  className="w-full pl-12 pr-4 py-3 bg-brand-ivory/30 border-0 rounded-xl text-sm focus:outline-none outline-none transition-all"
                />
             </div>
          </div>

          <div className="xl:col-span-8 flex flex-wrap items-center justify-end gap-3">
            <button onClick={repairBundles} disabled={repairing} className="btn-secondary px-4 py-3 text-xs bg-emerald-50 text-emerald-700 border-emerald-100">
               {repairing ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />}
               <span className="ml-2 hidden sm:inline">Repair</span>
            </button>
            <button onClick={() => setIsImportOpen(true)} className="btn-secondary px-4 py-3 text-xs bg-blue-50 text-blue-700 border-blue-100">
              <Upload size={16} />
              <span className="ml-2 hidden sm:inline">Import</span>
            </button>
            <button onClick={fetchBundles} className="p-3 bg-white border border-brand-champagne/20 rounded-xl text-brand-grey shadow-sm">
              <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 admin-bundles-grid">
           {loading ? (
             [1, 2, 3].map(i => (
               <div key={i} className="admin-bundle-card h-[400px] animate-pulse bg-brand-cream/10" />
             ))
           ) : filteredBundles.length > 0 ? (
             filteredBundles.map(bundle => (
               <div key={bundle.id} className="admin-bundle-card group/card">
                  <div className="admin-image-wrap relative">
                     {bundle.imageUrl ? (
                        <img 
                          src={bundle.imageUrl} 
                          alt={bundle.name} 
                          width="400"
                          height="225"
                          loading="lazy"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer" 
                        />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center">
                           <ImageIcon size={48} className="text-brand-gold opacity-10" />
                        </div>
                     )}
                     <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                        <div className={cn(
                          "px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-lg flex items-center gap-1.5",
                          bundle.visible ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                        )}>
                          {bundle.visible ? <Eye size={10} /> : <EyeOff size={10} />}
                          {bundle.visible ? 'Visible' : 'Hidden'}
                        </div>
                        {bundle.featured && <div className="px-2.5 py-1 bg-brand-gold text-white rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-lg text-center">Featured</div>}
                     </div>
                  </div>
                  <div className="p-5 space-y-4 flex-grow flex flex-col">
                     <div className="space-y-1 flex-grow">
                        <div className="flex justify-between items-center text-[9px] font-bold text-brand-gold uppercase tracking-widest">
                           <span>{bundle.category || 'Wellness Bundle'}</span>
                           <span className="text-brand-grey">#{bundle.bundleOrder || bundle.order}</span>
                        </div>
                        <h3 className="font-serif text-lg text-brand-emerald line-clamp-1">{bundle.name}</h3>
                        <p className="text-xs text-brand-grey line-clamp-2 leading-relaxed min-h-[2.5rem]">{bundle.shortDescription}</p>
                        <div className="pt-2 border-t border-brand-champagne/10 flex justify-between items-center mt-2">
                           <p className="text-xs font-bold text-brand-charcoal">₦{bundle.price || 'WhatsApp'}</p>
                           <span className="text-[9px] font-bold text-brand-grey uppercase">{bundle.availability}</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-2 p-1 bg-brand-mist/20 rounded-xl">
                        <button 
                          onClick={() => toggleField(bundle, 'visible')}
                          className={cn(
                            "flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-bold uppercase transition-all",
                            bundle.visible ? "bg-white text-emerald-600 shadow-sm" : "bg-transparent text-brand-grey"
                          )}
                        >
                          <Eye size={12} /> View
                        </button>
                        <button 
                          onClick={() => toggleField(bundle, 'featured')}
                          className={cn(
                            "flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-bold uppercase transition-all",
                            bundle.featured ? "bg-white text-brand-gold shadow-sm" : "bg-transparent text-brand-grey"
                          )}
                        >
                          <Star size={12} /> Star
                        </button>
                     </div>

                     <div className="flex items-center justify-between gap-3 pt-2 border-t border-brand-champagne/10">
                        <div className="flex gap-2">
                           <button onClick={() => { setEditingBundle(bundle); setIsFormOpen(true); }} className="p-3 bg-brand-mist/20 text-brand-emerald rounded-xl border border-brand-emerald/10">
                              <Edit2 size={16} />
                           </button>
                           <Link to={`/bundles/${bundle.slug}`} target="_blank" className="p-3 bg-brand-gold/10 text-brand-gold rounded-xl border border-brand-gold/10">
                              <ArrowUpRight size={16} />
                           </Link>
                        </div>
                        <button onClick={() => setDeleteConfirm(bundle)} className="p-3 text-red-500 bg-red-50 rounded-xl border border-red-100">
                           <Trash2 size={16} />
                        </button>
                     </div>
                  </div>
               </div>
             ))
           ) : (
             <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-brand-champagne/30">
                <Package size={48} className="mx-auto text-brand-gold/20 mb-4" />
                <h3 className="text-xl font-serif text-brand-charcoal">No Bundles Found</h3>
                <p className="text-xs text-brand-grey mt-2">Adjust your search or add a new bundle.</p>
             </div>
           )}
        </div>

        {/* Danger Zone */}
        <div className="pt-20 border-t border-brand-champagne/20">
           <div className="bg-red-50/50 border border-red-100 rounded-3xl p-8 overflow-hidden relative">
              <div className="absolute right-0 top-0 p-8 text-red-500 opacity-5">
                 <AlertTriangle size={150} />
              </div>
              <div className="relative z-10 space-y-4">
                  <h2 className="text-xl font-serif text-red-800 flex items-center gap-2">
                     <Shield size={24} /> Danger Zone
                  </h2>
                  <p className="text-xs text-red-600/70 font-medium max-w-md">Permanently delete all bundle documents. This action is irreversible.</p>
                  <button onClick={flushBundles} disabled={flushing} className="bg-red-600 text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
                     {flushing ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                     Flush All Bundles
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
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white max-w-sm w-full rounded-3xl p-8 space-y-6">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                    <AlertTriangle size={36} />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-serif text-brand-emerald">Are you sure?</h3>
                    <p className="text-xs text-brand-grey leading-relaxed">
                      Delete <span className="font-bold text-brand-charcoal">"{deleteConfirm.name}"</span>? This cannot be undone.
                    </p>
                  </div>
                  {deleteError && <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg text-center">{deleteError}</div>}
                  <div className="flex gap-3">
                    <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 text-xs font-bold bg-brand-mist/20 rounded-xl">Cancel</button>
                    <button onClick={handleDelete} className="flex-1 py-3 text-xs font-bold bg-red-600 text-white rounded-xl">Delete</button>
                  </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
