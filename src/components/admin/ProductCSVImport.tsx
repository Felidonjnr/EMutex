import { useState, useRef } from 'react';
import { collection, query, where, getDocs, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { X, Upload, Download, FileText, CheckCircle2, AlertCircle, Loader2, Info, FileSpreadsheet, Globe, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { generateSlug } from '../../lib/utils';

interface CSVImportProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ProductRow {
  name: string;
  slug: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl: string;
  galleryImages: string | string[];
  price: string;
  availability: string;
  wellnessSupportPoints: string | string[];
  benefits: string | string[];
  bestFor: string;
  usageNote: string;
  disclaimer: string;
  faq: string | any[];
  featured: any;
  showOnHomepage: any;
  showInCatalogue: any;
  visible: any;
  productOrder: any;
  whatsappCtaText: string;
  whatsappMessage: string;
  relatedBundleIds: string | string[];
  isValid?: boolean;
  errors?: string[];
  warnings?: string[];
}

export default function ProductCSVImport({ onClose, onSuccess }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{ success: number; failed: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&q=80&w=800';

  const getTemplateData = () => {
    const headers = [
      'name', 'slug', 'category', 'shortDescription', 'fullDescription', 'imageUrl', 
      'galleryImages', 'price', 'availability', 'wellnessSupportPoints', 'benefits', 
      'bestFor', 'usageNote', 'disclaimer', 'faq', 'featured', 'showOnHomepage', 
      'showInCatalogue', 'visible', 'productOrder', 'whatsappCtaText', 'whatsappMessage', 'relatedBundleIds'
    ];
    
    const sampleRows = [
      {
        name: 'Example Wellness Pack',
        slug: 'example-wellness-pack',
        category: 'Supplements',
        shortDescription: 'Great for daily vitality.',
        fullDescription: '# Premium Support\n- High quality\n- Daily use',
        imageUrl: '',
        galleryImages: 'https://img1.com|https://img2.com',
        price: '₦15,000',
        availability: 'In Stock',
        wellnessSupportPoints: 'Energy Boost|Body Balance|Mental Clarity',
        benefits: 'Supports vitality|Helps focus|All natural',
        bestFor: 'Busy professionals',
        usageNote: 'Take 1 daily',
        disclaimer: 'Consult a doctor.',
        faq: 'How do I order?::Click WhatsApp to confirm price and delivery|Is delivery available?::Yes, confirm delivery options on WhatsApp.',
        featured: 'FALSE',
        showOnHomepage: 'FALSE',
        showInCatalogue: 'TRUE',
        visible: 'TRUE',
        productOrder: '999',
        whatsappCtaText: 'Confirm Latest Price on WhatsApp',
        whatsappMessage: '',
        relatedBundleIds: ''
      }
    ];

    return { headers, sampleRows };
  };

  const downloadXLSXTemplate = () => {
    const { headers, sampleRows } = getTemplateData();
    
    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    
    // Create Instructions sheet
    const instructions = [
      ['Column', 'Required', 'Format / Notes'],
      ['name', 'Yes', 'The display name of the product'],
      ['slug', 'No', 'Auto-generated from name if empty'],
      ['category', 'No', 'Default: General Wellness'],
      ['shortDescription', 'No', 'Brief summary for cards'],
      ['fullDescription', 'No', 'Rich text details (Markdown supported)'],
      ['imageUrl', 'No', 'Fallback image used if empty'],
      ['galleryImages', 'No', 'Multiple URLs separated by | symbol'],
      ['availability', 'No', 'Must be: In Stock, Backorder, or Out of Stock'],
      ['wellnessSupportPoints', 'No', 'Multiple points separated by | symbol'],
      ['benefits', 'No', 'Multiple benefits separated by | symbol'],
      ['faq', 'No', 'Format: Question::Answer|Question::Answer'],
      ['featured/visible/homepage/catalogue', 'No', 'TRUE/FALSE, Yes/No, or 1/0'],
      ['productOrder', 'No', 'Number for sorting (default 999)']
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
    
    XLSX.writeFile(wb, 'EMutex_Product_Template.xlsx');
  };

  const downloadCSVTemplate = () => {
    const { headers, sampleRows } = getTemplateData();
    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => headers.map(h => `"${(row as any)[h] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "EMutex_Product_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openGoogleSheetsTemplate = () => {
    window.open('https://docs.google.com/spreadsheets/d/1_S0uByPzS9wM9ZlTjHBeG-sWbXwW-84rN8_Z6G2z7J4/copy', '_blank');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = async (file: File) => {
    setParsing(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet);
      
      const usedSlugsInBatch = new Set<string>();

      const processedData = rawData.map((row: any) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 1. Name is strictly required
        const name = String(row.name || '').trim();
        if (!name) errors.push('Name is required');

        // 2. Slug generation (Rule: Strictly ignore CSV slug, generate fresh from name)
        let slug = '';
        if (name) {
          const baseSlug = generateSlug(name);
          slug = baseSlug;
          
          // Ensure uniqueness within this batch
          let counter = 2;
          while (usedSlugsInBatch.has(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
          }
          usedSlugsInBatch.add(slug);
        }

        // 3. Category defaults
        let category = String(row.category || '').trim();
        if (!category) {
          category = 'General Wellness';
          if (name) warnings.push('No category provided. Category set to General Wellness.');
        }

        // 4. Description defaults
        let shortDescription = String(row.shortDescription || '').trim();
        if (!shortDescription) {
          shortDescription = 'Carefully selected wellness product for daily support and better living.';
          if (name) warnings.push('No short description provided. Using default.');
        }

        let fullDescription = String(row.fullDescription || '').trim();
        if (!fullDescription) {
          fullDescription = shortDescription;
        }

        // 5. Image defaults
        let imageUrl = String(row.imageUrl || '').trim();
        if (!imageUrl) {
          imageUrl = FALLBACK_IMAGE;
          if (name) warnings.push('No image URL provided. A fallback image will be used.');
        }

        // 6. Price & Availability
        let price = String(row.price || '').trim();
        if (!price) {
          price = 'Confirm on WhatsApp';
          if (name) warnings.push('No price provided. Price set to Confirm on WhatsApp.');
        }

        let availability = String(row.availability || '').trim();
        if (!availability || !['In Stock', 'Backorder', 'Out of Stock'].includes(availability)) {
          availability = 'In Stock';
        }

        // 7. Toggles
        const featured = parseBoolean(row.featured, false);
        const showOnHomepage = parseBoolean(row.showOnHomepage, false);
        const showInCatalogue = parseBoolean(row.showInCatalogue, true);
        const visible = parseBoolean(row.visible, true);
        const productOrder = parseInt(String(row.productOrder)) || 999;

        // 8. WhatsApp
        let whatsappCtaText = String(row.whatsappCtaText || '').trim();
        if (!whatsappCtaText) {
          whatsappCtaText = 'Confirm Latest Price on WhatsApp';
        }

        let whatsappMessage = String(row.whatsappMessage || '').trim();
        if (!whatsappMessage && name) {
          whatsappMessage = `Hello EMutex Nig, I am interested in ${name}. Please send me the current price, product details, delivery options, and how I can order.`;
        }

        const obj: ProductRow = {
          name,
          slug,
          category,
          shortDescription,
          fullDescription,
          imageUrl,
          galleryImages: parseMultiple(row.galleryImages),
          price,
          availability,
          wellnessSupportPoints: parseMultiple(row.wellnessSupportPoints),
          benefits: parseMultiple(row.benefits),
          bestFor: String(row.bestFor || '').trim(),
          usageNote: String(row.usageNote || '').trim(),
          disclaimer: String(row.disclaimer || '').trim(),
          faq: parseFAQ(row.faq),
          featured,
          showOnHomepage,
          showInCatalogue,
          visible,
          productOrder,
          whatsappCtaText,
          whatsappMessage,
          relatedBundleIds: parseMultiple(row.relatedBundleIds)
        };

        return { ...obj, errors, warnings, isValid: errors.length === 0 };
      });

      setParsedData(processedData);
    } catch (err) {
      setError('Failed to parse file. Please ensure it follows the template.');
      console.error(err);
    } finally {
      setParsing(false);
    }
  };

  const parseMultiple = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return String(val).split('|').map(s => s.trim()).filter(Boolean);
  };

  const parseFAQ = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return String(val).split('|').map(s => {
      const [q, a] = s.split('::');
      return { question: (q || '').trim(), answer: (a || '').trim() };
    }).filter(f => f.question && f.answer);
  };

  const parseBoolean = (val: any, fallback: boolean) => {
    if (val === undefined || val === null || val === '') return fallback;
    const s = String(val).toLowerCase();
    if (['true', 'yes', '1', 'y'].includes(s)) return true;
    if (['false', 'no', '0', 'n'].includes(s)) return false;
    return fallback;
  };

  const importProducts = async () => {
    const validData = parsedData.filter(p => p.isValid);
    if (validData.length === 0) return;
    
    setImporting(true);
    let success = 0;
    let failed = 0;
    
    try {
      const productsRef = collection(db!, 'products');
      
      for (const p of validData) {
        try {
          const { isValid, errors, ...cleanProduct } = p;
          
          // Check for existing slug
          const q = query(productsRef, where('slug', '==', cleanProduct.slug));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const existingId = snapshot.docs[0].id;
            await setDoc(doc(db!, 'products', existingId), {
              ...cleanProduct,
              updatedAt: serverTimestamp()
            }, { merge: true });
          } else {
            await addDoc(productsRef, {
              ...cleanProduct,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
          success++;
        } catch (err) {
          console.error(`Failed to import ${p.name}:`, err);
          failed++;
        }
      }
      setReport({ success, failed, skipped: parsedData.length - validData.length });
    } catch (err: any) {
      setError(err.message || 'Bulk import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-brand-ivory w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="px-8 py-6 bg-white border-b border-brand-champagne/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-brand-emerald/10 text-brand-emerald rounded-lg">
                <Upload size={20} />
             </div>
             <div>
                <h2 className="text-xl font-serif font-bold text-brand-emerald">Product Bulk Import</h2>
                <p className="text-xs text-brand-grey">Import products from CSV or Excel files.</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-mist rounded-full transition-colors"><X/></button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          {error && (
            <div className="p-4 bg-red-100 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
              <AlertCircle size={20} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {report ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-6">
               <div className="flex items-center gap-3 text-emerald-700 font-bold">
                 <CheckCircle2 size={24} />
                 <h3>Import Task Complete</h3>
               </div>
               <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-white rounded-xl shadow-sm border border-emerald-100">
                    <p className="text-[10px] text-brand-grey uppercase tracking-wider font-bold">Success</p>
                    <p className="text-2xl font-bold text-emerald-600">{report.success}</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-xl shadow-sm border border-red-100">
                    <p className="text-[10px] text-brand-grey uppercase tracking-wider font-bold">Failed</p>
                    <p className="text-2xl font-bold text-red-500">{report.failed}</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-xl shadow-sm border border-brand-champagne/20">
                    <p className="text-[10px] text-brand-grey uppercase tracking-wider font-bold">Invalid/Skipped</p>
                    <p className="text-2xl font-bold text-brand-gold">{report.skipped}</p>
                  </div>
               </div>
               <button onClick={onSuccess} className="btn-primary w-full py-4 bg-brand-emerald border-0">Refresh Product List</button>
            </div>
          ) : (
            <>
              {/* Template Area */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button 
                  onClick={downloadXLSXTemplate}
                  className="flex items-center justify-between p-4 bg-white border border-brand-champagne/30 rounded-2xl hover:border-emerald-500 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="text-emerald-600" size={24} />
                    <div className="text-left">
                      <p className="text-xs font-bold text-brand-emerald">Excel</p>
                      <p className="text-[10px] text-brand-grey">.xlsx File</p>
                    </div>
                  </div>
                  <Download className="text-brand-grey group-hover:text-emerald-600" size={18} />
                </button>
                <button 
                  onClick={openGoogleSheetsTemplate}
                  className="flex items-center justify-between p-4 bg-white border border-brand-champagne/30 rounded-2xl hover:border-blue-500 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="text-blue-500" size={24} />
                    <div className="text-left">
                      <p className="text-xs font-bold text-brand-emerald">Google Sheets</p>
                      <p className="text-[10px] text-brand-grey">Open Template</p>
                    </div>
                  </div>
                  <ArrowUpRight className="text-brand-grey group-hover:text-blue-500" size={18} />
                </button>
                <button 
                  onClick={downloadCSVTemplate}
                  className="flex items-center justify-between p-4 bg-white border border-brand-champagne/30 rounded-2xl hover:border-brand-gold transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="text-brand-gold" size={24} />
                    <div className="text-left">
                      <p className="text-xs font-bold text-brand-emerald">CSV</p>
                      <p className="text-[10px] text-brand-grey">.csv File</p>
                    </div>
                  </div>
                  <Download className="text-brand-grey group-hover:text-brand-gold" size={18} />
                </button>
              </div>

              {/* Upload Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-brand-champagne/50 rounded-3xl p-10 text-center space-y-4 hover:bg-white/50 transition-all cursor-pointer group bg-brand-ivory/50"
              >
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-brand-emerald group-hover:scale-110 transition-transform">
                  {parsing ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} />}
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-brand-charcoal">{file ? file.name : 'Select Product File'}</p>
                  <p className="text-xs text-brand-grey">Drag and drop .xlsx or .csv files here</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".csv, .xlsx" 
                  className="hidden" 
                />
              </div>

              {/* Preview & Validation */}
              {parsedData.length > 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-brand-emerald flex items-center gap-2">
                       Preview Uploaded Products
                       <span className="px-3 py-1 bg-brand-gold/10 text-brand-gold text-[10px] rounded-full uppercase tracking-wider font-bold">
                         {parsedData.length} records • {parsedData.filter(p => !p.isValid).length} errors
                       </span>
                    </h3>
                  </div>
                  
                  <div className="bg-white rounded-2xl border border-brand-champagne/20 overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-brand-mist/30 border-b border-brand-champagne/10">
                        <tr>
                          <th className="px-4 py-3 font-bold text-brand-emerald">Status</th>
                          <th className="px-4 py-3 font-bold text-brand-emerald">Name</th>
                          <th className="px-4 py-3 font-bold text-brand-emerald">Slug</th>
                          <th className="px-4 py-3 font-bold text-brand-emerald">Category</th>
                          <th className="px-4 py-3 font-bold text-brand-emerald">Availability</th>
                          <th className="px-4 py-3 font-bold text-brand-emerald">Toggles</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-champagne/5">
                        {parsedData.map((row, i) => (
                          <tr key={i} className={row.isValid ? '' : 'bg-red-50/50'}>
                            <td className="px-4 py-3">
                              {row.isValid ? (
                                <div className="space-y-1">
                                  <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Ready</span>
                                  {row.warnings && row.warnings.length > 0 && (
                                    <div className="text-[9px] text-amber-600 font-medium bg-amber-50 p-1 rounded border border-amber-100 italic">
                                       {row.warnings.map((warn, idx) => <p key={idx}>• {warn}</p>)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="text-red-500 font-bold flex items-center gap-1"><AlertCircle size={12} /> Error</span>
                                  <div className="text-[9px] text-red-400 font-medium">
                                    {row.errors?.map((err, idx) => <p key={idx}>{err}</p>)}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-brand-charcoal">{row.name}</td>
                            <td className="px-4 py-3 text-brand-grey">{row.slug}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-brand-mist rounded text-[9px] uppercase font-bold text-brand-gold">{row.category}</span>
                            </td>
                            <td className="px-4 py-3 text-brand-grey">{row.availability}</td>
                            <td className="px-4 py-3">
                               <div className="flex gap-2">
                                  {row.featured && <span className="w-2 h-2 rounded-full bg-brand-gold" title="Featured" />}
                                  {row.visible && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Visible" />}
                                  {row.showOnHomepage && <span className="w-2 h-2 rounded-full bg-blue-500" title="Homepage" />}
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setParsedData([])}
                      className="btn-secondary flex-1 py-4"
                    >
                      Clear & Start Over
                    </button>
                    <button 
                      disabled={importing || parsedData.every(p => !p.isValid)}
                      onClick={importProducts}
                      className="btn-primary flex-[2] py-4 bg-brand-emerald border-0 flex items-center justify-center gap-3 relative disabled:opacity-50"
                    >
                      {importing ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
                      {importing ? 'Importing Products...' : `Import ${parsedData.filter(p => p.isValid).length} Valid Products`}
                      {parsing && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                    </button>
                  </div>
                  
                  <p className="text-[10px] text-center text-brand-grey flex items-center justify-center gap-1">
                    <Info size={12} /> Existing products with same slug will be updated.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
