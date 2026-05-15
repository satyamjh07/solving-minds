'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, MessageSquare, CheckCircle2, ChevronRight, X, User, LifeBuoy } from 'lucide-react';
import { SupportChat } from '@/components/Support/SupportChat';
import { useDialog } from '@/components/DialogProvider';

export function TicketsTab() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  
  // Resolution Modal State
  const [showResolve, setShowResolve] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const { toast } = useDialog();

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*, profiles:user_id(name, avatar_url)')
      .order('updated_at', { ascending: false });

    if (!error && data) setTickets(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleResolve = async () => {
    if (!resolutionNote.trim() || !selectedTicket) return;
    setIsResolving(true);

    const { data: userData } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('support_tickets')
      .update({
        status: 'closed',
        resolution_note: resolutionNote.trim(),
        resolved_by: userData.user?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedTicket.id);

    if (!error) {
      toast('Ticket resolved and closed.', 'success');
      setShowResolve(false);
      setResolutionNote('');
      setSelectedTicket(null);
      fetchTickets();
    } else {
      toast('Failed to resolve ticket.', 'error');
    }
    setIsResolving(false);
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="animate-spin text-purple h-8 w-8" />
    </div>
  );

  return (
    <div className="space-y-4">
      {tickets.map(ticket => (
        <div 
          key={ticket.id} 
          className={`bg-white/5 border rounded-2xl p-5 hover:bg-white/10 transition-all cursor-pointer ${
            ticket.status === 'closed' ? 'border-green-500/10' : 'border-white/10'
          }`}
          onClick={() => setSelectedTicket(ticket)}
        >
          <div className="flex justify-between items-start">
            <div className="flex gap-4">
               <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple">
                 <MessageSquare size={18} />
               </div>
               <div>
                  <h4 className="font-bold text-white text-base">{ticket.subject}</h4>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User size={12} /> {ticket.profiles?.name || 'Unknown User'}
                     </span>
                     <span className="text-[10px] text-muted-foreground/40 font-mono">
                        {new Date(ticket.created_at).toLocaleString()}
                     </span>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                 ticket.status === 'closed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-purple/10 text-purple border-purple/20'
               }`}>
                 {ticket.status}
               </span>
               <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </div>
        </div>
      ))}

      {tickets.length === 0 && (
        <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl opacity-50">
          <p className="text-[10px] font-mono uppercase tracking-widest">No support tickets currently in queue.</p>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelectedTicket(null)}>
          <div 
            className="bg-bg-2 border border-white/10 rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col h-[700px]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple">
                    <LifeBuoy size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-white uppercase tracking-tight">{selectedTicket.subject}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                       From {selectedTicket.profiles?.name} · Ticket ID: {selectedTicket.id.slice(0, 8)}
                    </p>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  {selectedTicket.status !== 'closed' && (
                    <button 
                      onClick={() => setShowResolve(true)}
                      className="px-4 py-2 bg-green-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all shadow-lg shadow-green-500/20"
                    >
                      Resolve & Close
                    </button>
                  )}
                  <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X size={20} />
                  </button>
               </div>
            </div>

            <div className="flex-1 overflow-hidden">
               <SupportChat ticketId={selectedTicket.id} isClosed={selectedTicket.status === 'closed'} />
            </div>
            
            {selectedTicket.status === 'closed' && selectedTicket.resolution_note && (
               <div className="p-6 bg-green-500/5 border-t border-green-500/10">
                  <h5 className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-1">Resolution Note:</h5>
                  <p className="text-sm text-gray-300 italic">"{selectedTicket.resolution_note}"</p>
               </div>
            )}
          </div>
        </div>
      )}

      {/* Resolution Note Modal */}
      {showResolve && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowResolve(false)}>
           <div className="bg-bg-2 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Finalize Resolution</h3>
              <p className="text-xs text-muted-foreground mb-6">Provide a brief explanation of how this ticket was resolved for our records.</p>
              
              <textarea 
                autoFocus
                value={resolutionNote}
                onChange={e => setResolutionNote(e.target.value)}
                placeholder="e.g. Explained the level up calculation logic to the user."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-all resize-none mb-6"
              />
              
              <div className="flex gap-3">
                 <button onClick={() => setShowResolve(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-muted-foreground font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                 <button 
                   onClick={handleResolve}
                   disabled={isResolving || !resolutionNote.trim()}
                   className="flex-1 py-3 rounded-xl bg-green-500 text-black font-black text-[10px] uppercase tracking-widest hover:brightness-110 shadow-xl shadow-green-500/20 transition-all flex items-center justify-center gap-2"
                 >
                   {isResolving ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Resolve'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
