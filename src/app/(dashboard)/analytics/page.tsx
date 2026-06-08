'use client';

import React, { useMemo, useState } from 'react';
import '../dashboard/analytics.css';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { useProfile } from '@/hooks/useProfile';
import { useDialog } from '@/components/DialogProvider';
import { 
  Target, 
  Flame, 
  Clock, 
  Activity, 
  Zap,
  TrendingUp,
  Award,
  Download,
  Table,
  Calendar,
  Sparkles,
  ChevronRight,
  TrendingDown,
  BookOpen,
  HelpCircle,
  TrendingUp as TrendingUpIcon,
  Zap as ZapIcon
} from 'lucide-react';
import Link from 'next/link';

export default function PerformanceCenterPage() {
  const { profile } = useProfile();
  const { data, loading } = useDashboardAnalytics(profile?.id);
  const { toast } = useDialog();

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
    toast('Performance metrics exported successfully!', 'success');
  };

  const coachAdvice = useMemo(() => {
    if (!data) return "Loading preparation metrics...";
    
    const advices = [];
    const allocation = data.resourceAllocation || [];
    const physics = allocation.find((s: any) => s.subject === 'physics') || { timeSpent: 0, accuracy: 0 };
    const chemistry = allocation.find((s: any) => s.subject === 'chemistry') || { timeSpent: 0, accuracy: 0 };
    const mathematics = allocation.find((s: any) => s.subject === 'mathematics') || { timeSpent: 0, accuracy: 0 };
    
    const totalQuestions = allocation.reduce((sum: number, s: any) => sum + s.totalQuestions, 0);
    
    if (totalQuestions === 0) {
      return "Welcome to your Performance Center! You haven't completed any practice questions yet. Try solving at least 15 questions in the Solver Protocol to calibrate your AI coach advice.";
    }

    const subjects = [
      { name: 'Physics', accuracy: data.accuracy.physics, time: physics.timeSpent },
      { name: 'Chemistry', accuracy: data.accuracy.chemistry, time: chemistry.timeSpent },
      { name: 'Mathematics', accuracy: data.accuracy.mathematics, time: mathematics.timeSpent }
    ].filter(s => s.accuracy > 0);

    if (subjects.length > 0) {
      const sortedByAcc = [...subjects].sort((a, b) => a.accuracy - b.accuracy);
      const lowest = sortedByAcc[0];
      if (lowest.accuracy < 55) {
        advices.push(`Your accuracy in ${lowest.name} is critical at ${lowest.accuracy}%. Try switching to easy mode questions in the practice tab to build foundation strength first.`);
      }
    }

    subjects.forEach(s => {
      if (s.time > 3600 * 5 && s.accuracy < 60) {
        advices.push(`You have dedicated significant time (${Math.round(s.time / 3600)}h) to ${s.name}, yet your accuracy stands at ${s.accuracy}%. Review your incorrect attempts inside the error log to resolve conceptual gaps.`);
      }
    });

    if (data.streak.current >= 5) {
      advices.push(`Outstanding consistency! You are on a ${data.streak.current}-day streak. Consistency is key to unlocking a 99+ percentile.`);
    } else if (data.streak.current === 0) {
      advices.push("No active study streak. Top JEE results are built on daily discipline. Solve 10 questions today to begin a new streak.");
    }

    const weakChaps = data.chapters.weak || [];
    if (weakChaps.length > 0) {
      advices.push(`Your biggest roadblock is currently "${weakChaps[0].chapter}" in ${weakChaps[0].subject.toUpperCase()} (${weakChaps[0].accuracy}% accuracy). We recommend tackling at least 15 medium-difficulty questions in this chapter next.`);
    }

    if (advices.length === 0) {
      return "Excellent status. Your performance is balanced across all three subjects. Focus on maintaining a fast solving speed of under 120 seconds per question to boost your percentile further.";
    }

    return advices.join(" ");
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-cyan-500 font-mono animate-pulse">Synchronizing performance matrix...</div>
      </div>
    );
  }

  const overallQuestionsSolved = data?.resourceAllocation.reduce((acc, curr) => acc + curr.totalQuestions, 0) || 0;

  return (
    <div className="an-content max-w-7xl mx-auto px-4 py-4 space-y-8 pb-24">
      
      {/* Personalized AI Coach Card */}
      <section className="an-anim an-anim-1">
        <div className="an-card p-6 bg-gradient-to-br from-cyan-500/10 via-[#0a0f26]/40 to-purple-500/10 border-cyan-500/30 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Sparkles size={160} className="text-cyan-400" />
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-2xl flex items-center justify-center text-black font-black shadow-lg shadow-cyan-500/20 shrink-0">
              <Sparkles size={28} className="text-white animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-cyan-500/20 text-cyan-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded">AI Coaching Protocol</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-[10px] text-gray-500 font-mono uppercase">Status Active</span>
              </div>
              <h2 className="text-xl font-bold font-[family-name:var(--font-bebas)] tracking-wider text-foreground">
                JEE Coach Insights & Recommendations
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
                {coachAdvice}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Outcome Predictor & Streaks Column */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 an-anim an-anim-2">
        {/* Estimated JEE Score */}
        <div className="an-card p-6 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-500/20 flex flex-col justify-between min-h-[220px]">
           <div>
             <div className="font-mono text-[9px] text-gray-500 uppercase tracking-widest mb-2">Estimated JEE Score</div>
             <div className="text-6xl font-[family-name:var(--font-bebas)] bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent leading-none mb-1">
                {calculatePredictedScore(data?.accuracy)}
             </div>
             <div className="font-mono text-[9px] text-gray-400 uppercase tracking-widest mb-6">
               / 300 · Probable Percentile: {calculatePercentile(data?.accuracy)}%ile
             </div>
           </div>
           
           <div className="space-y-3">
              <SubjectBar label="PHY" value={data?.accuracy.physics || 0} color="var(--accent)" />
              <SubjectBar label="CHEM" value={data?.accuracy.chemistry || 0} color="var(--purple)" />
              <SubjectBar label="MATH" value={data?.accuracy.mathematics || 0} color="var(--green)" />
           </div>
        </div>

        {/* Consistency Pips */}
        <div className="an-card flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="an-card-title text-orange-400 !mb-0">
                <Flame size={16} className="mr-2" /> Study Streak
              </div>
              <span className="text-[9px] font-mono text-gray-500 uppercase">Last 14 Days</span>
            </div>
            <StudyStreakPips activityMap={data?.activityMap || {}} />
          </div>
          
          <div className="flex justify-between items-end mt-4 pt-4 border-t border-white/[0.03]">
            <div>
              <div className="text-2xl font-[family-name:var(--font-bebas)] text-white leading-none">
                {data?.streak.current || 0} Days
              </div>
              <span className="text-[9px] text-gray-500 font-mono uppercase block mt-1">Current Streak</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-[family-name:var(--font-bebas)] text-orange-400 leading-none">
                {data?.streak.best || 0} Days
              </div>
              <span className="text-[9px] text-gray-500 font-mono uppercase block mt-1">Personal Best</span>
            </div>
          </div>
        </div>

        {/* Mini stats */}
        <div className="flex flex-col gap-4">
          <MiniStat icon={<Clock size={14} />} label="Avg time / question" value={`${data?.globalAvgTimePerQ != null ? data.globalAvgTimePerQ : 0}s`} color="var(--accent)" />
          <MiniStat icon={<Zap size={14} />} label="Total Solved" value={overallQuestionsSolved.toString()} color="var(--purple)" />
          <MiniStat icon={<Target size={14} />} label="Overall Accuracy" value={`${data?.accuracy.overall || 0}%`} color="var(--green)" />
        </div>
      </section>

      {/* Subject Mastery & Trend */}
      <section className="space-y-6 an-anim an-anim-3">
        <div className="an-section-label">Subject Mastery</div>
        <div className="an-gauge-row">
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
              <div className="an-card-sub">Accuracy metrics charted over active solving sessions</div>
            </div>
          </div>
          <div className="an-card-body">
            <PerformanceTrendChart trend={data?.performanceTrend} />
          </div>
        </div>
      </section>

      {/* Chapter Breakdown */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 an-anim an-anim-4">
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
      </section>

      {/* Weak Topics Chips list */}
      <section className="an-card an-anim an-anim-4">
        <div className="an-card-header">
          <div className="an-card-title text-red-400">
            <ZapIcon size={16} className="mr-2" /> Weak Topics List
          </div>
          <div className="an-card-sub">Specific topics with low accuracy that require immediate revision</div>
        </div>
        <div className="an-card-body">
          {data?.weakTopics && data.weakTopics.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {data.weakTopics.map((t, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-white/[0.02] border border-white/[0.05] hover:border-red-500/30 hover:bg-red-500/5 rounded-2xl transition-all">
                  <div className="w-2 h-2 rounded-full" style={{ background: getSubjColor(t.subject) }} />
                  <div className="text-left">
                    <div className="text-[10px] font-bold text-white leading-tight">{t.topic}</div>
                    <div className="text-[8px] text-gray-500 uppercase tracking-widest font-mono mt-0.5">{t.subject} • {t.chapter}</div>
                  </div>
                  <div className="text-xs font-[family-name:var(--font-bebas)] text-red-400 shrink-0 ml-2">
                    {t.accuracy}% Acc
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 font-mono text-xs text-center py-6">No weak topics logged. Keep practicing!</div>
          )}
        </div>
      </section>

      {/* Activity Heatmap */}
      <section className="an-card an-anim an-anim-5">
        <div className="an-card-header">
          <div className="an-card-title">
             <Calendar size={16} className="mr-2" /> Activity Heatmap · {new Date().getFullYear()}
          </div>
          <div className="an-card-sub">Interactive grid of your daily question contributions</div>
        </div>
        <div className="an-card-body">
           <ActivityHeatmap activityMap={data?.activityMap || {}} />
        </div>
      </section>

      {/* Resource Allocation */}
      <section className="an-card an-anim an-anim-5">
         <div className="an-card-header flex items-center justify-between">
            <div>
               <div className="an-card-title">
                  <Table size={16} className="mr-2" /> Resource Allocation Table
               </div>
               <div className="an-card-sub">Time allocation and correctness details segmented by subject</div>
            </div>
            <button 
              onClick={handleExportCSV}
              className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-black rounded-xl text-[10px] uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/10"
            >
               <Download size={12} /> EXPORT DATA
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
                    <tr key={i} className="hover:bg-white/[0.01]">
                       <td>
                          <div className="flex items-center gap-2">
                             <div className="w-2.5 h-2.5 rounded-full" style={{ background: getSubjColor(s.subject) }}></div>
                             <div className="font-bold uppercase tracking-wider text-[11px]">{s.subject}</div>
                          </div>
                       </td>
                       <td className="font-mono text-cyan-400 text-xs">{Math.floor(s.timeSpent / 3600)}h {Math.floor((s.timeSpent % 3600) / 60)}m</td>
                       <td className="font-mono text-xs text-white">{s.totalQuestions}</td>
                       <td className="font-mono text-xs text-white">
                         {s.correctQuestions} <span className="text-gray-500 text-[10px]">({s.accuracy}%)</span>
                       </td>
                       <td className="font-mono text-xs text-gray-400">{Math.floor(s.avgTimePerQ / 60)}m {s.avgTimePerQ % 60}s</td>
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
      </section>

    </div>
  );
}

// --- Sub-components (Reused and polished) ---

function SubjectGauge({ subject, accuracy, color }: { subject: string, accuracy: number, color: string }) {
  const circ = 263.9;
  const offset = circ * (1 - accuracy / 100);

  return (
    <div className="an-gauge-card p-6 flex flex-col items-center">
      <div className="an-gauge-wrap w-24 h-24 mb-4">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
          <circle 
            cx="50" cy="50" r="42" fill="none" 
            stroke={color} strokeWidth="8" 
            strokeDasharray={circ} strokeDashoffset={offset} 
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="an-gauge-center">
          <div className="an-gauge-pct text-lg font-[family-name:var(--font-bebas)]" style={{ color }}>{accuracy}%</div>
        </div>
      </div>
      <div className="an-gauge-subject text-xs font-bold uppercase tracking-widest mb-1 text-white">{subject}</div>
      <div className={`an-gauge-trend flex items-center text-[9px] font-bold uppercase tracking-wider ${accuracy > 70 ? 'text-green-400' : 'text-red-400'}`}>
        {accuracy > 70 ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
        {accuracy > 70 ? 'Mastery' : 'Focus Area'}
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
          <line key={y} x1={pad.l} y1={pad.t + (1 - y/100) * chartH} x2={pad.l + chartW} y2={pad.t + (1 - y/100) * chartH} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        ))}
        {/* Y-axis labels */}
        {[0, 50, 100].map(y => (
          <text key={y} x={10} y={pad.t + (1 - y/100) * chartH + 4} fill="var(--text3)" fontSize="9" fontFamily="DM Mono">{y}%</text>
        ))}

        {/* Fills */}
        <path d={fillPoints(trend.physics)} fill="url(#an-gcyan)" />
        <path d={fillPoints(trend.chemistry)} fill="url(#an-gpurple)" />
        <path d={fillPoints(trend.mathematics)} fill="url(#an-ggreen)" />

        {/* Lines */}
        <polyline points={points(trend.physics)} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={points(trend.chemistry)} fill="none" stroke="var(--purple)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={points(trend.mathematics)} fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* End Dots */}
        <circle cx={pad.l + chartW} cy={pad.t + (1 - (trend.physics[trend.physics.length-1]||50)/100) * chartH} r="4" fill="var(--accent)" stroke="var(--bg2)" strokeWidth="2.5" />
        <circle cx={pad.l + chartW} cy={pad.t + (1 - (trend.chemistry[trend.chemistry.length-1]||50)/100) * chartH} r="4" fill="var(--purple)" stroke="var(--bg2)" strokeWidth="2.5" />
        <circle cx={pad.l + chartW} cy={pad.t + (1 - (trend.mathematics[trend.mathematics.length-1]||50)/100) * chartH} r="4" fill="var(--green)" stroke="var(--bg2)" strokeWidth="2.5" />
      </svg>
      <div className="flex justify-between mt-2 px-10">
        {trend.dates.map((d: string, i: number) => (
           <span key={i} className="text-[8px] font-mono text-gray-500 uppercase">{d.split('-').slice(1).join('/')}</span>
        ))}
      </div>
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded bg-cyan-400"></div><span className="font-mono text-[9px] text-gray-500 uppercase">Physics</span></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded bg-purple-400"></div><span className="font-mono text-[9px] text-gray-500 uppercase">Chemistry</span></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded bg-green-400"></div><span className="font-mono text-[9px] text-gray-500 uppercase">Maths</span></div>
      </div>
    </div>
  );
}

