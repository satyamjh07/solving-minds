'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Award, BookOpen, Layers, TrendingUp, BookOpenCheck, FileText } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { PreCalculatedAnalytics, SubjectStats, ChapterStats, DifficultyBucket, QuestionRow } from '../analyticsHelper';

interface PrintDashboardProps {
  stats: PreCalculatedAnalytics;
  attemptId: string;
  testTitle: string;
  examType: string;
  attemptDate: string;
}

export default function PrintDashboard({
  stats,
  attemptId,
  testTitle,
  examType,
  attemptDate
}: PrintDashboardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      window.print();
    }, 1500); // Allow charts to render completely without animation
    return () => clearTimeout(timer);
  }, []);

  const formatSeconds = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Static colors for clean light-mode printing
  const colors = {
    accent: '#2563eb', // Indigo Blue
    accentLight: '#60a5fa',
    green: '#10b981', // Emerald Green
    red: '#ef4444', // Crimson Red
    orange: '#f97316', // Orange
    purple: '#8b5cf6', // Violet
    text: '#0f172a', // Slate 900
    textMuted: '#475569', // Slate 600
    border: '#e2eaf4',
    bg: '#f8fafc'
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-8 font-mono uppercase text-xs">
        Preparing print layout...
      </div>
    );
  }

  const PageHeader = ({ pageNum }: { pageNum: number }) => (
    <div className="border-b-2 border-blue-600 pb-3 mb-6 flex justify-between items-end">
      <div>
        <h2 className="text-[10px] font-mono font-bold tracking-widest text-blue-600 uppercase">
          SOLVINGMINDS TEST ANALYSIS REPORT
        </h2>
        <h1 className="text-sm font-black text-slate-800 tracking-tight mt-0.5">{testTitle}</h1>
      </div>
      <div className="text-right text-[9px] font-mono text-slate-500 uppercase">
        <div>Attempt: {attemptId}</div>
        <div>Page {pageNum} of 9</div>
      </div>
    </div>
  );

  const PageFooter = () => (
    <div className="border-t border-slate-200 pt-3 mt-6 flex justify-between items-center text-[9px] font-mono text-slate-400">
      <span>Factual performance statistics compiled on SolvingMinds. Searchable vector print layout.</span>
      <span>SolvingMinds © 2026</span>
    </div>
  );

  return (
    <div className="bg-white text-slate-900 font-sans p-6 max-w-4xl mx-auto space-y-16 print:space-y-0 print:p-0">
      {/* GLOBAL PRINT STYLES */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        @media print {
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: 'Inter', system-ui, sans-serif !important;
            font-size: 11px;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print-page {
            page-break-after: always !important;
            break-after: page !important;
            height: 297mm; /* Full A4 height */
            box-sizing: border-box;
            padding: 15mm 10mm !important;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .recharts-responsive-container {
            width: 100% !important;
            height: 250px !important;
          }
        }
        .print-page {
          background: white;
          padding: 20px;
          border: 1px solid #e2eaf4;
          border-radius: 12px;
          min-height: 297mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: 'Inter', system-ui, sans-serif;
        }
      `}</style>

      {/* PAGE 1: OVERVIEW */}
      <div className="print-page">
        <div>
          <PageHeader pageNum={1} />
          
          <div className="space-y-6">
            <h2 className="text-md font-bold tracking-tight text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Award size={18} className="text-blue-600" /> 1. Performance Overview
            </h2>

            <div className="grid grid-cols-3 gap-6">
              {/* Score ring stats */}
              <div className="border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-mono text-slate-500 uppercase font-bold mb-2">Total Score Card</span>
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle cx="56" cy="56" r="48" className="stroke-slate-100" strokeWidth="8" fill="transparent" />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      className="stroke-blue-600"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 * (1 - Math.max(0, Math.min(100, (stats.overview.totalScore / stats.overview.maxScore))))}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black text-slate-800">{stats.overview.totalScore}</span>
                    <span className="text-[8px] font-mono text-slate-400">/ {stats.overview.maxScore}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full mt-3 pt-3 border-t border-slate-100 text-[10px] font-mono">
                  <div>
                    <span className="text-slate-400 uppercase text-[8px] block">Positive</span>
                    <span className="font-bold text-emerald-600">+{stats.overview.positiveMarks}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[8px] block">Negative</span>
                    <span className="font-bold text-red-500">-{stats.overview.negativeMarks}</span>
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4">
                  <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block mb-1">Accuracy</span>
                  <span className="text-2xl font-black text-emerald-600">{stats.overview.accuracy}%</span>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${stats.overview.accuracy}%` }} />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4">
                  <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block mb-1">Time Taken</span>
                  <span className="text-lg font-black text-slate-850 block">{formatSeconds(stats.overview.timeTaken)}</span>
                  <span className="text-[9px] text-slate-400 font-mono mt-1 block">Avg pace: {formatSeconds(stats.timeAnalysis.avgTimePerQuestion)}/q</span>
                </div>

                <div className="border border-slate-200 rounded-xl p-4">
                  <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block mb-1">Attempt Rate</span>
                  <span className="text-2xl font-black text-blue-600">
                    {Math.round((stats.overview.questionsAttempted / (stats.overview.questionsAttempted + stats.overview.questionsUnattempted)) * 100)}%
                  </span>
                  <span className="text-[9px] text-slate-400 block font-mono">{stats.overview.questionsAttempted} / {stats.overview.questionsAttempted + stats.overview.questionsUnattempted} Qs</span>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[8px] font-mono text-slate-400 uppercase block">Correct</span>
                    <span className="text-sm font-bold text-emerald-600 block mt-1">{stats.overview.questionsCorrect}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-mono text-slate-400 uppercase block">Incorrect</span>
                    <span className="text-sm font-bold text-red-500 block mt-1">{stats.overview.questionsIncorrect}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-mono text-slate-400 uppercase block">Skipped</span>
                    <span className="text-sm font-bold text-slate-500 block mt-1">{stats.overview.questionsUnattempted}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <PageFooter />
      </div>

      {/* PAGE 2: SUBJECT ANALYSIS */}
      <div className="print-page">
        <div>
          <PageHeader pageNum={2} />
          <div className="space-y-6">
            <h2 className="text-md font-bold tracking-tight text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <BookOpen size={18} className="text-blue-600" /> 2. Subject-wise Analysis
            </h2>

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-3">
                {stats.subjects.map((sub: SubjectStats) => (
                  <div key={sub.subjectName} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-850 mb-1">{sub.subjectName}</h3>
                      <div className="grid grid-cols-3 gap-4 text-[10px] font-mono">
                        <div>
                          <span className="text-slate-400 uppercase text-[8px] block">Score</span>
                          <span className="font-bold text-slate-700">{sub.score} / {sub.maxMarks}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase text-[8px] block">Correct</span>
                          <span className="font-bold text-emerald-600">{sub.questionsCorrect}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase text-[8px] block">Wrong</span>
                          <span className="font-bold text-red-500">{sub.questionsIncorrect}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-mono text-slate-400 uppercase block">Accuracy</span>
                      <span className="text-base font-black text-blue-600">{sub.accuracy}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block border-b border-slate-100 pb-2 mb-2">Accuracy Compare</span>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.subjects} margin={{ top: 10, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                      <XAxis dataKey="subjectName" stroke={colors.textMuted} fontSize={8} tickFormatter={v => v.substring(0, 4).toUpperCase()} />
                      <YAxis stroke={colors.textMuted} fontSize={8} domain={[0, 100]} />
                      <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                        {stats.subjects.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={idx === 0 ? colors.accent : idx === 1 ? colors.purple : colors.orange} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
        <PageFooter />
      </div>

      {/* PAGE 3: CHAPTER ANALYSIS */}
      <div className="print-page">
        <div>
          <PageHeader pageNum={3} />
          <div className="space-y-6">
            <h2 className="text-md font-bold tracking-tight text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Layers size={18} className="text-blue-600" /> 3. Chapter-wise Coverage
            </h2>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-[10px] font-mono">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-550/5 text-slate-500 uppercase tracking-wider text-[8px]">
                    <th className="py-2.5 px-4">Chapter Name</th>
                    <th className="py-2.5 px-2">Subject</th>
                    <th className="py-2.5 px-2 text-center">Seen</th>
                    <th className="py-2.5 px-2 text-center">Attempted</th>
                    <th className="py-2.5 px-2 text-center">Accuracy</th>
                    <th className="py-2.5 px-2 text-center">Gained</th>
                    <th className="py-2.5 px-2 text-center">Lost</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {stats.chapters.slice(0, 18).map((c: ChapterStats) => (
                    <tr key={`${c.subject}_${c.chapterName}`}>
                      <td className="py-2 px-4 font-bold text-slate-800 font-sans">{c.chapterName}</td>
                      <td className="py-2 px-2 uppercase text-[8px]">{c.subject}</td>
                      <td className="py-2 px-2 text-center">{c.questionsSeen}</td>
                      <td className="py-2 px-2 text-center">{c.questionsAttempted}</td>
                      <td className="py-2 px-2 text-center font-bold">{c.questionsAttempted > 0 ? `${c.accuracy}%` : '-'}</td>
                      <td className="py-2 px-2 text-center text-emerald-600">+{c.marksGained}</td>
                      <td className="py-2 px-2 text-center text-red-500">{c.marksLost}</td>
                      <td className="py-2 px-4 text-right uppercase text-[8px] font-bold">
                        <span className={c.status === 'strong' ? 'text-emerald-650' : c.status === 'average' ? 'text-blue-600' : 'text-red-500'}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <PageFooter />
      </div>

      {/* PAGE 4: DIFFICULTY & ATTEMPT */}
      <div className="print-page">
        <div>
          <PageHeader pageNum={4} />
          <div className="space-y-6">
            <h2 className="text-md font-bold tracking-tight text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <TrendingUp size={18} className="text-blue-600" /> 4. Difficulty &amp; Pacing Analytics
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div className="border border-slate-200 rounded-xl p-4">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block mb-3 border-b border-slate-100 pb-2">Difficulty Accuracy</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.difficulties} margin={{ top: 10, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                      <XAxis dataKey="name" stroke={colors.textMuted} fontSize={8} />
                      <YAxis stroke={colors.textMuted} fontSize={8} domain={[0, 100]} />
                      <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                        {stats.difficulties.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.name === 'Easy' ? colors.green : entry.name === 'Moderate' ? colors.orange : colors.red} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block mb-3 border-b border-slate-100 pb-2">Attempt Profile</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Perf', count: stats.attempts.overall.perfect },
                        { name: 'Wast', count: stats.attempts.overall.wasted },
                        { name: 'Ot C', count: stats.attempts.overall.overtimeCorrect },
                        { name: 'Ot W', count: stats.attempts.overall.overtimeMistake },
                        { name: 'Conf', count: stats.attempts.overall.confused }
                      ]}
                      margin={{ top: 10, right: 5, bottom: 5, left: -20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                      <XAxis dataKey="name" stroke={colors.textMuted} fontSize={8} />
                      <YAxis stroke={colors.textMuted} fontSize={8} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                        {[
                          { color: colors.green },
                          { color: colors.red },
                          { color: colors.accent },
                          { color: colors.orange },
                          { color: colors.purple }
                        ].map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-[8px] font-mono text-slate-400 uppercase block font-bold">Perfect Attempts</span>
                <span className="text-base font-black text-emerald-600 block mt-1">{stats.attempts.overall.perfect} Qs</span>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-[8px] font-mono text-slate-400 uppercase block font-bold">Wasted Attempts</span>
                <span className="text-base font-black text-red-500 block mt-1">{stats.attempts.overall.wasted} Qs</span>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-[8px] font-mono text-slate-400 uppercase block font-bold">Confused Skips</span>
                <span className="text-base font-black text-purple-600 block mt-1">{stats.attempts.overall.confused} Qs</span>
              </div>
            </div>
          </div>
        </div>
        <PageFooter />
      </div>

      {/* PAGE 5: TIME PACING */}
      <div className="print-page">
        <div>
          <PageHeader pageNum={5} />
          <div className="space-y-6">
            <h2 className="text-md font-bold tracking-tight text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Clock size={18} className="text-blue-600" /> 5. Time Insights &amp; Pacing Extremes
            </h2>

            <div className="grid grid-cols-3 gap-6">
              <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block mb-4">Time spent per Subject</span>
                <div className="h-40 w-full flex justify-center items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.timeAnalysis.subjectTimeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={55}
                        paddingAngle={5}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {stats.timeAnalysis.subjectTimeDistribution.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={idx === 0 ? colors.accent : idx === 1 ? colors.purple : colors.orange} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="col-span-2 border border-slate-200 rounded-xl p-4">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block mb-3 border-b border-slate-100 pb-2">Time Spent vs Accuracy</span>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.timeAnalysis.timeSpentVsAccuracy} margin={{ top: 10, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                      <XAxis dataKey="bucketName" stroke={colors.textMuted} fontSize={8} />
                      <YAxis stroke={colors.textMuted} fontSize={8} domain={[0, 100]} />
                      <Bar dataKey="accuracy" fill={colors.accent} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="border border-slate-200 rounded-xl p-4">
                <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold mb-2">Fastest Solved Correct</span>
                <ul className="space-y-1.5 text-[9px] font-mono text-slate-600">
                  {stats.timeAnalysis.fastestSolved.slice(0, 3).map((f, idx) => (
                    <li key={idx} className="flex justify-between border-b border-slate-100 pb-1">
                      <span>Q.{f.questionNumber} ({f.subject.toUpperCase()})</span>
                      <span className="text-emerald-600 font-bold">{formatSeconds(f.timeTaken)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold mb-2">Slowest Solved Attempted</span>
                <ul className="space-y-1.5 text-[9px] font-mono text-slate-600">
                  {stats.timeAnalysis.slowestSolved.slice(0, 3).map((s, idx) => (
                    <li key={idx} className="flex justify-between border-b border-slate-100 pb-1">
                      <span>Q.{s.questionNumber} ({s.subject.toUpperCase()})</span>
                      <span className="text-orange-650 font-bold">{formatSeconds(s.timeTaken)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <PageFooter />
      </div>

      {/* PAGE 6: QUESTION JOURNEY */}
      <div className="print-page">
        <div>
          <PageHeader pageNum={6} />
          <div className="space-y-6">
            <h2 className="text-md font-bold tracking-tight text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <FileText size={18} className="text-blue-600" /> 6. Question Journey Palette
            </h2>

            <div className="border border-slate-200 rounded-2xl p-6">
              <div className="grid grid-cols-10 gap-3">
                {stats.questionJourney.map((j) => {
                  let statusBg = 'bg-slate-100 border-slate-200 text-slate-500';
                  if (j.status === 'correct') {
                    statusBg = 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold';
                  } else if (j.status === 'incorrect') {
                    statusBg = 'bg-red-55/10 border-red-200 text-red-600 font-bold';
                  } else if (j.status === 'marked') {
                    statusBg = 'bg-amber-50 border-amber-300 text-amber-600 font-bold';
                  }
                  return (
                    <div
                      key={j.id}
                      className={`h-10 rounded-xl border flex flex-col items-center justify-center text-xs font-mono ${statusBg}`}
                    >
                      {j.questionNumber}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <PageFooter />
      </div>

      {/* PAGE 7: QUESTION LOG 1 */}
      <div className="print-page">
        <div>
          <PageHeader pageNum={7} />
          <div className="space-y-6">
            <h2 className="text-md font-bold tracking-tight text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Layers size={18} className="text-blue-600" /> 7. Detailed Question Log (Part 1)
            </h2>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-[9px] font-mono">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-55/5 text-slate-500 uppercase tracking-wider text-[8px]">
                    <th className="py-2 px-3 text-center">No.</th>
                    <th className="py-2 px-2">Subject</th>
                    <th className="py-2 px-2">Chapter</th>
                    <th className="py-2 px-2 text-center">Difficulty</th>
                    <th className="py-2 px-2 text-center">Time Spent</th>
                    <th className="py-2 px-2 text-center">Status</th>
                    <th className="py-2 px-2 text-center">Marks</th>
                    <th className="py-2 px-2 text-center">Response</th>
                    <th className="py-2 px-3 text-center">Correct Key</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650">
                  {stats.questionByQuestion.slice(0, 30).map((q: QuestionRow) => (
                    <tr key={q.id}>
                      <td className="py-1.5 px-3 text-center font-bold text-slate-800">{q.questionNumber}</td>
                      <td className="py-1.5 px-2 uppercase text-[7px]">{q.subject}</td>
                      <td className="py-1.5 px-2 font-sans text-slate-800 truncate max-w-[150px]">{q.chapter}</td>
                      <td className="py-1.5 px-2 text-center font-sans text-[8px]">{q.difficulty}</td>
                      <td className="py-1.5 px-2 text-center">{formatSeconds(q.timeTaken)}</td>
                      <td className={`py-1.5 px-2 text-center ${q.attemptStatus === 'Correct' ? 'text-emerald-600 font-bold' : q.attemptStatus === 'Incorrect' ? 'text-red-500 font-bold' : ''}`}>{q.attemptStatus}</td>
                      <td className="py-1.5 px-2 text-center font-bold">{q.attemptStatus === 'Correct' ? `+${q.marksAwarded}` : q.attemptStatus === 'Incorrect' ? `-1` : '0'}</td>
                      <td className="py-1.5 px-2 text-center font-bold text-slate-800">{q.studentResponse}</td>
                      <td className="py-1.5 px-3 text-center font-bold text-emerald-600">{q.correctAnswer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <PageFooter />
      </div>

      {/* PAGE 8: QUESTION LOG 2 */}
      <div className="print-page">
        <div>
          <PageHeader pageNum={8} />
          <div className="space-y-6">
            <h2 className="text-md font-bold tracking-tight text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Layers size={18} className="text-blue-600" /> 8. Detailed Question Log (Part 2)
            </h2>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-[9px] font-mono">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-55/5 text-slate-500 uppercase tracking-wider text-[8px]">
                    <th className="py-2 px-3 text-center">No.</th>
                    <th className="py-2 px-2">Subject</th>
                    <th className="py-2 px-2">Chapter</th>
                    <th className="py-2 px-2 text-center">Difficulty</th>
                    <th className="py-2 px-2 text-center">Time Spent</th>
                    <th className="py-2 px-2 text-center">Status</th>
                    <th className="py-2 px-2 text-center">Marks</th>
                    <th className="py-2 px-2 text-center">Response</th>
                    <th className="py-2 px-3 text-center">Correct Key</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650">
                  {stats.questionByQuestion.slice(30, 65).map((q: QuestionRow) => (
                    <tr key={q.id}>
                      <td className="py-1.5 px-3 text-center font-bold text-slate-800">{q.questionNumber}</td>
                      <td className="py-1.5 px-2 uppercase text-[7px]">{q.subject}</td>
                      <td className="py-1.5 px-2 font-sans text-slate-800 truncate max-w-[150px]">{q.chapter}</td>
                      <td className="py-1.5 px-2 text-center font-sans text-[8px]">{q.difficulty}</td>
                      <td className="py-1.5 px-2 text-center">{formatSeconds(q.timeTaken)}</td>
                      <td className={`py-1.5 px-2 text-center ${q.attemptStatus === 'Correct' ? 'text-emerald-600 font-bold' : q.attemptStatus === 'Incorrect' ? 'text-red-500 font-bold' : ''}`}>{q.attemptStatus}</td>
                      <td className="py-1.5 px-2 text-center font-bold">{q.attemptStatus === 'Correct' ? `+${q.marksAwarded}` : q.attemptStatus === 'Incorrect' ? `-1` : '0'}</td>
                      <td className="py-1.5 px-2 text-center font-bold text-slate-800">{q.studentResponse}</td>
                      <td className="py-1.5 px-3 text-center font-bold text-emerald-600">{q.correctAnswer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <PageFooter />
      </div>

      {/* PAGE 9: QUESTION LOG 3 & SCORE MOVEMENT */}
      <div className="print-page">
        <div>
          <PageHeader pageNum={9} />
          <div className="space-y-6">
            <h2 className="text-md font-bold tracking-tight text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <TrendingUp size={18} className="text-blue-600" /> 9. Cumulative Score Progression &amp; Log End
            </h2>

            <div className="border border-slate-200 rounded-xl p-4">
              <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block mb-3 border-b border-slate-100 pb-2">Subject Cumulative Score Progression</span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.subjectMovement} margin={{ top: 10, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                    <XAxis dataKey="questionNumber" stroke={colors.textMuted} fontSize={8} />
                    <YAxis stroke={colors.textMuted} fontSize={8} />
                    <Legend verticalAlign="top" height={24} fontSize={8} />
                    <Line type="monotone" dataKey="physicsScore" name="Physics" stroke={colors.accent} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="chemistryScore" name="Chemistry" stroke={colors.orange} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="mathScore" name="Maths" stroke={colors.purple} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="totalScore" name="Total" stroke={colors.text} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Remaining questions from log if total questions > 65 */}
            {stats.questionByQuestion.length > 65 && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden mt-4">
                <table className="w-full text-left border-collapse text-[9px] font-mono">
                  <tbody className="divide-y divide-slate-100 text-slate-650">
                    {stats.questionByQuestion.slice(65).map((q: QuestionRow) => (
                      <tr key={q.id}>
                        <td className="py-1 px-3 text-center font-bold text-slate-800 w-12">{q.questionNumber}</td>
                        <td className="py-1 px-2 uppercase text-[7px] w-20">{q.subject}</td>
                        <td className="py-1 px-2 font-sans text-slate-800 truncate max-w-[150px]">{q.chapter}</td>
                        <td className="py-1 px-2 text-center font-sans text-[8px] w-20">{q.difficulty}</td>
                        <td className="py-1 px-2 text-center w-20">{formatSeconds(q.timeTaken)}</td>
                        <td className={`py-1 px-2 text-center w-20 ${q.attemptStatus === 'Correct' ? 'text-emerald-600 font-bold' : q.attemptStatus === 'Incorrect' ? 'text-red-500 font-bold' : ''}`}>{q.attemptStatus}</td>
                        <td className="py-1 px-2 text-center font-bold w-12">{q.attemptStatus === 'Correct' ? `+${q.marksAwarded}` : q.attemptStatus === 'Incorrect' ? `-1` : '0'}</td>
                        <td className="py-1 px-2 text-center font-bold text-slate-800 w-16">{q.studentResponse}</td>
                        <td className="py-1 px-3 text-center font-bold text-emerald-600 w-16">{q.correctAnswer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <PageFooter />
      </div>
    </div>
  );
}
