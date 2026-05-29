'use client';

import React, { useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { LEVEL_DATA, calculateAura } from '@/lib/aura';
import { Zap, Trophy, Award, Star, Flame, Target, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function LevelUpPage() {
  const { profile } = useProfile();
  const { data: analytics, loading } = useDashboardAnalytics(profile?.id);
  const [rank, setRank] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (profile?.aura_score) {
      const fetchRank = async () => {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('aura_score', profile.aura_score);
        setRank((count || 0) + 1);
      };
      fetchRank();
    }
  }, [profile?.aura_score]);

  const aura = useMemo(() => {
    if (!analytics) return { score: 0, level: 1, nextThreshold: 1000, progress: 0 };
    return calculateAura({
      totalQuestions: analytics.resourceAllocation.reduce((acc, curr) => acc + curr.totalQuestions, 0),
      streak: analytics.streak.current,
      accuracy: analytics.accuracy.overall
    });
  }, [analytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-cyan-500 font-mono animate-pulse uppercase tracking-widest text-xs">
          Calculating Level_Progression...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-foreground pb-32">
      {/* Header Stats */}
      <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-4xl font-[family-name:var(--font-bebas)] tracking-widest text-white leading-none">
            SOLVINGMINDS
          </h1>
          <div className="text-[10px] font-bold text-cyan-400 mt-1 tracking-[0.2em] uppercase">
            RANK #{rank || '...'}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 shadow-xl">
             <Flame size={20} className="text-orange-500" />
             <div className="font-[family-name:var(--font-bebas)] text-2xl text-white">
                {analytics?.streak.current || 0}
             </div>
          </div>
          <div className="flex items-center gap-3 bg-purple/10 border border-purple/20 rounded-2xl px-5 py-3 shadow-xl">
             <Zap size={20} className="text-purple" />
             <div className="font-[family-name:var(--font-bebas)] text-2xl text-white">
                {aura.score.toLocaleString()}
             </div>
          </div>
        </div>
      </div>

      {/* The Path */}
      <div className="relative max-w-2xl mx-auto py-20 overflow-hidden">
        {/* SVG Path */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none" 
          viewBox="0 0 400 1200" 
          fill="none" 
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id="progress-clip">
              <path 
                d="M200 0 C250 150, 150 300, 200 450 S250 750, 200 900 S150 1150, 200 1200" 
                stroke="white" 
                strokeWidth="20" 
                fill="none"
                pathLength="100"
                strokeDasharray={`${((aura.level - 1 + (aura.progress || 0) / 100) / 9) * 100} ${100 - ((aura.level - 1 + (aura.progress || 0) / 100) / 9) * 100}`}
                strokeDashoffset="0"
                strokeLinecap="round"
              />
            </clipPath>
          </defs>
          {/* Faint Background Dotted Line */}
          <path 
            d="M200 0 C250 150, 150 300, 200 450 S250 750, 200 900 S150 1150, 200 1200" 
            stroke="var(--accent)" 
            strokeWidth="4" 
            strokeDasharray="8 12" 
            className="opacity-10"
          />
          {/* Active Glowing Filled Dotted Line */}
          <path 
            d="M200 0 C250 150, 150 300, 200 450 S250 750, 200 900 S150 1150, 200 1200" 
            stroke="var(--accent)" 
            strokeWidth="4" 
            strokeDasharray="8 12" 
            strokeLinecap="round"
            clipPath="url(#progress-clip)"
            style={{
              filter: 'drop-shadow(0 0 6px var(--accent))',
            }}
          />
        </svg>

        <div className="relative space-y-40">
          {LEVEL_DATA.map((lvl, index) => {
            const isCompleted = aura.level > lvl.level;
            const isCurrent = aura.level === lvl.level;
            const isLocked = aura.level < lvl.level;
            
            // Calculate X offset for the curve
            const t = (index / (LEVEL_DATA.length - 1));
            const xOffset = Math.sin(t * Math.PI * 3) * 80;

            return (
              <div 
                key={lvl.level} 
                className="flex flex-col items-center relative transition-all duration-500"
                style={{ transform: `translateX(${xOffset}px)` }}
              >
                {/* Level Node */}
                <div className="relative group">
                   <div className={`
                      w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500
                      ${isCompleted ? 'bg-green text-black shadow-[0_0_30px_rgba(0,229,160,0.3)]' : 
                        isCurrent ? 'bg-cyan-500 text-black shadow-[0_0_40px_rgba(0,240,255,0.4)] scale-110' : 
                        'bg-white/5 text-gray-600 border border-white/10'}
                   `}>
                      {isCompleted ? <Award size={32} strokeWidth={2.5} /> : 
                       isCurrent ? <Star size={32} strokeWidth={2.5} className="animate-pulse" /> : 
                       <Zap size={24} />}
                      
                      {/* Level Num Badge */}
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-white text-black font-black text-[10px] rounded-full flex items-center justify-center shadow-lg">
                        {lvl.level}
                      </div>
                   </div>

                   {/* Label */}
                   <div className="absolute top-full mt-4 text-center w-40 -left-10">
                      <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isLocked ? 'text-gray-600' : 'text-white'}`}>
                        {lvl.title}
                      </div>
                      <div className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest opacity-60">
                        {lvl.reward}
                      </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Progress Action */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-50">
         <div className="bg-[#0f0f1a]/80 backdrop-blur-xl border border-white/10 p-5 rounded-[2rem] shadow-2xl flex items-center gap-5">
            <div className="w-14 h-14 bg-purple/20 rounded-2xl flex items-center justify-center text-purple flex-shrink-0">
               <Award size={24} />
            </div>
            
            <div className="flex-1">
               <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Next Reward</div>
               <div className="text-sm font-black text-white uppercase tracking-wider">
                  {LEVEL_DATA[aura.level]?.title || 'The Architect'}
               </div>
               <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple to-cyan-400 transition-all duration-1000"
                    style={{ width: `${aura.progress}%` }}
                  />
               </div>
            </div>

            <Link 
              href="/solving"
              className="bg-purple text-white h-12 px-6 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-[0.15em] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-purple/20"
            >
               Solve Now
            </Link>
         </div>
      </div>

      <style jsx>{`
        .animate-bounce-slow {
           animation: bounceSlow 2s ease-in-out infinite;
        }
        @keyframes bounceSlow {
           0%, 100% { transform: translateY(0); }
           50% { transform: translateY(10px); }
        }
      `}</style>
    </div>
  );
}
