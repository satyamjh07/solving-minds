'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Loader2, CheckSquare, Square, ChevronRight, AlertTriangle } from 'lucide-react';

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

export default function InstructionsPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;
  const { profile, loading: profileLoading } = useProfile();
  const [test, setTest] = useState<MockTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const fetchTest = async () => {
      const { data } = await supabase.from('mock_tests').select('*').eq('id', testId).single();
      setTest(data);
      setLoading(false);
    };
    fetchTest();
  }, [testId]);

  const handleStart = () => {
    if (agreed) router.push(`/exam/${testId}/attempt`);
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Loading examination details...</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold">Test not found.</p>
          <button onClick={() => router.push('/tests')} className="mt-4 text-sm text-blue-600 hover:underline">← Back to Test Center</button>
        </div>
      </div>
    );
  }

  const formatExam = (type: string) => {
    const map: Record<string, string> = {
      'jee-main': 'JEE Main', 'jee-advanced': 'JEE Advanced',
      'neet': 'NEET UG', 'bitsat': 'BITSAT', 'mht-cet': 'MHT CET',
    };
    return map[type] || type.toUpperCase();
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ fontFamily: "'Space Grotesk', Arial, sans-serif", background: '#f1f5f9' }}
    >
      {/* ── Top Header ── */}
      <header style={{ background: '#0f2d52' }} className="px-4 sm:px-6 py-3 flex items-center justify-between shadow-lg flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white font-black text-sm select-none">SM</div>
          <div>
            <div className="text-white text-sm font-bold tracking-wide">SolvingMinds</div>
            <div className="text-blue-300 text-[10px] uppercase tracking-widest font-medium">CBT Examination System</div>
          </div>
        </div>
        <div className="hidden sm:block text-white/80 text-sm font-medium max-w-xs truncate">{test.title}</div>
      </header>

      {/* ── Section label ── */}
      <div style={{ background: '#1565c0' }} className="px-4 sm:px-6 py-2 text-white text-xs font-bold uppercase tracking-widest flex-shrink-0">
        Instructions to Candidates
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left: Scrollable Instructions */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-6 text-[13px] text-gray-800 leading-relaxed">

            {/* Duration Banner */}
            <div className="bg-blue-50 border-l-4 border-blue-600 px-4 py-3 rounded-r-xl">
              <p className="font-bold text-blue-900 text-sm">
                Total duration of this examination is{' '}
                <span className="text-blue-600">{test.duration} minutes ({Math.floor(test.duration / 60)} hour{test.duration >= 120 ? 's' : ''})</span>.
              </p>
            </div>

            <p className="text-gray-700">
              The clock will be set at the server. The countdown timer in the top-right corner of the screen will display the
              remaining time. When the timer reaches zero, the examination will end automatically.
            </p>

            {/* Palette Legend */}
            <div>
              <p className="font-bold text-gray-900 mb-3 text-[13px]">
                The Question Palette on the right side of the screen shows the status of each question using the following symbols:
              </p>
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2.5 shadow-sm">
                {[
                  { cls: 'bg-gray-300 text-gray-700', label: 'You have not visited the question yet.', border: '' },
                  { cls: 'bg-red-500 text-white', label: 'You have not answered the question.', border: '' },
                  { cls: 'bg-green-500 text-white', label: 'You have answered the question.', border: '' },
                  { cls: 'bg-purple-600 text-white', label: 'You have NOT answered, but marked it for Review.', border: '' },
                  { cls: 'bg-purple-600 text-white', label: '"Answered and Marked for Review" — will be considered for evaluation.', border: 'ring-2 ring-green-400' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${item.cls} ${item.border}`}>
                      {i + 1}
                    </div>
                    <span className="text-[12.5px] text-gray-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <section>
              <h3 className="font-bold text-gray-900 mb-2 text-[13px]">Navigating to a Question:</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-[12.5px] text-gray-700">
                <li>Click on a question number in the <strong>Question Palette</strong> to jump directly to that question.</li>
                <li>Click <strong>Save &amp; Next</strong> to save your answer and move to the next question.</li>
                <li>Click <strong>Mark for Review &amp; Next</strong> to save your answer, flag it for review, and move to the next question.</li>
              </ul>
            </section>

            {/* Answering */}
            <section>
              <h3 className="font-bold text-gray-900 mb-2 text-[13px]">Answering a Question:</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-[12.5px] text-gray-700">
                <li>Click on the option button to select your answer for an MCQ.</li>
                <li>Click the same option again, or click <strong>Clear Response</strong>, to deselect.</li>
                <li>For <strong>Integer Type</strong> questions, enter your numeric answer using the keyboard.</li>
                <li>You must click <strong>Save &amp; Next</strong> to record your answer.</li>
              </ul>
            </section>

            {/* Sections */}
            <section>
              <h3 className="font-bold text-gray-900 mb-2 text-[13px]">Navigating Through Sections:</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-[12.5px] text-gray-700">
                <li>Sections are shown in the top bar of the screen. Click any section name to view its questions.</li>
                <li>You may freely switch between sections and questions at any time.</li>
                <li>After the last question in a section, <strong>Save &amp; Next</strong> will take you to the first question of the next section.</li>
              </ul>
            </section>

            {/* Marking Scheme */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-[12.5px] text-amber-900">
                <strong>Marking Scheme:</strong>&nbsp;
                <span className="text-green-700 font-bold">+4</span> for each correct response. &nbsp;
                <span className="text-red-600 font-bold">−1</span> for each incorrect response. &nbsp;
                <span className="text-gray-600 font-semibold">0</span> for unattempted questions.
              </div>
            </div>

            {/* Tab Warning */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-[12.5px] text-red-900">
                <strong>Tab Switch Warning:</strong>&nbsp;
                Switching browser tabs during the examination is monitored. More than 5 violations will trigger automatic submission.
              </div>
            </div>

            {/* Submission note */}
            <section>
              <h3 className="font-bold text-gray-900 mb-2 text-[13px]">Submitting the Examination:</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-[12.5px] text-gray-700">
                <li>You may submit the exam at any time by clicking the <strong>Submit</strong> button.</li>
                <li>When the timer reaches zero, the examination is submitted automatically.</li>
                <li>Once submitted, the test <strong>cannot be resumed</strong>.</li>
              </ul>
            </section>

            {/* Spacer for scrollable area */}
            <div className="h-4" />
          </div>
        </div>

        {/* Right: Candidate Panel */}
        <aside className="hidden md:flex w-72 flex-shrink-0 flex-col bg-white border-l border-gray-200 shadow-inner">

          {/* Candidate Header */}
          <div style={{ background: '#0f2d52' }} className="p-5 text-center flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-blue-500 mx-auto mb-2.5 overflow-hidden border-2 border-white/30">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                  {profile?.name?.[0]?.toUpperCase() || 'A'}
                </div>
              )}
            </div>
            <div className="text-white text-sm font-bold">{profile?.name || 'Candidate'}</div>
            <div className="text-blue-300 text-[10px] mt-0.5 truncate px-2">{profile?.email || ''}</div>
          </div>

          {/* Test Details */}
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 space-y-2.5">
              <div className="text-[10px] font-bold text-blue-800 uppercase tracking-widest mb-1">Examination Details</div>
              {[
                { label: 'Test Name', value: test.title },
                { label: 'Exam', value: formatExam(test.exam_type) },
                { label: 'Duration', value: `${test.duration} min` },
                { label: 'Questions', value: test.total_questions },
                { label: 'Max Marks', value: test.total_marks },
                ...(test.is_pyp && test.year ? [{ label: 'Year', value: test.year }] : []),
                ...(test.is_pyp && test.shift ? [{ label: 'Shift', value: test.shift }] : []),
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-start gap-2 text-[12px]">
                  <span className="text-gray-500 flex-shrink-0">{item.label}:</span>
                  <span className="font-semibold text-gray-800 text-right break-words max-w-[160px]">{String(item.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Agreement + CTA */}
          <div className="p-4 border-t border-gray-200 flex-shrink-0">
            <label
              className="flex items-start gap-2.5 cursor-pointer mb-4 select-none"
              onClick={() => setAgreed(a => !a)}
            >
              <span className="mt-0.5 flex-shrink-0">
                {agreed
                  ? <CheckSquare size={18} className="text-blue-600" />
                  : <Square size={18} className="text-gray-400" />}
              </span>
              <span className="text-[12px] text-gray-600 leading-relaxed">
                I have read all the instructions carefully and agree to all terms and conditions.
              </span>
            </label>

            <button
              onClick={handleStart}
              disabled={!agreed}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                agreed
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-200'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              I am ready to begin
              <ChevronRight size={16} />
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile CTA bar */}
      <div className="md:hidden flex-shrink-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <label className="flex items-start gap-2.5 cursor-pointer mb-3 select-none" onClick={() => setAgreed(a => !a)}>
          <span className="mt-0.5 flex-shrink-0">
            {agreed ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-gray-400" />}
          </span>
          <span className="text-[12px] text-gray-600 leading-snug">I have read all instructions and agree to all terms.</span>
        </label>
        <button
          onClick={handleStart}
          disabled={!agreed}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            agreed ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          I am ready to begin <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
