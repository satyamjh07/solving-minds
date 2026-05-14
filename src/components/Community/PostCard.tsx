'use client';

import { Post } from '@/hooks/usePosts';
import { useState } from 'react';
import { MessageSquare, Flag, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { CommentsSection } from './CommentsSection';
import { ImageLightbox } from './ImageLightbox';
import { ReportModal } from './ReportModal';
import { useDialog } from '@/components/DialogProvider';

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
}

export function PostCard({ post, onVote, canModerate, onDelete }: PostCardProps) {
  const profile = post.profiles || {} as any;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const { toast } = useDialog();

  const tags = Array.isArray(post.tags) ? post.tags : [];

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  };

  const getImages = () => {
    if (Array.isArray(post.image_urls)) return post.image_urls;
    if (typeof post.image_urls === 'string' && post.image_urls.startsWith('[')) {
      try { return JSON.parse(post.image_urls); } catch (e) { return []; }
    }
    if (post.image_url) return [post.image_url];
    return [];
  };

  const images = getImages();

  return (
    <div className="post-card" data-id={post.id}>
      <div className="post-body">
        <div className="post-header">
          <button className="post-avatar-btn">
            <div className="post-avatar">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name} />
              ) : (
                <span className="flex items-center justify-center w-full h-full text-gray-500">👤</span>
              )}
            </div>
          </button>
          <div className="post-header-info">
            <button className="post-author-link">
              {profile.name || 'Anonymous'}
              {profile.role === 'admin' && <span className="role-badge badge-admin ml-1">ADMIN</span>}
              {profile.role === 'mod' && <span className="role-badge badge-mod ml-1">MOD</span>}
            </button>
            <div className="post-time">
              {profile.class || ''}
              {profile.class && profile.target_year ? ' · ' : ''}
              {profile.target_year ? `Target ${profile.target_year}` : ''}
              {' · '}{timeAgo(post.created_at)}
            </div>
          </div>
        </div>

        {post.title && <div className="post-title font-bold text-white mb-2 text-base">{post.title}</div>}
        <div className="post-content text-gray-300 mb-3 text-sm leading-relaxed">{post.content}</div>

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

        {images.length > 0 && (
          <div className={`grid gap-2 mb-3 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {images.map((img: string, i: number) => (
              <div
                key={i}
                className="relative group cursor-zoom-in"
                onClick={() => setLightboxIndex(i)}
              >
                <img
                  src={img}
                  alt="post"
                  className="rounded-lg object-cover w-full h-48 border border-[#ffffff10] transition-all duration-200 group-hover:brightness-90 group-hover:scale-[1.01]"
                />
                <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/10 transition-all duration-200 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-xs px-2 py-1 rounded-full font-mono">
                    🔍 View
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="post-actions-row flex items-center gap-4">
          <div className="emoji-vote-group flex items-center bg-[#ffffff08] rounded-full px-1 py-0.5">
            <button
              className={`emoji-vote-btn p-1.5 rounded-full transition-colors ${post.myVote === 1 ? 'text-[#7c3aed] bg-[#7c3aed20]' : 'text-gray-400 hover:bg-[#ffffff10]'}`}
              onClick={() => onVote(post.id, 1)}
            >
              <ChevronUp size={20} fill={post.myVote === 1 ? 'currentColor' : 'none'} />
            </button>
            <span className={`text-xs font-bold px-1 ${post.score > 0 ? 'text-[#00e5a0]' : post.score < 0 ? 'text-[#ff4d6a]' : 'text-gray-400'}`}>
              {post.score !== 0 ? (post.score > 0 ? `+${post.score}` : post.score) : 'Vote'}
            </span>
            <button
              className={`emoji-vote-btn p-1.5 rounded-full transition-colors ${post.myVote === -1 ? 'text-[#ff4d6a] bg-[#ff4d6a20]' : 'text-gray-400 hover:bg-[#ffffff10]'}`}
              onClick={() => onVote(post.id, -1)}
            >
              <ChevronDown size={20} fill={post.myVote === -1 ? 'currentColor' : 'none'} />
            </button>
          </div>

          <button
            className={`post-action-btn flex items-center gap-1.5 transition-colors text-sm ${showComments ? 'text-[#7c3aed]' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setShowComments(!showComments)}
          >
            <MessageSquare size={16} />
            Comments
          </button>

          <button
            className="post-report-btn flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors text-sm"
            onClick={() => setShowReport(true)}
          >
            <Flag size={14} />
            Report
          </button>

          {canModerate && (
            <button
              className="post-mod-btn flex items-center gap-1.5 text-red-500 hover:text-red-400 transition-colors text-sm"
              onClick={() => onDelete(post.id)}
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>

        {showComments && <CommentsSection postId={post.id} />}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {showReport && (
        <ReportModal
          postId={post.id}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
