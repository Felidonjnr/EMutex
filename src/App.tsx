import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Bundles = lazy(() => import('./pages/Bundles'));
const FAQ = lazy(() => import('./pages/FAQ'));

// Admin pages
const AdminLogin = lazy(() => import('./pages/Admin/Login'));
const AdminDashboard = lazy(() => import('./pages/Admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/Admin/Products'));
const AdminLeads = lazy(() => import('./pages/Admin/Leads'));
const AdminSettings = lazy(() => import('./pages/Admin/Settings'));

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

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <MainLayout>
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/bundles" element={<Bundles />} />
            <Route path="/faq" element={<FAQ />} />
            
            {/* Admin Routes */}
            <Route path="/em-admin" element={<AdminLogin />} />
            <Route path="/em-admin/dashboard" element={<AdminDashboard />} />
            <Route path="/em-admin/products" element={<AdminProducts />} />
            <Route path="/em-admin/leads" element={<AdminLeads />} />
            <Route path="/em-admin/settings" element={<AdminSettings />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </BrowserRouter>
  );
}
