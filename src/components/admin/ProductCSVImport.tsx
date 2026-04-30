import { useState, useRef } from 'react';
import { collection, query, where, getDocs, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { X, Upload, Download, FileText, CheckCircle2, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CSVImportProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductCSVImport({ onClose, onSuccess }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{ success: number; failed: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = [
      'name', 'slug', 'category', 'shortDescription', 'fullDescription', 'imageUrl', 
      'galleryImages', 'price', 'availability', 'wellnessSupportPoints', 'benefits', 
      'bestFor', 'usageNote', 'disclaimer', 'faq', 'featured', 'showOnHomepage', 
      'showInCatalogue', 'visible', 'productOrder', 'whatsappCtaText', 'whatsappMessage'
    ];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" +
      "Example Product,example-product,Daily Wellness Support,Short description.,# Full description\nMarkdown ready.,https://example.com/image.jpg,https://img1.jpg|https://img2.jpg,5000,In Stock,Point 1|Point 2,Benefit 1|Benefit 2,Busy adults,1 daily,Disclaimer text,Q1::A1|Q2::A2,false,false,true,true,1,Check Price,Hello EMutex Nig...";
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "emutex_product_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a valid CSV file.');
        return;
      }
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    setParsing(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          // Basic CSV parsing (handles quotes)
          const values = [];
          let current = '';
          let inQuotes = false;
          for (let char of lines[i]) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
              values.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim().replace(/^"|"$/g, ''));

          const obj: any = {};
          headers.forEach((header, index) => {
            let val: any = values[index] || '';
            
            // Parsing Rules
            if (['featured', 'showOnHomepage', 'showInCatalogue', 'visible'].includes(header)) {
              val = ['true', 'yes', '1'].includes(val.toLowerCase());
            } else if (header === 'productOrder') {
              val = parseInt(val) || 999;
            } else if (['galleryImages', 'wellnessSupportPoints', 'benefits'].includes(header)) {
              val = val ? val.split('|').map((s: string) => s.trim()) : [];
            } else if (header === 'faq') {
              val = val ? val.split('|').map((s: string) => {
                const [q, a] = s.split('::');
                return { question: (q || '').trim(), answer: (a || '').trim() };
              }) : [];
            }
            
            obj[header] = val;
          });

          // Set defaults for optional fields if empty
          if (!obj.price) obj.price = 'Confirm on WhatsApp';
          if (obj.featured === undefined) obj.featured = false;
          if (obj.showOnHomepage === undefined) obj.showOnHomepage = false;
          if (obj.showInCatalogue === undefined) obj.showInCatalogue = true;
          if (obj.visible === undefined) obj.visible = true;
          if (obj.productOrder === undefined) obj.productOrder = 999;
          if (!obj.availability) obj.availability = 'In Stock';

          data.push(obj);
        }
        setParsedData(data);
      } catch (err) {
        setError('Failed to parse CSV file. Please ensure it follows the template.');
        console.error(err);
      } finally {
        setParsing(false);
      }
    };
    reader.readAsText(file);
  };

  const importProducts = async () => {
    if (parsedData.length === 0) return;
    setImporting(true);
    let success = 0;
    let failed = 0;
    let skipped = 0;

    try {
      const productsRef = collection(db!, 'products');
      
      for (const product of parsedData) {
        try {
          // Validation
          if (!product.name || !product.slug || !product.category || !product.imageUrl) {
            failed++;
            continue;
          }

          // Check for existing slug
          const q = query(productsRef, where('slug', '==', product.slug));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const existingId = snapshot.docs[0].id;
            // Overwrite existing
            await setDoc(doc(db!, 'products', existingId), {
              ...product,
              updatedAt: serverTimestamp()
            }, { merge: true });
          } else {
            // Add new
            await addDoc(productsRef, {
              ...product,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
          success++;
        } catch (err) {
          console.error(`Failed to import ${product.name}:`, err);
          failed++;
        }
      }
      setReport({ success, failed, skipped });
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
        className="bg-brand-ivory w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="px-8 py-6 bg-white border-b border-brand-champagne/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-brand-emerald/10 text-brand-emerald rounded-lg">
                <Upload size={20} />
             </div>
             <div>
                <h2 className="text-xl font-serif font-bold text-brand-emerald">Import Products CSV</h2>
                <p className="text-xs text-brand-grey">Bulk upload products to your Firestore database.</p>
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

          {report && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4">
               <div className="flex items-center gap-3 text-emerald-700 font-bold">
                 <CheckCircle2 size={24} />
                 <h3>Import Complete</h3>
               </div>
               <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                    <p className="text-xs text-brand-grey uppercase tracking-wider font-bold">Success</p>
                    <p className="text-2xl font-bold text-emerald-600">{report.success}</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                    <p className="text-xs text-brand-grey uppercase tracking-wider font-bold">Failed</p>
                    <p className="text-2xl font-bold text-red-500">{report.failed}</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                    <p className="text-xs text-brand-grey uppercase tracking-wider font-bold">Skipped</p>
                    <p className="text-2xl font-bold text-brand-gold">{report.skipped}</p>
                  </div>
               </div>
               <button onClick={onSuccess} className="btn-primary w-full py-3 bg-emerald-600 border-0">Close & Refresh</button>
            </div>
          )}

          {!report && (
            <>
              {/* Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-brand-champagne/50 rounded-3xl p-12 text-center space-y-4 hover:bg-white/50 transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 bg-brand-mist rounded-full flex items-center justify-center mx-auto text-brand-emerald group-hover:scale-110 transition-transform">
                  {parsing ? <Loader2 className="animate-spin" size={32} /> : <FileText size={32} />}
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-brand-charcoal">{file ? file.name : 'Select or drop CSV file'}</p>
                  <p className="text-xs text-brand-grey">Only .csv files are supported</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".csv" 
                  className="hidden" 
                />
              </div>

              {/* Template */}
              <div className="flex items-center justify-between p-4 bg-brand-mist/20 rounded-2xl border border-brand-champagne/10">
                <div className="flex items-center gap-3">
                   <Download size={18} className="text-brand-gold" />
                   <div className="space-y-0.5">
                      <p className="text-xs font-bold text-brand-emerald uppercase tracking-widest">CSV Template</p>
                      <p className="text-[10px] text-brand-grey">Download our template for best results</p>
                   </div>
                </div>
                <button onClick={downloadTemplate} className="text-xs font-bold text-brand-gold hover:underline">Download Template</button>
              </div>

              {/* Preview */}
              {parsedData.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-brand-emerald flex items-center gap-2">
                       Preview Parsed Data
                       <span className="px-2 py-0.5 bg-brand-gold/10 text-brand-gold text-[10px] rounded-full">{parsedData.length} records found</span>
                    </h3>
                  </div>
                  <div className="bg-white rounded-2xl border border-brand-champagne/20 overflow-hidden max-h-40 overflow-y-auto">
                     <table className="w-full text-left text-[10px]">
                        <thead className="bg-brand-mist/50 sticky top-0">
                           <tr>
                              <th className="px-4 py-2 border-b">Name</th>
                              <th className="px-4 py-2 border-b">Category</th>
                              <th className="px-4 py-2 border-b">Price</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-champagne/10">
                           {parsedData.slice(0, 5).map((row, i) => (
                             <tr key={i}>
                               <td className="px-4 py-2 font-bold">{row.name}</td>
                               <td className="px-4 py-2">{row.category}</td>
                               <td className="px-4 py-2">{row.price}</td>
                             </tr>
                           ))}
                           {parsedData.length > 5 && (
                             <tr>
                               <td colSpan={3} className="px-4 py-2 text-center text-brand-grey italic">...and {parsedData.length - 5} more</td>
                             </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
                  <button 
                    disabled={importing}
                    onClick={importProducts}
                    className="btn-primary w-full py-4 text-lg bg-brand-emerald border-0 flex items-center justify-center gap-3"
                  >
                    {importing ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
                    {importing ? 'Importing Products...' : 'Start Bulk Import'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
