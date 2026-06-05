'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import {
  Loader2, AlertTriangle, ChevronLeft, ChevronRight,
  CheckCircle, LayoutGrid, X, Send, RotateCcw,
} from 'lucide-react';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [statuses, setStatuses] = useState<Record<string, QStatus>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [integerInput, setIntegerInput] = useState('');

  // ── Timer ──
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── UI state ──
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  // KaTeX ref
  const questionRef = useRef<HTMLDivElement>(null);

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
      setTimeLeft(testData.duration * 60);

      let query = supabase.from('questions').select('*');
      if (testData.is_pyp && testData.year && testData.shift) {
        query = (query as any).eq('year', testData.year).eq('shift', testData.shift);
      } else {
        query = (query as any).eq('booklet_id', testId);
      }

      const { data: qData } = await query.order('subject').order('id');
      const qs: Question[] = (qData || []).map((q: any) => ({
        ...q,
        options: typeof q.options === 'string' ? (() => { try { return JSON.parse(q.options); } catch { return []; } })() : (q.options || []),
      }));

      setQuestions(qs);

      const uniqueSubs = [...new Set(qs.map(q => q.subject))] as string[];
      const sorted = sortSections(uniqueSubs, testData.exam_type);
      setSections(sorted);
      if (sorted.length > 0) setCurrentSection(sorted[0]);

      const initStatuses: Record<string, QStatus> = {};
      qs.forEach(q => { initStatuses[q.id] = 'not-visited'; });
      setStatuses(initStatuses);

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

  // ─── Derived ─────────────────────────────────────────────────────────────

  const sectionQs = questions.filter(q => q.subject === currentSection);
  const currentQ  = sectionQs[currentIndex] || null;

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleAutoSubmit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitted(true);
    setShowSubmitModal(false);
    setShowTabWarning(false);
  }, []);

  const jumpToQuestion = (section: string, index: number) => {
    // Mark current as 'not-answered' if still not-visited
    if (currentQ && statuses[currentQ.id] === 'not-visited') {
      setStatuses(s => ({ ...s, [currentQ.id]: 'not-answered' }));
    }
    setCurrentSection(section);
    setCurrentIndex(index);
    const targetQ = questions.filter(q => q.subject === section)[index];
    if (targetQ) {
      const savedAns = answers[targetQ.id] || null;
      if (targetQ.type === 'integer') { setIntegerInput(savedAns || ''); setSelectedOption(null); }
      else { setSelectedOption(savedAns); setIntegerInput(''); }
    }
    setShowPalette(false);
  };

  const saveAndAdvance = (markForReview = false) => {
    if (!currentQ) return;
    const answer = currentQ.type === 'integer' ? (integerInput.trim() || null) : selectedOption;
    setAnswers(a => ({ ...a, [currentQ.id]: answer }));
    let newStatus: QStatus;
    if (answer) { newStatus = markForReview ? 'answered-marked' : 'answered'; }
    else         { newStatus = markForReview ? 'marked' : 'not-answered'; }
    setStatuses(s => ({ ...s, [currentQ.id]: newStatus }));

    // Navigate forward
    if (currentIndex < sectionQs.length - 1) {
      jumpToQuestion(currentSection, currentIndex + 1);
    } else {
      const si = sections.indexOf(currentSection);
      if (si < sections.length - 1) { jumpToQuestion(sections[si + 1], 0); }
    }
  };

  const handleClear = () => { setSelectedOption(null); setIntegerInput(''); };

  const handleSelectOption = (optId: string) => {
    if (currentQ?.type === 'multi-correct') {
      const parts = (selectedOption || '').split(',').filter(Boolean);
      const next = parts.includes(optId) ? parts.filter(x => x !== optId) : [...parts, optId];
      setSelectedOption(next.join(',') || null);
    } else {
      setSelectedOption(prev => prev === optId ? null : optId);
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

  const getSectionStats = (sec: string) => {
    const qs = questions.filter(q => q.subject === sec);
    return {
      total:      qs.length,
      answered:   qs.filter(q => statuses[q.id] === 'answered' || statuses[q.id] === 'answered-marked').length,
      notAnswered:qs.filter(q => statuses[q.id] === 'not-answered').length,
      marked:     qs.filter(q => statuses[q.id] === 'marked').length,
      notVisited: qs.filter(q => statuses[q.id] === 'not-visited').length,
    };
  };

  // ─── Timer color ─────────────────────────────────────────────────────────

  const timerColor = timeLeft < 300 ? '#ef4444' : timeLeft < 900 ? '#f59e0b' : '#22c55e';

  // ─── Loading / Error ─────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading examination...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: '#f1f5f9', fontFamily: "'Space Grotesk', sans-serif" }}
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

  const qNumber = questions.findIndex(q => q.id === currentQ?.id) + 1;
  const sStats = currentSection ? getSectionStats(currentSection) : null;

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: '#e8edf2', fontFamily: "'Space Grotesk', Arial, sans-serif" }}
    >

      {/* ══════════════ TOP BAR ══════════════ */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-3 sm:px-5 h-14 shadow-lg z-30"
        style={{ background: '#0f2d52' }}
      >
        {/* Left: Logo + Test name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-black text-xs flex-shrink-0">SM</div>
          <div className="min-w-0">
            <div className="text-white text-[11px] font-bold truncate max-w-[160px] sm:max-w-xs">{test?.title}</div>
            <div className="text-blue-300 text-[9px] uppercase tracking-widest hidden sm:block">{test?.exam_type?.toUpperCase()} Simulation</div>
          </div>
        </div>

        {/* Center: Section tabs (desktop) */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center px-4 overflow-x-auto">
          {sections.map(sec => (
            <button
              key={sec}
              onClick={() => jumpToQuestion(sec, 0)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                currentSection === sec
                  ? 'bg-blue-500 text-white'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Right: Timer + palette toggle */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-center">
            <div className="text-[9px] text-blue-300 uppercase tracking-wider hidden sm:block">Time Left</div>
            <div
              className="text-lg font-black tabular-nums tracking-wider"
              style={{ color: timerColor }}
            >
              {formatTime(timeLeft)}
            </div>
          </div>
          <button
            onClick={() => setShowPalette(p => !p)}
            className="md:hidden w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:brightness-110"
            style={{ background: '#dc2626' }}
          >
            <Send size={12} /> Submit
          </button>
        </div>
      </header>

      {/* ══════════════ SECTION TABS (mobile) ══════════════ */}
      <div
        className="md:hidden flex-shrink-0 flex items-center gap-1 px-3 py-2 overflow-x-auto z-20"
        style={{ background: '#1565c0' }}
      >
        {sections.map(sec => (
          <button
            key={sec}
            onClick={() => jumpToQuestion(sec, 0)}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap flex-shrink-0 transition-all ${
              currentSection === sec ? 'bg-white text-blue-700' : 'text-white/80 hover:bg-white/20'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* ══════════════ MAIN CONTENT ══════════════ */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Question Area ── */}
        <main className="flex-1 overflow-y-auto flex flex-col min-w-0">

          {/* Question header */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-gray-800">Question {qNumber}</span>
              <span className="text-gray-300">|</span>
              <span className="text-[11px] text-gray-400 uppercase tracking-wide">{currentSection}</span>
              {currentQ?.chapter && (
                <><span className="text-gray-300">|</span><span className="text-[11px] text-gray-400 truncate max-w-[120px] sm:max-w-xs">{currentQ.chapter}</span></>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentQ?.type === 'integer' && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Integer Type</span>
              )}
              {currentQ?.type === 'multi-correct' && (
                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Multi-Correct</span>
              )}
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${currentQ ? STATUS_STYLE[statuses[currentQ.id] || 'not-visited'] : ''}`}
                style={{ display: 'inline-block' }}
              />
            </div>
          </div>

          {/* Question content */}
          <div className="flex-1 p-4 sm:p-6" ref={questionRef}>
            {currentQ ? (
              <div className="max-w-3xl">
                {/* Question text */}
                <div
                  className="text-gray-900 text-[14px] sm:text-[15px] leading-relaxed mb-4 select-text"
                  dangerouslySetInnerHTML={{ __html: currentQ.question_text }}
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
                  <div className="space-y-2.5 mt-4">
                    {currentQ.options.map((opt) => {
                      const isSelected = currentQ.type === 'multi-correct'
                        ? (selectedOption || '').split(',').includes(opt.id)
                        : selectedOption === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectOption(opt.id)}
                          className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border text-[13.5px] transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 text-blue-900'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50/40'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${
                            isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 text-gray-500'
                          }`}>
                            {opt.id}
                          </div>
                          <div className="flex-1 leading-relaxed">
                            {opt.text && (
                              <span dangerouslySetInnerHTML={{ __html: opt.text }} />
                            )}
                            {opt.image && (
                              <img src={opt.image} alt={`Option ${opt.id}`} className="mt-2 max-h-28 rounded-lg border border-gray-200 object-contain" />
                            )}
                          </div>
                        </button>
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

          {/* ── Prev / Next navigation ── */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-2">
            <button
              onClick={() => {
                if (currentIndex > 0) jumpToQuestion(currentSection, currentIndex - 1);
                else {
                  const si = sections.indexOf(currentSection);
                  if (si > 0) {
                    const prevSec = sections[si - 1];
                    const prevQs = questions.filter(q => q.subject === prevSec);
                    jumpToQuestion(prevSec, prevQs.length - 1);
                  }
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-semibold transition-all"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <div className="flex-1" />
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-semibold transition-all"
            >
              <RotateCcw size={13} /> Clear
            </button>
            <button
              onClick={() => saveAndAdvance(true)}
              className="px-3 py-2 rounded-xl border text-xs font-bold transition-all border-purple-400 text-purple-700 bg-purple-50 hover:bg-purple-100"
            >
              Mark & Next
            </button>
            <button
              onClick={() => saveAndAdvance(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all text-white hover:brightness-105"
              style={{ background: '#1565c0' }}
            >
              Save & Next <ChevronRight size={13} className="inline" />
            </button>
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

          {/* Candidate card */}
          <div className="flex-shrink-0 p-3.5 border-b border-gray-200" style={{ background: '#0f2d52' }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-500 overflow-hidden border-2 border-white/30 flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-white">
                    {profile?.name?.[0]?.toUpperCase() || 'A'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-white text-[13px] font-bold truncate">{profile?.name || 'Candidate'}</div>
                <div className="text-blue-300 text-[10px] truncate">{profile?.email || ''}</div>
              </div>
            </div>
          </div>

          {/* Section selector in sidebar */}
          <div className="flex-shrink-0 border-b border-gray-200 flex overflow-x-auto">
            {sections.map(sec => (
              <button
                key={sec}
                onClick={() => { setCurrentSection(sec); setCurrentIndex(0); }}
                className={`flex-shrink-0 px-3 py-2 text-[11px] font-bold transition-all border-b-2 ${
                  currentSection === sec
                    ? 'border-blue-600 text-blue-700 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>

          {/* Section stats legend */}
          {sStats && (
            <div className="flex-shrink-0 px-3 pt-2.5 pb-2 border-b border-gray-100 bg-gray-50">
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Answered',     count: sStats.answered,    cls: STATUS_STYLE['answered'] },
                  { label: 'Not Answered', count: sStats.notAnswered, cls: STATUS_STYLE['not-answered'] },
                  { label: 'Marked',       count: sStats.marked,      cls: STATUS_STYLE['marked'] },
                  { label: 'Not Visited',  count: sStats.notVisited,  cls: STATUS_STYLE['not-visited'] },
                ].map(({ label, count, cls }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold ${cls}`}>{count}</span>
                    <span className="text-[10px] text-gray-500 truncate">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question palette grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-5 gap-1.5">
              {questions
                .filter(q => q.subject === currentSection)
                .map((q, idx) => {
                  const status = statuses[q.id] || 'not-visited';
                  const qNum = questions.findIndex(x => x.id === q.id) + 1;
                  return (
                    <button
                      key={q.id}
                      onClick={() => jumpToQuestion(currentSection, idx)}
                      className={`w-full aspect-square rounded-lg text-[12px] font-bold transition-all hover:scale-105 active:scale-95 ${STATUS_STYLE[status]} ${
                        currentQ?.id === q.id ? 'ring-2 ring-blue-400 ring-offset-1' : ''
                      }`}
                    >
                      {qNum}
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
    </div>
  );
}
