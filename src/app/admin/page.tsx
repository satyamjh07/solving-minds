'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDialog } from '@/components/DialogProvider';
import QuestionsTab from './QuestionsTab';
import BookletsTab from './BookletsTab';

export default function AdminPage() {
  const { profile, loading: profileLoading } = useProfile();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('reports');
  const [stats, setStats] = useState({ users: 0, posts: 0, reports: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // Authorization Guard
  useEffect(() => {
    if (!profileLoading && profile?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [profile, profileLoading, router]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [{ count: users }, { count: posts }, { count: reports }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);
      setStats({
        users: users || 0,
        posts: posts || 0,
        reports: reports || 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchStats();
    }
  }, [profile]);

  if (profileLoading || profile?.role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="page active" id="page-admin">
      <div className="w-full px-2 sm:px-4 mt-4">
        <div className="mb-4">
          <Link href="/dashboard" className="text-[var(--text2)] hover:text-[var(--text)] font-bold text-sm uppercase tracking-widest flex items-center gap-2 w-fit">
            ← Back to Dashboard
          </Link>
        </div>
        <div className="page-header mb-8">
          <h2 className="text-3xl font-bold font-[family-name:var(--font-bebas)] tracking-wider">🛡️ Admin Panel</h2>
        <p className="text-[var(--text2)]">Manage users, posts, and reports</p>
      </div>

      {/* Quick stats */}
      <div className="admin-stats-row mb-8 flex gap-4">
        <div className="admin-stat-card flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">👥</div>
          <div className="text-4xl font-bold font-[family-name:var(--font-bebas)]">{loadingStats ? '…' : stats.users}</div>
          <div className="text-xs uppercase tracking-widest text-[var(--text2)] mt-2">Total Users</div>
        </div>
        <div className="admin-stat-card flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">📝</div>
          <div className="text-4xl font-bold font-[family-name:var(--font-bebas)]">{loadingStats ? '…' : stats.posts}</div>
          <div className="text-xs uppercase tracking-widest text-[var(--text2)] mt-2">Total Posts</div>
        </div>
        <div className="admin-stat-card flex-1 bg-[var(--card)] border border-[var(--red)] rounded-2xl p-6 text-center" style={{ background: 'rgba(231,76,60,0.05)' }}>
          <div className="text-3xl mb-2">🚩</div>
          <div className="text-4xl font-bold font-[family-name:var(--font-bebas)] text-[var(--red)]">{loadingStats ? '…' : stats.reports}</div>
          <div className="text-xs uppercase tracking-widest text-[var(--red)] mt-2">Pending Reports</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs-bar flex gap-2 border-b border-[var(--border)] mb-8 overflow-x-auto">
        <button 
          className={`px-6 py-3 font-bold text-sm uppercase tracking-widest transition-colors ${activeTab === 'reports' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text2)] hover:text-[var(--text)]'}`}
          onClick={() => setActiveTab('reports')}
        >
          🚩 Reports
        </button>
        <button 
          className={`px-6 py-3 font-bold text-sm uppercase tracking-widest transition-colors ${activeTab === 'users' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text2)] hover:text-[var(--text)]'}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button 
          className={`px-6 py-3 font-bold text-sm uppercase tracking-widest transition-colors ${activeTab === 'posts' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text2)] hover:text-[var(--text)]'}`}
          onClick={() => setActiveTab('posts')}
        >
          📝 Posts
        </button>
        <button 
          className={`px-6 py-3 font-bold text-sm uppercase tracking-widest transition-colors ${activeTab === 'questions' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text2)] hover:text-[var(--text)]'}`}
          onClick={() => setActiveTab('questions')}
        >
          🧪 Questions
        </button>
        <button 
          className={`px-6 py-3 font-bold text-sm uppercase tracking-widest transition-colors ${activeTab === 'booklets' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text2)] hover:text-[var(--text)]'}`}
          onClick={() => setActiveTab('booklets')}
        >
          📚 Booklets
        </button>
      </div>

      <div className="admin-tab-pane active">
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'posts' && <PostsTab />}
        {activeTab === 'questions' && <QuestionsTab />}
        {activeTab === 'booklets' && <BookletsTab />}
      </div>
      </div>
    </div>
  );
}

// --- Tabs Components ---

function ReportsTab() {
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
      .select('*, reporter:reporter_id(name), post:post_id(content)')
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
    const { error: updateErr } = await supabase
      .from('reports')
      .update({ status: newStatus, admin_note: adminNote.trim(), resolved_by: (await supabase.auth.getUser()).data.user?.id })
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

  if (loading) return <div className="text-[var(--text2)] p-4">Loading reports...</div>;

  return (
    <div className="space-y-4">
      {reports.map(rep => (
        <div key={rep.id} className="bg-[#ff4d6a]/5 border border-[#ff4d6a]/20 rounded-2xl p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="font-bold text-[#ff4d6a] text-sm flex items-center gap-2">
                🚩 Reported by {rep.reporter?.name || 'Unknown'}
              </div>
              <div className="text-xs text-[var(--text2)] mt-1">Reason: {rep.reason}</div>
              <div className="text-xs text-[var(--text2)] mt-0.5">
                {new Date(rep.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openAction(rep.id, rep.post_id, 'dismiss')}
                className="text-xs bg-[var(--bg3)] px-3 py-1.5 rounded font-bold uppercase tracking-widest hover:bg-[var(--border)] transition-colors"
              >
                ✕ Dismiss
              </button>
              {rep.post_id && (
                <button
                  onClick={() => openAction(rep.id, rep.post_id, 'delete')}
                  className="text-xs bg-[#ff4d6a]/20 text-[#ff4d6a] px-3 py-1.5 rounded font-bold uppercase tracking-widest hover:bg-[#ff4d6a]/30 transition-colors"
                >
                  🗑 Delete Post
                </button>
              )}
            </div>
          </div>
          {rep.post && (
            <div className="mt-3 p-3 bg-[var(--bg)] border border-[var(--border)] rounded text-sm text-[var(--text2)] whitespace-pre-wrap">
              {rep.post.content}
            </div>
          )}
        </div>
      ))}
      {reports.length === 0 && <div className="text-[var(--text2)] text-center py-8">No pending reports! 🎉</div>}

      {/* ── Admin Action Modal ─────────────────────────────────────────── */}
      {actionModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setActionModal(null)}
        >
          <div
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full shadow-2xl animate-scale-in"
            style={{ maxWidth: 460 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${actionModal.type === 'delete' ? 'bg-[#ff4d6a]/15' : 'bg-yellow-500/10'}`}>
                {actionModal.type === 'delete' ? '🗑️' : '✕'}
              </div>
              <div>
                <div className="font-bold text-white">
                  {actionModal.type === 'delete' ? 'Delete Post & Resolve' : 'Dismiss Report'}
                </div>
                <div className="text-xs text-[var(--text2)]">
                  {actionModal.type === 'delete'
                    ? 'This will permanently delete the post and mark the report as resolved.'
                    : 'This will mark the report as dismissed without deleting content.'}
                </div>
              </div>
            </div>

            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text2)] mb-2">
              Admin Note <span className="text-[#ff4d6a]">*required</span>
            </label>
            <textarea
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              placeholder={
                actionModal.type === 'delete'
                  ? 'e.g. "Contains abusive language targeting another student."'
                  : 'e.g. "Post reviewed — content does not violate community guidelines."'
              }
              rows={3}
              maxLength={300}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent)] transition-colors resize-none mb-1"
            />
            <div className="text-right text-[10px] text-gray-600 mb-4">{adminNote.length}/300</div>

            <div className="flex gap-3">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text2)] font-bold text-sm uppercase tracking-widest hover:bg-[var(--bg3)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={isActing || !adminNote.trim()}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  actionModal.type === 'delete'
                    ? 'bg-[#ff4d6a] hover:bg-[#e03555] text-white'
                    : 'bg-[var(--accent)] hover:brightness-110 text-black'
                }`}
              >
                {isActing ? '...' : actionModal.type === 'delete' ? 'Delete & Resolve' : 'Confirm Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, toast } = useDialog();

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const changeRole = async (userId: string, newRole: string) => {
    const ok = await confirm({ title: 'Change Role', message: `Change this user's role to ${newRole}?`, confirmLabel: 'Change' });
    if (!ok) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
      
    if (error) {
      toast('Error updating role: ' + error.message, 'error');
    } else {
      toast('Role updated to ' + newRole, 'success');
      fetchUsers();
    }
  };

  if (loading) return <div className="text-[var(--text2)] p-4">Loading users...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)] text-[var(--text2)] text-xs uppercase tracking-widest">
            <th className="py-4 px-4 font-bold">User</th>
            <th className="py-4 px-4 font-bold">Class</th>
            <th className="py-4 px-4 font-bold">Role</th>
            <th className="py-4 px-4 font-bold">Joined</th>
            <th className="py-4 px-4 font-bold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--bg2)] transition-colors">
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg3)] overflow-hidden flex items-center justify-center border border-[var(--border)]">
                    {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : '👤'}
                  </div>
                  <div>
                    <div className="font-bold">{u.name || 'Unknown'}</div>
                    <div className="text-xs text-[var(--text2)] font-mono">{u.email}</div>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4 text-sm">{u.class || '—'}</td>
              <td className="py-4 px-4">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${
                  u.role === 'admin' ? 'bg-[#ff4d6a]/10 text-[#ff4d6a] border-[#ff4d6a]/20' : 
                  u.role === 'mod' ? 'bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/20' : 
                  'bg-[var(--bg3)] text-[var(--text2)] border-[var(--border)]'
                }`}>
                  {u.role || 'member'}
                </span>
              </td>
              <td className="py-4 px-4 text-sm text-[var(--text2)]">
                {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td className="py-4 px-4">
                <select 
                  className="bg-[var(--bg3)] border border-[var(--border)] rounded px-2 py-1 text-xs outline-none"
                  value={u.role || 'member'}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="mod">Mod</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Posts Tab Component ---

function PostsTab() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, toast } = useDialog();

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!error && data) {
      setPosts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const deletePost = async (postId: string) => {
    const ok = await confirm({ title: 'Delete Post', message: 'Delete this post permanently? This cannot be undone.', danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);
      
    if (error) {
      toast('Error deleting post: ' + error.message, 'error');
    } else {
      toast('Post deleted successfully.', 'success');
      fetchPosts();
    }
  };

  if (loading) return <div className="text-[var(--text2)] p-4">Loading posts...</div>;

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <div key={post.id} className="bg-[var(--bg2)] border border-[var(--border)] rounded-2xl p-4 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg3)] overflow-hidden flex items-center justify-center border border-[var(--border)] flex-shrink-0">
            {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover" /> : '👤'}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold text-sm">{post.profiles?.name || 'Unknown User'}</div>
                <div className="text-xs text-[var(--text2)]">
                  {new Date(post.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
              <button 
                onClick={() => deletePost(post.id)}
                className="text-[#ff4d6a] hover:bg-[#ff4d6a]/10 p-2 rounded transition-colors text-xs font-bold uppercase tracking-widest"
              >
                Delete
              </button>
            </div>
            <div className="text-sm whitespace-pre-wrap">{post.content}</div>
          </div>
        </div>
      ))}
      {posts.length === 0 && <div className="text-[var(--text2)] text-center py-8">No posts found.</div>}
    </div>
  );
}
