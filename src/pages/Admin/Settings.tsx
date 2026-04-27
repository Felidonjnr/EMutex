import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import AdminLayout from '../../components/layout/AdminLayout';
import { SiteSettings } from '../../types';
import { DEFAULT_SETTINGS } from '../../constants';
import { Save, MessageSquare, Globe, MapPin, Tag } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as SiteSettings);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'settings/global');
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await setDoc(doc(db, 'settings', 'global'), {
        ...settings,
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/global');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof SiteSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return (
     <AdminLayout>
        <div className="flex items-center justify-center h-64">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-emerald"></div>
        </div>
     </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="max-w-4xl space-y-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif">Site Settings</h1>
          <p className="text-brand-grey">Update global content and contact information.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
           {/* WhatsApp Section */}
           <div className="card bg-white p-8 space-y-6">
              <div className="flex items-center gap-3 text-emerald-600 border-b border-brand-champagne/10 pb-4">
                 <MessageSquare size={24} />
                 <h2 className="text-xl font-bold font-serif">WhatsApp Configuration</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">WhatsApp Number (with country code)</label>
                    <input 
                      type="text" 
                      value={settings.whatsappNumber}
                      onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                      placeholder="e.g. 2348000000000"
                      className="w-full px-4 py-3 bg-brand-ivory border border-brand-champagne/30 rounded-xl"
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Final CTA Button Text</label>
                    <input 
                      type="text" 
                      value={settings.finalCtaText}
                      onChange={(e) => handleChange('finalCtaText', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory border border-brand-champagne/30 rounded-xl"
                    />
                 </div>
                 <div className="col-span-full space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Default Pre-filled Message</label>
                    <textarea 
                      value={settings.defaultWhatsappMessage}
                      onChange={(e) => handleChange('defaultWhatsappMessage', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory border border-brand-champagne/30 rounded-xl h-24"
                    />
                 </div>
              </div>
           </div>

           {/* Brand & Hero Section */}
           <div className="card bg-white p-8 space-y-6">
              <div className="flex items-center gap-3 text-brand-gold border-b border-brand-champagne/10 pb-4">
                 <Globe size={24} />
                 <h2 className="text-xl font-bold font-serif">Homepage & Brand</h2>
              </div>
              <div className="space-y-6">
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Hero Headline</label>
                    <input 
                      type="text" 
                      value={settings.heroHeadline}
                      onChange={(e) => handleChange('heroHeadline', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory border border-brand-champagne/30 rounded-xl font-bold"
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Hero Sub-headline</label>
                    <textarea 
                      value={settings.heroSubheadline}
                      onChange={(e) => handleChange('heroSubheadline', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory border border-brand-champagne/30 rounded-xl h-32"
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Brand Tagline</label>
                       <input 
                         type="text" 
                         value={settings.tagline}
                         onChange={(e) => handleChange('tagline', e.target.value)}
                         className="w-full px-4 py-3 bg-brand-ivory border border-brand-champagne/30 rounded-xl"
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Location Trust Line</label>
                       <input 
                         type="text" 
                         value={settings.locationText}
                         onChange={(e) => handleChange('locationText', e.target.value)}
                         className="w-full px-4 py-3 bg-brand-ivory border border-brand-champagne/30 rounded-xl"
                       />
                    </div>
                 </div>
              </div>
           </div>

           {/* Business & Logistics */}
           <div className="card bg-white p-8 space-y-6">
              <div className="flex items-center gap-3 text-brand-charcoal border-b border-brand-champagne/10 pb-4">
                 <MapPin size={24} />
                 <h2 className="text-xl font-bold font-serif">Business & Logistics</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Business Address</label>
                    <input 
                      type="text" 
                      value={settings.businessAddress}
                      onChange={(e) => handleChange('businessAddress', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory border border-brand-champagne/30 rounded-xl"
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Delivery Information Note</label>
                    <input 
                      type="text" 
                      value={settings.deliveryNote}
                      onChange={(e) => handleChange('deliveryNote', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory border border-brand-champagne/30 rounded-xl"
                    />
                 </div>
              </div>
           </div>

           <div className="flex justify-end gap-4 sticky bottom-8">
              <button 
                type="submit" 
                disabled={isSaving}
                className="btn-primary px-16 py-4 text-lg shadow-xl shadow-brand-emerald/20 flex items-center gap-2"
              >
                {isSaving ? <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-b-white"></span> : <Save size={20}/>}
                {saved ? 'Settings Saved!' : 'Save All Settings'}
              </button>
           </div>
        </form>
      </div>
    </AdminLayout>
  );
}
