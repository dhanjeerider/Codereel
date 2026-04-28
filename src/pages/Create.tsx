import React, { useState, useRef } from 'react';
import { collection, addDoc, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Film, Type, Hash, Image as ImageIcon, Play, Rocket, X, Camera } from 'lucide-react';
import { uploadImage } from '../lib/imgbb';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export default function Create({ user }: { user: any }) {
  const navigate = useNavigate();
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [js, setJs] = useState('');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [activeTab, setActiveTab] = useState('html');
  const [previewCode, setPreviewCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [posterURL, setPosterURL] = useState('');
  const posterInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  React.useEffect(() => {
    if (editId) {
      getDoc(doc(db, 'reels', editId)).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Only allow editing if user is owner or admin
          if (data.userId === user.uid || user.isAdmin) {
            setHtml(data.html || '');
            setCss(data.css || '');
            setJs(data.js || '');
            setCaption(data.caption || '');
            setTags(data.tags || []);
            setPosterURL(data.posterURL || '');
          } else {
            console.error("You don't have permission to edit this reel.");
            navigate('/');
          }
        }
      }).catch(err => {
        console.error("Error fetching reel for edit", err);
        handleFirestoreError(err, OperationType.GET, `reels/${editId}`);
      });
    }
  }, [editId, user.uid, user.isAdmin, navigate]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const val = tagInput.replace(/[#\s]/g, '').toLowerCase().trim();
      if (val && !tags.includes(val) && tags.length < 10) {
        setTags([...tags, val]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const runPreview = () => {
    setPreviewCode(`
      <html>
        <head><style>${css}</style></head>
        <body style="margin:0">${html}<script>${js}</script></body>
      </html>
    `);
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    const url = await uploadImage(file);
    if (url) {
      setPosterURL(url);
    } else {
      console.error('Failed to upload poster image');
    }
    setLoading(false);
  };

  const publishReel = async () => {
    if (!html && !css && !js) {
      console.error('Add some code first!');
      return;
    }
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (editId) {
        await updateDoc(doc(db, 'reels', editId), {
          html,
          css,
          js,
          caption,
          tags,
          posterURL
        });
      } else {
        await addDoc(collection(db, 'reels'), {
          html,
          css,
          js,
          caption,
          tags,
          userId: user.uid,
          username: userData?.username || 'user',
          userPhotoURL: userData?.photoURL || '',
          thumbnail: '',
          posterURL,
          likes: 0,
          comments: 0,
          timestamp: Date.now(),
          isVerified: userData?.isVerified || false
        });
        
        await updateDoc(doc(db, 'users', user.uid), {
          reels: increment(1)
        });
      }
      
      navigate('/');
    } catch (err: any) {
      console.error('Publish failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-app pb-20 md:pb-0">
      <div className="max-w-3xl mx-auto w-full p-8">
        <h2 className="text-2xl font-semibold mb-8 flex items-center gap-2 text-foreground tracking-tight">
          <div className="w-8 h-8 bg-gradient-to-br from-accent to-pink-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-accent/20">
            <Film size={16} />
          </div>
          <span className="text-gradient">{editId ? 'Edit Reel' : 'Create New Reel'}</span>
        </h2>

        <div className="mb-6 bg-panel/80 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
          <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <ImageIcon size={14} className="text-muted" /> Poster Image (Optional)
          </label>
          <div className="flex flex-col gap-4">
            {posterURL && (
              <div className="w-32 h-48 rounded-xl overflow-hidden border border-border">
                <img src={posterURL} alt="Poster" className="w-full h-full object-cover" />
              </div>
            )}
            <button onClick={() => posterInputRef.current?.click()} disabled={loading} className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition flex items-center justify-center gap-2 w-fit shadow-sm">
              <Camera size={16} /> {loading ? 'Uploading...' : (posterURL ? 'Change Poster' : 'Upload Poster')}
            </button>
            <input type="file" ref={posterInputRef} onChange={handlePosterUpload} accept="image/*" className="hidden" />
          </div>
        </div>

        <div className="mb-6 bg-panel/80 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
          <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Type size={14} className="text-muted" /> Caption
          </label>
          <textarea 
            rows={3} 
            placeholder="Write a caption for your reel..." 
            value={caption}
            onChange={e => setCaption(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-accent focus:outline-none text-foreground placeholder-muted resize-none text-sm shadow-sm"
          />
        </div>

        <div className="mb-6 bg-panel/80 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
          <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Hash size={14} className="text-muted" /> Hashtags
          </label>
          <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-surface border border-border min-h-[3rem] shadow-sm">
            {tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-md bg-panel text-foreground text-xs font-medium flex items-center gap-1 border border-border shadow-sm">
                #{tag}
                <button onClick={() => removeTag(tag)} className="text-muted hover:text-foreground transition ml-1">
                  <X size={12} />
                </button>
              </span>
            ))}
            <input 
              type="text" 
              placeholder="Type and press Enter" 
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="flex-1 min-w-[120px] bg-transparent text-foreground placeholder-muted focus:outline-none text-sm"
            />
          </div>
        </div>

        <div className="mb-6 bg-panel/80 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex gap-2 mb-4 border-b border-border">
            {['html', 'css', 'js'].map(lang => (
              <button 
                key={lang}
                onClick={() => setActiveTab(lang)}
                className={`py-2 px-4 border-b-2 font-medium text-sm transition ${activeTab === lang ? 'border-accent text-foreground' : 'border-transparent text-muted hover:text-foreground'}`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          
          {activeTab === 'html' && (
            <textarea 
              rows={8} 
              placeholder="<!-- Your HTML here -->" 
              value={html}
              onChange={e => setHtml(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-accent focus:outline-none text-foreground placeholder-muted font-mono text-sm resize-none shadow-sm"
            />
          )}
          {activeTab === 'css' && (
            <textarea 
              rows={8} 
              placeholder="/* Your CSS here */" 
              value={css}
              onChange={e => setCss(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-accent focus:outline-none text-foreground placeholder-muted font-mono text-sm resize-none shadow-sm"
            />
          )}
          {activeTab === 'js' && (
            <textarea 
              rows={8} 
              placeholder="// Your JavaScript here" 
              value={js}
              onChange={e => setJs(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-accent focus:outline-none text-foreground placeholder-muted font-mono text-sm resize-none shadow-sm"
            />
          )}
          
          <button onClick={runPreview} className="mt-4 w-full py-2.5 rounded-xl bg-panel border border-border hover:bg-border/50 font-medium transition flex items-center justify-center gap-2 text-sm text-foreground shadow-sm">
            <Play size={14} /> Run Preview
          </button>
        </div>

        <div className="mb-8 bg-panel/80 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
          <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <ImageIcon size={14} className="text-muted" /> Preview
          </label>
          <div className="bg-surface border border-border rounded-xl overflow-hidden h-96 shadow-sm">
            <iframe 
              className="w-full h-full bg-white" 
              sandbox="allow-scripts" 
              srcDoc={previewCode}
              title="Live Preview"
            />
          </div>
        </div>

        <button 
          onClick={publishReel} 
          disabled={loading}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-accent to-pink-500 font-medium text-white hover:opacity-90 transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-accent/20"
        >
          <Rocket size={16} /> {loading ? (editId ? 'Updating...' : 'Publishing...') : (editId ? 'Update Reel' : 'Publish Reel')}
        </button>
      </div>
    </div>
  );
}
