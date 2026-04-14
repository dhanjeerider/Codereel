import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Search, Hash } from 'lucide-react';

export default function Explore() {
  const navigate = useNavigate();
  const [reels, setReels] = useState<any[]>([]);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExplore = async () => {
      const q = query(collection(db, 'reels'), orderBy('timestamp', 'desc'), limit(40));
      const snapshot = await getDocs(q);
      const reelsData: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReels(reelsData);
      
      const tagsCount: Record<string, number> = {};
      reelsData.forEach(r => {
        (r.tags || []).forEach((t: string) => {
          tagsCount[t] = (tagsCount[t] || 0) + 1;
        });
      });
      
      const sortedTags = Object.entries(tagsCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([t]) => t);
        
      setTrendingTags(sortedTags);
      setLoading(false);
    };
    fetchExplore();
  }, []);

  const filteredReels = reels.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().replace('#', '');
    return (
      (r.caption || '').toLowerCase().includes(q) ||
      (r.tags || []).some((t: string) => t.toLowerCase().includes(q)) ||
      (r.username || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gradient-app pb-20 md:pb-0">
      <div className="p-6 sticky top-0 bg-panel/80 backdrop-blur-md border-b border-border z-30">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input 
            type="text" 
            placeholder="Search reels, hashtags, users..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-surface border border-border focus:border-accent focus:outline-none text-foreground placeholder-muted text-sm shadow-sm"
          />
        </div>
      </div>
      
      {!searchQuery && trendingTags.length > 0 && (
        <div className="px-6 py-4 flex flex-wrap gap-2 max-w-6xl mx-auto w-full">
          {trendingTags.map(tag => (
            <button 
              key={tag}
              onClick={() => setSearchQuery(`#${tag}`)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted hover:text-foreground hover:bg-surface transition flex items-center gap-1 bg-panel shadow-sm"
            >
              <Hash size={12} /> {tag}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredReels.map(reel => (
            <div 
              key={reel.id}
              onClick={() => navigate(`/?reel=${reel.id}`)}
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition"></div>
              <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${reel.userId}`); }}>
                <div className="w-6 h-6 rounded-full bg-surface overflow-hidden border border-border/50 flex items-center justify-center text-[10px] font-bold text-foreground">
                  {reel.userPhotoURL ? <img src={reel.userPhotoURL} alt="User" className="w-full h-full object-cover" /> : reel.username[0].toUpperCase()}
                </div>
                <span className="text-white text-xs font-medium truncate drop-shadow-md hover:underline">@{reel.username}</span>
              </div>
            </div>
          ))}
        </div>
        {filteredReels.length === 0 && (
          <div className="text-center text-muted mt-10 text-sm bg-panel p-8 rounded-2xl border border-border max-w-md mx-auto">
            No reels found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
