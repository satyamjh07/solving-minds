'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  Zap,
  Menu,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Community', href: '/community', icon: Users },
    { name: 'Solving Tools', href: '/solving', icon: BookOpen },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a10] text-white font-[family-name:var(--font-grotesk)]">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#111118] border-r border-white/[0.05] flex flex-col transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#00f0ff]" />
            </div>
            <span className="font-[family-name:var(--font-bebas)] text-2xl tracking-widest text-white">Solving Minds</span>
          </Link>
          <button className="lg:hidden text-white/40" onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20' 
                    : 'text-white/40 hover:bg-white/[0.03] hover:text-white border border-transparent'}
                `}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-[#00f0ff]' : 'text-white/40 group-hover:text-white'}`} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-white/[0.05]">
          {user && (
            <div className="flex items-center gap-3 px-4 py-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#b06aff] p-[1px]">
                <div className="w-full h-full rounded-full bg-[#111118] flex items-center justify-center text-xs font-bold font-mono">
                  {user.email?.[0].toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-white/40 truncate font-mono uppercase tracking-tighter">Pro Aspirant</p>
              </div>
            </div>
          )}
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[#ff4d6a]/60 hover:bg-[#ff4d6a]/10 hover:text-[#ff4d6a] transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Topbar */}
        <header className="h-20 border-b border-white/[0.05] bg-[#0a0a10]/60 backdrop-blur-xl flex items-center justify-between px-8 z-30">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-white" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-[family-name:var(--font-bebas)] tracking-wider">
              {navItems.find(i => i.href === pathname)?.name || 'Overview'}
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.05] text-white/40 focus-within:border-[#00f0ff]/40 focus-within:text-white transition-all">
              <Search className="w-4 h-4" />
              <input type="text" placeholder="Quick search..." className="bg-transparent border-none outline-none text-xs w-48" />
            </div>
            
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-white/40 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#ff4d6a] rounded-full border-2 border-[#0a0a10]"></span>
              </button>
              
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00e5a0]/10 border border-[#00e5a0]/20">
                <div className="w-2 h-2 rounded-full bg-[#00e5a0] shadow-[0_0_8px_#00e5a0] animate-pulse"></div>
                <span className="font-mono text-[10px] text-[#00e5a0] uppercase tracking-widest font-bold">Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8 relative z-20 custom-scrollbar">
          {children}
        </div>
        
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00f0ff]/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#b06aff]/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
      </main>
    </div>
  );
}
