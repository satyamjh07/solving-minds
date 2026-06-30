'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { 
  LEAGUE_DATA, 
  getLeagueByAtoms, 
  calculateAtomsProgress, 
  ATOMS_ICON_URL 
} from '@/lib/aura';
import { 
  X, 
  Flame, 
  Trophy, 
  Compass, 
  LineChart, 
  ArrowRight, 
  Award,
  Calendar,
  CheckCircle2,
  Lock,
  ChevronUp,
  BrainCircuit,
  BarChart3,
  CheckSquare,
  XSquare
} from 'lucide-react';

interface ProgressScreenProps {
  onClose: () => void;
}

export function ProgressScreen({ onClose }: ProgressScreenProps) {
  const { profile, refetch: refetchProfile } = useProfile();
  const { data: analytics } = useDashboardAnalytics(profile?.id);
  
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [leagueRank, setLeagueRank] = useState<number | null>(null);
  const [mockTestsCount, setMockTestsCount] = useState<number>(0);
  const [showBottomSheet, setShowBottomSheet] = useState<boolean>(false);
  const [animateProgress, setAnimateProgress] = useState<boolean>(false);

  // Parse atoms progress
  const atoms = Number(profile?.aura_score) || 0;
  const lifetimeAtoms = Math.max(Number(profile?.lifetime_atoms) || 0, atoms);
  const streak = Number(profile?.streak) || analytics?.streak.current || 0;
  
  const { currentLeague, nextLeague, atomsRemaining, progressPercent } = useMemo(() => {
    return calculateAtomsProgress(atoms);
  }, [atoms]);

  // Fetch rankings & mock test counts
  useEffect(() => {
    if (!profile?.id) return;

    const fetchRankings = async () => {
      // Global Rank
      const { count: globCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('aura_score', atoms);
      setGlobalRank((globCount || 0) + 1);

      // League Rank
      const currentLeagueTitle = getLeagueByAtoms(atoms).title;
      const { count: legCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('aura_level', currentLeagueTitle)
        .gt('aura_score', atoms);
      setLeagueRank((legCount || 0) + 1);

      // Mock tests completed
      const { count: mockCount } = await supabase
        .from('mock_test_live_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('completed', true);
      setMockTestsCount(mockCount || 0);
    };

    fetchRankings();
    
    // Animate progress bar with small delay for transition
    const timer = setTimeout(() => {
      setAnimateProgress(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [profile?.id, atoms]);

  useEffect(() => {
    // Disable body scroll when modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const accuracy = analytics?.accuracy.overall || 0;
  const incorrectPct = accuracy > 0 ? 100 - accuracy : 0;
  const totalSolved = analytics?.resourceAllocation.reduce((acc, curr) => acc + curr.totalQuestions, 0) || 0;

  return (
    <div className="fixed inset-0 z-[1000] bg-[#030712]/95 backdrop-blur-xl text-white overflow-y-auto custom-scrollbar flex flex-col items-center p-0 md:p-6 animate-in slide-in-from-bottom duration-300">
      
      <div className="w-full max-w-xl bg-[#080f26]/80 border-0 md:border border-white/[0.08] min-h-screen md:min-h-[85vh] md:rounded-[2.5rem] relative shadow-2xl flex flex-col p-6 md:p-8 overflow-x-hidden">
        
        {/* Glow rings in container background */}
        <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-[#00f0ff]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-[#b06aff]/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Close Button Header */}
        <div className="flex justify-between items-center mb-6 z-10">
          <span className="font-mono text-[9px] text-[#00f0ff] uppercase tracking-[0.25em] font-black">
            ATOMS PROGRESSION PROTOCOL
          </span>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-white/[0.03] border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 1. HERO CARD */}
        <div className="relative w-full rounded-[2rem] p-6 bg-gradient-to-br from-[#0c1b40]/90 to-[#060a1f] border border-white/[0.1] shadow-2xl overflow-hidden mb-6 z-10 group">
          {/* Top border glowing highlight */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
          
          {/* Lifetime Atoms Trigger */}
          <button 
            onClick={() => setShowBottomSheet(true)}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/10 text-[9px] font-mono font-bold text-gray-300 uppercase tracking-widest transition-all active:scale-95 z-20"
          >
            Lifetime Atoms <ChevronUp size={12} className="text-[#00f0ff]" />
          </button>

          <div className="flex flex-col items-center pt-4 pb-2">
            {/* emblem glow stage */}
            <div className="relative mb-6 flex items-center justify-center">
              <div className="absolute w-36 h-36 rounded-full bg-[#00f0ff]/20 blur-2xl animate-pulse" />
              <img 
                src={currentLeague.icon} 
                alt={currentLeague.title} 
                className="w-32 h-32 object-contain drop-shadow-[0_0_25px_rgba(0,240,255,0.5)] animate-bounce-slow"
              />
            </div>

            <span className="font-mono text-[9px] text-gray-400 uppercase tracking-[0.2em] font-bold">
              CURRENT LEAGUE
            </span>
            <h2 className="text-3xl font-black font-[family-name:var(--font-bebas)] tracking-wider text-white uppercase mt-0.5 mb-1">
              ⚛ {currentLeague.title}
            </h2>

            <div className="flex items-center gap-2 mb-6">
              <span className="text-xl font-bold text-[#00e5a0]">{atoms.toLocaleString()}</span>
              <span className="text-[10px] text-gray-500 uppercase font-mono tracking-widest">Season Atoms</span>
            </div>

            {/* Progress bar container */}
            {nextLeague ? (
              <div className="w-full">
                <div className="flex justify-between text-[10px] text-gray-400 font-mono mb-2">
                  <span>Progress to {nextLeague.title}</span>
                  <span className="text-[#00f0ff] font-bold">{Math.round(progressPercent)}%</span>
                </div>
                <div className="w-full h-2.5 bg-black/40 border border-white/[0.05] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#00f0ff] to-[#7c3aed] transition-all duration-1000 ease-out rounded-full relative"
                    style={{ width: animateProgress ? `${progressPercent}%` : '0%' }}
                  >
                    {/* Glowing head of progress bar */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
                  </div>
                </div>
                <div className="text-[10px] text-center text-gray-400 font-mono mt-3">
                  <strong>{atomsRemaining}</strong> Atoms to <span className="text-[#00f0ff]">{nextLeague.title}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#00e5a0] font-bold uppercase tracking-widest font-mono text-center pt-2">
                🏆 ULTIMATE LEAGUE ACHIEVED
              </div>
            )}
          </div>
        </div>

        {/* 2. STATS CARDS GRID */}
        <div className="grid grid-cols-3 gap-3 mb-8 z-10">
          {[
            { 
              label: 'Global Rank', 
              value: globalRank ? `#${globalRank}` : '—', 
              desc: 'Overall users', 
              icon: <Trophy size={16} className="text-yellow-400" />
            },
            { 
              label: 'League Rank', 
              value: leagueRank ? `#${leagueRank}` : '—', 
              desc: `${currentLeague.title} only`, 
              icon: <Compass size={16} className="text-[#00f0ff]" />
            },
            { 
              label: 'Day Streak', 
              value: `🔥 ${streak}`, 
              desc: 'Consecutive days', 
              icon: <Flame size={16} className="text-orange-500" />
            }
          ].map((card, idx) => (
            <div 
              key={idx}
              className="bg-[#0b132b]/80 border border-white/[0.06] hover:border-[#00f0ff]/30 rounded-2xl p-3.5 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-lg group"
            >
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-wider">{card.label}</span>
                {card.icon}
              </div>
              <div className="mt-3">
                <div className="text-lg font-black text-white group-hover:text-[#00f0ff] transition-colors">{card.value}</div>
                <span className="text-[8px] text-gray-500 leading-none">{card.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 3. TIMELINE OF ALL LEAGUES */}
        <div className="flex-1 z-10 flex flex-col">
          <h3 className="font-mono text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black mb-6 flex items-center gap-2">
            <LineChart size={14} className="text-[#00f0ff]" /> LEAGUE TIMELINE
          </h3>

          <div className="relative pl-8 space-y-5 flex-1">
            {/* Vertical connector line */}
            <div className="absolute left-[39px] top-6 bottom-6 w-[3px] bg-white/[0.04] rounded-full pointer-events-none" />
            
            {/* Animated active vertical line */}
            <div 
              className="absolute left-[39px] top-6 w-[3px] rounded-full bg-gradient-to-b from-[#00f0ff] to-[#7c3aed] transition-all duration-1000 ease-out origin-top pointer-events-none" 
              style={{ 
                height: `${Math.min(100, Math.max(0, ((currentLeague.level - 0.5) / 9.5) * 100))}%`
              }}
            />

            {LEAGUE_DATA.map((lvl) => {
              const isCompleted = atoms >= lvl.threshold && currentLeague.level > lvl.level;
              const isCurrent = currentLeague.level === lvl.level;
              const isLocked = atoms < lvl.threshold && currentLeague.level < lvl.level;

              return (
                <div 
                  key={lvl.level}
                  className={`relative flex items-center gap-5 transition-all duration-300 ${
                    isLocked ? 'opacity-35 filter grayscale-[60%]' : ''
                  } ${isCurrent ? 'scale-[1.02]' : ''}`}
                >
                  {/* League emblem - large and prominent */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className={`w-[56px] h-[56px] rounded-2xl flex items-center justify-center border-2 transition-all duration-500 p-1.5 ${
                      isCompleted 
                        ? 'bg-gradient-to-br from-[#00e5a0]/15 to-[#00a370]/5 border-[#00e5a0]/50 shadow-[0_0_18px_rgba(0,229,160,0.25)]'
                        : isCurrent
                          ? 'bg-gradient-to-br from-[#00f0ff]/15 to-[#7c3aed]/10 border-[#00f0ff]/70 shadow-[0_0_25px_rgba(0,240,255,0.4)]'
                          : 'bg-[#0a1128] border-white/[0.06]'
                    }`}>
                      <img 
                        src={lvl.icon} 
                        alt={lvl.title} 
                        className={`w-9 h-9 object-contain transition-all duration-500 ${
                          isCompleted 
                            ? 'drop-shadow-[0_0_8px_rgba(0,229,160,0.5)]'
                            : isCurrent
                              ? 'drop-shadow-[0_0_12px_rgba(0,240,255,0.6)] animate-bounce-slow'
                              : 'opacity-50'
                        }`}
                      />
                    </div>
                    
                    {/* Status indicator dot */}
                    {isCurrent && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#00f0ff] border-2 border-[#080f26] shadow-[0_0_10px_rgba(0,240,255,0.6)]">
                        <div className="w-full h-full rounded-full bg-[#00f0ff] animate-ping opacity-75" />
                      </div>
                    )}
                    {isCompleted && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#00e5a0] border-2 border-[#080f26] flex items-center justify-center">
                        <CheckCircle2 size={10} className="text-[#080f26]" />
                      </div>
                    )}
                  </div>

                  {/* League details card */}
                  <div className={`flex-1 flex justify-between items-center py-3 px-5 rounded-2xl border transition-all ${
                    isCurrent 
                      ? 'bg-[#00f0ff]/[0.04] border-[#00f0ff]/20 shadow-[0_0_15px_rgba(0,240,255,0.08)]'
                      : isCompleted
                        ? 'bg-white/[0.02] border-[#00e5a0]/10 hover:bg-white/[0.04]'
                        : 'bg-white/[0.015] border-white/[0.04] hover:bg-white/[0.03]'
                  }`}>
                    <div>
                      <div className={`text-sm font-bold font-mono tracking-wider ${
                        isCurrent ? 'text-[#00f0ff] text-base' : isCompleted ? 'text-white' : 'text-gray-400'
                      }`}>
                        {lvl.title}
                      </div>
                      <span className="text-[9px] text-gray-500 font-mono">{lvl.threshold.toLocaleString()} Atoms Required</span>
                    </div>
                    <div>
                      <span className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                        isCompleted 
                          ? 'text-[#00e5a0] bg-[#00e5a0]/5 border-[#00e5a0]/15'
                          : isCurrent
                            ? 'text-[#00f0ff] bg-[#00f0ff]/5 border-[#00f0ff]/25 animate-pulse'
                            : 'text-gray-600 bg-[#0f172a] border-white/5'
                      }`}>
                        {isCompleted ? 'COMPLETED' : isCurrent ? 'CURRENT' : 'LOCKED'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. LIFETIME STATS BOTTOM SHEET */}
        {showBottomSheet && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-[200] flex flex-col justify-end transition-opacity duration-300">
            <div className="absolute inset-0" onClick={() => setShowBottomSheet(false)} />
            
            <div className="bg-[#0b1229] border-t border-white/[0.08] rounded-t-[2.5rem] p-6 max-h-[75vh] overflow-y-auto z-10 relative animate-in slide-in-from-bottom duration-300">
              
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="font-mono text-[9px] text-[#00f0ff] uppercase tracking-wider">
                    AUDIT LEDGER
                  </span>
                  <h4 className="text-xl font-bold text-white uppercase tracking-wide">
                    Lifetime Statistics
                  </h4>
                </div>
                <button 
                  onClick={() => setShowBottomSheet(false)}
                  className="p-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { label: 'Lifetime Atoms', value: lifetimeAtoms.toLocaleString(), icon: <Trophy size={16} className="text-[#00e5a0]" /> },
                  { label: 'Season Atoms', value: atoms.toLocaleString(), icon: <Calendar size={16} className="text-purple" /> },
                  { label: 'Questions Solved', value: totalSolved.toLocaleString(), icon: <CheckSquare size={16} className="text-[#00f0ff]" /> },
                  { label: 'Mock Tests Completed', value: mockTestsCount.toLocaleString(), icon: <BrainCircuit size={16} className="text-yellow-500" /> },
                  { label: 'Correct Ratio %', value: `${accuracy}%`, icon: <CheckCircle2 size={16} className="text-[#00e5a0]" /> },
                  { label: 'Incorrect Ratio %', value: `${incorrectPct}%`, icon: <XSquare size={16} className="text-[#ff4d6a]" /> }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      {stat.icon}
                    </div>
                    <div>
                      <div className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">{stat.label}</div>
                      <div className="text-base font-black text-white">{stat.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowBottomSheet(false)}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 rounded-2xl transition-all text-xs uppercase tracking-widest font-mono active:scale-95"
              >
                Close Ledger
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
