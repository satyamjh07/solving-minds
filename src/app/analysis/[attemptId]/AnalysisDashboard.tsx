'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award, CheckCircle2, XCircle, Clock, Zap, BookOpen, ChevronRight,
  Search, Download, ArrowLeft, RefreshCw, Calendar, FileText, ChevronDown,
  ListFilter, AlertCircle, ShieldAlert, BookOpenCheck, Eye, Layers, TrendingUp
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { useTheme } from '@/components/ThemeProvider';
import Link from 'next/link';
import { PreCalculatedAnalytics, SubjectStats, ChapterStats, DifficultyBucket, QuestionRow, QuestionJourneyPoint } from './analyticsHelper';

interface AnalysisDashboardProps {
  stats: PreCalculatedAnalytics;
  attemptId: string;
  testId: string;
  testTitle: string;
  examType: string;
  attemptDate: string;
}

const SECTIONS = [
  { id: 'overview', label: 'Overview Performance' },
  { id: 'subject', label: 'Subject Analysis' },
  { id: 'chapter', label: 'Chapter Analysis' },
  { id: 'difficulty', label: 'Difficulty Analysis' },
  { id: 'attempt', label: 'Attempt Analysis' },
  { id: 'time', label: 'Time Insights' },
  { id: 'journey', label: 'Question Journey' },
  { id: 'qbyq', label: 'Question Analysis' },
  { id: 'movement', label: 'Score Progression' }
];

