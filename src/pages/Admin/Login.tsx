import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, LogIn, ShieldAlert, Sparkles, Mail, Key, Loader2 } from 'lucide-react';
import { siteContent } from '../../data/siteContent';

// Admin email allowlist from environment variable
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email: string) => email.trim().toLowerCase())
  .filter((email: string) => email.length > 0);

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const isAdminEmail = (userEmail: string | null) => {
    if (!userEmail) return false;
    return ADMIN_EMAILS.includes(userEmail.toLowerCase());
  };

  useEffect(() => {
    // Check for missing Firebase configuration
    const isConfigMissing = !import.meta.env.VITE_FIREBASE_API_KEY || 
                             !import.meta.env.VITE_FIREBASE_PROJECT_ID || 
                             !import.meta.env.VITE_ADMIN_EMAILS;
    
    if (isConfigMissing) {
      setError('Firebase configuration is missing. Please check environment variables (VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_ADMIN_EMAILS).');
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (isAdminEmail(user.email)) {
          navigate('/em-admin/dashboard');
        } else {
          setError('This account is not authorized to access EMutex Nig Admin.');
          await signOut(auth);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/password sign-in is not enabled in Firebase Authentication.');
      } else {
        setError('Failed to sign in. Please check your connection.');
      }
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      console.error(err);
      setError('Could not send reset email. Please try again.');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E3B2E] space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
      <p className="text-brand-champagne/60 text-sm font-medium tracking-widest uppercase">Checking secure access...</p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0E3B2E] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#FFFDF8] rounded-[24px] max-w-md w-full p-8 lg:p-12 space-y-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-gold" />
        
        <div className="text-center space-y-6">
          <div className="flex flex-col items-center gap-4">
            <img
              src={siteContent.brand.logoPath}
              alt={`${siteContent.brand.name} Logo`}
              className="h-16 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div>
              <h1 className="text-2xl font-bold text-[#0E3B2E]">EMutex Nig Admin</h1>
              <p className="text-brand-grey text-sm mt-1 font-medium">Secure product management portal</p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-red-600 text-xs items-start"
            >
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </motion.div>
          )}
          {resetSent && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-3 text-emerald-600 text-xs items-start"
            >
              <LogIn size={16} className="shrink-0 mt-0.5" />
              <p>Password reset email sent if this email exists.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#0E3B2E] uppercase tracking-widest flex items-center gap-2 ml-1">
              <Mail size={12} className="text-brand-gold" /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-3.5 bg-white border border-brand-champagne/30 rounded-2xl focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all placeholder:text-brand-grey/30"
              placeholder="admin@emutexnig.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold text-[#0E3B2E] uppercase tracking-widest flex items-center gap-2">
                <Key size={12} className="text-brand-gold" /> Password
              </label>
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-[10px] font-bold text-brand-gold uppercase tracking-wider hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3.5 bg-white border border-brand-champagne/30 rounded-2xl focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all placeholder:text-brand-grey/30"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 mt-4 bg-[#0E3B2E] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-brand-emerald/10 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="text-center space-y-4">
          <p className="text-[10px] text-brand-grey uppercase tracking-[0.2em] flex items-center justify-center gap-2 font-bold">
            <Sparkles size={10} className="text-brand-gold" /> Authorized Access Only <Sparkles size={10} className="text-brand-gold" />
          </p>
          <div className="pt-2 border-t border-brand-champagne/10">
             <p className="text-[9px] text-brand-grey/40 uppercase tracking-widest">EMutex Nig Security Terminal</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

