'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import {
  Loader2, AlertTriangle, ArrowLeft, ArrowRight,
  TrendingUp, Clock, BookOpen, Award, Zap,
  CheckCircle2, XCircle, HelpCircle, BarChart3, ChevronRight
} from 'lucide-react';

interface Question {
  id: string;
  subject: string;
  chapter: string;
  topic: string;
  type: string; // 'mcq' | 'integer'
  difficulty: 'easy' | 'medium' | 'hard';
  correct_answer: string;
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
  updated_at: string;
}

interface ChapterStats {
  subject: string;
  chapter: string;
  total: number;
}

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = params.id as string;
  const attemptId = searchParams.get('attemptId');

  useEffect(() => {
    if (attemptId) {
      router.replace(`/analysis/${attemptId}`);
    }
  }, [attemptId, router]);

  const { profile, loading: profileLoading } = useProfile();

  const [test, setTest] = useState<MockTest | null>(null);
  const [attempt, setAttempt] = useState<LiveAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [chapterStats, setChapterStats] = useState<ChapterStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 1. Fetch mock test details
        const { data: testData, error: testErr } = await supabase
          .from('mock_tests')
          .select('*')
          .eq('id', testId)
          .single();

        if (testErr || !testData) {
          setError('Mock test details not found.');
          setLoading(false);
          return;
        }
        setTest(testData);

        // 2. Fetch User Profile & Attempt
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Please log in to view the analysis page.');
          setLoading(false);
          return;
        }

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
          setError('No completed attempts found for this test.');
          setLoading(false);
          return;
        }
        setAttempt(attemptData);

        // 3. Fetch questions
        let qQuery = supabase.from('questions').select('id, subject, chapter, topic, type, difficulty, correct_answer');
        if (testData.is_pyp && testData.year && testData.shift) {
          qQuery = qQuery.eq('year', testData.year).eq('shift', testData.shift);
        } else {
          qQuery = qQuery.eq('booklet_id', testId);
        }

        const { data: qData, error: qErr } = await qQuery;
        if (qErr || !qData) {
          setError('Failed to fetch questions for analysis.');
          setLoading(false);
          return;
        }
        setQuestions(qData);

        // 4. Fetch question stats for weak chapter frequency analysis
        const { data: statsData } = await supabase
          .from('question_stats')
          .select('subject, chapter, total');
        
        if (statsData) {
          setChapterStats(statsData);
        }
      } catch (err: any) {
        console.error('Error loading analysis:', err);
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    if (testId) {
      loadData();
    }
  }, [testId, attemptId]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">Loading test insights...</p>
        </div>
      </div>
    );
  }

  if (error || !test || !attempt || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Analysis Unavailable</h3>
          <p className="text-sm text-slate-400 mb-6">{error || 'Unable to retrieve test data.'}</p>
          <button
            onClick={() => router.push('/tests')}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold transition-all text-xs uppercase tracking-widest font-mono border border-slate-700"
          >
            ← Back to Test Center
          </button>
        </div>
      </div>
    );
  }

  // ─── Analytics Processing ──────────────────────────────────────────────────

  const userAnswers = attempt.answers || {};
  const questionDurations = attempt.question_durations || {};

  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalUnattempted = 0;
  let totalScore = 0;
  let totalTimeSpent = 0;

  // Question Category counters
  let mcqTotal = 0, mcqAttempted = 0, mcqCorrect = 0, mcqIncorrect = 0;
  let numTotal = 0, numAttempted = 0, numCorrect = 0, numIncorrect = 0;

  // Subject counters
  const subjectsList = [...new Set(questions.map(q => q.subject))];
  const subjectSummary: Record<string, {
    total: number;
    attempted: number;
    correct: number;
    incorrect: number;
    score: number;
    timeSpent: number;
  }> = {};

  subjectsList.forEach(sub => {
    subjectSummary[sub] = { total: 0, attempted: 0, correct: 0, incorrect: 0, score: 0, timeSpent: 0 };
  });

  // Difficulty counters
  // Map key: subject + '_' + difficulty
  const difficultySummary: Record<string, {
    total: number;
    attempted: number;
    correct: number;
    incorrect: number;
    timeSpent: number;
  }> = {};

  const difficulties = ['easy', 'medium', 'hard'] as const;
  subjectsList.forEach(sub => {
    difficulties.forEach(diff => {
      difficultySummary[`${sub}_${diff}`] = { total: 0, attempted: 0, correct: 0, incorrect: 0, timeSpent: 0 };
    });
  });

  // Chapter mistake counter
  const chapterMistakes: Record<string, {
    subject: string;
    chapter: string;
    wrongCount: number; // incorrect + unattempted (or just incorrect? Let's track incorrect)
  }> = {};

  // Timing counters
  let totalCorrectTime = 0;
  let totalIncorrectTime = 0;

  questions.forEach(q => {
    const isMcq = q.type !== 'integer';
    const ans = userAnswers[q.id];
    const timeSpent = questionDurations[q.id] || 0;
    totalTimeSpent += timeSpent;

    // Subject mapping
    if (!subjectSummary[q.subject]) {
      subjectSummary[q.subject] = { total: 0, attempted: 0, correct: 0, incorrect: 0, score: 0, timeSpent: 0 };
    }
    const subStats = subjectSummary[q.subject];
    subStats.total++;
    subStats.timeSpent += timeSpent;

    // Difficulty mapping
    const diffKey = `${q.subject}_${q.difficulty}`;
    if (!difficultySummary[diffKey]) {
      difficultySummary[diffKey] = { total: 0, attempted: 0, correct: 0, incorrect: 0, timeSpent: 0 };
    }
    const diffStats = difficultySummary[diffKey];
    diffStats.total++;
    diffStats.timeSpent += timeSpent;

    if (isMcq) mcqTotal++;
    else numTotal++;

    if (!ans) {
      totalUnattempted++;
    } else {
      const isCorrect = ans.trim() === q.correct_answer.trim();
      if (isCorrect) {
        totalCorrect++;
        totalCorrectTime += timeSpent;
        subStats.correct++;
        subStats.score += 4;
        diffStats.correct++;

        if (isMcq) {
          mcqAttempted++;
          mcqCorrect++;
        } else {
          numAttempted++;
          numCorrect++;
        }
      } else {
        totalIncorrect++;
        totalIncorrectTime += timeSpent;
        subStats.incorrect++;
        subStats.score -= 1;
        diffStats.incorrect++;

        if (isMcq) {
          mcqAttempted++;
          mcqIncorrect++;
        } else {
          numAttempted++;
          numIncorrect++;
        }

        // Track chapter mistake
        const chapKey = `${q.subject}_${q.chapter}`;
        if (!chapterMistakes[chapKey]) {
          chapterMistakes[chapKey] = { subject: q.subject, chapter: q.chapter, wrongCount: 0 };
        }
        chapterMistakes[chapKey].wrongCount++;
      }
      subStats.attempted++;
      diffStats.attempted++;
    }
  });

  // Calculate final score
  totalScore = totalCorrect * 4 - totalIncorrect;
  const maxScore = test.total_marks || questions.length * 4;
  const scorePercentage = Math.max(0, Math.min(100, Math.round((totalScore / maxScore) * 100)));
  const totalAttempted = totalCorrect + totalIncorrect;
  const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  // Type analytics
  const mcqAccuracy = mcqAttempted > 0 ? Math.round((mcqCorrect / mcqAttempted) * 100) : 0;
  const numAccuracy = numAttempted > 0 ? Math.round((numCorrect / numAttempted) * 100) : 0;
  
  let typeRecommendation = "";
  if (mcqAttempted > 0 && numAttempted > 0) {
    if (mcqAccuracy > numAccuracy + 5) {
      typeRecommendation = "Your accuracy in Multiple Choice Questions (MCQs) is higher. You should focus on double-checking your numeric entries in Numerical questions to avoid calculation errors.";
    } else if (numAccuracy > mcqAccuracy + 5) {
      typeRecommendation = "You performed exceptionally well in Numerical-type questions. MCQs are slightly weaker, possibly due to guessing. Be cautious of negative marking on single-correct options.";
    } else {
      typeRecommendation = "You maintain balanced accuracy across both MCQs and Numerical-type questions. Continue practicing both formats to refine your speed.";
    }
  } else if (mcqAttempted > 0) {
    typeRecommendation = "You attempted MCQs only. Try attempting some numerical questions as they do not have option cues and test core conceptual accuracy.";
  } else {
    typeRecommendation = "You attempted numerical questions only. Try attempting MCQs to evaluate your elimination skills.";
  }

  // Timing averages
  const avgCorrectTime = totalCorrect > 0 ? Math.round(totalCorrectTime / totalCorrect) : 0;
  const avgIncorrectTime = totalIncorrect > 0 ? Math.round(totalIncorrectTime / totalIncorrect) : 0;
  const avgTimePerQuestion = questions.length > 0 ? Math.round(totalTimeSpent / questions.length) : 0;

  // Time strategy dynamic feedback
  let timeStrategyMessage = "";
  if (totalTimeSpent < 300) {
    timeStrategyMessage = "You submitted the exam in under 5 minutes without substantial attempts. Treat mock test simulations seriously to accurately gauge your actual preparation levels.";
  } else if (avgTimePerQuestion < 45 && overallAccuracy < 55 && totalAttempted > 10) {
    timeStrategyMessage = "You solved questions very quickly but got a high percentage of them wrong. Rushing leads to simple calculation errors and silly mistakes. You could have spent more time analyzing each question to get them correct.";
  } else if (avgTimePerQuestion > 120 && totalUnattempted > questions.length * 0.4) {
    timeStrategyMessage = "You spent a lot of time on a few questions, leaving a large portion of the exam unattempted. Instead of getting stuck or spending excessive time on difficult questions, you should move on and solve easier ones to secure more marks.";
  } else if (avgIncorrectTime > avgCorrectTime * 1.5 && totalIncorrect > 5) {
    timeStrategyMessage = "You spent significantly more time on questions you ended up getting wrong than on those you got correct. This indicates you got 'stuck' on challenging problems. Learn to skip and mark for review to optimize your timing.";
  } else {
    timeStrategyMessage = "You maintain a balanced timing threshold and a steady pace. Keep practicing to maintain this control under exam pressure, and avoid rushing in the final 10 minutes.";
  }

  // Sum correct answers by difficulty for Pie Chart
  const easyCorrect = subjectsList.reduce((acc, sub) => acc + (difficultySummary[`${sub}_easy`]?.correct || 0), 0);
  const mediumCorrect = subjectsList.reduce((acc, sub) => acc + (difficultySummary[`${sub}_medium`]?.correct || 0), 0);
  const hardCorrect = subjectsList.reduce((acc, sub) => acc + (difficultySummary[`${sub}_hard`]?.correct || 0), 0);
  
  const totalCorrectDiff = easyCorrect + mediumCorrect + hardCorrect;
  const easyPercent = totalCorrectDiff > 0 ? (easyCorrect / totalCorrectDiff) * 100 : 0;
  const mediumPercent = totalCorrectDiff > 0 ? (mediumCorrect / totalCorrectDiff) * 100 : 0;
  const hardPercent = totalCorrectDiff > 0 ? (hardCorrect / totalCorrectDiff) * 100 : 0;

  // Circumference = 314.16
  const easyLength = (easyPercent / 100) * 314.16;
  const mediumLength = (mediumPercent / 100) * 314.16;
  const hardLength = (hardPercent / 100) * 314.16;

  // Chapter analytics (Cross-referencing database question stats for top weak chapters)
  const weakChaptersList = Object.values(chapterMistakes).map(mistake => {
    // Find the chapter repetition index in database
    const dbStat = chapterStats.find(
      s => s.subject.toLowerCase() === mistake.subject.toLowerCase() && 
           s.chapter.toLowerCase() === mistake.chapter.toLowerCase()
    );
    const repetitionWeight = dbStat ? dbStat.total : 0;
    return {
      ...mistake,
      repetitionWeight
    };
  });

  // Sort weak chapters: prioritize highly repeated chapters in database, then by user mistake count
  const topWeakChapters = weakChaptersList
    .sort((a, b) => {
      // If one chapter is highly repeated in the DB, prioritize showing it
      if (b.repetitionWeight !== a.repetitionWeight) {
        return b.repetitionWeight - a.repetitionWeight;
      }
      return b.wrongCount - a.wrongCount;
    })
    .slice(0, 3);

  // Formatting helper
  const formatSeconds = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24">
      {/* ── Header Area ── */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push('/tests')}
            className="flex items-center gap-2 text-xs font-bold font-mono text-slate-400 hover:text-indigo-400 transition-colors uppercase tracking-widest"
          >
            <ArrowLeft size={16} /> Dashboard
          </button>
          
          <div className="text-center hidden sm:block">
            <h2 className="text-sm font-black tracking-wider text-slate-200 uppercase truncate max-w-sm">
              {test.title}
            </h2>
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">
              Attempt Analysis
            </span>
          </div>

          <button
            onClick={() => router.push(`/exam/${testId}/solution?attemptId=${attempt.id}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider transition-all font-mono shadow-md shadow-indigo-950/40"
            style={{ backgroundColor: '#4f46e5' }}
          >
            View Solutions <ChevronRight size={14} />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 mt-8 space-y-8">
        {/* ── Banner info ── */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950/30 border border-slate-800/80 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none" />
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono">
                {test.exam_type.toUpperCase()}
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono">
                COMPLETED
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight mb-2">
              {test.title}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              Completed on {new Date(attempt.updated_at).toLocaleDateString(undefined, { dateStyle: 'long' })} at {new Date(attempt.updated_at).toLocaleTimeString(undefined, { timeStyle: 'short' })}. Review your conceptual gaps, subject speed indexes, and question accuracy parameters.
            </p>
          </div>
          
          <div className="flex flex-row md:flex-col gap-4 w-full md:w-auto flex-shrink-0 pt-4 md:pt-0 border-t border-slate-850 md:border-t-0">
            <div className="flex-1 md:flex-none bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl px-5 py-3 text-center md:text-left min-w-[130px]">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Time Used</div>
              <div className="text-lg font-black text-slate-200">{formatSeconds(totalTimeSpent)}</div>
            </div>
            <div className="flex-1 md:flex-none bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl px-5 py-3 text-center md:text-left min-w-[130px]">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Total Questions</div>
              <div className="text-lg font-black text-slate-200">{questions.length}</div>
            </div>
          </div>
        </div>

        {/* ── Main Dashboard Matrix ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Overall Score Ring */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative group hover:border-slate-800/80 transition-colors">
            <div className="flex items-center gap-2 mb-6">
              <Award className="text-indigo-400" size={18} />
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">Score Ring</h3>
            </div>
            
            <div className="flex flex-col items-center justify-center my-4 relative">
              {/* SVG Radial Score Ring */}
              <svg className="w-40 h-40 transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="68"
                  className="stroke-slate-800"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="68"
                  className="stroke-indigo-500 transition-all duration-1000 ease-out"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 68}
                  strokeDashoffset={2 * Math.PI * 68 * (1 - scorePercentage / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-slate-100 tracking-tight">{totalScore}</span>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">/ {maxScore} Marks</span>
              </div>
            </div>

            <div className="space-y-3 mt-6 border-t border-slate-900 pt-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 flex items-center gap-1.5"><CheckCircle2 className="text-emerald-500" size={14} /> Correct</span>
                <span className="font-bold text-emerald-400">{totalCorrect}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 flex items-center gap-1.5"><XCircle className="text-red-500" size={14} /> Incorrect</span>
                <span className="font-bold text-red-400">{totalIncorrect}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 flex items-center gap-1.5"><HelpCircle className="text-slate-500" size={14} /> Not Visited</span>
                <span className="font-bold text-slate-400">{totalUnattempted}</span>
              </div>
            </div>
          </div>

          {/* Column 2: Accuracy & Concept Type Evaluation */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-3xl p-6 flex flex-col justify-between shadow-xl hover:border-slate-800/80 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-emerald-400" size={18} />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">Accuracy &amp; Question Types</h3>
                </div>
                <div className="text-xs font-bold font-mono text-emerald-400">{overallAccuracy}% Accuracy</div>
              </div>

              {/* Accuracy bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${overallAccuracy}%` }}
                />
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-medium">Multiple Choice Questions (MCQ)</span>
                    <span className="font-bold text-indigo-400">{mcqAccuracy}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${mcqAccuracy}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Attempted: {mcqAttempted}/{mcqTotal}</span>
                    <span>Correct: {mcqCorrect}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-medium">Numerical Questions (Integer)</span>
                    <span className="font-bold text-indigo-400">{numAccuracy}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${numAccuracy}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Attempted: {numAttempted}/{numTotal}</span>
                    <span>Correct: {numCorrect}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-900 pt-4 text-[11px] text-slate-400 leading-relaxed bg-slate-950/20 p-3 rounded-2xl border border-slate-900/50">
              <span className="font-bold text-indigo-400 uppercase tracking-widest block mb-1 font-mono text-[9px]">Evaluation:</span>
              {typeRecommendation}
            </div>
          </div>

          {/* Column 3: Speed & Time Management */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-3xl p-6 flex flex-col justify-between shadow-xl hover:border-slate-800/80 transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Clock className="text-amber-400" size={18} />
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">Speed Analytics</h3>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-850 flex items-center justify-center border border-slate-850">
                    <CheckCircle2 className="text-emerald-400" size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Avg Time on Correct Questions</div>
                    <div className="text-lg font-black text-slate-200">{formatSeconds(avgCorrectTime)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-850 flex items-center justify-center border border-slate-850">
                    <XCircle className="text-red-400" size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Avg Time on Incorrect Questions</div>
                    <div className="text-lg font-black text-slate-200">{formatSeconds(avgIncorrectTime)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-850 flex items-center justify-center border border-slate-850">
                    <Zap className="text-amber-400" size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">General Pace per Question</div>
                    <div className="text-lg font-black text-slate-200">{formatSeconds(avgTimePerQuestion)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-900 pt-4 text-[11px] text-slate-400 leading-relaxed bg-slate-950/20 p-3 rounded-2xl border border-slate-900/50">
              <span className="font-bold text-amber-400 uppercase tracking-widest block mb-1 font-mono text-[9px]">Time Strategy:</span>
              {timeStrategyMessage}
            </div>
          </div>
        </div>

        {/* ── Subject Accuracy Grid ── */}
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-200 mb-4 flex items-center gap-2">
            <BookOpen className="text-indigo-400" size={20} /> Subject-wise Performance Parameters
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subjectsList.map((sub) => {
              const summary = subjectSummary[sub];
              const accuracy = summary.attempted > 0 ? Math.round((summary.correct / summary.attempted) * 100) : 0;
              const subAvgTime = summary.total > 0 ? Math.round(summary.timeSpent / summary.total) : 0;
              
              // Colors based on accuracy
              const progressColor = accuracy >= 80 ? 'stroke-emerald-500' : accuracy >= 50 ? 'stroke-indigo-500' : 'stroke-rose-500';
              const textAccentColor = accuracy >= 80 ? 'text-emerald-400' : accuracy >= 50 ? 'text-indigo-400' : 'text-rose-400';
              
              return (
                <div key={sub} className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-3xl p-6 shadow-xl hover:border-slate-800/80 transition-all flex justify-between items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-md font-bold text-slate-100 mb-1.5 truncate uppercase tracking-wider">{sub}</h3>
                    <div className="space-y-1 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Score:</span>
                        <span className="font-bold text-slate-200">{summary.score}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Accuracy:</span>
                        <span className={`font-bold ${textAccentColor}`}>{accuracy}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pace:</span>
                        <span className="font-semibold text-slate-200">{formatSeconds(subAvgTime)} / q</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        className="stroke-slate-800"
                        strokeWidth="6"
                        fill="transparent"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        className={`${progressColor} transition-all duration-700`}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 34}
                        strokeDashoffset={2 * Math.PI * 34 * (1 - accuracy / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className={`text-sm font-black ${textAccentColor}`}>{summary.correct}</span>
                      <span className="text-[8px] font-mono text-slate-500 uppercase">/ {summary.attempted}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Difficulty Table ── */}
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-200 mb-4 flex items-center gap-2">
            <BarChart3 className="text-indigo-400" size={20} /> Unified Difficulty Analysis Table
          </h2>
          
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-900/80 text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                    <th className="py-4 px-6">Subject</th>
                    <th className="py-4 px-4">Difficulty</th>
                    <th className="py-4 px-4 text-center">Total Qs</th>
                    <th className="py-4 px-4 text-center">Attempted</th>
                    <th className="py-4 px-4 text-center">Correct</th>
                    <th className="py-4 px-4 text-center">Accuracy</th>
                    <th className="py-4 px-6 text-right">Avg Time Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {subjectsList.flatMap((sub) => {
                    let subjectRendered = false;
                    return difficulties.map((diff) => {
                      const key = `${sub}_${diff}`;
                      const stats = difficultySummary[key] || { total: 0, attempted: 0, correct: 0, incorrect: 0, timeSpent: 0 };
                      
                      if (stats.total === 0) return null;
                      
                      const showSubject = !subjectRendered;
                      if (showSubject) {
                        subjectRendered = true;
                      }
                      
                      const accuracy = stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0;
                      const avgTime = stats.total > 0 ? Math.round(stats.timeSpent / stats.total) : 0;

                      let difficultyBadgeColor = "text-slate-400 bg-slate-950 border-slate-800";
                      if (diff === 'easy') difficultyBadgeColor = "text-emerald-400 bg-emerald-500/5 border-emerald-500/10";
                      else if (diff === 'medium') difficultyBadgeColor = "text-amber-400 bg-amber-500/5 border-amber-500/10";
                      else if (diff === 'hard') difficultyBadgeColor = "text-rose-400 bg-rose-500/5 border-rose-500/10";

                      return (
                        <tr key={key} className="hover:bg-slate-900/20 text-slate-300 transition-colors">
                          <td className="py-3.5 px-6 font-bold text-slate-100">{showSubject ? sub : ''}</td>
                          <td className="py-3.5 px-4 uppercase font-mono">
                            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${difficultyBadgeColor}`}>
                              {diff}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-400">{stats.total}</td>
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-400">{stats.attempted}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-emerald-400">{stats.correct}</td>
                          <td className="py-3.5 px-4 text-center">
                            {stats.attempted > 0 ? (
                              <span className={`font-bold ${accuracy >= 70 ? 'text-emerald-400' : accuracy >= 40 ? 'text-indigo-400' : 'text-rose-500'}`}>
                                {accuracy}%
                              </span>
                            ) : (
                              <span className="text-slate-600 font-mono">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-right font-mono text-slate-200">{formatSeconds(avgTime)}</td>
                        </tr>
                      );
                    });
                  }).filter(Boolean)}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Correct Questions Difficulty Distribution Pie Chart ── */}
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp className="text-indigo-400" size={20} /> Correct Questions Difficulty Distribution
          </h2>
          
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-3xl p-6 shadow-xl hover:border-slate-800/80 transition-all">
            <div className="flex flex-col md:flex-row items-center justify-around gap-8">
              {/* Pie/Donut Chart SVG */}
              <div className="relative w-48 h-48 flex items-center justify-center flex-shrink-0">
                {totalCorrectDiff > 0 ? (
                  <svg className="w-44 h-44" viewBox="0 0 120 120">
                    {/* Background Circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      className="stroke-slate-800"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    {/* Easy Segment (Green) */}
                    {easyLength > 0 && (
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        className="stroke-emerald-500"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={`${easyLength} 314.16`}
                        strokeDashoffset="0"
                        transform="rotate(-90 60 60)"
                      />
                    )}
                    {/* Medium Segment (Yellow) */}
                    {mediumLength > 0 && (
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        className="stroke-amber-400"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={`${mediumLength} 314.16`}
                        strokeDashoffset={-easyLength}
                        transform="rotate(-90 60 60)"
                      />
                    )}
                    {/* Hard Segment (Red) */}
                    {hardLength > 0 && (
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        className="stroke-rose-500"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={`${hardLength} 314.16`}
                        strokeDashoffset={-(easyLength + mediumLength)}
                        transform="rotate(-90 60 60)"
                      />
                    )}
                  </svg>
                ) : (
                  <svg className="w-44 h-44" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      className="stroke-slate-800"
                      strokeWidth="10"
                      fill="transparent"
                    />
                  </svg>
                )}
                
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-100">{totalCorrectDiff}</span>
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Correct Qs</span>
                </div>
              </div>

              {/* Legend & Stats Details */}
              <div className="space-y-4 max-w-sm w-full">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Difficulty Tier</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest text-right">Correct Count / Share</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-200">Easy Questions</span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold text-emerald-400">{easyCorrect}</span>
                    <span className="text-slate-500 font-mono text-[10px] ml-1.5">({Math.round(easyPercent)}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-200">Medium Questions</span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold text-amber-400">{mediumCorrect}</span>
                    <span className="text-slate-500 font-mono text-[10px] ml-1.5">({Math.round(mediumPercent)}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-200">Hard Questions</span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold text-rose-400">{hardCorrect}</span>
                    <span className="text-slate-500 font-mono text-[10px] ml-1.5">({Math.round(hardPercent)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Weak Chapters ── */}
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-200 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-rose-500" size={20} /> Weak &amp; Highly Repeated Chapter Analysis
          </h2>
          
          {topWeakChapters.length === 0 ? (
            <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-8 text-center text-slate-400 font-medium shadow-xl">
              🏆 Outstanding performance! You made zero incorrect answers. Continue mock test simulations to cement this standard.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topWeakChapters.map((mistake, index) => {
                return (
                  <div 
                    key={`${mistake.subject}_${mistake.chapter}`} 
                    className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-3xl p-6 shadow-xl relative hover:border-slate-800/80 transition-colors flex flex-col justify-between"
                  >
                    <div className="absolute top-4 right-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded-md text-[8.5px] font-bold uppercase tracking-wider font-mono">
                      RANK #{index + 1}
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block mb-1 font-bold">
                        {mistake.subject}
                      </span>
                      <h3 className="text-base font-black text-slate-100 tracking-tight leading-snug mb-3">
                        {mistake.chapter}
                      </h3>
                      
                      <div className="space-y-2 text-xs text-slate-400">
                        <div className="flex justify-between">
                          <span>Wrong Questions:</span>
                          <span className="font-bold text-rose-400">{mistake.wrongCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Most Repeated:</span>
                          <span className="font-bold text-indigo-400">{mistake.repetitionWeight} questions</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-900/50 text-[10.5px] text-slate-400 leading-relaxed">
                      This is a <strong>highly repeated</strong> chapter in recent exams. Prioritize studying its core concepts and resolving errors before attempting the next simulator.
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
