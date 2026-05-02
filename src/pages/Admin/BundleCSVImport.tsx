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
  galleryImages: string[];
  price: string;
  availability: string;
  includedProductSlugs: string[];
  includedItems: string[];
  benefits: string[];
  bestFor: string;
  usageNote: string;
  disclaimer: string;
  faq: { question: string; answer: string }[];
  featured: boolean;
  showOnHomepage: boolean;
  showInBundlesPage: boolean;
  visible: boolean;
  bundleOrder: number;
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
    const headers = [
      'name', 'slug', 'category', 'shortDescription', 'fullDescription', 'imageUrl', 'galleryImages', 
      'price', 'availability', 'includedProductSlugs', 'includedItems', 'benefits', 'bestFor', 
      'usageNote', 'disclaimer', 'faq', 'featured', 'showOnHomepage', 'showInBundlesPage', 
      'visible', 'bundleOrder', 'whatsappCtaText', 'whatsappMessage'
    ];
    
    const example = [
      'Sample Wellness Bundle', 'ignore-me', 'Wellness Bundle', 'A sample bundle blurb.', 'Full description for the sample bundle.', 
      FALLBACK_IMAGE, '', '45000', 'In Stock', 'vitality-product|cleanse-product', 'Free Shaker|Health Guide', 
      'Better Value|Complete Routine', 'Adults seeking vitality', 'Take daily after meals.', 'Consult doctor if pregnant.', 
      'Is it effective?::Yes very!|How to store?::Cool dry place.', 'true', 'true', 'true', 'true', '1', 
      'Confirm Bundle Price on WhatsApp', ''
    ];
    
    const csvContent = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'emutex_bundles_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseBoolean = (val: any, defaultVal: boolean): boolean => {
    if (val === undefined || val === null || val === '') return defaultVal;
    const s = String(val).toLowerCase();
    return s === 'true' || s === 'yes' || s === '1' || s === 'y';
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
        // Robust CSV splitting to handle quotes if necessary, but keep it simple for now
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
        if (!name) errors.push('Bundle name is required');

        // 2. Required: items or slugs
        const includedProductSlugs = row.includedproductslugs ? row.includedproductslugs.split('|').map((s: string) => s.trim()).filter(Boolean) : [];
        const includedItems = row.includeditems ? row.includeditems.split('|').map((s: string) => s.trim()).filter(Boolean) : [];
        
        if (includedProductSlugs.length === 0 && includedItems.length === 0) {
          errors.push('Bundle must have either linked products (slugs) or manual items');
        }

        // 3. Slug generation (Rule: Strictly ignore CSV slug, generate from name)
        let slug = '';
        if (name) {
          const baseSlug = generateSlug(name);
          slug = baseSlug;
          let counter = 2;
          while (usedSlugsInBatch.has(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
          }
          usedSlugsInBatch.add(slug);
        }

        // 4. Defaults & Normalization
        let category = String(row.category || '').trim() || 'Wellness Bundle';
        if (!row.category && name) warnings.push('Using default category: Wellness Bundle');

        let shortDescription = String(row.shortdescription || '').trim() || 'A carefully selected wellness bundle for better living.';
        if (!row.shortdescription && name) warnings.push('Using default short description');

        let fullDescription = String(row.fulldescription || '').trim() || shortDescription;
        let imageUrl = String(row.imageurl || '').trim() || FALLBACK_IMAGE;
        if (!row.imageurl && name) warnings.push('Using fallback image');

        const galleryImages = row.galleryimages ? row.galleryimages.split('|').map((s: string) => s.trim()).filter(Boolean) : [];
        
        let price = String(row.price || '').trim() || 'Confirm on WhatsApp';
        if (!row.price && name) warnings.push('Using default price: Confirm on WhatsApp');

        let availability = String(row.availability || '').trim() || 'In Stock';
        if (!['In Stock', 'Backorder', 'Out of Stock'].includes(availability)) availability = 'In Stock';

        const benefits = row.benefits ? row.benefits.split('|').map((s: string) => s.trim()).filter(Boolean) : [];
        const bestFor = String(row.bestfor || '').trim();
        const usageNote = String(row.usagenote || '').trim();
        const disclaimer = String(row.disclaimer || '').trim() || 'This product bundle is for wellness support. Please confirm current details on WhatsApp before ordering.';

        // FAQ Parsing Question::Answer|Question::Answer
        const faq: { question: string; answer: string }[] = [];
        if (row.faq) {
          const pairs = row.faq.split('|').filter(Boolean);
          pairs.forEach((pair: string) => {
            const [q, a] = pair.split('::');
            if (q && a) faq.push({ question: q.trim(), answer: a.trim() });
          });
        }

        const featured = parseBoolean(row.featured, false);
        const showOnHomepage = parseBoolean(row.showonhomepage, false);
        const showInBundlesPage = parseBoolean(row.showinbundlespage, true);
        const visible = parseBoolean(row.visible, true);
        const bundleOrder = parseInt(String(row.bundleorder || row.order)) || 999;

        const whatsappCtaText = String(row.whatsappctatext || '').trim() || 'Confirm Bundle Price on WhatsApp';
        let whatsappMessage = String(row.whatsappmessage || '').trim();
        if (!whatsappMessage && name) {
          const itemsStr = includedItems.length > 0 ? `\nIncluded: ${includedItems.join(', ')}` : '';
          whatsappMessage = `Hello EMutex Nig, I am interested in the ${name}.${itemsStr}\n\nPlease send me the current bundle price, delivery options, and how I can order.`;
        }

        parsedPreview.push({
          name, slug, category, shortDescription, fullDescription, imageUrl, galleryImages,
          price, availability, includedProductSlugs, includedItems, benefits, 
          bestFor, usageNote, disclaimer, faq, featured, showOnHomepage, 
          showInBundlesPage, visible, bundleOrder, whatsappCtaText, whatsappMessage,
          status: 'pending', errors, warnings
        });
      }

      // Check for existing slugs in DB
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
          name: item.name,
          slug: item.slug,
          category: item.category,
          shortDescription: item.shortDescription,
          fullDescription: item.fullDescription,
          imageUrl: item.imageUrl,
          galleryImages: item.galleryImages,
          price: item.price,
          availability: item.availability,
          includedProductIds,
          includedItems: item.includedItems,
          benefits: item.benefits,
          bestFor: item.bestFor,
          usageNote: item.usageNote,
          disclaimer: item.disclaimer,
          faq: item.faq,
          featured: item.featured,
          showOnHomepage: item.showOnHomepage,
          showInBundlesPage: item.showInBundlesPage,
          visible: item.visible,
          bundleOrder: item.bundleOrder,
          whatsappCtaText: item.whatsappCtaText,
          whatsappMessage: item.whatsappMessage,
          updatedAt: serverTimestamp(),
        };

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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-brand-ivory w-full max-w-6xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="px-8 py-6 bg-white border-b border-brand-champagne/20 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-emerald text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-emerald/20">
              <Table size={24} />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-brand-emerald">Bundles Bulk Import</h2>
              <p className="text-[10px] text-brand-grey uppercase tracking-widest font-bold">Standardized logic for CSV/Excel</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-mist rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-grow overflow-y-auto p-8 bg-brand-cream/10">
          {(!preview.length && !importSummary) ? (
            <div className="max-w-4xl mx-auto space-y-10 py-10 text-center">
              <div className="space-y-4">
                <h3 className="text-3xl font-serif text-brand-emerald">Ready to import many bundles?</h3>
                <p className="text-brand-grey font-medium">Download our template, fill your combinations, and upload below.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="card p-8 bg-white border-brand-champagne/10 space-y-6 hover:shadow-xl transition-all group">
                    <div className="w-16 h-16 bg-brand-gold/10 text-brand-gold rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                       <Download size={32} />
                    </div>
                    <div className="space-y-2">
                       <h3 className="font-bold text-lg text-brand-emerald">1. Get the Template</h3>
                       <p className="text-sm text-brand-grey">Ensure all column headers match our system for perfect synchronization.</p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button onClick={downloadTemplate} className="btn-secondary w-full py-4 flex items-center justify-center gap-2">
                        <FileText size={20} /> Download CSV Template
                      </button>
                      <button 
                         onClick={() => window.open('https://docs.google.com/spreadsheets/d/1_S0uByPzS9wM9ZlTjHBeG-sWbXwW-84rN8_Z6G2z7J4/copy', '_blank')} 
                         className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1"
                      >
                         <Globe size={14} /> Open in Google Sheets
                      </button>
                    </div>
                 </div>

                 <div className="card p-8 bg-white border-brand-champagne/10 space-y-6 hover:shadow-xl transition-all group">
                    <div className="w-16 h-16 bg-brand-emerald/10 text-brand-emerald rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                       <Upload size={32} />
                    </div>
                    <div className="space-y-2">
                       <h3 className="font-bold text-lg text-brand-emerald">2. Upload your Data</h3>
                       <p className="text-sm text-brand-grey">Select your CSV file. We'll generate slugs and unique identifiers for you.</p>
                    </div>
                    <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <button onClick={() => fileInputRef.current?.click()} className="btn-primary w-full py-4 flex items-center justify-center gap-2 shadow-xl shadow-brand-emerald/10">
                       <Upload size={20} /> Choose CSV File
                    </button>
                 </div>
              </div>

              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 text-left flex gap-4 max-w-2xl mx-auto">
                 <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                 <div className="space-y-2">
                    <h4 className="text-sm font-bold text-amber-900 uppercase tracking-widest">Crucial Import Rules</h4>
                    <ul className="text-xs text-amber-800 space-y-1.5 list-disc ml-4 font-medium">
                       <li>CSV <strong>slug</strong> is ignored; we always generate clean slugs from names.</li>
                       <li>Use <code>|</code> to separate multiple items or product slugs.</li>
                       <li>FAQ format: <code>Is it safe?::Yes very!|How to store?::Cool place.</code></li>
                       <li>Duplicates are handled by updating existing bundles with the same slug.</li>
                    </ul>
                 </div>
              </div>
            </div>
          ) : preview.length > 0 && !importSummary ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between sticky top-0 bg-brand-ivory z-10 py-2">
                 <div className="space-y-1">
                    <h3 className="text-2xl font-serif text-brand-emerald">Import Preview</h3>
                    <p className="text-brand-grey text-xs font-bold uppercase tracking-widest">
                       {preview.filter(p => p.errors?.length === 0).length} valid of {preview.length} rows detected
                    </p>
                 </div>
                 <button onClick={() => setPreview([])} className="px-4 py-2 bg-red-50 text-red-600 text-xs font-black uppercase rounded-xl hover:bg-red-100 transition-all">
                    Reset & Upload New
                 </button>
              </div>

              <div className="border border-brand-champagne/20 rounded-3xl overflow-hidden bg-white shadow-xl overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="bg-brand-emerald text-white uppercase text-[10px] font-bold tracking-widest">
                      <th className="px-6 py-4">Status & Validity</th>
                      <th className="px-6 py-4">Bundle Name</th>
                      <th className="px-6 py-4">Generated Slug</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Availability</th>
                      <th className="px-6 py-4">Contents</th>
                      <th className="px-6 py-4">Visible</th>
                      <th className="px-6 py-4">Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-champagne/10">
                    {preview.map((item, idx) => (
                      <tr key={idx} className={cn("hover:bg-brand-mist/5 transition-colors", item.errors?.length ? "bg-red-50/50" : "")}>
                        <td className="px-6 py-4">
                          {item.status === 'success' ? (
                            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold flex items-center gap-1 w-fit"><CheckCircle size={14}/> Saved</span>
                          ) : item.status === 'error' ? (
                            <div className="space-y-1">
                               <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold flex items-center gap-1 w-fit"><AlertCircle size={14}/> Failed</span>
                               <p className="text-[10px] text-red-400 font-mono italic max-w-[150px] truncate">{item.message}</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5 min-w-[180px]">
                               {item.errors?.length ? (
                                  <div className="space-y-1">
                                     <span className="text-red-600 font-bold flex items-center gap-1 text-[10px] uppercase tracking-tighter">
                                        <X size={14} /> Blocked ({item.errors.length})
                                     </span>
                                     <div className="bg-red-50 p-2 rounded-lg space-y-1">
                                        {item.errors.map((err, i) => <p key={i} className="text-[9px] text-red-500 font-medium leading-tight">• {err}</p>)}
                                     </div>
                                  </div>
                               ) : (
                                  <div className="space-y-2">
                                     <span className={cn(
                                       "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                                       item.existingId ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/20" : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                     )}>
                                        {item.existingId ? 'Updates Existing' : 'New Bundle'}
                                     </span>
                                     {item.warnings?.length > 0 && (
                                        <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                                           {item.warnings.map((warn, i) => (
                                              <p key={i} className="text-[9px] text-amber-700 font-medium leading-tight mb-1 last:mb-0 italic">• {warn}</p>
                                           ))}
                                        </div>
                                     )}
                                  </div>
                               )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top">
                           <div className="space-y-1 pt-1">
                              <p className="font-bold text-brand-emerald text-sm">{item.name}</p>
                              {item.featured && <span className="bg-brand-gold text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Featured</span>}
                           </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                           <div className="pt-1">
                              <code className="bg-brand-mist/30 px-2 py-1 rounded font-mono text-[10px] text-brand-charcoal">{item.slug}</code>
                           </div>
                        </td>
                        <td className="px-6 py-4 align-top font-medium text-brand-grey">{item.category}</td>
                        <td className="px-6 py-4 align-top font-bold text-brand-charcoal">{item.price}</td>
                        <td className="px-6 py-4 align-top">
                           <span className={cn(
                             "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                             item.availability === 'Out of Stock' ? "bg-red-50 text-red-500" : "bg-brand-mist/50 text-brand-emerald"
                           )}>
                             {item.availability}
                           </span>
                        </td>
                        <td className="px-6 py-4 align-top">
                           <div className="flex flex-col gap-1.5 pt-1">
                             <div className="flex items-center gap-2">
                                <span className="w-5 h-5 bg-brand-gold/10 text-brand-gold rounded flex items-center justify-center text-[10px] font-bold">
                                   {item.includedProductSlugs.length}
                                </span>
                                <span className="text-[10px] font-medium text-brand-grey">Product Slugs</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="w-5 h-5 bg-brand-emerald/10 text-brand-emerald rounded flex items-center justify-center text-[10px] font-bold">
                                   {item.includedItems.length}
                                </span>
                                <span className="text-[10px] font-medium text-brand-grey">Manual Items</span>
                             </div>
                           </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                           <span className={cn(
                             "w-3 h-3 rounded-full inline-block mt-2",
                             item.visible ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-gray-300"
                           )} />
                        </td>
                        <td className="px-6 py-4 align-top font-mono text-brand-grey pt-5">{item.bundleOrder}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {importSummary && (
            <div className="py-20 text-center space-y-10 max-w-xl mx-auto">
               <div className="relative">
                  <div className="absolute inset-0 bg-brand-emerald/10 blur-3xl rounded-full scale-150 animate-pulse" />
                  <div className="relative w-24 h-24 mx-auto bg-brand-emerald text-white rounded-full flex items-center justify-center shadow-2xl shadow-brand-emerald/30">
                     <CheckCircle size={48} className="animate-bounce" />
                  </div>
               </div>
               
               <div className="space-y-4">
                  <h3 className="text-4xl font-serif text-brand-emerald">Import Complete!</h3>
                  <p className="text-brand-grey font-medium">The bundles collection has been synchronized with your CSV data.</p>
                  
                  <div className="grid grid-cols-2 gap-6 mt-10">
                     <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-3xl space-y-2">
                        <p className="text-5xl font-black text-emerald-600">{importSummary.success}</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Succeeded</p>
                     </div>
                     <div className="p-8 bg-red-50 border border-red-100 rounded-3xl space-y-2">
                        <p className="text-5xl font-black text-red-600">{importSummary.errors}</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-red-800">Errors</p>
                     </div>
                  </div>
               </div>
               
               <button onClick={onClose} className="btn-primary w-full py-5 text-xl shadow-2xl shadow-brand-emerald/20 hover:-translate-y-1 transition-all">
                  Finish & Refresh List
               </button>
            </div>
          )}
        </div>

        {preview.length > 0 && !importSummary && (
           <div className="px-8 py-6 bg-white border-t border-brand-champagne/20 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl shrink-0">
             <div className="flex gap-4 items-center">
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-emerald-600 uppercase">Valid Ready</span>
                   <span className="text-lg font-black text-brand-emerald">{preview.filter(p => !p.errors || p.errors.length === 0).length}</span>
                </div>
                {preview.some(p => p.errors?.length > 0) && (
                  <>
                    <div className="w-px h-8 bg-brand-champagne/20" />
                    <div className="flex flex-col">
                       <span className="text-[10px] font-bold text-red-500 uppercase">Blocked</span>
                       <span className="text-lg font-black text-red-600">{preview.filter(p => p.errors?.length > 0).length}</span>
                    </div>
                  </>
                )}
             </div>

             <div className="flex gap-4 w-full sm:w-auto">
               <button onClick={() => setPreview([])} disabled={isImporting} className="btn-secondary px-8 flex-grow">Cancel</button>
               <button 
                  onClick={startImport} 
                  disabled={isImporting || preview.filter(p => !p.errors || p.errors.length === 0).length === 0} 
                  className="btn-primary px-16 py-4 flex items-center justify-center gap-2 shadow-xl shadow-brand-emerald/20 disabled:opacity-50 flex-grow"
               >
                  {isImporting ? <Loader2 size={24} className="animate-spin" /> : <Table size={24} />}
                  <span className="text-lg">{isImporting ? `Processing...` : 'Execute Import'}</span>
               </button>
             </div>
           </div>
        )}
      </motion.div>
    </div>
  );
}


import { RefreshCcw, Plus } from 'lucide-react';
