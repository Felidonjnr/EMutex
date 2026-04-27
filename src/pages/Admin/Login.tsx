import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, limit, query } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { motion } from 'framer-motion';
import { Lock, LogIn, ShieldAlert, Sparkles } from 'lucide-react';
import { siteContent } from '../../data/siteContent';

export default function AdminLogin() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check if any admins exist
          const adminsSnap = await getDocs(query(collection(db, 'admins'), limit(1)));
          
          if (adminsSnap.empty) {
            // No admins yet, first person becomes admin
            await setDoc(doc(db, 'admins', user.uid), {
              email: user.email,
              role: 'super_admin',
              createdAt: new Date(),
            });
            navigate('/em-admin/dashboard');
          } else {
            const adminDoc = await getDoc(doc(db, 'admins', user.uid));
            if (adminDoc.exists()) {
              navigate('/em-admin/dashboard');
            } else {
              setError('You do not have administrative access.');
              await signOut(auth);
            }
          }
        } catch (err) {
           console.error(err);
           setError('Security error. Please contact the developer.');
           await signOut(auth);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, [navigate]);

  const handleLogin = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Auth state listener will handle the rest
    } catch (err: any) {
      console.error(err);
      setError('Failed to sign in. Please check your connection.');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-emerald">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-emerald px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card max-w-md w-full p-10 space-y-8 bg-white"
      >
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
              <h1 className="text-2xl font-bold text-[#0E3B2E]">{siteContent.brand.name} Admin</h1>
              <p className="text-brand-grey text-sm mt-1">Secure product management portal</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-red-600 text-sm items-start">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full btn-primary flex items-center justify-center gap-3 py-4 text-lg bg-brand-emerald hover:bg-black"
        >
          <LogIn size={20} />
          Sign in with Google
        </button>

        <div className="text-center space-y-2">
          <p className="text-[10px] text-brand-grey uppercase tracking-widest flex items-center justify-center gap-2">
            <Sparkles size={10} className="text-brand-gold" /> Protected by EMutex Security <Sparkles size={10} className="text-brand-gold" />
          </p>
        </div>
      </motion.div>
    </div>
  );
}
