import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Edit, Share2, Video, UserPlus, UserMinus } from 'lucide-react';

export default function Profile({ user }: { user: any }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [userReels, setUserReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        let targetUid = id || user.uid;
        
        setIsOwnProfile(targetUid === user.uid);
        
        const userDoc = await getDoc(doc(db, 'users', targetUid));
        if (userDoc.exists()) {
          setProfileUser({ id: userDoc.id, ...userDoc.data() });
        } else {
          setProfileUser(null);
        }
        
        const q = query(collection(db, 'reels'), where('userId', '==', targetUid));
        const reelsSnap = await getDocs(q);
        setUserReels(reelsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        if (targetUid !== user.uid) {
          const followDoc = await getDoc(doc(db, 'follows', `${user.uid}_${targetUid}`));
          setIsFollowing(followDoc.exists());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [id, user.uid]);

  const handleFollow = async () => {
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
        setProfileUser(prev => ({ ...prev, followers: Math.max(0, (prev.followers || 0) - 1) }));
        setIsFollowing(false);
      } else {
        await setDoc(followRef, { followerId: user.uid, followingId: profileUser.id, timestamp: Date.now() });
        await updateDoc(targetUserRef, { followers: increment(1) });
        await updateDoc(currentUserRef, { following: increment(1) });
        setProfileUser(prev => ({ ...prev, followers: (prev.followers || 0) + 1 }));
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Error updating follow status", error);
    }
    setFollowLoading(false);
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
          <button className="px-5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm font-medium hover:bg-border/50 transition flex items-center gap-2 shadow-sm">
            <Share2 size={16} /> Share
          </button>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {userReels.map(reel => (
              <div 
                key={reel.id}
                onClick={() => navigate('/')}
                className="bg-surface rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent transition group relative aspect-[9/16] border border-border shadow-sm"
              >
                {reel.posterURL ? (
                  <img src={reel.posterURL} alt="Poster" className="w-full h-full object-cover" />
                ) : (
                  <iframe 
                    className="w-full h-full scale-150 group-hover:scale-[1.6] transition pointer-events-none" 
                    sandbox="allow-scripts" 
                    srcDoc={`<html><head><style>${reel.css || ''}</style></head><body style="margin:0">${reel.html || ''}</body></html>`}
                    title="reel thumbnail"
                  />
                )}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
