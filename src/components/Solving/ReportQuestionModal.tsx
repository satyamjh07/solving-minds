'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Flag, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useDialog } from '@/components/DialogProvider';

const REPORT_REASONS = [
  'Incorrect answer options / key',
  'Formatting or KaTeX layout issue',
  'Wrong question text or details',
  'Poor quality / blurry image',
  'Incorrect explanation',
  'Other',
];

interface ReportQuestionModalProps {
  questionId: string;
  onClose: () => void;
}

export function ReportQuestionModal({ questionId, onClose }: ReportQuestionModalProps) {
  const { profile } = useProfile();
  const { toast } = useDialog();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!profile) {
      toast('You must be logged in to report.', 'error');
      return;
    }
    setIsSubmitting(true);

    const { error } = await supabase.from('reports').insert({
      reporter_id: profile.id,
      question_id: questionId,
      reason,
      status: 'pending',
    });

    if (error) {
      console.error('Question report error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      if (error.message?.includes('question_id') || error.message?.includes('column') || error.message?.includes('schema cache')) {
        toast('Database migration required! Please run the SQL command from migrations.sql in your Supabase SQL editor.', 'error');
      } else {
        toast(`Failed to submit report: ${error.message || 'Unknown error'}`, 'error');
      }
    } else {
      toast('Question report submitted. Thank you for making SolvingMinds better!', 'success');
      onClose();
    }
    setIsSubmitting(false);
  };

  const modal = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      className="bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0f0f1a] border border-[#ffffff12] rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
            <Flag size={22} className="text-red-400" fill="currentColor" />
          </div>
          <h2 className="text-white text-lg font-bold">Report Question</h2>
          <p className="text-gray-500 text-xs mt-1">Found an error? Let our moderators know.</p>
        </div>

        {/* Reason selector */}
        <div className="mb-5">
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full bg-[#ffffff08] border border-[#ffffff15] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#7c3aed] transition-colors appearance-none cursor-pointer"
          >
            {REPORT_REASONS.map(r => (
              <option key={r} value={r} className="bg-[#0f0f1a]">{r}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#ffffff12] text-gray-400 hover:text-white hover:border-white/20 text-sm font-bold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-purple-600 text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
            Submit
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
