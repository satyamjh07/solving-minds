'use client';

import React, { useState, useEffect } from 'react';
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
    }, 500); // No charts to wait for — print faster
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

  const accColor = (v: number) => v >= 70 ? '#10b981' : v >= 40 ? '#f97316' : '#ef4444';

  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', fontSize: 11, color: '#64748b' }}>
        Preparing report...
      </div>
    );
  }

  return (
    <div className="pr-report">
      <style jsx global>{`
        @page { size: A4; margin: 12mm 10mm 14mm 10mm; }

        @media print {
          html, body {
            margin: 0 !important; padding: 0 !important;
            background: #fff !important; color: #0f172a !important;
            font-family: Inter, system-ui, -apple-system, sans-serif !important;
            font-size: 10px !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          body > *:not(.pr-report):not(script):not(style) { display: none !important; }
          .pr-report { padding: 0 !important; max-width: none !important; }

          /* Sections stay together, tables flow */
          .pr-section { break-inside: avoid; page-break-inside: avoid; }
          .pr-flow { break-inside: auto !important; page-break-inside: auto !important; }
          .pr-flow thead { display: table-header-group; }
          .pr-flow tr { break-inside: avoid; page-break-inside: avoid; }

          /* ZERO border-radius in print — eliminates hundreds of Bézier curves */
          * { border-radius: 0 !important; }
        }

        .pr-report {
          font-family: Inter, system-ui, -apple-system, sans-serif;
          background: #fff; color: #0f172a;
          max-width: 780px; margin: 0 auto; padding: 20px;
          font-size: 10px; line-height: 1.4;
        }

        /* Header */
        .pr-hdr { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }

        /* Section */
        .pr-section { margin-bottom: 14px; }
        .pr-stitle { font-size: 11px; font-weight: 700; color: #0f172a; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; margin-bottom: 8px; letter-spacing: 0.03em; }

        /* Card */
        .pr-c { border: 1px solid #e2eaf4; padding: 8px; }
        .pr-lbl { font-size: 7px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; display: block; margin-bottom: 2px; }
        .pr-val { font-size: 17px; font-weight: 800; letter-spacing: -0.02em; }
        .pr-sm { font-size: 8px; color: #64748b; }

        /* CSS Bar (replaces SVG BarChart) */
        .pr-bar-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
        .pr-bar-label { font-size: 7px; font-weight: 700; color: #475569; text-transform: uppercase; width: 50px; text-align: right; flex-shrink: 0; }
        .pr-bar-track { flex: 1; height: 10px; background: #f1f5f9; overflow: hidden; }
        .pr-bar-fill { height: 100%; }
        .pr-bar-val { font-size: 8px; font-weight: 700; width: 32px; text-align: right; flex-shrink: 0; }

        /* Table */
        .pr-tbl { width: 100%; border-collapse: collapse; font-size: 8px; }
        .pr-tbl th { text-align: left; padding: 4px 6px; font-size: 7px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e2eaf4; background: #f8fafc; }
        .pr-tbl td { padding: 3px 6px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .pr-tbl tr:last-child td { border-bottom: none; }

        /* Grids */
        .pr-g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .pr-g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .pr-g4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px; }

        /* Journey cell */
        .pr-jcell { height: 18px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 700; }
      `}</style>

      {/* ══════════ HEADER ══════════ */}
      <div className="pr-hdr">
        <div>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: '#2563eb', textTransform: 'uppercase' as const }}>
            SolvingMinds Test Analysis Report
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{testTitle}</div>
          <div style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>
            {formatDate(attemptDate)} · {examType.toUpperCase()} · ID: {attemptId.slice(0, 8)}
          </div>
        </div>
        <div style={{ fontSize: 7, color: '#94a3b8', textAlign: 'right' as const }}>SolvingMinds © 2026</div>
      </div>

      {/* ══════════ 1. OVERVIEW ══════════ */}
      <div className="pr-section">
        <div className="pr-stitle">1. Performance Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          <div className="pr-c" style={{ textAlign: 'center' }}>
            <span className="pr-lbl">Score</span>
            <span className="pr-val">{stats.overview.totalScore}</span>
            <div className="pr-sm">/ {stats.overview.maxScore}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 4, fontSize: 8 }}>
              <span style={{ color: '#10b981', fontWeight: 700 }}>+{stats.overview.positiveMarks}</span>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>-{stats.overview.negativeMarks}</span>
            </div>
          </div>
          <div className="pr-c">
            <span className="pr-lbl">Accuracy</span>
            <span className="pr-val" style={{ color: accColor(stats.overview.accuracy) }}>{stats.overview.accuracy}%</span>
            <div style={{ background: '#f1f5f9', height: 4, marginTop: 4, overflow: 'hidden' }}>
              <div style={{ width: `${stats.overview.accuracy}%`, background: accColor(stats.overview.accuracy), height: '100%' }} />
            </div>
          </div>
          <div className="pr-c">
            <span className="pr-lbl">Time Taken</span>
            <span className="pr-val">{formatSeconds(stats.overview.timeTaken)}</span>
            <div className="pr-sm">Avg: {formatSeconds(stats.timeAnalysis.avgTimePerQuestion)}/q</div>
          </div>
          <div className="pr-c">
            <span className="pr-lbl">Attempt Rate</span>
            <span className="pr-val" style={{ color: '#2563eb' }}>
              {Math.round((stats.overview.questionsAttempted / (stats.overview.questionsAttempted + stats.overview.questionsUnattempted)) * 100)}%
            </span>
            <div className="pr-sm">{stats.overview.questionsAttempted} / {stats.overview.questionsAttempted + stats.overview.questionsUnattempted} Qs</div>
          </div>
        </div>
        <div className="pr-g3" style={{ marginTop: 8 }}>
          <div className="pr-c" style={{ textAlign: 'center' }}>
            <span className="pr-lbl">Correct</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#10b981', display: 'block' }}>{stats.overview.questionsCorrect}</span>
          </div>
          <div className="pr-c" style={{ textAlign: 'center' }}>
            <span className="pr-lbl">Incorrect</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#ef4444', display: 'block' }}>{stats.overview.questionsIncorrect}</span>
          </div>
          <div className="pr-c" style={{ textAlign: 'center' }}>
            <span className="pr-lbl">Skipped</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#64748b', display: 'block' }}>{stats.overview.questionsUnattempted}</span>
          </div>
        </div>
      </div>

      {/* ══════════ 2. SUBJECT ANALYSIS (CSS bars, no SVG) ══════════ */}
      <div className="pr-section">
        <div className="pr-stitle">2. Subject-wise Analysis</div>
        <div style={{ border: '1px solid #e2eaf4', overflow: 'hidden' }}>
          <table className="pr-tbl">
            <thead>
              <tr>
                <th style={{ paddingLeft: 8, width: 90 }}>Subject</th>
                <th style={{ textAlign: 'center' }}>Score</th>
                <th style={{ textAlign: 'center' }}>Correct</th>
                <th style={{ textAlign: 'center' }}>Wrong</th>
                <th style={{ textAlign: 'center' }}>Skipped</th>
                <th style={{ width: 160 }}>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {stats.subjects.map((sub: SubjectStats) => (
                <tr key={sub.subjectName}>
                  <td style={{ paddingLeft: 8, fontWeight: 700, textTransform: 'uppercase', fontSize: 8 }}>{sub.subjectName}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{sub.score}/{sub.maxMarks}</td>
                  <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 600 }}>{sub.questionsCorrect}</td>
                  <td style={{ textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>{sub.questionsIncorrect}</td>
                  <td style={{ textAlign: 'center' }}>{sub.questionsUnattempted}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 8, background: '#f1f5f9', overflow: 'hidden' }}>
                        <div style={{ width: `${sub.accuracy}%`, height: '100%', background: accColor(sub.accuracy) }} />
                      </div>
                      <span style={{ fontSize: 8, fontWeight: 700, color: accColor(sub.accuracy), width: 28, textAlign: 'right' }}>{sub.accuracy}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════ 3. CHAPTER ANALYSIS ══════════ */}
      <div className="pr-section">
        <div className="pr-stitle">3. Chapter-wise Coverage</div>
        <div style={{ border: '1px solid #e2eaf4', overflow: 'hidden' }}>
          <table className="pr-tbl pr-flow">
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
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{c.questionsAttempted > 0 ? `${c.accuracy}%` : '—'}</td>
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

      {/* ══════════ 4. DIFFICULTY & ATTEMPT (CSS bars, no SVG) ══════════ */}
      <div className="pr-section">
        <div className="pr-stitle">4. Difficulty &amp; Attempt Analytics</div>
        <div className="pr-g2">
          <div className="pr-c">
            <span className="pr-lbl" style={{ marginBottom: 6 }}>Accuracy by Difficulty</span>
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
          <div className="pr-c">
            <span className="pr-lbl" style={{ marginBottom: 6 }}>Attempt Profile</span>
            {[
              { label: 'Perfect', value: stats.attempts.overall.perfect, color: '#10b981' },
              { label: 'Wasted', value: stats.attempts.overall.wasted, color: '#ef4444' },
              { label: 'OT Correct', value: stats.attempts.overall.overtimeCorrect, color: '#2563eb' },
              { label: 'OT Wrong', value: stats.attempts.overall.overtimeMistake, color: '#f97316' },
              { label: 'Confused', value: stats.attempts.overall.confused, color: '#8b5cf6' },
            ].map(item => {
              const max = Math.max(stats.attempts.overall.perfect, stats.attempts.overall.wasted, stats.attempts.overall.overtimeCorrect, stats.attempts.overall.overtimeMistake, stats.attempts.overall.confused, 1);
              return (
                <div key={item.label} className="pr-bar-row">
                  <span className="pr-bar-label">{item.label}</span>
                  <div className="pr-bar-track">
                    <div className="pr-bar-fill" style={{ width: `${(item.value / max) * 100}%`, background: item.color }} />
                  </div>
                  <span className="pr-bar-val" style={{ color: item.color }}>{item.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════ 5. TIME INSIGHTS (pure text/CSS, no SVG) ══════════ */}
      <div className="pr-section">
        <div className="pr-stitle">5. Time Insights</div>
        <div className="pr-g2">
          <div className="pr-c">
            <span className="pr-lbl" style={{ marginBottom: 6 }}>Time per Subject</span>
            {stats.timeAnalysis.subjectTimeDistribution.map((d, i) => {
              const total = stats.timeAnalysis.subjectTimeDistribution.reduce((a, b) => a + b.value, 0) || 1;
              const pct = Math.round((d.value / total) * 100);
              const c = i === 0 ? '#2563eb' : i === 1 ? '#8b5cf6' : '#f97316';
              return (
                <div key={d.name} className="pr-bar-row">
                  <span className="pr-bar-label">{d.name}</span>
                  <div className="pr-bar-track">
                    <div className="pr-bar-fill" style={{ width: `${pct}%`, background: c }} />
                  </div>
                  <span className="pr-bar-val" style={{ color: c }}>{pct}%</span>
                </div>
              );
            })}
          </div>
          <div className="pr-c">
            <span className="pr-lbl" style={{ marginBottom: 6 }}>Time vs Accuracy</span>
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
        <div className="pr-g2" style={{ marginTop: 8 }}>
          <div className="pr-c">
            <span className="pr-lbl">Fastest Correct</span>
            {stats.timeAnalysis.fastestSolved.slice(0, 3).map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, borderBottom: '1px solid #f1f5f9', padding: '2px 0' }}>
                <span style={{ color: '#475569' }}>Q.{f.questionNumber} ({f.subject.toUpperCase()})</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>{formatSeconds(f.timeTaken)}</span>
              </div>
            ))}
          </div>
          <div className="pr-c">
            <span className="pr-lbl">Slowest Attempted</span>
            {stats.timeAnalysis.slowestSolved.slice(0, 3).map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, borderBottom: '1px solid #f1f5f9', padding: '2px 0' }}>
                <span style={{ color: '#475569' }}>Q.{s.questionNumber} ({s.subject.toUpperCase()})</span>
                <span style={{ fontWeight: 700, color: '#f97316' }}>{formatSeconds(s.timeTaken)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ 6. QUESTION JOURNEY (flat cells, no border-radius) ══════════ */}
      <div className="pr-section">
        <div className="pr-stitle">6. Question Journey</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: 2 }}>
          {stats.questionJourney.map((j) => {
            let bg = '#f1f5f9', fg = '#94a3b8', bdr = '#e2e8f0';
            if (j.status === 'correct') { bg = '#ecfdf5'; fg = '#059669'; bdr = '#86efac'; }
            else if (j.status === 'incorrect') { bg = '#fef2f2'; fg = '#dc2626'; bdr = '#fca5a5'; }
            else if (j.status === 'marked') { bg = '#fffbeb'; fg = '#d97706'; bdr = '#fcd34d'; }
            return (
              <div key={j.id} className="pr-jcell" style={{ background: bg, color: fg, borderColor: bdr }}>
                {j.questionNumber}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════ 7. QUESTION LOG (single flowing table) ══════════ */}
      <div className="pr-section">
        <div className="pr-stitle">7. Detailed Question Log</div>
        <div style={{ border: '1px solid #e2eaf4', overflow: 'hidden' }}>
          <table className="pr-tbl pr-flow">
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: 26, paddingLeft: 4 }}>No</th>
                <th style={{ width: 44 }}>Subj</th>
                <th>Chapter</th>
                <th style={{ textAlign: 'center', width: 40 }}>Diff</th>
                <th style={{ textAlign: 'center', width: 38 }}>Time</th>
                <th style={{ textAlign: 'center', width: 46 }}>Status</th>
                <th style={{ textAlign: 'center', width: 30 }}>±</th>
                <th style={{ textAlign: 'center', width: 32 }}>Ans</th>
                <th style={{ textAlign: 'center', width: 32, paddingRight: 4 }}>Key</th>
              </tr>
            </thead>
            <tbody>
              {stats.questionByQuestion.map((q: QuestionRow) => (
                <tr key={q.id}>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a', paddingLeft: 4 }}>{q.questionNumber}</td>
                  <td style={{ fontSize: 7, textTransform: 'uppercase' }}>{q.subject}</td>
                  <td style={{ color: '#0f172a', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.chapter}</td>
                  <td style={{ textAlign: 'center', fontSize: 7 }}>{q.difficulty}</td>
                  <td style={{ textAlign: 'center' }}>{formatSeconds(q.timeTaken)}</td>
                  <td style={{ textAlign: 'center', fontWeight: q.attemptStatus !== 'Skipped' ? 700 : 400, color: q.attemptStatus === 'Correct' ? '#10b981' : q.attemptStatus === 'Incorrect' ? '#ef4444' : '#94a3b8' }}>
                    {q.attemptStatus}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>
                    {q.attemptStatus === 'Correct' ? `+${q.marksAwarded}` : q.attemptStatus === 'Incorrect' ? `-1` : '0'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>{q.studentResponse}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#10b981', paddingRight: 4 }}>{q.correctAnswer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════ 8. SCORE PROGRESSION (table, no SVG LineChart) ══════════ */}
      <div className="pr-section">
        <div className="pr-stitle">8. Cumulative Score Progression</div>
        <div style={{ border: '1px solid #e2eaf4', overflow: 'hidden' }}>
          <table className="pr-tbl pr-flow">
            <thead>
              <tr>
                <th style={{ textAlign: 'center', paddingLeft: 4, width: 26 }}>Q#</th>
                <th style={{ textAlign: 'center' }}>Physics</th>
                <th style={{ textAlign: 'center' }}>Chemistry</th>
                <th style={{ textAlign: 'center' }}>Maths</th>
                <th style={{ textAlign: 'center', paddingRight: 4, fontWeight: 800 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {/* Show every 5th question + the last one for density */}
              {stats.subjectMovement
                .filter((_, i) => i % 5 === 0 || i === stats.subjectMovement.length - 1)
                .map((row: any, i: number) => (
                <tr key={i}>
                  <td style={{ textAlign: 'center', fontWeight: 600, paddingLeft: 4 }}>{row.questionNumber}</td>
                  <td style={{ textAlign: 'center', color: '#2563eb', fontWeight: 600 }}>{row.physicsScore}</td>
                  <td style={{ textAlign: 'center', color: '#f97316', fontWeight: 600 }}>{row.chemistryScore}</td>
                  <td style={{ textAlign: 'center', color: '#8b5cf6', fontWeight: 600 }}>{row.mathScore}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: '#0f172a', paddingRight: 4 }}>{row.totalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════ FOOTER ══════════ */}
      <div style={{ borderTop: '1px solid #e2eaf4', paddingTop: 6, marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 7, color: '#94a3b8' }}>
        <span>Performance report compiled on SolvingMinds. Text-only print layout for fast rendering.</span>
        <span>SolvingMinds © 2026</span>
      </div>
    </div>
  );
}
