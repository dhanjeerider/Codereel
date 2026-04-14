import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Bolt, LogIn, UserPlus } from 'lucide-react';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('');

  const checkUsername = async (val: string) => {
    setUsername(val);
    if (val.length < 3) {
      setUsernameStatus('3-20 characters required');
      return;
    }
    const docRef = doc(db, 'usernames', val.toLowerCase());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setUsernameStatus('Username taken');
    } else {
      setUsernameStatus('Available');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (usernameStatus !== 'Available') {
          throw new Error('Please choose a valid username');
        }
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
        });
        
        await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid: user.uid, createdAt: Date.now() });
      }
    } catch (err: any) {
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
                    onChange={(e) => checkUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-panel border border-border focus:border-accent focus:outline-none transition text-foreground placeholder-muted text-sm"
                    required
                  />
                  <div className={`text-sm mt-2 h-5 ${usernameStatus === 'Available' ? 'text-green-600' : 'text-red-500'}`}>
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

          {error && <div className="text-red-500 text-sm mt-4 text-center">{error}</div>}
        </div>
      </div>
    </div>
  );
}
