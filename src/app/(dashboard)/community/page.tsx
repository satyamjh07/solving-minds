'use client';

import { usePosts, Post } from '@/hooks/usePosts';
import { useProfile } from '@/hooks/useProfile';
import { PostCard } from '@/components/Community/PostCard';
import { CreatePostModal } from '@/components/Community/CreatePostModal';
import { EditPostModal } from '@/components/Community/EditPostModal';
import { supabase } from '@/lib/supabase/client';
import { useMemo, useState } from 'react';
import {
  PenLine, Filter, RotateCcw, Tag as TagIcon,
  Calendar, GraduationCap, Target as TargetIcon, Search, X, MessageSquarePlus
} from 'lucide-react';
import { useDialog } from '@/components/DialogProvider';
import { UserProfileModal } from '@/components/Community/UserProfileModal';

const PRESET_TAGS = [
  'doubts', 'physics', 'chemistry', 'maths', 'help',
  'jee', 'neet', 'organic', 'physical', 'inorganic',
  'strategy', 'storytime', 'mock test', '2027', '2028',
];

const TIME_OPTIONS = [
  { id: 'ALL', label: 'All Time' },
  { id: 'TODAY', label: 'Today' },
  { id: 'YESTERDAY', label: 'Yesterday' },
  { id: '1_WEEK', label: 'Last 7 Days' },
  { id: '1_MONTH', label: 'Last 30 Days' }
];

