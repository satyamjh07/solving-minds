'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import {
  Loader2, AlertTriangle, ChevronLeft, ChevronRight,
  CheckCircle, LayoutGrid, X, Send, RotateCcw,
} from 'lucide-react';

// ─── Math/KaTeX Rendering Helpers ──────────────────────────────────────────

const formatText = (text: string) => {
  if (!text) return '';
  let clean = text;

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

interface PaletteBadgeProps {
  status: QStatus;
  num: string | number;
  isActive?: boolean;
}

const PaletteBadge = ({ status, num, isActive = false }: PaletteBadgeProps) => {
  const activeClass = isActive ? 'ring-2 ring-blue-500 ring-offset-1 scale-105' : '';
  
  if (status === 'not-visited') {
    return (
      <div className={`w-9 h-8 bg-[#f0f0f0] border border-gray-300 text-gray-800 flex items-center justify-center font-bold text-[13px] rounded-sm select-none ${activeClass}`}>
        {num}
      </div>
    );
  }
  if (status === 'not-answered') {
    return (
      <div 
        className={`w-9 h-8 bg-[#e05252] text-white flex items-center justify-center font-bold text-[13px] select-none ${activeClass}`}
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)' }}
      >
        <span className="pb-1">{num}</span>
      </div>
    );
  }
  if (status === 'answered') {
    return (
      <div 
        className={`w-9 h-8 bg-[#2ca82c] text-white flex items-center justify-center font-bold text-[13px] select-none ${activeClass}`}
        style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%)' }}
      >
        {num}
      </div>
    );
  }
  if (status === 'marked') {
    return (
      <div className={`w-8 h-8 bg-[#5e35b1] text-white flex items-center justify-center font-bold text-[13px] rounded-full select-none ${activeClass}`}>
        {num}
      </div>
    );
  }
  if (status === 'answered-marked') {
    return (
      <div className={`relative w-9 h-8 flex items-center justify-center select-none ${activeClass}`}>
        <div className="w-8 h-8 bg-[#5e35b1] text-white flex items-center justify-center font-bold text-[13px] rounded-full">
          {num}
        </div>
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#2ca82c] border border-white rounded-full flex items-center justify-center text-[7px] text-white font-extrabold shadow-sm">
          ✓
        </div>
      </div>
    );
  }
  return null;
};

interface HoverStatsTooltipProps {
  subject: string;
  subsection?: 'single-correct' | 'numerical';
  questions: Question[];
  statuses: Record<string, QStatus>;
}

const HoverStatsTooltip = ({ subject, subsection, questions, statuses }: HoverStatsTooltipProps) => {
  const subQs = questions.filter(q => 
    q.subject === subject && 
    (subsection ? (subsection === 'numerical' ? q.type === 'integer' : q.type !== 'integer') : true)
  );
  
  const answered = subQs.filter(q => statuses[q.id] === 'answered' || statuses[q.id] === 'answered-marked').length;
  const notAnswered = subQs.filter(q => statuses[q.id] === 'not-answered').length;
  const marked = subQs.filter(q => statuses[q.id] === 'marked').length;
  const notVisited = subQs.filter(q => statuses[q.id] === 'not-visited').length;
  const answeredMarked = subQs.filter(q => statuses[q.id] === 'answered-marked').length;

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#eef6ff] border border-gray-300 rounded shadow-2xl p-4 w-72 z-50 text-left font-sans animate-in fade-in duration-200">
      <div className="text-[11px] font-bold text-gray-800 mb-2.5 border-b border-gray-300 pb-1.5 uppercase tracking-wider">
        {subject} {subsection === 'numerical' ? 'Numerical' : subsection === 'single-correct' ? 'Single Correct' : ''} Summary
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="scale-[0.85] flex-shrink-0"><PaletteBadge status="answered" num={answered} /></div>
          <span className="text-[11px] text-gray-700 font-bold">Answered</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="scale-[0.85] flex-shrink-0"><PaletteBadge status="not-answered" num={notAnswered} /></div>
          <span className="text-[11px] text-gray-700 font-bold">Not Answered</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="scale-[0.85] flex-shrink-0"><PaletteBadge status="not-visited" num={notVisited} /></div>
          <span className="text-[11px] text-gray-700 font-bold">Not Visited</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="scale-[0.85] flex-shrink-0"><PaletteBadge status="marked" num={marked} /></div>
          <span className="text-[11px] text-gray-700 font-bold">Marked for Review</span>
        </div>
        <div className="flex items-center gap-3 pt-1 border-t border-gray-200">
          <div className="scale-[0.85] flex-shrink-0"><PaletteBadge status="answered-marked" num={answeredMarked} /></div>
          <span className="text-[10px] text-gray-700 font-bold leading-tight">Answered &amp; Marked for Review (will be evaluated)</span>
        </div>
      </div>
    </div>
  );
};

// ─── Types ───────────────────────────────────────────────────────────────────

type QStatus = 'not-visited' | 'not-answered' | 'answered' | 'marked' | 'answered-marked';

interface Option { id: string; text: string; image?: string | null; }

