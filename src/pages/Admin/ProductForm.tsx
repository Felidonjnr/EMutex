import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Product } from '../../types';
import { X, Plus, Trash2, Save, Info, Settings as SettingsIcon, Layout, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../../constants';
import { cn } from '../../lib/utils';

const productSchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z.string().min(2, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  category: z.string().min(1, "Category is required"),
  shortDescription: z.string().min(5, "Short description is required"),
  fullDescription: z.string().min(10, "Full description is required"),
  imageUrl: z.string().url("Valid image URL is required"),
  price: z.string().default('Confirm on WhatsApp'),
  availability: z.enum(['In Stock', 'Backorder', 'Out of Stock']),
  wellnessSupportPoints: z.array(z.string()).min(1, "At least one point is required"),
  benefits: z.array(z.string()).min(1, "At least one benefit is required"),
  bestFor: z.string().default(''),
  usageNote: z.string().default(''),
  disclaimer: z.string().default(''),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([{ question: '', answer: '' }]),
  featured: z.boolean().default(false),
  showOnHomepage: z.boolean().default(true),
  showInCatalogue: z.boolean().default(true),
  visible: z.boolean().default(true),
  productOrder: z.number().default(0),
  whatsappCtaText: z.string().default(''),
  whatsappMessage: z.string().default(''),
  galleryImages: z.array(z.string()).default([]),
  relatedProductIds: z.array(z.string()).default([]),
  relatedBundleIds: z.array(z.string()).default([]),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductForm({ product, onClose, onSuccess }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'content' | 'display' | 'whatsapp'>('basic');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, control, formState: { errors }, watch, setValue } = useForm<any>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: product ? {
      ...product as any,
      wellnessSupportPoints: product.wellnessSupportPoints || [''],
      benefits: product.benefits || [''],
      faq: product.faq || [{ question: '', answer: '' }]
    } : {
      name: '', slug: '', category: '', shortDescription: '', fullDescription: '', imageUrl: '', price: 'Confirm on WhatsApp',
      availability: 'In Stock',
      wellnessSupportPoints: [''],
      benefits: [''],
      bestFor: '', usageNote: '', disclaimer: '',
      faq: [{ question: '', answer: '' }],
      featured: false,
      showOnHomepage: true,
      showInCatalogue: true,
      visible: true,
      productOrder: 0,
      whatsappCtaText: '', whatsappMessage: '',
      galleryImages: [], relatedProductIds: [], relatedBundleIds: []
    }
  });

  const { fields: pointFields, append: appendPoint, remove: removePoint } = useFieldArray({ control, name: 'wellnessSupportPoints' as any });
  const { fields: benefitFields, append: appendBenefit, remove: removeBenefit } = useFieldArray({ control, name: 'benefits' as any });
  const { fields: faqFields, append: appendFaq, remove: removeFaq } = useFieldArray({ control, name: 'faq' as any });

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const payload = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      if (!db) {
        throw new Error("Database not initialized. Please check your Firebase configuration.");
      }

      if (product) {
        await updateDoc(doc(db, 'products', product.id), payload);
      } else {
        await addDoc(collection(db, 'products'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      onSuccess();
    } catch (error: any) {
      console.error('Product save error:', error);
      setSubmitError(error.message || String(error));
      try {
        handleFirestoreError(error, product ? OperationType.UPDATE : OperationType.CREATE, 'products');
      } catch (e) {}
    } finally {
      setIsSubmitting(false);
    }
  };

  const name = watch('name');
  const autoSlug = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-brand-ivory w-full max-w-5xl h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="px-8 py-6 bg-white border-b border-brand-champagne/20 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-serif font-bold text-brand-emerald">{product ? 'Edit Product' : 'Add New Product'}</h2>
            <p className="text-xs text-brand-grey">Fill in the details to update your catalogue.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-mist rounded-full transition-colors"><X/></button>
        </div>

        {/* Tabs */}
        <div className="px-8 bg-white border-b border-brand-champagne/10 flex gap-8 shrink-0">
          {(['basic', 'content', 'display', 'whatsapp'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all",
                activeTab === tab ? "border-brand-gold text-brand-gold" : "border-transparent text-brand-grey hover:text-brand-charcoal"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="flex-grow overflow-y-auto p-8 lg:p-12 space-y-12">
          {submitError && (
            <div className="p-4 bg-red-100 border border-red-200 text-red-700 rounded-xl mb-6">
              <p className="font-bold text-sm">Save Failed:</p>
              <pre className="text-xs whitespace-pre-wrap mt-1">{submitError}</pre>
            </div>
          )}
          {Object.keys(errors).length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 font-bold text-sm mb-2">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-red-600 text-xs space-y-1">
                {Object.entries(errors).map(([field, error]: any) => (
                  <li key={field}>{field}: {error.message || 'Invalid value'}</li>
                ))}
              </ul>
            </div>
          )}
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                 <h3 className="text-lg font-serif font-bold flex items-center gap-2 border-l-4 border-brand-gold pl-4">Basic Information</h3>
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-brand-emerald">Product Name</label>
                       <input {...register('name')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl" placeholder="e.g. Ginseng Tonic Wine" />
                       <button type="button" onClick={() => setValue('slug', autoSlug)} className="text-[10px] text-brand-gold hover:underline mt-1">Auto-generate slug</button>
                       {errors.name && <p className="text-red-500 text-[10px] mt-1">{(errors.name as any).message}</p>}
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-brand-emerald">Slug (URL snippet)</label>
                       <input {...register('slug')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl" placeholder="ginseng-tonic-wine" />
                       {errors.slug && <p className="text-red-500 text-[10px] mt-1">{(errors.slug as any).message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-brand-emerald">Category</label>
                           <select {...register('category')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl">
                              <option value="">Select category</option>
                              {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-brand-emerald">Availability</label>
                           <select {...register('availability')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl">
                              <option value="In Stock">In Stock</option>
                              <option value="Backorder">Backorder</option>
                              <option value="Out of Stock">Out of Stock</option>
                           </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-brand-emerald">Product Main Image URL</label>
                       <input {...register('imageUrl')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl" placeholder="https://..." />
                       {errors.imageUrl && <p className="text-red-500 text-[10px] mt-1">{(errors.imageUrl as any).message}</p>}
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-brand-emerald">Price (e.g. 15,000 or Confirm on WhatsApp)</label>
                       <input {...register('price')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl" placeholder="e.g. 15,000" />
                       {errors.price && <p className="text-red-500 text-[10px] mt-1">{(errors.price as any).message}</p>}
                    </div>
                 </div>
              </div>
              <div className="space-y-6">
                 <h3 className="text-lg font-serif font-bold flex items-center gap-2 border-l-4 border-brand-emerald pl-4">Brief & Best For</h3>
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-brand-emerald">Short Description (for cards)</label>
                       <textarea {...register('shortDescription')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl h-24" />
                       {errors.shortDescription && <p className="text-red-500 text-[10px] mt-1">{(errors.shortDescription as any).message}</p>}
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-brand-emerald">Best For (e.g. Busy adults, energy)</label>
                       <input {...register('bestFor')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-brand-emerald">Usage Note</label>
                       <input {...register('usageNote')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl" placeholder="e.g. 1 capsule daily" />
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-12">
               <div className="space-y-6">
                  <h3 className="text-lg font-serif font-bold flex items-center gap-2 border-l-4 border-brand-gold pl-4">Full Product Description (Markdown supported)</h3>
                  <textarea {...register('fullDescription')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl h-64 font-mono text-sm shadow-inner" />
                  {errors.fullDescription && <p className="text-red-500 text-[10px] mt-1">{(errors.fullDescription as any).message}</p>}
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-brand-emerald">Wellness Support Points</h4>
                        <button type="button" onClick={() => appendPoint('')} className="p-1 bg-brand-gold text-white rounded-lg"><Plus size={16}/></button>
                    </div>
                    <div className="space-y-2">
                       {pointFields.map((field, index) => (
                         <div key={field.id} className="flex gap-2">
                            <input {...register(`wellnessSupportPoints.${index}` as any)} className="flex-grow px-4 py-2 bg-white border border-brand-champagne/30 rounded-xl text-sm" />
                            <button type="button" onClick={() => removePoint(index)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-brand-emerald">Key Benefits</h4>
                        <button type="button" onClick={() => appendBenefit('')} className="p-1 bg-brand-emerald text-white rounded-lg"><Plus size={16}/></button>
                    </div>
                    <div className="space-y-2">
                       {benefitFields.map((field, index) => (
                         <div key={field.id} className="flex gap-2">
                            <input {...register(`benefits.${index}` as any)} className="flex-grow px-4 py-2 bg-white border border-brand-champagne/30 rounded-xl text-sm" />
                            <button type="button" onClick={() => removeBenefit(index)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                         </div>
                       ))}
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-serif font-bold">Frequently Asked Questions</h3>
                    <button type="button" onClick={() => appendFaq({ question: '', answer: '' })} className="btn-secondary py-2 flex items-center gap-2 text-xs">
                      <Plus size={14}/> Add FAQ Item
                    </button>
                  </div>
                  <div className="space-y-4">
                     {faqFields.map((field, index) => (
                       <div key={field.id} className="card p-6 bg-brand-mist/20 border-brand-champagne/10 relative">
                          <button type="button" onClick={() => removeFaq(index)} className="absolute top-4 right-4 text-red-400"><X size={16}/></button>
                          <div className="grid grid-cols-1 gap-4">
                             <input {...register(`faq.${index}.question` as any)} placeholder="Question" className="w-full px-4 py-2 bg-white border border-brand-champagne/30 rounded-xl text-sm font-bold" />
                             <textarea {...register(`faq.${index}.answer` as any)} placeholder="Answer" className="w-full px-4 py-2 bg-white border border-brand-champagne/30 rounded-xl text-sm h-20" />
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'display' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-8">
                  <h3 className="text-lg font-serif font-bold border-l-4 border-brand-gold pl-4">Display Visibility</h3>
                  <div className="space-y-4">
                     <label className="flex items-center gap-4 card p-6 cursor-pointer hover:bg-brand-mist/20">
                        <input type="checkbox" {...register('visible')} className="w-6 h-6 rounded-lg text-brand-emerald focus:ring-brand-gold" />
                        <div>
                          <p className="font-bold text-brand-emerald">Visible to Public</p>
                          <p className="text-xs text-brand-grey">Show product on the public website.</p>
                        </div>
                     </label>
                     <label className="flex items-center gap-4 card p-6 cursor-pointer hover:bg-brand-mist/20">
                        <input type="checkbox" {...register('showOnHomepage')} className="w-6 h-6 rounded-lg text-brand-emerald focus:ring-brand-gold" />
                        <div>
                          <p className="font-bold text-brand-emerald">Show on Homepage</p>
                          <p className="text-xs text-brand-grey">Include in homepage previews.</p>
                        </div>
                     </label>
                     <label className="flex items-center gap-4 card p-6 cursor-pointer hover:bg-brand-mist/20">
                        <input type="checkbox" {...register('showInCatalogue')} className="w-6 h-6 rounded-lg text-brand-emerald focus:ring-brand-gold" />
                        <div>
                          <p className="font-bold text-brand-emerald">Show in Catalogue</p>
                          <p className="text-xs text-brand-grey">Include in main product list.</p>
                        </div>
                     </label>
                     <label className="flex items-center gap-4 card p-6 cursor-pointer hover:bg-brand-mist/20">
                        <input type="checkbox" {...register('featured')} className="w-6 h-6 rounded-lg text-brand-emerald focus:ring-brand-gold" />
                        <div>
                          <p className="font-bold text-brand-emerald">Mark as Featured</p>
                          <p className="text-xs text-brand-grey">Highlight with a "Recommended" badge.</p>
                        </div>
                     </label>
                  </div>
               </div>

               <div className="space-y-8">
                  <h3 className="text-lg font-serif font-bold border-l-4 border-brand-emerald pl-4">Ordering & Order</h3>
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-brand-emerald">Product Display Order (0 is first)</label>
                        <input type="number" {...register('productOrder', { valueAsNumber: true })} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-brand-emerald">Medical Disclaimer (Override global)</label>
                        <textarea {...register('disclaimer')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl h-32 text-xs" />
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="max-w-2xl mx-auto space-y-8 py-10">
               <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={32} />
                  </div>
                  <h3 className="text-2xl font-serif">WhatsApp Customization</h3>
                  <p className="text-brand-grey">Customize how customers reach out for this specific product.</p>
               </div>

               <div className="space-y-6">
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-brand-emerald">CTA Button Text (Default: Check Price on WhatsApp)</label>
                     <input {...register('whatsappCtaText')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl" placeholder="Check Price on WhatsApp" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-brand-emerald">Pre-filled Message</label>
                     <textarea 
                        {...register('whatsappMessage')} 
                        className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl h-40" 
                        placeholder="Hello EMutex Nig, I am interested in [Product Name]. Please send me the price, details, and how to order." 
                     />
                     <p className="text-[10px] text-brand-grey italic">Leave empty to use global default message.</p>
                  </div>
               </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="px-8 py-6 bg-white border-t border-brand-champagne/20 flex justify-end gap-4 shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary px-8">Cancel</button>
          <button 
            type="submit" 
            form="product-form"
            disabled={isSubmitting}
            className="btn-primary px-12 flex items-center gap-2"
          >
            {isSubmitting ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-b-white"></span> : <Save size={18}/>}
            {product ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