export default function CommunityPage() {
  const { profile } = useProfile();
  const { toast, confirm } = useDialog();
  const [filter, setFilter] = useState<'all' | 'my' | 'popular'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [targetYearFilter, setTargetYearFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const { posts, setPosts, loading, refetch } = usePosts({
    type: filter,
    targetYear: targetYearFilter,
    class_: classFilter,
    tag: tagFilter,
    timeRange: timeFilter
  });

  const activeFilterCount = [
    targetYearFilter !== 'ALL',
    classFilter !== 'ALL',
    tagFilter !== 'ALL',
    timeFilter !== 'ALL',
  ].filter(Boolean).length;

  const isAnyFilterActive = activeFilterCount > 0 || filter !== 'all' || searchQuery.trim().length > 0;

  const resetFilters = () => {
    setTargetYearFilter('ALL');
    setClassFilter('ALL');
    setTagFilter('ALL');
    setTimeFilter('ALL');
    setFilter('all');
    setSearchQuery('');
  };

  const handleVote = async (postId: string, value: number) => {
    if (!profile) return;

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

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(p => {
      const inTitle = (p.title || '').toLowerCase().includes(q);
      const inContent = (p.content || '').toLowerCase().includes(q);
      const inTags = Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(q));
      const inAuthor = !p.is_anonymous && (p.profiles?.name || '').toLowerCase().includes(q);
      return inTitle || inContent || inTags || inAuthor;
    });
  }, [posts, searchQuery]);

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
    <div className="an-content px-4 pb-28">
      <div className="max-w-[1200px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

        {/* Left Column: Feed (8 cols) */}
        <div className="lg:col-span-8 order-2 lg:order-1 space-y-5">

          {/* Feed Controls Header */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div
              role="tablist"
              aria-label="Feed view"
              className="flex items-center bg-[var(--card)] border border-[var(--border)] p-1 rounded-xl w-full sm:w-auto sm:min-w-[300px]"
            >
              {[
                { id: 'all', label: 'All Posts' },
                { id: 'my', label: 'My Posts' },
                { id: 'popular', label: 'Popular' },
              ].map(tab => {
                const active = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(tab.id as any)}
                    className={`flex-1 py-2 px-3.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                      active
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'text-[var(--text2)] hover:text-[var(--text)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => setShowMobileFilters(v => !v)}
                aria-expanded={showMobileFilters}
                className="lg:hidden inline-flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text)] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                <Filter size={14} className={activeFilterCount > 0 ? 'text-[var(--accent)]' : 'text-[var(--text2)]'} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold tabular-nums">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex-1 sm:flex-none bg-[var(--accent)] hover:brightness-110 active:scale-[0.99] text-white font-semibold text-xs px-4 py-2.5 rounded-xl inline-flex items-center justify-center gap-2 transition-all shadow-sm focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                <PenLine size={14} />
                <span>Create Post</span>
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text2)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search discussions, doubts, or #tags..."
              aria-label="Search posts"
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-[var(--card)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl text-[var(--text)] placeholder:text-[var(--text3)] outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text2)] hover:text-[var(--text)] p-0.5 rounded"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Active Filters Summary Bar */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[var(--text2)] font-medium">Active:</span>
              {targetYearFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setTargetYearFilter('ALL')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)]/30 font-semibold"
                >
                  Target {targetYearFilter} <X size={12} />
                </button>
              )}
              {classFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setClassFilter('ALL')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)]/30 font-semibold"
                >
                  {classFilter} <X size={12} />
                </button>
              )}
              {tagFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setTagFilter('ALL')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)]/30 font-semibold"
                >
                  #{tagFilter} <X size={12} />
                </button>
              )}
              {timeFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setTimeFilter('ALL')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)]/30 font-semibold"
                >
                  {TIME_OPTIONS.find(t => t.id === timeFilter)?.label} <X size={12} />
                </button>
              )}
              <button
                type="button"
                onClick={resetFilters}
                className="text-[var(--text2)] hover:text-[var(--red)] font-semibold ml-1 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Posts Feed */}
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4" aria-busy="true" aria-label="Loading posts">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-3 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[var(--bg2)]" />
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-28 rounded bg-[var(--bg2)]" />
                        <div className="h-2.5 w-20 rounded bg-[var(--bg2)]" />
                      </div>
                    </div>
                    <div className="h-4 w-3/4 rounded bg-[var(--bg2)]" />
                    <div className="h-3.5 w-full rounded bg-[var(--bg2)]" />
                    <div className="h-3.5 w-2/3 rounded bg-[var(--bg2)]" />
                  </div>
                ))}
              </div>
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onVote={handleVote}
                  canModerate={profile?.role === 'admin' || profile?.role === 'mod'}
                  onDelete={handleDelete}
                  onEdit={setEditingPost}
                  currentUserId={profile?.id}
                  onShowUser={setSelectedUserId}
                />
              ))
            ) : (
              <div className="text-center py-16 px-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4 text-[var(--text2)]">
                  {isAnyFilterActive ? <Filter size={22} /> : <MessageSquarePlus size={22} />}
                </div>
                <h3 className="text-base font-bold text-[var(--text)] mb-1">
                  {isAnyFilterActive ? 'No matching posts found' : 'No discussions yet'}
                </h3>
                <p className="text-sm text-[var(--text2)] max-w-sm mx-auto mb-6">
                  {isAnyFilterActive
                    ? 'Try adjusting your search query or clearing active filters.'
                    : 'Start a conversation by asking a doubt or sharing a study strategy.'}
                </p>
                <div className="flex justify-center gap-3">
                  {isAnyFilterActive && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-4 py-2 rounded-xl bg-[var(--bg2)] border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text)] text-xs font-semibold transition-colors"
                    >
                      Reset Filters
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:brightness-110 transition-all"
                  >
                    Create Post
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Filters (4 cols) */}
        <aside className={`lg:col-span-4 order-1 lg:order-2 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="sticky top-24 space-y-4">

            {/* Sidebar Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                <Filter size={14} className="text-[var(--accent)]" />
                <span>Filters</span>
              </div>
              {isAnyFilterActive && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 text-[var(--red)] text-xs font-semibold hover:bg-red-500/10 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              )}
            </div>

            {/* Target Year Filter */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-[var(--text2)]">
                <TargetIcon size={14} className="text-[var(--accent)]" />
                <span>Target Year</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['ALL', '2025', '2026', '2027', '2028', '2029'].map(year => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setTargetYearFilter(year)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                      targetYearFilter === year
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--bg2)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hover)] hover:text-[var(--text)]'
                    }`}
                  >
                    {year === 'ALL' ? 'All' : year}
                  </button>
                ))}
              </div>
            </div>

            {/* Academic Stage Filter */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-[var(--text2)]">
                <GraduationCap size={14} className="text-[var(--accent)]" />
                <span>Academic Stage</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {['ALL', 'Class 11', 'Class 12', 'Dropper'].map(cls => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setClassFilter(cls)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border text-center focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                      classFilter === cls
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--bg2)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hover)] hover:text-[var(--text)]'
                    }`}
                  >
                    {cls === 'ALL' ? 'All Stages' : cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Tags Filter */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-[var(--text2)]">
                <TagIcon size={14} className="text-[var(--accent)]" />
                <span>Subject Tags</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setTagFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                    tagFilter === 'ALL'
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-[var(--bg2)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hover)] hover:text-[var(--text)]'
                  }`}
                >
                  All
                </button>
                {PRESET_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTagFilter(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                      tagFilter === tag
                        ? 'bg-[var(--accent-glow)] text-[var(--accent)] border-[var(--accent)]'
                        : 'bg-[var(--bg2)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hover)] hover:text-[var(--text)]'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Range Filter */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-[var(--text2)]">
                <Calendar size={14} className="text-[var(--accent)]" />
                <span>Time Range</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {TIME_OPTIONS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTimeFilter(t.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                      timeFilter === t.id
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--bg2)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hover)] hover:text-[var(--text)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </aside>
      </div>

      {/* Mobile Floating Create Button */}
      <button
        type="button"
        aria-label="Create new post"
        onClick={() => setShowCreateModal(true)}
        className="sm:hidden fixed bottom-24 right-5 z-40 w-13 h-13 p-3.5 rounded-2xl bg-[var(--accent)] text-white shadow-lg flex items-center justify-center hover:brightness-110 active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
      >
        <PenLine size={20} />
      </button>

      {showCreateModal && <CreatePostModal onClose={() => setShowCreateModal(false)} onSuccess={() => refetch()} />}

      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSuccess={() => { setEditingPost(null); refetch(); }}
        />
      )}

      {selectedUserId && <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </div>
  );
}
