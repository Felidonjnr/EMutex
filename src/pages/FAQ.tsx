import { HelpCircle, MessageCircle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { DEFAULT_SETTINGS } from '../constants';
import SEO from '../components/SEO';

const faqs = [
  {
    q: "What does EMutex Nig sell?",
    a: "EMutex Nig sells carefully selected wellness and vitality products for Nigerian adults interested in daily energy support, body balance, confidence, and better self-care."
  },
  {
    q: "Is EMutex Nig based in Nigeria?",
    a: "Yes. EMutex Nig is proudly based in Uyo, Akwa Ibom State, Nigeria, and we serve customers across the entire country."
  },
  {
    q: "How do I know which product to choose?",
    a: "Message us on WhatsApp and tell us what kind of wellness support you are looking for. We'll guide you to a suitable product or bundle based on your goals."
  },
  {
    q: "Are these products medicine?",
    a: "No. EMutex Nig presents products as wellness support products, not as cures or replacements for medical treatment. They are designed to support a healthy lifestyle."
  },
  {
    q: "Can I order through WhatsApp?",
    a: "Yes. WhatsApp is our main ordering and support channel. You can ask about prices, product details, delivery, and payment directly there."
  },
  {
    q: "Do you deliver outside Uyo?",
    a: "Yes, we deliver nationwide. Delivery options and costs can be discussed on WhatsApp based on your specific location."
  },
  {
    q: "Can I buy a bundle instead of one product?",
    a: "Yes. We offer wellness bundles that combine multiple products for a more comprehensive wellness support routine. Check our Bundles page for current offers."
  },
  {
    q: "Can pregnant women or people on medication use these products?",
    a: "Anyone pregnant, nursing, taking medication, or managing a medical condition should speak with a qualified health professional before using any new wellness product."
  }
];

export default function FAQ() {
  return (
    <div className="min-h-screen pt-12 pb-24 space-y-16">
      <SEO 
        title="FAQ"
        description="Have questions about EMutex Nig? Check our frequently asked questions about our wellness products, ordering via WhatsApp, and nationwide delivery in Nigeria."
        url="https://emutexnig.com/faq"
      />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <h1 className="text-4xl lg:text-6xl italic"><span className="text-brand-gold font-serif">Frequently</span> Asked Questions</h1>
        <p className="text-brand-grey text-lg max-w-2xl mx-auto italic">
          Everything you need to know about our wellness products, ordering process, and support.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <motion.details
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="card group bg-brand-cream/50"
            >
              <summary className="p-6 lg:p-8 cursor-pointer flex items-center justify-between font-serif text-xl text-brand-emerald hover:text-brand-gold transition-all list-none">
                <span className="flex gap-4 items-center">
                  <HelpCircle size={24} className="text-brand-gold opacity-50" />
                  {faq.q}
                </span>
                <ChevronRight className="group-open:rotate-90 transition-transform text-brand-gold" />
              </summary>
              <div className="px-8 pb-8 lg:pl-16 text-brand-grey leading-relaxed text-lg border-t border-brand-champagne/10 pt-4">
                {faq.a}
              </div>
            </motion.details>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="card p-12 lg:p-20 bg-brand-emerald text-white space-y-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 blur-sm pointer-events-none">
            <MessageCircle size={300} />
          </div>
          <h2 className="text-3xl lg:text-4xl text-white">Still have <span className="text-brand-gold italic">more questions?</span></h2>
          <p className="text-brand-champagne/70 text-lg lg:text-xl">
            Our wellness specialists are ready to help you with detailed guidance and order processing.
          </p>
          <div className="pt-4">
            <button
              onClick={() => window.open(`https://wa.me/${DEFAULT_SETTINGS.whatsappNumber}`, '_blank')}
              className="btn-primary bg-brand-gold text-white px-12 py-5 text-xl inline-flex items-center gap-3 shadow-lg hover:shadow-brand-gold/20 transition-all font-bold"
            >
              <MessageCircle size={24} />
              Chat with us on WhatsApp
            </button>
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-sm mx-auto">
                <div className="flex items-center gap-2 text-[10px] text-brand-champagne uppercase tracking-widest justify-center">
                    <CheckCircle2 size={12} className="text-brand-gold" /> Fast Reply
                </div>
                <div className="flex items-center gap-2 text-[10px] text-brand-champagne uppercase tracking-widest justify-center">
                    <CheckCircle2 size={12} className="text-brand-gold" /> Easy Ordering
                </div>
                <div className="flex items-center gap-2 text-[10px] text-brand-champagne uppercase tracking-widest justify-center">
                    <CheckCircle2 size={12} className="text-brand-gold" /> Locally Trusted
                </div>
                <div className="flex items-center gap-2 text-[10px] text-brand-champagne uppercase tracking-widest justify-center">
                    <CheckCircle2 size={12} className="text-brand-gold" /> Real Support
                </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
