'use client';

import { Post } from '@/hooks/usePosts';
import { ChevronUp, ChevronDown, MessageSquare, Share2, Pencil, Trash2, MoreHorizontal, User, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

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
      } catch { return null; }
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
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch { /* ignore */ }
    }
  };

  const authorInitials = !isAnonymous && profile.name
    ? profile.name.trim().slice(0, 2).toUpperCase()
    : null;

  return (
    <article className="post-card group transition-all duration-150 hover:border-[var(--border-hover)]">
      <div className="post-body">
        {/* Author Row */}
        <div className="post-header">
          {isAnonymous ? (
            <div className="post-avatar-btn cursor-default">
              <div className="post-avatar bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center text-[var(--text2)]">
                <User size={15} />
              </div>
            </div>
          ) : (
            <button
              type="button"
              aria-label={`View ${profile.name || 'user'}'s profile`}
              className="post-avatar-btn focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded-full"
              onClick={() => onShowUser(post.user_id)}
            >
              <div className="post-avatar bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--text2)]">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.name || 'Avatar'} />
                ) : authorInitials ? (
                  <span>{authorInitials}</span>
                ) : (
                  <User size={15} />
                )}
              </div>
            </button>
          )}

          <div className="post-header-info">
            {isAnonymous ? (
              <span className="font-semibold text-sm text-[var(--text2)]">Anonymous</span>
            ) : (
              <button
                type="button"
                className="post-author-link focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded"
                onClick={() => onShowUser(post.user_id)}
              >
                {profile.name || 'Student'}
                {profile.role === 'admin' && <span className="role-badge badge-admin ml-1.5">ADMIN</span>}
                {profile.role === 'mod' && <span className="role-badge badge-mod ml-1.5">MOD</span>}
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
                  {(profile.class || profile.target_year) ? ' · ' : ''}
                  {timeAgo(post.created_at)}
                </>
              )}
            </div>
          </div>

          {/* Owner/Mod Actions Menu */}
          {showActions && (
            <div className="relative ml-auto">
              <button
                type="button"
                aria-label="Post options"
                aria-expanded={showMenu}
                onClick={() => setShowMenu(v => !v)}
                className="p-1.5 rounded-lg text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-9 z-20 min-w-[140px] bg-[var(--card2)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden backdrop-blur-md">
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => { setShowMenu(false); onEdit(post); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-[var(--text)] hover:bg-[var(--bg2)] transition-colors font-semibold"
                      >
                        <Pencil size={13} className="text-[var(--orange)]" />
                        Edit Post
                      </button>
                    )}
                    {(isOwner || canModerate) && (
                      <button
                        type="button"
                        onClick={() => { setShowMenu(false); onDelete(post.id); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-[var(--red)] hover:bg-red-500/10 transition-colors font-semibold"
                      >
                        <Trash2 size={13} />
                        Delete Post
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Clickable Post Body Link */}
        <Link
          href={`/community/${post.id}`}
          className="block focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded-lg"
        >
          {post.title && (
            <h2 className="font-bold text-[var(--text)] text-base mb-1.5 leading-snug group-hover:text-[var(--accent)] transition-colors">
              {post.title}
            </h2>
          )}

          <p className="text-[var(--text2)] text-sm leading-relaxed line-clamp-2 mb-3">
            {post.content}
          </p>

          {firstImage && (
            <div className="relative mb-3 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg2)]">
              <img
                src={firstImage}
                alt={post.title || 'Post attachment'}
                className="w-full h-48 object-cover transition-transform duration-200 group-hover:scale-[1.01]"
              />
              {imageCount > 1 && (
                <div className="absolute bottom-2 right-2 bg-slate-900/75 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-white/15 tabular-nums">
                  +{imageCount - 1} more
                </div>
              )}
            </div>
          )}
        </Link>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map(tag => {
              const color = TAG_COLORS[tag] || '#7c3aed';
              return (
                <span
                  key={tag}
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
                  style={{ color, borderColor: `${color}35`, background: `${color}12` }}
                >
                  #{tag}
                </span>
              );
            })}
          </div>
        )}

        {/* Action Bar */}
        <div className="post-actions-row flex items-center gap-3 pt-2 border-t border-[var(--border)]">
          {/* Votes */}
          <div className="flex items-center bg-[var(--bg2)] border border-[var(--border)] rounded-full px-1 py-0.5">
            <button
              type="button"
              aria-label="Upvote post"
              aria-pressed={post.myVote === 1}
              className={`p-1.5 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                post.myVote === 1
                  ? 'text-[var(--accent)] bg-[var(--accent-glow)]'
                  : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
              }`}
              onClick={() => onVote(post.id, 1)}
            >
              <ChevronUp size={16} />
            </button>
            <span
              className={`text-xs font-bold px-1.5 tabular-nums ${
                post.score > 0
                  ? 'text-[var(--green)]'
                  : post.score < 0
                    ? 'text-[var(--red)]'
                    : 'text-[var(--text2)]'
              }`}
            >
              {post.score !== 0 ? (post.score > 0 ? `+${post.score}` : post.score) : '0'}
            </span>
            <button
              type="button"
              aria-label="Downvote post"
              aria-pressed={post.myVote === -1}
              className={`p-1.5 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                post.myVote === -1
                  ? 'text-[var(--red)] bg-red-500/15'
                  : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
              }`}
              onClick={() => onVote(post.id, -1)}
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Comments Link */}
          <Link
            href={`/community/${post.id}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            <MessageSquare size={14} />
            <span>Discuss</span>
          </Link>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--text2)] hover:text-[var(--accent)] hover:bg-[var(--bg2)] transition-colors ml-auto focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            {copied ? <Check size={14} className="text-[var(--green)]" /> : <Share2 size={14} />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
