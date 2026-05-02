import { serverTimestamp } from 'firebase/firestore';
import { generateSlug } from './utils';

export const FALLBACK_BUNDLE_IMAGE = 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800';

export function parseBoolean(val: any, defaultVal: boolean): boolean {
  if (val === undefined || val === null || val === '') return defaultVal;
  const s = String(val).toLowerCase().trim();
  if (['true', 'yes', '1', 'y', 'on'].includes(s)) return true;
  if (['false', 'no', '0', 'n', 'off'].includes(s)) return false;
  return defaultVal;
}

export function normalizeBundleInput(raw: any) {
  const name = String(raw.name || '').trim();
  const slug = generateSlug(name);
  
  const category = String(raw.category || '').trim() || 'Wellness Bundle';
  const shortDescription = String(raw.shortDescription || raw.shortdescription || '').trim() || 'A carefully selected wellness bundle for better living.';
  const fullDescription = String(raw.fullDescription || raw.fulldescription || '').trim() || shortDescription;
  const imageUrl = String(raw.imageUrl || raw.imageurl || '').trim() || FALLBACK_BUNDLE_IMAGE;
  
  const galleryImagesRaw = raw.galleryImages || raw.galleryimages || [];
  const galleryImages = Array.isArray(galleryImagesRaw) 
    ? galleryImagesRaw.filter(Boolean) 
    : String(galleryImagesRaw).split('|').map(s => s.trim()).filter(Boolean);
    
  const price = String(raw.price || '').trim() || 'Confirm on WhatsApp';
  
  let availability = String(raw.availability || '').trim() || 'In Stock';
  if (!['In Stock', 'Backorder', 'Out of Stock'].includes(availability)) availability = 'In Stock';
  
  const includedItemsRaw = raw.includedItems || raw.includeditems || [];
  const includedItems = Array.isArray(includedItemsRaw)
    ? includedItemsRaw.filter(Boolean)
    : String(includedItemsRaw).split('|').map(s => s.trim()).filter(Boolean);
    
  const includedProductSlugsRaw = raw.includedProductSlugs || raw.includedproductslugs || [];
  const includedProductSlugs = Array.isArray(includedProductSlugsRaw)
    ? includedProductSlugsRaw.filter(Boolean)
    : String(includedProductSlugsRaw).split('|').map(s => s.trim()).filter(Boolean);
    
  const includedProductIds = Array.isArray(raw.includedProductIds) ? raw.includedProductIds : [];
  
  const benefitsRaw = raw.benefits || [];
  const benefits = Array.isArray(benefitsRaw)
    ? benefitsRaw.filter(Boolean)
    : String(benefitsRaw).split('|').map(s => s.trim()).filter(Boolean);
    
  const bestFor = String(raw.bestFor || raw.bestfor || '').trim();
  const usageNote = String(raw.usageNote || raw.usagenote || '').trim();
  const disclaimer = String(raw.disclaimer || '').trim() || "This product bundle is for wellness support. Please confirm current details on WhatsApp before ordering.";
  
  const faq: { question: string; answer: string }[] = [];
  const faqRaw = raw.faq || [];
  if (Array.isArray(faqRaw)) {
    faqRaw.forEach((f: any) => {
      if (f.question?.trim() && f.answer?.trim()) {
        faq.push({ question: f.question.trim(), answer: f.answer.trim() });
      }
    });
  } else if (typeof faqRaw === 'string') {
    const pairs = faqRaw.split('|').filter(Boolean);
    pairs.forEach((pair: string) => {
      const [q, a] = pair.split('::');
      if (q && a) faq.push({ question: q.trim(), answer: a.trim() });
    });
  }
  
  const featured = parseBoolean(raw.featured, false);
  const showOnHomepage = parseBoolean(raw.showOnHomepage || raw.showonhomepage, false);
  const showInBundlesPage = parseBoolean(raw.showInBundlesPage || raw.showinbundlespage, true);
  const visible = parseBoolean(raw.visible, true);
  
  const orderVal = raw.bundleOrder ?? raw.order ?? 999;
  const bundleOrder = parseInt(String(orderVal)) || 999;
  
  const whatsappCtaText = String(raw.whatsappCtaText || raw.whatsappctatext || '').trim() || 'Confirm Bundle Price on WhatsApp';
  
  let whatsappMessage = String(raw.whatsappMessage || raw.whatsappmessage || '').trim();
  if (!whatsappMessage && name) {
    whatsappMessage = `Hello EMutex Nig, I am interested in the ${name}. Please send me the current bundle price, products included, delivery options, and how I can order.`;
  } else if (whatsappMessage) {
    whatsappMessage = whatsappMessage.replace('[Bundle Name]', name);
  }

  return {
    name,
    slug,
    category,
    shortDescription,
    fullDescription,
    imageUrl,
    galleryImages,
    price,
    availability,
    includedProductIds,
    includedProductSlugs,
    includedItems,
    benefits,
    bestFor,
    usageNote,
    disclaimer,
    faq,
    featured,
    showOnHomepage,
    showInBundlesPage,
    visible,
    bundleOrder,
    order: bundleOrder, // Backward compatibility
    whatsappCtaText,
    whatsappMessage,
    updatedAt: serverTimestamp(),
  };
}
