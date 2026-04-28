import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Bolt, Search, PlusCircle, Bell, Settings as SettingsIcon, Home, Compass, User as UserIcon, ShieldCheck, LogIn } from 'lucide-react';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function MainLayout({ user }: { user: any }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (user) {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      }
    };
    fetchUser();
  }, [user]);

  const navItems = [
    { path: '/', icon: Home, label: 'Feed' },
    { path: '/explore', icon: Compass, label: 'Explore' },
    { path: '/create', icon: PlusCircle, label: 'Create' },
    { path: '/profile', icon: UserIcon, label: 'Profile' },
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-app text-foreground">
      {/* Header */}
      <header className="bg-panel/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between z-40">
        <h1 className="text-xl font-bold flex items-center gap-2 cursor-pointer tracking-tight" onClick={() => navigate('/')}>
          <div className="w-6 h-6 bg-gradient-to-br from-accent to-pink-500 rounded-md flex items-center justify-center text-white shadow-lg shadow-accent/20">
            <Bolt size={14} />
          </div>
          <span className="text-gradient">CodeReel</span>
        </h1>
        <div className="flex items-center gap-5">
          <button className="text-muted hover:text-foreground transition" title="Search">
            <Search size={16} />
          </button>
          <button onClick={() => navigate('/create')} className="text-muted hover:text-foreground transition hidden md:block" title="Create">
            <PlusCircle size={16} />
          </button>
          {userData?.isAdmin && (
            <button onClick={() => navigate('/admin')} className="text-muted hover:text-accent transition" title="Admin Panel">
              <ShieldCheck size={16} />
            </button>
          )}
          <button className="text-muted hover:text-foreground transition relative" title="Notifications">
            <Bell size={16} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full"></span>
          </button>
          <div 
            className="w-7 h-7 rounded-full bg-surface flex items-center justify-center font-medium text-sm cursor-pointer hover:ring-2 ring-border transition overflow-hidden text-foreground" 
            onClick={() => navigate(user ? '/profile' : '/auth')} 
            title={user ? 'Profile' : 'Login'}
          >
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user ? (userData?.name || user?.displayName || 'U')[0].toUpperCase() : <LogIn size={14} />
            )}
          </div>
          <button onClick={() => navigate(user ? '/settings' : '/auth')} className="text-muted hover:text-foreground transition" title="Settings">
            <SettingsIcon size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex relative pb-12 md:pb-0">
        <Outlet />
      </div>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-panel/95 backdrop-blur-md border-t border-border px-2 py-1.5 flex justify-around z-50">
        {navItems.map((item) => (
          <button 
            key={item.path}
            onClick={() => {
              if (item.path === '/profile' && !user) {
                navigate('/auth');
              } else if (item.path === '/create' && !user) {
                navigate('/auth');
              } else {
                navigate(item.path);
              }
            }}
            className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition ${location.pathname === item.path ? 'text-foreground font-medium' : 'text-muted hover:text-foreground'}`}
          >
            <item.icon size={18} />
          </button>
        ))}
      </nav>
    </div>
  );
}
