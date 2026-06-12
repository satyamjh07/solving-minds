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
    accent: '#2563eb',
    accentLight: '#60a5fa',
    green: '#10b981',
    red: '#ef4444',
    orange: '#f97316',
    purple: '#8b5cf6',
    text: '#0f172a',
    textMuted: '#475569',
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

  return (
    <div className="pr-report">
      {/* ── PRINT STYLES ── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        /* ── Page setup ── */
        @page {
          size: A4;
          margin: 12mm 10mm 14mm 10mm;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #0f172a !important;
            font-family: 'Inter', system-ui, sans-serif !important;
            font-size: 10px !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          /* Hide everything except the report */
          body > *:not(.pr-report):not(script):not(style) { display: none !important; }

          .pr-report {
            padding: 0 !important;
            border: none !important;
            max-width: none !important;
          }

          /* ── CRITICAL: No forced page breaks, no fixed heights ── */
          .pr-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Allow tables to flow across pages naturally */
          .pr-table-flow {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .pr-table-flow thead {
            display: table-header-group;
          }
          .pr-table-flow tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Keep chart cards together */
          .pr-chart-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Recharts: cap height and force vector rendering */
          .recharts-responsive-container {
            width: 100% !important;
          }
          .recharts-surface {
            max-width: 100% !important;
          }

          /* Report footer only at end */
          .pr-end-footer {
            margin-top: 2rem;
          }
        }

        /* ── Screen preview styles ── */
        .pr-report {
          font-family: 'Inter', system-ui, sans-serif;
          background: white;
          color: #0f172a;
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
        }

        /* ── Shared styles ── */
        .pr-report-header {
          border-bottom: 2px solid #2563eb;
          padding-bottom: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .pr-section {
          margin-bottom: 16px;
        }
        .pr-section-title {
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 6px;
          margin-bottom: 10px;
          letter-spacing: 0.02em;
        }
        .pr-card {
          border: 1px solid #e2eaf4;
          border-radius: 8px;
          padding: 10px;
        }
        .pr-label {
          font-size: 7px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          display: block;
          margin-bottom: 3px;
        }
        .pr-big {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .pr-small {
          font-size: 8px;
          color: #64748b;
        }
        .pr-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .pr-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .pr-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }

        /* Table styles */
        .pr-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8px;
        }
        .pr-table th {
          text-align: left;
          padding: 5px 6px;
          font-size: 7px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2eaf4;
          background: #f8fafc;
        }
        .pr-table td {
          padding: 4px 6px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
        }
        .pr-table tr:last-child td { border-bottom: none; }

        /* Chart container */
        .pr-chart-card {
          border: 1px solid #e2eaf4;
          border-radius: 8px;
          padding: 10px;
        }
        .pr-chart-label {
          font-size: 7px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 4px;
          margin-bottom: 6px;
        }
      `}</style>

      {/* ══════════ REPORT HEADER ══════════ */}
      <div className="pr-report-header">
        <div>
          <div style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', color: '#2563eb', textTransform: 'uppercase' as const }}>
            SolvingMinds Test Analysis Report
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{testTitle}</div>
          <div style={{ fontSize: '8px', color: '#64748b', marginTop: 2 }}>
            {formatDate(attemptDate)} · {examType.toUpperCase()} · Attempt {attemptId.slice(0, 8)}
          </div>
        </div>
        <div style={{ fontSize: '8px', color: '#94a3b8', textAlign: 'right' as const }}>
          SolvingMinds © 2026
        </div>
      </div>

      {/* ══════════ 1. PERFORMANCE OVERVIEW ══════════ */}
      <div className="pr-section">
        <div className="pr-section-title">
          <Award size={13} color="#2563eb" /> 1. Performance Overview
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '10px' }}>
          {/* Score ring */}
          <div className="pr-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span className="pr-label" style={{ textAlign: 'center' as const }}>Total Score</span>
            <div style={{ position: 'relative', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="40" cy="40" r="34" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                <circle
                  cx="40" cy="40" r="34"
                  stroke="#2563eb" strokeWidth="6" fill="transparent"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 * (1 - Math.max(0, Math.min(1, stats.overview.totalScore / stats.overview.maxScore)))}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' as const }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{stats.overview.totalScore}</div>
                <div style={{ fontSize: 7, color: '#94a3b8' }}>/ {stats.overview.maxScore}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', marginTop: 6, paddingTop: 6, borderTop: '1px solid #f1f5f9', fontSize: 8, textAlign: 'center' as const }}>
              <div>
                <span style={{ fontSize: 7, color: '#94a3b8', display: 'block' }}>POSITIVE</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>+{stats.overview.positiveMarks}</span>
              </div>
              <div>
                <span style={{ fontSize: 7, color: '#94a3b8', display: 'block' }}>NEGATIVE</span>
                <span style={{ fontWeight: 700, color: '#ef4444' }}>-{stats.overview.negativeMarks}</span>
              </div>
            </div>
          </div>

          {/* KPIs grid */}
          <div className="pr-grid-2" style={{ alignContent: 'start' }}>
            <div className="pr-card">
              <span className="pr-label">Accuracy</span>
              <span className="pr-big" style={{ color: '#10b981' }}>{stats.overview.accuracy}%</span>
              <div style={{ width: '100%', background: '#f1f5f9', height: 4, borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
                <div style={{ width: `${stats.overview.accuracy}%`, background: '#10b981', height: '100%', borderRadius: 99 }} />
              </div>
            </div>
            <div className="pr-card">
              <span className="pr-label">Time Taken</span>
              <span className="pr-big">{formatSeconds(stats.overview.timeTaken)}</span>
              <span className="pr-small">Avg pace: {formatSeconds(stats.timeAnalysis.avgTimePerQuestion)}/q</span>
            </div>
            <div className="pr-card">
              <span className="pr-label">Attempt Rate</span>
              <span className="pr-big" style={{ color: '#2563eb' }}>
                {Math.round((stats.overview.questionsAttempted / (stats.overview.questionsAttempted + stats.overview.questionsUnattempted)) * 100)}%
              </span>
              <span className="pr-small">{stats.overview.questionsAttempted} / {stats.overview.questionsAttempted + stats.overview.questionsUnattempted} Qs</span>
            </div>
            <div className="pr-card">
              <div className="pr-grid-3" style={{ textAlign: 'center' as const }}>
                <div>
                  <span className="pr-label">Correct</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981', display: 'block' }}>{stats.overview.questionsCorrect}</span>
                </div>
                <div>
                  <span className="pr-label">Wrong</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', display: 'block' }}>{stats.overview.questionsIncorrect}</span>
                </div>
                <div>
                  <span className="pr-label">Skipped</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#64748b', display: 'block' }}>{stats.overview.questionsUnattempted}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ 2. SUBJECT ANALYSIS ══════════ */}
      <div className="pr-section">
        <div className="pr-section-title">
          <BookOpen size={13} color="#2563eb" /> 2. Subject-wise Analysis
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.subjects.map((sub: SubjectStats) => (
              <div key={sub.subjectName} className="pr-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{sub.subjectName}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 8, color: '#64748b', marginTop: 2 }}>
                    <span>Score: <b style={{ color: '#0f172a' }}>{sub.score}/{sub.maxMarks}</b></span>
                    <span>Correct: <b style={{ color: '#10b981' }}>{sub.questionsCorrect}</b></span>
                    <span>Wrong: <b style={{ color: '#ef4444' }}>{sub.questionsIncorrect}</b></span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <span className="pr-label">Accuracy</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#2563eb' }}>{sub.accuracy}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pr-chart-card">
            <div className="pr-chart-label">Accuracy Compare</div>
            <div style={{ height: 130, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.subjects} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                  <XAxis dataKey="subjectName" stroke={colors.textMuted} fontSize={7} tickFormatter={v => v.substring(0, 4).toUpperCase()} />
                  <YAxis stroke={colors.textMuted} fontSize={7} domain={[0, 100]} />
                  <Bar dataKey="accuracy" radius={[3, 3, 0, 0]} isAnimationActive={false}>
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

      {/* ══════════ 3. CHAPTER ANALYSIS ══════════ */}
      <div className="pr-section">
        <div className="pr-section-title">
          <Layers size={13} color="#2563eb" /> 3. Chapter-wise Coverage
        </div>
        <div style={{ border: '1px solid #e2eaf4', borderRadius: 8, overflow: 'hidden' }}>
          <table className="pr-table pr-table-flow">
            <thead>
              <tr>
                <th style={{ paddingLeft: 8 }}>Chapter</th>
                <th>Subject</th>
                <th style={{ textAlign: 'center' }}>Seen</th>
                <th style={{ textAlign: 'center' }}>Tried</th>
                <th style={{ textAlign: 'center' }}>Accuracy</th>
                <th style={{ textAlign: 'center' }}>Gained</th>
                <th style={{ textAlign: 'center' }}>Lost</th>
                <th style={{ textAlign: 'right', paddingRight: 8 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.chapters.map((c: ChapterStats) => (
                <tr key={`${c.subject}_${c.chapterName}`}>
                  <td style={{ paddingLeft: 8, fontWeight: 600, color: '#0f172a' }}>{c.chapterName}</td>
                  <td style={{ fontSize: 7, textTransform: 'uppercase' }}>{c.subject}</td>
                  <td style={{ textAlign: 'center' }}>{c.questionsSeen}</td>
                  <td style={{ textAlign: 'center' }}>{c.questionsAttempted}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{c.questionsAttempted > 0 ? `${c.accuracy}%` : '-'}</td>
                  <td style={{ textAlign: 'center', color: '#10b981' }}>+{c.marksGained}</td>
                  <td style={{ textAlign: 'center', color: '#ef4444' }}>{c.marksLost}</td>
                  <td style={{ textAlign: 'right', paddingRight: 8, fontSize: 7, fontWeight: 700, textTransform: 'uppercase' as const, color: c.status === 'strong' ? '#10b981' : c.status === 'average' ? '#2563eb' : '#ef4444' }}>
                    {c.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════ 4. DIFFICULTY & ATTEMPT ANALYTICS ══════════ */}
      <div className="pr-section">
        <div className="pr-section-title">
          <TrendingUp size={13} color="#2563eb" /> 4. Difficulty &amp; Pacing Analytics
        </div>

        <div className="pr-grid-2">
          <div className="pr-chart-card">
            <div className="pr-chart-label">Difficulty Accuracy</div>
            <div style={{ height: 120, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.difficulties} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                  <XAxis dataKey="name" stroke={colors.textMuted} fontSize={7} />
                  <YAxis stroke={colors.textMuted} fontSize={7} domain={[0, 100]} />
                  <Bar dataKey="accuracy" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {stats.difficulties.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.name === 'Easy' ? colors.green : entry.name === 'Moderate' ? colors.orange : colors.red} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pr-chart-card">
            <div className="pr-chart-label">Attempt Profile</div>
            <div style={{ height: 120, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Perf', count: stats.attempts.overall.perfect },
                    { name: 'Wast', count: stats.attempts.overall.wasted },
                    { name: 'Ot C', count: stats.attempts.overall.overtimeCorrect },
                    { name: 'Ot W', count: stats.attempts.overall.overtimeMistake },
                    { name: 'Conf', count: stats.attempts.overall.confused }
                  ]}
                  margin={{ top: 5, right: 5, bottom: 0, left: -25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                  <XAxis dataKey="name" stroke={colors.textMuted} fontSize={7} />
                  <YAxis stroke={colors.textMuted} fontSize={7} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {[colors.green, colors.red, colors.accent, colors.orange, colors.purple].map((color, idx) => (
                      <Cell key={`cell-${idx}`} fill={color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="pr-grid-3" style={{ marginTop: 8 }}>
          <div className="pr-card" style={{ textAlign: 'center' }}>
            <span className="pr-label">Perfect Attempts</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#10b981', display: 'block', marginTop: 2 }}>{stats.attempts.overall.perfect} Qs</span>
          </div>
          <div className="pr-card" style={{ textAlign: 'center' }}>
            <span className="pr-label">Wasted Attempts</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#ef4444', display: 'block', marginTop: 2 }}>{stats.attempts.overall.wasted} Qs</span>
          </div>
          <div className="pr-card" style={{ textAlign: 'center' }}>
            <span className="pr-label">Confused Skips</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#8b5cf6', display: 'block', marginTop: 2 }}>{stats.attempts.overall.confused} Qs</span>
          </div>
        </div>
      </div>

      {/* ══════════ 5. TIME INSIGHTS ══════════ */}
      <div className="pr-section">
        <div className="pr-section-title">
          <Clock size={13} color="#2563eb" /> 5. Time Insights &amp; Pacing
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10 }}>
          <div className="pr-chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="pr-chart-label" style={{ width: '100%' }}>Time per Subject</div>
            <div style={{ height: 110, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.timeAnalysis.subjectTimeDistribution}
                    cx="50%" cy="50%"
                    innerRadius={30} outerRadius={42}
                    paddingAngle={5} dataKey="value"
                    isAnimationActive={false}
                  >
                    {stats.timeAnalysis.subjectTimeDistribution.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={idx === 0 ? colors.accent : idx === 1 ? colors.purple : colors.orange} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 7, color: '#64748b', textAlign: 'center', marginTop: 2 }}>
              {stats.timeAnalysis.subjectTimeDistribution.map((d, i) => (
                <span key={i} style={{ display: 'inline-block', marginRight: 6 }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 2, background: i === 0 ? colors.accent : i === 1 ? colors.purple : colors.orange, marginRight: 2, verticalAlign: 'middle' }} />
                  {d.name}
                </span>
              ))}
            </div>
          </div>

          <div className="pr-chart-card">
            <div className="pr-chart-label">Time Spent vs Accuracy</div>
            <div style={{ height: 110, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.timeAnalysis.timeSpentVsAccuracy} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                  <XAxis dataKey="bucketName" stroke={colors.textMuted} fontSize={7} />
                  <YAxis stroke={colors.textMuted} fontSize={7} domain={[0, 100]} />
                  <Bar dataKey="accuracy" fill={colors.accent} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="pr-grid-2" style={{ marginTop: 8 }}>
          <div className="pr-card">
            <span className="pr-label">Fastest Solved Correct</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
              {stats.timeAnalysis.fastestSolved.slice(0, 3).map((f, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, borderBottom: '1px solid #f1f5f9', paddingBottom: 2 }}>
                  <span style={{ color: '#475569' }}>Q.{f.questionNumber} ({f.subject.toUpperCase()})</span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>{formatSeconds(f.timeTaken)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pr-card">
            <span className="pr-label">Slowest Attempted</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
              {stats.timeAnalysis.slowestSolved.slice(0, 3).map((s, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, borderBottom: '1px solid #f1f5f9', paddingBottom: 2 }}>
                  <span style={{ color: '#475569' }}>Q.{s.questionNumber} ({s.subject.toUpperCase()})</span>
                  <span style={{ fontWeight: 700, color: '#f97316' }}>{formatSeconds(s.timeTaken)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ 6. QUESTION JOURNEY ══════════ */}
      <div className="pr-section">
        <div className="pr-section-title">
          <FileText size={13} color="#2563eb" /> 6. Question Journey Palette
        </div>
        <div className="pr-card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: 4 }}>
            {stats.questionJourney.map((j) => {
              let bg = '#f1f5f9', border = '#e2e8f0', fg = '#94a3b8';
              if (j.status === 'correct') { bg = '#ecfdf5'; border = '#86efac'; fg = '#059669'; }
              else if (j.status === 'incorrect') { bg = '#fef2f2'; border = '#fca5a5'; fg = '#dc2626'; }
              else if (j.status === 'marked') { bg = '#fffbeb'; border = '#fcd34d'; fg = '#d97706'; }
              return (
                <div
                  key={j.id}
                  style={{ height: 22, borderRadius: 4, border: `1px solid ${border}`, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: fg }}
                >
                  {j.questionNumber}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════ 7. COMPLETE QUESTION LOG (single flowing table) ══════════ */}
      <div className="pr-section">
        <div className="pr-section-title">
          <Layers size={13} color="#2563eb" /> 7. Detailed Question Log
        </div>
        <div style={{ border: '1px solid #e2eaf4', borderRadius: 8, overflow: 'hidden' }}>
          <table className="pr-table pr-table-flow">
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: 30, paddingLeft: 6 }}>No.</th>
                <th style={{ width: 50 }}>Subject</th>
                <th>Chapter</th>
                <th style={{ textAlign: 'center', width: 50 }}>Diff</th>
                <th style={{ textAlign: 'center', width: 45 }}>Time</th>
                <th style={{ textAlign: 'center', width: 50 }}>Status</th>
                <th style={{ textAlign: 'center', width: 35 }}>Marks</th>
                <th style={{ textAlign: 'center', width: 45 }}>Resp</th>
                <th style={{ textAlign: 'center', width: 45, paddingRight: 6 }}>Key</th>
              </tr>
            </thead>
            <tbody>
              {stats.questionByQuestion.map((q: QuestionRow) => (
                <tr key={q.id}>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a', paddingLeft: 6 }}>{q.questionNumber}</td>
                  <td style={{ fontSize: 7, textTransform: 'uppercase' }}>{q.subject}</td>
                  <td style={{ color: '#0f172a', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.chapter}</td>
                  <td style={{ textAlign: 'center', fontSize: 7 }}>{q.difficulty}</td>
                  <td style={{ textAlign: 'center' }}>{formatSeconds(q.timeTaken)}</td>
                  <td style={{ textAlign: 'center', fontWeight: q.attemptStatus !== 'Skipped' ? 700 : 400, color: q.attemptStatus === 'Correct' ? '#10b981' : q.attemptStatus === 'Incorrect' ? '#ef4444' : '#94a3b8' }}>
                    {q.attemptStatus}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>
                    {q.attemptStatus === 'Correct' ? `+${q.marksAwarded}` : q.attemptStatus === 'Incorrect' ? `-1` : '0'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>{q.studentResponse}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#10b981', paddingRight: 6 }}>{q.correctAnswer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════ 8. SCORE PROGRESSION ══════════ */}
      <div className="pr-section">
        <div className="pr-section-title">
          <TrendingUp size={13} color="#2563eb" /> 8. Cumulative Score Progression
        </div>
        <div className="pr-chart-card">
          <div style={{ height: 160, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.subjectMovement} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                <XAxis dataKey="questionNumber" stroke={colors.textMuted} fontSize={7} />
                <YAxis stroke={colors.textMuted} fontSize={7} />
                <Legend verticalAlign="top" height={18} iconSize={8} wrapperStyle={{ fontSize: 7 }} />
                <Line type="monotone" dataKey="physicsScore" name="Physics" stroke={colors.accent} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="chemistryScore" name="Chemistry" stroke={colors.orange} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="mathScore" name="Maths" stroke={colors.purple} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="totalScore" name="Total" stroke={colors.text} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ══════════ END FOOTER ══════════ */}
      <div className="pr-end-footer" style={{ borderTop: '1px solid #e2eaf4', paddingTop: 8, marginTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 7, color: '#94a3b8' }}>
        <span>Factual performance statistics compiled on SolvingMinds. Searchable vector print layout.</span>
        <span>SolvingMinds © 2026</span>
      </div>
    </div>
  );
}
