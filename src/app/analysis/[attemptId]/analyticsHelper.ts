export interface Question {
  id: string;
  subject: string;
  chapter: string;
  topic: string;
  type: string; // 'mcq' | 'integer'
  difficulty: string; // 'easy' | 'medium' | 'hard'
  correct_answer: string;
  marks?: number;
}

export interface LiveAttempt {
  id: string;
  test_id: string;
  user_id: string;
  answers: Record<string, string | null>;
  statuses: Record<string, string>;
  time_left: number;
  completed: boolean;
  question_durations: Record<string, number>;
  updated_at: string;
}

export interface MockTest {
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

export interface OverviewStats {
  totalScore: number;
  maxScore: number;
  questionsAttempted: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  questionsUnattempted: number;
  accuracy: number;
  timeTaken: number;
  positiveMarks: number;
  negativeMarks: number;
}

export interface SubjectStats {
  subjectName: string;
  score: number;
  maxMarks: number;
  totalQuestions: number;
  questionsAttempted: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  questionsUnattempted: number;
  accuracy: number;
  timeSpent: number;
  avgTimePerQuestion: number;
}

export interface ChapterStats {
  chapterName: string;
  subject: string;
  questionsSeen: number;
  questionsAttempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  marksGained: number;
  marksLost: number;
  avgTime: number;
  status: 'strong' | 'average' | 'weak';
}

export interface DifficultyBucket {
  name: 'Easy' | 'Moderate' | 'Tough';
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  marksGained: number;
  marksLost: number;
  timeSpent: number;
}

export interface AttemptCategorization {
  perfect: number;
  overtimeCorrect: number;
  wasted: number;
  overtimeMistake: number;
  confused: number;
  normalMistake: number;
  normalSkip: number;
}

export interface SubjectAttemptCategories {
  subject: string;
  categories: AttemptCategorization;
}

export interface TimeSpentAccuracy {
  bucketName: string;
  attempted: number;
  correct: number;
  accuracy: number;
}

export interface QuestionTimePoint {
  questionNumber: number;
  timeSpent: number;
  difficulty: string;
  subject: string;
  correct: boolean;
}

export interface QuestionMarksPoint {
  questionNumber: number;
  timeSpent: number;
  marks: number;
}

export interface TimeAnalysisStats {
  subjectTimeDistribution: { name: string; value: number }[];
  avgTimePerSubject: { name: string; value: number }[];
  avgTimePerQuestion: number;
  fastestSolved: { questionNumber: number; timeTaken: number; subject: string; chapter: string }[];
  slowestSolved: { questionNumber: number; timeTaken: number; subject: string; chapter: string }[];
  questionTimeDistribution: QuestionTimePoint[];
  timeSpentVsMarks: QuestionMarksPoint[];
  timeSpentVsAccuracy: TimeSpentAccuracy[];
}

export interface QuestionJourneyPoint {
  questionNumber: number;
  id: string;
  status: 'correct' | 'incorrect' | 'skipped' | 'marked';
  subject: string;
}

export interface QuestionRow {
  questionNumber: number;
  id: string;
  subject: string;
  chapter: string;
  difficulty: 'Easy' | 'Moderate' | 'Tough';
  timeTaken: number;
  attemptStatus: 'Correct' | 'Incorrect' | 'Skipped';
  marksAwarded: number;
  negativeMarks: number;
  studentResponse: string;
  correctAnswer: string;
}

export interface ScoreProgressionPoint {
  questionIndex: number;
  questionNumber: number;
  physicsScore: number;
  chemistryScore: number;
  mathScore: number;
  totalScore: number;
}

export interface PreCalculatedAnalytics {
  overview: OverviewStats;
  subjects: SubjectStats[];
  chapters: ChapterStats[];
  difficulties: DifficultyBucket[];
  attempts: {
    overall: AttemptCategorization;
    subjects: SubjectAttemptCategories[];
  };
  timeAnalysis: TimeAnalysisStats;
  questionJourney: QuestionJourneyPoint[];
  questionByQuestion: QuestionRow[];
  subjectMovement: ScoreProgressionPoint[];
}

export function calculateAnalytics(
  attempt: LiveAttempt,
  test: MockTest,
  questions: Question[]
): PreCalculatedAnalytics {
  const userAnswers = attempt.answers || {};
  const questionDurations = attempt.question_durations || {};
  const statuses = attempt.statuses || {};

  // Sort questions: We want a deterministic order (Physics, then Chemistry, then Math, or by their natural ID order if no order exists)
  // Let's sort them by subject, then by ID to give a structured flow
  const sortedQuestions = [...questions].sort((a, b) => {
    const subA = (a.subject || '').toLowerCase();
    const subB = (b.subject || '').toLowerCase();
    if (subA !== subB) return subA.localeCompare(subB);
    return a.id.localeCompare(b.id);
  });

  // Recommended times: Easy = 90s, Moderate/Medium = 120s, Tough/Hard = 180s
  const getRecommendedTime = (diff: string) => {
    const d = (diff || '').toLowerCase();
    if (d === 'easy') return 90;
    if (d === 'hard') return 180;
    return 120; // medium/moderate
  };

  const mapDifficulty = (diff: string): 'Easy' | 'Moderate' | 'Tough' => {
    const d = (diff || '').toLowerCase();
    if (d === 'easy') return 'Easy';
    if (d === 'hard') return 'Tough';
    return 'Moderate'; // medium
  };

  // 1. Overview variables
  let totalScore = 0;
  let questionsAttempted = 0;
  let questionsCorrect = 0;
  let questionsIncorrect = 0;
  let questionsUnattempted = 0;
  let positiveMarks = 0;
  let negativeMarks = 0;
  let timeTaken = 0;

  // Initialize helper maps
  const subjectsMap: Record<string, {
    score: number;
    total: number;
    attempted: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    timeSpent: number;
  }> = {};

  const chaptersMap: Record<string, {
    subject: string;
    total: number;
    attempted: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    timeSpent: number;
  }> = {};

  const difficultyMap: Record<'Easy' | 'Moderate' | 'Tough', {
    correct: number;
    wrong: number;
    skipped: number;
    marksGained: number;
    marksLost: number;
    timeSpent: number;
  }> = {
    Easy: { correct: 0, wrong: 0, skipped: 0, marksGained: 0, marksLost: 0, timeSpent: 0 },
    Moderate: { correct: 0, wrong: 0, skipped: 0, marksGained: 0, marksLost: 0, timeSpent: 0 },
    Tough: { correct: 0, wrong: 0, skipped: 0, marksGained: 0, marksLost: 0, timeSpent: 0 }
  };

  const attemptCategorizationOverall: AttemptCategorization = {
    perfect: 0,
    overtimeCorrect: 0,
    wasted: 0,
    overtimeMistake: 0,
    confused: 0,
    normalMistake: 0,
    normalSkip: 0
  };

  const attemptCategorizationSubjects: Record<string, AttemptCategorization> = {};

  const questionJourney: QuestionJourneyPoint[] = [];
  const questionByQuestion: QuestionRow[] = [];

  // Fastest/slowest arrays
  const solvedList: { questionNumber: number; timeTaken: number; subject: string; chapter: string; correct: boolean }[] = [];

  // Process each question
  sortedQuestions.forEach((q, idx) => {
    const qNum = idx + 1;
    const ans = userAnswers[q.id];
    const duration = questionDurations[q.id] || 0;
    const qStatus = statuses[q.id] || 'not-visited';
    timeTaken += duration;

    const subject = q.subject || 'general';
    const chapter = q.chapter || 'General';
    const diff = mapDifficulty(q.difficulty);
    const recommended = getRecommendedTime(q.difficulty);
    const qMarks = q.marks || 4;

    // Initialize subject map if empty
    if (!subjectsMap[subject]) {
      subjectsMap[subject] = { score: 0, total: 0, attempted: 0, correct: 0, incorrect: 0, unattempted: 0, timeSpent: 0 };
    }
    if (!attemptCategorizationSubjects[subject]) {
      attemptCategorizationSubjects[subject] = { perfect: 0, overtimeCorrect: 0, wasted: 0, overtimeMistake: 0, confused: 0, normalMistake: 0, normalSkip: 0 };
    }

    // Initialize chapter map if empty
    const chapKey = `${subject}_${chapter}`;
    if (!chaptersMap[chapKey]) {
      chaptersMap[chapKey] = { subject, total: 0, attempted: 0, correct: 0, incorrect: 0, unattempted: 0, timeSpent: 0 };
    }

    subjectsMap[subject].total++;
    subjectsMap[subject].timeSpent += duration;
    chaptersMap[chapKey].total++;
    chaptersMap[chapKey].timeSpent += duration;

    let isCorrect = false;
    let isAttempted = false;
    let marksAwarded = 0;
    let negMarks = 0;
    let finalStatus: 'correct' | 'incorrect' | 'skipped' | 'marked' = 'skipped';

    if (ans !== undefined && ans !== null && ans.trim() !== '') {
      isAttempted = true;
      isCorrect = ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

      if (isCorrect) {
        marksAwarded = qMarks;
        totalScore += qMarks;
        positiveMarks += qMarks;
        questionsCorrect++;
        finalStatus = 'correct';

        subjectsMap[subject].correct++;
        subjectsMap[subject].score += qMarks;
        chaptersMap[chapKey].correct++;
        difficultyMap[diff].correct++;
        difficultyMap[diff].marksGained += qMarks;

        // Categorize Attempt: Correct
        if (duration <= recommended) {
          attemptCategorizationOverall.perfect++;
          attemptCategorizationSubjects[subject].perfect++;
        } else {
          attemptCategorizationOverall.overtimeCorrect++;
          attemptCategorizationSubjects[subject].overtimeCorrect++;
        }
      } else {
        // Negative mark: MCQ has negative, Integer might also have negative.
        negMarks = -1;
        totalScore += negMarks;
        negativeMarks += 1; // absolute count/sum for display
        questionsIncorrect++;
        finalStatus = 'incorrect';

        subjectsMap[subject].incorrect++;
        subjectsMap[subject].score += negMarks;
        chaptersMap[chapKey].incorrect++;
        difficultyMap[diff].wrong++;
        difficultyMap[diff].marksLost += 1;

        // Categorize Attempt: Incorrect
        if (duration <= 30) {
          attemptCategorizationOverall.wasted++;
          attemptCategorizationSubjects[subject].wasted++;
        } else if (duration > recommended) {
          attemptCategorizationOverall.overtimeMistake++;
          attemptCategorizationSubjects[subject].overtimeMistake++;
        } else {
          attemptCategorizationOverall.normalMistake++;
          attemptCategorizationSubjects[subject].normalMistake++;
        }
      }
      subjectsMap[subject].attempted++;
      chaptersMap[chapKey].attempted++;
      questionsAttempted++;
    } else {
      // Unattempted
      questionsUnattempted++;
      subjectsMap[subject].unattempted++;
      chaptersMap[chapKey].unattempted++;
      difficultyMap[diff].skipped++;
      
      // Determine if marked
      if (qStatus === 'marked' || qStatus === 'answered-marked') {
        finalStatus = 'marked';
      } else {
        finalStatus = 'skipped';
      }

      // Categorize Attempt: Unattempted
      if (duration > 45) {
        attemptCategorizationOverall.confused++;
        attemptCategorizationSubjects[subject].confused++;
      } else {
        attemptCategorizationOverall.normalSkip++;
        attemptCategorizationSubjects[subject].normalSkip++;
      }
    }

    difficultyMap[diff].timeSpent += duration;

    // Add to journey
    questionJourney.push({
      questionNumber: qNum,
      id: q.id,
      status: finalStatus,
      subject
    });

    // Add to question-by-question row
    questionByQuestion.push({
      questionNumber: qNum,
      id: q.id,
      subject,
      chapter,
      difficulty: diff,
      timeTaken: duration,
      attemptStatus: isAttempted ? (isCorrect ? 'Correct' : 'Incorrect') : 'Skipped',
      marksAwarded,
      negativeMarks: negMarks,
      studentResponse: ans || 'Unanswered',
      correctAnswer: q.correct_answer
    });

    solvedList.push({
      questionNumber: qNum,
      timeTaken: duration,
      subject,
      chapter,
      correct: isCorrect
    });
  });

  // 2. Format Subject Stats
  const subjectsStats: SubjectStats[] = Object.keys(subjectsMap).map(subName => {
    const sm = subjectsMap[subName];
    const attempted = sm.attempted;
    const correct = sm.correct;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const avgTime = sm.total > 0 ? Math.round(sm.timeSpent / sm.total) : 0;
    return {
      subjectName: subName,
      score: sm.score,
      maxMarks: sm.total * 4,
      totalQuestions: sm.total,
      questionsAttempted: sm.attempted,
      questionsCorrect: sm.correct,
      questionsIncorrect: sm.incorrect,
      questionsUnattempted: sm.unattempted,
      accuracy,
      timeSpent: sm.timeSpent,
      avgTimePerQuestion: avgTime
    };
  });

  // 3. Format Chapter Stats
  const chaptersStats: ChapterStats[] = Object.keys(chaptersMap).map(chapKey => {
    const cm = chaptersMap[chapKey];
    // chapKey format is subject_chapter
    const index = chapKey.indexOf('_');
    const chapName = chapKey.substring(index + 1);
    const attempted = cm.attempted;
    const correct = cm.correct;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const avgTime = cm.total > 0 ? Math.round(cm.timeSpent / cm.total) : 0;
    
    // Status color coding: Strong (>=80%), Average (50-79%), Weak (<50%)
    let status: 'strong' | 'average' | 'weak' = 'weak';
    if (attempted > 0) {
      if (accuracy >= 80) status = 'strong';
      else if (accuracy >= 50) status = 'average';
    } else {
      // If skipped entirely, it's considered weak preparation area
      status = 'weak';
    }

    return {
      chapterName: chapName,
      subject: cm.subject,
      questionsSeen: cm.total,
      questionsAttempted: cm.attempted,
      correct: cm.correct,
      wrong: cm.incorrect,
      skipped: cm.unattempted,
      accuracy,
      marksGained: cm.correct * 4,
      marksLost: cm.incorrect * 1,
      avgTime,
      status
    };
  });

  // 4. Format Difficulty Stats
  const difficultiesStats: DifficultyBucket[] = (['Easy', 'Moderate', 'Tough'] as const).map(name => {
    const dm = difficultyMap[name];
    const total = dm.correct + dm.wrong + dm.skipped;
    const attempted = dm.correct + dm.wrong;
    const accuracy = attempted > 0 ? Math.round((dm.correct / attempted) * 100) : 0;
    return {
      name,
      correct: dm.correct,
      wrong: dm.wrong,
      skipped: dm.skipped,
      accuracy,
      marksGained: dm.marksGained,
      marksLost: dm.marksLost,
      timeSpent: dm.timeSpent
    };
  });

  // 5. Subject Attempt Categories
  const subjectAttemptCategories: SubjectAttemptCategories[] = Object.keys(attemptCategorizationSubjects).map(sub => {
    return {
      subject: sub,
      categories: attemptCategorizationSubjects[sub]
    };
  });

  // 6. Time Analysis Stats
  const subjectTimeDistribution = Object.keys(subjectsMap).map(sub => {
    return { name: sub, value: subjectsMap[sub].timeSpent };
  });

  const avgTimePerSubject = Object.keys(subjectsMap).map(sub => {
    return { name: sub, value: subjectsMap[sub].total > 0 ? Math.round(subjectsMap[sub].timeSpent / subjectsMap[sub].total) : 0 };
  });

  const avgTimePerQuestion = questions.length > 0 ? Math.round(timeTaken / questions.length) : 0;

  // Fastest correct questions
  const fastestSolved = [...solvedList]
    .filter(s => s.correct)
    .sort((a, b) => a.timeTaken - b.timeTaken)
    .slice(0, 5)
    .map(s => ({ questionNumber: s.questionNumber, timeTaken: s.timeTaken, subject: s.subject, chapter: s.chapter }));

  // Slowest attempted questions
  const slowestSolved = [...solvedList]
    .filter(s => s.timeTaken > 0)
    .sort((a, b) => b.timeTaken - a.timeTaken)
    .slice(0, 5)
    .map(s => ({ questionNumber: s.questionNumber, timeTaken: s.timeTaken, subject: s.subject, chapter: s.chapter }));

  // Question Time Distribution points
  const questionTimeDistribution = sortedQuestions.map((q, idx) => {
    return {
      questionNumber: idx + 1,
      timeSpent: questionDurations[q.id] || 0,
      difficulty: mapDifficulty(q.difficulty),
      subject: q.subject,
      correct: userAnswers[q.id] !== undefined && userAnswers[q.id] !== null && userAnswers[q.id]?.trim() !== '' 
        ? userAnswers[q.id]?.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
        : false
    };
  });

  // Time Spent vs Marks points
  const timeSpentVsMarks = sortedQuestions.map((q, idx) => {
    const ans = userAnswers[q.id];
    let marks = 0;
    if (ans !== undefined && ans !== null && ans.trim() !== '') {
      const isCorrect = ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      marks = isCorrect ? (q.marks || 4) : -1;
    }
    return {
      questionNumber: idx + 1,
      timeSpent: questionDurations[q.id] || 0,
      marks
    };
  });

  // Time Spent vs Accuracy
  // Buckets: 0-30s, 31-60s, 61-120s, 121-180s, >180s
  const timeBuckets = [
    { name: '0-30s', min: 0, max: 30, attempted: 0, correct: 0 },
    { name: '31-60s', min: 31, max: 60, attempted: 0, correct: 0 },
    { name: '61-120s', min: 61, max: 120, attempted: 0, correct: 0 },
    { name: '121-180s', min: 121, max: 180, attempted: 0, correct: 0 },
    { name: '>180s', min: 181, max: 99999, attempted: 0, correct: 0 }
  ];

  sortedQuestions.forEach(q => {
    const duration = questionDurations[q.id] || 0;
    const ans = userAnswers[q.id];
    if (ans !== undefined && ans !== null && ans.trim() !== '') {
      const isCorrect = ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      const bucket = timeBuckets.find(b => duration >= b.min && duration <= b.max);
      if (bucket) {
        bucket.attempted++;
        if (isCorrect) bucket.correct++;
      }
    }
  });

  const timeSpentVsAccuracy = timeBuckets.map(b => ({
    bucketName: b.name,
    attempted: b.attempted,
    correct: b.correct,
    accuracy: b.attempted > 0 ? Math.round((b.correct / b.attempted) * 100) : 0
  }));

  const timeAnalysis: TimeAnalysisStats = {
    subjectTimeDistribution,
    avgTimePerSubject,
    avgTimePerQuestion,
    fastestSolved,
    slowestSolved,
    questionTimeDistribution,
    timeSpentVsMarks,
    timeSpentVsAccuracy
  };

  // 9. Subject Movement
  const subjectMovement: ScoreProgressionPoint[] = [];
  const subjectScores: Record<string, number> = {};
  
  // Track running score progression question by question
  sortedQuestions.forEach((q, idx) => {
    const ans = userAnswers[q.id];
    const subject = q.subject || 'general';
    const qMarks = q.marks || 4;

    if (!subjectScores[subject]) {
      subjectScores[subject] = 0;
    }

    if (ans !== undefined && ans !== null && ans.trim() !== '') {
      const isCorrect = ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      if (isCorrect) {
        subjectScores[subject] += qMarks;
      } else {
        subjectScores[subject] -= 1;
      }
    }

    // Capture point
    subjectMovement.push({
      questionIndex: idx,
      questionNumber: idx + 1,
      physicsScore: subjectScores['physics'] || 0,
      chemistryScore: subjectScores['chemistry'] || 0,
      mathScore: subjectScores['mathematics'] || subjectScores['math'] || 0,
      totalScore: Object.values(subjectScores).reduce((a, b) => a + b, 0)
    });
  });

  // Overview calculation
  const overallAttempted = questionsCorrect + questionsIncorrect;
  const overallAccuracy = overallAttempted > 0 ? Math.round((questionsCorrect / overallAttempted) * 100) : 0;

  const overview: OverviewStats = {
    totalScore,
    maxScore: test.total_marks || questions.length * 4,
    questionsAttempted,
    questionsCorrect,
    questionsIncorrect,
    questionsUnattempted,
    accuracy: overallAccuracy,
    timeTaken,
    positiveMarks,
    negativeMarks
  };

  return {
    overview,
    subjects: subjectsStats,
    chapters: chaptersStats,
    difficulties: difficultiesStats,
    attempts: {
      overall: attemptCategorizationOverall,
      subjects: subjectAttemptCategories
    },
    timeAnalysis,
    questionJourney,
    questionByQuestion,
    subjectMovement
  };
}
