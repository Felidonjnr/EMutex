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
        // Deep merge or at least shallow merge top level objects to ensure all fields are present
        // using fallback for missing sections
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

        // Special handling for howToOrder.steps if they are in Firestore
        if (data.howToOrder?.steps) {
            mergedContent.howToOrder.steps = data.howToOrder.steps;
        }

        setContent(mergedContent);
      } else {
        setContent(fallbackContent);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching site content from Firestore:', error);
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
