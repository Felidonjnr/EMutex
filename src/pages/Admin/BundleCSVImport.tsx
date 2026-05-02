import { useState, useRef } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Upload, Download, FileText, CheckCircle, AlertCircle, X, Loader2, Table, Globe, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, generateSlug } from '../../lib/utils';

interface BundleImportPreview {
  name: string;
  slug: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl: string;
  price: string;
  availability: string;
  includedProductSlugs: string[];
  includedItems: string[];
  featured: boolean;
  visible: boolean;
  order: number;
  whatsappCtaText: string;
  whatsappMessage: string;
  status: 'pending' | 'error' | 'success';
  message?: string;
  errors?: string[];
  warnings?: string[];
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

  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800';

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
      const usedSlugsInBatch = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].split(',').map(v => v.trim());
        if (currentLine.length < 1) continue;

        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = currentLine[index];
        });

        const errors: string[] = [];
        const warnings: string[] = [];

        // 1. Required: Name
        const name = String(row.name || '').trim();
        if (!name) errors.push('Name is required');

        // 2. Required: items or slugs
        const includedProductSlugs = row.includedproductslugs ? row.includedproductslugs.split('|').map((s: string) => s.trim()).filter(Boolean) : [];
        const includedItems = row.includeditems ? row.includeditems.split('|').map((s: string) => s.trim()).filter(Boolean) : [];
        
        if (includedProductSlugs.length === 0 && includedItems.length === 0) {
          errors.push('Bundle must have either linked products (slugs) or manual items');
        }

        // 3. Slug generation (Rule: Ignore CSV slug, generate fresh from name)
        let slug = '';
        if (name) {
          const baseSlug = generateSlug(name);
          slug = baseSlug;
          
          // Ensure uniqueness within the batch
          let counter = 2;
          while (usedSlugsInBatch.has(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
          }
          usedSlugsInBatch.add(slug);
        }

        // 4. Defaults: Category
        let category = String(row.category || '').trim();
        if (!category) {
          category = 'Wellness Bundle';
          if (name) warnings.push('No category provided. Category set to Wellness Bundle.');
        }

        // 5. Defaults: Descriptions
        let shortDescription = String(row.shortdescription || '').trim();
        if (!shortDescription) {
          shortDescription = 'A carefully selected wellness bundle for better living.';
          if (name) warnings.push('No short description provided. Using default.');
        }

        let fullDescription = String(row.fulldescription || '').trim();
        if (!fullDescription) {
          fullDescription = shortDescription;
        }

        // 6. Defaults: Image
        let imageUrl = String(row.imageurl || '').trim();
        if (!imageUrl) {
          imageUrl = FALLBACK_IMAGE;
          if (name) warnings.push('No image provided. Fallback image will be used.');
        }

        // 7. Defaults: Price & Availability
        let price = String(row.price || '').trim();
        if (!price) {
          price = 'Confirm on WhatsApp';
          if (name) warnings.push('No price provided. Price set to Confirm on WhatsApp.');
        }

        let availability = String(row.availability || '').trim();
        if (!availability || !['In Stock', 'Backorder', 'Out of Stock'].includes(availability)) {
          availability = 'In Stock';
        }

        // 8. Toggles
        const featured = row.featured?.toLowerCase() === 'true';
        const visible = row.visible === undefined || row.visible === '' || row.visible?.toLowerCase() === 'true';
        const order = parseInt(row.order) || 999;

        // 9. WhatsApp
        let whatsappCtaText = String(row.whatsappctatext || '').trim();
        if (!whatsappCtaText) {
          whatsappCtaText = 'Confirm Bundle Price on WhatsApp';
        }

        let whatsappMessage = String(row.whatsappmessage || '').trim();
        if (!whatsappMessage && name) {
          whatsappMessage = `Hello EMutex Nig, I am interested in the ${name}. Please send me the current bundle price, products included, delivery options, and how I can order.`;
        }

        parsedPreview.push({
          name,
          slug,
          category,
          shortDescription,
          fullDescription,
          imageUrl,
          price,
          availability,
          includedProductSlugs,
          includedItems,
          featured,
          visible,
          order,
          whatsappCtaText,
          whatsappMessage,
          status: 'pending',
          errors,
          warnings
        });
      }

      // Check for existing slugs
      for (const item of parsedPreview) {
        if (item.slug && (!item.errors || item.errors.length === 0)) {
          const q = query(collection(db!, 'bundles'), where('slug', '==', item.slug));
          const snap = await getDocs(q);
          if (!snap.empty) {
            item.existingId = snap.docs[0].id;
            item.message = "Exists (will update)";
          }
        }
      }

      setPreview(parsedPreview);
    };
    reader.readAsText(file);
  };

  const startImport = async () => {
    if (!db || preview.length === 0) return;
    const validData = preview.filter(p => !p.errors || p.errors.length === 0);
    if (validData.length === 0) return;

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    const productsRef = collection(db, 'products');

    for (let i = 0; i < preview.length; i++) {
      const item = preview[i];
      if (item.errors && item.errors.length > 0) continue;

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
        delete (data as any).errors;
        delete (data as any).warnings;

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
                    <AlertCircle size={14} /> Notes for Bundle Entry:
                 </h4>
                 <ul className="text-xs text-brand-grey space-y-2 list-disc ml-4">
                    <li><strong>Required:</strong> Name AND (Product Slugs OR Manual Items).</li>
                    <li>Use <code>slugs</code> for linked products (e.g., <code>vitality-plus|wellness-tea</code>).</li>
                    <li>Manual items should also be separated by a <code>|</code> pipe character.</li>
                    <li>Images, Descriptions, and Prices are optional (defaults will be used).</li>
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
              <div className="border border-brand-champagne/20 rounded-2xl overflow-hidden bg-white shadow-sm overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-brand-mist/30 text-brand-emerald uppercase text-[9px] font-bold tracking-widest">
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Bundle Name</th>
                      <th className="px-4 py-3">Slug</th>
                      <th className="px-4 py-3">Includes</th>
                      <th className="px-4 py-3">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-champagne/10">
                    {preview.map((item, idx) => (
                      <tr key={idx} className={cn("hover:bg-brand-mist/5 transition-colors", item.errors?.length ? "bg-red-50/50" : "")}>
                        <td className="px-4 py-3">
                          {item.status === 'success' ? (
                            <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle size={14}/> Success</span>
                          ) : item.status === 'error' ? (
                            <div className="space-y-1">
                               <span className="text-red-500 font-bold flex items-center gap-1"><AlertCircle size={14}/> Error</span>
                               <p className="text-[10px] text-red-400">{item.message}</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                               {item.errors?.length ? (
                                  <div className="space-y-1">
                                     <span className="text-red-500 font-bold flex items-center gap-1 text-[10px] uppercase">Blocked</span>
                                     {item.errors.map((err, i) => <p key={i} className="text-[9px] text-red-400 italic">• {err}</p>)}
                                  </div>
                               ) : (
                                  <div className="space-y-1">
                                     <span className="text-emerald-500 font-bold flex items-center gap-1 text-[10px] uppercase">
                                        {item.existingId ? 'Update' : 'New Bundle'}
                                     </span>
                                     {item.warnings?.map((warn, i) => (
                                        <p key={i} className="text-[9px] text-amber-600 italic leading-tight">• {warn}</p>
                                     ))}
                                  </div>
                               )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-brand-emerald">{item.name}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-brand-grey">{item.slug}</td>
                        <td className="px-4 py-3">
                           <div className="flex flex-col gap-1">
                             <span className="px-1.5 py-0.5 bg-brand-mist rounded text-[9px] font-bold text-brand-gold whitespace-nowrap">
                               {item.includedProductSlugs.length} Linked Slugs
                             </span>
                             <span className="px-1.5 py-0.5 bg-brand-champagne/10 rounded text-[9px] font-bold text-brand-grey whitespace-nowrap">
                               {item.includedItems.length} Manual Items
                             </span>
                           </div>
                        </td>
                        <td className="px-4 py-3 text-[10px] font-bold text-brand-charcoal">{item.price}</td>
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
