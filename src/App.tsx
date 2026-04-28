import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AuthScreen from './pages/AuthScreen';
import MainLayout from './components/MainLayout';
import Feed from './pages/Feed';
import Explore from './pages/Explore';
import Create from './pages/Create';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import SEO from './components/SEO';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState<any>({
    siteTitle: 'CodeReel',
    siteDescription: 'Share and discover amazing code snippets in a highly engaging reel format.'
  });

  const [dbStatus, setDbStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

  useEffect(() => {
    // Test Firestore connection
    const testRef = doc(db, 'admin', 'settings');
    getDoc(testRef).then(docSnap => {
      setDbStatus('online');
      if(docSnap.exists()) {
        setSiteSettings(docSnap.data());
      }
    }).catch(err => {
      console.error("Firestore connectivity check failed:", err);
      if (err.message?.includes('offline')) {
        setDbStatus('offline');
      } else {
        // Other errors might mean it's online but permissions deny
        setDbStatus('online');
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check if user exists in db
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        let userData = userDoc.data();
        if (!userDoc.exists()) {
          // Create basic user profile if not exists (e.g. from Google login)
          const username = (currentUser.displayName || 'user').replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 10000);
          userData = {
            name: currentUser.displayName || 'User',
            username,
            email: currentUser.email,
            bio: '',
            photoURL: currentUser.photoURL || '',
            followers: 0,
            following: 0,
            reels: 0,
            likes: 0,
            isAdmin: currentUser.email === 'dhanjeekumar775145@gmail.com',
            isBanned: false,
            isVerified: false,
            privateProfile: false,
            showEmail: false,
            notif_comments: true,
            notif_likes: true,
            notif_followers: true,
            createdAt: Date.now()
          };
          await setDoc(doc(db, 'users', currentUser.uid), userData);
          await setDoc(doc(db, 'usernames', username), { uid: currentUser.uid, createdAt: Date.now() });
        }
        
        if (userData?.isBanned) {
          setUser({ uid: currentUser.uid, email: currentUser.email, isBanned: true });
        } else {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            isAdmin: userData?.isAdmin || currentUser.email === 'dhanjeekumar775145@gmail.com',
            isBanned: false
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading...</div>;
  }

  if (user?.isBanned) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground p-6 text-center">
        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Account Suspended</h1>
        <p className="text-muted max-w-md">Your account has been banned by an administrator. You can no longer access this application.</p>
        <button onClick={() => auth.signOut()} className="mt-6 px-6 py-2 bg-surface border border-border rounded-xl hover:bg-border/50 transition">Sign Out</button>
      </div>
    );
  }

  return (
    <Router>
      <SEO title={siteSettings.siteTitle} description={siteSettings.siteDescription} />
      {dbStatus === 'offline' && (
        <div className="fixed top-0 inset-x-0 bg-red-500 text-white text-[10px] py-1 px-4 z-[9999] text-center font-medium animate-pulse">
          Firestore is offline. Some features may not work. Please refresh or check your Firebase setup.
        </div>
      )}
      <Routes>
        <Route path="/" element={<MainLayout user={user} />}>
          <Route index element={<Feed user={user} />} />
          <Route path="explore" element={<Explore />} />
          <Route path="profile/:id?" element={<Profile user={user} />} />
          
          <Route path="create" element={user ? <Create user={user} /> : <Navigate to="/auth" />} />
          <Route path="settings" element={user ? <Settings user={user} /> : <Navigate to="/auth" />} />
          <Route path="admin" element={user?.isAdmin ? <AdminPanel user={user} /> : <Navigate to="/" />} />
        </Route>
        <Route path="/auth" element={user ? <Navigate to="/" /> : <AuthScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
