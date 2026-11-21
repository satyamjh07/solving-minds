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
  options: { text?: string; image?: string }[];
  correct: number;
  answer: string;
  correct_answer?: string;
  explanation: string;
  explanation_image_url: string;
  type: 'mcq' | 'integer' | 'multi-select';
}

export function useQuestions(subject: string, chapter: string | null, examType: string | null) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subject || !chapter || !examType) {
      setQuestions([]);
      return;
    }

    async function fetchQuestions() {
      setLoading(true);
      const mappedExam = examType === 'jee-mains' ? 'jee-main' : examType;
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('subject', subject.toLowerCase())
        .eq('chapter', chapter)
        .eq('exam_type', mappedExam)
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
        answer: q.type === 'integer' ? q.correct_answer : (q.type === 'multi-select' ? q.correct_answer : undefined),
        correct_answer: q.correct_answer,
        type: q.type || 'mcq'
      }));

      setQuestions(formatted);
      setLoading(false);
    }

    fetchQuestions();
  }, [subject, chapter, examType]);

  return { questions, loading };
}
