import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { ShieldCheck, Users, Code, Save, Settings } from 'lucide-react';
import SEO from '../components/SEO';

export default function AdminPanel({ user }: { user: any }) {
  const [settings, setSettings] = useState({
    siteTitle: 'CodeReel',
    siteDescription: 'Share and discover amazing code snippets in a highly engaging reel format.',
    seoKeywords: 'code, snippets, programming, reels, developers'
  });
  const [stats, setStats] = useState({ users: 0, reels: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Settings
        const settingsDoc = await getDoc(doc(db, 'admin', 'settings'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as any);
        } else {
          // Initialize defaults
          await setDoc(doc(db, 'admin', 'settings'), settings);
        }

        // Fetch basic stats (not ideal for large DB, but for demo)
        const usersSnap = await getDocs(collection(db, 'users'));
        const reelsSnap = await getDocs(collection(db, 'reels'));
        
        setStats({
          users: usersSnap.size,
          reels: reelsSnap.size
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user.isAdmin) {
      fetchData();
    }
  }, [user.isAdmin]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'admin', 'settings'), settings);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!user.isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <ShieldCheck size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted text-sm">You do not have permission to view the admin panel.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-background pb-20 md:pb-0">
      <SEO title="Admin Panel | CodeReel" />
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mb-8">
          <Settings className="text-accent" /> Admin Dashboard
        </h2>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-panel rounded-2xl p-6 border border-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Users size={24} /></div>
            <div>
              <p className="text-sm font-medium text-muted">Total Users</p>
              <p className="text-2xl font-bold text-foreground">{stats.users}</p>
            </div>
          </div>
          <div className="bg-panel rounded-2xl p-6 border border-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-pink-500/10 text-pink-500 rounded-xl"><Code size={24} /></div>
            <div>
              <p className="text-sm font-medium text-muted">Total Reels</p>
              <p className="text-2xl font-bold text-foreground">{stats.reels}</p>
            </div>
          </div>
        </div>

        {/* SEO Settings */}
        <div className="bg-panel rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="p-4 bg-surface border-b border-border font-medium text-foreground flex items-center gap-2">
            SEO & App Information
          </div>
          <div className="p-6 flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Site Title</label>
              <input 
                type="text" 
                value={settings.siteTitle}
                onChange={e => setSettings({...settings, siteTitle: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:border-accent focus:outline-none placeholder-muted"
                placeholder="e.g. CodeReel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Site Description (Meta)</label>
              <textarea 
                rows={3}
                value={settings.siteDescription}
                onChange={e => setSettings({...settings, siteDescription: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:border-accent focus:outline-none placeholder-muted resize-none"
                placeholder="Description for SEO rendering..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Keywords</label>
              <input 
                type="text" 
                value={settings.seoKeywords}
                onChange={e => setSettings({...settings, seoKeywords: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:border-accent focus:outline-none placeholder-muted"
                placeholder="e.g. coding, javascript, react"
              />
            </div>
            
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="mt-2 w-fit px-6 py-2.5 bg-gradient-to-r from-accent to-pink-500 text-white rounded-xl text-sm font-medium hover:opacity-90 flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}