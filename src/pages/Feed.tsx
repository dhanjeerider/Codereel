import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, increment, getDoc, setDoc, deleteDoc, addDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Heart, MessageCircle, Share2, Bookmark, Maximize2, Code2, X, Copy, ArrowUp, ArrowDown, Send, Twitter, Facebook, MoreVertical, Trash2, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export default function Feed({ user }: { user: any }) {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const reelIdFromUrl = searchParams.get('reel');

  useEffect(() => {
    let q;
    if (reelIdFromUrl) {
      // If a specific reel is requested, we fetch it first or prioritize it
      const fetchRequestedReel = async () => {
        try {
          const reelDoc = await getDoc(doc(db, 'reels', reelIdFromUrl));
          if (reelDoc.exists()) {
            const requestedReel = { id: reelDoc.id, ...reelDoc.data() };
            // Then fetch others
            const othersQuery = query(
              collection(db, 'reels'), 
              orderBy('timestamp', 'desc'), 
              limit(30)
            );
            const othersSnap = await getDocs(othersQuery);
            const othersData = othersSnap.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .filter(d => d.id !== reelIdFromUrl);
              
            setReels([requestedReel, ...othersData]);
          } else {
            // Fallback if requested reel doesn't exist
            const fallbackQuery = query(collection(db, 'reels'), orderBy('timestamp', 'desc'), limit(30));
            const fallbackSnap = await getDocs(fallbackQuery);
            setReels(fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          }
        } catch (error) {
          console.error("Error fetching specific reel:", error);
          const fallbackQuery = query(collection(db, 'reels'), orderBy('timestamp', 'desc'), limit(30));
          const fallbackSnap = await getDocs(fallbackQuery);
          setReels(fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } finally {
          setLoading(false);
        }
      };
      fetchRequestedReel();
      return;
    }

    q = query(collection(db, 'reels'), orderBy('timestamp', 'desc'), limit(30));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReels(reelsData);
      setLoading(false);
    }, (error) => {
      console.error("Feed snapshot error:", error);
      handleFirestoreError(error, OperationType.GET, 'reels');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [reelIdFromUrl]);

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
      <div ref={containerRef} className="flex-1 overflow-y-auto scroll-smooth snap-y snap-mandatory no-scrollbar">
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{type: 'reel' | 'comment', id?: string} | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkLike = async () => {
      if (!user) return;
      const likeDoc = await getDoc(doc(db, 'likes', `${user.uid}_${reel.id}`));
      setIsLiked(likeDoc.exists());
    };
    checkLike();
  }, [user, reel.id]);

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
    if (!user) {
      navigate('/auth');
      return;
    }
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
    if (!user) {
      navigate('/auth');
      return;
    }
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

  const handleDeleteComment = async (commentId: string) => {
    await deleteDoc(doc(db, 'comments', commentId));
    await updateDoc(doc(db, 'reels', reel.id), { comments: increment(-1) });
    setCommentCount(prev => Math.max(0, prev - 1));
  };

  const handleDeleteReel = async () => {
    await deleteDoc(doc(db, 'reels', reel.id));
    // Also decrement user's reel count
    await updateDoc(doc(db, 'users', reel.userId), { reels: increment(-1) });
  };

  const executeConfirmAction = () => {
    if (confirmAction?.type === 'reel') {
      handleDeleteReel();
    } else if (confirmAction?.type === 'comment' && confirmAction.id) {
      handleDeleteComment(confirmAction.id);
    }
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
    // Removed alert
  };

  const codeContent = `
    <html>
      <head><style>${reel.css || ''}</style></head>
      <body style="margin:0">${reel.html || ''}<script>${reel.js || ''}</script></body>
    </html>
  `;

  return (
    <div className="h-full w-full snap-start relative bg-surface flex flex-col overflow-hidden border-b border-border">
      <iframe 
        ref={iframeRef}
        className="absolute inset-0 w-full h-full" 
        sandbox="allow-scripts" 
        srcDoc={codeContent}
        title="Reel Preview"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none"></div>

      <button onClick={goFullscreen} className="absolute top-4 left-4 z-20 bg-panel/90 hover:bg-panel backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-foreground font-medium text-[11px] transition flex items-center gap-1.5 border border-border shadow-sm">
        <Maximize2 size={12} /> Full
      </button>

      <button onClick={() => setShowCode(!showCode)} className="absolute top-4 right-4 z-20 bg-panel/90 hover:bg-panel backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-foreground font-medium text-[11px] transition flex items-center gap-1.5 border border-border shadow-sm">
        <Code2 size={12} /> Code
      </button>

      {user && (user.uid === reel.userId || user.isAdmin) && (
        <div className="absolute top-4 right-20 z-20">
          <button onClick={() => setShowOptions(!showOptions)} className="bg-panel/90 hover:bg-panel backdrop-blur-sm p-1.5 rounded-lg text-foreground transition border border-border shadow-sm">
            <MoreVertical size={14} />
          </button>
          
          {showOptions && (
            <div className="absolute top-full right-0 mt-2 w-36 bg-panel border border-border rounded-xl shadow-xl overflow-hidden flex flex-col z-50">
              <button onClick={() => navigate(`/create?edit=${reel.id}`)} className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-surface transition text-foreground text-left">
                <Edit size={14} /> Edit Reel
              </button>
              <button onClick={() => { setShowOptions(false); setConfirmAction({ type: 'reel' }); }} className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-red-500/10 text-red-500 transition text-left border-t border-border/50">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      )}

      {showCode && (
        <div className="absolute inset-0 bg-panel/95 backdrop-blur-md overflow-auto z-40 flex flex-col p-6 transition-all duration-300">
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
        <div className="absolute inset-x-0 bottom-16 top-1/3 bg-panel/95 backdrop-blur-xl rounded-t-3xl z-[60] flex flex-col p-6 transition-all duration-300 border-t border-border shadow-2xl">
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
                  <div className="bg-surface p-3 rounded-2xl rounded-tl-none border border-border/50 shadow-sm flex-1 relative group">
                    <p className="font-bold text-xs text-foreground mb-1">@{c.username}</p>
                    <p className="text-muted text-sm leading-relaxed">{c.text}</p>
                    {user && (user.uid === c.userId || user.isAdmin) && (
                      <button 
                        onClick={() => setConfirmAction({ type: 'comment', id: c.id })} 
                        className="absolute top-2 right-2 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
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

      {showShareModal && (
        <div className="absolute inset-x-0 bottom-16 top-1/3 bg-panel/95 backdrop-blur-xl rounded-t-3xl z-[60] flex flex-col p-6 transition-all duration-300 border-t border-border shadow-2xl">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
            <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
              <Share2 size={18} className="text-accent" /> Share Reel
            </h3>
            <button onClick={() => setShowShareModal(false)} className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted hover:text-foreground hover:bg-border/50 transition">
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar pb-4">
            <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/?reel=' + reel.id); setShowShareModal(false); }} className="flex items-center gap-4 p-4 rounded-2xl bg-surface hover:bg-border/50 transition border border-border/50 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-panel flex items-center justify-center shadow-sm text-foreground"><Copy size={20} /></div>
              <span className="font-bold text-foreground">Copy Direct Link</span>
            </button>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.origin + '/?reel=' + reel.id)}&text=${encodeURIComponent('Check out this awesome code reel by @' + reel.username + ' on CodeReel!')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-surface hover:bg-border/50 transition border border-border/50 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#1DA1F2]/10 text-[#1DA1F2] flex items-center justify-center shadow-sm"><Twitter size={20} /></div>
              <span className="font-bold text-foreground">Share on Twitter</span>
            </a>
            <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Check out this awesome code reel by @' + reel.username + ' on CodeReel! ' + window.location.origin + '/?reel=' + reel.id)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-surface hover:bg-border/50 transition border border-border/50 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center shadow-sm"><MessageCircle size={20} /></div>
              <span className="font-bold text-foreground">Share on WhatsApp</span>
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '/?reel=' + reel.id)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-surface hover:bg-border/50 transition border border-border/50 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center shadow-sm"><Facebook size={20} /></div>
              <span className="font-bold text-foreground">Share on Facebook</span>
            </a>
          </div>
        </div>
      )}

      <div className="absolute bottom-32 md:bottom-10 left-4 right-16 z-30 pointer-events-none">
        <div className="flex items-center gap-3 mb-2 pointer-events-auto cursor-pointer w-fit" onClick={() => navigate(`/profile/${reel.userId}`)}>
          <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center font-bold text-base overflow-hidden flex-shrink-0 text-foreground border-2 border-white shadow-lg">
            {reel.userPhotoURL ? <img src={reel.userPhotoURL} alt="User" className="w-full h-full object-cover" /> : reel.username[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="font-bold text-sm text-white drop-shadow-lg hover:underline">@{reel.username}</p>
            </div>
          </div>
        </div>
        <p className="text-xs leading-relaxed mb-2 text-white drop-shadow-md font-medium">{reel.caption}</p>
        <div className="flex gap-1.5 flex-wrap pointer-events-auto">
          {(reel.tags || []).map((t: string) => (
            <span key={t} className="text-xs bg-black/40 backdrop-blur-md text-white px-3 py-1.5 rounded-lg font-medium border border-white/10 shadow-sm hover:bg-black/60 transition cursor-pointer">#{t}</span>
          ))}
        </div>
      </div>

      <div className="absolute bottom-32 md:bottom-10 right-4 z-30 flex flex-col gap-5 items-center">
        <button onClick={handleLike} className="flex flex-col items-center gap-1 text-white drop-shadow-md hover:scale-110 transition group">
          <div className={`p-2.5 rounded-full backdrop-blur-md shadow-lg transition-colors ${isLiked ? 'bg-white text-red-500' : 'bg-black/40 text-white group-hover:bg-black/60 border border-white/10'}`}>
            <Heart size={20} className={isLiked ? "fill-red-500" : ""} />
          </div>
          <span className="text-[10px] font-bold">{likeCount}</span>
        </button>
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1 text-white drop-shadow-md hover:scale-110 transition group">
          <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md shadow-lg group-hover:bg-black/60 border border-white/10 transition-colors">
            <MessageCircle size={20} />
          </div>
          <span className="text-[10px] font-bold">{commentCount}</span>
        </button>
        <button onClick={() => setShowShareModal(true)} className="flex flex-col items-center gap-1 text-white drop-shadow-md hover:scale-110 transition group">
          <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md shadow-lg group-hover:bg-black/60 border border-white/10 transition-colors">
            <Share2 size={20} />
          </div>
          <span className="text-[10px] font-bold">Share</span>
        </button>
      </div>

      <ConfirmModal 
        isOpen={confirmAction !== null}
        title={confirmAction?.type === 'reel' ? 'Delete Reel' : 'Delete Comment'}
        message={confirmAction?.type === 'reel' ? 'Are you sure you want to delete this reel? This action cannot be undone.' : 'Are you sure you want to delete this comment?'}
        onConfirm={executeConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

