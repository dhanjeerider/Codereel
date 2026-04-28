import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Edit, Share2, Video, UserPlus, UserMinus, Twitter, Facebook, MessageCircle, Copy, X, ShieldAlert } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export default function Profile({ user }: { user: any }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [userReels, setUserReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [confirmBan, setConfirmBan] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const targetUid = id || user?.uid;
        if (!targetUid) {
          setProfileUser(null);
          setLoading(false);
          return;
        }
        
        setIsOwnProfile(user ? targetUid === user.uid : false);
        
        const userDoc = await getDoc(doc(db, 'users', targetUid));
        if (userDoc.exists()) {
          setProfileUser({ id: userDoc.id, ...userDoc.data() });
        } else {
          setProfileUser(null);
        }
        
        const q = query(collection(db, 'reels'), where('userId', '==', targetUid));
        const reelsSnap = await getDocs(q);
        setUserReels(reelsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        if (user && targetUid !== user.uid) {
          const followDoc = await getDoc(doc(db, 'follows', `${user.uid}_${targetUid}`))
            .catch(err => {
              if (err.message?.includes('offline')) throw err;
              return handleFirestoreError(err, OperationType.GET, `follows/${user.uid}_${targetUid}`);
            });
          setIsFollowing(followDoc.exists());
        }
      } catch (err: any) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [id, user.uid]);

  const handleFollow = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!profileUser || isOwnProfile || followLoading) return;
    setFollowLoading(true);
    
    const followRef = doc(db, 'follows', `${user.uid}_${profileUser.id}`);
    const targetUserRef = doc(db, 'users', profileUser.id);
    const currentUserRef = doc(db, 'users', user.uid);

    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        await updateDoc(targetUserRef, { followers: increment(-1) });
        await updateDoc(currentUserRef, { following: increment(-1) });
        setProfileUser((prev: any) => ({ ...prev, followers: Math.max(0, (prev.followers || 0) - 1) }));
        setIsFollowing(false);
      } else {
        await setDoc(followRef, { followerId: user.uid, followingId: profileUser.id, timestamp: Date.now() });
        await updateDoc(targetUserRef, { followers: increment(1) });
        await updateDoc(currentUserRef, { following: increment(1) });
        setProfileUser((prev: any) => ({ ...prev, followers: (prev.followers || 0) + 1 }));
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Error updating follow status", error);
    }
    setFollowLoading(false);
  };

  const handleBanUser = async () => {
    if (!user || !user.isAdmin || isOwnProfile) return;
    try {
      await updateDoc(doc(db, 'users', profileUser.id), { isBanned: !profileUser.isBanned });
      setProfileUser((prev: any) => ({ ...prev, isBanned: !prev.isBanned }));
    } catch (err) {
      console.error("Error updating ban status", err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-sm">
        User not found
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-background pb-20 md:pb-0 relative">
      {profileUser.bannerURL && (
        <div className="w-full h-48 md:h-64 bg-surface absolute top-0 left-0 right-0 z-0">
          <img src={profileUser.bannerURL} alt="Banner" className="w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background"></div>
        </div>
      )}
      
      <div className={`relative z-10 bg-panel/60 backdrop-blur-md ${profileUser.bannerURL ? 'pt-32' : 'pt-16'} pb-10 px-6 text-center border-b border-border`}>
        <div className="w-24 h-24 rounded-full bg-surface mx-auto mb-4 flex items-center justify-center text-3xl font-medium overflow-hidden border-4 border-background text-foreground shadow-xl">
          {profileUser.photoURL ? (
            <img src={profileUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            (profileUser.name || 'U')[0].toUpperCase()
          )}
        </div>
        
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{profileUser.name}</h2>
          {profileUser.isVerified && <CheckCircle className="text-accent" size={18} />}
        </div>
        
        <p className="text-muted text-sm font-medium">@{profileUser.username}</p>
        <p className="text-foreground text-sm mt-4 max-w-md mx-auto leading-relaxed">{profileUser.bio || 'No bio yet'}</p>
        
        <div className="flex justify-center gap-8 mt-8 text-center bg-surface/50 py-4 rounded-2xl max-w-md mx-auto border border-border/50 backdrop-blur-sm">
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">{profileUser.followers || 0}</div>
            <div className="text-xs text-muted mt-1 font-medium">Followers</div>
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">{profileUser.following || 0}</div>
            <div className="text-xs text-muted mt-1 font-medium">Following</div>
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">{userReels.length}</div>
            <div className="text-xs text-muted mt-1 font-medium">Reels</div>
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">{profileUser.likes || 0}</div>
            <div className="text-xs text-muted mt-1 font-medium">Likes</div>
          </div>
        </div>

        <div className="flex gap-3 justify-center mt-8">
          {isOwnProfile ? (
            <button onClick={() => navigate('/settings')} className="px-6 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-surface transition flex items-center gap-2 shadow-sm bg-panel">
              <Edit size={16} /> Edit Profile
            </button>
          ) : (
            <button 
              onClick={handleFollow}
              disabled={followLoading}
              className={`px-8 py-2.5 rounded-xl text-sm font-medium transition shadow-sm flex items-center gap-2 ${isFollowing ? 'bg-surface border border-border text-foreground hover:bg-border/50' : 'bg-gradient-to-r from-accent to-pink-500 text-white hover:opacity-90'}`}
            >
              {isFollowing ? <><UserMinus size={16} /> Unfollow</> : <><UserPlus size={16} /> Follow</>}
            </button>
          )}
          <button onClick={() => setShowShareModal(true)} className="px-5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm font-medium hover:bg-border/50 transition flex items-center gap-2 shadow-sm">
            <Share2 size={16} /> Share
          </button>
          
          {user?.isAdmin && !isOwnProfile && (
            <button onClick={() => setConfirmBan(true)} className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition flex items-center gap-2 shadow-sm ${profileUser.isBanned ? 'bg-green-500/10 border-green-500/50 text-green-500 hover:bg-green-500/20' : 'bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20'}`}>
              <ShieldAlert size={16} /> {profileUser.isBanned ? 'Unban User' : 'Ban User'}
            </button>
          )}
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto relative z-10">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 tracking-tight text-foreground">
          <Video className="text-muted" size={18} /> {isOwnProfile ? 'My Reels' : 'Reels'}
        </h3>
        
        {userReels.length === 0 ? (
          <div className="text-center text-muted py-12 text-sm bg-panel rounded-2xl border border-border">
            No reels yet
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {userReels.map(reel => (
              <div 
                key={reel.id}
                onClick={() => navigate(`/?reel=${reel.id}`)}
                className="bg-surface rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent transition group relative aspect-[9/16] border border-border shadow-md"
              >
                {reel.posterURL ? (
                  <img src={reel.posterURL} alt="Poster" className="w-full h-full object-cover" />
                ) : (
                  <div className="reel-thumbnail-container">
                    <iframe 
                      className="reel-thumbnail-iframe" 
                      sandbox="allow-scripts" 
                      srcDoc={`<html><head><style>${reel.css || ''}</style></head><body style="margin:0">${reel.html || ''}</body></html>`}
                      title="reel thumbnail"
                    />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition z-10"></div>
                
                <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-end z-20">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = `${window.location.origin}/?reel=${reel.id}`;
                      navigator.clipboard.writeText(url);
                      alert("Reel link copied to clipboard!");
                    }}
                    className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-accent transition-colors shadow-lg border border-white/10"
                    title="Share Reel"
                  >
                    <Share2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-panel w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
                <Share2 size={18} className="text-accent" /> Share Profile
              </h3>
              <button onClick={() => setShowShareModal(false)} className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted hover:text-foreground hover:bg-border/50 transition">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/profile/' + profileUser.id); setShowShareModal(false); }} className="flex items-center gap-4 p-3 rounded-xl bg-surface hover:bg-border/50 transition border border-border/50 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-panel flex items-center justify-center shadow-sm text-foreground"><Copy size={18} /></div>
                <span className="font-bold text-foreground">Copy Direct Link</span>
              </button>
              <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.origin + '/profile/' + profileUser.id)}&text=${encodeURIComponent('Check out @' + profileUser.username + '\'s profile on CodeReel!')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 rounded-xl bg-surface hover:bg-border/50 transition border border-border/50 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#1DA1F2]/10 text-[#1DA1F2] flex items-center justify-center shadow-sm"><Twitter size={18} /></div>
                <span className="font-bold text-foreground">Share on Twitter</span>
              </a>
              <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Check out @' + profileUser.username + '\'s profile on CodeReel! ' + window.location.origin + '/profile/' + profileUser.id)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 rounded-xl bg-surface hover:bg-border/50 transition border border-border/50 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center shadow-sm"><MessageCircle size={18} /></div>
                <span className="font-bold text-foreground">Share on WhatsApp</span>
              </a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '/profile/' + profileUser.id)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 rounded-xl bg-surface hover:bg-border/50 transition border border-border/50 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center shadow-sm"><Facebook size={18} /></div>
                <span className="font-bold text-foreground">Share on Facebook</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmBan}
        title={profileUser?.isBanned ? 'Unban User' : 'Ban User'}
        message={profileUser?.isBanned ? 'Are you sure you want to unban this user? They will regain access to the application.' : 'Are you sure you want to ban this user? They will lose access to the application.'}
        onConfirm={handleBanUser}
        onCancel={() => setConfirmBan(false)}
      />
    </div>
  );
}
