import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import SEO from './components/SEO';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { Shield } from 'lucide-react';

function ErrorFallback({ error }: FallbackProps) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isFirebaseError = errorMessage.includes('apiKey') || errorMessage.includes('Firebase') || errorMessage.includes('auth/invalid-api-key');
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-brand-cream text-center space-y-6">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600">
        <Shield size={40} />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-serif text-[#0E3B2E]">Configuration Required</h2>
        <p className="text-brand-grey max-w-md mx-auto">
          {isFirebaseError 
            ? "The application's Firebase connection is not configured correctly. This usually means environment variables are missing."
            : "The application encountered an unexpected error."}
        </p>
      </div>

      {isFirebaseError && (
        <div className="bg-brand-mist/50 p-6 rounded-2xl border border-brand-gold/20 max-w-lg text-left space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0E3B2E]">How to fix this:</p>
          <ol className="text-sm text-brand-grey space-y-2 list-decimal ml-4">
            <li>Go to the **Settings** menu in AI Studio Build.</li>
            <li>Add the following Environment Variables as specified in the README:
              <ul className="mt-2 space-y-1 font-mono text-[10px] bg-white p-2 rounded-lg border border-brand-champagne/20">
                <li>VITE_FIREBASE_API_KEY</li>
                <li>VITE_FIREBASE_PROJECT_ID</li>
                <li>VITE_FIREBASE_AUTH_DOMAIN</li>
                <li>... (see .env.example)</li>
              </ul>
            </li>
            <li>Redeploy or Restart the Dev Server.</li>
          </ol>
        </div>
      )}

      <div className="space-y-4">
        <pre className="text-[10px] bg-brand-mist p-4 rounded-xl overflow-auto max-w-full text-red-600 border border-red-100">
          {errorMessage}
        </pre>
        <button 
          onClick={() => window.location.reload()}
          className="btn-primary px-8 py-3 bg-[#0E3B2E] border-0"
        >
          Try Refreshing
        </button>
      </div>
    </div>
  );
}

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Bundles = lazy(() => import('./pages/Bundles'));
const BundleDetail = lazy(() => import('./pages/BundleDetail'));
const FAQ = lazy(() => import('./pages/FAQ'));

// Admin pages
const AdminLogin = lazy(() => import('./pages/Admin/Login'));
const AdminDashboard = lazy(() => import('./pages/Admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/Admin/Products'));
const AdminBundles = lazy(() => import('./pages/Admin/Bundles'));
const AdminLeads = lazy(() => import('./pages/Admin/Leads'));
const AdminSettings = lazy(() => import('./pages/Admin/Settings'));
const AdminSiteContent = lazy(() => import('./pages/Admin/SiteContent'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/em-admin');

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1E1B16] flex flex-col">
      {isAdminRoute && <SEO noindex={true} title="Admin Portal" />}
      {!isAdminRoute && <Navbar />}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <WhatsAppButton />}
    </div>
  );
}

import { SiteContentProvider } from './context/SiteContentContext';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <SiteContentProvider>
        <MainLayout>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:slug" element={<ProductDetail />} />
                <Route path="/bundles" element={<Bundles />} />
                <Route path="/bundles/:slug" element={<BundleDetail />} />
                <Route path="/faq" element={<FAQ />} />
                
                {/* Admin Routes */}
                <Route path="/em-admin" element={<AdminLogin />} />
                <Route path="/em-admin/dashboard" element={<AdminDashboard />} />
                <Route path="/em-admin/products" element={<AdminProducts />} />
                <Route path="/em-admin/bundles" element={<AdminBundles />} />
                <Route path="/em-admin/leads" element={<AdminLeads />} />
                <Route path="/em-admin/settings" element={<AdminSettings />} />
                <Route path="/em-admin/site-content" element={<AdminSiteContent />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </MainLayout>
      </SiteContentProvider>
    </BrowserRouter>
  );
}
