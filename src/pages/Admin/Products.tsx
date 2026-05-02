import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, orderBy, query, where, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../../lib/firebase';
import AdminLayout from '../../components/layout/AdminLayout';
import { Product } from '../../types';
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
  Home, 
  Layout, 
  AlertTriangle, 
  Loader2,
  ArrowUpRight,
  ShoppingBag,
  Wrench,
  CheckCircle2,
  Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, generateSlug } from '../../lib/utils';
import ProductForm from './ProductForm';
import ProductCSVImport from '../../components/admin/ProductCSVImport';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [flushing, setFlushing] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    if (!db) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const q = query(collection(db, 'products'), orderBy('productOrder', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'products');
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteError(null);
    
    // 4. Check admin permission
    if (!auth.currentUser) {
      setDeleteError("You are not signed in. Please log in again.");
      return;
    }

    const timeoutDuration = 15000; // 15 seconds
    const deletePromise = deleteDoc(doc(db!, 'products', deleteConfirm.id));
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("TIMEOUT")), timeoutDuration);
    });

    try {
      setIsDeleting(true);
      
      // 2. Add timeout protection
      await Promise.race([deletePromise, timeoutPromise]);

      // 1. After deleteDoc succeeds, verify deletion by calling getDoc
      const verifySnap = await getDoc(doc(db!, 'products', deleteConfirm.id));
      if (verifySnap.exists()) {
        throw new Error("Delete failed. Product still exists in Firestore.");
      }

      setProducts(products.filter(p => p.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      alert("Product deleted permanently.");
    } catch (error: any) {
      console.error("Delete error:", error);
      
      if (error.message === "TIMEOUT") {
        setDeleteError("Delete request timed out. Please check Firestore rules, internet connection, or admin permissions.");
      } else {
        // 3. Show real Firebase error
        let errorMessage = error.message || String(error);
        
        // Try to parse JSON from handleFirestoreError if applicable
        try {
          const parsed = JSON.parse(errorMessage);
          errorMessage = parsed.error || errorMessage;
        } catch (e) {
          // Not JSON, use as is
        }
        
        setDeleteError(`Delete failed: ${errorMessage}`);
      }
      
      // Also log to console via the shared handler
      try {
        handleFirestoreError(error, OperationType.DELETE, `products/${deleteConfirm.id}`);
      } catch (e) {
        // Already handled locally
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleField = async (product: Product, field: keyof Product) => {
    try {
      const newVal = !product[field];
      await updateDoc(doc(db!, 'products', product.id), { [field]: newVal });
      setProducts(products.map(p => p.id === product.id ? { ...p, [field]: newVal } : p));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${product.id}`);
    }
  };

  const repairProducts = async () => {
    if (!window.confirm("Are you sure you want to repair all product fields? This will fix missing slugs, ensure correct visibility, repair numeric orders, and normalize all metadata fields.")) return;
    
    try {
      setRepairing(true);
      const snapshot = await getDocs(collection(db!, 'products'));
      const batch: Promise<void>[] = [];
      const usedSlugs = new Set<string>();
      
      // Sort snapshots to maintain some order if possible, though doc IDs are semi-random
      // We'll just process them and manage slugs
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const updates: any = {};
        
        // 1. Repair Slug (Rule: Generate from name, ensure unique)
        let baseSlug = generateSlug(data.name || 'product');
        let finalSlug = baseSlug;
        let counter = 2;
        
        while (usedSlugs.has(finalSlug)) {
           finalSlug = `${baseSlug}-${counter}`;
           counter++;
        }
        usedSlugs.add(finalSlug);
        
        // Force update slug if it's missing or doesn't match our new clean generation rules
        if (finalSlug !== data.slug) {
           updates.slug = finalSlug;
        }

        // 2. Ensure booleans (Real booleans, not strings)
        // If visible is missing (undefined), default to true as requested
        if (typeof data.visible !== 'boolean') updates.visible = data.visible === 'true' || data.visible === true || data.visible === undefined;
        if (typeof data.showInCatalogue !== 'boolean') updates.showInCatalogue = data.showInCatalogue === 'true' || data.showInCatalogue === true || data.showInCatalogue === undefined;
        if (typeof data.showOnHomepage !== 'boolean') updates.showOnHomepage = data.showOnHomepage === 'true' || data.showOnHomepage === true;
        if (typeof data.featured !== 'boolean') updates.featured = data.featured === 'true' || data.featured === true;
        
        // 3. Ensure number (Real numbers)
        if (typeof data.productOrder !== 'number') updates.productOrder = parseInt(String(data.productOrder)) || 999;
        
        // 4. Defaults & Metadata
        if (!data.category) updates.category = "General Wellness";
        if (!data.availability) updates.availability = "In Stock";
        if (!data.price) updates.price = "Confirm on WhatsApp";
        if (!data.whatsappCtaText) updates.whatsappCtaText = "Confirm Latest Price on WhatsApp";
        if (!data.shortDescription) updates.shortDescription = "Carefully selected wellness product for daily support and better living.";
        if (!data.fullDescription) updates.fullDescription = data.shortDescription || updates.shortDescription;
        if (!data.imageUrl) updates.imageUrl = 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&q=80&w=800';

        if (Object.keys(updates).length > 0) {
          batch.push(updateDoc(doc(db!, 'products', docSnap.id), { ...updates, updatedAt: serverTimestamp() }));
        }
      });
      
      if (batch.length > 0) {
        await Promise.all(batch);
        alert(`Successfully repaired ${batch.length} products with proper slugs and fields.`);
        fetchProducts();
      } else {
        alert("All products are already in perfect shape.");
      }
    } catch (error) {
      console.error("Repair failed:", error);
      alert("Repair failed. Please check the console for details.");
    } finally {
      setRepairing(false);
    }
  };

  const flushProducts = async () => {
    const confirmation = window.prompt("Type 'FLUSH' to permanently delete ALL products. This is irreversible and will break site content relying on specific products.");
    if (confirmation !== 'FLUSH') return;

    try {
      setFlushing(true);
      const snap = await getDocs(collection(db!, 'products'));
      
      const batchSize = 500;
      let count = 0;

      for (let i = 0; i < snap.docs.length; i += batchSize) {
        const batch = writeBatch(db!);
        const chunk = snap.docs.slice(i, i + batchSize);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
        count += chunk.length;
      }

      alert(`Successfully flushed ${count} products.`);
      fetchProducts();
    } catch (error) {
      console.error("Flush products failed:", error);
      alert("Flush failed. Check console.");
    } finally {
      setFlushing(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-serif">Products</h1>
            <p className="text-brand-grey">Manage your wellness product inventory.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={repairProducts}
              disabled={repairing}
              className="btn-secondary flex items-center gap-2 px-4 border-emerald-100 hover:bg-emerald-50"
              title="Regenerate slugs, fix visibility, and normalize product fields"
            >
              {repairing ? <Loader2 className="animate-spin" size={18} /> : <Wrench size={18} />}
              <span className="hidden sm:inline">Repair Product Fields</span>
            </button>
            <button 
              onClick={() => setIsImportOpen(true)}
              className="btn-secondary flex items-center gap-2 px-6"
            >
              <Upload size={20} />
              Import CSV
            </button>
            <button 
              onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}
              className="btn-primary flex items-center gap-2 px-6"
            >
              <Plus size={20} />
              Add Product
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
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-3 bg-brand-ivory/50 border border-brand-champagne/30 rounded-xl text-sm focus:outline-none focus:border-brand-gold outline-none"
                />
             </div>
          </div>
          <div className="flex gap-4 text-[10px] font-bold text-brand-grey uppercase tracking-widest bg-white p-4 rounded-2xl shadow-sm border border-brand-champagne/10">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Total: {products.length}</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-brand-gold" /> Featured: {products.filter(p => p.featured).length}</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gray-400" /> Hidden: {products.filter(p => !p.visible).length}</div>
          </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {loading ? (
             [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="card h-96 animate-pulse bg-white" />)
           ) : filteredProducts.length > 0 ? (
             filteredProducts.map(product => (
               <div key={product.id} className="card bg-white hover:border-brand-gold transition-all group overflow-hidden flex flex-col">
                  <div className="h-48 bg-brand-mist flex items-center justify-center relative overflow-hidden shrink-0">
                     {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                     ) : (
                        <ImageIcon size={48} className="text-brand-gold opacity-20" />
                     )}
                     <div className="absolute top-3 right-3 flex flex-col gap-2">
                        <StatusBadge type="visibility" active={product.visible} />
                        <StatusBadge type="stock" value={product.availability} />
                     </div>
                     <div className="absolute bottom-3 left-3 flex gap-1.5">
                        {product.featured && <div className="px-2 py-0.5 bg-brand-gold text-white rounded text-[8px] font-bold uppercase tracking-widest shadow-lg">Featured</div>}
                        {product.showOnHomepage && <div className="px-2 py-0.5 bg-brand-emerald text-white rounded text-[8px] font-bold uppercase tracking-widest shadow-lg">Home</div>}
                        {product.showInCatalogue && <div className="px-2 py-0.5 bg-brand-charcoal text-white rounded text-[8px] font-bold uppercase tracking-widest shadow-lg">Catalogue</div>}
                     </div>
                  </div>
                  <div className="p-6 space-y-6 flex-grow flex flex-col">
                     <div className="space-y-1 flex-grow">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-brand-gold uppercase tracking-widest">{product.category}</span>
                          <span className="text-[10px] font-bold text-brand-grey">Order: {product.productOrder}</span>
                        </div>
                        <h3 className="font-serif text-xl text-brand-emerald group-hover:text-brand-gold transition-colors">{product.name}</h3>
                        <p className="text-xs text-brand-grey line-clamp-2 leading-relaxed">{product.shortDescription}</p>
                        
                        <div className="pt-2">
                           <p className="text-sm font-bold text-brand-charcoal">Price: {product.price}</p>
                        </div>
                     </div>

                     {/* Quick Toggles */}
                     <div className="grid grid-cols-2 gap-2 p-3 bg-brand-mist/20 rounded-xl">
                        <QuickToggle 
                          active={product.visible} 
                          onClick={() => toggleField(product, 'visible')} 
                          icon={Eye} 
                          label="Visible" 
                        />
                        <QuickToggle 
                          active={product.featured} 
                          onClick={() => toggleField(product, 'featured')} 
                          icon={Star} 
                          label="Featured" 
                        />
                        <QuickToggle 
                          active={product.showOnHomepage} 
                          onClick={() => toggleField(product, 'showOnHomepage')} 
                          icon={Home} 
                          label="Homepage" 
                        />
                        <QuickToggle 
                          active={product.showInCatalogue} 
                          onClick={() => toggleField(product, 'showInCatalogue')} 
                          icon={Layout} 
                          label="Catalogue" 
                        />
                     </div>

                     <div className="pt-2 flex items-center justify-between gap-4 border-t border-brand-champagne/10">
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => { setEditingProduct(product); setIsFormOpen(true); }}
                             className="p-2.5 text-brand-emerald hover:bg-brand-emerald/10 rounded-xl transition-all border border-brand-emerald/10 hover:border-brand-emerald/30 group/edit"
                             title="Edit product"
                           >
                              <Edit2 size={18} className="group-hover/edit:scale-110 transition-transform" />
                           </button>
                           <Link 
                             to={`/products/${product.slug}`}
                             target="_blank"
                             className="p-2.5 text-brand-gold hover:bg-brand-gold/10 rounded-xl transition-all border border-brand-gold/10 hover:border-brand-gold/30 group/view"
                             title="View live product"
                           >
                              <ArrowUpRight size={18} className="group-hover/view:scale-110 group-hover/view:translate-x-0.5 group-hover/view:-translate-y-0.5 transition-transform" />
                           </Link>
                        </div>
                        <button 
                           onClick={() => setDeleteConfirm(product)}
                           className="p-2.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-red-100 hover:border-red-200 group/del"
                           title="Delete product"
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
                   <ShoppingBag size={32} />
                </div>
                <h3 className="text-xl font-serif text-brand-charcoal mb-1">No Products Found</h3>
                <p className="text-brand-grey text-sm mb-6">We couldn't find any products in your database.</p>
                {searchTerm && (
                   <button onClick={() => setSearchTerm('')} className="text-brand-gold font-bold text-sm hover:underline">Clear search filters</button>
                )}
             </div>
           )}
        </div>
      </div>

      <AnimatePresence>
        {isFormOpen && (
           <ProductForm 
             product={editingProduct} 
             onClose={() => setIsFormOpen(false)} 
             onSuccess={() => { setIsFormOpen(false); fetchProducts(); }} 
           />
        )}
        {isImportOpen && (
           <ProductCSVImport 
             onClose={() => setIsImportOpen(false)} 
             onSuccess={() => { setIsImportOpen(false); fetchProducts(); }} 
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
                    <h3 className="text-2xl font-serif text-brand-emerald">Delete Product Permanently?</h3>
                    <p className="text-brand-grey leading-relaxed text-sm">
                      Are you sure you want to permanently delete <span className="font-bold text-brand-charcoal text-base">"{deleteConfirm.name}"</span>? This action cannot be undone. Leads connected to this product will remain safe.
                    </p>
                    
                    {/* Admin Status Visibility */}
                    <div className="mt-4 p-3 bg-brand-mist/20 rounded-xl space-y-1 text-[10px] font-mono text-brand-grey">
                       <p>User: <span className="text-brand-charcoal">{auth.currentUser?.email || 'Unknown'}</span></p>
                       <p>UID: <span className="text-brand-charcoal">{auth.currentUser?.uid || 'Not Set'}</span></p>
                       <p>Status: <span className={cn(auth.currentUser ? "text-emerald-600" : "text-red-500")}>
                         {auth.currentUser ? 'Authenticated' : 'Not Authenticated'}
                       </span></p>
                    </div>
                  </div>

                  {deleteError && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex gap-3 items-center">
                       <ShieldAlert size={16} className="shrink-0" />
                       <p>{deleteError}</p>
                    </div>
                  )}

                  <div className="flex gap-4 pt-2">
                    <button 
                      onClick={() => { setDeleteConfirm(null); setDeleteError(null); }}
                      disabled={isDeleting}
                      className="flex-grow btn-secondary"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-grow py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                      {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                  </div>
                  <button 
                    onClick={async () => {
                      await toggleField(deleteConfirm, 'visible');
                      setDeleteConfirm(null);
                      setDeleteError(null);
                    }}
                    disabled={isDeleting}
                    className="w-full py-3 text-brand-grey text-xs font-bold uppercase tracking-widest hover:text-brand-charcoal transition-colors bg-brand-mist/20 rounded-xl"
                  >
                    Hide from website instead
                  </button>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Danger Zone */}
      <div className="pt-20 border-t border-brand-champagne/20 mb-20">
         <div className="bg-red-50/50 border border-red-100 rounded-[2.5rem] p-10 overflow-hidden relative group">
            <div className="absolute right-0 top-0 p-12 text-red-500 opacity-5 group-hover:opacity-10 transition-opacity">
               <AlertTriangle size={200} />
            </div>
            <div className="relative z-10 space-y-6">
               <div>
                  <h2 className="text-2xl font-serif text-red-800 flex items-center gap-3">
                     <Shield className="text-red-600" size={28} /> Danger Zone
                  </h2>
                  <p className="text-red-600/70 max-w-lg mt-2 font-medium">Permanently delete all product documents. This action is irreversible.</p>
               </div>
               <button 
                 onClick={flushProducts}
                 disabled={flushing}
                 className="btn-primary bg-red-600 hover:bg-red-700 text-white px-10 py-4 flex items-center gap-3 shadow-xl shadow-red-600/20 disabled:opacity-50"
               >
                  {flushing ? <Loader2 size={24} className="animate-spin" /> : <Trash2 size={24} />}
                  <span className="text-lg">{flushing ? 'Flushing Database...' : 'Flush All Products'}</span>
               </button>
            </div>
         </div>
      </div>
    </AdminLayout>
  );
}

function StatusBadge({ type, active, value }: { type: 'visibility' | 'stock', active?: boolean, value?: string }) {
  if (type === 'visibility') {
    return (
      <div className={cn(
        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm backdrop-blur flex items-center gap-1.5",
        active ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
      )}>
        {active ? <Eye size={12} /> : <EyeOff size={12} />}
        {active ? 'Visible' : 'Hidden'}
      </div>
    );
  }
  
  const colors: Record<string, string> = {
    'In Stock': 'bg-white/90 text-emerald-600',
    'Backorder': 'bg-white/90 text-brand-gold',
    'Out of Stock': 'bg-white/90 text-red-500',
  };

  return (
    <div className={cn(
      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm backdrop-blur",
      colors[value || ''] || 'bg-white/90 text-brand-grey'
    )}>
      {value}
    </div>
  );
}

function QuickToggle({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all",
        active ? "bg-white text-brand-emerald shadow-sm" : "bg-transparent text-brand-grey hover:bg-white/50"
      )}
    >
      <Icon size={12} className={cn(active ? "text-brand-gold" : "text-brand-grey")} />
      {label}
    </button>
  );
}
