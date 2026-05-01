import { useState, useRef } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Upload, Download, FileText, CheckCircle, AlertCircle, X, Loader2, Table, Globe, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface BundleImportPreview {
  name: string;
  slug: string;
  shortDescription: string;
  price: string;
  availability: string;
  includedProductSlugs: string[];
  includedItems: string[];
  status: 'pending' | 'error' | 'success';
  message?: string;
  existingId?: string;
}

interface BundleCSVImportProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function BundleCSVImport({ onClose, onSuccess }: BundleCSVImportProps) {
  const [preview, setPreview] = useState<BundleImportPreview[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ success: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = ['name', 'slug', 'shortDescription', 'fullDescription', 'imageUrl', 'price', 'availability', 'includedProductSlugs', 'includedItems', 'featured', 'visible', 'order', 'whatsappMessage'];
    const example = ['Sample Wellness Bundle', 'sample-bundle', 'Short blurb here', 'Full description here', 'https://example.com/img.jpg', '45000', 'In Stock', 'vitality-product,cleanse-product', 'Free shaker bottle,Health guide', 'true', 'true', '0', 'I want the sample bundle'];
    
    const csvContent = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'emutex_bundles_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      const parsedPreview: BundleImportPreview[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Simple CSV parser that handles basic commas (not robust for escaped commas)
        const currentLine = lines[i].split(',').map(v => v.trim());
        if (currentLine.length < 2) continue;

        const bundle: any = {};
        headers.forEach((header, index) => {
          bundle[header] = currentLine[index];
        });

        // Special handling for array fields
        const includedProductSlugs = bundle.includedproductslugs ? bundle.includedproductslugs.split('|').filter(Boolean) : [];
        const includedItems = bundle.includeditems ? bundle.includeditems.split('|').filter(Boolean) : [];

        parsedPreview.push({
          name: bundle.name || '',
          slug: bundle.slug || '',
          shortDescription: bundle.shortdescription || '',
          price: bundle.price || '',
          availability: bundle.availability || 'In Stock',
          includedProductSlugs,
          includedItems,
          status: 'pending'
        });
      }

      // Check for existing slugs
      const checkedPreview = [...parsedPreview];
      for (const item of checkedPreview) {
        if (item.slug) {
          const q = query(collection(db!, 'bundles'), where('slug', '==', item.slug));
          const snap = await getDocs(q);
          if (!snap.empty) {
            item.existingId = snap.docs[0].id;
            item.message = "Exists (will update)";
          }
        }
      }

