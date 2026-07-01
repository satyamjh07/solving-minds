'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { CommentsSection } from '@/components/Community/CommentsSection';
import { ImageLightbox } from '@/components/Community/ImageLightbox';
import { ReportModal } from '@/components/Community/ReportModal';
import { EditPostModal } from '@/components/Community/EditPostModal';
import { UserProfileModal } from '@/components/Community/UserProfileModal';
import { useDialog } from '@/components/DialogProvider';
import { 
  ChevronUp, ChevronDown, MessageSquare, Flag, Trash2, Pencil,
  ArrowLeft, Share2, Loader2, Link as LinkIcon, Clock,
  LogIn
} from 'lucide-react';
import Link from 'next/link';

const TAG_COLORS: Record<string, string> = {
  physics: '#00c3ff', chemistry: '#b26bff', maths: '#00e5a0', jee: '#f59e0b',
  neet: '#f97316', doubts: '#ef4444', help: '#ec4899', organic: '#22c55e',
  physical: '#3b82f6', inorganic: '#8b5cf6', strategy: '#14b8a6',
  storytime: '#f472b6', 'mock test': '#fb923c', '2027': '#a78bfa', '2028': '#c084fc',
};

const timeAgo = (dateStr: string) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
};

interface PostDetail {
  id: string;
  user_id: string;
  title: string;
  content: string;
  image_urls: string[] | string;
  tags: string[] | null;
  created_at: string;
  is_anonymous: boolean;
  profiles: {
    id: string;
    name: string;
    avatar_url: string;
    class: string;
    target_year: string;
    role: string;
    muted_until: string | null;
  };
  score: number;
  myVote: number;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const { profile, loading: profileLoading } = useProfile();
  const { toast, confirm } = useDialog();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isLoggedIn = !!profile;
  const isOwner = !!profile && !!post && profile.id === post.user_id;
  const canModerate = profile?.role === 'admin' || profile?.role === 'mod';

  useEffect(() => {
    if (!postId) return;
    fetchPost();
  }, [postId]);

  async function fetchPost() {
    setLoading(true);
    try {
      const { data: postData, error: postErr } = await supabase
        .from('posts')
        .select('id, user_id, title, content, image_urls, tags, created_at, is_anonymous, profiles!inner(id, name, avatar_url, class, target_year, role, muted_until)')
        .eq('id', postId)
        .single();

      if (postErr || !postData) {
        setError('Post not found');
        setLoading(false);
        return;
      }

      // Fetch votes
      const { data: voteCounts } = await supabase
        .from('votes')
        .select('value')
        .eq('post_id', postId);

      const score = (voteCounts || []).reduce((acc, v) => acc + v.value, 0);

      let myVote = 0;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: myVoteData } = await supabase
          .from('votes')
          .select('value')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle();
        myVote = myVoteData?.value || 0;
      }

