import { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl: string;
  galleryImages: string[];
  price: string;
  availability: 'In Stock' | 'Backorder' | 'Out of Stock';
  wellnessSupportPoints: string[];
  benefits: string[];
  bestFor: string;
  usageNote: string;
  disclaimer: string;
  faq: { question: string; answer: string }[];
  relatedProductIds: string[];
  relatedBundleIds: string[];
  featured: boolean;
  showOnHomepage: boolean;
  showInCatalogue: boolean;
  visible: boolean;
  productOrder: number;
  whatsappCtaText: string;
  whatsappMessage: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Bundle {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl: string;
  galleryImages: string[];
  category: string;
  price: string;
  availability: 'In Stock' | 'Backorder' | 'Out of Stock';
  includedProductIds: string[];
  includedProductSlugs: string[];
  includedItems: string[];
  benefits: string[];
  bestFor: string;
  usageNote: string;
  disclaimer: string;
  faq: { question: string; answer: string }[];
  featured: boolean;
  showOnHomepage: boolean;
  showInBundlesPage: boolean;
  visible: boolean;
  bundleOrder: number;
  order: number; // Backward compatibility
  whatsappCtaText: string;
  whatsappMessage: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Lead {
  id: string;
  fullName: string;
  whatsappNumber: string;
  location: string;
  productInterested: string;
  productSlug: string;
  sourcePage: string;
  createdAt: Timestamp;
  status: 'New' | 'Contacted' | 'Interested' | 'Ordered' | 'Not Ready' | 'Follow Up Later';
  notes: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface SiteSettings {
  whatsappNumber: string;
  heroHeadline: string;
  heroSubheadline: string;
  tagline: string;
  locationText: string;
  finalCtaText: string;
  defaultWhatsappMessage: string;
  socialMediaLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  businessAddress: string;
  deliveryNote: string;
}

export interface WellnessNeed {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  whatsappTopic: string;
}
