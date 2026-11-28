'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useTheme } from '@/components/ThemeProvider';
import {
  Award,
  Clock,
  BookOpen,
  Plus,
  Zap,
  Search,
  ArrowRight,
  AlertTriangle,
  X,
  BookMarked,
  FileText,
  CheckCircle2,
  PlayCircle,
  RotateCcw,
  RefreshCw,
  BarChart3,
  Calendar,
} from 'lucide-react';

interface MockTest {
  id: string;
  title: string;
  exam_type: string;
  duration: number;
  total_questions: number;
  total_marks: number;
  status: string;
  is_pyp: boolean;
  year?: number;
  shift?: string;
  subjects: string[];
  created_at: string;
}

type TabMode = 'mocks' | 'pyps';
type StatusFilter = 'all' | 'not-attempted' | 'in-progress' | 'completed';

function formatExamType(type: string) {
  switch (type) {
    case 'jee-main':
      return 'JEE Main';
    case 'jee-advanced':
      return 'JEE Advanced';
    case 'neet':
      return 'NEET UG';
    case 'bitsat':
      return 'BITSAT';
    case 'mht-cet':
      return 'MHT CET';
    default:
      return type.toUpperCase();
  }
}

function formatDuration(minutes: number) {
  if (!minutes || minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${minutes} min (${hrs}h ${mins}m)` : `${minutes} min (${hrs}h)`;
}

function TestCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 flex flex-col justify-between animate-pulse">
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="h-5 w-20 rounded-md bg-[var(--bg3)]" />
          <div className="h-5 w-14 rounded-md bg-[var(--bg3)]" />
        </div>
        <div className="h-5 w-4/5 rounded bg-[var(--bg3)] mb-2" />
        <div className="h-5 w-2/3 rounded bg-[var(--bg3)] mb-5" />
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-[var(--border)] mb-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="h-4 w-8 rounded bg-[var(--bg3)]" />
              <div className="h-2.5 w-12 rounded bg-[var(--bg3)]" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-10 w-full rounded-xl bg-[var(--bg3)]" />
    </div>
  );
}

export default function TestsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'neon' || theme === 'aurora' || theme === 'sunset';
  const accentTextColor = isDark ? '#030712' : '#ffffff';

  const [activeTab, setActiveTab] = useState<TabMode>('mocks');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tests, setTests] = useState<MockTest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [examFilter, setExamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Modals state
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [selectedTestForAttempt, setSelectedTestForAttempt] = useState<MockTest | null>(null);

  const [activeAttempts, setActiveAttempts] = useState<Map<string, string>>(new Map());
  const [completedAttempts, setCompletedAttempts] = useState<Map<string, string>>(new Map());

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('mock_tests')
        .select('*')
        .eq('status', 'live')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setTests(data || []);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: attempts } = await supabase
          .from('mock_test_live_attempts')
          .select('id, test_id, completed')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        const activeMap = new Map<string, string>();
        const completedMap = new Map<string, string>();

        (attempts || []).forEach((a) => {
          if (a.completed) {
            if (!completedMap.has(a.test_id)) completedMap.set(a.test_id, a.id);
          } else {
            if (!activeMap.has(a.test_id)) activeMap.set(a.test_id, a.id);
          }
        });

        setActiveAttempts(activeMap);
        setCompletedAttempts(completedMap);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load tests. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  // Close modals on Escape
  useEffect(() => {
    if (!showComingSoonModal && !selectedTestForAttempt) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowComingSoonModal(false);
        setSelectedTestForAttempt(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showComingSoonModal, selectedTestForAttempt]);

  const tabTests = useMemo(
    () => tests.filter((t) => (activeTab === 'mocks' ? !t.is_pyp : t.is_pyp)),
    [tests, activeTab]
  );

  const mockCount = useMemo(() => tests.filter((t) => !t.is_pyp).length, [tests]);
  const pypCount = useMemo(() => tests.filter((t) => t.is_pyp).length, [tests]);

  const availableExams = useMemo(
    () => [...new Set(tabTests.map((t) => t.exam_type))].sort(),
    [tabTests]
  );

  // Reset exam filter if switching tabs and selected exam doesn't exist there
  useEffect(() => {
    if (examFilter !== 'all' && !availableExams.includes(examFilter)) {
      setExamFilter('all');
    }
  }, [availableExams, examFilter]);

  const filteredTests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tabTests.filter((t) => {
      if (examFilter !== 'all' && t.exam_type !== examFilter) return false;

      const isInProgress = activeAttempts.has(t.id);
      const isCompleted = completedAttempts.has(t.id);
      if (statusFilter === 'in-progress' && !isInProgress) return false;
      if (statusFilter === 'completed' && !isCompleted) return false;
      if (statusFilter === 'not-attempted' && (isInProgress || isCompleted)) return false;

      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.exam_type.toLowerCase().includes(q) ||
        formatExamType(t.exam_type).toLowerCase().includes(q) ||
        t.year?.toString().includes(q) ||
        t.shift?.toLowerCase().includes(q) ||
        t.subjects?.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [tabTests, examFilter, statusFilter, searchQuery, activeAttempts, completedAttempts]);

  const hasActiveFilters = searchQuery.trim() !== '' || examFilter !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setExamFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="max-w-6xl mx-auto py-7 px-4 sm:px-6 pb-28">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-6 border-b border-[var(--border)]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)] mb-1.5">
            Test Center
          </h1>
          <p className="text-sm text-[var(--text2)] max-w-2xl leading-relaxed">
            Practice with full-length mock tests and official previous year papers under timed exam conditions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowComingSoonModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--card)] hover:bg-[var(--bg2)] border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text)] text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] group flex-shrink-0"
        >
          <Plus size={15} className="text-[var(--accent)] transition-transform duration-200 group-hover:rotate-90" />
          Create Custom Test
        </button>
      </header>

      {/* Tabs + Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between mb-4">
        <div
          role="tablist"
          aria-label="Test categories"
          className="flex p-1 bg-[var(--bg2)] border border-[var(--border)] rounded-xl md:w-fit"
        >
          <button
            role="tab"
            type="button"
            aria-selected={activeTab === 'mocks'}
            onClick={() => setActiveTab('mocks')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              activeTab === 'mocks'
                ? 'bg-[var(--card)] text-[var(--text)] shadow-sm'
                : 'text-[var(--text2)] hover:text-[var(--text)]'
            }`}
          >
            <Clock size={14} className={activeTab === 'mocks' ? 'text-[var(--accent)]' : ''} />
            Mock Tests
            <span
              className={`px-1.5 py-0.5 text-[11px] rounded-md font-semibold tabular-nums ${
                activeTab === 'mocks'
                  ? 'bg-[var(--accent-glow)] text-[var(--accent)]'
                  : 'bg-[var(--bg3)] text-[var(--text2)]'
              }`}
            >
              {loading ? '—' : mockCount}
            </span>
          </button>

          <button
            role="tab"
            type="button"
            aria-selected={activeTab === 'pyps'}
            onClick={() => setActiveTab('pyps')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              activeTab === 'pyps'
                ? 'bg-[var(--card)] text-[var(--text)] shadow-sm'
                : 'text-[var(--text2)] hover:text-[var(--text)]'
            }`}
          >
            <BookOpen size={14} className={activeTab === 'pyps' ? 'text-[var(--accent)]' : ''} />
            Previous Year Papers
            <span
              className={`px-1.5 py-0.5 text-[11px] rounded-md font-semibold tabular-nums ${
                activeTab === 'pyps'
                  ? 'bg-[var(--accent-glow)] text-[var(--accent)]'
                  : 'bg-[var(--bg3)] text-[var(--text2)]'
              }`}
            >
              {loading ? '—' : pypCount}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 md:max-w-sm">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none"
            size={15}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={activeTab === 'mocks' ? 'Search mock tests' : 'Search previous year papers'}
            placeholder={activeTab === 'mocks' ? 'Search mock tests or subjects...' : 'Search by year, shift, exam...'}
            className="w-full bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-hover)] focus:border-[var(--accent)] rounded-xl pl-10 pr-9 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text3)] outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg2)] transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      {!loading && tabTests.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-1.5">
            {availableExams.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setExamFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    examFilter === 'all'
                      ? 'bg-[var(--accent-glow)] text-[var(--accent)] border-[var(--accent)]/40'
                      : 'bg-transparent text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hover)] hover:text-[var(--text)]'
                  }`}
                >
                  All Exams
                </button>
                {availableExams.map((exam) => (
                  <button
                    key={exam}
                    type="button"
                    onClick={() => setExamFilter(exam)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      examFilter === exam
                        ? 'bg-[var(--accent-glow)] text-[var(--accent)] border-[var(--accent)]/40'
                        : 'bg-transparent text-[var(--text2)] border-[var(--border)] hover:border-[var(--border-hover)] hover:text-[var(--text)]'
                    }`}
                  >
                    {formatExamType(exam)}
                  </button>
                ))}
                <span className="h-4 w-px bg-[var(--border)] mx-1 hidden sm:inline-block" aria-hidden="true" />
              </>
            )}

            {(
              [
                { key: 'all', label: 'All Status' },
                { key: 'not-attempted', label: 'Not Attempted' },
                { key: 'in-progress', label: 'In Progress' },
                { key: 'completed', label: 'Completed' },
              ] as { key: StatusFilter; label: string }[]
            ).map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setStatusFilter(st.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  statusFilter === st.key
                    ? 'bg-[var(--bg2)] text-[var(--text)] border-[var(--border-hover)]'
                    : 'bg-transparent text-[var(--text3)] border-[var(--border)] hover:border-[var(--border-hover)] hover:text-[var(--text2)]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
            >
              <RotateCcw size={12} />
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 mb-6 rounded-2xl border border-red-500/25 bg-red-500/10 text-sm text-red-400">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchTests}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <TestCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="text-center py-16 px-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          {activeTab === 'mocks' ? (
            <Award className="w-10 h-10 text-[var(--text3)] mx-auto mb-3 opacity-60" />
          ) : (
            <BookMarked className="w-10 h-10 text-[var(--text3)] mx-auto mb-3 opacity-60" />
          )}
          <h2 className="text-base font-semibold text-[var(--text)] mb-1">
            {hasActiveFilters
              ? `No ${activeTab === 'mocks' ? 'mock tests' : 'papers'} match your filters`
              : `No ${activeTab === 'mocks' ? 'mock tests' : 'previous year papers'} available yet`}
          </h2>
          <p className="text-xs text-[var(--text2)] max-w-md mx-auto mb-5">
            {hasActiveFilters
              ? 'Try clearing your search query or switching exam and status filters.'
              : 'New live tests will appear here as soon as they are published.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--bg2)] hover:bg-[var(--bg3)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] transition-colors"
            >
              <RotateCcw size={13} />
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTests.map((test) => {
            const isInProgress = activeAttempts.has(test.id);
            const attemptId = completedAttempts.get(test.id);
            const isCompleted = Boolean(attemptId);

            return (
              <article
                key={test.id}
                className="bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-hover)] rounded-2xl p-5 flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md group"
              >
                <div>
                  {/* Top Badges Row */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)]/20 px-2.5 py-0.5 rounded-md text-[11px] font-semibold">
                        {formatExamType(test.exam_type)}
                      </span>
                      {test.year && (
                        <span className="inline-flex items-center gap-1 bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)] px-2 py-0.5 rounded-md text-[11px] font-medium tabular-nums">
                          <Calendar size={10} className="text-[var(--text3)]" />
                          {test.year}
                        </span>
                      )}
                      {test.shift && (
                        <span
                          className="bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)] px-2 py-0.5 rounded-md text-[11px] font-medium truncate max-w-[110px]"
                          title={test.shift}
                        >
                          {test.shift}
                        </span>
                      )}
                    </div>

                    {isInProgress ? (
                      <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-500 border border-blue-500/25 px-2 py-0.5 rounded-md text-[10px] font-semibold flex-shrink-0">
                        <PlayCircle size={11} />
                        In Progress
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 px-2 py-0.5 rounded-md text-[10px] font-semibold flex-shrink-0">
                        <CheckCircle2 size={11} />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20 px-2 py-0.5 rounded-md text-[10px] font-semibold flex-shrink-0">
                        Live
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors mb-4 leading-snug line-clamp-2">
                    {test.title}
                  </h3>

                  {/* Unified 3-column metrics */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-[var(--border)] mb-4 text-center">
                    <div>
                      <div className="text-sm font-bold text-[var(--text)] tabular-nums">
                        {test.total_questions}
                      </div>
                      <div className="text-[11px] text-[var(--text3)] flex items-center justify-center gap-1 mt-0.5">
                        <FileText size={11} /> Qs
                      </div>
                    </div>
                    <div className="border-x border-[var(--border)]">
                      <div className="text-sm font-bold text-[var(--text)] tabular-nums">
                        {test.total_marks}
                      </div>
                      <div className="text-[11px] text-[var(--text3)] flex items-center justify-center gap-1 mt-0.5">
                        <Zap size={11} /> Marks
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[var(--text)] tabular-nums">
                        {test.duration}m
                      </div>
                      <div className="text-[11px] text-[var(--text3)] flex items-center justify-center gap-1 mt-0.5">
                        <Clock size={11} /> Time
                      </div>
                    </div>
                  </div>

                  {/* Subjects Included */}
                  {test.subjects && test.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {test.subjects.map((sub) => (
                        <span
                          key={sub}
                          className="bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)] px-2 py-0.5 rounded-md text-[11px] font-medium capitalize"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-1">
                  {isInProgress ? (
                    <button
                      type="button"
                      onClick={() => setSelectedTestForAttempt(test)}
                      className="w-full py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-semibold border bg-blue-500/10 text-blue-500 border-blue-500/30 hover:bg-blue-500 hover:text-white hover:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      Resume Test
                      <ArrowRight size={14} />
                    </button>
                  ) : isCompleted && attemptId ? (
                    <div className="flex gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => router.push(`/analysis/${attemptId}`)}
                        className="flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white hover:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        <BarChart3 size={13} />
                        Analysis
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTestForAttempt(test)}
                        className="flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-semibold border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] hover:border-[var(--border-hover)] hover:bg-[var(--bg3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      >
                        <RotateCcw size={13} />
                        Reattempt
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedTestForAttempt(test)}
                      style={{ color: accentTextColor }}
                      className="w-full py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-semibold bg-[var(--accent)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
                    >
                      Attempt Test
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* CREATE MOCK TEST COMING SOON MODAL */}
      {showComingSoonModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-test-modal-title"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
          onClick={() => setShowComingSoonModal(false)}
        >
          <div
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-7 max-w-sm w-full relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowComingSoonModal(false)}
              aria-label="Close modal"
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-[var(--bg2)] text-[var(--text2)] hover:text-[var(--text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <X size={16} />
            </button>

            <div className="text-center">
              <div className="w-11 h-11 rounded-xl bg-[var(--accent-glow)] text-[var(--accent)] flex items-center justify-center mx-auto mb-4">
                <Plus size={22} />
              </div>
              <h3 id="custom-test-modal-title" className="text-lg font-bold text-[var(--text)] mb-1.5">
                Custom Mock Test Builder
              </h3>
              <span className="inline-block bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)]/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold mb-4">
                Coming Soon
              </span>
              <p className="text-xs text-[var(--text2)] leading-relaxed mb-6">
                Build personalized mock tests by selecting specific chapters, difficulty levels, and custom time limits. This feature is currently in development.
              </p>
              <button
                type="button"
                onClick={() => setShowComingSoonModal(false)}
                style={{ color: accentTextColor }}
                className="w-full bg-[var(--accent)] hover:brightness-110 font-semibold py-2.5 rounded-xl transition-all text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATTEMPT NOW CONFIRMATION MODAL */}
      {selectedTestForAttempt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="attempt-modal-title"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
          onClick={() => setSelectedTestForAttempt(null)}
        >
          <div
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-7 max-w-md w-full relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedTestForAttempt(null)}
              aria-label="Close modal"
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-[var(--bg2)] text-[var(--text2)] hover:text-[var(--text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <X size={16} />
            </button>

            <div>
              <div className="flex flex-wrap gap-1.5 mb-3 pr-6">
                <span className="bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)]/20 px-2.5 py-0.5 rounded-md text-[11px] font-semibold">
                  {formatExamType(selectedTestForAttempt.exam_type)}
                </span>
                <span className="bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)] px-2.5 py-0.5 rounded-md text-[11px] font-medium">
                  {selectedTestForAttempt.is_pyp ? 'Previous Year Paper' : 'Mock Test'}
                </span>
                {selectedTestForAttempt.year && (
                  <span className="bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)] px-2.5 py-0.5 rounded-md text-[11px] font-medium tabular-nums">
                    {selectedTestForAttempt.year}
                  </span>
                )}
              </div>

              <h3 id="attempt-modal-title" className="text-lg font-bold text-[var(--text)] mb-4 leading-snug">
                {selectedTestForAttempt.title}
              </h3>

              {/* Details table */}
              <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-4 space-y-2.5 mb-5 text-xs text-[var(--text)]">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text2)]">Questions</span>
                  <span className="font-semibold tabular-nums">{selectedTestForAttempt.total_questions} Questions</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text2)]">Maximum Marks</span>
                  <span className="font-semibold tabular-nums">{selectedTestForAttempt.total_marks} Marks</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text2)]">Duration</span>
                  <span className="font-semibold tabular-nums">{formatDuration(selectedTestForAttempt.duration)}</span>
                </div>
                {selectedTestForAttempt.subjects && selectedTestForAttempt.subjects.length > 0 && (
                  <div className="flex justify-between items-start gap-4 pt-2.5 border-t border-[var(--border)]">
                    <span className="text-[var(--text2)] flex-shrink-0">Subjects</span>
                    <span className="font-semibold text-right capitalize">
                      {selectedTestForAttempt.subjects.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-[var(--text)] mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-[var(--orange)]" />
                  Before you begin
                </h4>
                <ul className="text-xs text-[var(--text2)] space-y-1.5 pl-4 list-disc leading-relaxed">
                  <li>Ensure a stable internet connection throughout the test.</li>
                  <li>Standard exam marking applies (+4 for correct, -1 for incorrect).</li>
                  <li>Once started, the countdown timer cannot be paused.</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedTestForAttempt(null)}
                  className="flex-1 bg-[var(--bg2)] hover:bg-[var(--bg3)] border border-[var(--border)] text-[var(--text)] font-semibold py-2.5 rounded-xl transition-colors text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetId = selectedTestForAttempt.id;
                    setSelectedTestForAttempt(null);
                    window.open(`/exam/${targetId}/instructions`, '_blank', 'noopener,noreferrer');
                  }}
                  style={{ color: accentTextColor }}
                  className="flex-1 bg-[var(--accent)] hover:brightness-110 font-semibold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  {activeAttempts.has(selectedTestForAttempt.id) ? 'Resume Test' : 'Start Test'}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
