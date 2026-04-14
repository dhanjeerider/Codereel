import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, increment, getDoc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Heart, MessageCircle, Share2, Bookmark, Maximize2, Code2, X, Copy, ArrowUp, ArrowDown, Send } from 'lucide-react';

export default function Feed({ user }: { user: any }) {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'reels'), orderBy('timestamp', 'desc'), limit(30));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReels(reelsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const scrollReels = (direction: number) => {
    if (containerRef.current) {
      const itemHeight = containerRef.current.clientHeight;
      containerRef.current.scrollBy({ top: direction * itemHeight, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted text-sm">Loading reels...</p>
        </div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background">
        <Code2 size={48} className="text-muted mb-4" />
        <h3 className="text-lg font-medium mb-1">No reels yet</h3>
        <p className="text-muted text-sm mb-4">Be the first to share your code</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative flex flex-col">
      <div ref={containerRef} className="flex-1 overflow-y-auto scroll-smooth snap-y snap-mandatory pb-16 md:pb-0 no-scrollbar">
        {reels.map(reel => (
          <ReelItem key={reel.id} reel={reel} user={user} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-2 flex flex-col items-center justify-center space-y-4 z-30 hidden md:flex">
        <button onClick={() => scrollReels(-1)} className="pointer-events-auto bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white p-2 rounded-full transition">
          <ArrowUp size={20} />
        </button>
        <button onClick={() => scrollReels(1)} className="pointer-events-auto bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white p-2 rounded-full transition">
          <ArrowDown size={20} />
        </button>
      </div>
    </div>
  );
}

function ReelItem({ reel, user }: { reel: any, user: any, key?: any }) {
  const [showCode, setShowCode] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [activeTab, setActiveTab] = useState('html');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.likes || 0);
  const [commentCount, setCommentCount] = useState(reel.comments || 0);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const checkLike = async () => {
      const likeDoc = await getDoc(doc(db, 'likes', `${user.uid}_${reel.id}`));
      setIsLiked(likeDoc.exists());
    };
    checkLike();
  }, [user.uid, reel.id]);

  useEffect(() => {
    if (showComments) {
      const q = query(collection(db, 'comments'), orderBy('timestamp', 'desc'), limit(30));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const commentsData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((c: any) => c.reelId === reel.id);
        setComments(commentsData);
      });
      return () => unsubscribe();
    }
  }, [showComments, reel.id]);

  const handleLike = async () => {
    const likeRef = doc(db, 'likes', `${user.uid}_${reel.id}`);
    const reelRef = doc(db, 'reels', reel.id);
    
    if (isLiked) {
      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
      await deleteDoc(likeRef);
      await updateDoc(reelRef, { likes: increment(-1) });
    } else {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      await setDoc(likeRef, { userId: user.uid, reelId: reel.id, timestamp: Date.now() });
      await updateDoc(reelRef, { likes: increment(1) });
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();
    
    await addDoc(collection(db, 'comments'), {
      text: newComment,
      username: userData?.username || 'user',
      userId: user.uid,
      reelId: reel.id,
      timestamp: Date.now()
    });
    
    await updateDoc(doc(db, 'reels', reel.id), { comments: increment(1) });
    setCommentCount(prev => prev + 1);
    setNewComment('');
  };

  const goFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    }
  };

  const copyCode = () => {
    const code = reel[activeTab] || '';
    navigator.clipboard.writeText(code);
    alert('Code copied!');
  };

  const codeContent = `
    <html>
      <head><style>${reel.css || ''}</style></head>
      <body style="margin:0">${reel.html || ''}<script>${reel.js || ''}</script></body>
    </html>
  `;

  return (
    <div className="h-full w-full snap-start relative bg-surface flex flex-col overflow-hidden border-b border-border">
      {/* Thin Header Ad Placeholder */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-r from-accent/20 to-pink-500/20 backdrop-blur-md z-30 flex items-center justify-center border-b border-border/50">
        <span className="text-[10px] font-bold text-white uppercase tracking-widest opacity-70">Advertisement Space</span>
      </div>

      <iframe 
        ref={iframeRef}
        className="absolute inset-0 w-full h-full pt-10 pb-10" 
        sandbox="allow-scripts" 
        srcDoc={codeContent}
        title="Reel Preview"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none"></div>

      <button onClick={goFullscreen} className="absolute top-14 left-6 z-20 bg-panel/90 hover:bg-panel backdrop-blur-sm px-3 py-2 rounded-lg text-foreground font-medium text-xs transition flex items-center gap-2 border border-border shadow-sm">
        <Maximize2 size={14} /> Full
      </button>

      <button onClick={() => setShowCode(!showCode)} className="absolute top-14 right-6 z-20 bg-panel/90 hover:bg-panel backdrop-blur-sm px-3 py-2 rounded-lg text-foreground font-medium text-xs transition flex items-center gap-2 border border-border shadow-sm">
        <Code2 size={14} /> Code
      </button>

      {showCode && (
        <div className="absolute inset-0 bg-panel/95 backdrop-blur-md overflow-auto z-40 flex flex-col p-6 pt-14 transition-all duration-300">
          <div className="flex gap-2 mb-4 border-b border-border pb-4">
            {['html', 'css', 'js'].map(lang => (
              <button 
                key={lang}
                onClick={() => setActiveTab(lang)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${activeTab === lang ? 'bg-gradient-to-r from-accent to-pink-500 text-white shadow-sm' : 'text-muted hover:text-foreground'}`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
            <button onClick={copyCode} className="ml-auto px-3 py-1.5 rounded-md text-xs bg-surface border border-border hover:bg-border/50 transition text-foreground flex items-center gap-1 shadow-sm">
              <Copy size={12} /> Copy
            </button>
          </div>
          <pre className="flex-1 overflow-auto bg-surface p-4 rounded-xl text-xs font-mono text-foreground mb-4 whitespace-pre-wrap border border-border shadow-inner">
            {reel[activeTab] || `/* No ${activeTab.toUpperCase()} */`}
          </pre>
          <button onClick={() => setShowCode(false)} className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-pink-500 hover:opacity-90 transition font-medium text-white flex items-center justify-center gap-2 text-sm shadow-md">
            <X size={16} /> Close Code View
          </button>
        </div>
      )}

      {showComments && (
        <div className="absolute inset-x-0 bottom-10 top-1/3 bg-panel/95 backdrop-blur-xl rounded-t-3xl z-40 flex flex-col p-6 transition-all duration-300 border-t border-border shadow-2xl">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <MessageCircle size={18} className="text-accent" /> Comments
            </h3>
            <button onClick={() => setShowComments(false)} className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted hover:text-foreground hover:bg-border/50 transition">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-5 mb-4 no-scrollbar">
            {comments.length === 0 ? (
              <div className="text-center text-muted text-sm mt-10 flex flex-col items-center gap-2">
                <MessageCircle size={32} className="opacity-20" />
                <p>No comments yet. Be the first!</p>
              </div>
            ) : (
              comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-pink-500 flex items-center justify-center font-bold text-xs flex-shrink-0 text-white shadow-sm">
                    {c.username[0].toUpperCase()}
                  </div>
                  <div className="bg-surface p-3 rounded-2xl rounded-tl-none border border-border/50 shadow-sm flex-1">
                    <p className="font-bold text-xs text-foreground mb-1">@{c.username}</p>
                    <p className="text-muted text-sm leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleComment} className="flex gap-2 pt-2">
            <input 
              type="text" 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..." 
              className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border focus:border-accent focus:outline-none text-foreground placeholder-muted text-sm shadow-sm"
            />
            <button type="submit" disabled={!newComment.trim()} className="px-5 rounded-xl bg-gradient-to-r from-accent to-pink-500 hover:opacity-90 transition text-white flex items-center justify-center disabled:opacity-50 shadow-md">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <div className="absolute bottom-24 md:bottom-14 left-6 right-20 z-20 pointer-events-none">
        <div className="flex items-center gap-3 mb-3 pointer-events-auto cursor-pointer w-fit" onClick={() => window.location.href = `/profile/${reel.userId}`}>
          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center font-bold text-lg overflow-hidden flex-shrink-0 text-foreground border-2 border-white shadow-lg">
            {reel.userPhotoURL ? <img src={reel.userPhotoURL} alt="User" className="w-full h-full object-cover" /> : reel.username[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="font-bold text-base text-white drop-shadow-lg hover:underline">@{reel.username}</p>
            </div>
          </div>
        </div>
        <p className="text-sm leading-relaxed mb-3 text-white drop-shadow-md font-medium">{reel.caption}</p>
        <div className="flex gap-2 flex-wrap pointer-events-auto">
          {(reel.tags || []).map((t: string) => (
            <span key={t} className="text-xs bg-black/40 backdrop-blur-md text-white px-3 py-1.5 rounded-lg font-medium border border-white/10 shadow-sm hover:bg-black/60 transition cursor-pointer">#{t}</span>
          ))}
        </div>
      </div>

      <div className="absolute bottom-24 md:bottom-14 right-6 z-20 flex flex-col gap-6 items-center">
        <button onClick={handleLike} className="flex flex-col items-center gap-1 text-white drop-shadow-md hover:scale-110 transition group">
          <div className={`p-3 rounded-full backdrop-blur-md shadow-lg transition-colors ${isLiked ? 'bg-white text-red-500' : 'bg-black/40 text-white group-hover:bg-black/60 border border-white/10'}`}>
            <Heart size={24} className={isLiked ? "fill-red-500" : ""} />
          </div>
          <span className="text-xs font-bold">{likeCount}</span>
        </button>
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1 text-white drop-shadow-md hover:scale-110 transition group">
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md shadow-lg group-hover:bg-black/60 border border-white/10 transition-colors">
            <MessageCircle size={24} />
          </div>
          <span className="text-xs font-bold">{commentCount}</span>
        </button>
        <button onClick={() => {
          navigator.clipboard.writeText(window.location.origin + '/?reel=' + reel.id);
          alert('Link copied!');
        }} className="flex flex-col items-center gap-1 text-white drop-shadow-md hover:scale-110 transition group">
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md shadow-lg group-hover:bg-black/60 border border-white/10 transition-colors">
            <Share2 size={24} />
          </div>
          <span className="text-xs font-bold">Share</span>
        </button>
      </div>

      {/* Thin Footer Ad Placeholder */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-r from-pink-500/20 to-accent/20 backdrop-blur-md z-30 flex items-center justify-center border-t border-border/50">
        <span className="text-[10px] font-bold text-white uppercase tracking-widest opacity-70">Advertisement Space</span>
      </div>
    </div>
  );
}

