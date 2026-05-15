'use client';

import { useProfile } from '@/hooks/useProfile';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, ShieldCheck, ChevronLeft } from 'lucide-react';
import { ReportsTab } from '@/components/Admin/ReportsTab';
import Link from 'next/link';

export default function ModerationPage() {
  const { profile, loading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile?.role !== 'admin' && profile?.role !== 'mod') {
      router.push('/dashboard');
    }
  }, [profile, loading, router]);

  if (loading || (profile?.role !== 'admin' && profile?.role !== 'mod')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-purple opacity-50" />
      </div>
    );
  }

  return (
    <div className="an-content px-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8 group">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Return to Sector_Alpha</span>
        </Link>

        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-purple/10 border border-purple/20 flex items-center justify-center shadow-2xl shadow-purple/10">
              <ShieldCheck size={32} className="text-purple" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight uppercase italic italic-none font-bold">Moderation</h1>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.3em] mt-1">Reviewing user transmission reports</p>
            </div>
          </div>
          
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
               Authorized as {profile.role}
             </span>
          </div>
        </div>

        {/* Reports Section */}
        <div className="space-y-6">
           <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-8">
             <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Pending Incident Reports</h2>
             <div className="text-[10px] text-muted-foreground/60 font-mono">PROTOCOL_ACCESS_GRANTED</div>
           </div>
           
           <ReportsTab />
        </div>
      </div>

      <style jsx>{`
        @font-face {
          font-family: 'Bebas Neue';
          src: url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        }
      `}</style>
    </div>
  );
}
