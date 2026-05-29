'use client';

import React, { useMemo, useState } from 'react';
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
  Send,
  Zap,
  Music,
  Users,
  Bell,
  Settings,
  TrendingUp,
  Award,
  TriangleAlert,
  CircleAlert,
  Download,
  SlidersHorizontal,
  Calendar,
  ChartLine,
  Table,
  Bolt,
  FlaskConical,
  Variable,
  Calculator,
  Thermometer,
  Waves,
  Dna,
  Palette
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { profile, refetch: refetchProfile } = useProfile();
  const { data, loading } = useDashboardAnalytics(profile?.id);
  const [lbMode, setLbMode] = React.useState<'daily' | 'weekly'>('weekly');
  const { entries: lbEntries, loading: lbLoading } = useLeaderboard(lbMode);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [newTarget, setNewTarget] = useState(70);
  const { toast } = useDialog();

  React.useEffect(() => {
    if (profile?.daily_target) {
      setNewTarget(profile.daily_target);
    }
  }, [profile]);

  const handleUpdateTarget = async () => {
    if (!profile) return;
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

  const handleExportCSV = () => {
    if (!data || !data.resourceAllocation || !data.resourceAllocation.length) {
      toast('No data available to export', 'error');
      return;
    }

    const headers = ['Subject', 'Time Spent (s)', 'Time Spent (Formatted)', 'Questions Solved', 'Correct Questions', 'Accuracy (%)', 'Avg Time/Q (s)', 'Status'];
    const rows = data.resourceAllocation.map(s => {
      const formattedTime = `${Math.floor(s.timeSpent / 3600)}h ${Math.floor((s.timeSpent % 3600) / 60)}m`;
      const status = s.accuracy > 75 ? 'Excellent' : s.accuracy > 50 ? 'Optimized' : s.accuracy > 30 ? 'Warning' : 'Critical';
      return [
        s.subject.toUpperCase(),
        s.timeSpent,
        formattedTime,
        s.totalQuestions,
        s.correctQuestions,
        s.accuracy,
        s.avgTimePerQ,
        status
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `solvingminds_resource_allocation_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Resource allocation exported successfully!', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-cyan-500 font-mono animate-pulse">Initializing Neural Interface...</div>
      </div>
    );
  }

  return (
    <div className="an-content max-w-7xl mx-auto px-4 py-4">
      {/* Quick Access Grid */}
      <section className="mb-8 an-anim an-anim-1">
        <div className="an-section-label">Quick Access</div>
        <div className="an-qa-panel">
          <Link href="/solving" className="an-qa-btn group">
            <div className="an-qa-icon"><Zap size={20} /></div>
            <div className="an-qa-label">Start Practice</div>
          </Link>
          <Link href="/solving" className="an-qa-btn group">
            <div className="an-qa-icon"><Target size={20} /></div>
            <div className="an-qa-label">Mock Test</div>
          </Link>
          <Link href="/solving" className="an-qa-btn group">
            <div className="an-qa-icon"><Zap size={20} /></div>
            <div className="an-qa-label">JEE Solver</div>
          </Link>
          <Link href="/community" className="an-qa-btn group">
            <div className="an-qa-icon"><Send size={20} /></div>
            <div className="an-qa-label">Revision Mode</div>
          </Link>
          <Link href="/community" className="an-qa-btn group">
            <div className="an-qa-icon"><Award size={20} /></div>
            <div className="an-qa-label">Leaderboard</div>
          </Link>
        </div>
      </section>
 
      {/* Overview KPI Strip */}
      <section className="mb-8 an-anim an-anim-2">
        <div className="an-section-label">Overview</div>
        <div className="an-kpi-strip">
          <div className="an-kpi-card an-c-cyan">
            <div className="an-kpi-icon"><Flame size={20} /></div>
            <div className="an-kpi-val">{data?.streak.current || 0}</div>
            <div className="an-kpi-label">Day Streak</div>
            <div className="an-kpi-delta text-green-400">
              <TrendingUp size={12} /> Best: {data?.streak.best || 0} days
            </div>
          </div>
          <div className="an-kpi-card an-c-purple">
            <div className="an-kpi-icon"><Award size={20} /></div>
            <div className="an-kpi-val">{profile?.aura_score || 0}</div>
            <div className="an-kpi-label">Aura Score</div>
            <div className="an-kpi-delta text-purple-400">
              {profile?.aura_level || 'Aura Protocol'}
            </div>
          </div>
          <div className="an-kpi-card an-c-green">
            <div className="an-kpi-icon"><Target size={20} /></div>
            <div className="an-kpi-val">{data?.accuracy.overall || 0}%</div>
            <div className="an-kpi-label">Overall Accuracy</div>
            <div className="an-kpi-delta text-green-400">
              <TrendingUp size={12} /> Consistency is Key
            </div>
          </div>
          <div className="an-kpi-card an-c-orange">
            <div className="an-kpi-icon"><Clock size={20} /></div>
            <div className="an-kpi-val">
              {(() => {
                const totalSecs = data?.resourceAllocation.reduce((a, b) => a + b.timeSpent, 0) || 0;
                if (totalSecs === 0) return '0h';
                if (totalSecs < 3600) return `${Math.round(totalSecs / 60)}m`;
                return `${(totalSecs / 3600).toFixed(1)}h`;
              })()}
            </div>
            <div className="an-kpi-label">Total Focused</div>
            <div className="an-kpi-delta">
              Target: 42h / week
            </div>
          </div>
        </div>
      </section>
 
      {/* Questions Solved Section */}
      <section className="mb-8 an-anim an-anim-2">
        <div className="flex items-center justify-between mb-4">
          <div className="an-section-label !mb-0">Questions Solved</div>
          <button 
            onClick={() => setIsTargetModalOpen(true)}
            className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 bg-[#ffffff05] border border-[#ffffff10] rounded-lg text-gray-500 hover:text-cyan-400 hover:border-cyan-400 transition-all flex items-center gap-2 group"
          >
            <Target size={12} className="group-hover:scale-110 transition-transform" />
            Set Target
          </button>
        </div>
        <div className="an-qstat-row">
          {(() => {
            const dTarget = profile?.daily_target || 70;
            const wTarget = dTarget * 7;
            const mTarget = dTarget * 30;
            
            return (
              <>
                <QuestionRing 
                  period="Today" 
                  count={data?.questionsSolved.today || 0} 
                  target={dTarget} 
                  color="var(--accent)"
                />
                <QuestionRing 
                  period="This Week" 
                  count={data?.questionsSolved.week || 0} 
                  target={wTarget} 
                  color="var(--purple)"
                />
                <QuestionRing 
                  period="This Month" 
                  count={data?.questionsSolved.month || 0} 
                  target={mTarget} 
                  color="var(--green)"
                />
              </>
            );
          })()}
        </div>
      </section>

      {/* Subject Accuracy + Performance Trend */}
      <section className="mb-8 an-anim an-anim-3">
        <div className="an-section-label">Subject Mastery</div>
        <div className="an-gauge-row mb-6">
          <SubjectGauge subject="Physics" accuracy={data?.accuracy.physics || 0} color="var(--accent)" />
          <SubjectGauge subject="Chemistry" accuracy={data?.accuracy.chemistry || 0} color="var(--purple)" />
          <SubjectGauge subject="Mathematics" accuracy={data?.accuracy.mathematics || 0} color="var(--green)" />
        </div>
 
        <div className="an-card">
          <div className="an-card-header">
            <div>
              <div className="an-card-title">
                <Activity size={16} className="text-cyan-400 mr-2" />
                Performance Trend · Last {data?.performanceTrend.dates.length || 14} Sessions
              </div>
              <div className="an-card-sub">Physics · Chemistry · Mathematics</div>
            </div>
          </div>
          <div className="an-card-body">
            <PerformanceTrendChart trend={data?.performanceTrend} />
          </div>
        </div>
      </section>
 
      {/* Chapters Section */}
      <section className="mb-8 an-anim an-anim-4">
        <div className="an-two-col">
          <div className="an-card">
            <div className="an-card-header">
              <div className="an-card-title text-green-400">
                <Award size={16} className="mr-2" /> Top Chapters
              </div>
            </div>
            <div className="an-card-body">
              <ChapterList chapters={data?.chapters.top || []} type="top" />
            </div>
          </div>
          <div className="an-card">
            <div className="an-card-header">
              <div className="an-card-title text-red-400">
                <Activity size={16} className="mr-2" /> Weak Chapters
              </div>
            </div>
            <div className="an-card-body">
              <ChapterList chapters={data?.chapters.weak || []} type="weak" />
            </div>
          </div>
        </div>
      </section>
 
      {/* Leaderboard Section */}
      <section className="mb-8 an-anim an-anim-4">
         <div className="an-card">
            <div className="an-card-header">
               <div>
                  <div className="an-card-title text-yellow-400">
                     <Award size={16} className="mr-2" />
                     {lbMode === 'daily' ? 'Daily Leaderboard' : lbMode === 'weekly' ? 'Weekly Leaderboard' : 'Global Leaderboard'}
                  </div>
                  <div className="an-card-sub">
                    {lbMode === 'daily' ? "Ranked by today's study time" : lbMode === 'weekly' ? "Ranked by this week's study time" : 'Ranked by total aura score'}
                  </div>
               </div>
               <div className="an-lb-tabs">
                  <div className={`an-lb-tab ${lbMode === 'daily' ? 'active' : ''}`} onClick={() => setLbMode('daily')}>Daily</div>
                  <div className={`an-lb-tab ${lbMode === 'weekly' ? 'active' : ''}`} onClick={() => setLbMode('weekly')}>Weekly</div>
               </div>
            </div>
            <div className="an-card-body">
               <div className="an-lb-list">
                  {lbLoading ? (
                     Array(5).fill(0).map((_, i) => <div key={i} className="an-lb-row animate-pulse h-16 bg-bg3/50"></div>)
                  ) : lbEntries.length ? (
                     lbEntries.map((entry, i) => (
                        <div key={i} className={`an-lb-row ${entry.user_id === profile?.id ? 'an-lb-row-me' : ''}`}>
                           <div className="an-lb-rank">{entry.rank}</div>
                           <div className="an-lb-avatar">
                              {entry.avatar_url ? (
                                 <img src={getOptimizedUrl(entry.avatar_url, 'w_80,h_80,c_fill')} alt={entry.name} />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center text-gray-600"><Users size={16} /></div>
                              )}
                           </div>
                           <div className="an-lb-info">
                              <div className="an-lb-name">
                                 {entry.name}
                                 {entry.user_id === profile?.id && <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-1 rounded">YOU</span>}
                                 {entry.role === 'admin' && <span className="text-[8px] bg-red-500/20 text-red-400 px-1 rounded">ADMIN</span>}
                              </div>
                              <div className="an-lb-sub">{entry.class} · Target {entry.target_year}</div>
                           </div>
                           <div className="an-lb-score">
                              <div className="an-lb-val">{entry.aura_score.toLocaleString()}</div>
                              <div className="an-lb-label">{lbMode === 'daily' ? 'pts today' : lbMode === 'weekly' ? 'pts this week' : 'aura points'}</div>
                           </div>
                        </div>
                     ))
                  ) : (
                     <div className="text-center py-8 text-gray-500 font-mono text-xs">No entries found for this period.</div>
                  )}
               </div>
            </div>
         </div>
      </section>
 
      {/* Weak Topics + Prediction + Streak */}
      <section className="mb-8 an-anim an-anim-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weak Topics */}
          <div className="an-card lg:col-span-1">
            <div className="an-card-header">
              <div className="an-card-title text-red-400">
                <Zap size={16} className="mr-2" /> Weak Topics
              </div>
            </div>
            <div className="an-card-body">
              <div className="an-topic-grid">
                {data?.weakTopics.length ? data.weakTopics.map((t, i) => (
                  <div key={i} className={`an-topic-chip an-sev-${t.accuracy < 35 ? 1 : t.accuracy < 55 ? 2 : 3}`}>
                    <div className="an-topic-icon">{getTopicIcon(t.topic)}</div>
                    <div className="an-topic-text">
                      <div className="an-topic-name">{t.topic}</div>
                      <div className="an-topic-subject">{t.subject}</div>
                    </div>
                    <div className="an-topic-score">{t.accuracy}%</div>
                  </div>
                )) : <div className="text-gray-500 font-mono text-xs text-center py-4">No data yet</div>}
              </div>
            </div>
          </div>
 
          {/* Prediction Card */}
          <div className="flex flex-col gap-6">
            <div className="an-card p-6 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-500/20">
               <div className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-2">Estimated JEE Score</div>
               <div className="text-5xl font-[family-name:var(--font-bebas)] bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent leading-none mb-1">
                  {calculatePredictedScore(data?.accuracy)}
               </div>
               <div className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-4">/ 300 · Probable Percentile: {calculatePercentile(data?.accuracy)}</div>
               <div className="space-y-3">
                  <SubjectBar label="PHY" value={data?.accuracy.physics || 0} color="var(--accent)" />
                  <SubjectBar label="CHEM" value={data?.accuracy.chemistry || 0} color="var(--purple)" />
                  <SubjectBar label="MATH" value={data?.accuracy.mathematics || 0} color="var(--green)" />
               </div>
            </div>
            
            {/* Mini Stats */}
             <div className="space-y-2">
                <MiniStat icon={<Clock size={12} />} label="Avg time / question" value={`${data?.globalAvgTimePerQ != null ? data.globalAvgTimePerQ : 0}s`} color="var(--accent)" />
                <MiniStat icon={<Zap size={12} />} label="Questions Attempted" value={data?.questionsSolved.month.toString() || '0'} color="var(--purple)" />
             </div>
          </div>
 
          {/* Study Streak */}
          <div className="an-card">
            <div className="an-card-header">
              <div className="an-card-title text-orange-400">
                <Flame size={16} className="mr-2" /> Study Streak
              </div>
              <div className="an-card-sub">Last 14 days attendance</div>
            </div>
            <StudyStreakPips activityMap={data?.activityMap || {}} />
            <div className="an-streak-count-wrap">
              <div className="text-left">
                <div className="an-streak-num">{data?.streak.current || 0} <span>day streak</span></div>
                <div className="text-[10px] text-gray-500 font-mono mt-1">Consistency creates legends.</div>
              </div>
              <div className="an-streak-best">
                <div>Personal Best</div>
                <strong>{data?.streak.best || 0} days</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
 
      {/* Activity Heatmap */}
      <section className="mb-8 an-anim an-anim-5">
        <div className="an-card">
          <div className="an-card-header">
            <div className="an-card-title">
               <Calendar size={16} className="mr-2" /> Activity Heatmap · {new Date().getFullYear()}
            </div>
          </div>
          <div className="an-card-body">
             <ActivityHeatmap activityMap={data?.activityMap || {}} />
          </div>
        </div>
      </section>
 
      {/* Resource Allocation Table */}
      <section className="mb-8 an-anim an-anim-5">
         <div className="an-card">
             <div className="an-card-header">
                <div className="an-card-title">
                   <Table size={16} className="mr-2" /> Resource Allocation
                </div>
                <button 
                  onClick={handleExportCSV}
                  className="an-btn-primary flex items-center gap-2 px-3 py-1 bg-cyan-500 text-black font-bold rounded-md text-[10px]"
                >
                   <Download size={14} /> EXPORT CSV
                </button>
             </div>
            <div className="overflow-x-auto">
               <table className="an-tbl">
                  <thead>
                     <tr>
                        <th>Subject</th>
                        <th>Time Spent</th>
                        <th>Questions</th>
                        <th>Correct</th>
                        <th>Avg Time/Q</th>
                        <th>Status</th>
                     </tr>
                  </thead>
                  <tbody>
                     {data?.resourceAllocation.map((s, i) => (
                        <tr key={i}>
                           <td>
                              <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full" style={{ background: getSubjColor(s.subject) }}></div>
                                 <div className="font-bold">{s.subject.toUpperCase()}</div>
                              </div>
                           </td>
                           <td className="font-mono text-cyan-400">{Math.floor(s.timeSpent / 3600)}h {Math.floor((s.timeSpent % 3600) / 60)}m</td>
                           <td className="font-mono">{s.totalQuestions}</td>
                           <td className="font-mono">{s.correctQuestions} <span className="text-gray-500 text-[10px]">({s.accuracy}%)</span></td>
                           <td className="font-mono">{Math.floor(s.avgTimePerQ / 60)}m {s.avgTimePerQ % 60}s</td>
                           <td>
                              <span className={`an-status-badge ${s.accuracy > 75 ? 'an-st-ex' : s.accuracy > 50 ? 'an-st-ok' : s.accuracy > 30 ? 'an-st-wr' : 'an-st-cr'}`}>
                                 {s.accuracy > 75 ? 'Excellent' : s.accuracy > 50 ? 'Optimized' : s.accuracy > 30 ? 'Warning' : 'Critical'}
                              </span>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </section>

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
                      value={newTarget}
                      onChange={(e) => setNewTarget(Number(e.target.value))}
                      className="w-full bg-[#ffffff05] border border-[#ffffff10] rounded-xl px-4 py-4 text-white font-mono text-2xl focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all outline-none"
                      autoFocus
                   />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-gray-600 uppercase tracking-widest px-1">
                   <span>Weekly: {newTarget * 7}</span>
                   <span>Monthly: {newTarget * 30}</span>
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
    </div>
  );
}

// --- Sub-components ---

function QuestionRing({ period, count, target, color }: { period: string, count: number, target: number, color: string }) {
  const pct = Math.min(100, Math.round((count / target) * 100));
  const circ = 150.8;
  const offset = circ * (1 - pct / 100);

  return (
    <div className="an-qstat-card">
      <div className="an-qstat-ring">
        <svg viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="var(--bg3)" strokeWidth="5" />
          <circle 
            cx="28" cy="28" r="24" fill="none" 
            stroke={color} strokeWidth="5" 
            strokeDasharray={circ} strokeDashoffset={offset} 
            strokeLinecap="round" 
            className="transition-all duration-1000"
          />
        </svg>
        <div className="an-qstat-ring-label">{pct}%</div>
      </div>
      <div className="an-qstat-info">
        <div className="an-qstat-period">{period}</div>
        <div className="an-qstat-num">{count.toLocaleString()}</div>
        <div className="an-qstat-sub">of {target.toLocaleString()} target · <span style={{ color }}>{pct}%</span></div>
      </div>
    </div>
  );
}

function SubjectGauge({ subject, accuracy, color }: { subject: string, accuracy: number, color: string }) {
  const circ = 263.9;
  const offset = circ * (1 - accuracy / 100);

  return (
    <div className="an-gauge-card">
      <div className="an-gauge-wrap">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg3)" strokeWidth="8" />
          <circle 
            cx="50" cy="50" r="42" fill="none" 
            stroke={color} strokeWidth="8" 
            strokeDasharray={circ} strokeDashoffset={offset} 
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="an-gauge-center">
          <div className="an-gauge-pct" style={{ color }}>{accuracy}%</div>
        </div>
      </div>
      <div className="an-gauge-subject">{subject}</div>
      <div className={`an-gauge-trend ${accuracy > 70 ? 'text-green-400' : 'text-red-400'}`}>
        {accuracy > 70 ? <TrendingUp size={12} className="inline mr-1" /> : <TrendingUp size={12} className="inline mr-1 rotate-180" />}
        {accuracy > 70 ? 'Excellent' : 'Needs Focus'}
      </div>
    </div>
  );
}

function PerformanceTrendChart({ trend }: { trend: any }) {
  if (!trend || trend.dates.length === 0) return <div className="h-40 flex items-center justify-center text-gray-600 font-mono text-xs">No trend data available</div>;

  const width = 700;
  const height = 180;
  const pad = { t: 20, r: 20, b: 30, l: 40 };
  const chartW = width - pad.l - pad.r;
  const chartH = height - pad.t - pad.b;

  const points = (series: (number | null)[]) => {
    return series.map((val, i) => {
      const v = val === null ? 50 : val;
      const x = pad.l + (i / (series.length - 1)) * chartW;
      const y = pad.t + (1 - v / 100) * chartH;
      return `${x},${y}`;
    }).join(' ');
  };

  const fillPoints = (series: (number | null)[]) => {
    const pts = series.map((val, i) => {
        const v = val === null ? 50 : val;
        const x = pad.l + (i / (series.length - 1)) * chartW;
        const y = pad.t + (1 - v / 100) * chartH;
        return `${x},${y}`;
    });
    return `M${pts[0]} ${pts.map(p => 'L'+p).join(' ')} L${pad.l + chartW},${pad.t + chartH} L${pad.l},${pad.t + chartH} Z`;
  };

  return (
    <div className="an-perf-svg-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="an-gcyan" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2"/><stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/></linearGradient>
          <linearGradient id="an-gpurple" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--purple)" stopOpacity="0.15"/><stop offset="100%" stopColor="var(--purple)" stopOpacity="0"/></linearGradient>
          <linearGradient id="an-ggreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--green)" stopOpacity="0.15"/><stop offset="100%" stopColor="var(--green)" stopOpacity="0"/></linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line key={y} x1={pad.l} y1={pad.t + (1 - y/100) * chartH} x2={pad.l + chartW} y2={pad.t + (1 - y/100) * chartH} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        {/* Y-axis labels */}
        {[0, 50, 100].map(y => (
          <text key={y} x={10} y={pad.t + (1 - y/100) * chartH + 4} fill="var(--text3)" fontSize="10" fontFamily="DM Mono">{y}%</text>
        ))}

        {/* Fills */}
        <path d={fillPoints(trend.physics)} fill="url(#an-gcyan)" />
        <path d={fillPoints(trend.chemistry)} fill="url(#an-gpurple)" />
        <path d={fillPoints(trend.mathematics)} fill="url(#an-ggreen)" />

        {/* Lines */}
        <polyline points={points(trend.physics)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={points(trend.chemistry)} fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={points(trend.mathematics)} fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* End Dots */}
        <circle cx={pad.l + chartW} cy={pad.t + (1 - (trend.physics[trend.physics.length-1]||50)/100) * chartH} r="4" fill="var(--accent)" stroke="var(--bg2)" strokeWidth="2" />
        <circle cx={pad.l + chartW} cy={pad.t + (1 - (trend.chemistry[trend.chemistry.length-1]||50)/100) * chartH} r="4" fill="var(--purple)" stroke="var(--bg2)" strokeWidth="2" />
        <circle cx={pad.l + chartW} cy={pad.t + (1 - (trend.mathematics[trend.mathematics.length-1]||50)/100) * chartH} r="4" fill="var(--green)" stroke="var(--bg2)" strokeWidth="2" />
      </svg>
      <div className="flex justify-between mt-2 px-10">
        {trend.dates.map((d: string, i: number) => (
           <span key={i} className="text-[8px] font-mono text-gray-600 uppercase">{d.split('-').slice(1).join('/')}</span>
        ))}
      </div>
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm bg-cyan-400"></div><span className="font-mono text-[9px] text-gray-500 uppercase">Physics</span></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm bg-purple-400"></div><span className="font-mono text-[9px] text-gray-500 uppercase">Chemistry</span></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm bg-green-400"></div><span className="font-mono text-[9px] text-gray-500 uppercase">Maths</span></div>
      </div>
    </div>
  );
}

function ChapterList({ chapters, type }: { chapters: any[], type: 'top' | 'weak' }) {
  if (chapters.length === 0) return <div className="text-gray-600 font-mono text-xs text-center py-6">No chapter data available</div>;

  return (
    <div className="an-chapter-list">
      {chapters.slice(0, 5).map((c, i) => (
        <div key={i} className="an-chapter-row">
          <div className={`an-chapter-rank ${type}`}>{(i + 1).toString().padStart(2, '0')}</div>
          <div className="flex-1 min-width-0">
            <div className="an-chapter-name">{c.chapter}</div>
            <div className="an-chapter-sub">{c.subject.toUpperCase()} · {c.total} questions</div>
          </div>
          <div className="an-chapter-bar-wrap">
            <div className="an-chapter-bar" style={{ width: `${c.accuracy}%`, background: getSubjColor(c.subject) }}></div>
          </div>
          <div className="an-chapter-score" style={{ color: getSubjColor(c.subject) }}>{c.accuracy}%</div>
          <span className={`badge-pill ${c.accuracy > 90 ? 'badge-top' : c.accuracy > 75 ? 'badge-low' : c.accuracy > 50 ? 'badge-med' : 'badge-crit'}`}>
            {c.accuracy > 90 ? 'Mastered' : c.accuracy > 75 ? 'Strong' : c.accuracy > 50 ? 'Average' : 'Critical'}
          </span>
        </div>
      ))}
    </div>
  );
}

function StudyStreakPips({ activityMap }: { activityMap: Record<string, number> }) {
  const pips = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0,0,0,0);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const name = d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
      const done = !!activityMap[iso];
      const isToday = i === 0;
      arr.push({ name, done, isToday, iso });
    }
    return arr;
  }, [activityMap]);

  return (
    <div className="grid grid-cols-7 gap-y-4 gap-x-2 p-4">
      {pips.map((p, i) => (
        <div key={i} className="an-streak-day">
          <div className="an-streak-day-name">{p.name}</div>
          <div className={`an-streak-pip ${p.isToday ? 'today' : p.done ? 'done' : 'missed'}`}>
             {p.done ? '✓' : p.isToday ? '★' : '✕'}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityHeatmap({ activityMap }: { activityMap: Record<string, number> }) {
   const cells = useMemo(() => {
      const arr = [];
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const days = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
      
      for (let i = 0; i < 364; i++) {
         const d = new Date(startOfYear);
         d.setDate(d.getDate() + i);
         const iso = d.toISOString().split('T')[0];
         const count = activityMap[iso] || 0;
         const level = count === 0 ? 0 : count < 5 ? 1 : count < 10 ? 2 : count < 20 ? 3 : 4;
         arr.push(level);
      }
      return arr;
   }, [activityMap]);

   return (
      <div className="an-heatmap-grid">
         {cells.map((l, i) => (
            <div key={i} className={`an-hm-cell an-hm-${l}`} title={`Level ${l}`} />
         ))}
      </div>
   );
}

function SubjectBar({ label, value, color }: { label: string, value: number, color: string }) {
   return (
      <div className="flex items-center gap-3">
         <div className="font-mono text-[9px] text-gray-400 w-8">{label}</div>
         <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${value}%`, background: color }}></div>
         </div>
         <div className="font-[family-name:var(--font-bebas)] text-xs w-6 text-right" style={{ color }}>{value}</div>
      </div>
   );
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
   return (
      <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:border-white/[0.1] transition-all">
         <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5" style={{ color }}>{icon}</div>
            <div className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">{label}</div>
         </div>
         <div className="font-[family-name:var(--font-bebas)] text-lg text-white">{value}</div>
      </div>
   );
}

function getSubjColor(subj: string) {
  const s = subj.toLowerCase();
  if (s === 'physics') return 'var(--accent)';
  if (s === 'chemistry') return 'var(--purple)';
  if (s === 'mathematics' || s === 'maths' || s === 'math') return 'var(--green)';
  return 'var(--text3)';
}

function getTopicIcon(topic: string) {
   const t = topic.toLowerCase();
   if (t.includes('law') || t.includes('force')) return <Bolt size={14} />;
   if (t.includes('bond') || t.includes('chem')) return <FlaskConical size={14} />;
   if (t.includes('calc') || t.includes('geom')) return <Variable size={14} />;
   if (t.includes('thermo')) return <Thermometer size={14} />;
   return <Zap size={14} />;
}

function calculatePredictedScore(accuracy: any) {
   if (!accuracy) return '—';
   const total = 300;
   const avgAcc = accuracy.overall / 100;
   return Math.round(total * avgAcc * 0.95); // conservative estimate
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
