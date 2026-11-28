'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  X,
  Sparkles,
  Search,
  Check,
  AlertTriangle,
  Loader2,
  Clock,
  FileText,
  Layers,
} from 'lucide-react';

interface CreateCustomMockModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (newTestId: string) => void;
  accentTextColor: string;
}

const EXAM_OPTIONS = [
  { value: 'all', label: 'All Exams' },
  { value: 'jee-main', label: 'JEE Main' },
  { value: 'jee-advanced', label: 'JEE Advanced' },
  { value: 'neet', label: 'NEET UG' },
  { value: 'bitsat', label: 'BITSAT' },
  { value: 'mht-cet', label: 'MHT CET' },
];

const SUBJECT_OPTIONS = [
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'biology', label: 'Biology' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'Mixed' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'mcq', label: 'Single Choice (MCQ)' },
  { value: 'integer', label: 'Numerical / Integer' },
];

const QUESTION_PRESETS = [15, 30, 45, 60, 90];
const DURATION_PRESETS = [30, 60, 90, 120, 180];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatExamLabel(val: string) {
  return EXAM_OPTIONS.find((e) => e.value === val)?.label || val.toUpperCase();
}

export default function CreateCustomMockModal({
  open,
  onClose,
  onCreated,
  accentTextColor,
}: CreateCustomMockModalProps) {
  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState<string>('jee-main');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['physics', 'chemistry', 'mathematics']);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [chapterSearch, setChapterSearch] = useState('');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [qType, setQType] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number>(30);
  const [duration, setDuration] = useState<number>(60);
  const [durationTouched, setDurationTouched] = useState(false);

  const [availableChapters, setAvailableChapters] = useState<{ name: string; subject: string; count: number }[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [matchingCount, setMatchingCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when opened
  useEffect(() => {
    if (!open) return;
    setError(null);
    setChapterSearch('');
  }, [open]);

  // Helper to apply subject filter (handles 'mathematics' vs 'maths' / 'math' variations)
  const expandSubjects = useCallback((subs: string[]) => {
    const out = new Set<string>();
    subs.forEach((s) => {
      const low = s.toLowerCase();
      out.add(low);
      out.add(low.charAt(0).toUpperCase() + low.slice(1));
      if (low === 'mathematics') {
        out.add('maths');
        out.add('Maths');
        out.add('math');
        out.add('Math');
      }
    });
    return Array.from(out);
  }, []);

  // Fetch chapters for selected exam + subjects
  useEffect(() => {
    if (!open) return;
    if (selectedSubjects.length === 0) {
      setAvailableChapters([]);
      setSelectedChapters([]);
      return;
    }

    let cancelled = false;
    async function loadChapters() {
      setLoadingChapters(true);
      try {
        let query = supabase
          .from('questions')
          .select('chapter, subject')
          .in('subject', expandSubjects(selectedSubjects))
          .limit(5000);

        if (examType !== 'all') {
          query = query.eq('exam_type', examType);
        }

        const { data, error: chErr } = await query;
        if (chErr) throw chErr;
        if (cancelled) return;

        const map = new Map<string, { name: string; subject: string; count: number }>();
        (data || []).forEach((row: any) => {
          if (!row.chapter) return;
          const key = row.chapter;
          const existing = map.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            map.set(key, {
              name: row.chapter,
              subject: (row.subject || '').toLowerCase(),
              count: 1,
            });
          }
        });

        const sorted = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        setAvailableChapters(sorted);
        // Prune selected chapters that are no longer in the list
        const validSet = new Set(sorted.map((c) => c.name));
        setSelectedChapters((prev) => prev.filter((c) => validSet.has(c)));
      } catch {
        if (!cancelled) setAvailableChapters([]);
      } finally {
        if (!cancelled) setLoadingChapters(false);
      }
    }

    loadChapters();
    return () => {
      cancelled = true;
    };
  }, [open, examType, selectedSubjects, expandSubjects]);

  // Build filtered Supabase query
  const applyFilters = useCallback(
    (query: any) => {
      if (examType !== 'all') {
        query = query.eq('exam_type', examType);
      }
      if (selectedSubjects.length > 0) {
        query = query.in('subject', expandSubjects(selectedSubjects));
      }
      if (selectedChapters.length > 0) {
        query = query.in('chapter', selectedChapters);
      }
      if (difficulty !== 'all') {
        query = query.ilike('difficulty', difficulty);
      }
      if (qType === 'integer') {
        query = query.eq('type', 'integer');
      } else if (qType === 'mcq') {
        query = query.neq('type', 'integer');
      }
      return query;
    },
    [examType, selectedSubjects, selectedChapters, difficulty, qType, expandSubjects]
  );

  // Live matching question count
  useEffect(() => {
    if (!open) return;
    if (selectedSubjects.length === 0) {
      setMatchingCount(0);
      return;
    }

    let cancelled = false;
    async function loadCount() {
      setLoadingCount(true);
      try {
        const base = supabase.from('questions').select('id', { count: 'exact', head: true });
        const { count, error: cntErr } = await applyFilters(base);
        if (cntErr) throw cntErr;
        if (!cancelled) {
          setMatchingCount(count ?? 0);
        }
      } catch {
        if (!cancelled) setMatchingCount(null);
      } finally {
        if (!cancelled) setLoadingCount(false);
      }
    }

    loadCount();
    return () => {
      cancelled = true;
    };
  }, [open, selectedSubjects, applyFilters]);

  const filteredChapters = useMemo(() => {
    const q = chapterSearch.trim().toLowerCase();
    if (!q) return availableChapters;
    return availableChapters.filter(
      (c) => c.name.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q)
    );
  }, [availableChapters, chapterSearch]);

  const toggleSubject = (sub: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const toggleChapter = (ch: string) => {
    setSelectedChapters((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleQuestionCountChange = (val: number) => {
    const clamped = Math.max(1, Math.min(200, val || 1));
    setQuestionCount(clamped);
    if (!durationTouched) {
      setDuration(Math.max(10, Math.round(clamped * 2)));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedSubjects.length === 0) {
      setError('Please select at least one subject.');
      return;
    }
    if (matchingCount !== null && matchingCount === 0) {
      setError('No questions match your current filters. Try broadening your selection.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be signed in to create a custom mock test.');
        setSubmitting(false);
        return;
      }

      // Fetch matching candidate questions (id, subject, marks)
      const base = supabase.from('questions').select('id, subject, marks').limit(3000);
      const { data: candidates, error: fetchErr } = await applyFilters(base);
      if (fetchErr) throw fetchErr;

      if (!candidates || candidates.length === 0) {
        setError('No questions found matching your filters.');
        setSubmitting(false);
        return;
      }

      const targetCount = Math.min(questionCount, candidates.length);

      // Group by normalized subject for balanced distribution
      const bySubject = new Map<string, any[]>();
      candidates.forEach((q: any) => {
        const s = (q.subject || 'general').toLowerCase();
        const norm = s === 'maths' || s === 'math' ? 'mathematics' : s;
        if (!bySubject.has(norm)) bySubject.set(norm, []);
        bySubject.get(norm)!.push(q);
      });

      const buckets = Array.from(bySubject.values()).map((arr) => shuffleArray(arr));
      const picked: any[] = [];
      const pickedIds = new Set<string>();

      // Round-robin pick across subject buckets for balanced test
      let idx = 0;
      while (picked.length < targetCount && buckets.some((b) => b.length > 0)) {
        const bucket = buckets[idx % buckets.length];
        if (bucket.length > 0) {
          const item = bucket.pop()!;
          if (!pickedIds.has(item.id)) {
            pickedIds.add(item.id);
            picked.push(item);
          }
        }
        idx++;
      }

      const totalMarks = picked.reduce((sum, q) => sum + (Number(q.marks) || 4), 0);
      const uniqueSubjects = Array.from(
        new Set(
          picked.map((q) => {
            const s = (q.subject || '').toLowerCase();
            if (s === 'maths' || s === 'math') return 'Mathematics';
            return s.charAt(0).toUpperCase() + s.slice(1);
          })
        )
      );

      const effectiveExam = examType === 'all' ? 'jee-main' : examType;
      const defaultTitle = `Custom ${examType === 'all' ? 'Mixed' : formatExamLabel(examType)} Mock · ${targetCount} Qs`;
      const finalTitle = title.trim() || defaultTitle;
      const testId = `custom-${user.id.slice(0, 8)}-${Date.now()}`;

      const { error: insertErr } = await supabase.from('mock_tests').insert([
        {
          id: testId,
          title: finalTitle,
          exam_type: effectiveExam,
          duration: Math.max(5, duration),
          total_questions: picked.length,
          total_marks: totalMarks,
          status: 'live',
          is_pyp: false,
          subjects: uniqueSubjects,
          question_ids: picked.map((q) => q.id),
          created_by: user.id,
        },
      ]);

      if (insertErr) throw insertErr;

      onCreated(testId);
      onClose();
    } catch (err: any) {
      setError(
        err?.message?.includes('column') || err?.message?.includes('policy')
          ? `Database setup required: ${err.message}. Please run the latest migrations.sql in Supabase.`
          : err?.message || 'Failed to generate custom mock test.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const effectiveTarget =
    matchingCount !== null ? Math.min(questionCount, matchingCount) : questionCount;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-custom-mock-title"
      className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[2000] flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-glow)] text-[var(--accent)] flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 id="create-custom-mock-title" className="text-base font-bold text-[var(--text)]">
                Create Custom Mock Test
              </h2>
              <p className="text-xs text-[var(--text2)]">
                Generate a timed test from our Supabase question bank
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg hover:bg-[var(--bg2)] text-[var(--text2)] hover:text-[var(--text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-red-500/25 bg-red-500/10 text-xs text-red-400">
              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Test Title */}
          <div>
            <label htmlFor="custom-mock-title" className="block text-xs font-semibold text-[var(--text)] mb-1.5">
              Test Title <span className="text-[var(--text3)] font-normal">(optional)</span>
            </label>
            <input
              id="custom-mock-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Custom ${examType === 'all' ? 'Mixed' : formatExamLabel(examType)} Mock · ${effectiveTarget} Qs`}
              className="w-full bg-[var(--bg2)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text3)] outline-none transition-colors"
            />
          </div>

          {/* Exam Type */}
          <div>
            <span className="block text-xs font-semibold text-[var(--text)] mb-2">Target Exam</span>
            <div className="flex flex-wrap gap-1.5">
              {EXAM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExamType(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    examType === opt.value
                      ? 'bg-[var(--accent-glow)] text-[var(--accent)] border-[var(--accent)]/40'
                      : 'bg-[var(--bg2)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hover)] hover:text-[var(--text)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subjects */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text)]">Subjects</span>
              <span className="text-[11px] text-[var(--text3)]">
                {selectedSubjects.length} selected
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SUBJECT_OPTIONS.map((sub) => {
                const active = selectedSubjects.includes(sub.value);
                return (
                  <button
                    key={sub.value}
                    type="button"
                    onClick={() => toggleSubject(sub.value)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      active
                        ? 'bg-[var(--accent-glow)] text-[var(--accent)] border-[var(--accent)]/40'
                        : 'bg-[var(--bg2)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    {active && <Check size={13} />}
                    {sub.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chapters (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text)]">
                Chapters{' '}
                <span className="text-[var(--text3)] font-normal">
                  ({selectedChapters.length === 0 ? 'All chapters included' : `${selectedChapters.length} selected`})
                </span>
              </span>
              {selectedChapters.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedChapters([])}
                  className="text-[11px] font-medium text-[var(--accent)] hover:underline"
                >
                  Use all chapters
                </button>
              )}
            </div>

            <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="relative border-b border-[var(--border)]">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none"
                />
                <input
                  type="text"
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  placeholder="Filter chapters (leave empty for all chapters)..."
                  className="w-full bg-transparent pl-8 pr-8 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text3)] outline-none"
                />
                {chapterSearch && (
                  <button
                    type="button"
                    onClick={() => setChapterSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)]"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="max-h-36 overflow-y-auto p-2">
                {loadingChapters ? (
                  <div className="flex items-center justify-center py-5 text-xs text-[var(--text3)] gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Loading chapters...
                  </div>
                ) : filteredChapters.length === 0 ? (
                  <div className="py-4 text-center text-xs text-[var(--text3)]">
                    {selectedSubjects.length === 0
                      ? 'Select at least one subject to view chapters.'
                      : 'No chapters found for this filter.'}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {filteredChapters.map((ch) => {
                      const active = selectedChapters.includes(ch.name);
                      return (
                        <button
                          key={ch.name}
                          type="button"
                          onClick={() => toggleChapter(ch.name)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                            active
                              ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40'
                              : 'bg-[var(--card)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hover)] hover:text-[var(--text)]'
                          }`}
                        >
                          <span className="truncate max-w-[180px]">{ch.name}</span>
                          <span className="text-[10px] opacity-70 tabular-nums">({ch.count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Difficulty & Question Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold text-[var(--text)] mb-2">Difficulty</span>
              <div className="flex flex-wrap gap-1.5">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDifficulty(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      difficulty === opt.value
                        ? 'bg-[var(--accent-glow)] text-[var(--accent)] border-[var(--accent)]/40'
                        : 'bg-[var(--bg2)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-[var(--text)] mb-2">Question Format</span>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setQType(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      qType === opt.value
                        ? 'bg-[var(--accent-glow)] text-[var(--accent)] border-[var(--accent)]/40'
                        : 'bg-[var(--bg2)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Question Count & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="q-count-input" className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
                  <FileText size={13} className="text-[var(--text3)]" />
                  Questions
                </label>
                <input
                  id="q-count-input"
                  type="number"
                  min={1}
                  max={200}
                  value={questionCount}
                  onChange={(e) => handleQuestionCountChange(parseInt(e.target.value, 10))}
                  className="w-16 text-right bg-[var(--bg2)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-2 py-1 text-xs font-semibold text-[var(--text)] tabular-nums outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUESTION_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleQuestionCountChange(n)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border tabular-nums transition-colors ${
                      questionCount === n
                        ? 'bg-[var(--accent-glow)] text-[var(--accent)] border-[var(--accent)]/40'
                        : 'bg-[var(--bg2)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="duration-input" className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
                  <Clock size={13} className="text-[var(--text3)]" />
                  Duration (min)
                </label>
                <input
                  id="duration-input"
                  type="number"
                  min={5}
                  max={360}
                  value={duration}
                  onChange={(e) => {
                    setDurationTouched(true);
                    setDuration(Math.max(5, Math.min(360, parseInt(e.target.value, 10) || 5)));
                  }}
                  className="w-16 text-right bg-[var(--bg2)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-2 py-1 text-xs font-semibold text-[var(--text)] tabular-nums outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setDurationTouched(true);
                      setDuration(m);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border tabular-nums transition-colors ${
                      duration === m
                        ? 'bg-[var(--accent-glow)] text-[var(--accent)] border-[var(--accent)]/40'
                        : 'bg-[var(--bg2)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Pool Status Bar */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-xs">
            <div className="flex items-center gap-2 text-[var(--text2)]">
              <Layers size={14} className="text-[var(--accent)] flex-shrink-0" />
              <span>
                {loadingCount ? (
                  'Checking available questions...'
                ) : matchingCount === null ? (
                  'Question pool ready'
                ) : (
                  <>
                    <strong className="text-[var(--text)] tabular-nums">{matchingCount}</strong> matching questions in database
                  </>
                )}
              </span>
            </div>
            {matchingCount !== null && matchingCount > 0 && matchingCount < questionCount && (
              <span className="text-[11px] text-[var(--orange)] font-medium tabular-nums">
                Will include {matchingCount} Qs
              </span>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[var(--border)] bg-[var(--card)]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl bg-[var(--bg2)] hover:bg-[var(--bg3)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={submitting || selectedSubjects.length === 0 || matchingCount === 0}
            style={{ color: accentTextColor }}
            className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-all flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Generate Mock Test
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
