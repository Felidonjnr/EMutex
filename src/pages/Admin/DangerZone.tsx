import { useState } from 'react';
import { collection, getDocs, writeBatch, query, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import AdminLayout from '../../components/layout/AdminLayout';
import { Trash2, AlertTriangle, Download, Loader2, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { cn } from '../../lib/utils';

type FlushTarget = 'products' | 'bundles';

export default function DangerZone() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [target, setTarget] = useState<FlushTarget | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openModal = (t: FlushTarget) => {
    setTarget(t);
    setConfirmText('');
    setError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isProcessing) return;
    setIsModalOpen(false);
    setTarget(null);
    setConfirmText('');
  };

  const deleteCollectionInBatches = async (collectionName: string) => {
    const ref = collection(db!, collectionName);
    const snapshot = await getDocs(ref);

    if (snapshot.empty) {
      setProcessingStatus(`No ${collectionName} found to delete.`);
      return 0;
    }

    const docs = snapshot.docs;
    const batchSize = 500;
    let deletedCount = 0;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(db!);
      const chunk = docs.slice(i, i + batchSize);

      chunk.forEach((doc) => {
        batch.delete(doc.ref);
      });

      setProcessingStatus(`Deleting ${collectionName}: ${deletedCount + chunk.length} / ${docs.length}...`);
      await batch.commit();
      deletedCount += chunk.length;
    }

    return deletedCount;
  };

  const handleFlush = async () => {
    const expectedText = target === 'products' ? 'DELETE PRODUCTS' : 'DELETE BUNDLES';
    if (confirmText !== expectedText) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProcessingStatus('Initializing flush operation...');

      const count = await deleteCollectionInBatches(target!);
      
      setSuccessMessage(`Successfully flushed all ${target}. Total deleted: ${count}`);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Flush error:', err);
      setError(`Flush failed: ${err.message || String(err)}`);
      handleFirestoreError(err, OperationType.DELETE, target!);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const exportBackup = async (type: FlushTarget) => {
    try {
      setProcessingStatus(`Exporting ${type} backup...`);
      const snapshot = await getDocs(collection(db!, type));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (data.length === 0) {
        alert(`No ${type} to export.`);
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, type === 'products' ? 'Products' : 'Bundles');
      
      const fileName = `EMutex_${type}_backup_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      setSuccessMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} backup exported successfully.`);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Export failed. Check console for details.');
    } finally {
      setProcessingStatus('');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif text-red-600 flex items-center gap-3">
            <ShieldAlert size={32} />
            Danger Zone
          </h1>
          <p className="text-brand-grey font-medium">Critical system operations. Use with absolute caution.</p>
        </div>

        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3"
          >
            <CheckCircle2 size={20} />
            <span className="font-bold">{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-500 hover:text-emerald-700">
              <X size={18} />
            </button>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-100 border border-red-200 text-red-800 rounded-xl flex items-center gap-3"
          >
            <AlertTriangle size={20} />
            <span className="font-bold">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <X size={18} />
            </button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Flush Products */}
          <div className="card p-8 border-red-100 hover:shadow-xl transition-shadow space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
               <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                  <Trash2 size={32} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-xl font-bold text-brand-charcoal">Flush All Products</h3>
                  <p className="text-sm text-brand-grey leading-relaxed">
                    Permanently delete every product from the database. This action is irreversible. 
                    Recommended to export a backup before proceeding.
                  </p>
               </div>
            </div>

            <div className="space-y-3">
               <button 
                onClick={() => exportBackup('products')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-brand-champagne/30 text-brand-emerald font-bold hover:bg-brand-mist/20 transition-all"
               >
                 <Download size={18} />
                 Export Products Backup
               </button>
               <button 
                onClick={() => openModal('products')}
                className="w-full py-4 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
               >
                 <Trash2 size={18} />
                 Flush All Products
               </button>
            </div>
          </div>

          {/* Flush Bundles */}
          <div className="card p-8 border-red-100 hover:shadow-xl transition-shadow space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
               <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                  <Trash2 size={32} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-xl font-bold text-brand-charcoal">Flush All Bundles</h3>
                  <p className="text-sm text-brand-grey leading-relaxed">
                    Permanently delete every bundle from the database. This action is irreversible.
                    Leads and individual products will not be affected.
                  </p>
               </div>
            </div>

            <div className="space-y-3">
               <button 
                onClick={() => exportBackup('bundles')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-brand-champagne/30 text-brand-emerald font-bold hover:bg-brand-mist/20 transition-all"
               >
                 <Download size={18} />
                 Export Bundles Backup
               </button>
               <button 
                onClick={() => openModal('bundles')}
                className="w-full py-4 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
               >
                 <Trash2 size={18} />
                 Flush All Bundles
               </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 flex gap-4">
           <AlertTriangle className="text-amber-600 shrink-0" size={24} />
           <div className="space-y-1">
              <p className="text-sm font-bold text-amber-900 uppercase tracking-widest">Internal Safety Warning</p>
              <p className="text-sm text-amber-800">
                Flushing collections will immediately break all public links to those items. 
                This operation is intended for full database resets or clearing corrupted/test data before a production launch.
              </p>
           </div>
        </div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={closeModal}
                 className="absolute inset-0 bg-black/60 backdrop-blur-sm"
               />
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 20 }}
                 className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-6"
               >
                  <div className="text-center space-y-2">
                     <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert size={32} />
                     </div>
                     <h2 className="text-2xl font-serif text-brand-charcoal">
                        Permanently Delete All {target === 'products' ? 'Products' : 'Bundles'}?
                     </h2>
                     <p className="text-brand-grey text-sm">
                        This will permanently delete every {target} from the collection. 
                        Leads and other settings will not be affected.
                     </p>
                  </div>

                  <div className="space-y-4">
                     <div className="p-4 bg-red-50 rounded-xl space-y-2">
                        <p className="text-xs font-bold text-red-800 uppercase text-center">Type the following to confirm:</p>
                        <p className="text-lg font-black text-red-600 text-center select-none font-mono">
                           {target === 'products' ? 'DELETE PRODUCTS' : 'DELETE BUNDLES'}
                        </p>
                     </div>
                     
                     <input 
                        type="text" 
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Type confirmation here..."
                        className="w-full px-4 py-4 bg-brand-ivory border-2 border-brand-champagne/30 rounded-2xl text-center font-bold text-brand-charcoal focus:border-red-500 transition-all outline-none"
                        autoFocus
                     />
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                     <button 
                        onClick={handleFlush}
                        disabled={confirmText !== (target === 'products' ? 'DELETE PRODUCTS' : 'DELETE BUNDLES') || isProcessing}
                        className={cn(
                           "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all",
                           confirmText === (target === 'products' ? 'DELETE PRODUCTS' : 'DELETE BUNDLES')
                             ? "bg-red-600 text-white hover:bg-red-700 shadow-red-600/20" 
                             : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        )}
                     >
                        {isProcessing ? (
                           <>
                              <Loader2 size={18} className="animate-spin" />
                              Deleting...
                           </>
                        ) : (
                           `Yes, Permanently Delete All ${target === 'products' ? 'Products' : 'Bundles'}`
                        )}
                     </button>
                     <button 
                        onClick={closeModal}
                        disabled={isProcessing}
                        className="w-full py-3 text-brand-grey font-bold hover:underline"
                     >
                        Cancel
                     </button>
                  </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Global Loading Overlay */}
        <AnimatePresence>
          {isProcessing && !isModalOpen && (
             <div className="fixed inset-0 z-[110] flex items-center justify-center bg-white/80 backdrop-blur-md">
                <div className="text-center space-y-6">
                   <div className="relative">
                      <Loader2 size={60} className="text-red-600 animate-spin mx-auto" />
                      <Trash2 size={24} className="text-red-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-2xl font-serif text-brand-emerald">Flush Operation in Progress</h3>
                      <p className="text-brand-grey font-bold animate-pulse">{processingStatus}</p>
                   </div>
                </div>
             </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
