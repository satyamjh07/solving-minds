'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Loader2, Send, ChevronUp, ChevronDown, Image as ImageIcon, X } from 'lucide-react';
import { useDialog } from '@/components/DialogProvider';
import { uploadToCloudinary, getOptimizedUrl } from '@/lib/cloudinary';
import { ImageLightbox } from './ImageLightbox';

export function CommentsSection({ postId, onShowUser }: { postId: string; onShowUser: (userId: string) => void }) {
  const { profile } = useProfile();
  const { toast } = useDialog();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fetchComments = async () => {
    setLoading(true);
    const { data: commentsData, error } = await supabase
      .from('comments')
      .select('*, profiles(id, name, avatar_url, role)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (!error && commentsData) {
      let scoreMap: Record<string, number> = {};
      let myVoteMap: Record<string, number> = {};
      
      try {
        const commentIds = commentsData.map(c => c.id);
        const { data: { user } } = await supabase.auth.getUser();
        
        const [{ data: voteCounts }, { data: myVotes }] = await Promise.all([
           supabase.from('comment_votes').select('comment_id, value').in('comment_id', commentIds),
           user ? supabase.from('comment_votes').select('comment_id, value').eq('user_id', user.id).in('comment_id', commentIds) : { data: [] }
        ]);
        
        (voteCounts || []).forEach(v => { scoreMap[v.comment_id] = (scoreMap[v.comment_id] || 0) + v.value; });
        (myVotes || []).forEach(v => { myVoteMap[v.comment_id] = v.value; });
      } catch (e) {
        // comment_votes table might not exist
      }

      const formatted = commentsData.map(c => ({
         ...c,
         score: scoreMap[c.id] || 0,
         myVote: myVoteMap[c.id] || 0
      }));
      setComments(formatted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleCommentVote = async (commentId: string, value: number) => {
    if (!profile) return;
    
    setComments(currentComments => currentComments.map(c => {
      if (c.id === commentId) {
        let newScore = c.score || 0;
        let newMyVote = value;
        if (c.myVote === value) {
            newScore -= value;
            newMyVote = 0;
        } else {
            newScore = newScore - (c.myVote || 0) + value;
        }
        return { ...c, score: newScore, myVote: newMyVote };
      }
      return c;
    }));

    try {
      const { data: existing } = await supabase.from('comment_votes').select('id, value').eq('comment_id', commentId).eq('user_id', profile.id).maybeSingle();
      if (existing) {
        if (existing.value === value) await supabase.from('comment_votes').delete().eq('id', existing.id);
        else await supabase.from('comment_votes').update({ value }).eq('id', existing.id);
      } else {
        await supabase.from('comment_votes').insert({ comment_id: commentId, user_id: profile.id, value });
      }
    } catch (e) {
       console.error("Comment vote failed", e);
    }
  };

  const handlePostComment = async () => {
    if ((!newComment.trim() && !selectedImage) || !profile) return;
    setIsPosting(true);

    try {
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadToCloudinary(selectedImage, { folder: 'study_aura/comments' });
      }

      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: profile.id,
        content: newComment.trim(),
        image_url: imageUrl
      });

      if (error) throw error;

      setNewComment('');
      setSelectedImage(null);
      setImagePreview(null);
      fetchComments();
    } catch (error: any) {
      console.error('Comment error:', error);
      toast(error.message || 'Failed to post comment', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-[#ffffff10]">
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        </div>
      ) : (
        <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div 
                  className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[#ffffff08] cursor-pointer"
                  onClick={() => onShowUser(comment.user_id)}
                >
                  {comment.profiles?.avatar_url ? (
                    <img src={getOptimizedUrl(comment.profiles.avatar_url, 'w_80,h_80,c_fill')} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center h-full text-xs text-gray-500">👤</span>
                  )}
                </div>
                <div className="flex-1 bg-[#ffffff05] rounded-xl p-3 border border-[#ffffff05]">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="font-bold text-[13px] text-gray-200 cursor-pointer hover:text-cyan-400 transition-colors"
                      onClick={() => onShowUser(comment.user_id)}
                    >
                      {comment.profiles?.name || 'Anonymous'}
                      {comment.profiles?.role === 'admin' && <span className="ml-2 text-[8px] bg-red-500/20 text-red-400 px-1 rounded uppercase font-black">ADMIN</span>}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 uppercase">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {comment.content && <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{comment.content}</p>}
                  
                  {comment.image_url && (
                    <div 
                      className="mt-3 rounded-lg overflow-hidden border border-[#ffffff10] max-w-sm cursor-zoom-in group relative"
                      onClick={() => setLightboxImage(comment.image_url)}
                    >
                       <img 
                         src={getOptimizedUrl(comment.image_url)} 
                         alt="comment attachment" 
                         className="w-full h-auto max-h-60 object-contain bg-black/20 transition-transform duration-300 group-hover:scale-[1.02]"
                       />
                       <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-full font-mono uppercase tracking-widest">View Full Size</span>
                       </div>
                    </div>
                  )}

                  {/* Voting Options */}
                  <div className="flex items-center gap-3 mt-3 text-gray-400">
                    <div className="flex items-center bg-[#ffffff05] rounded-full px-1 py-0.5 border border-[#ffffff05]">
                       <button 
                         className={`p-1 rounded-full transition-colors ${comment.myVote === 1 ? 'text-cyan-400 bg-cyan-400/10' : 'hover:bg-[#ffffff10]'}`}
                         onClick={() => handleCommentVote(comment.id, 1)}
                       >
                         <ChevronUp size={14} fill={comment.myVote === 1 ? 'currentColor' : 'none'} />
                       </button>
                       <span className={`text-[10px] font-bold px-1 min-w-[20px] text-center ${comment.score > 0 ? 'text-[#00e5a0]' : comment.score < 0 ? 'text-[#ff4d6a]' : ''}`}>
                         {comment.score !== 0 ? (comment.score > 0 ? `+${comment.score}` : comment.score) : '0'}
                       </span>
                       <button 
                         className={`p-1 rounded-full transition-colors ${comment.myVote === -1 ? 'text-[#ff4d6a] bg-[#ff4d6a10]' : 'hover:bg-[#ffffff10]'}`}
                         onClick={() => handleCommentVote(comment.id, -1)}
                       >
                         <ChevronDown size={14} fill={comment.myVote === -1 ? 'currentColor' : 'none'} />
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4 font-mono uppercase tracking-widest text-[10px]">Transmission silent. Be the first to broadcast.</p>
          )}
        </div>
      )}

      {profile ? (
        <div className="space-y-3">
          {imagePreview && (
            <div className="relative inline-block ml-11">
              <img src={imagePreview} alt="preview" className="w-20 h-20 object-cover rounded-xl border border-cyan-400/50 shadow-lg shadow-cyan-400/10" />
              <button 
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-black border border-[#ffffff20] text-white rounded-full p-1 hover:bg-red-500 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}
          
          <div className="flex gap-3 items-end">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[#ffffff08] mb-1">
              {profile.avatar_url ? (
                <img src={getOptimizedUrl(profile.avatar_url, 'w_80,h_80,c_fill')} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="flex items-center justify-center h-full text-xs text-gray-500">👤</span>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-2 relative">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Broadcast your thoughts..."
                rows={1}
                className="w-full bg-[#ffffff08] border border-[#ffffff10] rounded-2xl px-4 py-3 pr-24 text-sm text-white focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-all resize-none min-h-[46px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handlePostComment();
                  }
                }}
              />
              <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
                <label className="p-2 text-gray-500 hover:text-cyan-400 transition-colors cursor-pointer">
                  <ImageIcon size={18} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                </label>
                <button
                  onClick={handlePostComment}
                  disabled={(!newComment.trim() && !selectedImage) || isPosting}
                  className="bg-cyan-500 hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed text-black w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-lg shadow-cyan-500/10"
                >
                  {isPosting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[10px] font-mono text-gray-600 text-center py-2 uppercase tracking-widest">Authentication required for transmission.</p>
      )}

      {lightboxImage && (
        <ImageLightbox 
          images={[lightboxImage]} 
          onClose={() => setLightboxImage(null)} 
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ffffff10; border-radius: 10px; }
      `}</style>
    </div>
  );
}
