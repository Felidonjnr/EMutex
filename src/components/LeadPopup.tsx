import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, CheckCircle2, User, Phone, MapPin, Package, AlertCircle, MessageCircle } from 'lucide-react';
import { submitLeadToGoogleForm } from '../lib/googleForm';
import { useSiteContent } from '../context/SiteContentContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

const leadSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),
  whatsappNumber: z.string().min(10, "Please enter your WhatsApp number."),
  location: z.string().min(2, "Please enter your location."),
  productInterested: z.string().min(1, "Product is required"),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadPopupProps {
  productName: string;
  productSlug: string;
}

export default function LeadPopup({ productName, productSlug }: LeadPopupProps) {
  const { content } = useSiteContent();
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      productInterested: productName
    }
  });

  useEffect(() => {
    // Show after 7 seconds
    const timer = setTimeout(() => {
      const hasSubmitted = localStorage.getItem(`lead_submitted_${productSlug}`);
      if (!hasSubmitted) {
        setIsVisible(true);
      }
    }, 7000);

    return () => clearTimeout(timer);
  }, [productSlug]);

  // Ensure product name is updated if it changes
  useEffect(() => {
    setValue('productInterested', productName);
  }, [productName, setValue]);

  const handleWhatsAppFallback = () => {
    const message = `Hello ${content.brand.name}, I was trying to submit my interest for ${productName} on your website but encountered an error. I would like to know more.`;
    const url = `https://wa.me/${content.contact.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const onSubmit = async (data: LeadFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // 1. Save to Firestore for the Admin Dashboard
      if (db) {
        try {
          await addDoc(collection(db, 'leads'), {
            ...data,
            productSlug,
            sourcePage: window.location.pathname,
            status: 'New',
            createdAt: serverTimestamp(),
          });
        } catch (fsError) {
          console.error('Firestore lead save error:', fsError);
          // We continue to Google Form fallback even if Firestore fails
        }
      }

      // 2. Submit to Google Form (Legacy/Secondary backup)
      const success = await submitLeadToGoogleForm({
        ...data,
      });

      if (success || db) { // If either succeeded, we're good
        setIsSubmitted(true);
        localStorage.setItem(`lead_submitted_${productSlug}`, 'true');
        // Close after 5 seconds on success
        setTimeout(() => setIsVisible(false), 5000);
      } else {
        setError(content.leadForm.errorMessage);
      }
    } catch (error) {
      console.error('Lead submission error:', error);
      setError(content.leadForm.errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-charcoal/40 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-[#FFFDF8] rounded-[24px] max-w-lg w-full relative overflow-hidden shadow-2xl border border-brand-gold/20"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-brand-gold" />
            
            <button
              onClick={() => setIsVisible(false)}
              className="absolute top-5 right-5 p-2 text-brand-grey hover:text-brand-charcoal hover:bg-brand-mist rounded-full transition-all z-10"
            >
              <X size={20} />
            </button>

            <div className="p-8 lg:p-10 space-y-6">
              {!isSubmitted ? (
                <>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-serif text-[#0E3B2E] leading-tight">
                      {content.leadForm.headline}
                    </h2>
                    <p className="text-brand-grey text-sm leading-relaxed">
                      {content.leadForm.text}
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-3">
                      <div className="flex gap-3 text-red-600 text-sm items-start">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <p>{error}</p>
                      </div>
                      <button
                        onClick={handleWhatsAppFallback}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium"
                      >
                        <MessageCircle size={16} />
                        {content.leadForm.errorWhatsappButton}
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#0E3B2E] uppercase tracking-widest flex items-center gap-2 ml-1">
                        <User size={12} className="text-brand-gold" /> Full Name
                      </label>
                      <input
                        {...register('fullName')}
                        className="w-full px-5 py-3.5 bg-white border border-brand-champagne/30 rounded-2xl focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all placeholder:text-brand-grey/40"
                        placeholder="Your full name"
                      />
                      {errors.fullName && <p className="text-red-500 text-[10px] mt-1 font-medium ml-1">{errors.fullName.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#0E3B2E] uppercase tracking-widest flex items-center gap-2 ml-1">
                        <Phone size={12} className="text-brand-gold" /> WhatsApp Number
                      </label>
                      <input
                        {...register('whatsappNumber')}
                        className="w-full px-5 py-3.5 bg-white border border-brand-champagne/30 rounded-2xl focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all placeholder:text-brand-grey/40"
                        placeholder="e.g. 08012345678"
                      />
                      {errors.whatsappNumber && <p className="text-red-500 text-[10px] mt-1 font-medium ml-1">{errors.whatsappNumber.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#0E3B2E] uppercase tracking-widest flex items-center gap-2 ml-1">
                        <MapPin size={12} className="text-brand-gold" /> Location
                      </label>
                      <input
                        {...register('location')}
                        className="w-full px-5 py-3.5 bg-white border border-brand-champagne/30 rounded-2xl focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all placeholder:text-brand-grey/40"
                        placeholder="Your city and state"
                      />
                      {errors.location && <p className="text-red-500 text-[10px] mt-1 font-medium ml-1">{errors.location.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#0E3B2E] uppercase tracking-widest flex items-center gap-2 ml-1 opacity-60">
                        <Package size={12} className="text-brand-gold" /> Product Interested In
                      </label>
                      <input
                        {...register('productInterested')}
                        readOnly
                        className="w-full px-5 py-3.5 bg-brand-mist/20 border border-brand-champagne/20 rounded-2xl text-brand-grey/70 cursor-not-allowed outline-none font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 mt-4 bg-[#0E3B2E] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-brand-emerald/10 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? content.leadForm.submittingButton : (
                        <>
                          {content.leadForm.submitButton}
                          <Send size={18} />
                        </>
                      )}
                    </button>
                    <p className="text-center text-[10px] text-brand-grey italic">
                      {content.leadForm.privacyNote}
                    </p>
                  </form>
                </>
              ) : (
                <div className="text-center py-8 space-y-6">
                  <div className="w-20 h-20 bg-brand-mist/50 rounded-full flex items-center justify-center mx-auto text-brand-emerald">
                    <CheckCircle2 size={48} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-serif text-[#0E3B2E]">Details Received</h3>
                    <p className="text-brand-grey leading-relaxed">
                      {content.leadForm.successMessage}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsVisible(false)}
                    className="w-full py-4 bg-[#FAF7F0] text-[#0E3B2E] rounded-2xl font-bold border border-[#0E3B2E]/10 hover:bg-white transition-all shadow-sm"
                  >
                    Continue Viewing Product
                  </button>
                </div>
              )}
            </div>
            
            {/* Background design elements */}
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-brand-gold/5 rounded-full pointer-events-none" />
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-brand-gold/5 rounded-full pointer-events-none" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
