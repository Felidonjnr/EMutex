import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { siteContent as fallbackContent } from '../data/siteContent';

type SiteContent = typeof fallbackContent;

interface SiteContentContextType {
  content: SiteContent;
  loading: boolean;
}

const SiteContentContext = createContext<SiteContentContextType>({
  content: fallbackContent,
  loading: true,
});

export const useSiteContent = () => useContext(SiteContentContext);

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(fallbackContent);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'settings', 'siteContent');
    
    // Use onSnapshot for real-time updates when content changes in admin
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<SiteContent>;
        const mergedContent = {
          ...fallbackContent,
          brand: { ...fallbackContent.brand, ...data.brand },
          hero: { ...fallbackContent.hero, ...data.hero },
          trust: { ...fallbackContent.trust, ...data.trust },
          about: { ...fallbackContent.about, ...data.about },
          categories: { ...fallbackContent.categories, ...data.categories },
          howToOrder: { ...fallbackContent.howToOrder, ...data.howToOrder },
          finalCta: { ...fallbackContent.finalCta, ...data.finalCta },
          leadForm: { ...fallbackContent.leadForm, ...data.leadForm },
          contact: { ...fallbackContent.contact, ...data.contact },
          social: { ...fallbackContent.social, ...data.social },
        } as SiteContent;

        if (data.howToOrder?.steps) {
            mergedContent.howToOrder.steps = data.howToOrder.steps;
        }

        setContent(mergedContent);
      }
      setLoading(false);
    }, (error) => {
      // Graceful fallback if Firebase is not configured or permissions denied
      console.warn('Firestore siteContent access issues. Using local fallback.', error.message);
      setContent(fallbackContent);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <SiteContentContext.Provider value={{ content, loading }}>
      {children}
    </SiteContentContext.Provider>
  );
}
