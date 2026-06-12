'use client';

import React, { useState, useEffect } from 'react';
import { PreCalculatedAnalytics, SubjectStats, ChapterStats, DifficultyBucket, QuestionRow } from '../analyticsHelper';

/*
 * PRINT-OPTIMIZED DASHBOARD — Zero SVG, Zero Recharts
 * 
 * Performance strategy:
 * - NO Recharts (was generating 700+ SVG nodes)
 * - NO Lucide icons (was generating 50+ SVG paths)
 * - NO Google Fonts @import (was embedding 6 font weights)
 * - NO SVG score ring
 * - NO border-radius on tables (eliminates clip paths)
 * - Charts replaced with pure CSS percentage bars
 * - System fonts only: Inter falls back to system-ui
 * 
 * Result: ~0 SVG nodes, pure HTML/CSS, instant PDF rendering
 */

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
    }, 500); // No charts to wait for — 500ms is plenty
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

  const accColor = (acc: number) => acc >= 75 ? '#10b981' : acc >= 50 ? '#f97316' : '#ef4444';

  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', fontSize: 11, color: '#64748b' }}>
        Preparing report...
      </div>
    );
  }

  // Pre-compute attempt rate
  const totalQs = stats.overview.questionsAttempted + stats.overview.questionsUnattempted;
  const attemptRate = totalQs > 0 ? Math.round((stats.overview.questionsAttempted / totalQs) * 100) : 0;
  const scorePercent = stats.overview.maxScore > 0 ? Math.round((stats.overview.totalScore / stats.overview.maxScore) * 100) : 0;

  return (
    <div className="pr">
      <style jsx global>{`
        @page { size: A4; margin: 12mm 10mm 12mm 10mm; }
        @media print {
          html, body {
            margin: 0 !important; padding: 0 !important;
            background: #fff !important; color: #0f172a !important;
            font-size: 10px !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          body > *:not(.pr):not(script):not(style) { display: none !important; }
          .pr { padding: 0 !important; max-width: none !important; }
          .pr-section { break-inside: avoid; page-break-inside: avoid; }
          .pr-tbl-flow { break-inside: auto !important; page-break-inside: auto !important; }
          .pr-tbl-flow thead { display: table-header-group; }
          .pr-tbl-flow tr { break-inside: avoid; page-break-inside: avoid; }
        }
        .pr {
          font-family: Inter, system-ui, -apple-system, sans-serif;
          background: #fff; color: #0f172a;
          max-width: 780px; margin: 0 auto; padding: 20px;
          line-height: 1.4;
        }
        /* ── Primitives ── */
        .pr-hdr { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 14px; }
        .pr-section { margin-bottom: 14px; }
        .pr-stitle {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.03em; color: #0f172a;
          border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;
        }
        .pr-card {
          border: 1px solid #e2e8f0; padding: 8px 10px;
        }
        .pr-lbl {
          font-size: 7px; font-weight: 700; color: #94a3b8;
          text-transform: uppercase; letter-spacing: 0.05em;
          display: block; margin-bottom: 2px;
        }
        .pr-val { font-size: 16px; font-weight: 800; }
        .pr-sm { font-size: 8px; color: #64748b; }
        /* ── CSS Bar (replaces Recharts) ── */
        .pr-bar-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
        .pr-bar-label { font-size: 8px; font-weight: 600; width: 50px; text-align: right; color: #475569; flex-shrink: 0; }
        .pr-bar-track { flex: 1; height: 10px; background: #f1f5f9; overflow: hidden; }
        .pr-bar-fill { height: 100%; }
        .pr-bar-val { font-size: 8px; font-weight: 700; width: 32px; flex-shrink: 0; }
        /* ── Tables ── */
        .pr-tbl { width: 100%; border-collapse: collapse; font-size: 8px; }
        .pr-tbl th {
          text-align: left; padding: 4px 5px; font-size: 7px; font-weight: 700;
          color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;
          border-bottom: 1px solid #cbd5e1; background: #f8fafc;
        }
        .pr-tbl td { padding: 3px 5px; border-bottom: 1px solid #f1f5f9; }
        /* ── Grid helpers ── */
        .pr-g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .pr-g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .pr-g4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px; }
        /* ── Journey cells ── */
        .pr-jcell {
          width: 100%; height: 18px; display: flex; align-items: center;
          justify-content: center; font-size: 7px; font-weight: 700;
          border: 1px solid #e2e8f0; background: #f8fafc; color: #94a3b8;
        }
        .pr-jcell.c { background: #ecfdf5; border-color: #86efac; color: #059669; }
        .pr-jcell.w { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }
        .pr-jcell.m { background: #fffbeb; border-color: #fcd34d; color: #d97706; }
      `}</style>

      {/* ══════════ HEADER ══════════ */}
      <div className="pr-hdr">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: '#2563eb', textTransform: 'uppercase' as const }}>
              SolvingMinds Analysis Report
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 1 }}>{testTitle}</div>
            <div style={{ fontSize: 8, color: '#64748b', marginTop: 1 }}>
              {formatDate(attemptDate)} · {examType.toUpperCase()} · ID {attemptId.slice(0, 8)}
            </div>
          </div>
          <div style={{ fontSize: 7, color: '#94a3b8', textAlign: 'right' as const }}>SolvingMinds © 2026</div>
        </div>
      </div>

      {/* ══════════ 1. PERFORMANCE OVERVIEW ══════════ */}
      <div className="pr-section">
        <div className="pr-stitle">1 · Performance Overview</div>

        <div className="pr-g4">
          <div className="pr-card" style={{ textAlign: 'center' }}>
            <span className="pr-lbl">Score</span>
            <span className="pr-val" style={{ color: '#2563eb' }}>{stats.overview.totalScore}</span>
            <span className="pr-sm"> / {stats.overview.maxScore} ({scorePercent}%)</span>
          </div>
          <div className="pr-card" style={{ textAlign: 'center' }}>
            <span className="pr-lbl">Accuracy</span>
            <span className="pr-val" style={{ color: '#10b981' }}>{stats.overview.accuracy}%</span>
            <div style={{ height: 4, background: '#f1f5f9', marginTop: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.overview.accuracy}%`, background: '#10b981' }} />
            </div>
          </div>
          <div className="pr-card" style={{ textAlign: 'center' }}>
            <span className="pr-lbl">Time Taken</span>
            <span className="pr-val">{formatSeconds(stats.overview.timeTaken)}</span>
            <span className="pr-sm">Avg: {formatSeconds(stats.timeAnalysis.avgTimePerQuestion)}/q</span>
          </div>
          <div className="pr-card" style={{ textAlign: 'center' }}>
            <span className="pr-lbl">Attempt Rate</span>
            <span className="pr-val" style={{ color: '#2563eb' }}>{attemptRate}%</span>
            <span className="pr-sm">{stats.overview.questionsAttempted}/{totalQs} Qs</span>
          </div>
        </div>

        <div className="pr-g3" style={{ marginTop: 6 }}>
          <div className="pr-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="pr-lbl" style={{ marginBottom: 0 }}>Correct</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>{stats.overview.questionsCorrect}</span>
          </div>
          <div className="pr-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="pr-lbl" style={{ marginBottom: 0 }}>Incorrect</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{stats.overview.questionsIncorrect}</span>
          </div>
          <div className="pr-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="pr-lbl" style={{ marginBottom: 0 }}>Skipped</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#94a3b8' }}>{stats.overview.questionsUnattempted}</span>
          </div>
        </div>

        <div className="pr-g2" style={{ marginTop: 6 }}>
          <div className="pr-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="pr-lbl" style={{ marginBottom: 0 }}>Positive Marks</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>+{stats.overview.positiveMarks}</span>
          </div>
          <div className="pr-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="pr-lbl" style={{ marginBottom: 0 }}>Negative Marks</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>-{stats.overview.negativeMarks}</span>
          </div>
        </div>
      </div>

      {/* ══════════ 2. SUBJECT ANALYSIS ══════════ */}
      <div className="pr-section">
        <div className="pr-stitle">2 · Subject-wise Analysis</div>

        {/* Subject cards row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {stats.subjects.map((sub: SubjectStats) => (
            <div key={sub.subjectName} className="pr-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: 3 }}>{sub.subjectName}</div>
                <div style={{ display: 'flex', gap: 10, fontSize: 8, color: '#64748b' }}>
                  <span>Score: <b style={{ color: '#0f172a' }}>{sub.score}/{sub.maxMarks}</b></span>
                  <span>✓ <b style={{ color: '#10b981' }}>{sub.questionsCorrect}</b></span>
                  <span>✗ <b style={{ color: '#ef4444' }}>{sub.questionsIncorrect}</b></span>
                  <span>— <b>{sub.questionsUnattempted}</b></span>
                </div>
              </div>
              {/* CSS bar instead of Recharts */}
              <div style={{ width: 120, flexShrink: 0 }}>
                <div style={{ height: 8, background: '#f1f5f9', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${sub.accuracy}%`, background: accColor(sub.accuracy) }} />
                </div>
              </div>
              <div style={{ width: 40, textAlign: 'right' as const, fontSize: 12, fontWeight: 800, color: '#2563eb', flexShrink: 0 }}>{sub.accuracy}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════ 3. CHAPTER ANALYSIS ══════════ */}
      <div className="pr-section">
        <div className="pr-stitle">3 · Chapter-wise Coverage</div>
        <div style={{ border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="pr-tbl pr-tbl-flow">
            <thead>
              <tr>
                <th style={{ paddingLeft: 6 }}>Chapter</th>
                <th>Subject</th>
                <th style={{ textAlign: 'center' }}>Seen</th>
                <th style={{ textAlign: 'center' }}>Tried</th>
                <th style={{ textAlign: 'center' }}>Acc%</th>
                <th style={{ textAlign: 'center' }}>+Marks</th>
                <th style={{ textAlign: 'center' }}>−Marks</th>
                <th style={{ textAlign: 'right', paddingRight: 6 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.chapters.map((c: ChapterStats) => (
                <tr key={`${c.subject}_${c.chapterName}`}>
                  <td style={{ paddingLeft: 6, fontWeight: 600, color: '#0f172a' }}>{c.chapterName}</td>
                  <td style={{ fontSize: 7, textTransform: 'uppercase' }}>{c.subject}</td>
                  <td style={{ textAlign: 'center' }}>{c.questionsSeen}</td>
                  <td style={{ textAlign: 'center' }}>{c.questionsAttempted}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{c.questionsAttempted > 0 ? `${c.accuracy}%` : '—'}</td>
                  <td style={{ textAlign: 'center', color: '#10b981' }}>+{c.marksGained}</td>
                  <td style={{ textAlign: 'center', color: '#ef4444' }}>{c.marksLost}</td>
                  <td style={{ textAlign: 'right', paddingRight: 6, fontSize: 7, fontWeight: 700, textTransform: 'uppercase' as const, color: c.status === 'strong' ? '#10b981' : c.status === 'average' ? '#2563eb' : '#ef4444' }}>
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
        <div className="pr-stitle">4 · Difficulty &amp; Attempt Analytics</div>

        <div className="pr-g2">
          {/* Difficulty bars — pure CSS */}
          <div className="pr-card">
            <span className="pr-lbl" style={{ marginBottom: 6 }}>Difficulty Accuracy</span>
            {stats.difficulties.map((d: DifficultyBucket) => (
              <div key={d.name} className="pr-bar-row">
                <span className="pr-bar-label">{d.name}</span>
                <div className="pr-bar-track">
                  <div className="pr-bar-fill" style={{ width: `${d.accuracy}%`, background: d.name === 'Easy' ? '#10b981' : d.name === 'Moderate' ? '#f97316' : '#ef4444' }} />
                </div>
                <span className="pr-bar-val" style={{ color: d.name === 'Easy' ? '#10b981' : d.name === 'Moderate' ? '#f97316' : '#ef4444' }}>{d.accuracy}%</span>
              </div>
            ))}
          </div>

          {/* Attempt profile — pure CSS */}
          <div className="pr-card">
            <span className="pr-lbl" style={{ marginBottom: 6 }}>Attempt Profile</span>
            {[
              { label: 'Perfect', val: stats.attempts.overall.perfect, color: '#10b981' },
              { label: 'Wasted', val: stats.attempts.overall.wasted, color: '#ef4444' },
              { label: 'OT Correct', val: stats.attempts.overall.overtimeCorrect, color: '#2563eb' },
              { label: 'OT Wrong', val: stats.attempts.overall.overtimeMistake, color: '#f97316' },
              { label: 'Confused', val: stats.attempts.overall.confused, color: '#8b5cf6' },
            ].map(item => {
              const maxVal = Math.max(
                stats.attempts.overall.perfect, stats.attempts.overall.wasted,
                stats.attempts.overall.overtimeCorrect, stats.attempts.overall.overtimeMistake,
                stats.attempts.overall.confused, 1
              );
              return (
                <div key={item.label} className="pr-bar-row">
                  <span className="pr-bar-label">{item.label}</span>
                  <div className="pr-bar-track">
                    <div className="pr-bar-fill" style={{ width: `${(item.val / maxVal) * 100}%`, background: item.color }} />
                  </div>
                  <span className="pr-bar-val" style={{ color: item.color }}>{item.val}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════ 5. TIME INSIGHTS ══════════ */}
      <div className="pr-section">
        <div className="pr-stitle">5 · Time Insights</div>

        <div className="pr-g2">
          {/* Time distribution — text based */}
          <div className="pr-card">
            <span className="pr-lbl" style={{ marginBottom: 6 }}>Time per Subject</span>
            {stats.timeAnalysis.subjectTimeDistribution.map((d, idx) => {
              const total = stats.timeAnalysis.subjectTimeDistribution.reduce((a, b) => a + b.value, 0) || 1;
              const pct = Math.round((d.value / total) * 100);
              const clr = idx === 0 ? '#2563eb' : idx === 1 ? '#8b5cf6' : '#f97316';
              return (
                <div key={d.name} className="pr-bar-row">
                  <span className="pr-bar-label">{d.name}</span>
                  <div className="pr-bar-track">
                    <div className="pr-bar-fill" style={{ width: `${pct}%`, background: clr }} />
                  </div>
                  <span className="pr-bar-val" style={{ color: clr }}>{pct}%</span>
                </div>
              );
            })}
          </div>

          {/* Time vs Accuracy — CSS bars */}
          <div className="pr-card">
            <span className="pr-lbl" style={{ marginBottom: 6 }}>Time Spent vs Accuracy</span>
            {stats.timeAnalysis.timeSpentVsAccuracy.map((b) => (
              <div key={b.bucketName} className="pr-bar-row">
                <span className="pr-bar-label">{b.bucketName}</span>
                <div className="pr-bar-track">
                  <div className="pr-bar-fill" style={{ width: `${b.accuracy}%`, background: '#2563eb' }} />
                </div>
                <span className="pr-bar-val" style={{ color: '#2563eb' }}>{b.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pr-g2" style={{ marginTop: 6 }}>
          <div className="pr-card">
            <span className="pr-lbl">Fastest Correct</span>
            {stats.timeAnalysis.fastestSolved.slice(0, 3).map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, borderBottom: '1px solid #f1f5f9', padding: '2px 0' }}>
                <span style={{ color: '#475569' }}>Q.{f.questionNumber} ({f.subject.toUpperCase().slice(0, 4)})</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>{formatSeconds(f.timeTaken)}</span>
              </div>
            ))}
          </div>
          <div className="pr-card">
            <span className="pr-lbl">Slowest Attempted</span>
            {stats.timeAnalysis.slowestSolved.slice(0, 3).map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, borderBottom: '1px solid #f1f5f9', padding: '2px 0' }}>
                <span style={{ color: '#475569' }}>Q.{s.questionNumber} ({s.subject.toUpperCase().slice(0, 4)})</span>
                <span style={{ fontWeight: 700, color: '#f97316' }}>{formatSeconds(s.timeTaken)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ 6. QUESTION JOURNEY ══════════ */}
      <div className="pr-section">
        <div className="pr-stitle">6 · Question Journey</div>
        <div className="pr-card" style={{ padding: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: 2 }}>
            {stats.questionJourney.map((j) => (
              <div
                key={j.id}
                className={`pr-jcell ${j.status === 'correct' ? 'c' : j.status === 'incorrect' ? 'w' : j.status === 'marked' ? 'm' : ''}`}
              >
                {j.questionNumber}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ 7. QUESTION LOG ══════════ */}
      <div className="pr-section">
        <div className="pr-stitle">7 · Question Log</div>
        <div style={{ border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="pr-tbl pr-tbl-flow">
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: 26, paddingLeft: 4 }}>#</th>
                <th style={{ width: 40 }}>Subj</th>
                <th>Chapter</th>
                <th style={{ textAlign: 'center', width: 40 }}>Diff</th>
                <th style={{ textAlign: 'center', width: 36 }}>Time</th>
                <th style={{ textAlign: 'center', width: 46 }}>Status</th>
                <th style={{ textAlign: 'center', width: 30 }}>±</th>
                <th style={{ textAlign: 'center', width: 34 }}>Ans</th>
                <th style={{ textAlign: 'center', width: 34, paddingRight: 4 }}>Key</th>
              </tr>
            </thead>
            <tbody>
              {stats.questionByQuestion.map((q: QuestionRow) => (
                <tr key={q.id}>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a', paddingLeft: 4 }}>{q.questionNumber}</td>
                  <td style={{ fontSize: 7, textTransform: 'uppercase' }}>{q.subject.slice(0, 4)}</td>
                  <td style={{ color: '#0f172a', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.chapter}</td>
                  <td style={{ textAlign: 'center', fontSize: 7 }}>{q.difficulty}</td>
                  <td style={{ textAlign: 'center' }}>{formatSeconds(q.timeTaken)}</td>
                  <td style={{
                    textAlign: 'center',
                    fontWeight: q.attemptStatus !== 'Skipped' ? 700 : 400,
                    color: q.attemptStatus === 'Correct' ? '#10b981' : q.attemptStatus === 'Incorrect' ? '#ef4444' : '#94a3b8',
                    fontSize: 7
                  }}>
                    {q.attemptStatus === 'Correct' ? '✓ Correct' : q.attemptStatus === 'Incorrect' ? '✗ Wrong' : 'Skip'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: q.attemptStatus === 'Correct' ? '#10b981' : q.attemptStatus === 'Incorrect' ? '#ef4444' : '#94a3b8' }}>
                    {q.attemptStatus === 'Correct' ? `+${q.marksAwarded}` : q.attemptStatus === 'Incorrect' ? `−1` : '0'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>{q.studentResponse}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#10b981', paddingRight: 4 }}>{q.correctAnswer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════ 8. SCORE PROGRESSION ══════════ */}
      <div className="pr-section">
        <div className="pr-stitle">8 · Cumulative Score Progression</div>
        <div style={{ border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="pr-tbl pr-tbl-flow">
            <thead>
              <tr>
                <th style={{ textAlign: 'center', paddingLeft: 4 }}>Q#</th>
                <th style={{ textAlign: 'center' }}>Physics</th>
                <th style={{ textAlign: 'center' }}>Chemistry</th>
                <th style={{ textAlign: 'center' }}>Maths</th>
                <th style={{ textAlign: 'center', paddingRight: 4 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {/* Show every 5th question + the last one for density */}
              {stats.subjectMovement
                .filter((_, i) => i % 5 === 0 || i === stats.subjectMovement.length - 1)
                .map((row: any, i: number) => (
                <tr key={i}>
                  <td style={{ textAlign: 'center', fontWeight: 700, paddingLeft: 4 }}>{row.questionNumber}</td>
                  <td style={{ textAlign: 'center', color: '#2563eb' }}>{row.physicsScore}</td>
                  <td style={{ textAlign: 'center', color: '#f97316' }}>{row.chemistryScore}</td>
                  <td style={{ textAlign: 'center', color: '#8b5cf6' }}>{row.mathScore}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, paddingRight: 4 }}>{row.totalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════ FOOTER ══════════ */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 6, marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 7, color: '#94a3b8' }}>
        <span>Performance statistics compiled on SolvingMinds. Pure HTML print layout — zero vector graphics.</span>
        <span>SolvingMinds © 2026</span>
      </div>
    </div>
  );
}
