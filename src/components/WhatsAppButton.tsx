import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { siteContent } from '../data/siteContent';
import { useLocation } from 'react-router-dom';

export default function WhatsAppButton() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/em-admin');

  if (isAdminPage) return null;

  const handleWhatsAppClick = () => {
    const url = `https://wa.me/${siteContent.contact.whatsappNumber}?text=${encodeURIComponent(siteContent.finalCta.subtitle)}`;
    window.open(url, '_blank');
  };

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 z-40 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle size={28} />
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-medium whitespace-nowrap">
        Chat with us
      </span>
    </motion.button>
  );
}
