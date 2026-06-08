'use client';

import { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuestions, Question } from '@/hooks/useQuestions';
import { useAttempts, Attempt } from '@/hooks/useAttempts';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase/client';
import 'katex/dist/katex.min.css';
import { 
  Zap,
  Loader2,
  BookOpen,
  BarChart3,
  Check,
  ChevronRight,
  Award,
  Lock,
  Sparkles,
  ChevronLeft
} from 'lucide-react';

// ─── Module-level helpers (defined OUTSIDE the component so React never recreates them) ───

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
      p = p.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="q-inline-img" />');
      // Normal newlines
      p = p.replace(/\n/g, '<br/>');
      parts[i] = p;
    }
  }

  return parts.join('');
};

// KEY FIX: Defined outside SolvingPage so React never sees a new component type,
// which was causing KaTeX to re-render (and options to flash) on every state change.
const QuestionText = memo(function QuestionText({ text, className = '' }: { text: string; className?: string }) {
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

const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_ATTEMPTS = 3;

type SolverView = 'modes' | 'pyq-selection' | 'solving';

interface ChapterInfo {
  name: string;
  count: number;
}

interface QuestionTimerProps {
  timerRef: React.MutableRefObject<number>;
  timerIntervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  questionId: string | undefined;
  isAnswered: boolean;
  isOnCooldown: boolean;
}

const QuestionTimer = memo(({ timerRef, timerIntervalRef, questionId, isAnswered, isOnCooldown }: QuestionTimerProps) => {
  const [displayTime, setDisplayTime] = useState(0);

  useEffect(() => {
    // Stop any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    // Reset refs & local state
    timerRef.current = 0;
    setDisplayTime(0);

    if (!questionId || isAnswered || isOnCooldown) return;

    timerIntervalRef.current = setInterval(() => {
      timerRef.current += 1;
      setDisplayTime(timerRef.current);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [questionId, isAnswered, isOnCooldown, timerRef, timerIntervalRef]);

  if (isAnswered || isOnCooldown) return null;

  return (
    <span className="solver-badge" style={{ background: 'rgba(0,240,255,0.08)', color: 'var(--accent)', border: '1px solid rgba(0,240,255,0.2)', fontFamily: "'DM Mono', monospace" }}>
      ⏱ {Math.floor(displayTime / 60).toString().padStart(2, '0')}:{(displayTime % 60).toString().padStart(2, '0')}
    </span>
  );
});

export default function SolvingPage() {
  const { profile } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ─── Initialise state from URL params so refresh always restores position ───
  const [view, setView] = useState<SolverView>(() => {
    const q = searchParams.get('q');
    const chapter = searchParams.get('chapter');
    const exam = searchParams.get('exam');
    if (q !== null && chapter && exam) return 'solving';
    if (exam) return 'pyq-selection';
    return 'modes';
  });
  const [selectedExam, setSelectedExam] = useState<string | null>(() => searchParams.get('exam'));
  const [subject, setSubject] = useState(() => searchParams.get('subject') || 'physics');
  const [selectedChapter, setSelectedChapter] = useState<string | null>(() => searchParams.get('chapter'));
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const q = searchParams.get('q');
    const n = q !== null ? parseInt(q) : 0;
    return isNaN(n) ? 0 : n;
  });
  const [showSolution, setShowSolution] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [integerInput, setIntegerInput] = useState('');
  const [selectedMultiOptions, setSelectedMultiOptions] = useState<number[]>([]);
  // Ref-based cache like legacy solver's _pyqAttemptCache — updated synchronously,
  // no re-render needed, acts as the authoritative in-session store.
  const attemptCacheRef = useRef<Record<string, Attempt>>({});
  const [localAttempts, setLocalAttempts] = useState<Record<string, Attempt>>({});
  // Tracks total number of attempts per question (across all sessions)
  const [attemptsCount, setAttemptsCount] = useState<Record<string, number>>({});
  // Tracks questions currently being reattempted (UI reset state)
  const [reattemptingQIds, setReattemptingQIds] = useState<Set<string>>(new Set());

  // ─── Question Timer ───
  const timerRef = useRef<number>(0);                          // elapsed seconds (mutable, no re-render)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null); // interval handle

  // ─── Sync state → URL so refresh always restores position ───
  const didMountRef = useRef(false);
  useEffect(() => {
    // skip the very first render to avoid double-replacing on initial load
    if (!didMountRef.current) { didMountRef.current = true; return; }
    const params = new URLSearchParams();
    if (selectedExam)   params.set('exam',    selectedExam);
    if (subject !== 'physics') params.set('subject', subject);
    if (selectedChapter) params.set('chapter', selectedChapter);
    if (view === 'solving') params.set('q', currentIndex.toString());
    const qs = params.toString();
    router.replace(qs ? `/solving?${qs}` : '/solving', { scroll: false } as any);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedExam, subject, selectedChapter, currentIndex]);

  // Filters
  const [filterYear, setFilterYear] = useState('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  // Fetch chapters and counts for the subject
  useEffect(() => {
    async function fetchChapters() {
      if (!selectedExam) return;
      setLoadingChapters(true);
      const mappedExam = selectedExam === 'jee-mains' ? 'jee-main' : selectedExam;
      const { data } = await supabase
        .from('questions')
        .select('chapter')
        .eq('subject', subject.toLowerCase())
        .eq('exam_type', mappedExam);
      
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(d => {
          if (d.chapter) {
            counts[d.chapter] = (counts[d.chapter] || 0) + 1;
          }
        });
        const sorted = Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setChapters(sorted);
      }
      setLoadingChapters(false);
    }
    fetchChapters();
  }, [subject, selectedExam]);

  const { questions: rawQuestions, loading: qLoading } = useQuestions(subject, selectedChapter, selectedExam);

  // KEY FIX: Memoize the filter so `questions` has a stable reference.
  // Previously this ran inline → new array every render → qIds changed every render
  // → useAttempts re-fetched → overwrote optimistic attempts → colors disappeared.
  const questions = useMemo(() => rawQuestions.filter(q => {
    if (filterYear !== 'ALL' && q.year.toString() !== filterYear) return false;
    if (filterDifficulty !== 'ALL' && q.difficulty?.toUpperCase() !== filterDifficulty) return false;
    if (filterType !== 'ALL') {
      if (filterType === 'NUMERICAL' && q.type !== 'integer') return false;
      if (filterType === 'MCQ' && q.type !== 'mcq') return false;
      if (filterType === 'MULTI-CORRECT' && q.type !== 'multi-select') return false;
    }
    return true;
  }), [rawQuestions, filterYear, filterDifficulty, filterType]);

  const qIds = useMemo(() => questions.map(q => q._dbId), [questions]);
  const { attempts: fetchedAttempts, refetch: refetchAttempts } = useAttempts(qIds);

  const attempts = localAttempts;
  const currentQuestion = questions[currentIndex];
  const currentAttempt = currentQuestion ? attempts[currentQuestion._dbId] : null;
  
  // A question is "on cooldown" only if the LATEST attempt is correct AND within 12 hrs.
  const isOnCooldown = (attempt: Attempt | null) => {
    if (!attempt) return false;
    if (!attempt.is_correct) return false; // wrong answers don't trigger cooldown
    const age = Date.now() - new Date(attempt.created_at).getTime();
    return age < COOLDOWN_MS;
  };

  // A question is locked if:
  //   (a) on cooldown (correct + within 12 hrs), OR
  //   (b) reached max attempts
  const getAttemptCount = (qId: string) => attemptsCount[qId] || 0;
  const isAttemptLocked = (attempt: Attempt | null, qId: string) => {
    if (isOnCooldown(attempt)) return true;
    if (getAttemptCount(qId) >= MAX_ATTEMPTS) return true;
    return false;
  };

  // isAnswered: question is in a "show result" state (has a latest attempt but NOT being reattempted)
  const isAnswered = currentQuestion
    ? !!currentAttempt && !reattemptingQIds.has(currentQuestion._dbId)
    : false;

  // Reset attempt cache when chapter changes so old answers don’t bleed through.
  useEffect(() => {
    attemptCacheRef.current = {};
    setLocalAttempts({});
    setReattemptingQIds(new Set());
  }, [selectedChapter, subject]);

  useEffect(() => {
    setSelectedOption(null);
    setSelectedMultiOptions([]);
    setIntegerInput('');
  }, [currentIndex, selectedChapter]);



  // KEY FIX: MERGE fetched attempts into local state instead of replacing.
  // Replacing would clobber any optimistic updates already in local state.
  // Also build the attempts-count map from fetched data.
  useEffect(() => {
    setLocalAttempts(prev => ({ ...fetchedAttempts, ...prev }));
  }, [fetchedAttempts]);

  // Sync attempt counts from DB on question set change
  useEffect(() => {
    if (!qIds.length) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_attempts')
        .select('question_id')
        .eq('user_id', user.id)
        .in('question_id', qIds);
      if (data) {
        const countMap: Record<string, number> = {};
        data.forEach(a => { countMap[a.question_id] = (countMap[a.question_id] || 0) + 1; });
        setAttemptsCount(prev => ({ ...prev, ...countMap }));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIds.join(',')]);

  const handleSubmit = (optionIdx?: number) => {
    if (!currentQuestion || isAnswered) return;

    const qId = currentQuestion._dbId;

    // If user is reattempting, clear the reattempting state first
    const isReattempt = reattemptingQIds.has(qId);

    let isCorrect = false;
    let answerValue = '';

    if (currentQuestion.type === 'integer') {
      if (!integerInput) return;
      isCorrect = Number(integerInput) === Number(currentQuestion.answer);
      answerValue = integerInput;
    } else if (currentQuestion.type === 'multi-select') {
      if (selectedMultiOptions.length === 0) return;
      const sortedSelected = [...selectedMultiOptions].sort((a, b) => a - b);
      answerValue = sortedSelected.join(',');
      const correctAnswerStr = currentQuestion.correct_answer || '';
      const correctArr = correctAnswerStr.split(',').filter(Boolean).map(x => parseInt(x.trim())).sort((a, b) => a - b);
      isCorrect = sortedSelected.length === correctArr.length && sortedSelected.every((v, i) => v === correctArr[i]);
    } else {
      const activeIdx = optionIdx !== undefined && optionIdx !== null ? optionIdx : selectedOption;
      if (activeIdx === null || activeIdx === undefined) return;
      isCorrect = activeIdx === currentQuestion.correct;
      answerValue = activeIdx.toString();
    }

    // ─── Stop the timer and capture elapsed seconds ───
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    const timeTaken = timerRef.current;

    const newAttempt: Attempt = {
      id: 'temp-' + Date.now(),
      question_id: qId,
      is_correct: isCorrect,
      selected_answer: answerValue,
      time_taken: timeTaken,
      created_at: new Date().toISOString(),
    };

    // Remove from reattempting set, update local attempts
    if (isReattempt) {
      setReattemptingQIds(prev => { const s = new Set(prev); s.delete(qId); return s; });
    }
    attemptCacheRef.current[qId] = newAttempt;
    setLocalAttempts(prev => ({ ...prev, [qId]: newAttempt }));
    // Optimistically increment the local attempt count
    setAttemptsCount(prev => ({ ...prev, [qId]: (prev[qId] || 0) + 1 }));

    // Fire-and-forget DB save
    const userId = profile?.id;
    if (userId) {
      supabase.from('user_attempts').insert({
        user_id: userId,
        question_id: qId,
        is_correct: isCorrect,
        selected_answer: answerValue,
        time_taken: timeTaken,
      }).then(({ data, error }) => {
        if (error) {
          console.error('[Solver] Failed to save attempt:', error.message);
        } else if (data && (data as any)[0]) {
          attemptCacheRef.current[qId] = (data as any)[0];
        }
      });
    }
  };

  // ─── Reattempt Handler ───
  const handleReattempt = () => {
    if (!currentQuestion) return;
    const qId = currentQuestion._dbId;
    // Clear inputs and timer for a fresh attempt
    setSelectedOption(null);
    setSelectedMultiOptions([]);
    setIntegerInput('');
    // Reset timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    timerRef.current = 0;
    // Mark as reattempting so isAnswered flips to false
    setReattemptingQIds(prev => new Set(prev).add(qId));
    // Remove from ref cache so guard doesn't block submission
    delete attemptCacheRef.current[qId];
  };

  // formatText and QuestionText are now module-level (see top of file)

  const jumpToQ = (idx: number) => {
    setCurrentIndex(idx);
    setShowSolution(false);
    setSelectedOption(null);
    setIntegerInput('');
  };

  // View 1: Mode Selection
  if (view === 'modes') {
    return (
      <div className="an-content max-w-5xl mx-auto py-12 px-6">
        <div className="mb-10">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Select your training interface</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div onClick={() => setView('pyq-selection')} className="bg-bg-2 border border-white/5 rounded-3xl p-8 cursor-pointer hover:border-purple/40 hover:bg-purple/5 transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap size={80} />
             </div>
             <div className="bg-purple/10 text-purple w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <Zap size={24} />
             </div>
             <h3 className="text-2xl font-[family-name:var(--font-bebas)] tracking-wide text-foreground mb-2">PYQ Solver</h3>
             <p className="text-xs text-muted-foreground leading-relaxed mb-6">Full access to JEE Main & Advanced archive. Original Solving Minds solving layout.</p>
             <div className="flex items-center text-purple text-[10px] font-bold uppercase tracking-widest">
                Initiate <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
             </div>
          </div>

          <div className="bg-bg-2 border border-white/5 rounded-3xl p-8 opacity-50 relative overflow-hidden">
             <div className="bg-accent/10 text-accent w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <BookOpen size={24} />
             </div>
             <h3 className="text-2xl font-[family-name:var(--font-bebas)] tracking-wide text-foreground mb-2">Booklets</h3>
             <p className="text-xs text-muted-foreground leading-relaxed mb-6">Topic-wise modules and study material. Integrates soon.</p>
             <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Protocol Locked</div>
          </div>

          <div className="bg-bg-2 border border-white/5 rounded-3xl p-8 opacity-50 relative overflow-hidden">
             <div className="bg-green/10 text-green w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <BarChart3 size={24} />
             </div>
             <h3 className="text-2xl font-[family-name:var(--font-bebas)] tracking-wide text-foreground mb-2">Mock Tests</h3>
             <p className="text-xs text-muted-foreground leading-relaxed mb-6">Full simulations with ranking systems. In calibration.</p>
             <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Protocol Locked</div>
          </div>
        </div>
      </div>
    );
  }

  // View 2: PYQ Selection (Legacy Style)
  if (view === 'pyq-selection') {
    if (!selectedExam) {
      return (
        <div className="an-content max-w-5xl mx-auto py-8 px-6 pb-32">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-muted-foreground text-[9px] font-bold uppercase tracking-widest mb-6">
             <button onClick={() => setView('modes')} className="hover:text-foreground transition-colors">MODES</button>
             <span className="opacity-30">/</span>
             <span className="text-muted-foreground/60">EXAM SELECTION</span>
          </div>

          <div className="mb-10">
            <p className="font-mono text-[10px] text-purple uppercase tracking-[0.2em] mb-2">Select Target Qualification</p>
            <h1 className="text-4xl font-[family-name:var(--font-bebas)] tracking-wider text-foreground mb-3">EXAM SELECTION PORTAL</h1>
            <p className="text-gray-500 text-xs max-w-2xl leading-relaxed">
              Select your target qualification. Solving Minds provides authentic past-year exam simulation engines calibrated to the latest syllabus standards.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: JEE Main (Active) */}
            <div 
              onClick={() => setSelectedExam('jee-mains')}
              className="bg-bg-2 border border-white/5 hover:border-purple/40 hover:bg-purple/5 rounded-3xl p-8 cursor-pointer transition-all group relative overflow-hidden flex flex-col justify-between min-h-[250px]"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Award size={80} className="text-purple" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-purple/10 text-purple w-12 h-12 rounded-2xl flex items-center justify-center">
                    <Award size={24} />
                  </div>
                  <span className="bg-green/10 text-green border border-green/20 text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    ACTIVE ENGINE
                  </span>
                </div>
                <h3 className="text-2xl font-[family-name:var(--font-bebas)] tracking-wide text-foreground mb-2">JEE MAIN</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Complete archive of JEE Main past year questions (2023-2026). Calibrated with chapter-wise micro analytics and custom solving modes.
                </p>
              </div>
              <div className="flex items-center text-purple text-[10px] font-bold uppercase tracking-widest mt-auto">
                 INITIATE SESSION <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: JEE Advanced (Active) */}
            <div
              onClick={() => setSelectedExam('jee-advanced')}
              className="bg-bg-2 border border-white/5 hover:border-orange/40 hover:bg-orange/5 rounded-3xl p-8 cursor-pointer transition-all group relative overflow-hidden flex flex-col justify-between min-h-[250px]"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Sparkles size={80} className="text-orange" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-orange/10 text-orange w-12 h-12 rounded-2xl flex items-center justify-center">
                    <Sparkles size={24} />
                  </div>
                  <span className="bg-green/10 text-green border border-green/20 text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    ACTIVE ENGINE
                  </span>
                </div>
                <h3 className="text-2xl font-[family-name:var(--font-bebas)] tracking-wide text-foreground mb-2">JEE ADVANCED</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Full archive of JEE Advanced past year questions. Supports single-correct, multiple-correct, and numerical answer types.
                </p>
              </div>
              <div className="flex items-center text-orange text-[10px] font-bold uppercase tracking-widest mt-auto">
                INITIATE SESSION <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3: NEET (Coming Soon) */}
            <div className="bg-bg-2 border border-white/5 rounded-3xl p-8 opacity-50 relative overflow-hidden flex flex-col justify-between min-h-[250px]">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <BookOpen size={80} className="text-blue" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-blue/10 text-blue w-12 h-12 rounded-2xl flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                  <span className="bg-white/5 text-muted-foreground border border-white/5 text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1">
                    <Lock size={8} /> COMING SOON
                  </span>
                </div>
                <h3 className="text-2xl font-[family-name:var(--font-bebas)] tracking-wide text-foreground mb-2">NEET (UG)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  High-speed biological & chemical entry drills. Authentic negative marking mock trials and error notebooks.
                </p>
              </div>
              <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-auto">
                 PROTOCOL LOCKED
              </div>
            </div>

            {/* Card 4: BITSAT (Coming Soon) */}
            <div className="bg-bg-2 border border-white/5 rounded-3xl p-8 opacity-50 relative overflow-hidden flex flex-col justify-between min-h-[250px]">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Zap size={80} className="text-yellow" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-yellow/10 text-yellow w-12 h-12 rounded-2xl flex items-center justify-center">
                    <Zap size={24} />
                  </div>
                  <span className="bg-white/5 text-muted-foreground border border-white/5 text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1">
                    <Lock size={8} /> COMING SOON
                  </span>
                </div>
                <h3 className="text-2xl font-[family-name:var(--font-bebas)] tracking-wide text-foreground mb-2">BITSAT</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Speed-accuracy optimizer focusing on rapid mathematical drills, logical reasoning, and English proficiency modules.
                </p>
              </div>
              <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-auto">
                 PROTOCOL LOCKED
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="an-content max-w-5xl mx-auto py-8 px-6 pb-32">
        <div className="flex items-center gap-2 text-muted-foreground text-[9px] font-bold uppercase tracking-widest mb-4">
           <button onClick={() => setView('modes')} className="hover:text-foreground transition-colors">MODES</button>
           <span className="opacity-30">/</span>
           <button onClick={() => setSelectedExam(null)} className="hover:text-foreground transition-colors">EXAMS</button>
           <span className="opacity-30">/</span>
           <span className="text-muted-foreground/60">{selectedExam.toUpperCase().replace('-', ' ')}</span>
        </div>

        <button 
          onClick={() => setSelectedExam(null)}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-white transition-colors mb-6 uppercase tracking-wider font-bold"
        >
          <ChevronLeft size={14} /> Back to Exam Selection
        </button>

        <p className="text-gray-500 text-[10px] mb-8">Target high-yield concepts. Select your focus area to begin the deep-work session.</p>

        {/* Step 1: Subject */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 rounded-full bg-[#1c1c28] border border-white/10 flex items-center justify-center text-[9px] font-bold text-[#7c3aed]">01</div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-white">SELECT_SUBJECT</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 max-w-2xl">
            {['physics', 'chemistry', 'mathematics'].map(s => (
              <button 
                key={s}
                onClick={() => setSubject(s)}
                className={`flex flex-col gap-2 p-4 rounded-xl border transition-all ${subject === s ? 'bg-purple/20 border-purple text-foreground shadow-[0_0_15px_rgba(124,58,237,0.2)]' : 'bg-bg-2 border-white/5 text-muted-foreground hover:border-white/10'}`}
              >
                <div className="text-2xl font-black">
                  {s === 'physics' ? 'Σ' : s === 'chemistry' ? 'Δ' : '∫'}
                </div>
                <div className="text-[8px] font-bold uppercase tracking-[0.2em]">{s === 'mathematics' ? 'MATHS' : s}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Chapter */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 rounded-full bg-[#1c1c28] border border-white/10 flex items-center justify-center text-[9px] font-bold text-[#7c3aed]">02</div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-white">CHOOSE_CHAPTER</h2>
            <div className="ml-auto text-[8px] font-bold uppercase tracking-widest text-[#7c3aed]">{selectedChapter || 'NONE SELECTED'}</div>
          </div>
          
          {loadingChapters ? (
            <div className="flex py-10 justify-center">
              <Loader2 className="animate-spin text-gray-600" size={20} />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {chapters.map(ch => (
                <button 
                  key={ch.name}
                  onClick={() => setSelectedChapter(ch.name)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${selectedChapter === ch.name ? 'bg-purple/10 border-purple text-foreground' : 'bg-bg-2 border-white/5 text-muted-foreground hover:border-white/10'}`}
                >
                  <div className="font-bold text-[11px] mb-1 line-clamp-1">{ch.name}</div>
                  <div className="flex items-center gap-1.5 text-[8px] font-bold text-purple/60 uppercase tracking-widest">
                     <BookOpen size={8} /> {ch.count} Q
                  </div>
                  {selectedChapter === ch.name && (
                    <div className="absolute top-3 right-3">
                      <Check size={12} className="text-purple" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 3: Fine Tune */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 rounded-full bg-[#1c1c28] border border-white/10 flex items-center justify-center text-[9px] font-bold text-[#7c3aed]">03</div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-white">FINE_TUNE</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-3">EXAM YEARS</label>
              <div className="flex flex-wrap gap-2">
                {['ALL', '2026', '2025', '2024', '2023'].map(year => (
                  <button
                    key={year}
                    onClick={() => setFilterYear(year)}
                    className={`px-4 py-1.5 rounded-full text-[9px] font-bold transition-all ${filterYear === year ? 'bg-purple text-white' : 'bg-bg-2 border border-white/5 text-muted-foreground hover:text-foreground'}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-3">DIFFICULTY</label>
                <div className="flex gap-2">
                  {['ALL', 'EASY', 'MED', 'HARD'].map(diff => (
                    <button
                      key={diff}
                      onClick={() => setFilterDifficulty(diff)}
                      className={`flex-1 py-2 rounded-lg text-[9px] font-bold border transition-all ${filterDifficulty === diff ? 'bg-purple/10 border-purple text-purple' : 'bg-bg-2 border-white/5 text-muted-foreground hover:text-foreground'}`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-3">QUESTION TYPE</label>
                <div className="flex gap-2">
                  {['ALL', 'MCQ', 'MULTI-CORRECT', 'NUMERICAL'].map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`flex-1 py-2 rounded-lg text-[9px] font-bold border transition-all ${filterType === type ? 'bg-purple/10 border-purple text-purple' : 'bg-bg-2 border-white/5 text-muted-foreground hover:text-foreground'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a10]/80 backdrop-blur-xl border-t border-white/[0.05] p-3 flex items-center justify-between z-[1100]">
           <div className="flex items-center gap-6 px-6">
              <div className="flex flex-col">
                <span className="text-[7px] text-gray-600 font-bold uppercase tracking-widest">SUBJECT</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-purple">{subject}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] text-muted-foreground font-bold uppercase tracking-widest">CHAPTER</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-purple">{selectedChapter || '—'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] text-muted-foreground font-bold uppercase tracking-widest">QUESTIONS</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-purple">
                  {selectedChapter ? questions.length : '—'}
                </span>
              </div>
           </div>
           <button 
              disabled={!selectedChapter || questions.length === 0}
              onClick={() => {
                setView('solving');
                setCurrentIndex(0);
              }}
              className="bg-purple hover:bg-purple-600 text-white px-8 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(124,58,237,0.4)]"
            >
              <Zap size={12} /> START SOLVING
           </button>
        </div>
      </div>
    );
  }

  // View 3: Solving Environment — Distraction-Free Focus Mode
  return (
    <div className="sf-wrapper">
      {/* Top bar: chapter name + back button */}
      <div className="sf-topbar">
        <div className="sf-topbar-chapter">
          <span className="sf-topbar-label">{subject.toUpperCase()}</span>
          <span className="sf-topbar-sep">/</span>
          <span className="sf-topbar-title">{selectedChapter || 'Solving'}</span>
          <span className="sf-topbar-count">({questions.length})</span>
        </div>
        <button
          className="sf-back-btn"
          onClick={() => setView('pyq-selection')}
          title="Back to selection"
        >
          <ChevronLeft size={18} />
          <span className="sf-back-label">Back</span>
        </button>
      </div>

      {/* Main layout: question (80%) | navigator (20%) */}
      <div className="sf-layout">

        {/* ── LEFT: Question Area (80%) ── */}
        <div className="sf-question-col">
          <div className="sf-q-card">
            {qLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#7c3aed]" />
              </div>
            ) : questions.length === 0 ? (
              <div className="sf-empty">
                <BarChart3 size={40} className="mb-3 opacity-20" />
                <p>No questions match your filters.</p>
              </div>
            ) : currentQuestion ? (
              <div id="q-content">
                {/* Meta badges */}
                <div className="zd-q-meta">
                  <span className="solver-badge solver-badge-chapter">{currentQuestion.chapter}</span>
                  <span className={`solver-badge solver-badge-${currentQuestion.difficulty?.toLowerCase()}`}>
                    {currentQuestion.difficulty}
                  </span>
                  <span className={`solver-badge solver-badge-${currentQuestion.type}`}>
                    {currentQuestion.type === 'mcq' ? 'MCQ' : currentQuestion.type === 'multi-select' ? 'Multi-Correct' : 'Numerical'}
                  </span>
                  <span className="solver-badge solver-badge-year">{currentQuestion.year}</span>
                  {isAnswered && isOnCooldown(currentAttempt) && (
                    <span className="solver-badge" style={{ background: 'rgba(255,147,64,0.15)', color: '#ff9340', border: '1px solid rgba(255,147,64,0.3)' }}>
                      ⏳ COOLDOWN ACTIVE
                    </span>
                  )}
                  <QuestionTimer 
                    timerRef={timerRef}
                    timerIntervalRef={timerIntervalRef}
                    questionId={currentQuestion?._dbId}
                    isAnswered={isAnswered}
                    isOnCooldown={isOnCooldown(currentAttempt)}
                  />
                  {isAnswered && currentAttempt?.time_taken != null && currentAttempt.time_taken > 0 && (
                    <span className="solver-badge" style={{ background: 'rgba(0,229,160,0.1)', color: 'var(--green)', border: '1px solid rgba(0,229,160,0.25)', fontFamily: "'DM Mono', monospace" }}>
                      ⏱ Solved in {currentAttempt.time_taken >= 60 ? `${Math.floor(currentAttempt.time_taken / 60)}m ` : ''}{currentAttempt.time_taken % 60}s
                    </span>
                  )}
                </div>

                {/* Question text */}
                <QuestionText text={currentQuestion.text} className="zd-q-text" />

                {currentQuestion.image && (
                  <img src={currentQuestion.image} className="zd-q-image" alt="Question" />
                )}

                {/* Answer input */}
                {currentQuestion.type === 'integer' ? (
                  <div className="zd-integer-box">
                    <label>ENTER YOUR NUMERICAL ANSWER:</label>
                    <div className="zd-integer-row">
                      <input
                        type="number"
                        step="any"
                        className={`zd-integer-input ${isAnswered ? (currentAttempt?.is_correct ? 'correct' : 'wrong') : ''}`}
                        value={isAnswered ? currentAttempt?.selected_answer : integerInput}
                        onChange={(e) => setIntegerInput(e.target.value)}
                        disabled={isAnswered}
                      />
                    </div>
                    {isAnswered && (
                      <div className={`zd-integer-feedback ${currentAttempt?.is_correct ? 'correct' : 'wrong'}`}>
                        {currentAttempt?.is_correct ? '✓ Correct!' : `✗ Wrong. Answer: ${currentQuestion.answer}`}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="zd-options-grid">
                    {currentQuestion.options.map((opt, i) => {
                      const isMulti = currentQuestion.type === 'multi-select';
                      let isCorrectOpt = false, isUserOpt = false, isSelected = false;
                      if (isMulti) {
                        const correctIdxs = currentQuestion.correct_answer
                          ? currentQuestion.correct_answer.split(',').filter(Boolean).map(x => parseInt(x.trim()))
                          : [];
                        const userSelectedIdxs = currentAttempt?.selected_answer
                          ? currentAttempt.selected_answer.split(',').filter(Boolean).map(x => parseInt(x.trim()))
                          : [];
                        isCorrectOpt = correctIdxs.includes(i);
                        isUserOpt = userSelectedIdxs.includes(i);
                        isSelected = selectedMultiOptions.includes(i);
                      } else {
                        isCorrectOpt = i === currentQuestion.correct;
                        const selectedIdx = isAnswered ? Number(currentAttempt?.selected_answer) : -1;
                        isUserOpt = isAnswered && selectedIdx === i;
                        isSelected = !isAnswered && selectedOption === i;
                      }
                      let cls = 'solver-option-btn';
                      if (isAnswered) {
                        cls += ' disabled';
                        if (isCorrectOpt) cls += ' correct';
                        if (isUserOpt && !isCorrectOpt) cls += ' wrong';
                      } else {
                        if (isSelected) cls += ' active';
                      }
                      const handleOptionClick = () => {
                        if (isAnswered) return;
                        if (isMulti) {
                          setSelectedMultiOptions(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
                        } else {
                          setSelectedOption(i);
                        }
                      };
                      return (
                        <button key={i} className={cls} disabled={isAnswered} onClick={handleOptionClick}>
                          <span className="solver-option-key">{String.fromCharCode(65 + i)}</span>
                          <div className="flex-1 text-left">
                            {opt.text ? <QuestionText text={opt.text} /> : null}
                            {opt.image ? <img src={opt.image} alt={`Option ${String.fromCharCode(65 + i)}`} className="mt-2 rounded-xl border border-[var(--border)] max-h-32 w-auto bg-[var(--bg)]" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ── Action buttons: shown ABOVE the explanation ── */}
                <div className="sf-actions">
                  {/* PREVIOUS */}
                  <button
                    className="sf-btn sf-btn-ghost"
                    onClick={() => jumpToQ(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0}
                  >
                    <span className="hidden sm:inline">← PREV</span>
                    <span className="inline sm:hidden">←</span>
                  </button>

                  {/* SUBMIT */}
                  {!isAnswered && (
                    <button
                      className="sf-btn sf-btn-primary"
                      onClick={() => handleSubmit()}
                      disabled={
                        (currentQuestion.type === 'integer' && !integerInput.trim()) ||
                        (currentQuestion.type === 'multi-select' && selectedMultiOptions.length === 0) ||
                        (currentQuestion.type === 'mcq' && selectedOption === null)
                      }
                    >
                      SUBMIT
                    </button>
                  )}

                  {/* REATTEMPT */}
                  {isAnswered && currentAttempt && !isOnCooldown(currentAttempt) && getAttemptCount(currentQuestion._dbId) < MAX_ATTEMPTS && (
                    <button
                      className="sf-btn sf-btn-reattempt"
                      onClick={handleReattempt}
                    >
                      <span className="hidden sm:inline">↺ REATTEMPT ({MAX_ATTEMPTS - getAttemptCount(currentQuestion._dbId)} LEFT)</span>
                      <span className="inline sm:hidden">↺ ({MAX_ATTEMPTS - getAttemptCount(currentQuestion._dbId)})</span>
                    </button>
                  )}

                  {/* NEXT */}
                  <button
                    className={isAnswered ? "sf-btn sf-btn-primary" : "sf-btn sf-btn-ghost"}
                    onClick={() => jumpToQ(Math.min(questions.length - 1, currentIndex + 1))}
                    disabled={currentIndex === questions.length - 1}
                  >
                    <span className="hidden sm:inline">NEXT →</span>
                    <span className="inline sm:hidden">→</span>
                  </button>

                  {/* Progress counter */}
                  <span className="sf-progress">{currentIndex + 1} / {questions.length}</span>
                </div>

                {/* Explanation — below actions */}
                <div className={`zd-explanation ${isAnswered || showSolution ? 'show' : ''}`}>
                  <div className="zd-explanation-label">
                    <Zap size={12} /> SOLUTION
                  </div>
                  <QuestionText text={currentQuestion.explanation} className="zd-explanation-text" />
                  {currentQuestion.explanation_image_url && (
                    <img src={currentQuestion.explanation_image_url} className="mt-4 rounded-xl w-full border border-white/5" alt="Explanation" />
                  )}
                </div>
              </div>
            ) : (
              <div className="sf-empty"><p>Question Protocol Error</p></div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Navigator (20%) — desktop only ── */}
        <div className="sf-nav-col">
          <div className="sf-nav-card">
            <div className="sf-nav-header">
              <span className="sf-nav-title">{selectedChapter?.toUpperCase()}</span>
            </div>
            <div className="sf-nav-legend">
              <span><span className="zd-pip" style={{ background: 'var(--green)' }}></span>Correct</span>
              <span><span className="zd-pip" style={{ background: 'var(--red)' }}></span>Wrong</span>
              <span><span className="zd-pip" style={{ background: 'var(--bg3)' }}></span>Unseen</span>
            </div>
            <div className="sf-nav-grid">
              {questions.map((q, i) => {
                const att = attempts[q._dbId];
                const isReattempting = reattemptingQIds.has(q._dbId);
                const hasResult = !!att && !isReattempting;
                let status = 'unseen';
                if (hasResult) status = att.is_correct ? 'correct' : 'wrong';
                return (
                  <button
                    key={i}
                    className={`solver-q-box ${status} ${i === currentIndex ? 'current' : ''}`}
                    onClick={() => jumpToQ(i)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      <style jsx global>{`
        /* ── Distraction-free solving wrapper ── */
        .sf-wrapper {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          display: flex;
          flex-direction: column;
          padding-bottom: 40px;
        }

        /* ── Top bar ── */
        .sf-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.25rem;
          border-bottom: 1px solid var(--border);
          background: var(--bg);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .sf-topbar-chapter {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .sf-topbar-label { color: var(--accent); }
        .sf-topbar-sep   { color: var(--border); }
        .sf-topbar-title { color: var(--text); }
        .sf-topbar-count { color: var(--text2); }
        .sf-back-btn {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.45rem 0.9rem;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text2);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.18s;
        }
        .sf-back-btn:hover { background: var(--bg2); color: var(--text); border-color: var(--border-hover); }
        .sf-back-label { display: inline; }

        /* ── Main layout ── */
        .sf-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          gap: 1rem;
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem 1rem 0;
          align-items: start;
          width: 100%;
          box-sizing: border-box;
        }

        /* ── Question column ── */
        .sf-question-col { min-width: 0; }
        .sf-q-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.5rem;
        }

        /* ── Navigator column (desktop only) ── */
        .sf-nav-col {
          position: sticky;
          top: 56px;
        }
        .sf-nav-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 1rem;
        }
        .sf-nav-header { margin-bottom: 0.5rem; }
        .sf-nav-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.6rem;
          font-weight: 700;
          color: var(--text2);
          letter-spacing: 0.12em;
          word-break: break-word;
        }
        .sf-nav-legend {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          font-size: 0.6rem;
          color: var(--text2);
          font-weight: 600;
          margin-bottom: 0.75rem;
        }
        .sf-nav-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }

        /* ── Action buttons (above explanation) ── */
        .sf-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          margin: 1.25rem 0 1rem;
          flex-wrap: wrap;
        }
        .sf-progress {
          margin-left: auto;
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          color: var(--text2);
          white-space: nowrap;
        }
        .sf-btn {
          padding: 0.65rem 1.25rem;
          border-radius: 10px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: all 0.18s;
          border: none;
          white-space: nowrap;
        }
        .sf-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .sf-btn-primary {
          background: var(--accent-grad);
          color: white;
          box-shadow: 0 0 14px var(--accent-glow);
        }
        .sf-btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
        .sf-btn-ghost {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text2);
        }
        .sf-btn-ghost:hover:not(:disabled) { background: var(--bg3); color: var(--text); }
        .sf-btn-reattempt {
          background: rgba(124,58,237,0.15);
          border: 1px solid rgba(124,58,237,0.4);
          color: var(--purple);
          font-weight: 800;
        }
        .sf-btn-reattempt:hover { background: rgba(124,58,237,0.25); }

        /* ── Empty state ── */
        .sf-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: var(--text2);
          font-size: 0.85rem;
          text-align: center;
          gap: 0.5rem;
        }

        /* ── Shared question styles (kept from original) ── */
        .zd-q-meta { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .solver-badge {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 3px 10px;
          border-radius: 4px;
          background: var(--bg3);
          border: 1px solid var(--border);
          color: var(--text2);
        }
        .solver-badge-hard   { color: var(--red);    border-color: var(--red);    background: rgba(231,76,60,0.05); }
        .solver-badge-medium { color: var(--orange);  border-color: var(--orange);  background: rgba(243,156,18,0.05); }
        .solver-badge-easy   { color: var(--green);   border-color: var(--green);   background: rgba(39,174,96,0.05); }
        .zd-q-text {
          font-size: 0.97rem;
          line-height: 1.7;
          color: var(--text);
          margin-bottom: 1.25rem;
          font-weight: 500;
          word-wrap: break-word;
        }
        .zd-q-text :global(.katex-display)        { margin: 1.5rem 0; overflow-x: auto; overflow-y: hidden; }
        .zd-explanation-text :global(.katex-display) { margin: 1rem 0; }
        .zd-q-text :global(.katex), .zd-explanation-text :global(.katex) {
          max-width: 100%; overflow-x: auto; overflow-y: hidden;
          display: inline-block; vertical-align: middle;
        }
        .zd-q-image {
          width: 100%; max-height: 280px; object-fit: contain;
          border-radius: 10px; border: 1px solid var(--border);
          background: var(--bg); margin-bottom: 1rem;
        }
        .zd-options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .solver-option-btn {
          display: flex; align-items: center; gap: 1rem;
          padding: 1rem;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text);
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
          max-width: 100%; overflow-x: auto; word-wrap: break-word;
        }
        .solver-option-btn:hover:not(.disabled) { border-color: var(--accent); background: var(--accent-glow); }
        .solver-option-btn.active  { border-color: var(--accent); background: var(--accent-glow); }
        .solver-option-btn.correct { border-color: var(--green); background: rgba(39,174,96,0.05); color: var(--green); }
        .solver-option-btn.wrong   { border-color: var(--red);   background: rgba(231,76,60,0.05);  color: var(--red); }
        .solver-option-btn.disabled { cursor: not-allowed; }
        .solver-option-key {
          width: 30px; height: 30px; border-radius: 6px;
          background: var(--bg3); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-family: 'Space Grotesk', sans-serif;
          font-size: 0.75rem; flex-shrink: 0;
        }
        .solver-option-btn.correct .solver-option-key { background: var(--green); color: white; border-color: var(--green); }
        .solver-option-btn.wrong   .solver-option-key { background: var(--red);   color: white; border-color: var(--red); }

        /* Integer input */
        .zd-integer-box {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 12px; padding: 1rem 1.1rem; margin-bottom: 1rem;
        }
        .zd-integer-box label {
          display: block; font-family: 'Space Grotesk', sans-serif;
          font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--text2); margin-bottom: 0.7rem;
        }
        .zd-integer-row { display: flex; gap: 0.7rem; align-items: center; flex-wrap: wrap; }
        .zd-integer-input {
          background: var(--card); border: 1px solid var(--border-hover);
          border-radius: 8px; color: var(--text);
          font-family: 'DM Mono', monospace; font-size: 1.05rem;
          font-weight: 700; padding: 0.6rem 1rem; width: 200px;
          outline: none; transition: border-color 0.16s, box-shadow 0.16s;
        }
        .zd-integer-input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-glow); }
        .zd-integer-input.correct { border-color: var(--green); }
        .zd-integer-input.wrong   { border-color: var(--red); }
        .zd-integer-feedback {
          font-family: 'Space Grotesk', sans-serif; font-size: 0.8rem;
          font-weight: 700; letter-spacing: 0.04em; margin-top: 0.5rem;
        }
        .zd-integer-feedback.correct { color: var(--green); }
        .zd-integer-feedback.wrong   { color: var(--red); }

        /* Explanation */
        .zd-explanation {
          display: none;
          background: rgba(39,174,96,0.03);
          border: 1px solid rgba(39,174,96,0.1);
          border-radius: 16px; padding: 1.5rem; margin-top: 0.25rem;
          max-width: 100%; overflow-x: auto;
        }
        .zd-explanation.show { display: block; }
        .zd-explanation-label {
          display: flex; align-items: center; gap: 6px;
          font-family: 'Space Grotesk', sans-serif; font-size: 0.65rem;
          font-weight: 700; color: var(--green);
          margin-bottom: 1rem; text-transform: uppercase;
        }
        .zd-explanation-text { font-size: 0.95rem; line-height: 1.6; color: var(--text); }
        .zd-explanation img { max-width: 100%; height: auto; border-radius: 12px; }

        /* Question navigator pip/box */
        .zd-pip {
          width: 8px; height: 8px; border-radius: 2px;
          display: inline-block; margin-right: 4px; vertical-align: middle;
        }
        .solver-q-box {
          width: 30px; height: 30px; border-radius: 6px;
          border: 1px solid var(--border); background: var(--bg3);
          color: var(--text2); font-size: 0.65rem; font-weight: 700;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; font-family: 'DM Mono', monospace;
          transition: all 0.15s;
        }
        .solver-q-box.current { border-color: var(--accent); color: var(--accent); background: var(--accent-glow); }
        .solver-q-box.correct { border-color: var(--green); color: var(--green); background: rgba(39,174,96,0.1); }
        .solver-q-box.wrong   { border-color: var(--red);   color: var(--red);   background: rgba(231,76,60,0.1); }

        /* ── MOBILE overrides ── */
        @media (max-width: 768px) {
          .sf-layout {
            grid-template-columns: 1fr;
            padding: 0;
            gap: 0;
          }
          /* Hide navigator on mobile */
          .sf-nav-col { display: none; }

          .sf-q-card {
            border-radius: 0;
            border-left: none;
            border-right: none;
            border-top: none;
            padding: 1rem 0.875rem;
          }
          .sf-topbar { padding: 0.6rem 0.875rem; }
          .sf-back-label { display: none; }

          /* Single-column options on mobile */
          .zd-options-grid { grid-template-columns: 1fr; }

          /* Actions bar: full width, centred */
          .sf-actions {
            justify-content: center;
            gap: 0.5rem;
          }
          .sf-progress { margin-left: 0; }
          .sf-btn { flex: 1; text-align: center; justify-content: center; display: flex; }
        }
      `}</style>
    </div>
  );
}

