'use client';

import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useTheme } from '@/components/ThemeProvider';
import {
  BookMarked, Loader2, ChevronRight, XCircle, Eye, EyeOff,
  CheckCircle2, RefreshCw, ArrowLeft, ArrowUpDown, ChevronDown,
  Atom, FlaskConical, Zap, BookOpen, Layers, Trophy, AlertTriangle,
  ClipboardList, BarChart2, ChevronLeft, ChevronUp
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

// ─── KaTeX ────────────────────────────────────────────────────────────────────
const renderMath = (el: HTMLElement | null) => {
  if (!el || !(window as any).renderMathInElement) return;
  (window as any).renderMathInElement(el, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false },
    ],
    throwOnError: false,
  });
};
const formatText = (text: string) => {
  if (!text) return '';
  let clean = text.replace(/\\+text(?=\{)/g, '\\text');
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
  const parts = clean.split(mathRegex);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      let p = parts[i];
      p = p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      p = p.replace(/\\+textbf\{((?:[^{}]|\{[^{}]*\})*)\}/g, '<strong>$1</strong>');
      p = p.replace(/\\+textit\{((?:[^{}]|\{[^{}]*\})*)\}/g, '<em>$1</em>');
      p = p.replace(/\\\\/g, '<br/>');
      p = p.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="q-inline-img" />');
      p = p.replace(/\n/g, '<br/>');
      parts[i] = p;
    }
  }
  return parts.join('');
};
const MathText = memo(function MathText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) renderMath(ref.current); }, [text]);
  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: formatText(text) }} />;
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface MistakeQuestion {
  id: string;
  subject: string;
  chapter: string;
  topic: string | null;
  difficulty: string | null;
  type: string;
  question_text: string;
  question_image_url: string | null;
  options: { text: string; image?: string }[] | null;
  correct_answer: string;
  explanation: string | null;
  explanation_image_url: string | null;
  selected_answer: string;
  attempted_at: string;
  source: 'solver' | 'mock';
}

interface TestRow {
  testId: string;
  testTitle: string;
  date: string;
  wrong: number;
  notAttempted: number;
  correct: number;
  total: number;
  questions: MistakeQuestion[];
}

interface ChapterRow {
  subject: string;
  chapter: string;
  wrong: number;
  notAttempted: number;
  correct: number;
  total: number;
  questions: MistakeQuestion[];
}

// ─── Subject metadata ─────────────────────────────────────────────────────────
const SUBJECT_META: Record<string, { icon: React.ReactNode; color: string; tabColor: string }> = {
  physics:   { icon: <Atom size={14} />,        color: '#3b82f6', tabColor: '#3b82f6' },
  chemistry: { icon: <FlaskConical size={14} />, color: '#10b981', tabColor: '#10b981' },
  maths:     { icon: <Zap size={14} />,          color: '#f59e0b', tabColor: '#f59e0b' },
  math:      { icon: <Zap size={14} />,          color: '#f59e0b', tabColor: '#f59e0b' },
  biology:   { icon: <BookOpen size={14} />,     color: '#a855f7', tabColor: '#a855f7' },
};
function getSubjectMeta(s: string) {
  return SUBJECT_META[s.toLowerCase()] ?? { icon: <Layers size={14} />, color: '#94a3b8', tabColor: '#94a3b8' };
}

