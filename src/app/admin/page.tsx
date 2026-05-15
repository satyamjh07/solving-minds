'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDialog } from '@/components/DialogProvider';
import { ReportsTab } from '@/components/Admin/ReportsTab';
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
