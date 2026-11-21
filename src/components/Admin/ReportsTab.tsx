'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useDialog } from '@/components/DialogProvider';
import { Loader2, Flag, Trash2, X as XIcon, CheckCircle2 } from 'lucide-react';

export function ReportsTab() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useDialog();

  // Inline action modal state
  const [actionModal, setActionModal] = useState<{
    reportId: string;
    postId: string | null;
    type: 'dismiss' | 'delete';
  } | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isActing, setIsActing] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*, reporter:reporter_id(name), post:post_id(content), question:question_id(question_text, subject, chapter)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (!error && data) setReports(data);
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, []);

  const openAction = (reportId: string, postId: string | null, type: 'dismiss' | 'delete') => {
    setAdminNote('');
    setActionModal({ reportId, postId, type });
  };

  const handleAction = async () => {
    if (!adminNote.trim()) {
      toast('A brief reason is mandatory before taking action.', 'warning');
      return;
    }
    if (!actionModal) return;
    setIsActing(true);

    const { reportId, postId, type } = actionModal;
    const newStatus = type === 'delete' ? 'resolved' : 'dismissed';

    // Save admin note + update status
    const { data: userData } = await supabase.auth.getUser();
    const { error: updateErr } = await supabase
      .from('reports')
      .update({ 
        status: newStatus, 
        admin_note: adminNote.trim(), 
        resolved_by: userData.user?.id 
      })
      .eq('id', reportId);

    if (updateErr) {
      toast('Failed to update report: ' + updateErr.message, 'error');
      setIsActing(false);
      return;
    }

    // Delete the post if needed
    if (type === 'delete' && postId) {
      const { error: delErr } = await supabase.from('posts').delete().eq('id', postId);
      if (delErr) {
        toast('Report resolved but failed to delete post: ' + delErr.message, 'warning');
      } else {
        toast('Post deleted and report resolved.', 'success');
      }
    } else {
      toast('Report dismissed successfully.', 'success');
    }

    setActionModal(null);
    setAdminNote('');
    setIsActing(false);
    fetchReports();
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="animate-spin text-purple h-8 w-8" />
    </div>
  );

  return (
    <div className="space-y-4">
      {reports.map(rep => (
        <div key={rep.id} className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 hover:border-red-500/30 transition-all">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
            <div>
              <div className="font-bold text-red-400 text-sm flex items-center gap-2">
                <Flag size={14} fill="currentColor" />
                {rep.question_id ? '[QUESTION] ' : '[POST] '}Reported by {rep.reporter?.name || 'Unknown'}
              </div>
              <div className="text-xs text-muted-foreground mt-1 bg-white/5 px-2 py-1 rounded-lg w-fit border border-white/5">
                Reason: {rep.reason}
              </div>
              <div className="text-[10px] text-muted-foreground/60 mt-2 font-mono uppercase tracking-widest">
                {new Date(rep.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => openAction(rep.id, rep.post_id || rep.question_id, 'dismiss')}
                className="flex-1 sm:flex-none text-[10px] bg-white/5 px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:bg-white/10 border border-white/5 transition-all text-muted-foreground hover:text-white"
              >
                ✕ Dismiss
              </button>
              {rep.post_id && (
                <button
                  onClick={() => openAction(rep.id, rep.post_id, 'delete')}
                  className="flex-1 sm:flex-none text-[10px] bg-red-500/20 text-red-400 px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:bg-red-500/30 border border-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={12} />
                  Delete Content
                </button>
              )}
              {rep.question_id && (
                <button
                  onClick={() => openAction(rep.id, null, 'delete')}
                  className="flex-1 sm:flex-none text-[10px] bg-green-500/20 text-green-400 px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:bg-green-500/30 border border-green-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={12} />
                  Resolve Issue
                </button>
              )}
            </div>
          </div>
          {rep.post && (
            <div className="mt-3 p-4 bg-black/20 border border-white/5 rounded-xl text-sm text-gray-300 whitespace-pre-wrap italic leading-relaxed">
              "{rep.post.content}"
            </div>
          )}
          {rep.question && (
            <div className="mt-3 p-4 bg-black/25 border border-white/[0.06] rounded-xl text-sm text-gray-300">
              <div className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-widest mb-1.5">
                Reported Question Details (Subject: {rep.question.subject} | Chapter: {rep.question.chapter})
              </div>
              <div className="italic leading-relaxed whitespace-pre-wrap bg-white/[0.01] p-3 rounded-lg border border-white/[0.03]">
                "{rep.question.question_text}"
              </div>
              <div className="text-[9px] text-muted-foreground mt-2 font-mono uppercase tracking-widest">
                QUESTION ID: {rep.question_id}
              </div>
            </div>
          )}
        </div>
      ))}
      
      {reports.length === 0 && (
        <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl backdrop-blur-sm">
          <div className="mb-4 flex justify-center text-green-500/20">
            <CheckCircle2 size={60} />
          </div>
          <p className="text-gray-400 font-mono text-xs uppercase tracking-[0.2em]">Zero active reports detected in this sector.</p>
        </div>
      )}

      {/* ── Action Modal ─────────────────────────────────────────── */}
      {actionModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActionModal(null)}
        >
          <div
            className="bg-bg-2 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg ${
                actionModal.type === 'delete' 
                  ? (actionModal.postId ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400') 
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {actionModal.type === 'delete' 
                  ? (actionModal.postId ? <Trash2 size={24} /> : <CheckCircle2 size={24} />) 
                  : <XIcon size={24} />}
              </div>
              <div>
                <h3 className="font-black text-white uppercase tracking-wider">
                  {actionModal.type === 'delete' 
                    ? (actionModal.postId ? 'Confirm Deletion' : 'Resolve Question Issue') 
                    : 'Dismiss Report'}
                </h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  {actionModal.type === 'delete' 
                    ? (actionModal.postId ? 'Permanently remove reported content' : 'Mark the reported question issue as resolved') 
                    : 'Mark report as invalid / no action needed'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Moderator Note <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder={
                    actionModal.type === 'delete'
                      ? (actionModal.postId 
                          ? 'Reason for deletion (e.g. Violation of community standards)' 
                          : 'Reason for resolution (e.g. Corrected typo in option B)')
                      : 'Reason for dismissal (e.g. Content reviewed and approved)'
                  }
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple/50 focus:ring-1 focus:ring-purple/20 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setActionModal(null)}
                  className="flex-1 py-3 rounded-2xl border border-white/10 text-muted-foreground font-black text-[10px] uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={isActing || !adminNote.trim()}
                  className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-40 shadow-xl ${
                    actionModal.type === 'delete'
                      ? (actionModal.postId ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-green-500 text-white shadow-green-500/20')
                      : 'bg-purple text-white shadow-purple/20'
                  }`}
                >
                  {isActing ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirm Action'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
