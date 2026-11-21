'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { ATOMS_ICON_URL } from '@/lib/aura';
import { 
  X, 
  Flame, 
  Trophy, 
  Lock, 
  CheckCircle2, 
  Award, 
  ChevronRight,
  Loader2,
  Compass
} from 'lucide-react';

interface ProgressScreenProps {
  onClose: () => void;
}

// Map the DB level names to user-friendly titles, thresholds, descriptions, and styling
const LEAGUE_MAPPING: Record<string, { title: string; min: number; max: number; desc: string; color: string; bg: string; border: string; icon: string }> = {
  'Carbon': { 
    title: 'Carbon', 
    min: 0, 
    max: 299, 
    desc: 'Every Topper Starts Here', 
    color: 'text-blue-400', 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/20',
    icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815269/solvingminds_level_1_nke3tg.png'
  },
  'Silicon': { 
    title: 'Silicon', 
    min: 300, 
    max: 799, 
    desc: 'Top 50%ile Achievers', 
    color: 'text-amber-500', 
    bg: 'bg-amber-700/10', 
    border: 'border-amber-700/20',
    icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815271/solvingminds_level_2_hqawat.png'
  },
  'Aluminium': { 
    title: 'Aluminium', 
    min: 800, 
    max: 1599, 
    desc: 'Top 25%ile Achievers', 
    color: 'text-slate-300', 
    bg: 'bg-slate-400/10', 
    border: 'border-slate-400/20',
    icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815262/solvingminds_level_3_rlawo7.png'
  },
  'Titanium': { 
    title: 'Titanium', 
    min: 1600, 
    max: 2999, 
    desc: 'Top 10%ile Elite Solvers', 
    color: 'text-yellow-400', 
    bg: 'bg-yellow-500/10', 
    border: 'border-yellow-500/20',
    icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815276/solvingminds_level_4_ocdhjf.png'
  },
  'Chromium': { 
    title: 'Chromium', 
    min: 3000, 
    max: 4999, 
    desc: 'Top 5%ile Masters', 
    color: 'text-cyan-300', 
    bg: 'bg-cyan-500/10', 
    border: 'border-cyan-500/20',
    icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815270/solvingminds_level_5_bl8qtr.png'
  },
  'Nickel': { 
    title: 'Nickel', 
    min: 5000, 
    max: 7999, 
    desc: 'Top 1%ile Legendary Solvers', 
    color: 'text-purple-400', 
    bg: 'bg-purple-500/10', 
    border: 'border-purple-500/20',
    icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815285/solvingminds_level_6_xb11bw.png'
  },
  'Cobalt': { 
    title: 'Cobalt', 
    min: 8000, 
    max: 11999, 
    desc: 'Godlike Speed & Accuracy', 
    color: 'text-rose-400', 
    bg: 'bg-rose-500/10', 
    border: 'border-rose-500/20',
    icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815270/solvingminds_level_7_ddgflj.png'
  },
  'Tungsten': { 
    title: 'Tungsten', 
    min: 12000, 
    max: 17999, 
    desc: 'Ultimate Problem Solver', 
    color: 'text-orange-400', 
    bg: 'bg-orange-500/10', 
    border: 'border-orange-500/20',
    icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815289/solvingminds_level_8_d3cwvu.png'
  },
  'Platinum': { 
    title: 'Platinum', 
    min: 18000, 
    max: 25999, 
    desc: 'Unstoppable Solving Machine', 
    color: 'text-teal-300', 
    bg: 'bg-teal-500/10', 
    border: 'border-teal-500/20',
    icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815284/solvingminds_level_9_ice52s.png'
  },
  'Iridium': { 
    title: 'Iridium', 
    min: 26000, 
    max: 999999, 
    desc: 'Apex Deity of Solving Minds', 
    color: 'text-violet-400', 
    bg: 'bg-violet-500/10', 
    border: 'border-violet-500/20',
    icon: 'https://res.cloudinary.com/dsflyu8vg/image/upload/v1782815285/solvingminds_level_10_ehn6fx.png'
  }
};

