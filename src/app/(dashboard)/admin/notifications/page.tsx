'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase/client';
import { Send, Bell, Users, User, GraduationCap, Clock, Loader2 } from 'lucide-react';
import { useDialog } from '@/components/DialogProvider';

export default function AdminNotificationsPage() {
  const { profile } = useProfile();
  const { toast } = useDialog();
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'everyone' | '11th' | '12th' | 'dropper' | 'user'>('everyone');
  const [targetUser, setTargetUser] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (audience === 'user') {
      const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('id, name, email').limit(50);
        setUsers(data || []);
      };
      fetchUsers();
    }
  }, [audience]);

  const handleSend = async () => {
    if (!title || !message) {
      toast('Please enter title and message', 'warning');
      return;
    }
    if (audience === 'user' && !targetUser) {
      toast('Please select a target user', 'warning');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body: message,
          audience,
          targetId: targetUser
        })
      });
      const data = await res.json();
      if (data.success) {
        toast(`Sent successfully to ${data.sentCount} devices`, 'success');
        setTitle('');
        setMessage('');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast(err.message || 'Failed to send notification', 'error');
    } finally {
      setIsSending(false);
    }
  };

  if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
    return <div className="p-10 text-center text-gray-500 uppercase tracking-widest text-xs">Access Denied</div>;
  }

  return (
    <div className="an-content px-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#7c3aed]/10 flex items-center justify-center text-[#7c3aed]">
            <Bell size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Broadcast Center</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Push Notification Dispatcher</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Audience Selection */}
          <div className="bg-[#12121a] border border-[#ffffff08] rounded-2xl p-6">
            <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-4">Target Audience</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: 'everyone', label: 'Everyone', icon: <Users size={14} /> },
                { id: '11th', label: 'Class 11th', icon: <GraduationCap size={14} /> },
                { id: '12th', label: 'Class 12th', icon: <GraduationCap size={14} /> },
                { id: 'dropper', label: 'Droppers', icon: <GraduationCap size={14} /> },
                { id: 'user', label: 'Specific User', icon: <User size={14} /> },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setAudience(opt.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                    audience === opt.id 
                      ? 'bg-[#7c3aed] border-[#7c3aed] text-white shadow-lg shadow-purple-500/20' 
                      : 'bg-[#ffffff05] border-[#ffffff08] text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            {audience === 'user' && (
              <div className="mt-4">
                <select 
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  className="w-full bg-[#ffffff05] border border-[#ffffff08] rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#7c3aed]"
                >
                  <option value="">Select User</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Message Composition */}
          <div className="bg-[#12121a] border border-[#ffffff08] rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Notification Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 🚩 New Mock Test Live!"
                className="w-full bg-[#ffffff05] border border-[#ffffff08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#7c3aed]"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Message Body</label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Enter the notification content..."
                className="w-full bg-[#ffffff05] border border-[#ffffff08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#7c3aed] resize-none"
              />
            </div>
          </div>

          {/* Schedule Placeholder */}
          <div className="bg-[#12121a]/50 border border-dashed border-[#ffffff10] rounded-2xl p-6 flex items-center justify-between opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-3">
               <Clock size={18} className="text-gray-500" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Schedule Transmission</span>
            </div>
            <span className="text-[8px] bg-white/5 px-2 py-1 rounded text-gray-400">COMING SOON</span>
          </div>

          {/* Action Button */}
          <button 
            onClick={handleSend}
            disabled={isSending}
            className="w-full bg-gradient-to-r from-[#7c3aed] to-[#2563eb] py-4 rounded-2xl text-white font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Initiate Broadcast
          </button>
        </div>
      </div>
    </div>
  );
}
