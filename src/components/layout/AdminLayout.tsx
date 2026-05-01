import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Settings, Layout, LayoutDashboard, ShoppingBag, Users, LogOut, Menu, X } from 'lucide-react';
import { useSiteContent } from '../../context/SiteContentContext';
import { cn } from '../../lib/utils';

const sidebarLinks = [
  { name: 'Dashboard', href: '/em-admin/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/em-admin/products', icon: ShoppingBag },
  { name: 'Leads', href: '/em-admin/leads', icon: Users },
  { name: 'Site Content', href: '/em-admin/site-content', icon: Layout },
  { name: 'Settings', href: '/em-admin/settings', icon: Settings },
];

// Admin email allowlist from environment variable
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email: string) => email.trim().toLowerCase())
  .filter((email: string) => email.length > 0);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { content } = useSiteContent();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isAdminEmail = (userEmail: string | null) => {
    if (!userEmail) return false;
    return ADMIN_EMAILS.includes(userEmail.toLowerCase());
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (isAdminEmail(user.email)) {
          setIsAdmin(true);
          setLoading(false);
        } else {
          navigate('/em-admin');
          await signOut(auth);
        }
      } else {
        navigate('/em-admin');
      }
    });
    return unsub;
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/em-admin');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-ivory">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-emerald"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-ivory flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-brand-emerald text-white p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10 px-2">
            <img 
              src={content.brand.logoPath} 
              alt={content.brand.name} 
              className="h-10 w-auto object-contain brightness-0 invert" 
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <h1 className="text-xl font-bold">{content.brand.name}</h1>
        </div>

        <nav className="flex-grow space-y-1">
          {sidebarLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                location.pathname === link.href 
                  ? "bg-brand-gold text-white font-bold" 
                  : "hover:bg-white/10 text-brand-ivory/70 hover:text-white"
              )}
            >
              <link.icon size={20} className={cn(
                "transition-transform group-hover:scale-110",
                location.pathname === link.href ? "text-white" : "text-brand-gold"
              )} />
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="pt-10 space-y-4">
            <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-brand-champagne/50">
                Logged in as:
                <span className="block text-white mt-1 truncate">{auth.currentUser?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-500/20 text-red-400 font-medium transition-all"
            >
              <LogOut size={20} />
              Logout
            </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden transition-opacity duration-300",
        isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
        <aside className={cn(
          "absolute left-0 top-0 bottom-0 w-72 bg-brand-emerald text-white p-6 transition-transform duration-300 transform",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
           <div className="flex justify-between items-center mb-10 px-2">
              <div className="flex items-center gap-3">
                <img 
                  src={content.brand.logoPath} 
                  alt={content.brand.name} 
                  className="h-9 w-auto object-contain brightness-0 invert" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <h1 className="text-xl font-bold">{content.brand.name}</h1>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
           </div>
           <nav className="space-y-2">
            {sidebarLinks.map((link) => (
                <Link
                key={link.name}
                to={link.href}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                    "flex items-center gap-3 px-4 py-4 rounded-xl text-lg",
                    location.pathname === link.href ? "bg-brand-gold text-white" : "text-brand-ivory/70"
                )}
                >
                <link.icon size={24} />
                {link.name}
                </Link>
            ))}
           </nav>
           <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-4 w-full mt-10 text-red-400 font-medium border-t border-white/10"
            >
              <LogOut size={24} />
              Sign Out
            </button>
        </aside>
      </div>

      {/* Main Content */}
      <div className="flex-grow flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-brand-champagne/20 flex items-center justify-between px-4 lg:px-10 sticky top-0 z-40">
           <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-brand-emerald"><Menu size={28}/></button>
              <h2 className="text-xl font-bold font-serif text-brand-emerald">
                {sidebarLinks.find(l => l.href === location.pathname)?.name || 'Admin Panel'}
              </h2>
           </div>
           <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-brand-gold uppercase tracking-tighter">System Administrator</span>
                <span className="text-sm font-medium text-brand-charcoal truncate max-w-[150px]">
                  {auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Admin'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-brand-gold shadow-sm bg-brand-emerald flex items-center justify-center text-white font-bold text-xs">
                {auth.currentUser?.photoURL ? (
                  <img src={auth.currentUser.photoURL} alt="avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span>{(auth.currentUser?.email?.[0] || 'A').toUpperCase()}</span>
                )}
              </div>
           </div>
        </header>

        <main className="p-4 lg:p-10 flex-grow">
          {children}
        </main>
      </div>
    </div>
  );
}