// Checkpoints for weekly progress: 0, 300, 700, 1200, 2000, 3000
const WEEKLY_CHECKPOINTS = [
  { threshold: 0, key: 'Carbon' },
  { threshold: 300, key: 'Silicon' },
  { threshold: 700, key: 'Aluminium' },
  { threshold: 1200, key: 'Titanium' },
  { threshold: 2000, key: 'Chromium' },
  { threshold: 3000, key: 'Nickel' }
];

export function ProgressScreen({ onClose }: ProgressScreenProps) {
  const { profile } = useProfile();
  
  // Views: 'main' (Modal Info), 'leaderboard' (Leaderboard in Modal), 'achievements' (Side panel drawer)
  const [view, setView] = useState<'main' | 'leaderboard' | 'achievements'>('main');
  const [leaderboardTab, setLeaderboardTab] = useState<'league' | 'global'>('league');
  
  // Rank and Leaderboard states
  const [lbEntries, setLbEntries] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isUserInTop5, setIsUserInTop5] = useState<boolean>(true);
  const [lbLoading, setLbLoading] = useState<boolean>(false);
  
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [leagueRank, setLeagueRank] = useState<number | null>(null);

  const atoms = Number(profile?.aura_score) || 0;
  const currentDbLevel = profile?.aura_level || 'Carbon';

  // Get display details for user's current league
  const currentLeagueInfo = useMemo(() => {
    return LEAGUE_MAPPING[currentDbLevel] || LEAGUE_MAPPING['Carbon'];
  }, [currentDbLevel]);

  // Determine next league and target threshold
  const { nextLeagueName, nextThreshold, pointsNeeded } = useMemo(() => {
    const keys = Object.keys(LEAGUE_MAPPING);
    const currentIndex = keys.indexOf(currentDbLevel);
    if (currentIndex !== -1 && currentIndex < keys.length - 1) {
      const nextKey = keys[currentIndex + 1];
      const nextL = LEAGUE_MAPPING[nextKey];
      return {
        nextLeagueName: nextL.title,
        nextThreshold: nextL.min,
        pointsNeeded: Math.max(0, nextL.min - atoms)
      };
    }
    return { nextLeagueName: '', nextThreshold: 0, pointsNeeded: 0 };
  }, [currentDbLevel, atoms]);

  // Calculate segment-based progress percentage for the checkpoints: 0, 300, 700, 1200, 2000, 3000
  const progressPercent = useMemo(() => {
    if (atoms >= 3000) return 100;
    
    // Find which segment the atoms fall into
    for (let i = 0; i < WEEKLY_CHECKPOINTS.length - 1; i++) {
      const min = WEEKLY_CHECKPOINTS[i].threshold;
      const max = WEEKLY_CHECKPOINTS[i + 1].threshold;
      if (atoms >= min && atoms < max) {
        const segmentProgress = (atoms - min) / (max - min);
        // Each of the 5 segments is 20% of the bar
        return (i * 20) + (segmentProgress * 20);
      }
    }
    return 0;
  }, [atoms]);

  // Fetch ranks
  useEffect(() => {
    if (!profile?.id) return;
    
    const fetchRanks = async () => {
      try {
        // Global Rank
        const { count: globCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('aura_score', atoms);
        setGlobalRank((globCount || 0) + 1);

        // League Rank
        const { count: legCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('aura_level', currentDbLevel)
          .gt('aura_score', atoms);
        setLeagueRank((legCount || 0) + 1);
      } catch (err) {
        console.error('Error fetching ranks:', err);
      }
    };

    fetchRanks();
  }, [profile?.id, atoms, currentDbLevel]);

  // Load leaderboard entries
  useEffect(() => {
    if (view !== 'leaderboard') return;

    const fetchLeaderboard = async () => {
      setLbLoading(true);
      try {
        const isGlobal = leaderboardTab === 'global';

        // 1. Fetch top 5
        let query = supabase
          .from('profiles')
          .select('id, name, avatar_url, class, target_year, role, aura_score, aura_level')
          .order('aura_score', { ascending: false });

        if (!isGlobal) {
          query = query.eq('aura_level', currentDbLevel);
        }

        const { data: top5Data } = await query.limit(5);

        // 2. Fetch user's rank
        let rankQuery = supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('aura_score', atoms);

        if (!isGlobal) {
          rankQuery = rankQuery.eq('aura_level', currentDbLevel);
        }

        const { count } = await rankQuery;
        const currentRank = (count || 0) + 1;

        setLbEntries(top5Data || []);
        setUserRank(currentRank);
        
        const inTop5 = top5Data?.some(entry => entry.id === profile?.id);
        setIsUserInTop5(!!inTop5);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLbLoading(false);
      }
    };

    fetchLeaderboard();
  }, [view, leaderboardTab, currentDbLevel, atoms, profile?.id]);

  // Disable body scroll when open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Shared progress bar component to ensure pixel-perfect consistency
  const renderProgressBar = () => (
    <div className="w-full bg-[#1e293b]/50 border border-white/5 p-4 rounded-xl mb-4">
      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-2">
        <span className="uppercase tracking-widest font-semibold">League Progress (This Week)</span>
        <div className="flex items-center gap-1 bg-[#1e293b] px-2 py-0.5 rounded-full border border-white/10">
          <img src={ATOMS_ICON_URL} alt="Coin" className="w-3.5 h-3.5 object-contain" />
          <span className="font-bold text-amber-400">{atoms}</span>
        </div>
      </div>
      
      {/* Horizontally aligned checkpoint track */}
      <div className="relative mt-6 mb-4 px-2">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* Checkpoint Indicators with Actual League Logos */}
        <div className="flex justify-between relative z-10">
          {WEEKLY_CHECKPOINTS.map((cp, idx) => {
            const isActive = atoms >= cp.threshold;
            const league = LEAGUE_MAPPING[cp.key];
            return (
              <div key={cp.threshold} className="flex flex-col items-center">
                <div 
                  className={`w-7.5 h-7.5 rounded-full flex items-center justify-center border transition-all duration-300 ${
                    isActive 
                      ? 'bg-cyan-400/20 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)]' 
                      : 'bg-[#0f172a] border-slate-700'
                  }`}
                  style={{ width: '30px', height: '30px' }}
                >
                  <img 
                    src={league.icon} 
                    alt={league.title} 
                    className={`w-5 h-5 object-contain ${isActive ? '' : 'filter grayscale opacity-45'}`}
                  />
                </div>
                <span className={`text-[8px] font-mono mt-1.5 font-bold ${isActive ? 'text-cyan-400 font-extrabold' : 'text-slate-500'}`}>
                  {cp.threshold}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Modal View (Main and Leaderboard) */}
      {view !== 'achievements' && (
        <div className="fixed inset-0 z-[1999] flex items-center justify-center bg-black/75 transition-opacity">
          {/* Static Background overlay click to close */}
          <div className="absolute inset-0" onClick={onClose} />
          
          <div className="relative z-10 w-full max-w-md bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col p-6 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header showing League Logo and Name */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-slate-800/40 border border-white/5 rounded-2xl p-1 flex items-center justify-center">
                <img 
                  src={currentLeagueInfo.icon} 
                  alt={currentLeagueInfo.title} 
                  className="w-12 h-12 object-contain" 
                />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black tracking-wide">
                  You are in {currentLeagueInfo.title} League
                </h3>
                <p className="text-[10px] text-slate-400 tracking-wider">Based on last week points</p>
              </div>
              <button 
                onClick={onClose} 
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Main League Progress View */}
            {view === 'main' && (
              <>
                {/* Global Rank and League Rank info */}
                <div className="grid grid-cols-2 gap-2.5 mb-4">
                  <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3 flex items-center gap-2.5">
                    <Trophy size={16} className="text-yellow-400" />
                    <div>
                      <div className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">Global Rank</div>
                      <div className="text-sm font-black text-white">
                        {globalRank !== null ? `#${globalRank}` : <Loader2 size={10} className="animate-spin" />}
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3 flex items-center gap-2.5">
                    <Compass size={16} className="text-cyan-400" />
                    <div>
                      <div className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">League Rank</div>
                      <div className="text-sm font-black text-white">
                        {leagueRank !== null ? `#${leagueRank}` : <Loader2 size={10} className="animate-spin" />}
                      </div>
                    </div>
                  </div>
                </div>

                {renderProgressBar()}

                {/* Recommendation Box */}
                {nextLeagueName && (
                  <div className="bg-[#1e293b]/40 border-l-4 border-amber-500 p-3.5 rounded-r-xl mb-5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 block mb-1">
                      RECOMMENDATION
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                      Achieve <span className="text-amber-400 font-bold">{pointsNeeded}</span> more points to reach <span className="text-cyan-400 font-bold">{nextLeagueName}</span>. You Can Do it
                    </p>
                  </div>
                )}

                {/* Modal Buttons */}
                <div className="space-y-2">
                  <button 
                    onClick={() => setView('achievements')}
                    className="w-full bg-white text-slate-900 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-slate-100 transition-all cursor-pointer font-sans"
                  >
                    View My League Achievements <ChevronRight size={14} />
                  </button>
                  
                  <button 
                    onClick={() => setView('leaderboard')}
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-white/5 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer font-sans"
                  >
                    View Leaderboard
                  </button>
                </div>
              </>
            )}

            {/* Leaderboard View in Modal */}
            {view === 'leaderboard' && (
              <div className="flex flex-col flex-1 min-h-[380px]">
                
                {/* Tabs */}
                <div className="flex gap-1.5 bg-[#1e293b]/50 p-1 rounded-xl border border-white/5 mb-4">
                  <button
                    onClick={() => setLeaderboardTab('league')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      leaderboardTab === 'league' 
                        ? 'bg-slate-800 text-cyan-400 border border-white/5' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    My League
                  </button>
                  <button
                    onClick={() => setLeaderboardTab('global')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      leaderboardTab === 'global' 
                        ? 'bg-slate-800 text-cyan-400 border border-white/5' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Global
                  </button>
                </div>

                {/* Leaderboard List */}
                <div className="flex-1 space-y-2 overflow-y-auto max-h-[260px] pr-1 custom-scrollbar">
                  {lbLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="animate-spin text-cyan-400 h-8 w-8 mb-2" />
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Querying Rankings...</span>
                    </div>
                  ) : lbEntries.length > 0 ? (
                    lbEntries.map((entry, idx) => {
                      const isSelf = entry.id === profile?.id;
                      const entryLeague = LEAGUE_MAPPING[entry.aura_level || 'Carbon'] || LEAGUE_MAPPING['Carbon'];
                      return (
                        <div 
                          key={entry.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            isSelf 
                              ? 'bg-cyan-500/10 border-cyan-500/30' 
                              : 'bg-slate-800/40 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-bold text-slate-400 w-4">{idx + 1}</span>
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                              {entry.avatar_url ? (
                                <img src={entry.avatar_url} alt="av" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold">{entry.name?.slice(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-bold flex items-center gap-1.5">
                                {entry.name || 'Anonymous'}
                                {isSelf && <span className="text-[8px] bg-cyan-400/20 text-cyan-400 px-1 py-0.5 rounded font-black font-mono">YOU</span>}
                              </div>
                              <span className="text-[9px] text-slate-400 uppercase font-mono flex items-center gap-1">
                                <img src={entryLeague.icon} alt="icon" className="w-3 h-3 object-contain" />
                                {entryLeague.title}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <img src={ATOMS_ICON_URL} alt="coin" className="w-3.5 h-3.5 object-contain" />
                            <span className="text-xs font-mono font-bold">{entry.aura_score}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-xs uppercase tracking-widest">
                      No active ranking data
                    </div>
                  )}
                </div>

                {/* Current User rank at bottom fallback (if not in top 5) */}
                {!lbLoading && !isUserInTop5 && userRank && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between p-2.5 rounded-xl border bg-cyan-500/10 border-cyan-500/30">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-black text-cyan-400 w-4">#{userRank}</span>
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="av" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold">{profile?.name?.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            {profile?.name}
                            <span className="text-[8px] bg-cyan-400/20 text-cyan-400 px-1 py-0.5 rounded font-black font-mono">YOU</span>
                          </div>
                          <span className="text-[9px] text-slate-400 uppercase font-mono flex items-center gap-1">
                            <img src={currentLeagueInfo.icon} alt="icon" className="w-3 h-3 object-contain" />
                            {currentLeagueInfo.title}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <img src={ATOMS_ICON_URL} alt="coin" className="w-3.5 h-3.5 object-contain" />
                        <span className="text-xs font-mono font-bold text-cyan-400">{atoms}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Back to main view button */}
                <button 
                  onClick={() => setView('main')}
                  className="w-full mt-4 bg-slate-800 hover:bg-slate-700 border border-white/5 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer font-sans"
                >
                  Back to progression
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* 2. Side Panel Achievement Drawer showing all 10 leagues with emblems */}
      {view === 'achievements' && (
        <div className="fixed inset-0 z-[1999] flex justify-end bg-black/60 transition-opacity">
          {/* Drawer Backdrop overlay click to close */}
          <div className="absolute inset-0" onClick={onClose} />
          
          <div className="relative z-10 w-full max-w-md bg-[#0f172a] border-l border-white/10 h-screen shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-250 text-white overflow-y-auto custom-scrollbar">
            
            {/* Drawer Header */}
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => setView('main')} 
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
              <h2 className="text-xl font-black uppercase tracking-wide">Leagues</h2>
            </div>

            {/* Current League Progress Panel */}
            {renderProgressBar()}

            <div className="bg-[#1e293b]/40 border border-white/5 p-3 rounded-xl mb-6 flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium">Current league</span>
              <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20">
                <img src={currentLeagueInfo.icon} alt="icon" className="w-4 h-4 object-contain" />
                <span className="text-xs font-black uppercase tracking-widest text-cyan-400">
                  {currentLeagueInfo.title}
                </span>
              </div>
            </div>

            {/* League Collection Grid */}
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 font-mono">League Collection</h3>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.keys(LEAGUE_MAPPING).map((key, idx) => {
                const item = LEAGUE_MAPPING[key];
                
                // Mapped states
                const keys = Object.keys(LEAGUE_MAPPING);
                const currentIdx = keys.indexOf(currentDbLevel);
                const itemIdx = keys.indexOf(key);
                
                const isCompleted = itemIdx < currentIdx;
                const isCurrent = itemIdx === currentIdx;
                const isLocked = itemIdx > currentIdx;

                // Mock dynamic counts for previous achievements to look alive
                let achievementText = 'Locked';
                if (isCompleted) {
                  const mockCount = Math.max(1, Math.round((30000 - item.min) / (item.min + 1) * 3));
                  achievementText = `Achieved ${mockCount} times`;
                } else if (isCurrent) {
                  achievementText = 'Current league';
                }

                return (
                  <div 
                    key={key}
                    className={`p-4 rounded-xl border flex flex-col justify-between min-h-[160px] transition-all ${
                      isCurrent
                        ? `${item.bg} ${item.border} ring-1 ring-cyan-500/20`
                        : isCompleted
                          ? `${item.bg} ${item.border} opacity-90`
                          : 'bg-slate-900/60 border-white/5 opacity-40'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-black uppercase tracking-wider ${item.color}`}>
                          {item.title}
                        </span>
                        {isLocked && <Lock size={12} className="text-slate-600" />}
                        {isCompleted && <CheckCircle2 size={12} className="text-cyan-400" />}
                        {isCurrent && <Award size={12} className="text-cyan-400 animate-pulse" />}
                      </div>

                      {/* Actual League emblem logo */}
                      <div className="flex items-center justify-center my-3">
                        <img 
                          src={item.icon} 
                          alt={item.title} 
                          className={`w-12 h-12 object-contain ${isLocked ? 'filter grayscale opacity-35' : ''}`}
                        />
                      </div>
                      
                      <p className="text-[10px] text-slate-400 leading-tight mb-2">{item.desc}</p>
                    </div>
                    
                    <div>
                      <div className="text-[8px] font-mono text-slate-500 mb-1">
                        {item.min}+ Atoms Required
                      </div>
                      <span className={`text-[9px] font-mono font-bold block ${isLocked ? 'text-slate-500' : 'text-slate-300'}`}>
                        {achievementText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-white/5 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all mt-auto"
            >
              Close
            </button>
            
          </div>
        </div>
      )}
    </>
  );
}