export default function AnalysisDashboard({
  stats,
  attemptId,
  testId,
  testTitle,
  examType,
  attemptDate
}: AnalysisDashboardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Sorting and searching states
  const [chapterSearch, setChapterSearch] = useState('');
  const [chapterSortField, setChapterSortField] = useState<keyof ChapterStats>('chapterName');
  const [chapterSortOrder, setChapterSortOrder] = useState<'asc' | 'desc'>('asc');

  // Question table states
  const [qSubjectFilter, setQSubjectFilter] = useState('all');
  const [qDiffFilter, setQDiffFilter] = useState('all');
  const [qStatusFilter, setQStatusFilter] = useState('all');
  const [qSearch, setQSearch] = useState('');

  // Question journey filter
  const [journeyFilter, setJourneyFilter] = useState<'all' | 'correct' | 'incorrect' | 'skipped' | 'marked'>('all');

  // Intersection observer refs for scroll-spy
  const sectionRefs = {
    overview: useRef<HTMLDivElement>(null),
    subject: useRef<HTMLDivElement>(null),
    chapter: useRef<HTMLDivElement>(null),
    difficulty: useRef<HTMLDivElement>(null),
    attempt: useRef<HTMLDivElement>(null),
    time: useRef<HTMLDivElement>(null),
    journey: useRef<HTMLDivElement>(null),
    qbyq: useRef<HTMLDivElement>(null),
    movement: useRef<HTMLDivElement>(null)
  };

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;
      for (const section of SECTIONS) {
        const ref = sectionRefs[section.id as keyof typeof sectionRefs];
        if (ref.current) {
          const top = ref.current.offsetTop;
          const height = ref.current.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const ref = sectionRefs[id as keyof typeof sectionRefs];
    if (ref.current) {
      window.scrollTo({
        top: ref.current.offsetTop - 90,
        behavior: 'smooth'
      });
      setActiveSection(id);
    }
  };

  const formatSeconds = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Sort chapter stats
  const handleChapterSort = (field: keyof ChapterStats) => {
    if (chapterSortField === field) {
      setChapterSortOrder(chapterSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setChapterSortField(field);
      setChapterSortOrder('desc'); // Default to descending
    }
  };

  const sortedChapters = [...stats.chapters]
    .filter(c => c.chapterName.toLowerCase().includes(chapterSearch.toLowerCase()))
    .sort((a, b) => {
      const valA = a[chapterSortField];
      const valB = b[chapterSortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return chapterSortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return chapterSortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });

  // Filter questions row table
  const filteredQuestions = stats.questionByQuestion.filter(q => {
    const matchSub = qSubjectFilter === 'all' || q.subject.toLowerCase() === qSubjectFilter.toLowerCase();
    const matchDiff = qDiffFilter === 'all' || q.difficulty.toLowerCase() === qDiffFilter.toLowerCase();
    const matchStatus = qStatusFilter === 'all' || 
      (qStatusFilter === 'correct' && q.attemptStatus === 'Correct') ||
      (qStatusFilter === 'incorrect' && q.attemptStatus === 'Incorrect') ||
      (qStatusFilter === 'skipped' && q.attemptStatus === 'Skipped');
    const matchTxt = q.chapter.toLowerCase().includes(qSearch.toLowerCase()) || 
      String(q.questionNumber).includes(qSearch);

    return matchSub && matchDiff && matchStatus && matchTxt;
  });

  // Filter journey timeline
  const filteredJourney = stats.questionJourney.filter(j => {
    if (journeyFilter === 'all') return true;
    if (journeyFilter === 'correct') return j.status === 'correct';
    if (journeyFilter === 'incorrect') return j.status === 'incorrect';
    if (journeyFilter === 'skipped') return j.status === 'skipped';
    if (journeyFilter === 'marked') return j.status === 'marked';
    return true;
  });

  // PDF Download Trigger
  const handlePdfDownload = async () => {
    if (pdfGenerating) return;
    setPdfGenerating(true);

    try {
      const response = await fetch(`/api/analysis/${attemptId}/pdf`);
      if (!response.ok) {
        throw new Error('Failed to generate PDF on server');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SolvingMinds_Report_${attemptId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF Download failed:', err);
      alert('Failed to generate and download PDF report. Please try again.');
    } finally {
      setPdfGenerating(false);
    }
  };

  // Recharts colors dynamically loaded based on light/dark theme variables
  const getThemeColor = (colorName: string) => {
    if (theme === 'dark' || theme === 'neon') {
      if (colorName === 'accent') return '#00d2ff';
      if (colorName === 'accent2') return '#3b82f6';
      if (colorName === 'green') return '#00e5a0';
      if (colorName === 'red') return '#ff4d6a';
      if (colorName === 'orange') return '#ff9340';
      if (colorName === 'purple') return '#8b5cf6';
      if (colorName === 'text') return '#f1f5f9';
      if (colorName === 'text2') return '#94a9c9';
      if (colorName === 'border') return '#111d3f';
    } else {
      // Light Mode default colors
      if (colorName === 'accent') return '#2563eb';
      if (colorName === 'accent2') return '#00d2ff';
      if (colorName === 'green') return '#10b981';
      if (colorName === 'red') return '#ef4444';
      if (colorName === 'orange') return '#f97316';
      if (colorName === 'purple') return '#a855f7';
      if (colorName === 'text') return '#0f172a';
      if (colorName === 'text2') return '#475569';
      if (colorName === 'border') return '#e2eaf4';
    }
    return '#888888';
  };

  const chartMargin = { top: 20, right: 20, bottom: 20, left: 10 };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans antialiased flex">
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-[var(--sidebar-w)] border-r border-[var(--border)] bg-[var(--card)] hidden xl:flex flex-col fixed top-0 bottom-0 left-0 z-40 overflow-y-auto">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-pulse" />
            <h2 className="text-lg font-black tracking-wider uppercase font-display text-[var(--text)]">
              Solving Minds
            </h2>
          </div>
          <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest font-bold">
            Analytics Portal V2
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {SECTIONS.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold font-mono uppercase tracking-wider transition-all text-left ${
                  isActive
                    ? 'bg-[var(--accent)] text-black font-extrabold shadow-lg shadow-[var(--accent-glow)]'
                    : 'text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]'
                }`}
              >
                {sec.label}
                <ChevronRight size={12} className={isActive ? 'text-black' : 'text-[var(--text3)]'} />
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={() => router.push('/tests')}
            className="w-full py-3 rounded-2xl bg-[var(--bg2)] hover:bg-[var(--bg3)] text-[var(--text)] transition-all font-mono text-xs uppercase tracking-widest border border-[var(--border)] flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back to Center
          </button>
        </div>
      </aside>

      {/* MAIN LAYOUT WRAPPER */}
      <div className="flex-1 xl:ml-[var(--sidebar-w)] min-w-0 flex flex-col min-h-screen">
        {/* TOP ACTION BAR */}
        <header className="border-b border-[var(--border)] bg-[var(--card)] sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="bg-[var(--bg3)] text-[var(--accent)] border border-[var(--border)] px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider">
                {examType.toUpperCase()}
              </span>
              <span className="bg-[var(--bg3)] text-[var(--text2)] border border-[var(--border)] px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Calendar size={10} /> {formatDate(attemptDate)}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[var(--text)] truncate">
              {testTitle}
            </h1>
          </div>

          {/* Top buttons row */}
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
            {/* View solutions button */}
            <button
              onClick={() => router.push(`/exam/${testId}/solution?attemptId=${attemptId}`)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[var(--accent)] text-black hover:opacity-90 font-mono text-xs uppercase tracking-widest font-extrabold shadow-md transition-all"
            >
              <Eye size={14} /> View Solutions
            </button>

            {/* Download analysis button */}
            <button
              onClick={handlePdfDownload}
              disabled={pdfGenerating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[var(--bg2)] hover:bg-[var(--bg3)] text-[var(--text)] border border-[var(--border)] font-mono text-xs uppercase tracking-widest font-bold transition-all disabled:opacity-50"
            >
              {pdfGenerating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Download Report
                </>
              )}
            </button>
          </div>
        </header>

        {/* CONTENT PANELS CONTAINER */}
        <main className="p-6 md:p-8 space-y-10 max-w-7xl w-full mx-auto flex-1">
          
          {/* PREDICTED PERCENTILE CARD (COMING SOON) */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[var(--bg2)] to-[var(--bg3)] border border-[var(--border)] rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 blur-3xl rounded-full pointer-events-none" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[var(--text)]">
                  Percentile Prediction Engine
                </h3>
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase font-mono">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-[var(--text2)] leading-relaxed max-w-xl">
                Marks-vs-percentile datasets are being compiled into the engine. Dynamic percentile mapping based on active peer attempt distributions will be available in V3.
              </p>
            </div>
            <div className="flex-shrink-0 bg-black/20 px-5 py-3 rounded-2xl border border-[var(--border)] text-center min-w-[150px]">
              <span className="text-[9px] font-mono text-[var(--text3)] uppercase tracking-wider block mb-0.5">Predicted Percentile</span>
              <span className="text-lg font-black text-[var(--text3)]">Disabled</span>
            </div>
          </div>

          {/* SECTION 1 - PERFORMANCE OVERVIEW */}
          <section id="overview" ref={sectionRefs.overview} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-2.5">
              <Award className="text-[var(--accent)]" size={22} />
              <h2 className="text-lg md:text-xl font-black tracking-tight text-[var(--text)] uppercase font-display">
                Performance Overview
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score Ring Component */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 flex flex-col justify-between shadow-xl min-h-[300px]">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
                  <span className="text-[10px] font-mono text-[var(--text2)] uppercase tracking-widest font-bold">Total Score Card</span>
                  <Award size={14} className="text-[var(--accent)]" />
                </div>

                <div className="flex flex-col items-center justify-center my-2 relative">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="66"
                      className="stroke-[var(--bg3)]"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="66"
                      className="stroke-[var(--accent)] transition-all duration-1000 ease-out"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 66}
                      strokeDashoffset={2 * Math.PI * 66 * (1 - Math.max(0, Math.min(100, (stats.overview.totalScore / stats.overview.maxScore))) )}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-[var(--text)] tracking-tight">{stats.overview.totalScore}</span>
                    <span className="text-[9px] font-mono text-[var(--text3)] uppercase tracking-wider font-bold">
                      / {stats.overview.maxScore} Marks
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4 mt-4 text-center">
                  <div>
                    <span className="text-[9px] font-mono text-[var(--text3)] uppercase tracking-wider block mb-0.5">Positive Marks</span>
                    <span className="text-md font-bold text-[var(--green)]">+{stats.overview.positiveMarks}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-[var(--text3)] uppercase tracking-wider block mb-0.5">Negative Marks</span>
                    <span className="text-md font-bold text-[var(--red)]">-{stats.overview.negativeMarks}</span>
                  </div>
                </div>
              </div>

              {/* KPI metrics cards */}
              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-wider font-bold">Total Accuracy</span>
                  <div className="mt-2.5">
                    <span className="text-3xl font-black text-[var(--green)]">{stats.overview.accuracy}%</span>
                    <div className="w-full bg-[var(--bg3)] h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div className="bg-[var(--green)] h-full rounded-full" style={{ width: `${stats.overview.accuracy}%` }} />
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-wider font-bold">Attempt Rate</span>
                  <div className="mt-2.5">
                    <span className="text-3xl font-black text-[var(--accent)]">
                      {Math.round((stats.overview.questionsAttempted / (stats.overview.questionsAttempted + stats.overview.questionsUnattempted)) * 100)}%
                    </span>
                    <span className="text-[10px] text-[var(--text3)] block mt-1">
                      {stats.overview.questionsAttempted} / {stats.overview.questionsAttempted + stats.overview.questionsUnattempted} Qs
                    </span>
                  </div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-wider font-bold">Time Taken</span>
                  <div className="mt-2.5">
                    <span className="text-xl sm:text-2xl font-black text-[var(--text)] font-mono">{formatSeconds(stats.overview.timeTaken)}</span>
                    <span className="text-[10px] text-[var(--text3)] block mt-1">
                      Avg pace: {formatSeconds(stats.timeAnalysis.avgTimePerQuestion)} / question
                    </span>
                  </div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-wider font-bold">Correct Answers</span>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-3xl font-black text-[var(--green)]">{stats.overview.questionsCorrect}</span>
                    <CheckCircle2 className="text-[var(--green)]" size={24} />
                  </div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-wider font-bold">Incorrect Answers</span>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-3xl font-black text-[var(--red)]">{stats.overview.questionsIncorrect}</span>
                    <XCircle className="text-[var(--red)]" size={24} />
                  </div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-wider font-bold">Unattempted / Skipped</span>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-3xl font-black text-[var(--text2)]">{stats.overview.questionsUnattempted}</span>
                    <Clock className="text-[var(--text3)]" size={24} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2 - SUBJECT ANALYSIS */}
          <section id="subject" ref={sectionRefs.subject} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-2.5">
              <BookOpen className="text-[var(--accent)]" size={22} />
              <h2 className="text-lg md:text-xl font-black tracking-tight text-[var(--text)] uppercase font-display">
                Subject-wise Analysis
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Subject metrics cards */}
              <div className="lg:col-span-2 space-y-4">
                {stats.subjects.map((sub: SubjectStats) => {
                  const isLow = sub.accuracy < 50;
                  const isHigh = sub.accuracy >= 80;
                  const accColor = isHigh ? 'text-[var(--green)]' : isLow ? 'text-[var(--red)]' : 'text-[var(--accent)]';
                  return (
                    <div
                      key={sub.subjectName}
                      className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-[var(--border-hover)] transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--text)] mb-2">
                          {sub.subjectName}
                        </h3>
                        
                        <div className="grid grid-cols-3 gap-4 text-center sm:text-left">
                          <div>
                            <span className="text-[9px] font-mono text-[var(--text3)] uppercase block">Score</span>
                            <span className="text-base font-black">{sub.score} / {sub.maxMarks}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-[var(--text3)] uppercase block">Correct</span>
                            <span className="text-base font-bold text-[var(--green)]">{sub.questionsCorrect}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-[var(--text3)] uppercase block">Wrong</span>
                            <span className="text-base font-bold text-[var(--red)]">{sub.questionsIncorrect}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--border)]">
                        <div className="flex-1 sm:flex-none bg-[var(--bg2)] px-4 py-2.5 rounded-2xl border border-[var(--border)] min-w-[100px] text-center">
                          <span className="text-[9px] font-mono text-[var(--text3)] uppercase block">Pace</span>
                          <span className="text-xs font-mono font-bold">{formatSeconds(sub.avgTimePerQuestion)}/q</span>
                        </div>

                        <div className="flex-1 sm:flex-none bg-[var(--bg2)] px-4 py-2.5 rounded-2xl border border-[var(--border)] min-w-[100px] text-center">
                          <span className="text-[9px] font-mono text-[var(--text3)] uppercase block">Accuracy</span>
                          <span className={`text-base font-black ${accColor}`}>{sub.accuracy}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subject charts widget */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <span className="text-[10px] font-mono text-[var(--text2)] uppercase tracking-widest font-bold border-b border-[var(--border)] pb-3 mb-4">
                  Accuracy Comparison
                </span>
                
                <div className="h-64 w-full">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.subjects} margin={chartMargin}>
                        <CartesianGrid strokeDasharray="3 3" stroke={getThemeColor('border')} />
                        <XAxis dataKey="subjectName" stroke={getThemeColor('text2')} fontSize={10} tickFormatter={(v) => v.substring(0, 4).toUpperCase()} />
                        <YAxis stroke={getThemeColor('text2')} fontSize={10} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--bg2)', borderColor: 'var(--border)' }}
                          itemStyle={{ color: 'var(--text)' }}
                          labelStyle={{ color: 'var(--text2)', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="accuracy" radius={[8, 8, 0, 0]}>
                          {stats.subjects.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={getThemeColor(idx % 3 === 0 ? 'accent' : idx % 3 === 1 ? 'purple' : 'orange')} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3 - CHAPTER ANALYSIS */}
          <section id="chapter" ref={sectionRefs.chapter} className="scroll-mt-24 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2.5">
                <Layers className="text-[var(--accent)]" size={22} />
                <h2 className="text-lg md:text-xl font-black tracking-tight text-[var(--text)] uppercase font-display">
                  Chapter-wise Performance
                </h2>
              </div>

              {/* Search bar */}
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text3)]" size={16} />
                <input
                  type="text"
                  placeholder="Search chapters..."
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[var(--bg2)] text-xs border border-[var(--border)] focus:outline-none focus:border-[var(--accent)] font-mono text-[var(--text)]"
                />
              </div>
            </div>

            {/* Coverage stats table */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg2)] text-[var(--text2)] font-mono uppercase tracking-wider text-[10px] select-none">
                      <th className="py-4 px-6 cursor-pointer hover:text-[var(--text)]" onClick={() => handleChapterSort('chapterName')}>
                        Chapter Name {chapterSortField === 'chapterName' && (chapterSortOrder === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="py-4 px-4 cursor-pointer hover:text-[var(--text)]" onClick={() => handleChapterSort('subject')}>
                        Subject {chapterSortField === 'subject' && (chapterSortOrder === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="py-4 px-4 text-center cursor-pointer hover:text-[var(--text)]" onClick={() => handleChapterSort('questionsSeen')}>
                        Seen {chapterSortField === 'questionsSeen' && (chapterSortOrder === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="py-4 px-4 text-center cursor-pointer hover:text-[var(--text)]" onClick={() => handleChapterSort('questionsAttempted')}>
                        Attempted {chapterSortField === 'questionsAttempted' && (chapterSortOrder === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="py-4 px-4 text-center cursor-pointer hover:text-[var(--text)]" onClick={() => handleChapterSort('accuracy')}>
                        Accuracy {chapterSortField === 'accuracy' && (chapterSortOrder === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="py-4 px-4 text-center cursor-pointer hover:text-[var(--text)]" onClick={() => handleChapterSort('marksGained')}>
                        Gained {chapterSortField === 'marksGained' && (chapterSortOrder === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="py-4 px-4 text-center cursor-pointer hover:text-[var(--text)]" onClick={() => handleChapterSort('marksLost')}>
                        Lost {chapterSortField === 'marksLost' && (chapterSortOrder === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="py-4 px-4 text-center cursor-pointer hover:text-[var(--text)]" onClick={() => handleChapterSort('avgTime')}>
                        Avg Time {chapterSortField === 'avgTime' && (chapterSortOrder === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="py-4 px-6 text-right cursor-pointer hover:text-[var(--text)]" onClick={() => handleChapterSort('status')}>
                        Status {chapterSortField === 'status' && (chapterSortOrder === 'asc' ? '▲' : '▼')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-mono text-[var(--text2)]">
                    {sortedChapters.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-[var(--text3)]">
                          No matching chapter records found.
                        </td>
                      </tr>
                    ) : (
                      sortedChapters.map((c: ChapterStats) => {
                        let statusColor = 'text-[var(--red)] bg-[var(--red)]/5 border-[var(--red)]/10';
                        let statusText = 'Weak';
                        if (c.status === 'strong') {
                          statusColor = 'text-[var(--green)] bg-[var(--green)]/5 border-[var(--green)]/10';
                          statusText = 'Strong';
                        } else if (c.status === 'average') {
                          statusColor = 'text-[var(--accent)] bg-[var(--accent)]/5 border-[var(--accent)]/10';
                          statusText = 'Average';
                        }

                        return (
                          <tr key={`${c.subject}_${c.chapterName}`} className="hover:bg-[var(--bg2)]/30 text-[var(--text2)] transition-colors">
                            <td className="py-3.5 px-6 font-bold text-[var(--text)] font-sans">{c.chapterName}</td>
                            <td className="py-3.5 px-4 uppercase text-[10px] font-bold text-[var(--text3)]">{c.subject}</td>
                            <td className="py-3.5 px-4 text-center">{c.questionsSeen}</td>
                            <td className="py-3.5 px-4 text-center">{c.questionsAttempted}</td>
                            <td className="py-3.5 px-4 text-center">
                              {c.questionsAttempted > 0 ? (
                                <span className={`font-bold ${c.status === 'strong' ? 'text-[var(--green)]' : c.status === 'average' ? 'text-[var(--accent)]' : 'text-[var(--red)]'}`}>
                                  {c.accuracy}%
                                </span>
                              ) : (
                                <span className="text-[var(--text3)]">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center text-[var(--green)] font-bold">+{c.marksGained}</td>
                            <td className="py-3.5 px-4 text-center text-[var(--red)] font-bold">{c.marksLost === 0 ? '0' : c.marksLost}</td>
                            <td className="py-3.5 px-4 text-center">{formatSeconds(c.avgTime)}</td>
                            <td className="py-3.5 px-6 text-right uppercase text-[9px] font-extrabold">
                              <span className={`px-2 py-0.5 rounded-full border ${statusColor}`}>
                                {statusText}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* SECTION 4 - DIFFICULTY ANALYSIS */}
          <section id="difficulty" ref={sectionRefs.difficulty} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="text-[var(--accent)]" size={22} />
              <h2 className="text-lg md:text-xl font-black tracking-tight text-[var(--text)] uppercase font-display">
                Difficulty Analytics
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Difficulty stack charts */}
              <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <span className="text-[10px] font-mono text-[var(--text2)] uppercase tracking-widest font-bold border-b border-[var(--border)] pb-3 mb-4">
                  Accuracy by Difficulty Bucket
                </span>

                <div className="h-64 w-full">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.difficulties} margin={chartMargin}>
                        <CartesianGrid strokeDasharray="3 3" stroke={getThemeColor('border')} />
                        <XAxis dataKey="name" stroke={getThemeColor('text2')} fontSize={10} />
                        <YAxis stroke={getThemeColor('text2')} fontSize={10} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--bg2)', borderColor: 'var(--border)' }}
                          itemStyle={{ color: 'var(--text)' }}
                          labelStyle={{ color: 'var(--text2)', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="accuracy" radius={[8, 8, 0, 0]}>
                          {stats.difficulties.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={getThemeColor(entry.name === 'Easy' ? 'green' : entry.name === 'Moderate' ? 'orange' : 'red')} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Difficulty summary lists */}
              <div className="space-y-4">
                {stats.difficulties.map((diff: DifficultyBucket) => {
                  let accentColor = 'text-[var(--green)]';
                  let barColor = 'bg-[var(--green)]';
                  if (diff.name === 'Moderate') {
                    accentColor = 'text-[var(--orange)]';
                    barColor = 'bg-[var(--orange)]';
                  } else if (diff.name === 'Tough') {
                    accentColor = 'text-[var(--red)]';
                    barColor = 'bg-[var(--red)]';
                  }

                  return (
                    <div key={diff.name} className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold font-mono uppercase tracking-wider ${accentColor}`}>{diff.name} Bucket</span>
                        <span className="text-xs font-mono font-bold text-[var(--text2)]">{diff.accuracy}% Accuracy</span>
                      </div>

                      <div className="w-full bg-[var(--bg3)] h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${diff.accuracy}%` }} />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono text-[var(--text3)] pt-1">
                        <div>
                          <span>Correct</span>
                          <span className="block font-bold text-[var(--text2)] mt-0.5">{diff.correct}</span>
                        </div>
                        <div>
                          <span>Wrong</span>
                          <span className="block font-bold text-[var(--text2)] mt-0.5">{diff.wrong}</span>
                        </div>
                        <div>
                          <span>Skipped</span>
                          <span className="block font-bold text-[var(--text2)] mt-0.5">{diff.skipped}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 5 - ATTEMPT ANALYSIS */}
          <section id="attempt" ref={sectionRefs.attempt} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-2.5">
              <BookOpenCheck className="text-[var(--accent)]" size={22} />
              <h2 className="text-lg md:text-xl font-black tracking-tight text-[var(--text)] uppercase font-display">
                Attempt Quality Profiling
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Attempt statistics descriptions */}
              <div className="space-y-4">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 shadow-sm">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--text)] border-b border-[var(--border)] pb-2 mb-3 flex items-center justify-between">
                    Perfect Attempts
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)]" />
                  </h3>
                  <p className="text-xs text-[var(--text2)] leading-relaxed mb-2.5">
                    Correct answer marked within the recommended pacing window. Represents solid concept retrieval.
                  </p>
                  <span className="text-xl font-black text-[var(--green)] font-mono">{stats.attempts.overall.perfect} Questions</span>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 shadow-sm">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--text)] border-b border-[var(--border)] pb-2 mb-3 flex items-center justify-between">
                    Wasted Attempts
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--red)]" />
                  </h3>
                  <p className="text-xs text-[var(--text2)] leading-relaxed mb-2.5">
                    Incorrect answer marked in under 30 seconds. Indicates a reading mistake or conceptual guess.
                  </p>
                  <span className="text-xl font-black text-[var(--red)] font-mono">{stats.attempts.overall.wasted} Questions</span>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 shadow-sm">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--text)] border-b border-[var(--border)] pb-2 mb-3 flex items-center justify-between">
                    Overtime Attempts
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--orange)]" />
                  </h3>
                  <p className="text-xs text-[var(--text2)] leading-relaxed mb-2.5">
                    Correct or wrong answers where you spent significantly longer than recommended. Gaps in pacing.
                  </p>
                  <span className="text-xl font-black text-[var(--orange)] font-mono">
                    {stats.attempts.overall.overtimeCorrect + stats.attempts.overall.overtimeMistake} Questions
                  </span>
                </div>
              </div>

              {/* Comparative attempt profiling chart */}
              <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <span className="text-[10px] font-mono text-[var(--text2)] uppercase tracking-widest font-bold border-b border-[var(--border)] pb-3 mb-4">
                  Attempt Category Distribution
                </span>

                <div className="h-72 w-full">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Perfect', count: stats.attempts.overall.perfect },
                          { name: 'Wasted', count: stats.attempts.overall.wasted },
                          { name: 'Overtime Correct', count: stats.attempts.overall.overtimeCorrect },
                          { name: 'Overtime Wrong', count: stats.attempts.overall.overtimeMistake },
                          { name: 'Confused Skip', count: stats.attempts.overall.confused },
                          { name: 'Normal Mistakes', count: stats.attempts.overall.normalMistake },
                          { name: 'Normal Skips', count: stats.attempts.overall.normalSkip }
                        ]}
                        margin={chartMargin}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={getThemeColor('border')} />
                        <XAxis dataKey="name" stroke={getThemeColor('text2')} fontSize={9} />
                        <YAxis stroke={getThemeColor('text2')} fontSize={9} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--bg2)', borderColor: 'var(--border)' }}
                          itemStyle={{ color: 'var(--text)' }}
                          labelStyle={{ color: 'var(--text2)', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {[
                            { color: 'green' },
                            { color: 'red' },
                            { color: 'accent' },
                            { color: 'orange' },
                            { color: 'purple' },
                            { color: 'text2' },
                            { color: 'text3' }
                          ].map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={getThemeColor(entry.color)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 6 - TIME ANALYSIS */}
          <section id="time" ref={sectionRefs.time} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-2.5">
              <Clock className="text-[var(--accent)]" size={22} />
              <h2 className="text-lg md:text-xl font-black tracking-tight text-[var(--text)] uppercase font-display">
                Time Pacing Insights
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Time Spent vs Accuracy */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <span className="text-[10px] font-mono text-[var(--text2)] uppercase tracking-widest font-bold border-b border-[var(--border)] pb-3 mb-4">
                  Time Spent vs Accuracy
                </span>

                <div className="h-64 w-full">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.timeAnalysis.timeSpentVsAccuracy} margin={chartMargin}>
                        <CartesianGrid strokeDasharray="3 3" stroke={getThemeColor('border')} />
                        <XAxis dataKey="bucketName" stroke={getThemeColor('text2')} fontSize={10} />
                        <YAxis stroke={getThemeColor('text2')} fontSize={10} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--bg2)', borderColor: 'var(--border)' }}
                          itemStyle={{ color: 'var(--text)' }}
                          labelStyle={{ color: 'var(--text2)', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="accuracy" fill={getThemeColor('accent')} radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Time spent per subject Pie */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <span className="text-[10px] font-mono text-[var(--text2)] uppercase tracking-widest font-bold border-b border-[var(--border)] pb-3 mb-4">
                  Subject Time Distribution
                </span>

                <div className="h-64 w-full relative flex items-center justify-center">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.timeAnalysis.subjectTimeDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {stats.timeAnalysis.subjectTimeDistribution.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={getThemeColor(idx === 0 ? 'accent' : idx === 1 ? 'purple' : 'orange')} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => formatSeconds(Number(value))}
                          contentStyle={{ backgroundColor: 'var(--bg2)', borderColor: 'var(--border)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Pacing Extremes */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xl space-y-4">
                <span className="text-[10px] font-mono text-[var(--text2)] uppercase tracking-widest font-bold border-b border-[var(--border)] pb-3 mb-4 block">
                  Pacing Extremes
                </span>

                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-mono text-[var(--text3)] uppercase block mb-2 font-bold">Fastest Solved Correct Questions</span>
                    <ul className="space-y-2 text-[11px] font-mono">
                      {stats.timeAnalysis.fastestSolved.map((f, idx) => (
                        <li key={idx} className="flex justify-between items-center bg-[var(--bg2)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
                          <span className="text-[var(--text)]">Q.{f.questionNumber} ({f.subject.toUpperCase()})</span>
                          <span className="text-[var(--green)] font-bold">{formatSeconds(f.timeTaken)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono text-[var(--text3)] uppercase block mb-2 font-bold">Slowest Attempted Questions</span>
                    <ul className="space-y-2 text-[11px] font-mono">
                      {stats.timeAnalysis.slowestSolved.map((s, idx) => (
                        <li key={idx} className="flex justify-between items-center bg-[var(--bg2)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
                          <span className="text-[var(--text)]">Q.{s.questionNumber} ({s.subject.toUpperCase()})</span>
                          <span className="text-[var(--orange)] font-bold">{formatSeconds(s.timeTaken)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 7 - QUESTION JOURNEY */}
          <section id="journey" ref={sectionRefs.journey} className="scroll-mt-24 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <FileText className="text-[var(--accent)]" size={22} />
                <h2 className="text-lg md:text-xl font-black tracking-tight text-[var(--text)] uppercase font-display">
                  Question Journey Timeline
                </h2>
              </div>

              {/* Journey Filters */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[var(--bg2)] p-1 rounded-2xl border border-[var(--border)]">
                {(['all', 'correct', 'incorrect', 'skipped', 'marked'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setJourneyFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase font-bold transition-all ${
                      journeyFilter === filter
                        ? 'bg-[var(--accent)] text-black font-extrabold'
                        : 'text-[var(--text2)] hover:text-[var(--text)]'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline palette map */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xl">
              <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 xl:grid-cols-20 gap-3">
                {filteredJourney.map((j: QuestionJourneyPoint) => {
                  let statusBg = 'bg-[var(--bg2)] border-[var(--border)] text-[var(--text2)]';
                  let icon = null;

                  if (j.status === 'correct') {
                    statusBg = 'bg-[var(--green)]/10 border-[var(--green)]/35 text-[var(--green)] font-extrabold';
                    icon = <CheckCircle2 size={10} />;
                  } else if (j.status === 'incorrect') {
                    statusBg = 'bg-[var(--red)]/10 border-[var(--red)]/35 text-[var(--red)] font-extrabold';
                    icon = <XCircle size={10} />;
                  } else if (j.status === 'marked') {
                    statusBg = 'bg-amber-500/10 border-amber-500/35 text-amber-400 font-extrabold';
                  }

                  return (
                    <button
                      key={j.id}
                      onClick={() => router.push(`/exam/${testId}/solution?attemptId=${attemptId}&q=${j.id}`)}
                      className={`h-11 rounded-2xl border flex flex-col items-center justify-center gap-0.5 hover:scale-105 active:scale-95 transition-all text-xs font-mono font-bold ${statusBg}`}
                      title={`Q.${j.questionNumber} | Click to view solution`}
                    >
                      <span>{j.questionNumber}</span>
                      {icon}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 8 - QUESTION-BY-QUESTION ANALYSIS */}
          <section id="qbyq" ref={sectionRefs.qbyq} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-2.5">
              <Layers className="text-[var(--accent)]" size={22} />
              <h2 className="text-lg md:text-xl font-black tracking-tight text-[var(--text)] uppercase font-display">
                Question-by-Question Analysis
              </h2>
            </div>

            {/* Filters bar */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Subject filter */}
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-[var(--text3)] uppercase block font-bold">Subject Filter</span>
                  <select
                    value={qSubjectFilter}
                    onChange={(e) => setQSubjectFilter(e.target.value)}
                    className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg2)] text-xs border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)] font-mono"
                  >
                    <option value="all">All Subjects</option>
                    <option value="physics">Physics</option>
                    <option value="chemistry">Chemistry</option>
                    <option value="mathematics">Mathematics</option>
                  </select>
                </div>

                {/* Difficulty filter */}
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-[var(--text3)] uppercase block font-bold">Difficulty Filter</span>
                  <select
                    value={qDiffFilter}
                    onChange={(e) => setQDiffFilter(e.target.value)}
                    className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg2)] text-xs border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)] font-mono"
                  >
                    <option value="all">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="tough">Tough</option>
                  </select>
                </div>

                {/* Status filter */}
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-[var(--text3)] uppercase block font-bold">Correctness Status</span>
                  <select
                    value={qStatusFilter}
                    onChange={(e) => setQStatusFilter(e.target.value)}
                    className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg2)] text-xs border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)] font-mono"
                  >
                    <option value="all">All Attempt States</option>
                    <option value="correct">Correct</option>
                    <option value="incorrect">Incorrect</option>
                    <option value="skipped">Skipped</option>
                  </select>
                </div>
              </div>

              {/* Text search */}
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text3)]" size={16} />
                <input
                  type="text"
                  placeholder="Filter by chapter name or question index..."
                  value={qSearch}
                  onChange={(e) => setQSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--bg2)] text-xs border border-[var(--border)] focus:outline-none focus:border-[var(--accent)] font-mono text-[var(--text)]"
                />
              </div>
            </div>

            {/* Questions Table */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto font-mono text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg2)] text-[var(--text2)] uppercase tracking-wider text-[10px]">
                      <th className="py-4 px-6 text-center">No.</th>
                      <th className="py-4 px-4">Subject</th>
                      <th className="py-4 px-4">Chapter</th>
                      <th className="py-4 px-4">Difficulty</th>
                      <th className="py-4 px-4 text-center">Time Spent</th>
                      <th className="py-4 px-4 text-center">Status</th>
                      <th className="py-4 px-4 text-center">Marks</th>
                      <th className="py-4 px-4 text-center">Response</th>
                      <th className="py-4 px-4 text-center">Correct Key</th>
                      <th className="py-4 px-6 text-right">Solutions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-[var(--text2)]">
                    {filteredQuestions.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-[var(--text3)]">
                          No questions matched active search/filters.
                        </td>
                      </tr>
                    ) : (
                      filteredQuestions.map((q: QuestionRow) => {
                        let statusColor = 'text-[var(--text3)]';
                        if (q.attemptStatus === 'Correct') statusColor = 'text-[var(--green)] font-bold';
                        else if (q.attemptStatus === 'Incorrect') statusColor = 'text-[var(--red)] font-bold';

                        let diffColor = 'text-slate-400 bg-slate-900 border-slate-800';
                        if (q.difficulty === 'Easy') diffColor = 'text-[var(--green)] bg-[var(--green)]/5 border-[var(--green)]/15';
                        else if (q.difficulty === 'Moderate') diffColor = 'text-[var(--orange)] bg-[var(--orange)]/5 border-[var(--orange)]/15';
                        else if (q.difficulty === 'Tough') diffColor = 'text-[var(--red)] bg-[var(--red)]/5 border-[var(--red)]/15';

                        return (
                          <tr key={q.id} className="hover:bg-[var(--bg2)]/30 text-[var(--text2)] transition-colors">
                            <td className="py-3.5 px-6 text-center font-bold text-[var(--text)]">{q.questionNumber}</td>
                            <td className="py-3.5 px-4 uppercase text-[10px] font-bold text-[var(--text3)]">{q.subject}</td>
                            <td className="py-3.5 px-4 font-sans text-[var(--text)]">{q.chapter}</td>
                            <td className="py-3.5 px-4 uppercase text-[9px] font-bold">
                              <span className={`px-2 py-0.5 rounded-full border ${diffColor}`}>
                                {q.difficulty}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">{formatSeconds(q.timeTaken)}</td>
                            <td className={`py-3.5 px-4 text-center uppercase text-[10px] ${statusColor}`}>{q.attemptStatus}</td>
                            <td className="py-3.5 px-4 text-center">
                              {q.attemptStatus === 'Correct' ? (
                                <span className="text-[var(--green)] font-bold">+{q.marksAwarded}</span>
                              ) : q.attemptStatus === 'Incorrect' ? (
                                <span className="text-[var(--red)] font-bold">{q.negativeMarks}</span>
                              ) : (
                                <span className="text-[var(--text3)]">0</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-[var(--text)] truncate max-w-[100px]">{q.studentResponse}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-[var(--green)]">{q.correctAnswer}</td>
                            <td className="py-3.5 px-6 text-right">
                              <button
                                onClick={() => router.push(`/exam/${testId}/solution?attemptId=${attemptId}&q=${q.id}`)}
                                className="px-3 py-1 rounded-xl bg-[var(--bg2)] hover:bg-[var(--accent)] hover:text-black border border-[var(--border)] transition-all uppercase text-[9px] font-extrabold flex items-center gap-1 ml-auto"
                              >
                                View <ChevronRight size={10} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* SECTION 9 - SUBJECT MOVEMENT */}
          <section id="movement" ref={sectionRefs.movement} className="scroll-mt-24 space-y-6">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="text-[var(--accent)]" size={22} />
              <h2 className="text-lg md:text-xl font-black tracking-tight text-[var(--text)] uppercase font-display">
                Running Score Progression
              </h2>
            </div>

            {/* Score progression chart */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[var(--text2)] uppercase tracking-widest font-bold border-b border-[var(--border)] pb-3 mb-4">
                Cumulative Marks Timeline
              </span>

              <div className="h-80 w-full">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.subjectMovement} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" stroke={getThemeColor('border')} />
                      <XAxis dataKey="questionNumber" stroke={getThemeColor('text2')} fontSize={10} />
                      <YAxis stroke={getThemeColor('text2')} fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg2)', borderColor: 'var(--border)' }}
                        itemStyle={{ color: 'var(--text)' }}
                        labelStyle={{ color: 'var(--text2)', fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Line
                        type="monotone"
                        dataKey="physicsScore"
                        name="Physics"
                        stroke={getThemeColor('accent')}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="chemistryScore"
                        name="Chemistry"
                        stroke={getThemeColor('orange')}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="mathScore"
                        name="Mathematics"
                        stroke={getThemeColor('purple')}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="totalScore"
                        name="Total Cumulative"
                        stroke={getThemeColor('text')}
                        strokeWidth={3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
