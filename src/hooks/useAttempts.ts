'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface Attempt {
  id: string;
  question_id: string;
  is_correct: boolean;
  selected_answer: string;
  time_taken: number | null;
  created_at: string;
}

export function useAttempts(questionIds: string[]) {
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [loading, setLoading] = useState(false);

  // KEY FIX: Serialize to a stable string key so the effect only fires when the
  // actual question IDs change — not just because a new array reference was passed.
  // Previously the array reference changed every render → infinite re-fetches.
  const idsKey = questionIds.join(',');

  async function fetchAttempts() {
    if (!questionIds.length) return;
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_attempts')
      .select('*')
      .eq('user_id', user.id)
      .in('question_id', questionIds)
      .order('created_at', { ascending: false });

    if (error || !data) {
      setLoading(false);
      return;
    }

    const map: Record<string, Attempt> = {};
    data.forEach(att => {
      if (!map[att.question_id]) {
        map[att.question_id] = att;
      }
    });

    setAttempts(map);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchAttempts();
  }, [idsKey]); // stable string key, not array reference

  return { attempts, loading, refetch: fetchAttempts };
}
