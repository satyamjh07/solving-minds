'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import {
  Loader2, AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight,
  LayoutGrid, X, Check, X as XIcon, HelpCircle
} from 'lucide-react';

// ─── Math/KaTeX Rendering Helpers ──────────────────────────────────────────

const formatText = (text: string) => {
  if (!text) return '';
  let clean = text;

  // Strip \multicolumn{n}{align}{text} → just the text (KaTeX doesn't support it)
  clean = clean.replace(/\\+multicolumn\{[^}]*\}\{[^}]*\}\{([^}]*)\}/g, '$1');
  // Also handle \multicolumn without braces (malformed): \multicolumn2c|TEXT → TEXT
  clean = clean.replace(/\\+multicolumn\d+[^|]*\|/g, '');

  // Global fixes for common legacy KaTeX syntax errors (matching 1 or more backslashes)
  clean = clean.replace(/\\+text(?=\{)/g, '\\text');

  // Split by math delimiters to safely replace text formatting outside math
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
  const parts = clean.split(mathRegex);

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Outside math
      let p = parts[i];
      p = p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      p = p.replace(/\\+textbf\{((?:[^{}]|\{[^{}]*\})*)\}/g, '<strong>$1</strong>');
      p = p.replace(/\\+textit\{((?:[^{}]|\{[^{}]*\})*)\}/g, '<em>$1</em>');
      // Replace literal \\ with <br/>
      p = p.replace(/\\\\/g, '<br/>');
      // Replace Markdown image syntax: ![alt](url)
      p = p.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="q-inline-img" style="display:inline-block; max-height: 200px; margin: 5px;" />');
      // Normal newlines
      p = p.replace(/\n/g, '<br/>');
      parts[i] = p;
    }
  }

  return parts.join('');
};

const renderMath = (el: HTMLElement | null) => {
  if (!el || !(window as any).renderMathInElement) return;
  try {
    (window as any).renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true },
      ],
      throwOnError: false,
    });
  } catch (_) {}
};

interface QuestionTextProps {
  text: string;
  className?: string;
}

const QuestionText = React.memo(function QuestionText({ text, className = '' }: QuestionTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) renderMath(ref.current);
  }, [text]);
  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: formatText(text) }}
    />
  );
});

// Color coding for Solution Palette Badge: Correct = green, Incorrect = red, Unattempted = gray
type ResultType = 'correct' | 'incorrect' | 'unattempted';

interface PaletteBadgeProps {
  result: ResultType;
  num: string | number;
  isActive?: boolean;
}

const PaletteBadge = ({ result, num, isActive = false }: PaletteBadgeProps) => {
  const activeClass = isActive ? 'ring-2 ring-blue-500 ring-offset-1 scale-105' : '';
  
  if (result === 'unattempted') {
    return (
      <div className={`w-9 h-8 bg-gray-250 border border-gray-300 text-gray-700 flex items-center justify-center font-bold text-[13px] rounded-sm select-none ${activeClass}`} style={{ backgroundColor: '#e2e8f0' }}>
        {num}
      </div>
    );
  }
  if (result === 'incorrect') {
    return (
      <div 
        className={`w-9 h-8 bg-[#ef4444] text-white flex items-center justify-center font-bold text-[13px] select-none ${activeClass}`}
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)' }}
      >
        <span className="pb-1">{num}</span>
      </div>
    );
  }
  if (result === 'correct') {
    return (
      <div 
        className={`w-9 h-8 bg-[#10b981] text-white flex items-center justify-center font-bold text-[13px] select-none ${activeClass}`}
        style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%)' }}
      >
        {num}
      </div>
    );
  }
  return null;
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface Option { id: string; text: string; image?: string | null; }

interface Question {
  id: string;
  subject: string;
  chapter: string;
  topic: string;
  type: string; // 'mcq' | 'integer'
  question_text: string;
  question_image_url: string | null;
  options: Option[];
  correct_answer: string;
  explanation: string | null;
  explanation_image_url: string | null;
  marks: number;
}

interface MockTest {
  id: string;
  title: string;
  exam_type: string;
  duration: number;
  total_questions: number;
  total_marks: number;
  is_pyp: boolean;
  year?: number;
  shift?: string;
  subjects: string[];
}

