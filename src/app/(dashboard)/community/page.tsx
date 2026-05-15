'use client';

import { usePosts } from '@/hooks/usePosts';
import { useProfile } from '@/hooks/useProfile';
import { PostCard } from '@/components/Community/PostCard';
import { CreatePostModal } from '@/components/Community/CreatePostModal';
import { supabase } from '@/lib/supabase/client';
import { useState } from 'react';
import { Loader2, Plus, PenLine, Filter, RotateCcw, Tag as TagIcon, Calendar, GraduationCap, Target as TargetIcon } from 'lucide-react';
import { useDialog } from '@/components/DialogProvider';
import { UserProfileModal } from '@/components/Community/UserProfileModal';

const PRESET_TAGS = [
  'doubts', 'physics', 'chemistry', 'maths', 'help',
  'jee', 'neet', 'organic', 'physical', 'inorganic',
  'strategy', 'storytime', 'mock test', '2027', '2028',
];

export default function CommunityPage() {
  const { profile } = useProfile();
  const { posts, setPosts, loading, refetch } = usePosts();
  const { toast, confirm } = useDialog();
  const [filter, setFilter] = useState<'all' | 'my' | 'popular'>('all');
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Advanced Filters State
  const [targetYearFilter, setTargetYearFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const isAnyFilterActive = targetYearFilter !== 'ALL' || classFilter !== 'ALL' || tagFilter !== 'ALL' || timeFilter !== 'ALL' || filter !== 'all';

  const resetFilters = () => {
    setTargetYearFilter('ALL');
    setClassFilter('ALL');
    setTagFilter('ALL');
    setTimeFilter('ALL');
    setFilter('all');
  };

  const handleVote = async (postId: string, value: number) => {
    if (!profile) return;

    // Optimistic Update
    setPosts(currentPosts => currentPosts.map(post => {
      if (post.id === postId) {
        let newScore = post.score;
        let newMyVote = value;
        if (post.myVote === value) {
          newScore -= value;
          newMyVote = 0;
        } else {
          newScore = newScore - post.myVote + value;
        }
        return { ...post, score: newScore, myVote: newMyVote };
      }
      return post;
    }));

    const { data: existing } = await supabase
      .from('votes')
      .select('id, value')
      .eq('post_id', postId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (existing) {
      if (existing.value === value) {
        await supabase.from('votes').delete().eq('id', existing.id);
      } else {
        await supabase.from('votes').update({ value }).eq('id', existing.id);
      }
    } else {
      await supabase.from('votes').insert({ post_id: postId, user_id: profile.id, value });
    }
  };

  const filteredPosts = posts.filter(post => {
    // 1. Basic Filter (All/My/Popular)
    if (filter === 'my' && post.user_id !== profile?.id) return false;
    if (filter === 'popular' && post.score < 10) return false;

    // 2. Target Year
    if (targetYearFilter !== 'ALL' && post.profiles?.target_year !== targetYearFilter) return false;

    // 3. Class
    if (classFilter !== 'ALL' && post.profiles?.class !== classFilter) return false;

    // 4. Tag
    if (tagFilter !== 'ALL' && !(post.tags || []).includes(tagFilter)) return false;

    // 5. Time
    if (timeFilter !== 'ALL') {
      const postDate = new Date(post.created_at);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 3600 * 24));

      if (timeFilter === 'TODAY' && diffDays > 0) return false;
      if (timeFilter === 'YESTERDAY' && (diffDays < 1 || diffDays >= 2)) return false;
      if (timeFilter === '1_WEEK' && diffDays > 7) return false;
      if (timeFilter === '1_MONTH' && diffDays > 30) return false;
    }

    return true;
  });

  const handleDelete = async (postId: string) => {
    const ok = await confirm({
      title: 'Delete Post',
      message: 'Are you sure you want to delete this post?',
      danger: true,
      confirmLabel: 'Delete'
    });
    if (!ok) return;
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) toast('Error: ' + error.message, 'error');
    else {
      toast('Post deleted', 'success');
      refetch();
    }
  };

  return (
    <div className="an-content px-4">
      <div className="max-w-[1200px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Posts (8 cols) */}
        <div className="lg:col-span-8 order-2 lg:order-1">
          {/* Toggle Bar */}
          <div className="flex justify-center lg:justify-start mb-6">
            <div className="flex items-center bg-bg-2 border border-white/5 p-1 rounded-xl w-full max-w-lg">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 py-2 px-4 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all ${filter === 'all' ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:text-white'}`}
              >
                All Posts
              </button>
              <button
                onClick={() => setFilter('my')}
                className={`flex-1 py-2 px-4 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 ${filter === 'my' ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:text-white'}`}
              >
                My Posts
              </button>
              <button
                onClick={() => setFilter('popular')}
                className={`flex-1 py-2 px-4 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 ${filter === 'popular' ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:text-white'}`}
              >
                Popular
              </button>
            </div>
          </div>

          {/* Posts List */}
          <div className="space-y-6 pb-32">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-400 opacity-50" />
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.3em]">Synching with Social_Feed...</p>
                </div>
              </div>
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  onVote={handleVote} 
                  canModerate={profile?.role === 'admin' || profile?.role === 'mod'} 
                  onDelete={handleDelete} 
                  onShowUser={setSelectedUserId}
                />
              ))
            ) : (
              <div className="text-center py-32 bg-bg-2/30 border border-white/5 rounded-3xl backdrop-blur-sm">
                <div className="mb-6 opacity-20 flex justify-center"><Filter size={60} /></div>
                <p className="text-gray-400 font-mono text-xs mb-8 uppercase tracking-widest">
                  {isAnyFilterActive ? "No matches found for active filters." : "Zero posts detected in this sector."}
                </p>
                {isAnyFilterActive && (
                  <button onClick={resetFilters} className="px-6 py-3 rounded-xl bg-[#ffffff05] border border-[#ffffff10] text-cyan-400 text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-400 hover:text-black transition-all">
                    Reset Protocol
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Filters (4 cols) */}
        <div className="lg:col-span-4 order-1 lg:order-2">
          <div className="sticky top-24 space-y-6">

            {/* Header + Reset */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white font-mono text-[10px] uppercase tracking-[0.2em] font-bold">
                <Filter size={14} className="text-cyan-400" />
                Feed Filters
              </div>
              {isAnyFilterActive && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-widest hover:bg-red-400/10 px-3 py-1.5 rounded-lg transition-all"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              )}
            </div>

            {/* Target Year Filter */}
            <div className="bg-bg-2 border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <TargetIcon size={14} /> Target Year
              </div>
              <div className="flex flex-wrap gap-2">
                {['ALL', '2025', '2026', '2027', '2028', '2029'].map(year => (
                  <button
                    key={year}
                    onClick={() => setTargetYearFilter(year)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${targetYearFilter === year ? 'bg-cyan-500 text-black border-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-white/5 text-muted-foreground border-white/10 hover:border-muted-foreground/30'}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Class Filter */}
            <div className="bg-bg-2 border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <GraduationCap size={14} /> Academic Stage
              </div>
              <div className="flex flex-col gap-2">
                {['ALL', 'Class 11', 'Class 12', 'Dropper'].map(cls => (
                  <button
                    key={cls}
                    onClick={() => setClassFilter(cls)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${classFilter === cls ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-white/5 text-muted-foreground border-white/10 hover:border-muted-foreground/30'}`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Filter */}
            <div className="bg-bg-2 border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <TagIcon size={14} /> Subject Tags
              </div>
              <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                <button
                  onClick={() => setTagFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${tagFilter === 'ALL' ? 'bg-foreground text-background border-foreground' : 'bg-white/5 text-muted-foreground border-white/10 hover:border-muted-foreground/30'}`}
                >
                  ALL TAGS
                </button>
                {PRESET_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tag)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${tagFilter === tag ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-white/5 text-muted-foreground border-white/10 hover:border-muted-foreground/30'}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Filter */}
            <div className="bg-[#12121a] border border-[#ffffff08] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <Calendar size={14} /> Temporal Sync
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'ALL', label: 'All Time' },
                  { id: 'TODAY', label: 'Today' },
                  { id: 'YESTERDAY', label: 'Yesterday' },
                  { id: '1_WEEK', label: 'Last 7 Days' },
                  { id: '1_MONTH', label: 'Last 30 Days' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTimeFilter(t.id)}
                    className={`px-3 py-2 rounded-lg text-[9px] font-bold uppercase transition-all border ${timeFilter === t.id ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white/5 text-muted-foreground border-white/10 hover:border-muted-foreground/30'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* FAB Button */}
      <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end gap-3">
        {showFabMenu && (
          <div className="flex flex-col items-end gap-2 animate-fade-in">
            <button 
              onClick={() => { setShowFabMenu(false); setShowCreateModal(true); }} 
              className="flex items-center gap-3 bg-[#12121a] border border-[#ffffff12] text-white px-4 py-3 rounded-2xl shadow-xl hover:border-cyan-400/50 transition-all group"
            >
              <span className="text-sm font-bold text-gray-200 group-hover:text-white">Create Post</span>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <PenLine size={15} className="text-black" />
              </div>
            </button>
          </div>
        )}
        <button 
          onClick={() => setShowFabMenu(!showFabMenu)} 
          className={`w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 ${
            showFabMenu 
              ? 'bg-white/10 border border-white/20 rotate-45' 
              : 'bg-gradient-to-br from-cyan-400 to-blue-500 shadow-cyan-500/40 hover:scale-110'
          }`}
        >
          <Plus size={26} className={showFabMenu ? 'text-white' : 'text-black'} />
        </button>
      </div>

      {showCreateModal && <CreatePostModal onClose={() => setShowCreateModal(false)} onSuccess={() => refetch()} />}

      {selectedUserId && <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ffffff10; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ffffff20; }
      `}</style>
    </div>
  );
}