      setPreview(checkedPreview);
    };
    reader.readAsText(file);
  };

  const startImport = async () => {
    if (!db || preview.length === 0) return;
    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    const productsRef = collection(db, 'products');

    for (let i = 0; i < preview.length; i++) {
      const item = preview[i];
      try {
        // Resolve Slugs to IDs
        const includedProductIds: string[] = [];
        for (const slug of item.includedProductSlugs) {
           const pQ = query(productsRef, where('slug', '==', slug));
           const pSnap = await getDocs(pQ);
           if (!pSnap.empty) {
              includedProductIds.push(pSnap.docs[0].id);
           }
        }

        const data = {
          ...item,
          includedProductIds,
          updatedAt: serverTimestamp(),
        };
        delete (data as any).status;
        delete (data as any).message;
        delete (data as any).existingId;

        if (item.existingId) {
          await updateDoc(doc(db, 'bundles', item.existingId), data);
        } else {
          await addDoc(collection(db, 'bundles'), {
            ...data,
            createdAt: serverTimestamp(),
          });
        }
        
        preview[i].status = 'success';
        successCount++;
      } catch (err) {
        console.error("Import error for:", item.name, err);
        preview[i].status = 'error';
        preview[i].message = String(err);
        errorCount++;
      }
      setPreview([...preview]);
    }

    setImportSummary({ success: successCount, errors: errorCount });
    setIsImporting(false);
    if (successCount > 0) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-brand-ivory w-full max-w-4xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="px-8 py-6 bg-white border-b border-brand-champagne/20 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-gold/10 text-brand-gold rounded-xl flex items-center justify-center">
              <Table size={24} />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-brand-emerald">Import Bundles from CSV</h2>
              <p className="text-[10px] text-brand-grey uppercase tracking-widest font-bold">Bulk management tool</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-mist rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-grow overflow-y-auto p-8 space-y-8">
          {(!preview.length && !importSummary) && (
            <div className="space-y-8 py-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="card p-8 bg-white border-brand-champagne/10 space-y-4 hover:border-brand-gold transition-all">
                    <div className="w-12 h-12 bg-brand-gold/10 text-brand-gold rounded-full flex items-center justify-center">
                       <Download size={24} />
                    </div>
                    <div>
                       <h3 className="font-bold text-brand-emerald">1. Get the Template</h3>
                       <p className="text-sm text-brand-grey">Download our Excel/CSV template to ensure headers are correct.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={downloadTemplate} className="btn-secondary w-full flex items-center justify-center gap-2">
                        <FileText size={18} /> Download CSV Template
                      </button>
                      <button 
                        onClick={() => window.open('https://docs.google.com/spreadsheets/d/1_S0uByPzS9wM9ZlTjHBeG-sWbXwW-84rN8_Z6G2z7J4/copy', '_blank')} 
                        className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-bold flex items-center justify-center gap-2 text-[10px] border border-blue-100 hover:bg-blue-100 transition-all font-sans"
                      >
                        <Globe size={16} /> Google Sheets Template <ArrowUpRight size={14} />
                      </button>
                    </div>
                 </div>
                 <div className="card p-8 bg-white border-brand-champagne/10 space-y-4 hover:border-brand-gold transition-all">
                    <div className="w-12 h-12 bg-brand-emerald/10 text-brand-emerald rounded-full flex items-center justify-center">
                       <Upload size={24} />
                    </div>
                    <div>
                       <h3 className="font-bold text-brand-emerald">2. Upload your Data</h3>
                       <p className="text-sm text-brand-grey">Select your filled CSV file to preview before importing.</p>
                    </div>
                    <input 
                      type="file" 
                      accept=".csv" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="btn-primary w-full flex items-center justify-center gap-2">
                       <Upload size={18} /> Choose CSV File
                    </button>
                 </div>
              </div>

              <div className="p-6 bg-brand-mist/20 rounded-2xl border border-brand-champagne/10">
                 <h4 className="flex items-center gap-2 text-xs font-bold text-brand-gold uppercase tracking-widest mb-3">
                    <AlertCircle size={14} /> Notes for Data Entry:
                 </h4>
                 <ul className="text-xs text-brand-grey space-y-2 list-disc ml-4">
                    <li>Use <strong>slugs</strong> for linked products (e.g., <code>vitality-plus|wellness-tea</code>). Separated by <code>|</code> pipe.</li>
                    <li>Manual items should also be separated by a <code>|</code> pipe character.</li>
                    <li>Price should be numbers only for calculations, or strings if you want text.</li>
                    <li>If a slug already exists, the bundle's data will be <strong>updated</strong>.</li>
                 </ul>
              </div>
            </div>
          )}

          {preview.length > 0 && !importSummary && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <h3 className="text-lg font-serif">Preview Data ({preview.length} rows)</h3>
                 <div className="flex gap-2">
                    <button onClick={() => setPreview([])} className="text-xs font-bold text-red-500 hover:underline">Clear</button>
                 </div>
              </div>
              <div className="border border-brand-champagne/20 rounded-2xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-brand-mist/30 text-brand-emerald uppercase text-[10px] font-bold tracking-widest">
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Bundle Name</th>
                      <th className="px-4 py-3">Slug</th>
                      <th className="px-4 py-3">Linked Prods</th>
                      <th className="px-4 py-3">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-champagne/10">
                    {preview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-brand-mist/5 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.status === 'success' ? <CheckCircle className="text-emerald-500" size={18}/> : 
                           item.status === 'error' ? <AlertCircle className="text-red-500" size={18}/> :
                           <div className="flex items-center gap-1.5 text-[10px] text-brand-gold font-bold">
                              {item.existingId ? <RefreshCcw size={12} /> : <Plus size={12} />}
                              {item.message || 'Ready'}
                           </div>
                          }
                        </td>
                        <td className="px-4 py-3 font-medium text-brand-emerald">{item.name}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-brand-grey">{item.slug}</td>
                        <td className="px-4 py-3">
                           <span className="px-1.5 py-0.5 bg-brand-gold/10 text-brand-gold rounded text-[10px] font-bold">
                             {item.includedProductSlugs.length} Prods
                           </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold">{item.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importSummary && (
            <div className="py-20 text-center space-y-6 max-w-md mx-auto">
               <div className="w-20 h-20 mx-auto bg-brand-emerald text-white rounded-full flex items-center justify-center animate-bounce">
                  <CheckCircle size={40} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-3xl font-serif">Import Complete!</h3>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                     <div className="p-4 bg-emerald-100 rounded-2xl">
                        <p className="text-3xl font-bold text-emerald-600">{importSummary.success}</p>
                        <p className="text-[10px] font-bold uppercase text-emerald-800">Succeeded</p>
                     </div>
                     <div className="p-4 bg-red-100 rounded-2xl">
                        <p className="text-3xl font-bold text-red-600">{importSummary.errors}</p>
                        <p className="text-[10px] font-bold uppercase text-red-800">Errors</p>
                     </div>
                  </div>
               </div>
               <button onClick={onClose} className="btn-primary w-full py-4 text-lg">Finish & Return</button>
            </div>
          )}
        </div>

        {preview.length > 0 && !importSummary && (
           <div className="px-8 py-6 bg-white border-t border-brand-champagne/20 flex justify-end gap-4 shadow-xl">
             <button onClick={() => setPreview([])} disabled={isImporting} className="btn-secondary px-6">Cancel</button>
             <button 
                onClick={startImport} 
                disabled={isImporting} 
                className="btn-primary px-12 flex items-center gap-2"
             >
                {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Table size={18} />}
                {isImporting ? `Importing...` : 'Execute Import'}
             </button>
           </div>
        )}
      </motion.div>
    </div>
  );
}

import { RefreshCcw, Plus } from 'lucide-react';
