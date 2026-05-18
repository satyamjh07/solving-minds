'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase/client';
import { 
  LayoutDashboard, 
  Target, 
  Users, 
  Settings, 
  ShieldAlert,
  LogOut,
  Bell,
  Award,
  User as UserIcon,
  Loader2,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { SupportModal } from '@/components/Support/SupportModal';
import { LifeBuoy } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useProfile();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const { permission, requestPermission } = useNotifications(profile?.id);
  
  const notifyRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && profile) {
      const needsOnboarding = 
        !profile.class || 
        profile.class.toLowerCase() === 'none' || 
        profile.class === '' ||
        !profile.target_year || 
        profile.target_year.toLowerCase() === 'none' ||
        profile.target_year === '' ||
        !profile.name ||
        profile.name.trim() === '';

      if (needsOnboarding && pathname !== '/auth/onboarding') {
        router.push('/auth/onboarding');
      }
    }
  }, [profile, loading, pathname, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notifyRef.current && !notifyRef.current.contains(target)) {
        setIsNotifyOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    };
    if (isNotifyOpen || isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotifyOpen, isProfileOpen]);

  useEffect(() => {
    if (profile?.id) {
      const fetchNotify = async () => {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });
        setNotifications(data || []);
      };
      fetchNotify();
    }
  }, [profile?.id]);

  const clearNotifications = async () => {
    if (!profile?.id) return;
    await supabase.from('notifications').delete().eq('user_id', profile.id);
    setNotifications([]);
  };

  const PAGE_META: Record<string, { title: string; sub: string }> = {
    '/dashboard':  { title: 'Command Center',     sub: 'Your daily performance hub' },
    '/solving':    { title: 'Solver_Protcol',     sub: 'Sharpen your problem-solving edge' },
    '/community':  { title: 'Social_Feed',        sub: 'Share, discuss, and grow together' },
    '/levelup':    { title: 'Level_Up_Protocol',  sub: 'Ascend the ranks of elite solvers' },
    '/settings':   { title: 'Settings',           sub: 'Personalize your profile and preferences' },
    '/admin':      { title: 'Admin_Panel',        sub: 'Manage users, posts, and reports' },
    '/moderation': { title: 'Moderation',         sub: 'Reviewing user transmission reports' },
  };

  const currentMeta = PAGE_META[pathname] ?? { title: 'Solving Minds', sub: 'Aura Protocol V3.0' };

  const navLinks = [
    { name: 'Home', href: '/dashboard', icon: <LayoutDashboard size={18} />, page: 'dashboard' },
    { name: 'Solver', href: '/solving', icon: <Target size={18} />, page: 'solving', badge: 'NEW' },
    { name: 'Social', href: '/community', icon: <Users size={18} />, page: 'community' },
    { name: 'Level Up', href: '/levelup', icon: <Award size={18} />, page: 'levelup' },
    { name: 'Settings', href: '/settings', icon: <Settings size={18} />, page: 'settings' },
  ];

  const isStaff = profile?.role === 'admin' || profile?.role === 'mod';
  const isAdmin = profile?.role === 'admin';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {/* Topbar (Solving Minds Analytics Style) */}
      <header className="an-topbar">
        <div className="an-topbar-left">
          <div className="an-topbar-title">{currentMeta.title}</div>
          <div className="an-topbar-sub" style={{ fontSize: '10px', opacity: 0.5, letterSpacing: '0.05em' }}>{currentMeta.sub}</div>
        </div>
        
        <div className="an-topbar-right">
          <div className="an-topbar-chip">
            <div className="an-live-dot"></div>
            Live tracking
          </div>
          
          <div className="relative" ref={notifyRef}>
            <button 
              className="an-topbar-chip hover:text-white transition-colors p-2 h-auto relative"
              onClick={() => setIsNotifyOpen(!isNotifyOpen)}
            >
              <Bell size={14} />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              )}
            </button>

            {isNotifyOpen && (
              <div className="zd-profile-dropdown open !w-72 !-right-12">
                <div className="zd-pd-header !pb-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">System Alerts</div>
                </div>
                <div className="max-h-64 overflow-y-auto zd-custom-scroll">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                        <div className="text-[10px] font-bold text-white mb-1 flex items-center justify-between">
                          {n.title}
                          <span className="text-[8px] text-gray-600 font-mono">{new Date(n.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                          {n.message}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-[10px] text-gray-600 uppercase tracking-widest">
                      No active alerts
                    </div>
                  )}
                </div>
                <div className="p-2 bg-white/[0.02] text-center">
                   <button 
                    onClick={clearNotifications}
                    className="text-[8px] font-bold text-gray-500 uppercase tracking-widest hover:text-red-400 transition-colors"
                   >
                    Clear All
                   </button>
                </div>
              </div>
            )}
          </div>

          <div className="zd-profile-wrap" ref={profileRef}>
            <button 
              className="zd-profile-btn"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <div className="zd-profile-avatar">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="av" />
                ) : (
                  profile?.name?.slice(0, 2).toUpperCase() || '?'
                )}
              </div>
            </button>

            {isProfileOpen && (
              <div className="zd-profile-dropdown open">
                <div className="zd-pd-header">
                  <div className="zd-pd-avatar-lg">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="av" />
                    ) : (
                      profile?.name?.slice(0, 2).toUpperCase() || '?'
                    )}
                  </div>
                  <div className="zd-pd-info">
                    <div className="zd-pd-name">{profile?.name || 'User'}</div>
                    <div className="zd-pd-email">{profile?.email}</div>
                  </div>
                </div>
                <div className="zd-pd-divider"></div>
                <button 
                  className="zd-pd-item w-full" 
                  onClick={() => {
                    setIsSupportOpen(true);
                    setIsProfileOpen(false);
                  }}
                >
                  <LifeBuoy size={14} /> Support
                </button>
                <Link href="/settings" className="zd-pd-item" onClick={() => setIsProfileOpen(false)}>
                  <Settings size={14} /> Settings
                </Link>
                {isAdmin && (
                  <Link href="/admin/notifications" className="zd-pd-item text-[#7c3aed]" onClick={() => setIsProfileOpen(false)}>
                    <Bell size={14} /> Broadcast Center
                  </Link>
                )}
                <button className="zd-pd-item zd-pd-logout" onClick={handleSignOut}>
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notification Permission Reminder */}
      {permission !== 'granted' && !loading && (
        <div className="bg-[#7c3aed]/10 border-b border-[#7c3aed]/20 px-4 py-2 flex items-center justify-between animate-pulse-subtle">
          <div className="flex items-center gap-2 text-[#7c3aed] text-[10px] font-bold uppercase tracking-wider">
            <AlertTriangle size={12} />
            Push Notifications Disabled
          </div>
          <button 
            onClick={requestPermission}
            className="text-[10px] font-black uppercase tracking-widest bg-[#7c3aed] text-white px-3 py-1 rounded-lg hover:brightness-110 transition-all shadow-lg shadow-purple-500/20"
          >
            Enable Now
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content flex-1 overflow-x-hidden">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="sidebar" id="bottom-nav">
        <ul className="nav-links">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link 
                href={link.href} 
                className={`nav-link ${pathname === link.href ? 'active' : ''}`}
              >
                <div className="nav-svg">
                  {link.icon}
                  {link.badge && <span className="nav-badge">{link.badge}</span>}
                </div>
                <span>{link.name}</span>
              </Link>
            </li>
          ))}
          {profile?.role === 'mod' && (
            <li>
              <Link 
                href="/moderation" 
                className={`nav-link ${pathname === '/moderation' ? 'active' : ''}`}
              >
                <div className="nav-svg"><ShieldCheck size={18} /></div>
                <span>Mod</span>
              </Link>
            </li>
          )}
          {profile?.role === 'admin' && (
            <li>
              <Link 
                href="/admin" 
                className={`nav-link nav-link-admin ${pathname === '/admin' ? 'active' : ''}`}
              >
                <div className="nav-svg"><ShieldAlert size={18} /></div>
                <span>Admin</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {isSupportOpen && <SupportModal onClose={() => setIsSupportOpen(false)} />}

      {/* Global CSS for Bottom Nav (using original patch style) */}
      <style jsx global>{`
        #bottom-nav.sidebar {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: 100vw !important;
          height: 62px !important;
          background: var(--glass) !important;
          backdrop-filter: blur(20px) !important;
          border-top: 1px solid var(--glass-border) !important;
          z-index: 1000 !important;
          display: flex !important;
          flex-direction: row !important;
          justify-content: center !important;
          align-items: stretch !important;
          padding: 0 !important;
          transform: none !important;
        }
        .nav-links {
          display: flex !important;
          flex-direction: row !important;
          width: 100% !important;
          max-width: 600px !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          list-style: none !important;
          justify-content: space-around !important;
        }
        .nav-links li {
          flex: 1 !important;
          display: flex !important;
        }
        .nav-link {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 4px !important;
          width: 100% !important;
          height: 100% !important;
          color: var(--text3) !important;
          text-decoration: none !important;
          font-family: 'DM Mono', monospace !important;
          font-size: 9px !important;
          font-weight: 500 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
          transition: all 0.2s !important;
          position: relative !important;
        }
        .nav-link::before {
          content: '';
          position: absolute;
          top: 0;
          left: 20%;
          right: 20%;
          height: 2px;
          background: var(--accent);
          opacity: 0;
          transition: opacity 0.2s;
          border-radius: 0 0 2px 2px;
          box-shadow: 0 0 10px var(--accent);
        }
        .nav-link.active {
          color: var(--accent) !important;
        }
        .nav-link.active::before {
          opacity: 1;
        }
        .nav-link svg {
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        }
        .nav-svg {
          position: relative !important;
        }
        .nav-badge {
          position: absolute !important;
          top: -8px !important;
          right: -12px !important;
          background: var(--accent) !important;
          color: #fff !important;
          font-family: 'Space Grotesk', sans-serif !important;
          font-size: 6px !important;
          font-weight: 900 !important;
          padding: 1px 4px !important;
          border-radius: 3px !important;
          line-height: 1.4 !important;
          letter-spacing: 0.05em !important;
        }
        .nav-link.active .nav-badge {
          box-shadow: 0 0 10px var(--accent) !important;
        }
        .nav-link.active svg {
          transform: translateY(-2px) scale(1.1) !important;
        }
        .main-content {
          padding-bottom: 80px !important;
        }
        .nav-link-admin {
          color: rgba(248, 113, 113, 0.5) !important;
        }
        .nav-link-admin.active {
          color: #f87171 !important;
        }
      `}</style>
    </div>
  );
}