// ─── Accuracy Donut SVG ───────────────────────────────────────────────────────
function AccuracyDonut({ wrong, correct, total }: { wrong: number; correct: number; total: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const wrongPct = total > 0 ? wrong / total : 0;
  const correctPct = total > 0 ? correct / total : 0;
  const wrongLen = wrongPct * circ;
  const correctLen = correctPct * circ;

  return (
    <svg width={36} height={36} viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={18} cy={18} r={r} fill="none" stroke="var(--border)" strokeWidth={3.5} />
      {wrongLen > 0 && (
        <circle cx={18} cy={18} r={r} fill="none" stroke="#f87171" strokeWidth={3.5}
          strokeDasharray={`${wrongLen} ${circ - wrongLen}`}
          strokeDashoffset={0}
          strokeLinecap="butt" />
      )}
      {correctLen > 0 && (
        <circle cx={18} cy={18} r={r} fill="none" stroke="#34d399" strokeWidth={3.5}
          strokeDasharray={`${correctLen} ${circ - correctLen}`}
          strokeDashoffset={-wrongLen}
          strokeLinecap="butt" />
      )}
    </svg>
  );
}

// ─── Difficulty badge ─────────────────────────────────────────────────────────
function DiffBadge({ diff }: { diff: string | null }) {
  if (!diff) return null;
  const map: Record<string, string> = {
    easy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    moderate: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    hard: 'bg-red-500/15 text-red-400 border-red-500/25',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${map[diff.toLowerCase()] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/25'}`}>
      {diff}
    </span>
  );
}

// ─── Question Card (interactive practice) ─────────────────────────────────────
const QuestionCard = memo(function QuestionCard({ q, index }: { q: MistakeQuestion; index: number }) {
  const isMCQ = q.type !== 'integer';
  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
  const correctIdx = isMCQ ? parseInt(q.correct_answer, 10) : null;
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [integerInput, setIntegerInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const isCorrectAttempt = submitted && (
    isMCQ ? pickedIdx === correctIdx : integerInput.trim() === q.correct_answer.trim()
  );

  const handleRetry = () => { setPickedIdx(null); setIntegerInput(''); setSubmitted(false); setShowExplanation(false); };

  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-200 ${
      submitted
        ? isCorrectAttempt ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
        : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hover)]'
    }`}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs font-mono border ${
          submitted
            ? isCorrectAttempt ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500' : 'bg-red-500/15 border-red-500/30 text-red-500'
            : 'bg-[var(--bg2)] border-[var(--border)] text-[var(--text3)]'
        }`}>{index + 1}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <DiffBadge diff={q.difficulty} />
            {q.topic && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium text-[var(--text3)] bg-[var(--bg2)] border border-[var(--border)]">{q.topic}</span>}
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
              q.source === 'mock' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
            }`}>{q.source === 'mock' ? 'Mock Test' : 'Solver'}</span>
            {submitted && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                isCorrectAttempt ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25' : 'bg-red-500/10 text-red-500 border-red-500/25'
              }`}>
                {isCorrectAttempt ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                {isCorrectAttempt ? 'Correct!' : 'Wrong again'}
              </span>
            )}
          </div>
          <MathText text={q.question_text} className="text-sm text-[var(--text)] leading-relaxed" />
          {q.question_image_url && <img src={q.question_image_url} alt="q" className="mt-2 max-h-48 rounded-lg border border-[var(--border)] object-contain" />}
        </div>
      </div>

      {/* MCQ Options */}
      {isMCQ && q.options && q.options.length > 0 && (
        <div className="px-4 pb-3 space-y-1.5">
          {q.options.map((opt, i) => {
            const isCorrectOpt = i === correctIdx;
            const isPicked = i === pickedIdx;
            let rowCls = 'bg-[var(--bg2)] border-[var(--border)] text-[var(--text2)] hover:border-[var(--accent)]/40 cursor-pointer';
            let dotCls = 'bg-[var(--bg3)] text-[var(--text3)]';
            let icon: React.ReactNode = null;
            if (!submitted && isPicked) { rowCls = 'bg-[var(--accent)]/10 border-[var(--accent)]/40 text-[var(--accent)] cursor-pointer'; dotCls = 'bg-[var(--accent)] text-white'; }
            if (submitted) {
              if (isCorrectOpt) { rowCls = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 cursor-default'; dotCls = 'bg-emerald-500 text-white'; icon = <CheckCircle2 size={12} className="flex-shrink-0 mt-0.5 text-emerald-500" />; }
              else if (isPicked) { rowCls = 'bg-red-500/20 border-red-500/50 text-red-600 cursor-default'; dotCls = 'bg-red-500 text-white'; icon = <XCircle size={12} className="flex-shrink-0 mt-0.5 text-red-500" />; }
              else { rowCls = 'bg-[var(--bg2)] border-[var(--border)] text-[var(--text3)] cursor-default opacity-60'; }
            }
            return (
              <button key={i} disabled={submitted} onClick={() => setPickedIdx(i)}
                className={`w-full flex items-start gap-2 px-3 py-2 rounded-xl border text-xs transition-all text-left ${rowCls}`}>
                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-black text-[9px] transition-colors ${dotCls}`}>{optionLabels[i]}</span>
                <div className="flex-1 min-w-0">
                  {opt.text && <MathText text={opt.text} />}
                  {opt.image && <img src={opt.image} alt="" className="mt-1 max-h-20 object-contain rounded" />}
                  {!opt.text && !opt.image && <span className="text-[var(--text3)]">Option {optionLabels[i]}</span>}
                </div>
                {icon}
              </button>
            );
          })}
        </div>
      )}

      {/* Integer input */}
      {!isMCQ && (
        <div className="px-4 pb-3">
          {!submitted ? (
            <input type="number" value={integerInput} onChange={e => setIntegerInput(e.target.value)}
              placeholder="Enter your answer..." className="w-full px-4 py-2.5 text-sm bg-[var(--bg2)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl text-[var(--text)] outline-none transition-colors font-mono" />
          ) : (
            <div className="flex flex-wrap gap-3 text-xs">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${isCorrectAttempt ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                {isCorrectAttempt ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                <span className="text-[var(--text2)]">Your answer:</span>
                <span className="font-black font-mono">{integerInput || '—'}</span>
              </div>
              {!isCorrectAttempt && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-600">
                  <CheckCircle2 size={12} />
                  <span className="text-[var(--text2)]">Correct:</span>
                  <span className="font-black font-mono">{q.correct_answer}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="border-t border-[var(--border)] px-4 py-2.5 flex items-center justify-between gap-3">
        <div>
          {!submitted ? (
            <button onClick={() => setSubmitted(true)} disabled={isMCQ ? pickedIdx === null : !integerInput.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-[var(--accent)] text-white hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-mono">
              <CheckCircle2 size={11} /> Check Answer
            </button>
          ) : (
            <button onClick={handleRetry}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-[var(--bg2)] border border-[var(--border)] text-[var(--text2)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-all font-mono">
              <RefreshCw size={11} /> Try Again
            </button>
          )}
        </div>
        {submitted && q.explanation && (
          <button onClick={() => setShowExplanation(v => !v)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] hover:opacity-80 transition-opacity font-mono">
            {showExplanation ? <EyeOff size={11} /> : <Eye size={11} />}
            {showExplanation ? 'Hide' : 'Show'} Explanation
          </button>
        )}
      </div>
      {submitted && showExplanation && q.explanation && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-[var(--bg2)] rounded-xl border border-[var(--border)]">
            <MathText text={q.explanation} className="text-xs text-[var(--text2)] leading-relaxed" />
            {q.explanation_image_url && <img src={q.explanation_image_url} alt="exp" className="mt-2 max-h-48 rounded-lg object-contain" />}
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Custom Tooltip for chart ─────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--card2)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-[var(--text3)] mb-1 font-mono text-[10px]">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--text2)]">{p.name}:</span>
          <span className="font-bold text-[var(--text)]">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type ViewMode = 'test-wise' | 'chapter-wise';
type DrillTarget = { type: 'test' | 'chapter'; row: TestRow | ChapterRow } | null;

export default function BookletsPage() {
  const { profile, loading: profileLoading } = useProfile();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'neon' || theme === 'aurora' || theme === 'sunset';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
  const axisColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)';
  const notAttemptedLineColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('chapter-wise');

  // Raw data
  const [testRows, setTestRows] = useState<TestRow[]>([]);
  const [chapterRows, setChapterRows] = useState<ChapterRow[]>([]);
  const [allMistakes, setAllMistakes] = useState<MistakeQuestion[]>([]);

  // UI state
  const [showChart, setShowChart] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [testFilter, setTestFilter] = useState<string>('all'); // 'all' | 'last3' | 'last5' | 'last30'
  const [sortField, setSortField] = useState<string>('wrong');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [drill, setDrill] = useState<DrillTarget>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null); setDrill(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // 1. All completed mock test attempts
      const { data: mockAttempts } = await supabase
        .from('mock_test_live_attempts')
        .select('id, test_id, answers, completed, updated_at')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('updated_at', { ascending: false });

      // 2. All mock_tests metadata
      const testIds = [...new Set((mockAttempts || []).map(a => a.test_id))];
      let testMeta: Record<string, { title: string; total_questions: number }> = {};
      if (testIds.length > 0) {
        const { data: tests } = await supabase.from('mock_tests').select('id, title, total_questions').in('id', testIds);
        (tests || []).forEach(t => { testMeta[t.id] = { title: t.title, total_questions: t.total_questions }; });
      }

      // 3. Collect all question IDs from mock attempts
      const allMockAnswers: Record<string, Record<string, string | null>> = {}; // testId → { qId: answer }
      for (const a of (mockAttempts || [])) {
        allMockAnswers[a.test_id] = { ...(allMockAnswers[a.test_id] || {}), ...(a.answers || {}) };
      }
      const allMockQIds = [...new Set(Object.values(allMockAnswers).flatMap(m => Object.keys(m)))];

      // 4. Fetch those questions
      let mockQMap: Record<string, any> = {};
      for (let i = 0; i < allMockQIds.length; i += 100) {
        const batch = allMockQIds.slice(i, i + 100);
        const { data: qData } = await supabase
          .from('questions')
          .select('id, subject, chapter, topic, difficulty, type, question_text, question_image_url, options, correct_answer, explanation, explanation_image_url')
          .in('id', batch);
        (qData || []).forEach(q => { mockQMap[q.id] = q; });
      }

      // 5. Build test rows
      const builtTestRows: TestRow[] = [];
      for (const [testId, answers] of Object.entries(allMockAnswers)) {
        const meta = testMeta[testId];
        if (!meta) continue;
        let wrong = 0, correct = 0, notAttempted = 0;
        const wrongQs: MistakeQuestion[] = [];
        for (const [qId, ans] of Object.entries(answers)) {
          const q = mockQMap[qId];
          if (!q) continue;
          if (ans === null || ans === undefined || ans === '') { notAttempted++; }
          else if (ans === q.correct_answer) { correct++; }
          else { wrong++; wrongQs.push({ ...q, selected_answer: ans, attempted_at: '', source: 'mock' }); }
        }
        const attemptDate = (mockAttempts || []).find(a => a.test_id === testId)?.updated_at || '';
        builtTestRows.push({ testId, testTitle: meta.title, date: attemptDate, wrong, correct, notAttempted, total: meta.total_questions, questions: wrongQs });
      }
      builtTestRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTestRows(builtTestRows);

      // 6. Solver mistakes
      const { data: solverMistakes } = await supabase
        .from('user_attempts')
        .select(`id, question_id, selected_answer, is_correct, created_at, questions!inner(id, subject, chapter, topic, difficulty, type, question_text, question_image_url, options, correct_answer, explanation, explanation_image_url)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // 7. Build all mistakes list (dedup by question id, prefer most recent)
      const seen = new Set<string>();
      const mistakes: MistakeQuestion[] = [];

      // Add wrong mock test questions
      for (const row of builtTestRows) {
        for (const q of row.questions) {
          if (!seen.has(q.id)) { seen.add(q.id); mistakes.push(q); }
        }
      }
      // Add solver mistakes
      for (const row of (solverMistakes || [])) {
        const q = (row as any).questions as any;
        if (!q || seen.has(q.id)) continue;
        if (!row.is_correct) {
          seen.add(q.id);
          mistakes.push({ ...q, selected_answer: row.selected_answer, attempted_at: row.created_at, source: 'solver' });
        }
      }
      setAllMistakes(mistakes);

      // 8. Build chapter rows from all mistakes
      const chapMap = new Map<string, { subject: string; qs: MistakeQuestion[] }>();
      for (const q of mistakes) {
        const key = `${q.subject?.toLowerCase()}::${q.chapter}`;
        if (!chapMap.has(key)) chapMap.set(key, { subject: q.subject?.toLowerCase() || '', qs: [] });
        chapMap.get(key)!.qs.push(q);
      }
      // For correct counts in chapter-wise, use solver correct attempts
      const solverCorrect: Record<string, number> = {};
      for (const row of (solverMistakes || [])) {
        const q = (row as any).questions as any;
        if (!q) continue;
        const key = `${q.subject?.toLowerCase()}::${q.chapter}`;
        if (row.is_correct) solverCorrect[key] = (solverCorrect[key] || 0) + 1;
      }
      const builtChapterRows: ChapterRow[] = [];
      for (const [key, { subject, qs }] of chapMap) {
        const chapter = qs[0].chapter;
        const correct = solverCorrect[key] || 0;
        builtChapterRows.push({ subject, chapter, wrong: qs.length, notAttempted: 0, correct, total: qs.length + correct, questions: qs });
      }
      builtChapterRows.sort((a, b) => a.subject.localeCompare(b.subject) || a.chapter.localeCompare(b.chapter));
      setChapterRows(builtChapterRows);
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!profileLoading) fetchData(); }, [profileLoading, fetchData]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const subjects = useMemo(() => [...new Set(chapterRows.map(r => r.subject))].sort(), [chapterRows]);

  const filteredTestRows = useMemo(() => {
    let rows = [...testRows];
    if (testFilter === 'last3') rows = rows.slice(0, 3);
    if (testFilter === 'last5') rows = rows.slice(0, 5);
    if (testFilter === 'last30') {
      const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      rows = rows.filter(r => new Date(r.date) >= cutoff);
    }
    return rows.sort((a, b) => {
      const v = sortField as keyof TestRow;
      const av = (a[v] as number) ?? 0;
      const bv = (b[v] as number) ?? 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [testRows, testFilter, sortField, sortDir]);

  const filteredChapterRows = useMemo(() => {
    let rows = subjectFilter !== 'all' ? chapterRows.filter(r => r.subject === subjectFilter) : [...chapterRows];
    return rows.sort((a, b) => {
      const v = sortField as keyof ChapterRow;
      const av = (a[v] as number) ?? 0;
      const bv = (b[v] as number) ?? 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [chapterRows, subjectFilter, sortField, sortDir]);

  // Chart data
  const testChartData = useMemo(() => filteredTestRows.slice().reverse().map(r => ({
    name: r.testTitle.length > 15 ? r.testTitle.slice(0, 14) + '…' : r.testTitle,
    'Incorrect Qs': r.wrong,
    'Correct Qs': r.correct,
    'Not attempted': r.notAttempted,
  })), [filteredTestRows]);

  const chapChartData = useMemo(() => filteredChapterRows.map(r => ({
    name: r.chapter.length > 14 ? r.chapter.slice(0, 13) + '…' : r.chapter,
    'Incorrect Qs': r.wrong,
    'Correct Qs': r.correct,
    'Not attempted': r.notAttempted,
  })), [filteredChapterRows]);

  const totalWrong = view === 'test-wise'
    ? filteredTestRows.reduce((s, r) => s + r.wrong, 0)
    : filteredChapterRows.reduce((s, r) => s + r.wrong, 0);

  function sortToggle(field: string) {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  }

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (profileLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--bg)]">
        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
        <p className="text-xs text-[var(--text3)] uppercase tracking-widest font-mono animate-pulse">Loading Mistakes Library...</p>
      </div>
    );
  }

  // ── Drill-down view ────────────────────────────────────────────────────────
  if (drill) {
    const drillTitle = drill.type === 'test' ? (drill.row as TestRow).testTitle : (drill.row as ChapterRow).chapter;
    const drillQs = drill.row.questions;
    return (
      <div className="min-h-screen pb-28 bg-[var(--bg)]">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <button onClick={() => setDrill(null)} className="flex items-center gap-2 text-xs text-[var(--text3)] hover:text-[var(--text)] transition-colors mb-6 font-mono uppercase tracking-wider">
            <ArrowLeft size={14} /> Back to Mistakes Library
          </button>
          <h2 className="text-xl font-black text-[var(--text)] mb-1">{drillTitle}</h2>
          <p className="text-xs text-[var(--text3)] mb-6">{drillQs.length} mistake{drillQs.length !== 1 ? 's' : ''} — practice each question below</p>
          {drillQs.length === 0 ? (
            <div className="text-center py-16 text-[var(--text3)] text-sm">No questions to show.</div>
          ) : (
            <div className="space-y-4">
              {drillQs.map((q, i) => <QuestionCard key={q.id} q={q} index={i} />)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────────
  const activeRows = view === 'test-wise' ? filteredTestRows : filteredChapterRows;
  const chartData = view === 'test-wise' ? testChartData : chapChartData;
  const nameCol = view === 'test-wise' ? 'Test Name' : 'Chapter Name';

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--text)]">

      {/* ── LEFT SIDEBAR ──────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 border-r border-[var(--border)] p-4 pt-8 gap-2 sticky top-0 h-screen">
        <div className="mb-4">
          <div className="text-[10px] text-[var(--text3)] uppercase tracking-widest font-mono mb-1">Study Toolkit</div>
          <h2 className="text-lg font-black text-[var(--text)]">My Mistakes</h2>
        </div>

        <button
          onClick={() => { setView('test-wise'); setSortField('wrong'); setSortDir('desc'); }}
          className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            view === 'test-wise'
              ? 'bg-[var(--bg2)] text-[var(--text)] border border-[var(--border)]'
              : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)] border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2">
            <ClipboardList size={15} />
            Test-wise
          </div>
          <ChevronRight size={13} className="text-[var(--text3)]" />
        </button>

        <button
          onClick={() => { setView('chapter-wise'); setSortField('wrong'); setSortDir('desc'); }}
          className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            view === 'chapter-wise'
              ? 'bg-[var(--bg2)] text-[var(--text)] border border-[var(--border)]'
              : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)] border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookMarked size={15} />
            Chapter-wise
          </div>
          <ChevronRight size={13} className="text-[var(--text3)]" />
        </button>

        <div className="mt-auto pt-4 border-t border-[var(--border)]">
          <button onClick={fetchData} className="flex items-center gap-2 text-[11px] text-[var(--text3)] hover:text-[var(--text2)] transition-colors font-mono">
            <RefreshCw size={12} /> Refresh data
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 px-4 md:px-8 py-8 pb-28 max-w-5xl">

        {/* Mobile nav pills */}
        <div className="flex md:hidden gap-2 mb-6">
          {(['test-wise', 'chapter-wise'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                view === v ? 'bg-[var(--bg2)] text-[var(--text)] border-[var(--border)]' : 'text-[var(--text3)] border-[var(--border)] hover:border-[var(--border-hover)]'
              }`}>{v.replace('-', ' ')}</button>
          ))}
        </div>

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-[var(--text)] mb-1">
            {view === 'test-wise' ? 'Test-wise Mistakes' : 'Chapter-wise Mistakes'}
          </h1>
          <p className="text-sm text-[var(--text2)]">Revisit questions which you either attempted incorrectly or didn't attempt.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-6 text-sm text-red-400">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* Chapter-wise: subject tabs */}
        {view === 'chapter-wise' && subjects.length > 0 && (
          <div className="flex gap-1 border-b border-[var(--border)] mb-6 overflow-x-auto">
            <button
              onClick={() => setSubjectFilter('all')}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${
                subjectFilter === 'all' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >All Subjects</button>
            {subjects.map(s => {
              const meta = getSubjectMeta(s);
              return (
                <button key={s} onClick={() => setSubjectFilter(s)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${
                    subjectFilter === s ? 'text-[var(--text)]' : 'text-[var(--text3)] hover:text-[var(--text2)]'
                  }`}
                  style={{ borderBottomColor: subjectFilter === s ? meta.color : 'transparent', color: subjectFilter === s ? meta.color : undefined }}
                >
                  {meta.icon} {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              );
            })}
          </div>
        )}

        {/* Test-wise: filter tabs */}
        {view === 'test-wise' && (
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { key: 'all', label: 'All' },
              { key: 'last3', label: 'Last 3 Tests' },
              { key: 'last5', label: 'Last 5 Tests' },
              { key: 'last30', label: 'Last 30 days' },
            ].map(opt => (
              <button key={opt.key} onClick={() => setTestFilter(opt.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide border transition-all ${
                  testFilter === opt.key
                    ? 'bg-[var(--accent)] text-white border-transparent'
                    : 'text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hover)] hover:text-[var(--text)]'
                }`}>{opt.label}</button>
            ))}
          </div>
        )}

        {/* ── Overview Chart Card ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] mb-5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="font-bold text-[var(--text)] text-sm">Your Mistakes Overview</div>
              <div className="text-[11px] text-[var(--text3)] mt-0.5">
                This graph shows how you performed {view === 'test-wise' ? 'through different tests' : 'across different chapters'} you attempted
              </div>
            </div>
            <button onClick={() => setShowChart(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[var(--text2)] hover:text-[var(--text)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all font-mono">
              {showChart ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showChart ? 'Hide' : 'Show'}
            </button>
          </div>

          {showChart && (
            <div className="px-2 pb-4">
              {/* Legend */}
              <div className="flex gap-4 px-4 mb-3">
                {[['#f87171', 'Incorrect Qs'], ['#34d399', 'Correct Qs'], [notAttemptedLineColor, 'Not attempted Qs']].map(([color, label]) => (
                  <div key={label as string} className="flex items-center gap-1.5 text-[10px] text-[var(--text3)]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: color as string }} />
                    {label}
                  </div>
                ))}
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="Incorrect Qs" stroke="#f87171" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Correct Qs" stroke="#34d399" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Not attempted" stroke={notAttemptedLineColor} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-[var(--text3)] text-sm">No data to display</div>
              )}
            </div>
          )}
        </div>

        {/* ── Table Card ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <div className="font-bold text-[var(--text)] text-sm">
              {view === 'test-wise' ? 'Test-wise Mistakes' : 'Chapter-wise Mistakes'}
            </div>
            <button onClick={() => sortToggle(sortField)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[var(--text2)] hover:text-[var(--text)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all font-mono">
              <ArrowUpDown size={11} /> Sort By
            </button>
          </div>

          {/* Table header */}
          <div className="grid gap-2 px-5 py-3 border-b border-[var(--border)]" style={{ gridTemplateColumns: '1fr 90px 90px 90px 90px 90px' }}>
            <div className="text-[11px] font-semibold text-[var(--text3)]">{nameCol}</div>
            {[
              { key: 'accuracy', label: 'Accuracy Trend' },
              { key: 'wrong', label: 'Attempted Wrong', cls: 'text-red-400' },
              { key: 'notAttempted', label: 'Not Attempted' },
              { key: 'correct', label: 'Attempted Correct', cls: 'text-emerald-400' },
              { key: 'total', label: 'Total Questions' },
            ].map(col => (
              <button key={col.key} onClick={() => col.key !== 'accuracy' && sortToggle(col.key)}
                className={`text-[11px] font-semibold text-center transition-colors ${col.cls || 'text-[var(--text3)]'} ${col.key !== 'accuracy' ? 'hover:text-[var(--text)] cursor-pointer' : 'cursor-default'}`}>
                {col.label}
                {sortField === col.key && <span className="ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </button>
            ))}
          </div>

          {/* Rows */}
          {activeRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Trophy size={28} className="text-emerald-400 mb-3" />
              <div className="text-sm font-bold text-[var(--text2)] mb-1">No mistakes found!</div>
              <div className="text-xs text-[var(--text3)]">Keep solving — mistakes will appear here for revision.</div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {activeRows.map((row, idx) => {
                const title = view === 'test-wise' ? (row as TestRow).testTitle : (row as ChapterRow).chapter;
                const subtitle = view === 'test-wise'
                  ? new Date((row as TestRow).date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : (row as ChapterRow).subject.charAt(0).toUpperCase() + (row as ChapterRow).subject.slice(1);
                const subjectColor = view === 'chapter-wise' ? getSubjectMeta((row as ChapterRow).subject).color : undefined;

                return (
                  <button
                    key={idx}
                    onClick={() => setDrill({ type: view === 'test-wise' ? 'test' : 'chapter', row })}
                    className="w-full grid gap-2 px-5 py-4 hover:bg-[var(--bg2)] transition-colors text-left group"
                    style={{ gridTemplateColumns: '1fr 90px 90px 90px 90px 90px' }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronRight size={13} className="flex-shrink-0 text-[var(--text3)] group-hover:text-[var(--text2)] transition-colors" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors">{title}</div>
                        <div className="text-[10px] mt-0.5 font-mono" style={{ color: subjectColor || 'var(--text3)' }}>{subtitle}</div>
                      </div>
                    </div>
                    <div className="flex justify-center items-center">
                      <AccuracyDonut wrong={row.wrong} correct={row.correct} total={row.total} />
                    </div>
                    <div className="flex justify-center items-center text-sm font-black text-red-400">{row.wrong}</div>
                    <div className="flex justify-center items-center text-sm font-semibold text-[var(--text2)]">{row.notAttempted}</div>
                    <div className="flex justify-center items-center text-sm font-black text-emerald-400">{row.correct}</div>
                    <div className="flex justify-center items-center text-sm font-bold text-[var(--text)]">{row.total}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
