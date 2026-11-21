import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { calculateAnalytics } from '../analyticsHelper';
import PrintDashboard from './PrintDashboard';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function PrintPage({ params }: PageProps) {
  const { attemptId } = await params;
  const supabase = await createClient();

  try {
    const { data: attempt, error: attemptErr } = await supabase
      .from('mock_test_live_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptErr || !attempt) {
      return renderError('Test attempt not found.');
    }

    if (!attempt.completed) {
      return renderError('Attempt not completed.');
    }

    const { data: test, error: testErr } = await supabase
      .from('mock_tests')
      .select('*')
      .eq('id', attempt.test_id)
      .single();

    if (testErr || !test) {
      return renderError('Associated mock test not found.');
    }

    let qQuery = supabase.from('questions').select('id, subject, chapter, topic, type, difficulty, correct_answer, marks');
    if (test.is_pyp && test.year && test.shift) {
      qQuery = qQuery.eq('year', test.year).eq('shift', test.shift);
    } else {
      qQuery = qQuery.eq('booklet_id', test.id);
    }

    const { data: qData, error: qErr } = await qQuery;
    if (qErr || !qData || qData.length === 0) {
      return renderError('Failed to fetch test questions.');
    }

    const stats = calculateAnalytics(attempt, test, qData);

    return (
      <PrintDashboard
        stats={stats}
        attemptId={attemptId}
        testTitle={test.title}
        examType={test.exam_type}
        attemptDate={attempt.updated_at}
      />
    );

  } catch (err: any) {
    return renderError(err.message || 'An unexpected error occurred.');
  }
}

function renderError(message: string) {
  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full border border-gray-250 rounded-3xl p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Print Layout Error</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
      </div>
    </div>
  );
}