      setPost({
        ...postData,
        profiles: Array.isArray(postData.profiles) ? postData.profiles[0] : postData.profiles,
        score,
        myVote,
      } as unknown as PostDetail);
    } catch (err) {
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  }

  const getImages = () => {
    if (!post) return [];
    if (Array.isArray(post.image_urls)) return post.image_urls;
    if (typeof post.image_urls === 'string' && post.image_urls.startsWith('[')) {
      try { return JSON.parse(post.image_urls); } catch (e) { return []; }
    }
    return [];
  };

  const images = useMemo(() => getImages(), [post]);
  const tags = post ? (Array.isArray(post.tags) ? post.tags : []) : [];
  const isAnonymous = post?.is_anonymous;
  const authorProfile = isAnonymous ? {
    name: 'Anonymous',
    avatar_url: '',
    class: '',
    target_year: '',
    role: '',
    muted_until: null
  } : (post?.profiles || {} as any);

  const handleVote = async (value: number) => {
    if (!profile || !post) return;

    // Optimistic update
    setPost(prev => {
      if (!prev) return prev;
      let newScore = prev.score;
      let newMyVote = value;
      if (prev.myVote === value) {
        newScore -= value;
        newMyVote = 0;
      } else {
        newScore = newScore - prev.myVote + value;
      }
      return { ...prev, score: newScore, myVote: newMyVote };
    });

    const { data: existing } = await supabase
      .from('votes')
      .select('id, value')
      .eq('post_id', post.id)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (existing) {
      if (existing.value === value) {
        await supabase.from('votes').delete().eq('id', existing.id);
      } else {
        await supabase.from('votes').update({ value }).eq('id', existing.id);
      }
    } else {
      await supabase.from('votes').insert({ post_id: post.id, user_id: profile.id, value });
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    const ok = await confirm({
      title: 'Delete Post',
      message: 'Are you sure you want to delete this post?',
      danger: true,
      confirmLabel: 'Delete'
    });
    if (!ok) return;
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (error) toast('Error: ' + error.message, 'error');
    else {
      toast('Post deleted', 'success');
      router.push('/community');
    }
  };

  const handleEdit = () => {
    setShowEdit(true);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: post?.title || 'SolvingMinds Post', url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast('Link copied to clipboard!', 'success');
      }
    } catch {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="an-content px-4">
        <div className="max-w-3xl mx-auto py-20 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400 opacity-50" />
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.3em]">Loading post...</p>
        </div>
      </div>
    );
  }

  // Error / not found
  if (error || !post) {
    return (
      <div className="an-content px-4">
        <div className="max-w-3xl mx-auto py-20 text-center">
          <div className="text-6xl mb-6 opacity-20">📭</div>
          <h2 className="text-xl font-bold text-white mb-2">Post Not Found</h2>
          <p className="text-gray-500 text-sm mb-8">This post may have been deleted or doesn't exist.</p>
          <Link 
            href="/community"
            className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-cyan-400 text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-400 hover:text-black transition-all"
          >
            ← Back to Community
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="an-content px-4 pb-32">
      <div className="max-w-3xl mx-auto w-full">

        {/* Back button */}
        <button 
          onClick={() => router.push('/community')}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-mono mb-6 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] uppercase tracking-widest font-bold">Back to Feed</span>
        </button>

        {/* Main Post Card */}
        <article className="bg-[var(--bg2)] border border-[var(--border)] rounded-3xl overflow-hidden">
          
          {/* Author Header */}
          <div className="px-6 pt-6 pb-4 flex items-center gap-3">
            {isAnonymous ? (
              <div className="flex-shrink-0 cursor-default" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-gray-400">👤</span>
                </div>
              </div>
            ) : (
              <button 
                className="flex-shrink-0"
                onClick={() => isLoggedIn && setSelectedUserId(post.user_id)}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10">
                  {authorProfile.avatar_url ? (
                    <img src={authorProfile.avatar_url} alt={authorProfile.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-gray-500">👤</span>
                  )}
                </div>
              </button>
            )}
            <div className="flex-1 min-w-0">
              {isAnonymous ? (
                <span className="text-sm font-bold text-gray-400 cursor-default" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  Anonymous
                </span>
              ) : (
                <button 
                  className="text-sm font-bold text-white hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                  onClick={() => isLoggedIn && setSelectedUserId(post.user_id)}
                >
                  {authorProfile.name || 'Anonymous'}
                  {authorProfile.role === 'admin' && <span className="role-badge badge-admin text-[8px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-mono uppercase">ADMIN</span>}
                  {authorProfile.role === 'mod' && <span className="role-badge badge-mod text-[8px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono uppercase">MOD</span>}
                </button>
              )}
              <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5">
                {isAnonymous ? (
                  <>
                    Incognito · 
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> {timeAgo(post.created_at)}
                    </span>
                  </>
                ) : (
                  <>
                    {authorProfile.class || ''}
                    {authorProfile.class && authorProfile.target_year ? ' · ' : ''}
                    {authorProfile.target_year ? `Target ${authorProfile.target_year}` : ''}
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> {timeAgo(post.created_at)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Title */}
          {post.title && (
            <div className="px-6 pb-2">
              <h1 className="text-xl font-black text-white leading-tight">{post.title}</h1>
            </div>
          )}

          {/* Full Content */}
          <div className="px-6 pb-4">
            <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{post.content}</div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="px-6 pb-4 flex flex-wrap gap-1.5">
              {tags.map(tag => {
                const color = TAG_COLORS[tag] || '#7c3aed';
                return (
                  <span
                    key={tag}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
                    style={{ color, borderColor: `${color}40`, background: `${color}10` }}
                  >
                    #{tag}
                  </span>
                );
              })}
            </div>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div className={`px-6 pb-4 grid gap-3 ${
              images.length === 1 
                ? 'grid-cols-1' 
                : images.length === 2 
                  ? 'grid-cols-2' 
                  : 'grid-cols-2 md:grid-cols-3'
            }`}>
              {images.map((img: string, i: number) => (
                <div
                  key={i}
                  className="relative group cursor-zoom-in"
                  onClick={() => setLightboxIndex(i)}
                >
                  <img
                    src={img}
                    alt="post"
                    className="rounded-2xl object-cover w-full h-60 border border-[var(--border)] transition-all duration-200 group-hover:brightness-90 group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/10 transition-all duration-200 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-xs px-3 py-1.5 rounded-full font-mono">
                      🔍 View Full
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Bar */}
          <div className="px-6 py-4 border-t border-[var(--border)] flex items-center gap-4 flex-wrap">
            
            {/* Votes */}
            <div className="flex items-center bg-[var(--bg3)] rounded-full px-1 py-0.5">
              <button
                className={`p-1.5 rounded-full transition-colors ${
                  !isLoggedIn ? 'opacity-40 cursor-not-allowed' :
                  post.myVote === 1 ? 'text-[var(--purple)] bg-[var(--purple)]/20' : 'text-gray-500 hover:bg-white/10'
                }`}
                onClick={() => isLoggedIn && handleVote(1)}
                disabled={!isLoggedIn}
              >
                <ChevronUp size={20} fill={post.myVote === 1 ? 'currentColor' : 'none'} />
              </button>
              <span className={`text-xs font-bold px-1.5 ${post.score > 0 ? 'text-[var(--green)]' : post.score < 0 ? 'text-[var(--red)]' : 'text-gray-500'}`}>
                {post.score !== 0 ? (post.score > 0 ? `+${post.score}` : post.score) : 'Vote'}
              </span>
              <button
                className={`p-1.5 rounded-full transition-colors ${
                  !isLoggedIn ? 'opacity-40 cursor-not-allowed' :
                  post.myVote === -1 ? 'text-[var(--red)] bg-[var(--red)]/20' : 'text-gray-500 hover:bg-white/10'
                }`}
                onClick={() => isLoggedIn && handleVote(-1)}
                disabled={!isLoggedIn}
              >
                <ChevronDown size={20} fill={post.myVote === -1 ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-gray-500 hover:text-cyan-400 transition-colors text-sm"
            >
              {copied ? <LinkIcon size={16} className="text-cyan-400" /> : <Share2 size={16} />}
              <span className="text-xs font-bold">{copied ? 'Copied!' : 'Share'}</span>
            </button>

            {/* Report (logged in only) */}
            {isLoggedIn && (
              <button
                className="flex items-center gap-1.5 text-gray-500 hover:text-red-400 transition-colors text-sm"
                onClick={() => setShowReport(true)}
              >
                <Flag size={14} />
                <span className="text-xs font-bold">Report</span>
              </button>
            )}

            {/* Mod/owner actions */}
            {(isOwner || canModerate) && (
              <div className="flex items-center gap-2 ml-auto">
                {isOwner && (
                  <button
                    className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors text-sm"
                    onClick={handleEdit}
                  >
                    <Pencil size={14} />
                    <span className="text-xs font-bold">Edit</span>
                  </button>
                )}
                <button
                  className="flex items-center gap-1.5 text-red-500 hover:text-red-400 transition-colors text-sm"
                  onClick={handleDelete}
                >
                  <Trash2 size={14} />
                  <span className="text-xs font-bold">Delete</span>
                </button>
              </div>
            )}
          </div>
        </article>

        {/* Comments Section */}
        <div className="mt-6">
          {isLoggedIn ? (
            <CommentsSection postId={post.id} onShowUser={setSelectedUserId} />
          ) : (
            <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-2xl p-8 text-center">
              <MessageSquare size={32} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm font-medium mb-4">Sign in to view and post comments</p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-bold text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
              >
                <LogIn size={14} /> Sign In
              </Link>
            </div>
          )}
        </div>

      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Report Modal */}
      {showReport && (
        <ReportModal
          postId={post.id}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Edit Modal */}
      {showEdit && post && (
        <EditPostModal
          post={post}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); fetchPost(); }}
        />
      )}

      {/* User Profile Modal */}
      {selectedUserId && <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </div>
  );
}
