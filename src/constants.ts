import { WellnessNeed } from './types';

export const DEFAULT_SETTINGS = {
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER || '2348000000000',
  heroHeadline: 'Premium Wellness Support for Better Living',
  heroSubheadline: 'Carefully selected wellness and vitality products for Nigerian adults who want daily energy support, body balance, confidence, and better self-care.',
  tagline: 'EMutex Nig — Wellness Support for Better Living',
  locationText: 'Based in Uyo, Akwa Ibom — serving wellness-conscious adults across Nigeria.',
  finalCtaText: 'Chat with EMutex Nig on WhatsApp',
  defaultWhatsappMessage: 'Hello EMutex Nig, I saw your wellness products online. I would like to know more and choose a suitable product.',
  socialMediaLinks: {
    facebook: '',
    instagram: '',
    twitter: '',
  },
  businessAddress: 'Uyo, Akwa Ibom State, Nigeria',
  deliveryNote: 'Delivery available within and outside Uyo.',
};

export const WELLNESS_NEEDS: WellnessNeed[] = [
  {
    id: 'energy',
    title: 'Daily Energy Support',
    description: 'For adults who want support for their busy daily routine.',
    buttonText: 'Ask About Energy Support',
    whatsappTopic: 'Energy Support'
  },
  {
    id: 'vitality',
    title: 'Vitality & Confidence',
    description: 'For adults who want to feel refreshed, supported, and more confident in their wellness routine.',
    buttonText: 'Ask About Vitality Support',
    whatsappTopic: 'Vitality & Confidence'
  },
  {
    id: 'balance',
    title: 'Body Balance Support',
    description: 'For people interested in maintaining a better daily wellness routine.',
    buttonText: 'Ask About Body Balance',
    whatsappTopic: 'Body Balance'
  },
  {
    id: 'lifestyle',
    title: 'Stress & Lifestyle Support',
    description: 'For workers, traders, business owners, and busy adults managing daily pressure.',
    buttonText: 'Ask About Lifestyle Support',
    whatsappTopic: 'Stress & Lifestyle Support'
  }
];

export const CATEGORIES = [
  { id: 'vitality', name: 'Energy & Vitality Support', order: 1 },
  { id: 'daily', name: 'Daily Wellness Support', order: 2 },
  { id: 'routine', name: 'Coffee, Tea & Routine Products', order: 3 },
  { id: 'capsules', name: 'Capsules & Softgels', order: 4 },
  { id: 'bundles', name: 'Wellness Bundles', order: 5 },
];
