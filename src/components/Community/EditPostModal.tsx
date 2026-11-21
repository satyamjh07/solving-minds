'use client';

import { useState } from 'react';
import { X, Send, Loader2, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useDialog } from '@/components/DialogProvider';
import { hasExplicitContent } from '@/lib/wordFilter';

const PRESET_TAGS = [
  'doubts', 'physics', 'chemistry', 'maths', 'help',
  'jee', 'neet', 'organic', 'physical', 'inorganic',
  'strategy', 'storytime', 'mock test', '2027', '2028',
];

const TAG_COLORS: Record<string, string> = {
  physics: '#00c3ff',
  chemistry: '#b26bff',
  maths: '#00e5a0',
  jee: '#f59e0b',
  neet: '#f97316',
  doubts: '#ef4444',
  help: '#ec4899',
  organic: '#22c55e',
  physical: '#3b82f6',
  inorganic: '#8b5cf6',
  strategy: '#14b8a6',
  storytime: '#f472b6',
  'mock test': '#fb923c',
  '2027': '#a78bfa',
  '2028': '#c084fc',
};

interface EditPostModalProps {
  post: {
    id: string;
    title: string;
    content: string;
    tags: string[] | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function EditPostModal({ post, onClose, onSuccess }: EditPostModalProps) {
  const { toast } = useDialog();

  const [title, setTitle] = useState(post.title || '');
  const [content, setContent] = useState(post.content || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    Array.isArray(post.tags) ? post.tags : []
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      if (selectedTags.length >= 3) {
        toast('You can select up to 3 tags only', 'warning');
        return;
      }
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast('Please add a post title!', 'warning');
      return;
    }
    if (!content.trim()) {
      toast('Write something before saving!', 'warning');
      return;
    }
    if (selectedTags.length === 0) {
      toast('Please select at least 1 tag', 'warning');
      return;
    }

    // Word filter check on edited content too
    if (hasExplicitContent(title.trim(), content.trim())) {
      toast('Your edited post contains inappropriate language. Please remove it and try again.', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          title: title.trim(),
          content: content.trim(),
          tags: selectedTags,
        })
        .eq('id', post.id);

      if (error) throw error;

      toast('Post updated successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to update post:', err);
      toast('Failed to update post. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1050]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-[1100] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-xl animate-slide-up" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="bg-[#0f0f1a] border border-[#ffffff12] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden mb-[62px] sm:mb-0">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#ffffff08]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <span className="text-amber-400 text-sm">✏️</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white">Edit Post</div>
                <div className="text-[10px] text-gray-500 font-mono uppercase">Modify your content</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Title */}
            <input
              type="text"
              placeholder="Post title (required)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              className="w-full bg-transparent border-b border-[#ffffff10] focus:border-[#7c3aed] text-white text-lg font-bold placeholder-gray-600 py-2 focus:outline-none transition-colors"
            />

            {/* Content */}
            <textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={5}
              className="w-full bg-transparent border-none focus:outline-none text-gray-200 placeholder-gray-600 resize-none text-sm leading-relaxed"
            />

            {/* Tags Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag size={13} className="text-gray-400" />
                <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Tags <span className="text-[#7c3aed]">({selectedTags.length}/3)</span>
                  <span className="text-gray-600 ml-1">· min 1 required</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_TAGS.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  const color = TAG_COLORS[tag] || '#7c3aed';
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                        isSelected
                          ? 'text-black shadow-lg scale-105'
                          : 'bg-transparent text-gray-400 border-[#ffffff15] hover:border-[#ffffff30] hover:text-white'
                      }`}
                      style={isSelected ? { background: color, borderColor: color, boxShadow: `0 0 14px ${color}50` } : {}}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-5 py-4 border-t border-[#ffffff08] bg-[#0a0a14]">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-[#ffffff12] text-gray-400 hover:text-white hover:border-white/20 text-sm font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !title.trim() || !content.trim()}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-black px-6 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-amber-500/20"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
        @media (min-width: 640px) {
          @keyframes slide-up {
            from { transform: translate(-50%, -40%); opacity: 0; }
            to { transform: translate(-50%, -50%); opacity: 1; }
          }
        }
      `}
      </style>
    </>
  );
}
