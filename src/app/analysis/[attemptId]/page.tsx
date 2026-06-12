import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { calculateAnalytics } from './analyticsHelper';
import AnalysisDashboard from './AnalysisDashboard';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function AnalysisPage({ params }: PageProps) {
  const { attemptId } = await params;
  const supabase = await createClient();

  try {
    // 1. Fetch live attempt details
    const { data: attempt, error: attemptErr } = await supabase
      .from('mock_test_live_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptErr || !attempt) {
      console.error('Attempt fetch error:', attemptErr);
      return renderError('Test attempt not found.', 'Please verify the attempt link or check if it was completed.');
    }

    if (!attempt.completed) {
      return renderError('Attempt not completed.', 'This test attempt is still in progress and cannot be analyzed.');
    }

    // 2. Fetch mock test details
    const { data: test, error: testErr } = await supabase
      .from('mock_tests')
      .select('*')
      .eq('id', attempt.test_id)
      .single();

    if (testErr || !test) {
      console.error('Mock test fetch error:', testErr);
      return renderError('Associated mock test not found.', 'The test data for this attempt is missing.');
    }

    // 3. Fetch questions
    let qQuery = supabase.from('questions').select('id, subject, chapter, topic, type, difficulty, correct_answer, marks');
    if (test.is_pyp && test.year && test.shift) {
      qQuery = qQuery.eq('year', test.year).eq('shift', test.shift);
    } else {
      qQuery = qQuery.eq('booklet_id', test.id);
    }

    const { data: qData, error: qErr } = await qQuery;
    if (qErr || !qData || qData.length === 0) {
      console.error('Questions fetch error:', qErr);
      return renderError('Failed to fetch test questions.', 'We could not load the question papers for this attempt.');
    }

    // 4. Calculate stats on the server
    const stats = calculateAnalytics(attempt, test, qData);

    // 5. Render client component dashboard
    return (
      <AnalysisDashboard
        stats={stats}
        attemptId={attemptId}
        testId={test.id}
        testTitle={test.title}
        examType={test.exam_type}
        attemptDate={attempt.updated_at}
      />
    );

  } catch (err: any) {
    console.error('Unexpected error loading analysis:', err);
    return renderError('An unexpected error occurred.', err.message || 'Please try again later.');
  }
}

function renderError(title: string, message: string) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 text-center shadow-2xl">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm text-[var(--text2)] mb-6">{message}</p>
        <Link
          href="/tests"
          className="w-full py-3 rounded-xl bg-[var(--bg3)] hover:bg-[var(--accent)] hover:text-black font-bold transition-all text-xs uppercase tracking-widest font-mono border border-[var(--border)] flex items-center justify-center gap-2"
        >
          <ArrowLeft size={14} /> Back to Test Center
        </Link>
      </div>
    </div>
  );
}
