'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import {
  BookMarked, Loader2, ChevronDown, ChevronRight, XCircle,
  Eye, EyeOff, Search, AlertTriangle, RefreshCw,
  CheckCircle2, BookOpen, Layers, Zap, FlaskConical,
  Atom, Trophy, Filter, ChevronUp
} from 'lucide-react';

// ─── KaTeX helpers (same pattern as BookletsTab / solving page) ─────────────
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
  let clean = text;
  clean = clean.replace(/\\+text(?=\{)/g, '\\text');
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
  return (
    <div ref={ref} className={className}
      dangerouslySetInnerHTML={{ __html: formatText(text) }} />
  );
});

// ─── Types ───────────────────────────────────────────────────────────────────
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
  // From user_attempts
  selected_answer: string;
  attempted_at: string;
  source: 'solver' | 'mock'; // which table the mistake came from
}

interface ChapterGroup {
  name: string;
  questions: MistakeQuestion[];
}

interface SubjectGroup {
  name: string;
  icon: React.ReactNode;
  color: string;
  chapters: ChapterGroup[];
  total: number;
}

// ─── Subject icon/color mapping ───────────────────────────────────────────────
const SUBJECT_META: Record<string, { icon: React.ReactNode; color: string }> = {
  physics:   { icon: <Atom size={16} />,        color: '#3b82f6' },
  chemistry: { icon: <FlaskConical size={16} />, color: '#10b981' },
  maths:     { icon: <Zap size={16} />,          color: '#f59e0b' },
  math:      { icon: <Zap size={16} />,          color: '#f59e0b' },
  biology:   { icon: <BookOpen size={16} />,     color: '#a855f7' },
};
function getSubjectMeta(subject: string) {
  return SUBJECT_META[subject.toLowerCase()] ?? { icon: <Layers size={16} />, color: '#94a3b8' };
}

