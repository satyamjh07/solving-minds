'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { X, Plus, MessageSquare, Clock, CheckCircle2, ChevronRight, Loader2, LifeBuoy } from 'lucide-react';
import { SupportChat } from './SupportChat';
import { useDialog } from '@/components/DialogProvider';

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  updated_at: string;
}

interface SupportModalProps {
  onClose: () => void;
}

export function SupportModal({ onClose }: SupportModalProps) {
  const { profile } = useProfile();
  const { toast } = useDialog();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchTickets();
    }
  }, [profile?.id]);

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', profile?.id)
      .order('updated_at', { ascending: false });

    if (!error && data) setTickets(data);
    setLoading(false);
  };

  const createTicket = async () => {
    if (!newSubject.trim() || !profile) return;
    setIsCreating(true);

    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: profile.id,
        subject: newSubject.trim(),
        status: 'open'
      })
      .select()
      .single();

    if (!error && data) {
      setTickets(prev => [data, ...prev]);
      setSelectedTicket(data);
      setShowCreate(false);
      setNewSubject('');
      toast('Ticket created. A moderator will respond soon.', 'success');
    } else {
      toast('Failed to create ticket.', 'error');
    }
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-bg-2 border border-white/10 rounded-3xl overflow-hidden max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col h-[600px]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
             {selectedTicket ? (
               <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                 <ChevronRight className="rotate-180" size={20} />
               </button>
             ) : (
               <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center">
                 <LifeBuoy size={20} className="text-purple" />
               </div>
             )}
             <div>
               <h2 className="text-lg font-black text-white uppercase tracking-tight">
                 {selectedTicket ? 'Ticket Session' : 'Support Center'}
               </h2>
               <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                 {selectedTicket ? `ID: ${selectedTicket.id.slice(0, 8)}` : 'Secure assistance portal'}
               </p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {selectedTicket ? (
            <SupportChat ticketId={selectedTicket.id} isClosed={selectedTicket.status === 'closed'} />
          ) : showCreate ? (
            <div className="p-8 space-y-6 animate-in slide-in-from-right-4 duration-300">
               <div className="text-center space-y-2 mb-8">
                  <h3 className="text-xl font-bold text-white">Create Support Ticket</h3>
                  <p className="text-sm text-muted-foreground">Explain your issue and our team will get back to you shortly.</p>
               </div>
               
               <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Subject / Issue Title</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={newSubject}
                      onChange={e => setNewSubject(e.target.value)}
                      placeholder="e.g. Question regarding level up protocol"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple/50 transition-all"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setShowCreate(false)}
                      className="flex-1 py-4 rounded-2xl border border-white/10 text-muted-foreground font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={createTicket}
                      disabled={isCreating || !newSubject.trim()}
                      className="flex-1 py-4 rounded-2xl bg-purple text-white font-black text-[10px] uppercase tracking-widest hover:brightness-110 shadow-xl shadow-purple/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isCreating ? <Loader2 size={16} className="animate-spin" /> : 'Open Ticket'}
                    </button>
                  </div>
               </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                    <Loader2 className="animate-spin text-purple h-8 w-8" />
                    <p className="text-[10px] font-mono uppercase tracking-widest">Scanning Archive...</p>
                  </div>
                ) : tickets.length > 0 ? (
                  tickets.map(ticket => (
                    <button 
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className="w-full p-5 bg-white/5 border border-white/5 rounded-3xl hover:border-purple/30 hover:bg-white/10 transition-all text-left flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                           ticket.status === 'closed' ? 'bg-green-500/10 text-green-500' : 'bg-purple/10 text-purple'
                         }`}>
                           {ticket.status === 'closed' ? <CheckCircle2 size={18} /> : <MessageSquare size={18} />}
                         </div>
                         <div>
                            <h4 className="font-bold text-white group-hover:text-purple transition-colors">{ticket.subject}</h4>
                            <div className="flex items-center gap-2 mt-1">
                               <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                 ticket.status === 'closed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-purple/10 text-purple border-purple/20'
                               }`}>
                                 {ticket.status.replace('_', ' ')}
                               </span>
                               <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">
                                 {new Date(ticket.created_at).toLocaleDateString()}
                               </span>
                            </div>
                         </div>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-all" />
                    </button>
                  ))
                ) : (
                  <div className="text-center py-20 space-y-4 opacity-30">
                    <Clock size={48} className="mx-auto" />
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em]">Zero ticket history detected.</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-white/[0.02] border-t border-white/5">
                 <button 
                   onClick={() => setShowCreate(true)}
                   className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 hover:border-purple/50 transition-all flex items-center justify-center gap-3"
                 >
                   <Plus size={16} /> New Support Request
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ffffff10; border-radius: 10px; }
      `}</style>
    </div>
  );
}
