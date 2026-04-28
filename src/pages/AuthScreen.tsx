import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Bolt, LogIn, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export default function AuthScreen() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  // Debounce for username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.length >= 3 && username.length <= 20) {
        performCheck(username);
      } else if (username.length > 0) {
        setUsernameStatus('3-20 characters required');
      } else {
        setUsernameStatus('');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const performCheck = async (val: string) => {
    setCheckingUsername(true);
    setError('');
    try {
      const docRef = doc(db, 'usernames', val.toLowerCase());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUsernameStatus('Username taken');
      } else {
        setUsernameStatus('Available');
      }
    } catch (err: any) {
      console.error("Error checking username:", err);
      if (err.message?.includes('offline')) {
        setUsernameStatus('Offline (check connection)');
        setError('Database appears to be offline. Please check your internet or try refreshing.');
      } else {
        setUsernameStatus('Check failed');
        try {
          handleFirestoreError(err, OperationType.GET, `usernames/${val}`);
        } catch (handledErr: any) {
          setError(`Database error: ${handledErr.message}`);
        }
      }
    } finally {
      setCheckingUsername(false);
    }
  };

  const onUsernameChange = (val: string) => {
    const cleaned = val.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    setUsername(cleaned);
    if (cleaned.length > 0) {
      setUsernameStatus('Checking...');
    } else {
      setUsernameStatus('');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Additional validation for signup
    if (!isLogin) {
      if (username.length < 3 || username.length > 20) {
        setError('Username must be 3-20 characters');
        return;
      }
      if (usernameStatus !== 'Available' && usernameStatus !== 'Offline (check connection)') {
        setError('Please wait for username validation or choose another one');
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });
        
        await setDoc(doc(db, 'users', user.uid), {
          name,
          username: username.toLowerCase(),
          email,
          bio: '',
          photoURL: '',
          followers: 0,
          following: 0,
          reels: 0,
          likes: 0,
          isAdmin: email === 'dhanjeekumar775145@gmail.com',
          isVerified: false,
          privateProfile: false,
          showEmail: false,
          notif_comments: true,
          notif_likes: true,
          notif_followers: true,
          createdAt: Date.now()
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
        
        await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid: user.uid, createdAt: Date.now() })
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `usernames/${username}`));
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-app flex items-center justify-center z-50 text-foreground">
      <div className="w-full max-w-md mx-4">
        <div className="bg-panel/80 backdrop-blur-xl rounded-2xl p-8 border border-border shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-accent to-pink-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-accent/20">
                <Bolt size={20} />
              </div>
              <span className="text-gradient">CodeReel</span>
            </h1>
            <p className="text-muted text-sm">Share your code, inspire the world</p>
          </div>

          <div className="flex gap-2 mb-6 bg-surface/50 rounded-lg p-1">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-3 rounded-md font-medium text-sm transition flex items-center justify-center gap-2 ${isLogin ? 'bg-gradient-to-r from-accent to-pink-500 text-white shadow-md' : 'text-muted hover:text-foreground'}`}
            >
              <LogIn size={16} /> Login
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-3 rounded-md font-medium text-sm transition flex items-center justify-center gap-2 ${!isLogin ? 'bg-gradient-to-r from-accent to-pink-500 text-white shadow-md' : 'text-muted hover:text-foreground'}`}
            >
              <UserPlus size={16} /> Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <input 
                  type="text" 
                  placeholder="Display name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-panel border border-border focus:border-accent focus:outline-none transition text-foreground placeholder-muted text-sm"
                  required
                />
                <div>
                  <input 
                    type="text" 
                    placeholder="Username (3-20 chars)" 
                    value={username}
                    onChange={(e) => onUsernameChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-panel border-border focus:border-accent focus:outline-none transition text-foreground placeholder-muted text-sm shadow-inner"
                    required
                  />
                  <div className={`text-sm mt-2 h-5 flex items-center gap-2 ${usernameStatus === 'Available' ? 'text-green-500' : 'text-red-500'}`}>
                    {checkingUsername && <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>}
                    {usernameStatus}
                  </div>
                </div>
              </>
            )}
            <input 
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-panel border border-border focus:border-accent focus:outline-none transition text-foreground placeholder-muted text-sm"
              required
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-panel border border-border focus:border-accent focus:outline-none transition text-foreground placeholder-muted text-sm"
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-accent to-pink-500 font-medium text-white hover:opacity-90 transition disabled:opacity-50 text-sm shadow-lg shadow-accent/20"
            >
              {loading ? 'Processing...' : (isLogin ? 'Login Now' : 'Create Account')}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-panel text-muted">or continue with</span></div>
          </div>
          
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 rounded-lg border border-border font-medium hover:bg-surface transition flex items-center justify-center gap-2 text-sm"
          >
            Google
          </button>

          <button 
            onClick={() => navigate('/')}
            disabled={loading}
            className="w-full mt-2 py-3 rounded-lg border border-transparent font-medium text-muted hover:text-foreground transition text-sm underline underline-offset-4"
          >
            Skip for now, just browse
          </button>

          {error && <div className="text-red-500 text-sm mt-4 text-center">{error}</div>}
        </div>
      </div>
    </div>
  );
}
