import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, orderBy, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import AdminLayout from '../../components/layout/AdminLayout';
import { Product } from '../../types';
import { Plus, Search, Edit2, Trash2, Eye, EyeOff, Star, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import ProductForm from './ProductForm';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const toggleVisibility = async (product: Product) => {
    try {
      const newVal = !product.visible;
      await updateDoc(doc(db, 'products', product.id), { visible: newVal });
      setProducts(products.map(p => p.id === product.id ? { ...p, visible: newVal } : p));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${product.id}`);
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
          <button 
            onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Add Product
          </button>
        </div>

        {/* Search */}
        <div className="card p-4 bg-white shadow-sm max-w-md">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-grey" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-3 bg-brand-ivory border border-brand-champagne/30 rounded-xl text-sm"
              />
           </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {loading ? (
             [1, 2, 3].map(i => <div key={i} className="card h-64 animate-pulse bg-white" />)
           ) : filteredProducts.length > 0 ? (
             filteredProducts.map(product => (
               <div key={product.id} className="card bg-white hover:border-brand-gold transition-all group">
                  <div className="h-40 bg-brand-mist flex items-center justify-center relative overflow-hidden">
                     {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                     ) : (
                        <ImageIcon size={48} className="text-brand-gold opacity-20" />
                     )}
                     <div className="absolute top-3 right-3 flex gap-2">
                        {product.featured && <div className="p-1.5 bg-brand-gold text-white rounded-lg" title="Featured"><Star size={14} fill="currentColor" /></div>}
                        {!product.visible && <div className="p-1.5 bg-red-500 text-white rounded-lg" title="Hidden"><EyeOff size={14} /></div>}
                     </div>
                  </div>
                  <div className="p-6 space-y-4">
                     <div className="space-y-1">
                        <span className="text-[10px] font-bold text-brand-gold uppercase tracking-widest">{product.category}</span>
                        <h3 className="font-serif text-xl text-brand-emerald truncate">{product.name}</h3>
                        <p className="text-xs text-brand-grey line-clamp-1">{product.shortDescription}</p>
                     </div>
                     <div className="pt-2 flex items-center justify-between gap-4 border-t border-brand-champagne/10">
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => toggleVisibility(product)}
                             className={cn("p-2 rounded-lg transition-colors", product.visible ? "text-emerald-500 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-50")}
                             title={product.visible ? "Hide from public" : "Show to public"}
                           >
                              {product.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                           </button>
                           <button 
                             onClick={() => { setEditingProduct(product); setIsFormOpen(true); }}
                             className="p-2 text-brand-emerald hover:bg-brand-mist rounded-lg transition-colors"
                             title="Edit product"
                           >
                              <Edit2 size={18} />
                           </button>
                        </div>
                        <button 
                           onClick={() => handleDelete(product.id)}
                           className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                           title="Delete product"
                        >
                           <Trash2 size={18} />
                        </button>
                     </div>
                  </div>
               </div>
             ))
           ) : (
             <div className="col-span-full py-24 text-center text-brand-grey italic">No products found.</div>
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
      </AnimatePresence>
    </AdminLayout>
  );
}