interface Question {
  id: string;
  subject: string;
  chapter: string;
  topic: string;
  type: string; // 'mcq' | 'integer' | 'multi-correct'
  question_text: string;
  question_image_url: string | null;
  options: Option[];
  correct_answer: string;
  explanation: string | null;
  explanation_image_url: string | null;
  marks: number;
  year?: number;
  shift?: string;
  exam_type?: string;
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

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<QStatus, string> = {
  'not-visited':    'bg-gray-200 text-gray-600 border border-gray-300',
  'not-answered':   'bg-red-500 text-white border border-red-600',
  'answered':       'bg-green-500 text-white border border-green-600',
  'marked':         'bg-purple-600 text-white border border-purple-700',
  'answered-marked':'bg-purple-600 text-white border border-purple-700 ring-2 ring-green-400 ring-offset-1',
};

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
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map(n => n.toString().padStart(2, '0')).join(':');
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AttemptPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;
  const { profile } = useProfile();

  // ── Data state ──
  const [test, setTest] = useState<MockTest | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Test state ──
  const [currentSection, setCurrentSection] = useState('');
  const [currentSubsection, setCurrentSubsection] = useState<'single-correct' | 'numerical'>('single-correct');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [statuses, setStatuses] = useState<Record<string, QStatus>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [integerInput, setIntegerInput] = useState('');

  // ── Timer ──
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Question Durations tracking ──
  const [questionDurations, setQuestionDurations] = useState<Record<string, number>>({});
  const entryTimeRef = useRef<number>(Date.now());
  const timeLeftRef = useRef(0);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // ── UI state ──
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [instructionsExpanded, setInstructionsExpanded] = useState(true);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  // KaTeX ref
  const questionRef = useRef<HTMLDivElement>(null);

  // ─── Derived ─────────────────────────────────────────────────────────────
  const currentSubQs = questions.filter(q => 
    q.subject === currentSection && 
    (currentSubsection === 'numerical' ? q.type === 'integer' : q.type !== 'integer')
  );
  const currentQ = currentSubQs[currentIndex] || null;

