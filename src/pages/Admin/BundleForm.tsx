import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Bundle, Product } from '../../types';
import { X, Plus, Trash2, Save, ShoppingBag, Package, MessageCircle, Sparkles, Heart, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, generateSlug } from '../../lib/utils';

const bundleSchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z.string().min(2, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  category: z.string().default('Wellness Bundle'),
  shortDescription: z.string().min(5, "Short description is required"),
  fullDescription: z.string().min(10, "Full description is required"),
  imageUrl: z.string().url("Valid image URL is required"),
  galleryImages: z.array(z.string()).default([]),
  price: z.string().optional().default(''),
  availability: z.enum(['In Stock', 'Backorder', 'Out of Stock']).default('In Stock'),
  includedProductIds: z.array(z.string()).default([]),
  includedProductSlugs: z.array(z.string()).default([]),
  includedItems: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  bestFor: z.string().default(''),
  usageNote: z.string().default(''),
  disclaimer: z.string().default(''),
  faq: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).default([]),
  featured: z.boolean().default(false),
  showOnHomepage: z.boolean().default(false),
  showInBundlesPage: z.boolean().default(true),
  visible: z.boolean().default(true),
  bundleOrder: z.number().default(999),
  whatsappCtaText: z.string().default('Confirm Bundle Price on WhatsApp'),
  whatsappMessage: z.string().default(''),
});

type BundleFormData = z.infer<typeof bundleSchema>;

