'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface Question {
  id: string;
  _dbId: string;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: string;
  exam_type: string;
  year: number;
  shift: string;
  text: string;
  image: string;
  options: { text: string; image: string }[];
  correct: number;
  answer: string;
  explanation: string;
  explanation_image_url: string;
  type: 'mcq' | 'integer';
}

export function useQuestions(subject: string, chapter: string | null) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subject || !chapter) {
      setQuestions([]);
      return;
    }

    async function fetchQuestions() {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('subject', subject.toLowerCase())
        .eq('chapter', chapter)
        .eq('exam_type', 'pyq')
        .order('year', { ascending: false });

      if (error || !data) {
        console.error('Error fetching questions:', error);
        setLoading(false);
        return;
      }

      const formatted = data.map(q => ({
        ...q,
        _dbId: q.id,
        id: `${q.exam_type?.toUpperCase() || 'PYQ'}-${q.year || 'NA'}-${q.subject?.toUpperCase().slice(0,3) || 'JEE'}`,
        text: q.question_text || '',
        image: q.question_image_url || '',
        options: q.options || [],
        correct: q.type === 'mcq' ? Number(q.correct_answer) : undefined,
        answer: q.type === 'integer' ? q.correct_answer : undefined,
        type: q.type || 'mcq'
      }));

      setQuestions(formatted);
      setLoading(false);
    }

    fetchQuestions();
  }, [subject, chapter]);

  return { questions, loading };
}
