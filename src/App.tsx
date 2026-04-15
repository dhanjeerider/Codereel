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

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check if user exists in db
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
          // Create basic user profile if not exists (e.g. from Google login)
          const username = (currentUser.displayName || 'user').replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 10000);
          await setDoc(doc(db, 'users', currentUser.uid), {
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
            isVerified: false,
            privateProfile: false,
            showEmail: false,
            notif_comments: true,
            notif_likes: true,
            notif_followers: true,
            createdAt: Date.now()
          });
          await setDoc(doc(db, 'usernames', username), { uid: currentUser.uid, createdAt: Date.now() });
        }
        setUser(currentUser);
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

  return (
    <Router>
      <Routes>
        {!user ? (
          <Route path="*" element={<AuthScreen />} />
        ) : (
          <Route path="/" element={<MainLayout user={user} />}>
            <Route index element={<Feed user={user} />} />
            <Route path="explore" element={<Explore />} />
            <Route path="create" element={<Create user={user} />} />
            <Route path="profile/:id?" element={<Profile user={user} />} />
            <Route path="settings" element={<Settings user={user} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </Router>
  );
}
