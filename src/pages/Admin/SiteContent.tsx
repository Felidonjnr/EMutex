import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { siteContent as fallbackContent } from '../../data/siteContent';
import AdminLayout from '../../components/layout/AdminLayout';
import { Save, Loader2, Globe, Home, PenTool, Search, Layout, Settings, MessageSquare, Info } from 'lucide-react';

type SiteContent = typeof fallbackContent;

export default function AdminSiteContent() {
  const [content, setContent] = useState<SiteContent>(fallbackContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'global' | 'homepage' | 'footer' | 'seo'>('global');

  useEffect(() => {
    async function fetchContent() {
      if (!db) return;
      try {
        const docRef = doc(db, 'settings', 'siteContent');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setContent({ ...fallbackContent, ...docSnap.data() } as SiteContent);
        }
      } catch (error) {
        console.error('Error fetching site content:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'siteContent'), content);
      alert('Site content updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/siteContent');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (section: keyof SiteContent, field: string, value: any) => {
    setContent(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="animate-spin text-brand-emerald" size={40} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif text-brand-emerald">Site Content Management</h1>
            <p className="text-brand-grey text-sm">Customize the text and content across your website.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-6 py-2.5 bg-brand-gold border-0 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? 'Saving Changes...' : 'Save All Changes'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-brand-champagne/30 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('global')}
            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 whitespace-nowrap border-b-2 transition-all ${
              activeTab === 'global' ? 'border-brand-emerald text-brand-emerald' : 'border-transparent text-brand-grey/60 hover:text-brand-grey'
            }`}
          >
            <Globe size={18} /> Global & Brand
          </button>
          <button
            onClick={() => setActiveTab('homepage')}
            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 whitespace-nowrap border-b-2 transition-all ${
              activeTab === 'homepage' ? 'border-brand-emerald text-brand-emerald' : 'border-transparent text-brand-grey/60 hover:text-brand-grey'
            }`}
          >
            <Home size={18} /> Homepage Content
          </button>
          <button
            onClick={() => setActiveTab('footer')}
            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 whitespace-nowrap border-b-2 transition-all ${
              activeTab === 'footer' ? 'border-brand-emerald text-brand-emerald' : 'border-transparent text-brand-grey/60 hover:text-brand-grey'
            }`}
          >
            <Layout size={18} /> Footer & Social
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 whitespace-nowrap border-b-2 transition-all ${
              activeTab === 'seo' ? 'border-brand-emerald text-brand-emerald' : 'border-transparent text-brand-grey/60 hover:text-brand-grey'
            }`}
          >
            <Search size={18} /> SEO & Meta
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* GLOBAL TAB */}
          {activeTab === 'global' && (
            <div className="space-y-6">
              <div className="card p-6 space-y-6 bg-white border-brand-champagne/20">
                <h3 className="text-lg font-bold text-brand-emerald flex items-center gap-2">
                  <PenTool size={20} className="text-brand-gold" /> Core Brand Identity
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Brand Name</label>
                    <input 
                      type="text" 
                      value={content.brand.name}
                      onChange={(e) => updateField('brand', 'name', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Tagline</label>
                    <input 
                      type="text" 
                      value={content.brand.tagline}
                      onChange={(e) => updateField('brand', 'tagline', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="col-span-full space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Logo URL (Cloudinary)</label>
                    <input 
                      type="text" 
                      value={content.brand.logoPath}
                      onChange={(e) => updateField('brand', 'logoPath', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="card p-6 space-y-6 bg-white border-brand-champagne/20">
                <h3 className="text-lg font-bold text-brand-emerald flex items-center gap-2">
                  <MessageSquare size={20} className="text-brand-gold" /> Contact & Location
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">WhatsApp Number (e.g. 23480...)</label>
                    <input 
                      type="text" 
                      value={content.contact.whatsappNumber}
                      onChange={(e) => updateField('contact', 'whatsappNumber', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Main Location Area</label>
                    <input 
                      type="text" 
                      value={content.contact.location}
                      onChange={(e) => updateField('contact', 'location', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="col-span-full space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Full Contact Address/Text</label>
                    <textarea 
                      rows={2}
                      value={content.contact.address}
                      onChange={(e) => updateField('contact', 'address', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HOMEPAGE TAB */}
          {activeTab === 'homepage' && (
            <div className="space-y-6">
              <div className="card p-6 space-y-6 bg-white border-brand-champagne/20">
                <h3 className="text-lg font-bold text-brand-emerald flex items-center gap-2">
                  <Layout size={20} className="text-brand-gold" /> Hero Section
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Hero Label (Small text above headline)</label>
                    <input 
                      type="text" 
                      value={content.hero.label}
                      onChange={(e) => updateField('hero', 'label', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Hero Headline</label>
                    <input 
                      type="text" 
                      value={content.hero.headline}
                      onChange={(e) => updateField('hero', 'headline', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Hero Sub-headline</label>
                    <textarea 
                      rows={3}
                      value={content.hero.subheadline}
                      onChange={(e) => updateField('hero', 'subheadline', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Primary Button Text</label>
                      <input 
                        type="text" 
                        value={content.hero.ctaPrimary}
                        onChange={(e) => updateField('hero', 'ctaPrimary', e.target.value)}
                        className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Secondary Button Text</label>
                      <input 
                        type="text" 
                        value={content.hero.ctaSecondary}
                        onChange={(e) => updateField('hero', 'ctaSecondary', e.target.value)}
                        className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-6 space-y-6 bg-white border-brand-champagne/20">
                <h3 className="text-lg font-bold text-brand-emerald flex items-center gap-2">
                  <Info size={20} className="text-brand-gold" /> About & Trust
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Trust Strip Text (Banner text)</label>
                    <input 
                      type="text" 
                      value={content.trust.stripText}
                      onChange={(e) => updateField('trust', 'stripText', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">About Section Title</label>
                    <input 
                      type="text" 
                      value={content.about.title}
                      onChange={(e) => updateField('about', 'title', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">About Section Description</label>
                    <textarea 
                      rows={4}
                      value={content.about.description}
                      onChange={(e) => updateField('about', 'description', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER TAB */}
          {activeTab === 'footer' && (
            <div className="space-y-6">
              <div className="card p-6 space-y-6 bg-white border-brand-champagne/20">
                <h3 className="text-lg font-bold text-brand-emerald flex items-center gap-2">
                  <Layout size={20} className="text-brand-gold" /> Footer Details
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Final CTA Headline (Above footer)</label>
                    <input 
                      type="text" 
                      value={content.finalCta.title}
                      onChange={(e) => updateField('finalCta', 'title', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Final CTA Subtext</label>
                    <textarea 
                      rows={2}
                      value={content.finalCta.subtitle}
                      onChange={(e) => updateField('finalCta', 'subtitle', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">WhatsApp Button Text</label>
                    <input 
                      type="text" 
                      value={content.finalCta.buttonText}
                      onChange={(e) => updateField('finalCta', 'buttonText', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="card p-6 space-y-6 bg-white border-brand-champagne/20">
                <h3 className="text-lg font-bold text-brand-emerald flex items-center gap-2">
                  <Globe size={20} className="text-brand-gold" /> Social Links
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Facebook Link</label>
                    <input 
                      type="text" 
                      value={content.social.facebook}
                      onChange={(e) => updateField('social', 'facebook', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl"
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Instagram Link</label>
                    <input 
                      type="text" 
                      value={content.social.instagram}
                      onChange={(e) => updateField('social', 'instagram', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl"
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SEO TAB */}
          {activeTab === 'seo' && (
            <div className="space-y-6">
              <div className="card p-6 space-y-6 bg-white border-brand-champagne/20">
                <h3 className="text-lg font-bold text-brand-emerald flex items-center gap-2">
                  <Search size={20} className="text-brand-gold" /> SEO & Meta Data
                </h3>
                <div className="space-y-4">
                   <div className="p-4 bg-brand-gold/5 border border-brand-gold/20 rounded-xl text-xs text-brand-grey space-y-2">
                      <p className="font-bold text-brand-gold uppercase tracking-widest">💡 SEO Tip</p>
                      <p>Good meta titles are under 60 chars. Descriptions should be under 160 chars. Include keywords naturally.</p>
                   </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Meta Title (Browser tab name)</label>
                    <input 
                      type="text" 
                      value={content.hero.label} // Reusing label or headline for now in siteContent data structure
                      onChange={(e) => updateField('hero', 'label', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Meta Description</label>
                    <textarea 
                      rows={3}
                      value={content.hero.subheadline}
                      onChange={(e) => updateField('hero', 'subheadline', e.target.value)}
                      className="w-full px-4 py-3 bg-brand-ivory/30 border border-brand-champagne/20 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-6 border-t border-brand-champagne/20">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-10 py-4 bg-brand-emerald text-white rounded-2xl hover:bg-[#082a20] transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
              {saving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