function ChapterList({ chapters, type }: { chapters: any[], type: 'top' | 'weak' }) {
  if (chapters.length === 0) return <div className="text-gray-600 font-mono text-xs text-center py-6">No chapter data logged yet</div>;

  return (
    <div className="an-chapter-list space-y-3">
      {chapters.slice(0, 5).map((c, i) => (
        <div key={i} className="an-chapter-row flex items-center justify-between p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl hover:bg-white/[0.02]">
          <div className={`an-chapter-rank ${type} w-6 h-6 flex items-center justify-center rounded-lg text-xs font-mono font-bold shrink-0 mr-3`}>
            {(i + 1).toString().padStart(2, '0')}
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <div className="an-chapter-name text-xs font-bold text-white truncate">{c.chapter}</div>
            <div className="an-chapter-sub text-[9px] text-gray-500 uppercase font-mono mt-0.5">{c.subject} · {c.total} questions</div>
          </div>
          <div className="an-chapter-bar-wrap w-24 h-1.5 bg-white/5 rounded-full overflow-hidden shrink-0 mr-4 hidden sm:block">
            <div className="an-chapter-bar h-full rounded-full" style={{ width: `${c.accuracy}%`, background: getSubjColor(c.subject) }}></div>
          </div>
          <div className="an-chapter-score text-xs font-[family-name:var(--font-bebas)] shrink-0 w-10 text-right mr-3" style={{ color: getSubjColor(c.subject) }}>
            {c.accuracy}%
          </div>
          <span className={`badge-pill text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${c.accuracy > 90 ? 'bg-green/10 text-green border border-green/20' : c.accuracy > 75 ? 'bg-blue/10 text-blue border border-blue/20' : c.accuracy > 50 ? 'bg-orange/10 text-orange border border-orange/20' : 'bg-red/10 text-red border border-red/20'}`}>
            {c.accuracy > 90 ? 'Master' : c.accuracy > 75 ? 'Strong' : c.accuracy > 50 ? 'Average' : 'Critical'}
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
    <div className="grid grid-cols-7 gap-y-3 gap-x-2 p-2">
      {pips.map((p, i) => (
        <div key={i} className="an-streak-day flex flex-col items-center">
          <div className="an-streak-day-name text-[8px] text-gray-500 font-mono mb-1">{p.name}</div>
          <div className={`an-streak-pip w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${p.isToday ? 'border border-cyan-400 text-cyan-400 bg-cyan-400/5' : p.done ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-gray-600'}`}>
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
            <div key={i} className={`an-hm-cell an-hm-${l}`} title={`Contribution Level ${l}`} />
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
      <div className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl hover:border-white/[0.08] transition-all">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5" style={{ color }}>{icon}</div>
            <div className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">{label}</div>
         </div>
         <div className="font-[family-name:var(--font-bebas)] text-xl text-white">{value}</div>
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

function calculatePredictedScore(accuracy: any) {
   if (!accuracy) return '—';
   const total = 300;
   const avgAcc = accuracy.overall / 100;
   return Math.round(total * avgAcc * 0.95); 
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
