'use client';

import { useState } from 'react';
import { X, Image as ImageIcon, Send, Loader2, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useDialog } from '@/components/DialogProvider';
import { uploadToCloudinary } from '@/lib/cloudinary';

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

interface CreatePostModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePostModal({ onClose, onSuccess }: CreatePostModalProps) {
  const { profile } = useProfile();
  const { toast } = useDialog();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 4) {
      toast('Max 4 images allowed', 'warning');
      return;
    }
    setSelectedImages(prev => [...prev, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!content.trim() && selectedImages.length === 0) {
      toast('Write something before posting!', 'warning');
      return;
    }
    if (selectedTags.length === 0) {
      toast('Please select at least 1 tag', 'warning');
      return;
    }
    setIsPosting(true);

    try {
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        imageUrls = await Promise.all(selectedImages.map(img => uploadToCloudinary(img)));
      }

      const { error } = await supabase.from('posts').insert({
        user_id: profile?.id,
        title: title.trim() || null,
        content: content.trim(),
        image_urls: imageUrls,
        tags: selectedTags,
      });

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to post:', err);
      toast('Failed to post. Please try again.', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-[201] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-xl animate-slide-up">
        <div className="bg-[#0f0f1a] border border-[#ffffff12] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#ffffff08]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-[#ffffff08]">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="flex items-center justify-center h-full text-gray-500 text-sm">👤</span>
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{profile?.name || 'You'}</div>
                <div className="text-[10px] text-gray-500 font-mono uppercase">{profile?.class || ''}</div>
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
              placeholder="Add a title (optional)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              className="w-full bg-transparent border-b border-[#ffffff10] focus:border-[#7c3aed] text-white text-lg font-bold placeholder-gray-600 py-2 focus:outline-none transition-colors"
            />

            {/* Content */}
            <textarea
              placeholder="What's on your mind? Share insights, doubts, strategies..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              className="w-full bg-transparent border-none focus:outline-none text-gray-200 placeholder-gray-600 resize-none text-sm leading-relaxed"
            />

            {/* Image Previews */}
            {previews.length > 0 && (
              <div className={`grid gap-2 ${previews.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-video rounded-xl overflow-hidden group">
                    <img src={src} alt="preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 bg-black/60 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

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
          <div className="flex items-center justify-between px-5 py-4 border-t border-[#ffffff08] bg-[#0a0a14]">
            <label className="cursor-pointer flex items-center gap-2 text-gray-400 hover:text-[#7c3aed] transition-colors text-sm font-medium">
              <ImageIcon size={18} />
              <span className="hidden sm:inline">Media</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageSelect} />
            </label>

            <div className="flex items-center gap-3">
              {selectedTags.length > 0 && (
                <div className="flex gap-1.5 max-w-[160px] overflow-hidden">
                  {selectedTags.map(t => (
                    <span key={t} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300 whitespace-nowrap">#{t}</span>
                  ))}
                </div>
              )}
              <button
                onClick={handlePost}
                disabled={isPosting || (!content.trim() && selectedImages.length === 0)}
                className="bg-gradient-to-r from-[#7c3aed] to-[#2563eb] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-purple-500/20"
              >
                {isPosting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                POST
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
      `}</style>
    </>
  );
}