interface LiveAttempt {
  id: string;
  test_id: string;
  answers: Record<string, string | null>;
  statuses: Record<string, string>;
  time_left: number;
  completed: boolean;
  question_durations: Record<string, number>;
}

const SECTION_ORDER: Record<string, string[]> = {
  'jee-main':     ['Physics', 'Chemistry', 'Mathematics'],
  'jee-advanced': ['Physics', 'Chemistry', 'Mathematics'],
  'neet':         ['Physics', 'Chemistry', 'Botany', 'Zoology'],
};

const sortSections = (secs: string[], examType: string) => {
  const order = SECTION_ORDER[examType] || [];
  return [...secs].sort((a, b) => {
    const ai = order.indexOf(a), bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1; if (bi === -1) return -1;
    return ai - bi;
  });
};

const formatTime = (s: number) => {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function SolutionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = params.id as string;
  const attemptId = searchParams.get('attemptId');
  const { profile } = useProfile();

  // ── Data state ──
  const [test, setTest] = useState<MockTest | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<LiveAttempt | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Solution review navigation state ──
  const [currentSection, setCurrentSection] = useState('');
  const [currentSubsection, setCurrentSubsection] = useState<'single-correct' | 'numerical'>('single-correct');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPalette, setShowPalette] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // KaTeX ref
  const questionRef = useRef<HTMLDivElement>(null);

  const renderKatex = useCallback(() => {
    if (questionRef.current && typeof window !== 'undefined' && (window as any).renderMathInElement) {
      try {
        (window as any).renderMathInElement(questionRef.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true },
          ],
          throwOnError: false,
        });
      } catch (_) {}
    }
  }, []);

  // ── Load data ──
  useEffect(() => {
    const load = async () => {
      try {
        // Fetch test details
        const { data: testData, error: testErr } = await supabase.from('mock_tests').select('*').eq('id', testId).single();
        if (testErr || !testData) { setError('Test not found.'); setLoading(false); return; }
        setTest(testData);

        // Fetch User and Attempt
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError('You must be logged in to view solutions.'); setLoading(false); return; }

        let attemptQuery = supabase
          .from('mock_test_live_attempts')
          .select('*')
          .eq('user_id', user.id)
          .eq('test_id', testId)
          .eq('completed', true);

        if (attemptId) {
          attemptQuery = attemptQuery.eq('id', attemptId);
        }

        const { data: attemptData, error: attemptErr } = await attemptQuery
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (attemptErr || !attemptData) {
          setError('Attempt data not found.');
          setLoading(false);
          return;
        }
        setAttempt(attemptData);

        // Fetch questions
        let query = supabase.from('questions').select('*');
        if (testData.is_pyp && testData.year && testData.shift) {
          query = (query as any).eq('year', testData.year).eq('shift', testData.shift);
        } else {
          query = (query as any).eq('booklet_id', testId);
        }

        const { data: qData } = await query.order('subject').order('id');
        const qs: Question[] = (qData || []).map((q: any) => {
          let opts = typeof q.options === 'string' ? (() => { try { return JSON.parse(q.options); } catch { return []; } })() : (q.options || []);
          opts = opts.map((o: any, idx: number) => ({
            ...o,
            id: o.id || (idx + 1).toString()
          }));
          return {
            ...q,
            options: opts
          };
        });

        setQuestions(qs);

        const uniqueSubs = [...new Set(qs.map(q => q.subject))] as string[];
        const sorted = sortSections(uniqueSubs, testData.exam_type);
        setSections(sorted);

        // Initialize view to first section and first question
        if (sorted.length > 0) {
          setCurrentSection(sorted[0]);
          const firstQSubQs = qs.filter(q => q.subject === sorted[0]);
          const hasMCQ = firstQSubQs.some(q => q.type !== 'integer');
          setCurrentSubsection(hasMCQ ? 'single-correct' : 'numerical');
          setCurrentIndex(0);
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to load solution reviewer.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [testId, attemptId]);

  // Re-render KaTeX when active question changes
  useEffect(() => {
    if (!loading) setTimeout(renderKatex, 80);
  }, [currentSection, currentSubsection, currentIndex, loading, renderKatex]);

  // ─── Derived ─────────────────────────────────────────────────────────────

  const currentSubQs = questions.filter(q => 
    q.subject === currentSection && 
    (currentSubsection === 'numerical' ? q.type === 'integer' : q.type !== 'integer')
  );
  const currentQ = currentSubQs[currentIndex] || null;

  // Jump to specific question
  const jumpToQuestion = (subject: string, subsection: 'single-correct' | 'numerical', index: number) => {
    setCurrentSection(subject);
    setCurrentSubsection(subsection);
    setCurrentIndex(index);
    setShowPalette(false);
  };

  // Previous and Next solutions helpers
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      // Look if there's a previous subsection
      if (currentSubsection === 'numerical') {
        const hasMCQ = questions.some(q => q.subject === currentSection && q.type !== 'integer');
        if (hasMCQ) {
          setCurrentSubsection('single-correct');
          const prevSubQs = questions.filter(q => q.subject === currentSection && q.type !== 'integer');
          setCurrentIndex(prevSubQs.length - 1);
        }
      } else {
        // Go to previous section
        const si = sections.indexOf(currentSection);
        if (si > 0) {
          const prevSec = sections[si - 1];
          const prevSecQs = questions.filter(q => q.subject === prevSec);
          const hasNumerical = prevSecQs.some(q => q.type === 'integer');
          setCurrentSection(prevSec);
          setCurrentSubsection(hasNumerical ? 'numerical' : 'single-correct');
          const subQs = prevSecQs.filter(q => hasNumerical ? q.type === 'integer' : q.type !== 'integer');
          setCurrentIndex(subQs.length - 1);
        }
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < currentSubQs.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Look if we can go to numerical subsection
      if (currentSubsection === 'single-correct') {
        const hasNumerical = questions.some(q => q.subject === currentSection && q.type === 'integer');
        if (hasNumerical) {
          setCurrentSubsection('numerical');
          setCurrentIndex(0);
        } else {
          // Go to next section
          const si = sections.indexOf(currentSection);
          if (si < sections.length - 1) {
            const nextSec = sections[si + 1];
            setCurrentSection(nextSec);
            const nextSecQs = questions.filter(q => q.subject === nextSec);
            const hasMCQ = nextSecQs.some(q => q.type !== 'integer');
            setCurrentSubsection(hasMCQ ? 'single-correct' : 'numerical');
            setCurrentIndex(0);
          }
        }
      } else {
        // Go to next section
        const si = sections.indexOf(currentSection);
        if (si < sections.length - 1) {
          const nextSec = sections[si + 1];
          setCurrentSection(nextSec);
          const nextSecQs = questions.filter(q => q.subject === nextSec);
          const hasMCQ = nextSecQs.some(q => q.type !== 'integer');
          setCurrentSubsection(hasMCQ ? 'single-correct' : 'numerical');
          setCurrentIndex(0);
        }
      }
    }
  };

  // Get question result state: correct, incorrect, unattempted
  const getQuestionResult = (qId: string, correctAns: string): ResultType => {
    if (!attempt) return 'unattempted';
    const ans = attempt.answers[qId];
    if (!ans) return 'unattempted';
    return ans.trim() === correctAns.trim() ? 'correct' : 'incorrect';
  };

  const getSectionPaletteStats = (sec: string, sub: 'single-correct' | 'numerical') => {
    const subQs = questions.filter(q => 
      q.subject === sec && 
      (sub === 'numerical' ? q.type === 'integer' : q.type !== 'integer')
    );
    let correct = 0, incorrect = 0, unattempted = 0;
    subQs.forEach(q => {
      const res = getQuestionResult(q.id, q.correct_answer);
      if (res === 'correct') correct++;
      else if (res === 'incorrect') incorrect++;
      else unattempted++;
    });
    return { total: subQs.length, correct, incorrect, unattempted };
  };

  // Loading and Error boundaries
  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading solutions...</p>
      </div>
    </div>
  );

  if (error || !test || !attempt) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div className="text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="text-gray-700 font-semibold">{error || 'Failed to load details.'}</p>
        <button onClick={() => router.push('/tests')} className="mt-4 text-sm text-blue-600 hover:underline">← Back to Test Center</button>
      </div>
    </div>
  );

  const qNumber = currentIndex + 1;
  const currentResult = currentQ ? getQuestionResult(currentQ.id, currentQ.correct_answer) : 'unattempted';
  const currentAnswer = currentQ ? attempt.answers[currentQ.id] : null;
  const currentTimeSpent = currentQ ? (attempt.question_durations[currentQ.id] || 0) : 0;
  const sidebarStats = currentSection ? getSectionPaletteStats(currentSection, currentSubsection) : null;

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden select-none font-sans"
      style={{ background: '#ffffff', fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      {/* ══════════════ TOP BAR (NTA STYLE READ ONLY) ══════════════ */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 h-12 z-30 border-b border-gray-800"
        style={{ background: '#2c2c2c' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/analysis/${attempt.id}`)}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-[11px] font-bold font-mono transition-colors uppercase tracking-wider"
          >
            <ArrowLeft size={12} /> Back to Analysis
          </button>
          <div className="text-[#ffeb3b] font-black text-xs sm:text-sm uppercase tracking-wide truncate max-w-[150px] sm:max-w-md">
            {test.title} (SOLUTION KEY)
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowPalette(p => !p)}
            className="md:hidden p-1.5 rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </header>

      {/* ══════════════ TABS BAR (NTA STYLE) ══════════════ */}
      <div className="flex-shrink-0 flex items-center px-4 h-9 border-b border-gray-300 shadow-sm" style={{ background: '#1e293b' }}>
        <div className="relative bg-[#334155] px-4 h-9 flex items-center gap-1.5 text-white text-xs font-bold select-none">
          <span className="truncate max-w-[150px]">{test.title}</span>
          <span className="w-3.5 h-3.5 rounded-full bg-white text-[#334155] flex items-center justify-center font-black text-[9px] leading-none">i</span>
          <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#334155] z-10"></div>
        </div>
      </div>

      {/* ══════════════ SECTIONS BAR ══════════════ */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between px-4 py-1.5 border-b border-gray-300 bg-[#f8f9fa] shadow-sm font-sans z-30 gap-y-1">
        <div className="flex items-center gap-2 overflow-x-auto min-w-0 max-w-[calc(100%-130px)] sm:max-w-none">
          <span className="text-gray-500 font-bold text-xs uppercase mr-1">Sections</span>
          <div className="flex items-center gap-1.5">
            {sections.map(sec => {
              const isActive = currentSection === sec;
              return (
                <button
                  key={sec}
                  onClick={() => {
                    const secQs = questions.filter(q => q.subject === sec);
                    const hasMCQ = secQs.some(q => q.type !== 'integer');
                    jumpToQuestion(sec, hasMCQ ? 'single-correct' : 'numerical', 0);
                  }}
                  className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all border ${
                    isActive
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {sec}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side: Time spent on this question */}
        {currentQ && (
          <div className="flex items-center gap-1 text-gray-800 text-[13px] font-bold flex-shrink-0 pl-4 font-mono">
            <span>Time Spent:</span>
            <span className="text-[#3b82f6] font-black">{formatTime(currentTimeSpent)}</span>
          </div>
        )}
      </div>

      {/* ══════════════ SUB-SECTIONS BAR ══════════════ */}
      <div className="flex-shrink-0 flex items-center px-4 py-1.5 border-b border-gray-300 bg-[#eef2f7] font-sans z-20">
        <div className="flex items-center gap-1 overflow-visible min-w-0">
          {questions.some(q => q.subject === currentSection && q.type !== 'integer') && (
            <button
              onClick={() => jumpToQuestion(currentSection, 'single-correct', 0)}
              className={`px-3 py-1 text-xs font-bold flex items-center gap-1.5 transition-all border rounded ${
                currentSubsection === 'single-correct'
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {currentSection} Single Correct
            </button>
          )}
          
          {questions.some(q => q.subject === currentSection && q.type === 'integer') && (
            <button
              onClick={() => jumpToQuestion(currentSection, 'numerical', 0)}
              className={`px-3 py-1 text-xs font-bold flex items-center gap-1.5 transition-all border rounded ${
                currentSubsection === 'numerical'
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {currentSection} Numerical
            </button>
          )}
        </div>
      </div>

      {/* ══════════════ MAIN CONTENT ══════════════ */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* ── Question & Explanation View ── */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col min-w-0 bg-white" ref={questionRef}>
          <div className="flex-1 p-4 sm:p-6 overflow-x-auto">
            {currentQ ? (
              <div className="max-w-3xl" style={{ overflowX: 'auto' }}>
                {/* Result header */}
                <div className="mb-4 flex items-center justify-between border border-gray-300 rounded p-3 bg-gray-50 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-gray-700">Question Status:</span>
                    {currentResult === 'correct' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Check size={12} /> Correct
                      </span>
                    ) : currentResult === 'incorrect' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <XIcon size={12} /> Incorrect
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Unattempted
                      </span>
                    )}
                  </div>
                  
                  <span className="text-[11.5px] text-gray-500 font-bold">
                    Marks: <span className={currentResult === 'correct' ? 'text-emerald-600 font-black' : currentResult === 'incorrect' ? 'text-rose-600 font-black' : 'text-gray-600'}>
                      {currentResult === 'correct' ? '+4' : currentResult === 'incorrect' ? '-1' : '0'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between mb-3 font-sans">
                  <span className="text-[13px] font-bold text-gray-700">Question No. {qNumber}</span>
                </div>

                {/* Question text */}
                <QuestionText
                  text={currentQ.question_text}
                  className="text-gray-900 text-[14.5px] leading-relaxed mb-4 select-text font-sans font-medium"
                />

                {/* Question image */}
                {currentQ.question_image_url && (
                  <div className="mb-5">
                    <img
                      src={currentQ.question_image_url}
                      alt="Question diagram"
                      className="max-w-full max-h-56 rounded-xl border border-gray-200 object-contain bg-white"
                    />
                  </div>
                )}

                {/* Options (MCQ) */}
                {(currentQ.type === 'mcq') && currentQ.options?.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-3 font-sans space-y-2">
                    {currentQ.options.map((opt) => {
                      const isUserSelected = currentAnswer === opt.id;
                      const isCorrectOpt = currentQ.correct_answer === opt.id;
                      
                      let optionStyle = "border-gray-200 bg-white hover:bg-gray-50/80";
                      let badgeIcon = null;

                      if (isCorrectOpt) {
                        optionStyle = "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500";
                        badgeIcon = <span className="px-2 py-0.5 rounded text-[8px] bg-emerald-500 text-white font-extrabold uppercase">Correct Answer</span>;
                      } else if (isUserSelected && !isCorrectOpt) {
                        optionStyle = "border-rose-400 bg-rose-50/60 ring-1 ring-rose-400";
                        badgeIcon = <span className="px-2 py-0.5 rounded text-[8px] bg-rose-500 text-white font-extrabold uppercase">Your Wrong Choice</span>;
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-start gap-3 py-3 px-3 rounded-lg border transition-all select-none ${optionStyle}`}
                        >
                          <span className="mt-1 flex-shrink-0 flex items-center justify-center">
                            {isCorrectOpt ? (
                              <div className="w-[18px] h-[18px] rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check size={12} className="stroke-[3]" /></div>
                            ) : isUserSelected ? (
                              <div className="w-[18px] h-[18px] rounded-full bg-rose-500 text-white flex items-center justify-center"><XIcon size={12} className="stroke-[3]" /></div>
                            ) : (
                              <span className="inline-block w-[18px] h-[18px] rounded-full border border-gray-300 bg-white" />
                            )}
                          </span>
                          
                          <div className="flex-1 text-[13.5px] text-gray-800 leading-relaxed">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-mono text-slate-400 text-xs font-bold">Option {opt.id}</span>
                              {badgeIcon}
                            </div>
                            {opt.text && <QuestionText text={opt.text} className="inline" />}
                            {opt.image && (
                              <img src={opt.image} alt={`Option ${opt.id}`} className="mt-2 max-h-32 border border-gray-200 object-contain bg-white" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Integer type display */}
                {currentQ.type === 'integer' && (
                  <div className="mt-4 border-t border-gray-150 pt-4 font-sans space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                        <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Your Answer</label>
                        <div className="text-lg font-black text-slate-800 font-mono">
                          {currentAnswer !== null && currentAnswer !== undefined ? currentAnswer : <span className="text-slate-400 italic">Not Answered</span>}
                        </div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                        <label className="block text-[10px] text-emerald-800/70 uppercase tracking-widest font-bold mb-1">Correct Solution Value</label>
                        <div className="text-lg font-black text-emerald-800 font-mono">
                          {currentQ.correct_answer}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Collapsible KaTeX Explanation ── */}
                <div className="mt-8 border border-indigo-150 bg-indigo-50/20 rounded-xl p-4 sm:p-5 font-sans">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-3 flex items-center gap-1.5 border-b border-indigo-100/50 pb-2">
                    💡 Concept Explanation &amp; Solution
                  </h4>
                  
                  {currentQ.explanation ? (
                    <QuestionText
                      text={currentQ.explanation}
                      className="text-slate-700 text-[13.5px] leading-relaxed select-text"
                    />
                  ) : (
                    <p className="text-xs text-slate-500 italic">No explanation was compiled for this question.</p>
                  )}

                  {currentQ.explanation_image_url && (
                    <div className="mt-4 border border-indigo-100/30 rounded-lg overflow-hidden bg-white p-2 flex justify-start">
                      <img
                        src={currentQ.explanation_image_url}
                        alt="Explanation diagram"
                        className="max-w-full max-h-72 object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400">
                <p className="text-sm">No question loaded.</p>
              </div>
            )}
          </div>

          {/* ── Bottom action bar (Prev/Next) ── */}
          <div className="flex-shrink-0 bg-[#f0f0f0] border-t border-gray-300 px-4 sm:px-6 py-2.5 flex items-center justify-between">
            <button
              onClick={handlePrev}
              className="px-5 py-2 rounded border border-gray-400 bg-white text-gray-800 text-[13px] font-semibold hover:bg-gray-100 transition-colors flex items-center gap-1"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 rounded text-[13px] font-bold text-white transition-colors hover:brightness-110 flex items-center gap-1"
              style={{ background: '#3b82f6' }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </main>

        {/* ── Right Sidebar: NTA Palette read-only solutions view ── */}
        <aside
          className={`
            fixed md:relative inset-0 z-40 md:z-auto flex-shrink-0 w-full md:w-72
            transition-transform duration-300 ease-in-out
            ${showPalette ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
            flex flex-col bg-white border-l border-gray-200 overflow-hidden shadow-2xl md:shadow-none
          `}
        >
          {/* Mobile close */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <span className="text-sm font-bold text-gray-700">Question Palette</span>
            <button onClick={() => setShowPalette(false)} className="p-1.5 rounded-lg hover:bg-gray-200">
              <X size={16} />
            </button>
          </div>

          {/* Candidate card */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-[#e8e8e8]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-sm bg-gray-300 overflow-hidden border-2 border-gray-400 flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-600 bg-gray-200">
                    {profile?.name?.[0]?.toUpperCase() || 'A'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-gray-900 text-[12px] font-bold truncate">{profile?.name || 'Candidate'}</div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">Solution Key</div>
              </div>
            </div>
          </div>

          {/* Section stats legend */}
          {sidebarStats && (
            <div className="flex-shrink-0 px-3 py-3.5 border-b border-gray-200 bg-[#E5F2FF]/20 space-y-2.5">
              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Grading Legend</div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                {[
                  { label: 'Correct',     count: sidebarStats.correct,     result: 'correct' as ResultType },
                  { label: 'Incorrect',   count: sidebarStats.incorrect,   result: 'incorrect' as ResultType },
                  { label: 'Unattempted', count: sidebarStats.unattempted, result: 'unattempted' as ResultType },
                ].map(({ label, count, result }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="scale-[0.75] flex-shrink-0">
                      <PaletteBadge result={result} num={count} />
                    </div>
                    <span className="text-[10px] text-gray-700 font-semibold truncate leading-none">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section header */}
          <div className="flex-shrink-0 bg-slate-700 text-white px-3 py-1.5 text-xs font-bold font-sans">
            {currentSection} {currentSubsection === 'numerical' ? 'Numerical' : 'Single Correct'}
          </div>

          {/* Question palette grid */}
          <div className="flex-1 overflow-y-auto p-3 bg-[#E5F2FF]/10 font-sans">
            <div className="text-[11px] font-bold text-gray-600 mb-2.5">Jump to Question Solutions</div>
            <div className="grid grid-cols-4 gap-2.5">
              {currentSubQs.map((q, idx) => {
                const res = getQuestionResult(q.id, q.correct_answer);
                const qNum = idx + 1;
                return (
                  <button
                    key={q.id}
                    onClick={() => jumpToQuestion(currentSection, currentSubsection, idx)}
                    className="transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                  >
                    <PaletteBadge result={res} num={qNum} isActive={currentQ?.id === q.id} />
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Backdrop for mobile palette */}
      {showPalette && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setShowPalette(false)}
        />
      )}
    </div>
  );
}
