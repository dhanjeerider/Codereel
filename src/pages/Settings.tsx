import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, User, Shield, Bell, LogOut, Camera, Image as ImageIcon } from 'lucide-react';
import { uploadImage } from '../lib/imgbb';

export default function Settings({ user }: { user: any }) {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile edit state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [bannerURL, setBannerURL] = useState('');
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        setName(data.name || '');
        setBio(data.bio || '');
        setPhotoURL(data.photoURL || '');
        setBannerURL(data.bannerURL || '');
      }
      setLoading(false);
    };
    fetchUser();
  }, [user.uid]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const toggleSetting = async (field: string, value: boolean) => {
    setUserData({ ...userData, [field]: value });
    await updateDoc(doc(db, 'users', user.uid), { [field]: value });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name,
        bio,
        photoURL,
        bannerURL
      });
      setUserData({ ...userData, name, bio, photoURL, bannerURL });
      alert('Profile updated successfully!');
    } catch (error) {
      console.error("Error updating profile", error);
      alert('Failed to update profile');
    }
    setSaving(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSaving(true);
    const url = await uploadImage(file);
    if (url) {
      if (type === 'photo') setPhotoURL(url);
      if (type === 'banner') setBannerURL(url);
    } else {
      alert('Failed to upload image');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-background pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto p-8">
        <h2 className="text-2xl font-semibold mb-8 flex items-center gap-2 text-foreground tracking-tight">
          <SettingsIcon className="text-accent" size={20} /> Settings
        </h2>

        <div className="bg-panel border border-border rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 tracking-tight">
            <User className="text-muted" size={18} /> Edit Profile
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-surface overflow-hidden border border-border flex items-center justify-center">
                    {photoURL ? <img src={photoURL} alt="Profile" className="w-full h-full object-cover" /> : <User size={24} className="text-muted" />}
                  </div>
                  <button onClick={() => photoInputRef.current?.click()} disabled={saving} className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition flex items-center gap-2">
                    <Camera size={16} /> {saving ? 'Uploading...' : 'Change Photo'}
                  </button>
                  <input type="file" ref={photoInputRef} onChange={(e) => handleImageUpload(e, 'photo')} accept="image/*" className="hidden" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Banner Image</label>
                <div className="flex flex-col gap-2">
                  <div className="w-full h-24 rounded-xl bg-surface overflow-hidden border border-border flex items-center justify-center">
                    {bannerURL ? <img src={bannerURL} alt="Banner" className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-muted" />}
                  </div>
                  <button onClick={() => bannerInputRef.current?.click()} disabled={saving} className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition flex items-center justify-center gap-2 w-fit">
                    <ImageIcon size={16} /> {saving ? 'Uploading...' : 'Change Banner'}
                  </button>
                  <input type="file" ref={bannerInputRef} onChange={(e) => handleImageUpload(e, 'banner')} accept="image/*" className="hidden" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Display Name</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border focus:border-accent focus:outline-none text-foreground text-sm shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Bio</label>
              <textarea 
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border focus:border-accent focus:outline-none text-foreground resize-none text-sm shadow-sm"
              />
            </div>
            <button 
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-accent to-pink-500 font-medium text-white hover:opacity-90 transition disabled:opacity-50 text-sm shadow-md mt-2"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        <div className="bg-panel border border-border rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 tracking-tight">
            <Shield className="text-muted" size={18} /> Account Details & Privacy
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-border">
              <div>
                <p className="font-medium text-sm text-foreground">Email</p>
                <p className="text-sm text-muted mt-0.5">{user.email}</p>
              </div>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-border">
              <div>
                <p className="font-medium text-sm text-foreground">Username</p>
                <p className="text-sm text-muted mt-0.5">@{userData?.username}</p>
              </div>
            </div>
            <ToggleRow 
              title="Private Profile" 
              desc="Only approved followers see your reels" 
              checked={userData?.privateProfile || false} 
              onChange={(v) => toggleSetting('privateProfile', v)} 
            />
            <ToggleRow 
              title="Show Email" 
              desc="Display email on your profile" 
              checked={userData?.showEmail || false} 
              onChange={(v) => toggleSetting('showEmail', v)} 
            />
          </div>
        </div>

        <div className="bg-panel border border-border rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 tracking-tight">
            <Bell className="text-muted" size={18} /> Notifications
          </h3>
          <div className="space-y-4">
            <ToggleRow 
              title="Comments" 
              desc="When someone comments on your reels" 
              checked={userData?.notif_comments !== false} 
              onChange={(v) => toggleSetting('notif_comments', v)} 
            />
            <ToggleRow 
              title="Likes" 
              desc="When someone likes your reel" 
              checked={userData?.notif_likes !== false} 
              onChange={(v) => toggleSetting('notif_likes', v)} 
            />
            <ToggleRow 
              title="Followers" 
              desc="When someone follows you" 
              checked={userData?.notif_followers !== false} 
              onChange={(v) => toggleSetting('notif_followers', v)} 
              noBorder
            />
          </div>
        </div>

        <button 
          onClick={handleLogout} 
          className="w-full py-3.5 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition flex items-center justify-center gap-2 text-sm shadow-sm"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ title, desc, checked, onChange, noBorder }: { title: string, desc: string, checked: boolean, onChange: (v: boolean) => void, noBorder?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${noBorder ? '' : 'pb-4 border-b border-border'}`}>
      <div>
        <p className="font-medium text-sm text-foreground">{title}</p>
        <p className="text-xs text-muted mt-0.5">{desc}</p>
      </div>
      <button 
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full transition-colors relative ${checked ? 'bg-accent' : 'bg-border'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${checked ? 'left-7' : 'left-1'}`}></div>
      </button>
    </div>
  );
}