  // ── KaTeX renderer ──
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
      const { data: testData, error: testErr } = await supabase.from('mock_tests').select('*').eq('id', testId).single();
      if (testErr || !testData) { setError('Test not found.'); setLoading(false); return; }
      setTest(testData);

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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('You must be logged in to attempt this test.'); setLoading(false); return; }
      const userId = user.id;

      // Fetch active attempt
      const { data: attemptData } = await supabase
        .from('mock_test_live_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('test_id', testId)
        .eq('completed', false)
        .maybeSingle();

      if (attemptData) {
        // Resume attempt
        setAnswers(attemptData.answers || {});
        setStatuses(attemptData.statuses || {});
        setTimeLeft(attemptData.time_left);
        setQuestionDurations(attemptData.question_durations || {});
        entryTimeRef.current = Date.now();
        
        const lastQId = attemptData.current_question_id;
        const lastQ = qs.find(q => q.id === lastQId);
        if (lastQ) {
          const subType = lastQ.type === 'integer' ? 'numerical' : 'single-correct';
          setCurrentSection(lastQ.subject);
          setCurrentSubsection(subType);
          
          const subQs = qs.filter(q => q.subject === lastQ.subject && (subType === 'numerical' ? q.type === 'integer' : q.type !== 'integer'));
          const idx = subQs.findIndex(q => q.id === lastQId);
          setCurrentIndex(idx >= 0 ? idx : 0);

          const savedAns = attemptData.answers[lastQId] || null;
          if (lastQ.type === 'integer') { setIntegerInput(savedAns || ''); setSelectedOption(null); }
          else { setSelectedOption(savedAns); setIntegerInput(''); }
        } else {
          if (sorted.length > 0) {
            setCurrentSection(sorted[0]);
            const firstQSubQs = qs.filter(q => q.subject === sorted[0]);
            const hasMCQ = firstQSubQs.some(q => q.type !== 'integer');
            const subType = hasMCQ ? 'single-correct' : 'numerical';
            setCurrentSubsection(subType);
            setCurrentIndex(0);
            
            const subQs = firstQSubQs.filter(q => subType === 'numerical' ? q.type === 'integer' : q.type !== 'integer');
            const firstQ = subQs[0];
            if (firstQ) {
              const savedAns = attemptData.answers[firstQ.id] || null;
              if (firstQ.type === 'integer') { setIntegerInput(savedAns || ''); setSelectedOption(null); }
              else { setSelectedOption(savedAns); setIntegerInput(''); }
            }
          }
        }
      } else {
        // Fresh attempt
        setTimeLeft(testData.duration * 60);
        if (sorted.length > 0) {
          setCurrentSection(sorted[0]);
          const hasMCQ = qs.some(q => q.subject === sorted[0] && q.type !== 'integer');
          setCurrentSubsection(hasMCQ ? 'single-correct' : 'numerical');
        }
        const initStatuses: Record<string, QStatus> = {};
        qs.forEach(q => { initStatuses[q.id] = 'not-visited'; });
        setStatuses(initStatuses);

        // Create attempt record
        await supabase.from('mock_test_live_attempts').insert({
          user_id: userId,
          test_id: testId,
          answers: {},
          statuses: {},
          time_left: testData.duration * 60,
          completed: false,
          question_durations: {}
        });
        entryTimeRef.current = Date.now();
      }

      setLoading(false);
    };
    load();
  }, [testId]);

  // ── Timer ──
  useEffect(() => {
    if (loading || submitted || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); handleAutoSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, submitted]);

  // Periodic time autosave (every 30 seconds)
  useEffect(() => {
    if (loading || submitted) return;
    const interval = setInterval(async () => {
      if (timeLeftRef.current <= 0) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let activeDurations = { ...questionDurations };
        if (currentQ) {
          const elapsed = Math.round((Date.now() - entryTimeRef.current) / 1000);
          activeDurations[currentQ.id] = (activeDurations[currentQ.id] || 0) + elapsed;
          setQuestionDurations(activeDurations);
          entryTimeRef.current = Date.now();
        }
        await supabase.from('mock_test_live_attempts')
          .update({
            time_left: timeLeftRef.current,
            question_durations: activeDurations,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('test_id', testId)
          .eq('completed', false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [loading, submitted, testId, questionDurations, currentQ]);

  // ── Tab visibility detection ──
  useEffect(() => {
    if (submitted) return;
    const handler = () => {
      if (document.hidden) {
        setTabWarnings(n => {
          const next = n + 1;
          setShowTabWarning(true);
          if (next >= 5) handleAutoSubmit();
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [submitted]);

  // ── Re-render KaTeX when question changes ──
  useEffect(() => {
    if (!loading) setTimeout(renderKatex, 80);
  }, [currentSection, currentIndex, loading]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const saveProgress = async (
    updatedAnswers: Record<string, string | null>,
    updatedStatuses: Record<string, QStatus>,
    currentQId: string,
    updatedDurations: Record<string, number>
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('mock_test_live_attempts')
        .update({
          answers: updatedAnswers,
          statuses: updatedStatuses,
          time_left: timeLeftRef.current,
          current_question_id: currentQId,
          question_durations: updatedDurations,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('test_id', testId)
        .eq('completed', false);
    }
  };

  const handleAutoSubmit = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const elapsed = Math.round((Date.now() - entryTimeRef.current) / 1000);
      const finalDurations = { ...questionDurations };
      if (currentQ) {
        finalDurations[currentQ.id] = (finalDurations[currentQ.id] || 0) + elapsed;
      }
      await supabase.from('mock_test_live_attempts')
        .update({
          time_left: 0,
          completed: true,
          question_durations: finalDurations,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('test_id', testId)
        .eq('completed', false);
    }

    setSubmitted(true);
    setShowSubmitModal(false);
    setShowTabWarning(false);
  }, [testId, currentQ, questionDurations]);

  const jumpToQuestion = async (subject: string, subsection: 'single-correct' | 'numerical', index: number) => {
    let nextStatuses = { ...statuses };
    if (currentQ && statuses[currentQ.id] === 'not-visited') {
      nextStatuses[currentQ.id] = 'not-answered';
      setStatuses(nextStatuses);
    }

    const subQs = questions.filter(q => 
      q.subject === subject && 
      (subsection === 'numerical' ? q.type === 'integer' : q.type !== 'integer')
    );
    const targetQ = subQs[index];
    
    const elapsed = Math.round((Date.now() - entryTimeRef.current) / 1000);
    const nextDurations = { ...questionDurations };
    if (currentQ) {
      nextDurations[currentQ.id] = (nextDurations[currentQ.id] || 0) + elapsed;
      setQuestionDurations(nextDurations);
    }
    entryTimeRef.current = Date.now();

    if (targetQ) {
      await saveProgress(answers, nextStatuses, targetQ.id, nextDurations);
    }

    setCurrentSection(subject);
    setCurrentSubsection(subsection);
    setCurrentIndex(index);
    if (targetQ) {
      const savedAns = answers[targetQ.id] || null;
      if (targetQ.type === 'integer') { setIntegerInput(savedAns || ''); setSelectedOption(null); }
      else { setSelectedOption(savedAns); setIntegerInput(''); }
    }
    setShowPalette(false);
  };

  const saveAndAdvance = async (markForReview = false) => {
    if (!currentQ) return;
    const answer = currentQ.type === 'integer' ? (integerInput.trim() || null) : selectedOption;
    const nextAnswers = { ...answers, [currentQ.id]: answer };
    setAnswers(nextAnswers);

    let newStatus: QStatus;
    if (answer) { newStatus = markForReview ? 'answered-marked' : 'answered'; }
    else         { newStatus = markForReview ? 'marked' : 'not-answered'; }
    const nextStatuses = { ...statuses, [currentQ.id]: newStatus };
    setStatuses(nextStatuses);

    // Calculate duration for currentQ
    const elapsed = Math.round((Date.now() - entryTimeRef.current) / 1000);
    const nextDurations = {
      ...questionDurations,
      [currentQ.id]: (questionDurations[currentQ.id] || 0) + elapsed
    };
    setQuestionDurations(nextDurations);
    entryTimeRef.current = Date.now();

    let nextSec = currentSection;
    let nextSub = currentSubsection;
    let nextIdx = currentIndex + 1;

    if (nextIdx >= currentSubQs.length) {
      if (currentSubsection === 'single-correct') {
        const hasNumerical = questions.some(q => q.subject === currentSection && q.type === 'integer');
        if (hasNumerical) {
          nextSub = 'numerical';
          nextIdx = 0;
        } else {
          const si = sections.indexOf(currentSection);
          if (si < sections.length - 1) {
            nextSec = sections[si + 1];
            nextSub = 'single-correct';
            nextIdx = 0;
          } else {
            await saveProgress(nextAnswers, nextStatuses, currentQ.id, nextDurations);
            return;
          }
        }
      } else {
        const si = sections.indexOf(currentSection);
        if (si < sections.length - 1) {
          nextSec = sections[si + 1];
          nextSub = 'single-correct';
          nextIdx = 0;
        } else {
          await saveProgress(nextAnswers, nextStatuses, currentQ.id, nextDurations);
          return;
        }
      }
    }

    const nextSubQs = questions.filter(q => 
      q.subject === nextSec && 
      (nextSub === 'numerical' ? q.type === 'integer' : q.type !== 'integer')
    );
    const targetQ = nextSubQs[nextIdx];
    if (targetQ) {
      await saveProgress(nextAnswers, nextStatuses, targetQ.id, nextDurations);

      setCurrentSection(nextSec);
      setCurrentSubsection(nextSub);
      setCurrentIndex(nextIdx);
      const savedAns = nextAnswers[targetQ.id] || null;
      if (targetQ.type === 'integer') { setIntegerInput(savedAns || ''); setSelectedOption(null); }
      else { setSelectedOption(savedAns); setIntegerInput(''); }
    }
  };

  const handleClear = () => { setSelectedOption(null); setIntegerInput(''); };

  const handleSelectOption = (optId: string) => {
    if (currentQ?.type === 'multi-correct') {
      const parts = (selectedOption || '').split(',').filter(Boolean);
      const next = parts.includes(optId) ? parts.filter(x => x !== optId) : [...parts, optId];
      setSelectedOption(next.join(',') || null);
    } else {
      setSelectedOption(optId);
    }
  };

  // ─── Score calculation ────────────────────────────────────────────────────

  const calcScore = () => {
    let correct = 0, incorrect = 0, unattempted = 0;
    questions.forEach(q => {
      const ans = answers[q.id];
      if (!ans) { unattempted++; return; }
      if (ans === q.correct_answer) correct++;
      else incorrect++;
    });
    return { correct, incorrect, unattempted, score: correct * 4 - incorrect };
  };

  // ─── Section stats (palette header) ──────────────────────────────────────

  const getSectionStats = (sec: string, sub: 'single-correct' | 'numerical') => {
    const qs = questions.filter(q => 
      q.subject === sec && 
      (sub === 'numerical' ? q.type === 'integer' : q.type !== 'integer')
    );
    return {
      total:          qs.length,
      answered:       qs.filter(q => statuses[q.id] === 'answered' || statuses[q.id] === 'answered-marked').length,
      notAnswered:    qs.filter(q => statuses[q.id] === 'not-answered').length,
      marked:         qs.filter(q => statuses[q.id] === 'marked').length,
      notVisited:     qs.filter(q => statuses[q.id] === 'not-visited').length,
      answeredMarked: qs.filter(q => statuses[q.id] === 'answered-marked').length,
    };
  };

  // ─── Timer color ─────────────────────────────────────────────────────────

  const timerColor = timeLeft < 300 ? '#ef4444' : timeLeft < 900 ? '#f59e0b' : '#22c55e';

  // ─── Loading / Error ─────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading examination...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div className="text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="text-gray-700 font-semibold">{error}</p>
        <button onClick={() => router.push('/tests')} className="mt-4 text-sm text-blue-600 hover:underline">← Back to Test Center</button>
      </div>
    </div>
  );

  // ─── Submitted result screen ──────────────────────────────────────────────

  if (submitted) {
    const { correct, incorrect, unattempted, score } = calcScore();
    const total = test ? test.total_marks : questions.length * 4;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 font-sans"
        style={{ background: '#f1f5f9', fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg">
          <div className="px-6 py-5 text-white text-center" style={{ background: '#0f2d52' }}>
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
            <h2 className="text-xl font-bold">Examination Submitted</h2>
            <p className="text-blue-300 text-sm mt-1">{test?.title}</p>
          </div>

          <div className="p-6 space-y-4">
            {/* Score ring */}
            <div className="flex flex-col items-center py-4">
              <div
                className="w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 mb-2"
                style={{ borderColor: score >= 0 ? '#22c55e' : '#ef4444' }}
              >
                <span className="text-3xl font-black" style={{ color: score >= 0 ? '#16a34a' : '#dc2626' }}>{score}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">/ {total}</span>
              </div>
              <span className="text-sm font-semibold text-gray-600">{percentage}% Score</span>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Correct',     value: correct,     color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
                { label: 'Incorrect',   value: incorrect,   color: 'text-red-600',   bg: 'bg-red-50 border-red-200' },
                { label: 'Unattempted', value: unattempted, color: 'text-gray-500',  bg: 'bg-gray-50 border-gray-200' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`rounded-2xl border p-3 text-center ${bg}`}>
                  <div className={`text-2xl font-black ${color}`}>{value}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Attempts */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex justify-between text-sm">
              <span className="text-gray-500">Total Questions</span>
              <span className="font-bold text-gray-800">{questions.length}</span>
            </div>

            {tabWarnings > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-800 flex gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
                <span>Tab switch violations detected: {tabWarnings}. These have been recorded.</span>
              </div>
            )}

            <button
              onClick={() => router.push('/tests')}
              className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all mt-2 hover:brightness-105"
              style={{ background: '#1565c0' }}
            >
              Back to Test Center
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── No questions state ───────────────────────────────────────────────────

  if (questions.length === 0) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <div className="text-center max-w-sm">
        <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <h3 className="font-bold text-gray-700 mb-1">No Questions Found</h3>
        <p className="text-sm text-gray-500 mb-4">This test doesn&apos;t have any questions yet. Questions are added by the admin team.</p>
        <button onClick={() => router.push('/tests')} className="text-blue-600 text-sm hover:underline">← Back to Test Center</button>
      </div>
    </div>
  );

  // ─── Main CBT UI ─────────────────────────────────────────────────────────

  const qNumber = currentIndex + 1;
  const sStats = currentSection ? getSectionStats(currentSection, currentSubsection) : null;

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden select-none font-sans"
      style={{ background: '#ffffff', fontFamily: "Arial, Helvetica, sans-serif" }}
    >

      {/* ══════════════ TOP BAR (NTA STYLE) ══════════════ */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 h-12 z-30 border-b border-gray-800"
        style={{ background: '#2c2c2c' }}
      >
        {/* Left: Test name */}
        <div className="text-[#ffeb3b] font-black text-sm uppercase tracking-wide truncate max-w-[200px] sm:max-w-xl">
          {test?.title || 'CBT EXAMINATION'}
        </div>

        {/* Right: Instructions & Question Paper buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 font-sans">
          <button 
            onClick={() => setShowInstructionsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0288d1] text-white text-xs font-bold hover:bg-[#0277bd] transition-colors"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-white text-[#0288d1] flex items-center justify-center font-black text-[9px] leading-none">i</span>
            Instructions
          </button>
          
          <button 
            onClick={() => {
              alert('Question Paper full view placeholder.');
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#2e7d32] text-white text-xs font-bold hover:bg-[#1b5e20] transition-colors"
          >
            <span className="w-3.5 h-3.5 rounded-sm bg-white text-[#2e7d32] flex items-center justify-center font-bold text-[9px] leading-none">📄</span>
            Question Paper
          </button>

          {/* Palette Toggle on Mobile */}
          <button
            onClick={() => setShowPalette(p => !p)}
            className="md:hidden p-1.5 rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors ml-1"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </header>

      {/* ══════════════ TABS BAR (NTA STYLE) ══════════════ */}
      <div className="flex-shrink-0 flex items-center px-4 h-9 border-b border-gray-300 shadow-sm" style={{ background: '#0d47a1' }}>
        <div className="relative bg-[#1565c0] px-4 h-9 flex items-center gap-1.5 text-white text-xs font-bold cursor-pointer select-none">
          <span className="truncate max-w-[150px]">{test?.title || 'Mock Test'}</span>
          <span className="w-3.5 h-3.5 rounded-full bg-white text-[#1565c0] flex items-center justify-center font-black text-[9px] leading-none">i</span>
          <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#1565c0] z-10"></div>
        </div>
      </div>

      {/* ══════════════ SECTIONS BAR (NTA STYLE) ══════════════ */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-1.5 border-b border-gray-300 bg-[#f8f9fa] shadow-sm font-sans z-30">
        <div className="flex items-center gap-2 overflow-visible min-w-0">
          <span className="text-gray-500 font-bold text-xs uppercase mr-1">Sections</span>
          
          <button className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30" disabled>
            ◀
          </button>
          
          <div className="flex items-center gap-1.5">
            {sections.map(sec => {
              const isActive = currentSection === sec;
              return (
                <button
                  key={sec}
                  onClick={() => {
                    const hasMCQ = questions.some(q => q.subject === sec && q.type !== 'integer');
                    jumpToQuestion(sec, hasMCQ ? 'single-correct' : 'numerical', 0);
                  }}
                  className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all border ${
                    isActive
                      ? 'bg-[#1565c0] text-white border-[#1565c0]'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {sec}
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-black text-[9px] leading-none ${
                    isActive ? 'bg-white text-[#1565c0]' : 'bg-gray-200 text-gray-600'
                  }`}>i</span>
                </button>
              );
            })}
          </div>

          <button className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30" disabled>
            ▶
          </button>
        </div>

        {/* Right side: Timer */}
        <div className="flex items-center gap-1 text-gray-800 text-[13px] font-bold flex-shrink-0 pl-4">
          <span>Time Left :</span>
          <span className="tabular-nums font-black text-black tracking-wider text-[13.5px] select-all" style={{ color: timerColor }}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* ══════════════ SUB-SECTIONS BAR (NTA STYLE) ══════════════ */}
      <div className="flex-shrink-0 flex items-center px-4 py-1.5 border-b border-gray-300 bg-[#eef2f7] font-sans z-20">
        <div className="flex items-center gap-1 overflow-visible min-w-0">
          {questions.some(q => q.subject === currentSection && q.type !== 'integer') && (
            <button
              onClick={() => jumpToQuestion(currentSection, 'single-correct', 0)}
              className={`px-3 py-1 text-xs font-bold flex items-center gap-1.5 transition-all border rounded relative overflow-visible ${
                currentSubsection === 'single-correct'
                  ? 'bg-[#1565c0] text-white border-[#1565c0]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {currentSection} Single Correct
              <div className="relative group inline-block">
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-black text-[9px] leading-none ${
                  currentSubsection === 'single-correct' ? 'bg-white text-[#1565c0]' : 'bg-gray-200 text-gray-600'
                }`}>i</span>
                <HoverStatsTooltip subject={currentSection} subsection="single-correct" questions={questions} statuses={statuses} />
              </div>
            </button>
          )}
          
          {questions.some(q => q.subject === currentSection && q.type === 'integer') && (
            <button
              onClick={() => jumpToQuestion(currentSection, 'numerical', 0)}
              className={`px-3 py-1 text-xs font-bold flex items-center gap-1.5 transition-all border rounded relative overflow-visible ${
                currentSubsection === 'numerical'
                  ? 'bg-[#1565c0] text-white border-[#1565c0]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {currentSection} Numerical
              <div className="relative group inline-block">
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-black text-[9px] leading-none ${
                  currentSubsection === 'numerical' ? 'bg-white text-[#1565c0]' : 'bg-gray-200 text-gray-600'
                }`}>i</span>
                <HoverStatsTooltip subject={currentSection} subsection="numerical" questions={questions} statuses={statuses} />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* ══════════════ MAIN CONTENT ══════════════ */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Question Area ── */}
        <main className="flex-1 overflow-y-auto flex flex-col min-w-0">

          {/* Section navigation is done via tabs & palette, duplicate bar removed to match NTA exact layout */}

          {/* Question content */}
          <div className="flex-1 p-4 sm:p-6" ref={questionRef}>
            {currentQ ? (
              <div className="max-w-3xl">
                {/* Collapsible Instruction Details Panel (NTA Style) */}
                <div className="border border-gray-300 bg-white mb-4 rounded-sm font-sans select-none shadow-sm">
                  <div 
                    onClick={() => setInstructionsExpanded(!instructionsExpanded)}
                    className="flex items-center justify-between px-3 py-2 bg-[#f8f9fa] border-b border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-[11.5px] font-bold text-gray-800">
                      {currentSection} {currentSubsection === 'numerical' ? 'Numerical' : 'Single Correct'} (Maximum Marks: {currentSubsection === 'numerical' ? 20 : 80})
                    </span>
                    <span className="text-xs text-gray-500 font-bold select-none">
                      {instructionsExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                  {instructionsExpanded && (
                    <div className="p-3 text-[11px] text-gray-700 space-y-2">
                      {currentSubsection === 'numerical' ? (
                        <>
                          <p>• This section contains <strong>FIVE (5)</strong> questions.</p>
                          <p>• Answer must be typed into the input box.</p>
                          <p>• Answer to each question will be evaluated according to the following marking scheme:</p>
                          <div className="pl-4 space-y-1">
                            <p><strong>Full Marks:</strong> +4 If ONLY the correct numerical value is entered.</p>
                            <p><strong>Zero Marks:</strong> 0 If the question is unanswered.</p>
                            <p><strong>Negative Marks:</strong> -1 In all other cases.</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <p>• This section contains <strong>TWENTY (20)</strong> questions.</p>
                          <p>• Each question has 4 options A, B, C, D. <strong>ONLY ONE</strong> of these 4 options is the correct answer.</p>
                          <p>• For each question, choose the option corresponding to the correct answer.</p>
                          <p>• Answer to each question will be evaluated according to the following marking scheme:</p>
                          <div className="pl-4 space-y-1">
                            <p><strong>Full Marks:</strong> +4 If ONLY the correct option is chosen.</p>
                            <p><strong>Zero Marks:</strong> 0 If none of the options is chosen (i.e. the question is unanswered).</p>
                            <p><strong>Negative Marks:</strong> -1 In all other cases.</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Question Type & Marks Header (NTA Style) */}
                <div className="flex items-center justify-between bg-[#f8f9fa] border border-gray-300 px-3 py-1.5 mb-3 rounded-sm font-sans select-none">
                  <span className="text-[11.5px] font-bold text-gray-700">
                    Question Type: {currentSubsection === 'numerical' ? 'Numerical' : 'Single Correct'}
                  </span>
                  <span className="text-[11.5px] text-gray-605 font-medium">
                    Marks for correct answer: <span className="text-green-600 font-bold">4</span> | Negative Marks: <span className="text-red-500 font-bold">-1</span>
                  </span>
                </div>

                {/* Question number & marks */}
                <div className="flex items-center justify-between mb-3 font-sans">
                  <span className="text-[13px] font-bold text-gray-700">Question No. {qNumber}</span>
                </div>
                {/* Question text */}
                <QuestionText
                  text={currentQ.question_text}
                  className="text-gray-900 text-[14.5px] leading-relaxed mb-4 select-text font-sans"
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

                {/* Options for MCQ/Multi-correct */}
                {(currentQ.type === 'mcq' || currentQ.type === 'multi-correct') && currentQ.options?.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-3 font-sans">
                    {currentQ.options.map((opt) => {
                      const isSelected = currentQ.type === 'multi-correct'
                        ? (selectedOption || '').split(',').includes(opt.id)
                        : selectedOption === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(opt.id)}
                          className="flex items-start gap-3 py-2.5 px-2 cursor-pointer hover:bg-gray-50/80 rounded transition-colors select-none"
                        >
                          <span className="mt-0.5 flex-shrink-0">
                            {isSelected ? (
                              <span className="inline-block w-[18px] h-[18px] rounded-full border-[5px] border-[#1565c0] bg-white" />
                            ) : (
                              <span className="inline-block w-[18px] h-[18px] rounded-full border-2 border-gray-400 bg-white" />
                            )}
                          </span>
                          <div className="flex-1 text-[14px] text-gray-800 leading-relaxed">
                            {opt.text && (
                              <QuestionText text={opt.text} className="inline" />
                            )}
                            {opt.image && (
                              <img src={opt.image} alt={`Option ${opt.id}`} className="mt-2 max-h-32 border border-gray-200 object-contain" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Integer type input */}
                {currentQ.type === 'integer' && (
                  <div className="mt-4">
                    <label className="block text-[12px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Your Answer (Integer)</label>
                    <input
                      type="number"
                      value={integerInput}
                      onChange={(e) => setIntegerInput(e.target.value)}
                      placeholder="Enter integer value..."
                      className="w-48 border-2 border-gray-300 focus:border-blue-500 rounded-xl px-4 py-2.5 text-[15px] font-bold text-gray-800 outline-none transition-colors bg-white"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400">
                <p className="text-sm">No question loaded.</p>
              </div>
            )}
          </div>

          {/* ── Bottom Action Bar (NTA Style) ── */}
          <div className="flex-shrink-0 bg-[#f0f0f0] border-t border-gray-300 px-4 sm:px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveAndAdvance(true)}
                className="px-5 py-2 rounded border border-gray-400 bg-white text-gray-800 text-[13px] font-semibold hover:bg-gray-100 transition-colors"
              >
                Mark for Review & Next
              </button>
              <button
                onClick={handleClear}
                className="px-5 py-2 rounded border border-gray-400 bg-white text-gray-800 text-[13px] font-semibold hover:bg-gray-100 transition-colors"
              >
                Clear Response
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveAndAdvance(false)}
                className="px-6 py-2 rounded text-[13px] font-bold text-white transition-colors hover:brightness-110"
                style={{ background: '#0d8c6d' }}
              >
                Save & Next
              </button>
            </div>
          </div>
        </main>

        {/* ── Sidebar: Candidate + Question Palette (desktop) ── */}
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

          {/* Candidate card (NTA style) */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-[#e8e8e8]">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-sm bg-gray-300 overflow-hidden border-2 border-gray-400 flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-600 bg-gray-200">
                    {profile?.name?.[0]?.toUpperCase() || 'A'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-gray-900 text-[13px] font-bold truncate">{profile?.name || 'Candidate'}</div>
              </div>
            </div>
          </div>

          {/* No duplicate subject tabs in sidebar, matches NTA */}

          {/* Section stats legend */}
          {sStats && (
            <div className="flex-shrink-0 px-3 pt-2 pb-2 border-b border-gray-200 bg-[#E5F2FF]/30">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mb-1.5">
                {[
                  { label: 'Answered',     count: sStats.answered,    status: 'answered' as QStatus },
                  { label: 'Not Answered', count: sStats.notAnswered, status: 'not-answered' as QStatus },
                  { label: 'Not Visited',  count: sStats.notVisited,  status: 'not-visited' as QStatus },
                  { label: 'Marked',       count: sStats.marked,      status: 'marked' as QStatus },
                ].map(({ label, count, status }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="scale-[0.8] flex-shrink-0">
                      <PaletteBadge status={status} num={count} />
                    </div>
                    <span className="text-[10px] text-gray-700 font-semibold truncate leading-none">{label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-0.5 border-t border-gray-200/55">
                <div className="scale-[0.8] flex-shrink-0">
                  <PaletteBadge status="answered-marked" num={sStats.answeredMarked} />
                </div>
                <span className="text-[9.5px] text-gray-700 font-semibold leading-snug">Answered &amp; Marked for Review (will be evaluated)</span>
              </div>
            </div>
          )}

          {/* Section type header (NTA sidebar) */}
          <div className="flex-shrink-0 bg-[#1565c0] text-white px-3 py-1.5 text-xs font-bold font-sans">
            {currentSection} {currentSubsection === 'numerical' ? 'Numerical' : 'Single Correct'}
          </div>

          {/* Question palette grid */}
          <div className="flex-1 overflow-y-auto p-3 bg-[#E5F2FF]/20 font-sans">
            <div className="text-[11px] font-bold text-gray-600 mb-2.5">Choose a Question</div>
            <div className="grid grid-cols-4 gap-2.5">
              {currentSubQs.map((q, idx) => {
                const status = statuses[q.id] || 'not-visited';
                const qNum = idx + 1;
                return (
                  <button
                    key={q.id}
                    onClick={() => jumpToQuestion(currentSection, currentSubsection, idx)}
                    className="transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                  >
                    <PaletteBadge status={status} num={qNum} isActive={currentQ?.id === q.id} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit button in sidebar */}
          <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-white">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110 flex items-center justify-center gap-2"
              style={{ background: '#dc2626' }}
            >
              <Send size={14} /> Submit Examination
            </button>
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

      {/* ══════════════ TAB SWITCH WARNING MODAL ══════════════ */}
      {showTabWarning && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-amber-500 px-5 py-4 flex items-center gap-3">
              <AlertTriangle className="text-white w-6 h-6 flex-shrink-0" />
              <div>
                <div className="text-white font-black text-sm">Tab Switch Detected</div>
                <div className="text-amber-100 text-[11px]">Warning {tabWarnings} / 5</div>
              </div>
            </div>
            <div className="p-5">
              <p className="text-[13px] text-gray-700 leading-relaxed mb-4">
                You switched away from the exam window. This has been recorded.
                {tabWarnings >= 4
                  ? ' One more violation will result in automatic submission.'
                  : ` ${5 - tabWarnings} warning(s) remaining before auto-submission.`}
              </p>
              <button
                onClick={() => setShowTabWarning(false)}
                className="w-full py-2.5 rounded-xl font-bold text-white text-sm"
                style={{ background: '#1565c0' }}
              >
                Resume Examination
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ SUBMIT CONFIRMATION MODAL ══════════════ */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-black text-gray-800 text-sm">Submit Examination?</h3>
              <button onClick={() => setShowSubmitModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Answered',     count: questions.filter(q => statuses[q.id] === 'answered' || statuses[q.id] === 'answered-marked').length, color: 'text-green-700 bg-green-50 border-green-200' },
                  { label: 'Not Answered', count: questions.filter(q => statuses[q.id] === 'not-answered').length, color: 'text-red-700 bg-red-50 border-red-200' },
                  { label: 'Marked',       count: questions.filter(q => statuses[q.id] === 'marked').length,       color: 'text-purple-700 bg-purple-50 border-purple-200' },
                  { label: 'Not Visited',  count: questions.filter(q => statuses[q.id] === 'not-visited').length,  color: 'text-gray-600 bg-gray-50 border-gray-200' },
                ].map(({ label, count, color }) => (
                  <div key={label} className={`border rounded-xl p-3 text-center ${color}`}>
                    <div className="text-xl font-black">{count}</div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold">{label}</div>
                  </div>
                ))}
              </div>

              <p className="text-[12.5px] text-gray-600 leading-relaxed">
                Are you sure you want to submit? This action <strong>cannot be undone</strong> and your test will be closed.
              </p>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAutoSubmit}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110"
                  style={{ background: '#dc2626' }}
                >
                  Submit Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ INLINE INSTRUCTIONS MODAL (NTA STYLE) ══════════════ */}
      {showInstructionsModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] font-sans">
            <div className="bg-red-650 text-white px-5 py-3 text-center text-xs font-bold uppercase tracking-wider select-none" style={{ backgroundColor: '#d32f2f' }}>
              Note: The timer will continue to tick while you read the instructions.
            </div>

            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-black text-gray-800 text-sm">Exam Instructions</h3>
              <button 
                onClick={() => setShowInstructionsModal(false)} 
                className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-gray-700 leading-relaxed">
              <div className="bg-blue-50 border-l-4 border-blue-600 px-4 py-2.5 rounded-r">
                <p className="font-bold text-blue-900">
                  Total duration of this examination is <strong>{test?.duration || 180} minutes</strong>.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-1">General Instructions:</h4>
                <p>1. The countdown timer in the top-right corner of the screen will display the remaining time available for you to complete the exam.</p>
                <p>2. When the timer reaches zero, the examination will end automatically. You do not need to click submit.</p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-1">Navigating to a Question:</h4>
                <p>• Click on the question number in the Question Palette at the right of your screen to go to that question directly.</p>
                <p>• Click <strong>Save & Next</strong> to save your answer for the current question and then go to the next question.</p>
                <p>• Click <strong>Mark for Review & Next</strong> to save your answer for the current question, mark it for review, and then go to the next question.</p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-1">Answering a Question:</h4>
                <p>• For multiple-choice questions: click on the option corresponding to your answer.</p>
                <p>• To deselect your chosen answer, click on the option again or click on the <strong>Clear Response</strong> button.</p>
                <p>• For numerical-type questions: enter your numerical answer into the input box.</p>
                <p>• You MUST click <strong>Save & Next</strong> to record your answer.</p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-1">Status Legend:</h4>
                <div className="grid grid-cols-2 gap-3 bg-gray-50 border border-gray-200 rounded p-3 mt-1.5">
                  <div className="flex items-center gap-2">
                    <div className="scale-75"><PaletteBadge status="not-visited" num="1" /></div>
                    <span>Not Visited</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="scale-75"><PaletteBadge status="not-answered" num="2" /></div>
                    <span>Not Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="scale-75"><PaletteBadge status="answered" num="3" /></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="scale-75"><PaletteBadge status="marked" num="4" /></div>
                    <span>Marked for Review</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <div className="scale-75"><PaletteBadge status="answered-marked" num="5" /></div>
                    <span>Answered & Marked for Review (considered for evaluation)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="px-5 py-2 rounded font-bold text-white text-xs transition-colors hover:brightness-105"
                style={{ background: '#1565c0' }}
              >
                Close Instructions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
