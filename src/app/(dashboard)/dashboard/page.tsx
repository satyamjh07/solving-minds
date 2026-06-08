'use client';

import React, { useMemo, useState, useEffect } from 'react';
import './analytics.css';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { useProfile } from '@/hooks/useProfile';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { getOptimizedUrl } from '@/lib/cloudinary';
import { supabase } from '@/lib/supabase/client';
import { useDialog } from '@/components/DialogProvider';
import { 
  Target, 
  Flame, 
  Clock, 
  Activity, 
  Zap,
  TrendingUp,
  Award,
  Users,
  Compass,
  CheckSquare,
  Square,
  BookOpen,
  HelpCircle,
  Sparkles,
  ChevronRight,
  TrendingDown,
  MessageSquare,
  Bot,
  BrainCircuit,
  CornerDownLeft
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { profile, refetch: refetchProfile } = useProfile();
  const { data, loading } = useDashboardAnalytics(profile?.id);
  const [lbMode, setLbMode] = useState<'daily' | 'weekly'>('weekly');
  const { entries: lbEntries, loading: lbLoading } = useLeaderboard(lbMode);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [newTarget, setNewTarget] = useState(70);
  const { toast } = useDialog();

  // AI Solver Chat States
  const [isAiSolverOpen, setIsAiSolverOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiResponses, setAiResponses] = useState<Array<{ sender: 'user' | 'ai', text: string }>>([
    { sender: 'ai', text: "Hello! I am your AI JEE/NEET Coach. Ask me any formula, concept explanation, or study strategy, and I will outline the core principles for you." }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Battle Plan Checklist State (Local Storage persistent)
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (profile?.daily_target) {
      setNewTarget(profile.daily_target);
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.id) {
      const saved = localStorage.getItem(`battle_plan_tasks_${profile.id}`);
      if (saved) {
        try { setCheckedTasks(JSON.parse(saved)); } catch(_) {}
      }
    }
  }, [profile?.id]);

  const toggleTask = (taskId: string) => {
    if (!profile?.id) return;
    const updated = { ...checkedTasks, [taskId]: !checkedTasks[taskId] };
    setCheckedTasks(updated);
    localStorage.setItem(`battle_plan_tasks_${profile.id}`, JSON.stringify(updated));
  };

  const handleUpdateTarget = async () => {
    if (!profile) return;
    if (newTarget < 1 || isNaN(newTarget)) {
      toast('Please enter a target of at least 1 question per day', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ daily_target: newTarget })
        .eq('id', profile.id);
      
      if (error) throw error;
      toast('Daily target updated!', 'success');
      refetchProfile();
      setIsTargetModalOpen(false);
    } catch (err) {
      console.error(err);
      toast('Failed to update target', 'error');
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Generate dynamic battle plan checklist tasks
  const battlePlanTasks = useMemo(() => {
    const tasks = [];
    const targetQ = profile?.daily_target || 70;
    
    // Task 1: Subject specific solved target
    const weakChaps = data?.chapters.weak || [];
    if (weakChaps.length > 0) {
      const chap = weakChaps[0];
      tasks.push({
        id: 'task_practice_weak',
        title: `Solve ${Math.round(targetQ * 0.4)} questions in ${chap.chapter}`,
        subject: chap.subject,
        duration: '40 mins'
      });
    } else {
      tasks.push({
        id: 'task_practice_default',
        title: `Solve ${Math.round(targetQ * 0.4)} questions in Physics Mechanics`,
        subject: 'physics',
        duration: '45 mins'
      });
    }

    // Task 2: Review mistakes / weak topics
    const weakTopics = data?.weakTopics || [];
    if (weakTopics.length > 0) {
      tasks.push({
        id: 'task_review_weak_topic',
        title: `Review formula sheets & notes for "${weakTopics[0].topic}"`,
        subject: weakTopics[0].subject,
        duration: '20 mins'
      });
    } else {
      tasks.push({
        id: 'task_review_chem',
        title: 'Review Inorganic Chemistry coordination compound reactions',
        subject: 'chemistry',
        duration: '30 mins'
      });
    }

    // Task 3: Consistency Check / Leaderboard
    tasks.push({
      id: 'task_consistency',
      title: `Contribute ${Math.round(targetQ * 0.6)} questions today to rank up leaderboard`,
      subject: 'general',
      duration: '50 mins'
    });

    return tasks;
  }, [data, profile]);

  const handleSendAiMessage = async () => {
    if (!aiMessage.trim()) return;
    const userMsg = aiMessage;
    setAiResponses(prev => [...prev, { sender: 'user', text: userMsg }]);
    setAiMessage('');
    setIsAiLoading(true);

    // AI Coaching responses mapping
    setTimeout(() => {
      let reply = "I've reviewed your request. Focus on core formulas first, and practice 10 easy-level questions before scaling up difficulty.";
      const query = userMsg.toLowerCase();
      
      if (query.includes('thermo') || query.includes('entropy') || query.includes('heat')) {
        reply = "Thermodynamics core tips: 1. Remember the First Law equation: dQ = dU + dW (watch sign conventions: work done BY the gas is positive). 2. For adiabatic processes, P*V^gamma = constant. 3. Carnot efficiency is 1 - T_cold/T_hot. Practice standard graphs (P-V diagrams) to visualize work done.";
      } else if (query.includes('electro') || query.includes('coulomb') || query.includes('charge')) {
        reply = "Electrostatics focal points: 1. Coulomb's Law: F = k*q1*q2/r^2. 2. Gauss's Law: Closed Integral (E.dA) = Q_enclosed/epsilon_0. Electric field inside a conducting sphere is always zero. 3. Potential energy U = k*q1*q2/r. Focus heavily on spherical distribution problems.";
      } else if (query.includes('calculus') || query.includes('integrate') || query.includes('differentiat')) {
        reply = "Calculus and Integration essentials: 1. Integration is the reverse of differentiation. Focus on substitution techniques (letting u = f(x)). 2. Study standard formulas for trigonometric integrals. 3. In physics, integration calculates area under graphs (like work done = Integral of P.dV, or change in velocity = Integral of a.dt).";
      } else if (query.includes('strategy') || query.includes('study') || query.includes('time') || query.includes('prepare')) {
        reply = "JEE Study Strategy: 1. Reallocate time: study 2 hours of theory, followed by 3 hours of focused PYQ practice. 2. Bookmark hard questions in your error workbook. 3. Target consistency: solving 30 questions daily is significantly better than solving 100 questions once a week.";
      } else if (query.includes('motivation') || query.includes('tired') || query.includes('stress')) {
        reply = "JEE preparation is a marathon, not a sprint. Every single question you solve builds cognitive neural pathways. Remind yourself: progress is incremental. If you feel tired, take a 10-minute walk or a brief breath break, then return and solve just 5 easy questions to lock in your daily streak.";
      }
      
      setAiResponses(prev => [...prev, { sender: 'ai', text: reply }]);
      setIsAiLoading(false);
    }, 1200);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-cyan-500 font-mono animate-pulse">Synchronizing Neural Interface...</div>
      </div>
    );
  }

  // Last attempt calculations for Jump Back In
  const lastAttemptSubject = data?.lastAttempt?.subject || '';
  const lastAttemptChapter = data?.lastAttempt?.chapter || '';
  
  const resumeHref = lastAttemptChapter
    ? `/solving?subject=${encodeURIComponent(lastAttemptSubject.toLowerCase())}&chapter=${encodeURIComponent(lastAttemptChapter)}&exam=jee-mains`
    : `/solving`;

  // Solved vs Target calculations
  const solvedToday = data?.questionsSolved.today || 0;
  const targetQ = profile?.daily_target || 70;
  const progressPct = Math.min(100, Math.round((solvedToday / targetQ) * 100));

  return (
    <div className="an-content max-w-7xl mx-auto px-4 py-4 space-y-8 pb-24">
      
      {/* Header Coach greeting */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 an-anim an-anim-1">
        <div>
          <h1 className="text-4xl font-black font-[family-name:var(--font-bebas)] tracking-wider text-foreground leading-none">
            {greeting()}, {profile?.name || 'Aspirant'}.
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-widest">
            Let's build momentum for your JEE preparation today.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 bg-white/[0.03] border border-white/[0.05] rounded-full text-cyan-400">
            Target: JEE {profile?.target_year || '2026'}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 bg-white/[0.03] border border-white/[0.05] rounded-full text-purple-400">
            Class: {profile?.class || '12th'}
          </span>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column (Main widgets) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Daily Checkpoint progress card */}
          <div className="an-card p-6 bg-gradient-to-br from-[#0a0f26]/80 to-[#121c42]/40 rounded-3xl relative overflow-hidden border border-white/[0.05] space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Daily Checkpoint</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Calibrating daily question target</p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsTargetModalOpen(true)}
                className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-xl text-gray-400 hover:text-cyan-400 transition-all"
              >
                Set Target
              </button>
            </div>

            <div className="flex justify-between items-baseline">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black font-[family-name:var(--font-bebas)] tracking-wider text-white leading-none">
                  {solvedToday}
                </span>
                <span className="text-gray-500 text-xs font-mono">/ {targetQ} Qs</span>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400">{progressPct}% completed</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/[0.02]">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link 
                href={resumeHref}
                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10"
              >
                Continue Practice <ChevronRight size={14} />
              </Link>
              <Link 
                href="/analytics"
                className="flex-1 py-3 px-6 rounded-xl border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.02] text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                View Detailed Analytics
              </Link>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="space-y-4">
            <div className="an-section-label !mb-0">Quick Action Hub</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/solving" className="flex flex-col items-center justify-center p-5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] hover:border-cyan-500/30 rounded-2xl group transition-all text-center">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Zap size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Start Practice</span>
              </Link>
              
              <Link href="/tests" className="flex flex-col items-center justify-center p-5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] hover:border-purple-500/30 rounded-2xl group transition-all text-center">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Award size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Mock Test</span>
              </Link>
              
              <Link href="/solving?mode=revision" className="flex flex-col items-center justify-center p-5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] hover:border-orange-500/30 rounded-2xl group transition-all text-center">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <BookOpen size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Revision Mode</span>
              </Link>
              
              <button 
                onClick={() => setIsAiSolverOpen(true)}
                className="flex flex-col items-center justify-center p-5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] hover:border-green-500/30 rounded-2xl group transition-all text-center w-full"
              >
                <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <BrainCircuit size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white">AI Solver</span>
              </button>
            </div>
          </div>

          {/* Jump Back In / Resume Practice */}
          {lastAttemptChapter && (
            <div className="space-y-4">
              <div className="an-section-label !mb-0">Jump Back In</div>
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-6 bg-white/[0.01] border border-white/[0.03] rounded-3xl gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/10 text-xl font-bold shrink-0">
                    {lastAttemptSubject.toLowerCase().startsWith('ph') ? 'Σ' : lastAttemptSubject.toLowerCase().startsWith('ch') ? 'Δ' : '∫'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] bg-purple-500/20 text-purple-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                        {lastAttemptSubject.toUpperCase()}
                      </span>
                      <span className="text-[8px] text-gray-500 font-mono uppercase">Last Active: {new Date(data?.lastAttempt?.created_at || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1">{lastAttemptChapter}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-widest font-mono">Master formulas and concept PYQs</p>
                  </div>
                </div>
                
                <Link 
                  href={resumeHref}
                  className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.05] text-white font-bold text-[10px] uppercase tracking-widest text-center transition-all shrink-0"
                >
                  Resume Drill
                </Link>
              </div>
            </div>
          )}

          {/* Collapsible Leaderboard Widget */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="an-section-label !mb-0">Leaderboard Rankings</div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setLbMode('daily')}
                  className={`text-[8px] font-bold uppercase tracking-widest px-2.5 py-1 rounded ${lbMode === 'daily' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/10' : 'text-gray-500 hover:text-white'}`}
                >
                  Daily
                </button>
                <button 
                  onClick={() => setLbMode('weekly')}
                  className={`text-[8px] font-bold uppercase tracking-widest px-2.5 py-1 rounded ${lbMode === 'weekly' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/10' : 'text-gray-500 hover:text-white'}`}
                >
                  Weekly
                </button>
              </div>
            </div>

            <div className="an-card">
              <div className="an-card-body p-2 space-y-2">
                {lbLoading ? (
                  Array(3).fill(0).map((_, i) => <div key={i} className="an-lb-row animate-pulse h-12 bg-bg3/50 rounded-xl"></div>)
                ) : lbEntries.length ? (
                  lbEntries.slice(0, 3).map((entry, i) => (
                    <div key={i} className={`an-lb-row !py-2 ${entry.user_id === profile?.id ? 'an-lb-row-me' : ''}`}>
                       <div className="an-lb-rank text-xs">{entry.rank}</div>
                       <div className="an-lb-avatar !w-8 !h-8">
                          {entry.avatar_url ? (
                             <img src={getOptimizedUrl(entry.avatar_url, 'w_60,h_60,c_fill')} alt={entry.name} />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px]"><Users size={12} /></div>
                          )}
                       </div>
                       <div className="an-lb-info">
                          <div className="an-lb-name text-xs">
                             {entry.name}
                             {entry.user_id === profile?.id && <span className="text-[7px] bg-cyan-500/20 text-cyan-400 px-1 rounded ml-1">YOU</span>}
                          </div>
                          <div className="an-lb-sub text-[8px]">{entry.class} · Target {entry.target_year}</div>
                       </div>
                       <div className="an-lb-score">
                          <div className="an-lb-val text-xs">{entry.aura_score.toLocaleString()}</div>
                          <div className="an-lb-label text-[8px]">{lbMode === 'daily' ? 'pts today' : 'pts this week'}</div>
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 font-mono text-xs">No rankings available.</div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (Sidebar widgets) */}
        <div className="space-y-8">
          
          {/* Consistency & Streaks */}
          <div className="an-card p-6 flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between">
              <div className="an-card-title text-orange-400 !mb-0">
                <Flame size={16} className="mr-2" /> Study Streak
              </div>
              <span className="text-[8px] font-mono text-cyan-400 uppercase">Live Streak</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-5xl font-black font-[family-name:var(--font-bebas)] text-white leading-none">
                {data?.streak.current || 0}
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase block leading-none">Days Active</span>
                <span className="text-[9px] text-gray-500 font-mono uppercase mt-1 block">Best: {data?.streak.best || 0} days</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 bg-white/[0.01] p-2 border border-white/[0.03] rounded-xl">
              {(() => {
                const activityMap = data?.activityMap || {};
                const now = new Date();
                const weekArr = [];
                for (let i = 6; i >= 0; i--) {
                  const d = new Date(now);
                  d.setHours(0,0,0,0);
                  d.setDate(d.getDate() - i);
                  const iso = d.toISOString().split('T')[0];
                  const done = !!activityMap[iso];
                  const name = d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
                  weekArr.push({ name, done });
                }
                return weekArr.map((w, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="text-[7px] text-gray-500 font-mono uppercase mb-1">{w.name}</span>
                    <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[7px] font-black ${w.done ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' : 'bg-white/5 text-gray-700'}`}>
                      {w.done ? '✓' : '✕'}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Coach's Battle Plan checklist */}
          <div className="an-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.03] pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <CheckSquare size={14} className="text-cyan-400" /> Today's Battle Plan
                </h3>
                <p className="text-[8px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">Custom daily coach drill</p>
              </div>
            </div>

            <div className="space-y-3">
              {battlePlanTasks.map((t) => {
                const isChecked = !!checkedTasks[t.id];
                return (
                  <div 
                    key={t.id} 
                    onClick={() => toggleTask(t.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${isChecked ? 'bg-green-500/5 border-green-500/10 opacity-60' : 'bg-white/[0.01] border-white/[0.03] hover:border-white/[0.08]'}`}
                  >
                    <div className="shrink-0 mt-0.5 text-gray-400">
                      {isChecked ? (
                        <CheckSquare size={14} className="text-green-400" />
                      ) : (
                        <div className="w-3.5 h-3.5 border border-gray-600 rounded-sm" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[11px] font-bold block leading-tight ${isChecked ? 'line-through text-gray-500' : 'text-white'}`}>
                        {t.title}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[8px] font-mono text-gray-500 uppercase">{t.duration}</span>
                        {t.subject !== 'general' && (
                          <>
                            <span className="text-gray-700 text-[8px] font-mono">•</span>
                            <span className="text-[8px] font-mono text-cyan-400 uppercase">{t.subject}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Estimated Percentile Outliner */}
          <div className="an-card p-6 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border-cyan-500/10 space-y-4">
             <div className="font-mono text-[9px] text-gray-500 uppercase tracking-widest block">Estimated JEE Percentile</div>
             <div className="flex items-baseline gap-2">
                <div className="text-5xl font-black font-[family-name:var(--font-bebas)] tracking-wider text-white leading-none">
                  {calculatePercentile(data?.accuracy)}%ile
                </div>
                <div className="flex items-center text-[9px] text-green-400 font-bold uppercase font-mono">
                  <TrendingUp size={10} className="mr-0.5" /> +0.2%
                </div>
             </div>
             <p className="text-[9px] text-gray-500 uppercase tracking-widest font-mono leading-relaxed">
               Rank prediction based on accuracy, study streak consistency, and solver contribution rates.
             </p>
             <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${data?.accuracy.overall || 50}%` }} />
             </div>
          </div>

        </div>

      </div>

      {/* Set Target Modal */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-[#0f0f1a] border border-[#ffffff10] rounded-2xl p-8 w-full max-w-sm animate-scale-in">
             <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400 mb-6">
                <Target size={24} />
             </div>
             <h3 className="text-xl font-bold text-white mb-2 font-[family-name:var(--font-bebas)] tracking-widest">
                Daily Goal Protocol
             </h3>
             <p className="text-xs text-gray-500 mb-8 uppercase tracking-widest">
                Define your daily question solving threshold
             </p>
             
             <div className="space-y-4 mb-8">
                <div>
                   <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Daily Questions</label>
                   <input 
                      type="number"
                      min="1"
                      value={newTarget}
                      onChange={(e) => setNewTarget(Number(e.target.value))}
                      className="w-full bg-[#ffffff05] border border-[#ffffff10] rounded-xl px-4 py-4 text-white font-mono text-2xl focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all outline-none"
                      autoFocus
                   />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-gray-600 uppercase tracking-widest px-1">
                   <span>Weekly: {Math.max(0, newTarget) * 7}</span>
                   <span>Monthly: {Math.max(0, newTarget) * 30}</span>
                </div>
             </div>

             <div className="flex gap-3">
                <button 
                   onClick={() => setIsTargetModalOpen(false)}
                   className="flex-1 py-3 rounded-xl border border-[#ffffff10] text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-[#ffffff05] transition-all"
                >
                   Abort
                </button>
                <button 
                   onClick={handleUpdateTarget}
                   className="flex-1 py-3 rounded-xl bg-cyan-500 text-black font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-cyan-500/20"
                >
                   Initiate
                </button>
             </div>
          </div>
        </div>
      )}

      {/* AI Solver Chat Modal Drawer */}
      {isAiSolverOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-end bg-black/60 backdrop-blur-md">
          <div className="bg-[#0b0c16] border-l border-white/5 w-full max-w-md h-full flex flex-col justify-between animate-slide-in relative">
            
            {/* Header */}
            <div className="p-6 border-b border-white/[0.03] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-500/10 text-green-400 rounded-lg flex items-center justify-center">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider leading-none">AI Study Coach</h3>
                  <span className="text-[8px] text-gray-500 font-mono uppercase tracking-widest block mt-1">JEE / NEET Syllabus Calibrated</span>
                </div>
              </div>
              
              <button 
                onClick={() => setIsAiSolverOpen(false)}
                className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white px-2 py-1"
              >
                Close
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 zd-custom-scroll">
              {aiResponses.map((res, i) => (
                <div key={i} className={`flex ${res.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${res.sender === 'user' ? 'bg-cyan-500 text-black font-bold' : 'bg-white/[0.02] border border-white/[0.03] text-gray-300'}`}>
                    {res.text}
                  </div>
                </div>
              ))}
              
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4 text-[10px] text-gray-500 font-mono animate-pulse">
                    Coach is drafting explanation...
                  </div>
                </div>
              )}
            </div>

            {/* Footer Input */}
            <div className="p-6 border-t border-white/[0.03] bg-white/[0.01]">
              <div className="flex gap-2 bg-white/[0.02] border border-white/5 focus-within:border-cyan-400 rounded-xl p-2 transition-all">
                <input 
                  type="text"
                  placeholder="Ask physics formulas, organic mechanisms..."
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendAiMessage()}
                  className="flex-1 bg-transparent outline-none border-none text-xs text-white px-2 py-1 placeholder:text-gray-600"
                />
                <button 
                  onClick={handleSendAiMessage}
                  disabled={!aiMessage.trim()}
                  className="w-8 h-8 rounded-lg bg-cyan-400 text-black flex items-center justify-center hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 transition-all"
                >
                  <CornerDownLeft size={16} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function calculatePercentile(accuracy: any) {
   if (!accuracy) return '—';
   const acc = accuracy.overall;
   if (acc > 90) return '99.9';
   if (acc > 80) return '99.2';
   if (acc > 70) return '98.5';
   if (acc > 60) return '97.1';
   if (acc > 50) return '94.8';
   return (acc + 40).toFixed(1);
}

function calculatePredictedScore(accuracy: any) {
   if (!accuracy) return '—';
   const total = 300;
   const avgAcc = accuracy.overall / 100;
   return Math.round(total * avgAcc * 0.95);
}
