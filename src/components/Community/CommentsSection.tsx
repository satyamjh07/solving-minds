'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Loader2, Send, ChevronUp, ChevronDown, Image as ImageIcon, X, MoreVertical, Trash2, VolumeX, Volume2 } from 'lucide-react';
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
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [cooldownTime, setCooldownTime] = useState<number>(0);

  const checkCooldown = async () => {
    if (!profile) return;
    try {
      const { data: recentComments, error } = await supabase
        .from('comments')
        .select('created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && recentComments && recentComments.length >= 5) {
        const oldestComment = recentComments[4]; // 5th newest
        const oldestTime = new Date(oldestComment.created_at).getTime();
        const cooldownExpiresAt = oldestTime + 10 * 60 * 1000;
        const remainingMs = cooldownExpiresAt - Date.now();
        if (remainingMs > 0) {
          setCooldownTime(Math.ceil(remainingMs / 1000));
        }
      }
    } catch (e) {
      console.error('Failed to check comment cooldown', e);
    }
  };

  useEffect(() => {
    if (profile) {
      checkCooldown();
    }
  }, [profile]);

  useEffect(() => {
    if (cooldownTime <= 0) return;
    const timer = setInterval(() => {
      setCooldownTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownTime]);

  const fetchComments = async () => {
    setLoading(true);
    const { data: commentsData, error } = await supabase
      .from('comments')
      .select('*, profiles(id, name, avatar_url, role, muted_until)')
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
      // 1. Spam Rate Limit Check: max 5 comments per 10 minutes
      const { data: recentComments, error: fetchRecentError } = await supabase
        .from('comments')
        .select('created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (fetchRecentError) throw fetchRecentError;

      if (recentComments && recentComments.length >= 5) {
        const oldestComment = recentComments[4]; // 5th newest comment
        const oldestTime = new Date(oldestComment.created_at).getTime();
        const cooldownExpiresAt = oldestTime + 10 * 60 * 1000;
        const remainingMs = cooldownExpiresAt - Date.now();

        if (remainingMs > 0) {
          const remainingSecs = Math.ceil(remainingMs / 1000);
          setCooldownTime(remainingSecs);
          const mins = Math.floor(remainingSecs / 60);
          const secs = remainingSecs % 60;
          toast(`Spam protection: Maximum 5 comments per 10 minutes. Please wait ${mins}m ${secs}s before posting again.`, 'error');
          setIsPosting(false);
          return;
        }
      }

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

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast('Comment deleted', 'success');
    } catch (error: any) {
      toast(error.message || 'Failed to delete comment', 'error');
    }
  };

  const handleMuteUser = async (userId: string, isMuted: boolean) => {
    try {
      // Mute for 24 hours if isMuted is false (meaning we want to mute them)
      const mutedUntil = isMuted ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({ muted_until: mutedUntil })
        .eq('id', userId);
      
      if (error) throw error;
      
      toast(isMuted ? 'User unmuted' : 'User muted for 24h', 'success');
      fetchComments(); // Refresh to update roles/status if needed
    } catch (error: any) {
      toast(error.message || 'Failed to update user status', 'error');
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
                <div className="flex-1 bg-[#ffffff05] rounded-xl p-3 border border-[#ffffff05] group/comment relative">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-bold text-[13px] text-gray-200 cursor-pointer hover:text-cyan-400 transition-colors"
                        onClick={() => onShowUser(comment.user_id)}
                      >
                        {comment.profiles?.name || 'Anonymous'}
                        {comment.profiles?.role === 'admin' && <span className="ml-2 text-[8px] bg-red-500/20 text-red-400 px-1 rounded uppercase font-black tracking-tighter">ADMIN</span>}
                        {comment.profiles?.role === 'mod' && <span className="ml-2 text-[8px] bg-purple-500/20 text-purple-400 px-1 rounded uppercase font-black tracking-tighter">MOD</span>}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500 uppercase">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Comment Actions Menu */}
                    {(profile?.role === 'admin' || profile?.role === 'mod' || profile?.id === comment.user_id) && (
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(activeMenu === comment.id ? null : comment.id);
                          }}
                          className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all opacity-0 group-hover/comment:opacity-100"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {activeMenu === comment.id && (
                          <div 
                            className="absolute right-0 top-full mt-1 w-32 bg-bg-2 border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                            onMouseLeave={() => setActiveMenu(null)}
                          >
                            {(profile.role === 'admin' || profile.role === 'mod') && profile.id !== comment.user_id && (
                              <button 
                                onClick={() => {
                                  handleMuteUser(comment.user_id, !!comment.profiles?.muted_until);
                                  setActiveMenu(null);
                                }}
                                className="w-full px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors flex items-center gap-2"
                              >
                                {comment.profiles?.muted_until ? <Volume2 size={12} /> : <VolumeX size={12} />}
                                {comment.profiles?.muted_until ? 'Unmute' : 'Mute'}
                              </button>
                            )}
                            {(profile.role === 'admin' || profile.role === 'mod' || profile.id === comment.user_id) && (
                              <button 
                                onClick={() => {
                                  if (confirm('Delete this transmission?')) handleDeleteComment(comment.id);
                                  setActiveMenu(null);
                                }}
                                className="w-full px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 text-red-400 transition-colors flex items-center gap-2"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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
                placeholder={cooldownTime > 0 ? `Spam protection: Wait ${Math.floor(cooldownTime / 60)}m ${cooldownTime % 60}s...` : "Broadcast your thoughts..."}
                disabled={cooldownTime > 0}
                rows={1}
                className="w-full bg-[#ffffff08] border border-[#ffffff10] rounded-2xl px-4 py-3 pr-24 text-sm text-white focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-all resize-none min-h-[46px] disabled:opacity-50 disabled:cursor-not-allowed"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && cooldownTime === 0) {
                    e.preventDefault();
                    handlePostComment();
                  }
                }}
              />
              <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
                <label className={`p-2 transition-colors ${cooldownTime > 0 ? 'pointer-events-none opacity-30' : 'text-gray-500 hover:text-cyan-400 cursor-pointer'}`}>
                  <ImageIcon size={18} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} disabled={cooldownTime > 0} />
                </label>
                <button
                  onClick={handlePostComment}
                  disabled={(!newComment.trim() && !selectedImage) || isPosting || cooldownTime > 0}
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
