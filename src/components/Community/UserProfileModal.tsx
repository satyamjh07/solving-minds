'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { X, Flame, CheckCircle2, Target, Loader2, Award, GraduationCap } from 'lucide-react';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
}

export function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      try {
        // 1. Fetch Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        // 2. Fetch Weekly Stats (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: attempts } = await supabase
          .from('user_attempts')
          .select('is_correct, created_at')
          .eq('user_id', userId)
          .gte('created_at', sevenDaysAgo.toISOString());

        const totalQuestions = attempts?.length || 0;
        const correctOnes = attempts?.filter(a => a.is_correct).length || 0;
        const accuracy = totalQuestions > 0 ? Math.round((correctOnes / totalQuestions) * 100) : 0;

        // Normalize legacy levels (e.g., Delusional -> Level 1)
        let displayLevel = profile.aura_level || 'Level 1';
        if (displayLevel.includes('Delusional')) displayLevel = 'Level 1';

        setData({
          ...profile,
          aura_level: displayLevel,
          weeklyQuestions: totalQuestions,
          avgAccuracy: accuracy,
          streak: profile.streak || 0 
        });
      } catch (err) {
        console.error('Error fetching user modal data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [userId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-bg-2 border border-white/10 rounded-3xl p-8 max-w-sm w-full flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple" />
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Accessing Profile Data...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-bg-2 border border-white/10 rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header / Cover */}
        <div className="h-24 bg-gradient-to-br from-purple/20 to-blue-500/10 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Profile Info */}
        <div className="px-6 pb-8 -mt-12 relative flex flex-col items-center">
          <div className="w-24 h-24 rounded-2xl border-4 border-bg-2 overflow-hidden bg-bg-3 shadow-xl mb-4">
            {data.avatar_url ? (
              <img src={data.avatar_url} alt={data.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Award size={40} />
              </div>
            )}
          </div>

          <h3 className="text-xl font-black text-foreground mb-1">{data.name || 'Anonymous User'}</h3>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[9px] font-bold uppercase tracking-widest text-purple px-2 py-0.5 bg-purple/10 rounded border border-purple/20">
              {data.aura_level || 'Level 1'}
            </span>
            {data.class && (
               <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                 <GraduationCap size={12} /> {data.class}
               </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground text-center line-clamp-3 mb-8 px-4">
            {data.bio || "This user is on a mission to master the Aura Protocol. No bio provided yet."}
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 w-full">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col items-center gap-1">
              <Flame size={18} className="text-orange-500" />
              <span className="text-lg font-black text-foreground leading-none">{data.streak}</span>
              <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">STREAK</span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col items-center gap-1">
              <CheckCircle2 size={18} className="text-green-500" />
              <span className="text-lg font-black text-foreground leading-none">{data.weeklyQuestions}</span>
              <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">SOLVED</span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col items-center gap-1">
              <Target size={18} className="text-blue-500" />
              <span className="text-lg font-black text-foreground leading-none">{data.avgAccuracy}%</span>
              <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">ACCURACY</span>
            </div>
          </div>

          {/* Footer Action */}
          <div className="mt-8 w-full">
             <div className="text-[9px] text-center text-muted-foreground/40 font-mono uppercase tracking-[0.2em]">
               Member since {data.created_at ? new Date(data.created_at).getFullYear() : '2026'}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
