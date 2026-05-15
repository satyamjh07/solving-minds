'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Send, Image as ImageIcon, X, Loader2, User, ShieldCheck } from 'lucide-react';
import { uploadToCloudinary, getOptimizedUrl } from '@/lib/cloudinary';
import { useDialog } from '@/components/DialogProvider';

interface Message {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  image_urls: string[];
  created_at: string;
  profiles?: {
    name: string;
    avatar_url: string;
    role: string;
  };
}

interface SupportChatProps {
  ticketId: string;
  isClosed?: boolean;
}

export function SupportChat({ ticketId, isClosed }: SupportChatProps) {
  const { profile } = useProfile();
  const { toast } = useDialog();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    // Set up Realtime subscription
    const channel = supabase
      .channel(`ticket:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        async (payload) => {
          // Fetch the message with profile info
          const { data } = await supabase
            .from('support_messages')
            .select('*, profiles:user_id(name, avatar_url, role)')
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            setMessages(prev => [...prev, data]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_messages')
      .select('*, profiles:user_id(name, avatar_url, role)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
      setTimeout(scrollToBottom, 100);
    }
    setLoading(false);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 2) {
      toast('Maximum 2 images allowed.', 'warning');
      return;
    }

    setImages(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && images.length === 0) || !profile || isClosed) return;
    setSending(true);

    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        const uploadPromises = images.map(img => uploadToCloudinary(img, { folder: 'support_tickets' }));
        imageUrls = await Promise.all(uploadPromises);
      }

      const { error } = await supabase.from('support_messages').insert({
        ticket_id: ticketId,
        user_id: profile.id,
        content: newMessage.trim(),
        image_urls: imageUrls
      });

      if (error) throw error;
      setNewMessage('');
      setImages([]);
      setPreviews([]);
    } catch (err: any) {
      toast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-4 opacity-50">
        <Loader2 className="animate-spin text-purple" />
        <p className="text-[10px] font-mono uppercase tracking-widest">Decrypting Archive...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[500px]">
      {/* Message List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 custom-scrollbar"
      >
        {messages.map((msg) => {
          const isMe = msg.user_id === profile?.id;
          const isStaff = msg.profiles?.role === 'admin' || msg.profiles?.role === 'mod';
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[85%] ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {msg.profiles?.avatar_url ? (
                    <img src={getOptimizedUrl(msg.profiles.avatar_url, 'w_80,h_80,c_fill')} className="w-full h-full object-cover" />
                  ) : (
                    isStaff ? <ShieldCheck size={16} className="text-purple" /> : <User size={16} className="text-muted-foreground" />
                  )}
                </div>
                <div className={`space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                   <div className={`px-4 py-3 rounded-2xl text-sm ${
                     isMe 
                      ? 'bg-purple text-white rounded-tr-none' 
                      : isStaff 
                        ? 'bg-purple/10 border border-purple/20 text-white rounded-tl-none'
                        : 'bg-white/5 border border-white/10 text-gray-300 rounded-tl-none'
                   }`}>
                     {msg.content && <p className="leading-relaxed">{msg.content}</p>}
                     {msg.image_urls?.length > 0 && (
                       <div className="grid gap-2 mt-2">
                         {msg.image_urls.map((url, i) => (
                           <img 
                             key={i} 
                             src={getOptimizedUrl(url, 'w_400')} 
                             className="rounded-lg max-w-full border border-black/20 cursor-zoom-in" 
                             onClick={() => window.open(url, '_blank')}
                           />
                         ))}
                       </div>
                     )}
                   </div>
                   <span className="text-[8px] font-mono text-muted-foreground/40 uppercase tracking-widest px-1">
                     {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </span>
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Secure channel initialized. Message the team below.</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      {!isClosed ? (
        <div className="p-4 border-t border-white/5 space-y-3">
          {previews.length > 0 && (
            <div className="flex gap-2 mb-2">
              {previews.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} className="w-16 h-16 object-cover rounded-xl border border-purple/50 shadow-lg shadow-purple/20" />
                  <button 
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 bg-black border border-white/10 rounded-full p-1 hover:bg-red-500 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Secure transmission..."
                rows={1}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-20 text-sm text-white focus:outline-none focus:border-purple/50 focus:ring-1 focus:ring-purple/20 transition-all resize-none min-h-[46px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
                <label className="p-2 text-muted-foreground hover:text-purple transition-colors cursor-pointer">
                  <ImageIcon size={18} />
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                </label>
                <button
                  onClick={handleSend}
                  disabled={(!newMessage.trim() && images.length === 0) || sending}
                  className="bg-purple hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed text-white w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-purple/20"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center bg-red-500/5 border-t border-red-500/10">
           <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">Transmission Channel Closed by Staff</p>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ffffff10; border-radius: 10px; }
      `}</style>
    </div>
  );
}