interface BundleFormProps {
  bundle: Bundle | null;
  products: Product[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BundleForm({ bundle, products, onClose, onSuccess }: BundleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'content' | 'items' | 'advanced' | 'whatsapp'>('basic');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, control, formState: { errors }, watch, setValue } = useForm<BundleFormData>({
    resolver: zodResolver(bundleSchema) as any,
    defaultValues: bundle ? {
      ...bundle,
      category: bundle.category || 'Wellness Bundle',
      bundleOrder: bundle.bundleOrder ?? bundle.order ?? 999,
      includedProductIds: bundle.includedProductIds || [],
      includedProductSlugs: bundle.includedProductSlugs || [],
      includedItems: bundle.includedItems && bundle.includedItems.length > 0 ? bundle.includedItems : [''],
      benefits: bundle.benefits && bundle.benefits.length > 0 ? bundle.benefits : [''],
      faq: bundle.faq && bundle.faq.length > 0 ? bundle.faq : [{ question: '', answer: '' }]
    } as any : {
      name: '',
      slug: '',
      category: 'Wellness Bundle',
      shortDescription: '',
      fullDescription: '',
      imageUrl: '',
      galleryImages: [],
      price: '',
      availability: 'In Stock',
      includedProductIds: [],
      includedProductSlugs: [],
      includedItems: [''],
      benefits: [''],
      bestFor: '',
      usageNote: '',
      disclaimer: '',
      faq: [{ question: '', answer: '' }],
      featured: false,
      showOnHomepage: false,
      showInBundlesPage: true,
      visible: true,
      bundleOrder: 999,
      whatsappCtaText: 'Confirm Bundle Price on WhatsApp',
      whatsappMessage: '',
    }
  });

  const { fields: manualFields, append: appendManual, remove: removeManual } = useFieldArray({ 
    control, 
    name: 'includedItems' as never
  });

  const { fields: benefitFields, append: appendBenefit, remove: removeBenefit } = useFieldArray({ 
    control, 
    name: 'benefits' as never
  });

  const { fields: faqFields, append: appendFAQ, remove: removeFAQ } = useFieldArray({ 
    control, 
    name: 'faq' as never
  });

  const selectedProductIds = (watch('includedProductIds') || []) as string[];

  const toggleProductSelection = (productId: string, productSlug: string) => {
    const currentIds = [...selectedProductIds];
    const currentSlugs = [...(watch('includedProductSlugs') || [])];
    
    const idIndex = currentIds.indexOf(productId);
    if (idIndex > -1) {
      currentIds.splice(idIndex, 1);
      const slugIndex = currentSlugs.indexOf(productSlug);
      if (slugIndex > -1) currentSlugs.splice(slugIndex, 1);
    } else {
      currentIds.push(productId);
      currentSlugs.push(productSlug);
    }
    
    setValue('includedProductIds', currentIds);
    setValue('includedProductSlugs', currentSlugs);
  };

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      
      const formData = data as BundleFormData;
      // Force clean slug generation if missing or if user keeps it same as name but with bad chars
      const finalSlug = generateSlug(formData.slug && formData.slug.trim() !== '' ? formData.slug : formData.name);
      
      // Clean up inputs
      const payload = {
        ...formData,
        slug: finalSlug,
        includedItems: formData.includedItems.filter(item => item.trim() !== ''),
        benefits: formData.benefits.filter(item => item.trim() !== ''),
        faq: formData.faq.filter(item => item.question.trim() !== '' && item.answer.trim() !== ''),
        updatedAt: serverTimestamp(),
      };

      if (!db) {
        throw new Error("Database not initialized. Please check your Firebase configuration.");
      }

      if (bundle) {
        await updateDoc(doc(db, 'bundles', bundle.id), payload);
      } else {
        await addDoc(collection(db, 'bundles'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      onSuccess();
    } catch (error: any) {
      console.error('Bundle save error:', error);
      setSubmitError(error.message || String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const name = watch('name');
  const autoSlugValue = generateSlug(name || '');

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
            <h2 className="text-2xl font-serif font-bold text-brand-emerald">{bundle ? 'Edit Bundle' : 'Add New Bundle'}</h2>
            <p className="text-xs text-brand-grey">Combine products and items into a curated wellness set.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-mist rounded-full transition-colors"><X/></button>
        </div>

        {/* Tabs */}
        <div className="px-8 bg-white border-b border-brand-champagne/10 flex gap-8 shrink-0 overflow-x-auto">
          {(['basic', 'content', 'items', 'advanced', 'whatsapp'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap",
                activeTab === tab ? "border-brand-gold text-brand-gold" : "border-transparent text-brand-grey hover:text-brand-charcoal"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form id="bundle-form" onSubmit={handleSubmit(onSubmit)} className="flex-grow overflow-y-auto p-8 lg:p-12 space-y-12">
          {submitError && (
            <div className="p-4 bg-red-100 border border-red-200 text-red-700 rounded-xl mb-6">
              <p className="font-bold text-sm">Save Failed:</p>
              <pre className="text-xs whitespace-pre-wrap mt-1">{submitError}</pre>
            </div>
          )}

          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                 <h3 className="text-lg font-serif font-bold border-l-4 border-brand-gold pl-4">Basic Information</h3>
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-brand-emerald">Bundle Name</label>
                       <input {...register('name')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl" placeholder="e.g. Daily Vitality Bundle" />
                       <button type="button" onClick={() => setValue('slug', autoSlugValue)} className="text-[10px] text-brand-gold hover:underline mt-1">Auto-generate slug</button>
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-brand-emerald">Slug (URL snippet)</label>
                       <input {...register('slug')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl" placeholder="daily-vitality-bundle" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-brand-emerald">Availability</label>
                           <select {...register('availability')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl">
                              <option value="In Stock">In Stock</option>
                              <option value="Backorder">Backorder</option>
                              <option value="Out of Stock">Out of Stock</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-brand-emerald">Display Order (0 is first)</label>
                           <input type="number" {...register('bundleOrder', { valueAsNumber: true })} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-xs font-bold text-brand-emerald">Category</label>
                          <input {...register('category')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl" placeholder="e.g. Wellness Bundle" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-xs font-bold text-brand-emerald">Price (Optional)</label>
                          <input {...register('price')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl" placeholder="e.g. 45,000" />
                       </div>
                    </div>
                 </div>
              </div>
              <div className="space-y-6">
                 <h3 className="text-lg font-serif font-bold border-l-4 border-brand-emerald pl-4">Media & Visibility</h3>
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-brand-emerald">Bundle Image URL</label>
                       <input {...register('imageUrl')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl" placeholder="https://..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                       <label className="flex items-center gap-3 p-4 bg-white border border-brand-champagne/10 rounded-xl cursor-pointer">
                          <input type="checkbox" {...register('visible')} className="w-5 h-5 text-brand-emerald rounded" />
                          <span className="text-xs font-bold text-brand-emerald">Publicly Visible</span>
                       </label>
                       <label className="flex items-center gap-3 p-4 bg-white border border-brand-champagne/10 rounded-xl cursor-pointer">
                          <input type="checkbox" {...register('featured')} className="w-5 h-5 text-brand-emerald rounded" />
                          <span className="text-xs font-bold text-brand-emerald">Featured</span>
                       </label>
                       <label className="flex items-center gap-3 p-4 bg-white border border-brand-champagne/10 rounded-xl cursor-pointer">
                          <input type="checkbox" {...register('showOnHomepage')} className="w-5 h-5 text-brand-emerald rounded" />
                          <span className="text-xs font-bold text-brand-emerald">Show on Home</span>
                       </label>
                       <label className="flex items-center gap-3 p-4 bg-white border border-brand-champagne/10 rounded-xl cursor-pointer">
                          <input type="checkbox" {...register('showInBundlesPage')} className="w-5 h-5 text-brand-emerald rounded" />
                          <span className="text-xs font-bold text-brand-emerald">Show on Bundles</span>
                       </label>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-8">
               <div className="space-y-4">
                  <label className="text-xs font-bold text-brand-emerald">Short Description (for cards)</label>
                  <textarea {...register('shortDescription')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl h-24" />
               </div>
               <div className="space-y-4">
                  <label className="text-xs font-bold text-brand-emerald">Full Description (Markdown supported)</label>
                  <textarea {...register('fullDescription')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl h-64 font-mono text-sm" />
               </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="text-lg font-serif font-bold flex items-center gap-2">
                        <ShoppingBag size={20} className="text-brand-gold" />
                        Linked Products
                     </h3>
                     <span className="text-[10px] font-bold text-brand-grey uppercase">Catalogue Selection</span>
                  </div>
                  <p className="text-xs text-brand-grey mb-4">Select existing products to link them to this bundle.</p>
                  <div className="h-[400px] overflow-y-auto pr-2 space-y-2 border border-brand-champagne/10 rounded-xl p-2 bg-white/50">
                     {products.length > 0 ? products.map(product => {
                        const isSelected = selectedProductIds.includes(product.id);
                        return (
                           <div 
                              key={product.id} 
                              onClick={() => toggleProductSelection(product.id, product.slug)}
                              className={cn(
                                 "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                 isSelected ? "bg-brand-emerald text-white border-brand-emerald" : "bg-white border-brand-champagne/20 hover:border-brand-gold"
                              )}
                           >
                              <div className="w-10 h-10 rounded-lg bg-brand-mist/20 overflow-hidden shrink-0">
                                 {product.imageUrl ? <img src={product.imageUrl} alt="" className="w-full h-full object-cover" /> : <Package className="w-full h-full p-2 text-brand-gold" />}
                              </div>
                              <div className="flex-grow">
                                 <p className={cn("text-sm font-bold", isSelected ? "text-white" : "text-brand-charcoal")}>{product.name}</p>
                                 <p className={cn("text-[10px]", isSelected ? "text-white/60" : "text-brand-grey")}>{product.category}</p>
                              </div>
                              {isSelected && <div className="w-5 h-5 bg-white text-brand-emerald rounded-full flex items-center justify-center text-[10px] font-bold">✓</div>}
                           </div>
                        );
                     }) : (
                        <p className="text-center text-xs text-brand-grey py-10">No products available in catalogue.</p>
                     )}
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="text-lg font-serif font-bold flex items-center gap-2">
                        <Plus size={20} className="text-brand-gold" />
                        Manual Items
                     </h3>
                     <button type="button" onClick={() => appendManual('')} className="p-1 bg-brand-gold text-white rounded-lg"><Plus size={16}/></button>
                  </div>
                  <p className="text-xs text-brand-grey mb-4">Add items manually that aren't in your product catalogue.</p>
                  <div className="space-y-3">
                     {manualFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2">
                           <input 
                              {...register(`includedItems.${index}` as any)} 
                              placeholder="e.g. VMAX Product A"
                              className="flex-grow px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl text-sm" 
                           />
                           <button type="button" onClick={() => removeManual(index)} className="text-red-400 p-2"><Trash2 size={18}/></button>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <h3 className="text-lg font-serif font-bold flex items-center gap-2">
                          <Sparkles size={20} className="text-brand-gold" /> Key Benefits
                       </h3>
                       <button type="button" onClick={() => appendBenefit('')} className="p-1 bg-brand-gold text-white rounded-lg"><Plus size={16}/></button>
                    </div>
                    <div className="space-y-3">
                       {benefitFields.map((field, index) => (
                          <div key={field.id} className="flex gap-2">
                             <input 
                                {...register(`benefits.${index}` as any)} 
                                placeholder="e.g. Boosts Daily Energy"
                                className="flex-grow px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl text-sm" 
                             />
                             <button type="button" onClick={() => removeBenefit(index)} className="text-red-400 p-2"><Trash2 size={18}/></button>
                          </div>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-serif font-bold flex items-center gap-2">
                       <Heart size={20} className="text-brand-gold" /> Targeted Towards
                    </h3>
                    <textarea 
                      {...register('bestFor')} 
                      placeholder="e.g. Busy professionals looking for natural stamina boost."
                      className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl h-32"
                    />
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-serif font-bold flex items-center gap-2">
                       <Plus size={20} className="text-brand-gold" /> Usage & Disclaimer
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-brand-grey uppercase">Usage Note</label>
                        <textarea {...register('usageNote')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl h-24" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-brand-grey uppercase">Disclaimer</label>
                        <textarea {...register('disclaimer')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl h-24" />
                      </div>
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="text-lg font-serif font-bold flex items-center gap-2">
                        FAQ Section
                     </h3>
                     <button type="button" onClick={() => appendFAQ({ question: '', answer: '' })} className="p-1 bg-brand-gold text-white rounded-lg"><Plus size={16}/></button>
                  </div>
                  <div className="space-y-4">
                     {faqFields.map((field, index) => (
                        <div key={field.id} className="p-4 bg-white border border-brand-champagne/20 rounded-2xl space-y-3 relative">
                           <button type="button" onClick={() => removeFAQ(index)} className="absolute top-2 right-2 text-red-400 p-1"><X size={14}/></button>
                           <input 
                              {...register(`faq.${index}.question` as any)} 
                              placeholder="Question"
                              className="w-full px-3 py-2 bg-brand-mist/20 border border-brand-champagne/10 rounded-lg text-sm font-bold" 
                           />
                           <textarea 
                              {...register(`faq.${index}.answer` as any)} 
                              placeholder="Answer"
                              className="w-full px-3 py-2 bg-brand-mist/10 border border-brand-champagne/10 rounded-lg text-sm h-20" 
                           />
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="max-w-2xl mx-auto space-y-8 py-10">
               <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-brand-gold/10 text-brand-gold rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle size={32} />
                  </div>
                  <h3 className="text-2xl font-serif">WhatsApp Customization</h3>
                  <p className="text-brand-grey">How users contact you about this bundle.</p>
               </div>

               <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald">CTA Button Text</label>
                    <input {...register('whatsappCtaText')} className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald">Automatic Message Template</label>
                    <textarea 
                       {...register('whatsappMessage')} 
                       className="w-full px-4 py-3 bg-white border border-brand-champagne/30 rounded-xl h-48" 
                    />
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
            form="bundle-form"
            disabled={isSubmitting}
            className="btn-primary px-12 flex items-center gap-2"
          >
            {isSubmitting ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-b-white"></span> : <Save size={18}/>}
            {bundle ? 'Save Changes' : 'Create Bundle'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
