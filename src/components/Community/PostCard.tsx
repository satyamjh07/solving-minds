'use client';

import { Post } from '@/hooks/usePosts';
import { ChevronUp, ChevronDown, MessageSquare, Share2, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const TAG_COLORS: Record<string, string> = {
  physics: '#00c3ff', chemistry: '#b26bff', maths: '#00e5a0', jee: '#f59e0b',
  neet: '#f97316', doubts: '#ef4444', help: '#ec4899', organic: '#22c55e',
  physical: '#3b82f6', inorganic: '#8b5cf6', strategy: '#14b8a6',
  storytime: '#f472b6', 'mock test': '#fb923c', '2027': '#a78bfa', '2028': '#c084fc',
};

interface PostCardProps {
  post: Post;
  onVote: (postId: string, value: number) => void;
  canModerate: boolean;
  onDelete: (postId: string) => void;
  onEdit: (post: Post) => void;
  onShowUser: (userId: string) => void;
  currentUserId?: string;
}

export function PostCard({ post, onVote, canModerate, onDelete, onEdit, onShowUser, currentUserId }: PostCardProps) {
  const isAnonymous = post.is_anonymous;
  const profile = isAnonymous ? {
    name: 'Anonymous',
    avatar_url: '',
    class: '',
    target_year: '',
    role: '',
    muted_until: null
  } : (post.profiles || {} as any);

  const [showMenu, setShowMenu] = useState(false);

  const isOwner = !!currentUserId && currentUserId === post.user_id;
  const showActions = isOwner || canModerate;

  const tags = Array.isArray(post.tags) ? post.tags : [];

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  };

  const getFirstImage = () => {
    if (Array.isArray(post.image_urls) && post.image_urls.length > 0) return post.image_urls[0];
    if (typeof post.image_urls === 'string' && post.image_urls.startsWith('[')) {
      try { 
        const parsed = JSON.parse(post.image_urls); 
        return parsed.length > 0 ? parsed[0] : null;
      } catch (e) { return null; }
    }
    if ((post as any).image_url) return (post as any).image_url;
    return null;
  };

  const getImageCount = () => {
    if (Array.isArray(post.image_urls)) return post.image_urls.length;
    if (typeof post.image_urls === 'string' && post.image_urls.startsWith('[')) {
      try { return JSON.parse(post.image_urls).length; } catch { return 0; }
    }
    return (post as any).image_url ? 1 : 0;
  };

  const firstImage = getFirstImage();
  const imageCount = getImageCount();

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/community/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title || 'SolvingMinds Post', url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <Link 
      href={`/community/${post.id}`}
      className="block post-card group hover:border-[var(--border-hover)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20"
    >
      <div className="post-body">
        {/* Author Row */}
        <div className="post-header">
          {isAnonymous ? (
            <div className="post-avatar-btn cursor-default" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <div className="post-avatar bg-[#ffffff08] border border-white/5 flex items-center justify-center">
                <span className="text-gray-400 text-sm">👤</span>
              </div>
            </div>
          ) : (
            <button 
              className="post-avatar-btn" 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShowUser(post.user_id); }}
            >
              <div className="post-avatar">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.name} />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-gray-500">👤</span>
                )}
              </div>
            </button>
          )}
          <div className="post-header-info">
            {isAnonymous ? (
              <span className="font-bold text-sm text-gray-400 cursor-default" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                Anonymous
              </span>
            ) : (
              <button 
                className="post-author-link"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShowUser(post.user_id); }}
              >
                {profile.name || 'Anonymous'}
                {profile.role === 'admin' && <span className="role-badge badge-admin ml-1">ADMIN</span>}
                {profile.role === 'mod' && <span className="role-badge badge-mod ml-1">MOD</span>}
              </button>
            )}
            <div className="post-time">
              {isAnonymous ? (
                <>Incognito · {timeAgo(post.created_at)}</>
              ) : (
                <>
                  {profile.class || ''}
                  {profile.class && profile.target_year ? ' · ' : ''}
                  {profile.target_year ? `Target ${profile.target_year}` : ''}
                  {' · '}{timeAgo(post.created_at)}
                </>
              )}
            </div>
          </div>

          {/* Owner/Mod Actions Menu */}
          {showActions && (
            <div className="relative ml-auto" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <button
                onClick={() => setShowMenu(v => !v)}
                className="p-1.5 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-all"
              >
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <>
                  {/* Click outside to close */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-8 z-20 min-w-[130px] bg-[#0f0f1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
                    {isOwner && (
                      <button
                        onClick={() => { setShowMenu(false); onEdit(post); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-400/10 transition-colors font-bold"
                      >
                        <Pencil size={14} />
                        Edit Post
                      </button>
                    )}
                    {(isOwner || canModerate) && (
                      <button
                        onClick={() => { setShowMenu(false); onDelete(post.id); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors font-bold"
                      >
                        <Trash2 size={14} />
                        Delete Post
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Title (bold & prominent) */}
        {post.title && (
          <div className="font-bold text-[var(--text)] text-base mb-1.5 leading-snug group-hover:text-cyan-400 transition-colors">
            {post.title}
          </div>
        )}

        {/* Content preview — 2 lines max */}
        <div className="text-[var(--text2)] text-sm leading-relaxed line-clamp-2 mb-3">
          {post.content}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map(tag => {
              const color = TAG_COLORS[tag] || '#7c3aed';
              return (
                <span
                  key={tag}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{ color, borderColor: `${color}40`, background: `${color}10` }}
                >
                  #{tag}
                </span>
              );
            })}
          </div>
        )}

        {/* First image thumbnail */}
        {firstImage && (
          <div className="relative mb-3 rounded-xl overflow-hidden">
            <img
              src={firstImage}
              alt="post"
              className="w-full h-48 object-cover border border-[var(--border)] rounded-xl transition-all duration-200 group-hover:brightness-95"
            />
            {imageCount > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border border-white/10">
                +{imageCount - 1} more
              </div>
            )}
          </div>
        )}

        {/* Action Bar */}
        <div className="post-actions-row flex items-center gap-4">
          {/* Votes */}
          <div className="emoji-vote-group flex items-center bg-[var(--bg3)] rounded-full px-1 py-0.5">
            <button
              className={`emoji-vote-btn p-1.5 rounded-full transition-colors ${post.myVote === 1 ? 'text-[var(--purple)] bg-[var(--purple)]/20' : 'text-[var(--text3)] hover:bg-[var(--text)]/10'}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onVote(post.id, 1); }}
            >
              <ChevronUp size={18} fill={post.myVote === 1 ? 'currentColor' : 'none'} />
            </button>
            <span className={`text-xs font-bold px-1 ${post.score > 0 ? 'text-[var(--green)]' : post.score < 0 ? 'text-[var(--red)]' : 'text-[var(--text3)]'}`}>
              {post.score !== 0 ? (post.score > 0 ? `+${post.score}` : post.score) : 'Vote'}
            </span>
            <button
              className={`emoji-vote-btn p-1.5 rounded-full transition-colors ${post.myVote === -1 ? 'text-[var(--red)] bg-[var(--red)]/20' : 'text-[var(--text3)] hover:bg-[var(--text)]/10'}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onVote(post.id, -1); }}
            >
              <ChevronDown size={18} fill={post.myVote === -1 ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Comments indicator */}
          <span className="flex items-center gap-1.5 text-[var(--text3)] text-sm">
            <MessageSquare size={15} />
            <span className="text-xs font-bold">Comments</span>
          </span>

          {/* Share */}
          <button
            className="flex items-center gap-1.5 text-[var(--text3)] hover:text-cyan-400 transition-colors text-sm ml-auto"
            onClick={handleShare}
          >
            <Share2 size={14} />
            <span className="text-xs font-bold">Share</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.15s ease-out; }
      `}</style>
    </Link>
  );
}
