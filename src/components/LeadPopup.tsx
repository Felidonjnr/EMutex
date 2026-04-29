import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, CheckCircle2, User, Phone, MapPin, Package, AlertCircle, MessageCircle, ArrowRight, ExternalLink, Sparkles, ShoppingBag } from 'lucide-react';
import { submitLeadToGoogleForm } from '../lib/googleForm';
import { siteContent } from '../data/siteContent';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      productInterested: productName
    }
  });

  useEffect(() => {
    let triggered = false;
    const hasSubmitted = localStorage.getItem(`lead_submitted_${productSlug}`);
    if (hasSubmitted) return;

    const triggerPopup = () => {
      if (!triggered) {
        setIsVisible(true);
        triggered = true;
      }
    };

    // 1. Exit Intent (mouse moves out of viewport)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) triggerPopup();
    };

    // 2. Scroll Depth (50% down)
    const handleScroll = () => {
      const scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      if (scrollPercent > 0.5) triggerPopup();
    };

    // 3. Time fallback (15 seconds)
    const timer = setTimeout(triggerPopup, 15000);

    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [productSlug]);

  useEffect(() => {
    setValue('productInterested', productName);
  }, [productName, setValue]);

  const whatsappMessage = `Hello EMutex Nig, I just submitted my details for ${productName} on your website. Please send me the price and delivery options.`;
  const whatsappUrl = `https://wa.me/${siteContent.contact.whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  const onSubmit = async (data: LeadFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
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
          console.error('Firestore save failed:', fsError);
        }
      }

      await submitLeadToGoogleForm({ ...data });
      setIsSubmitted(true);
      localStorage.setItem(`lead_submitted_${productSlug}`, 'true');
    } catch (error) {
      console.error('Lead submission error:', error);
      setError("Something went wrong. Please try messaging us directly on WhatsApp instead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#0E3B2E]/40 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05, y: 0 }}
            className="bg-[#FFFDF8] rounded-[32px] max-w-lg w-full relative overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-brand-gold/10"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-gold" />
            
            <button
              onClick={() => setIsVisible(false)}
              className="absolute top-6 right-6 p-2 text-brand-grey hover:text-[#0E3B2E] hover:bg-brand-mist rounded-full transition-all z-10"
            >
              <X size={22} />
            </button>

            <div className="p-8 lg:p-12 space-y-8">
              {!isSubmitted ? (
                <>
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-gold/10 rounded-full">
                      <Sparkles size={14} className="text-brand-gold" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold">Product Inquiry</span>
                    </div>
                    <h2 className="text-3xl lg:text-4xl font-serif text-[#0E3B2E] leading-tight">
                      Interested in <span className="text-brand-gold italic">this product?</span>
                    </h2>
                    <p className="text-brand-grey text-sm lg:text-base leading-relaxed">
                      Send your details and we’ll follow up with price, availability, and delivery information.
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-600 text-sm">
                      <AlertCircle size={18} className="shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#0E3B2E] uppercase tracking-widest ml-1">Full Name</label>
                        <div className="relative">
                          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold" />
                          <input
                            {...register('fullName')}
                            className="w-full pl-11 pr-5 py-4 bg-white border border-brand-champagne/40 rounded-2xl focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all placeholder:text-brand-grey/40 text-sm"
                            placeholder="Your name"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#0E3B2E] uppercase tracking-widest ml-1">WhatsApp</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold" />
                          <input
                            {...register('whatsappNumber')}
                            className="w-full pl-11 pr-5 py-4 bg-white border border-brand-champagne/40 rounded-2xl focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all placeholder:text-brand-grey/40 text-sm"
                            placeholder="080..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#0E3B2E] uppercase tracking-widest ml-1">Location</label>
                      <div className="relative">
                        <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold" />
                        <input
                          {...register('location')}
                          className="w-full pl-11 pr-5 py-4 bg-white border border-brand-champagne/40 rounded-2xl focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all placeholder:text-brand-grey/40 text-sm"
                          placeholder="City, State"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4.5 mt-4 bg-[#0E3B2E] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:shadow-brand-emerald/20 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? "Processing..." : (
                        <>
                          Submit Interest
                          <ArrowRight size={20} />
                        </>
                      )}
                    </button>
                    <p className="text-center text-[10px] text-brand-grey/60 uppercase tracking-widest font-medium">
                      🔒 Your information is private and secure
                    </p>
                  </form>
                </>
              ) : (
                <div className="text-center py-4 space-y-8">
                  <div className="w-24 h-24 bg-brand-mist rounded-full flex items-center justify-center mx-auto text-brand-emerald relative">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 bg-brand-emerald/10 rounded-full animate-ping"
                    />
                    <CheckCircle2 size={48} className="relative z-10" />
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-3xl font-serif text-[#0E3B2E]">Details Received</h3>
                    <p className="text-brand-grey leading-relaxed">
                      Thank you. Your details have been received. You can continue viewing or message us now to confirm price and delivery.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4.5 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:bg-emerald-700 transition-all group"
                    >
                      <MessageCircle size={22} />
                      Message on WhatsApp
                      <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <button
                      onClick={() => setIsVisible(false)}
                      className="w-full py-4 bg-[#FAF7F0] text-[#0E3B2E] rounded-2xl font-bold border border-brand-champagne/30 hover:bg-white transition-all shadow-sm"
                    >
                      Continue Viewing Product
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