// ─── Difficulty badge ─────────────────────────────────────────────────────────
function DiffBadge({ diff }: { diff: string | null }) {
  if (!diff) return null;
  const map: Record<string, string> = {
    easy:     'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    medium:   'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    moderate: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    hard:     'bg-red-500/10 text-red-500 border-red-500/20',
  };
  const cls = map[diff.toLowerCase()] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${cls}`}>
      {diff}
    </span>
  );
}

// ─── Single question card ─────────────────────────────────────────────────────
const QuestionCard = memo(function QuestionCard({ q, index }: { q: MistakeQuestion; index: number }) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const isMCQ = q.type !== 'integer';
  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

  const correctIdx = isMCQ ? parseInt(q.correct_answer, 10) : null;
  const selectedIdx = isMCQ ? parseInt(q.selected_answer, 10) : null;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:border-red-500/30 hover:shadow-red-500/5 transition-all duration-200">
      {/* Question header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 font-black text-xs font-mono">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <DiffBadge diff={q.difficulty} />
            {q.topic && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium text-[var(--text3)] bg-[var(--bg2)] border border-[var(--border)]">
                {q.topic}
              </span>
            )}
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
              q.source === 'mock'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            }`}>
              {q.source === 'mock' ? 'Mock Test' : 'Solver'}
            </span>
          </div>
          <MathText text={q.question_text} className="text-sm text-[var(--text)] leading-relaxed" />
          {q.question_image_url && (
            <img src={q.question_image_url} alt="question" className="mt-2 max-h-48 rounded-lg border border-[var(--border)] object-contain" />
          )}
        </div>
      </div>

      {/* MCQ Options */}
      {isMCQ && q.options && q.options.length > 0 && (
        <div className="px-4 pb-3 space-y-1.5">
          {q.options.map((opt, i) => {
            const isCorrect = i === correctIdx;
            const isSelected = i === selectedIdx;
            const isWrong = isSelected && !isCorrect;

            return (
              <div
                key={i}
                className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-xs transition-all ${
                  isCorrect
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : isWrong
                    ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                    : 'bg-[var(--bg2)] border-[var(--border)] text-[var(--text2)]'
                }`}
              >
                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-black text-[9px] ${
                  isCorrect ? 'bg-emerald-500 text-white' :
                  isWrong   ? 'bg-red-500 text-white' :
                              'bg-[var(--bg3)] text-[var(--text3)]'
                }`}>
                  {optionLabels[i]}
                </span>
                <div className="flex-1 min-w-0">
                  {opt.text && <MathText text={opt.text} />}
                  {opt.image && <img src={opt.image} alt={`option ${i}`} className="mt-1 max-h-20 object-contain rounded" />}
                  {!opt.text && !opt.image && <span className="text-[var(--text3)]">Option {optionLabels[i]}</span>}
                </div>
                {isCorrect && <CheckCircle2 size={12} className="flex-shrink-0 mt-0.5 text-emerald-500" />}
                {isWrong   && <XCircle     size={12} className="flex-shrink-0 mt-0.5 text-red-500" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Integer type — show answer */}
      {!isMCQ && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
              <XCircle size={12} className="text-red-500" />
              <span className="text-[var(--text2)]">Your answer:</span>
              <span className="font-black text-red-500 font-mono">{q.selected_answer || '—'}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle2 size={12} className="text-emerald-500" />
              <span className="text-[var(--text2)]">Correct:</span>
              <span className="font-black text-emerald-500 font-mono">{q.correct_answer}</span>
            </div>
          </div>
        </div>
      )}

      {/* Explanation toggle */}
      {q.explanation && (
        <div className="border-t border-[var(--border)] px-4 py-2">
          <button
            onClick={() => setShowExplanation(v => !v)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] hover:opacity-80 transition-opacity"
          >
            {showExplanation ? <EyeOff size={12} /> : <Eye size={12} />}
            {showExplanation ? 'Hide' : 'Show'} Explanation
          </button>
          {showExplanation && (
            <div className="mt-2 p-3 bg-[var(--bg2)] rounded-xl border border-[var(--border)]">
              <MathText text={q.explanation} className="text-xs text-[var(--text2)] leading-relaxed" />
              {q.explanation_image_url && (
                <img src={q.explanation_image_url} alt="explanation" className="mt-2 max-h-48 rounded-lg object-contain" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BookletsPage() {
  const { profile, loading: profileLoading } = useProfile();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectGroup[]>([]);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [diffFilter, setDiffFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // ── Fetch all mistakes ──────────────────────────────────────────────────────
  const fetchMistakes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // 1. Mistakes from solver (user_attempts table, is_correct = false)
      const { data: solverMistakes, error: e1 } = await supabase
        .from('user_attempts')
        .select(`
          id,
          question_id,
          selected_answer,
          created_at,
          questions!inner (
            id, subject, chapter, topic, difficulty, type,
            question_text, question_image_url, options,
            correct_answer, explanation, explanation_image_url
          )
        `)
        .eq('user_id', user.id)
        .eq('is_correct', false)
        .order('created_at', { ascending: false });

      if (e1) throw e1;

      // 2. Mistakes from mock tests (mock_test_live_attempts, completed = true)
      //    We get answers vs correct_answer from joined questions
      const { data: mockAttempts, error: e2 } = await supabase
        .from('mock_test_live_attempts')
        .select('id, test_id, answers, completed')
        .eq('user_id', user.id)
        .eq('completed', true);

      if (e2) throw e2;

      // Collect question IDs answered incorrectly in mock tests
      const mockWrongMap: Record<string, string> = {}; // questionId → selectedAnswer
      for (const attempt of (mockAttempts || [])) {
        const answers: Record<string, string | null> = attempt.answers || {};
        for (const [qId, ans] of Object.entries(answers)) {
          if (ans !== null && ans !== undefined && !(qId in mockWrongMap)) {
            mockWrongMap[qId] = ans; // placeholder — filter by correctness below
          }
        }
      }

      let mockMistakes: MistakeQuestion[] = [];
      if (Object.keys(mockWrongMap).length > 0) {
        const mockQIds = Object.keys(mockWrongMap);
        // Fetch in batches of 100 to stay within URL limits
        const batches: string[][] = [];
        for (let i = 0; i < mockQIds.length; i += 100) {
          batches.push(mockQIds.slice(i, i + 100));
        }
        for (const batch of batches) {
          const { data: qData } = await supabase
            .from('questions')
            .select('id, subject, chapter, topic, difficulty, type, question_text, question_image_url, options, correct_answer, explanation, explanation_image_url')
            .in('id', batch);

          for (const q of (qData || [])) {
            const selected = mockWrongMap[q.id];
            if (selected !== null && selected !== q.correct_answer) {
              mockMistakes.push({
                ...q,
                selected_answer: selected,
                attempted_at: '',
                source: 'mock',
              });
            }
          }
        }
      }

      // 3. Merge solver + mock, deduplicate by question_id (prefer solver entry if both exist)
      const seen = new Set<string>();
      const allMistakes: MistakeQuestion[] = [];

      for (const row of (solverMistakes || [])) {
        const q = (row as any).questions as MistakeQuestion;
        if (!q || seen.has(q.id)) continue;
        seen.add(q.id);
        allMistakes.push({
          ...q,
          selected_answer: row.selected_answer,
          attempted_at: row.created_at,
          source: 'solver',
        });
      }

      for (const q of mockMistakes) {
        if (seen.has(q.id)) continue;
        seen.add(q.id);
        allMistakes.push(q);
      }

      setTotalMistakes(allMistakes.length);

      // 4. Group: subject → chapter
      const subjectMap = new Map<string, Map<string, MistakeQuestion[]>>();
      for (const q of allMistakes) {
        const subj = (q.subject || 'Unknown').toLowerCase();
        const chap = q.chapter || 'Uncategorized';
        if (!subjectMap.has(subj)) subjectMap.set(subj, new Map());
        const cm = subjectMap.get(subj)!;
        if (!cm.has(chap)) cm.set(chap, []);
        cm.get(chap)!.push(q);
      }

      const grouped: SubjectGroup[] = [];
      for (const [subjName, chapMap] of subjectMap) {
        const meta = getSubjectMeta(subjName);
        const chapters: ChapterGroup[] = [];
        let total = 0;
        for (const [chapName, qs] of chapMap) {
          chapters.push({ name: chapName, questions: qs });
          total += qs.length;
        }
        // Sort chapters alphabetically
        chapters.sort((a, b) => a.name.localeCompare(b.name));
        grouped.push({ name: subjName, chapters, total, ...meta });
      }

      // Sort subjects by name
      grouped.sort((a, b) => a.name.localeCompare(b.name));
      setSubjects(grouped);

      // Auto-expand first subject if only one
      if (grouped.length === 1) {
        setExpandedSubjects(new Set([grouped[0].name]));
      }
    } catch (err: any) {
      console.error('BookletsPage error:', err);
      setError(err?.message || 'Failed to load mistakes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profileLoading) fetchMistakes();
  }, [profileLoading, fetchMistakes]);

  // ── Toggle helpers ──────────────────────────────────────────────────────────
  const toggleSubject = (name: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleChapter = (key: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ── Filtered data ───────────────────────────────────────────────────────────
  const filteredSubjects = subjects
    .filter(s => subjectFilter === 'all' || s.name === subjectFilter)
    .map(s => ({
      ...s,
      chapters: s.chapters
        .map(c => ({
          ...c,
          questions: c.questions.filter(q => {
            const matchSearch = !search ||
              q.question_text.toLowerCase().includes(search.toLowerCase()) ||
              q.chapter.toLowerCase().includes(search.toLowerCase()) ||
              (q.topic || '').toLowerCase().includes(search.toLowerCase());
            const matchDiff = diffFilter === 'all' ||
              (q.difficulty || '').toLowerCase() === diffFilter;
            return matchSearch && matchDiff;
          }),
        }))
        .filter(c => c.questions.length > 0),
    }))
    .filter(s => s.chapters.length > 0);

  const allSubjectNames = subjects.map(s => s.name);
  const filteredTotal = filteredSubjects.reduce((sum, s) => sum + s.chapters.reduce((cs, c) => cs + c.questions.length, 0), 0);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (profileLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
        <p className="text-xs text-[var(--text3)] uppercase tracking-widest font-mono animate-pulse">
          Loading Mistakes Library...
        </p>
      </div>
    );
  }

  return (
    <div className="an-content max-w-5xl mx-auto py-8 px-4 sm:px-6 pb-28">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 font-mono">
          <BookMarked size={14} />
          Study Toolkit · Booklets
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black font-[family-name:var(--font-bebas)] tracking-wider text-[var(--text)] mb-1">
              📕 My Mistakes Library
            </h1>
            <p className="text-xs text-[var(--text2)] max-w-xl leading-relaxed">
              Every question you've got wrong — from Solver practice sessions and Mock Tests — compiled, categorized, and ready for revision.
            </p>
          </div>
          <button
            onClick={fetchMistakes}
            className="flex-shrink-0 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl bg-[var(--bg2)] border border-[var(--border)] hover:border-[var(--accent)]/40 text-[var(--text2)] hover:text-[var(--accent)] transition-all font-mono"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>

        {/* Stats row */}
        <div className="mt-5 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <XCircle size={14} className="text-red-500" />
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-red-400 font-mono">Total Mistakes</div>
              <div className="text-lg font-black text-red-500 leading-none">{totalMistakes}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg2)] border border-[var(--border)] rounded-2xl">
            <Layers size={14} className="text-[var(--accent)]" />
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text3)] font-mono">Subjects</div>
              <div className="text-lg font-black text-[var(--text)] leading-none">{subjects.length}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg2)] border border-[var(--border)] rounded-2xl">
            <BookOpen size={14} className="text-[var(--accent)]" />
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text3)] font-mono">Chapters</div>
              <div className="text-lg font-black text-[var(--text)] leading-none">
                {subjects.reduce((s, sub) => s + sub.chapters.length, 0)}
              </div>
            </div>
          </div>
          {totalMistakes === 0 && !loading && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <Trophy size={14} className="text-emerald-500" />
              <div className="text-xs font-bold text-emerald-500">No mistakes yet — perfect record! 🎉</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions, chapters, topics..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/30 focus:border-[var(--accent)] rounded-2xl text-[var(--text)] outline-none transition-colors"
          />
        </div>
        {/* Subject filter */}
        <div className="relative">
          <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            className="pl-8 pr-8 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/30 rounded-2xl text-[var(--text)] outline-none transition-colors appearance-none cursor-pointer font-mono"
          >
            <option value="all">All Subjects</option>
            {allSubjectNames.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none" />
        </div>
        {/* Difficulty filter */}
        <div className="relative">
          <select
            value={diffFilter}
            onChange={e => setDiffFilter(e.target.value)}
            className="pl-4 pr-8 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/30 rounded-2xl text-[var(--text)] outline-none transition-colors appearance-none cursor-pointer font-mono"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none" />
        </div>
      </div>

      {/* ── Error state ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-6 text-sm text-red-500">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!loading && !error && totalMistakes === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
            <Trophy size={28} className="text-emerald-500" />
          </div>
          <h3 className="text-lg font-black text-[var(--text)] mb-2 font-[family-name:var(--font-bebas)] tracking-wider">
            NO MISTAKES YET!
          </h3>
          <p className="text-sm text-[var(--text3)] max-w-xs leading-relaxed">
            Your Mistakes Library is empty. Keep solving questions and attempting mock tests — any incorrect answers will appear here for revision.
          </p>
        </div>
      )}

      {/* ── No results after filter ───────────────────────────────────────────── */}
      {!loading && !error && totalMistakes > 0 && filteredSubjects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search size={32} className="text-[var(--text3)] mb-3" />
          <p className="text-sm font-bold text-[var(--text2)]">No questions match your filters</p>
          <button onClick={() => { setSearch(''); setSubjectFilter('all'); setDiffFilter('all'); }}
            className="mt-3 text-xs text-[var(--accent)] hover:underline font-mono uppercase tracking-wider">
            Clear Filters
          </button>
        </div>
      )}

      {/* ── Subject → Chapter → Questions tree ───────────────────────────────── */}
      {filteredSubjects.length > 0 && (
        <div className="space-y-4">
          {/* Results count when filtering */}
          {(search || subjectFilter !== 'all' || diffFilter !== 'all') && (
            <div className="text-[10px] text-[var(--text3)] font-mono uppercase tracking-wider">
              Showing {filteredTotal} of {totalMistakes} mistakes
            </div>
          )}

          {filteredSubjects.map(subj => {
            const isSubjExpanded = expandedSubjects.has(subj.name);
            const displayName = subj.name.charAt(0).toUpperCase() + subj.name.slice(1);

            return (
              <div key={subj.name} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
                {/* Subject header */}
                <button
                  onClick={() => toggleSubject(subj.name)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[var(--bg2)] transition-colors text-left"
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${subj.color}18`, color: subj.color, border: `1px solid ${subj.color}30` }}
                  >
                    {subj.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-[var(--text)] uppercase tracking-wider font-mono">{displayName}</div>
                    <div className="text-[10px] text-[var(--text3)] font-mono">
                      {subj.chapters.length} chapter{subj.chapters.length !== 1 ? 's' : ''} · {subj.total} mistake{subj.total !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {/* Chapter count pills */}
                  <div className="flex gap-1 mr-2">
                    {subj.chapters.slice(0, 3).map(c => (
                      <span key={c.name} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)] whitespace-nowrap font-mono">
                        {c.questions.length}
                      </span>
                    ))}
                    {subj.chapters.length > 3 && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)] font-mono">
                        +{subj.chapters.length - 3}
                      </span>
                    )}
                  </div>
                  {isSubjExpanded
                    ? <ChevronUp size={16} className="flex-shrink-0 text-[var(--text3)]" />
                    : <ChevronRight size={16} className="flex-shrink-0 text-[var(--text3)]" />}
                </button>

                {/* Chapters list */}
                {isSubjExpanded && (
                  <div className="border-t border-[var(--border)]">
                    {subj.chapters.map(chap => {
                      const chapKey = `${subj.name}::${chap.name}`;
                      const isChapExpanded = expandedChapters.has(chapKey);

                      return (
                        <div key={chap.name} className="border-b border-[var(--border)] last:border-b-0">
                          {/* Chapter header */}
                          <button
                            onClick={() => toggleChapter(chapKey)}
                            className="w-full flex items-center gap-3 px-5 py-3 pl-14 hover:bg-[var(--bg2)] transition-colors text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-[var(--text)] truncate">{chap.name}</div>
                              <div className="text-[9px] text-[var(--text3)] font-mono">
                                {chap.questions.length} wrong question{chap.questions.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <div
                              className="flex-shrink-0 text-[10px] font-black px-2.5 py-1 rounded-lg font-mono"
                              style={{ background: `${subj.color}15`, color: subj.color }}
                            >
                              {chap.questions.length}
                            </div>
                            {isChapExpanded
                              ? <ChevronUp size={14} className="flex-shrink-0 text-[var(--text3)]" />
                              : <ChevronRight size={14} className="flex-shrink-0 text-[var(--text3)]" />}
                          </button>

                          {/* Questions list */}
                          {isChapExpanded && (
                            <div className="px-4 pb-4 pl-14 space-y-3 bg-[var(--bg2)]/30">
                              {chap.questions.map((q, i) => (
                                <QuestionCard key={q.id} q={q} index={i} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
