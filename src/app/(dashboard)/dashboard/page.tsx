'use client';

import React, { useState, useEffect } from 'react';
import './homepage.css';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase/client';
import {
  Zap, Clock, Target, Award,
  ClipboardList, BookOpen, RotateCcw,
  ChevronRight, ChevronLeft, Brain, BookMarked,
  GraduationCap, Beaker, Library,
  Flame, Users, ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { profile } = useProfile();
  const { data, loading } = useDashboardAnalytics(profile?.id);

  const [banners, setBanners] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [activeRecTab, setActiveRecTab] = useState<'weak' | 'tests' | 'revision' | 'ai'>('weak');
  const [activeTests, setActiveTests] = useState<any[]>([]);

  useEffect(() => {
    async function fetchBanners() {
      const { data, error } = await supabase.from('banners').select('*').eq('is_active', true);
      if (error || !data || data.length === 0) {
        setBanners([
          {
            title: 'REAL NTA EXPERIENCE',
            subtitle: '19 JEE Main Previous Year Papers Live',
            button_text: 'Attempt Now',
            button_link: '/tests',
            image_url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop'
          },
          {
            title: 'MY MISTAKES LIBRARY',
            subtitle: 'Revise every question you got wrong, chapter & test-wise',
            button_text: 'Open Booklets',
            button_link: '/booklets',
            image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop'
          },
          {
            title: 'REVISION SYSTEM',
            subtitle: 'Coming Soon',
            button_text: 'Learn More',
            button_link: '/community',
            image_url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1200&auto=format&fit=crop'
          }
        ]);
      } else {
        setBanners(data);
      }
    }
    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length <= 1 || isBannerPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length, isBannerPaused]);

  useEffect(() => {
    if (!profile?.id) {
      setSessionLoading(false);
      return;
    }
    async function fetchSession() {
      try {
        const { data: latest } = await supabase
          .from('user_attempts')
          .select('question_id, questions!inner(subject, chapter, exam_type)')
          .eq('user_id', profile!.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!latest || latest.length === 0) {
          setSessionLoading(false);
          return;
        }

        const q = (latest[0] as any).questions;
        const { subject, chapter, exam_type } = q;

        const { count: totalQ } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('subject', subject)
          .eq('chapter', chapter)
          .eq('exam_type', exam_type);

        const { data: attemptedQ } = await supabase
          .from('user_attempts')
          .select('question_id, questions!inner(subject, chapter, exam_type)')
          .eq('user_id', profile!.id)
          .eq('questions.subject', subject)
          .eq('questions.chapter', chapter)
          .eq('questions.exam_type', exam_type);

        const uniqueAttempted = new Set(attemptedQ?.map(a => a.question_id)).size;

        setActiveSession({
          chapter,
          subject,
          examType: exam_type,
          solved: uniqueAttempted,
          total: totalQ || 0,
          progress: totalQ ? Math.min(100, Math.round((uniqueAttempted / totalQ) * 100)) : 0
        });
      } catch (err) {
        console.error('Failed to fetch session', err);
      } finally {
        setSessionLoading(false);
      }
    }
    fetchSession();

    async function fetchActiveTests() {
      const { data: attempts } = await supabase
        .from('mock_test_live_attempts')
        .select('id, test_id, completed')
        .eq('user_id', profile!.id)
        .eq('completed', false);

      if (!attempts || attempts.length === 0) return;
      const testIds = attempts.map(a => a.test_id);

      const { data: testsData } = await supabase
        .from('mock_tests')
        .select('id, title, exam_type, total_questions, duration')
        .in('id', testIds);

      if (testsData) setActiveTests(testsData);
    }
    fetchActiveTests();
  }, [profile?.id]);

  const firstName = profile?.name?.trim()?.split(/\s+/)[0];
  const weakChapters = (data?.chapters.weak || []).filter(
    (c: any) => c.accuracy >= 20 && c.accuracy <= 70
  );

  const studyTimeDisplay = (() => {
    const totalSecs = data?.resourceAllocation.reduce((a, b) => a + b.timeSpent, 0) || 0;
    if (totalSecs < 3600) return `${Math.round(totalSecs / 60)}m`;
    return `${(totalSecs / 3600).toFixed(1)}h`;
  })();

  if (loading) {
    return (
      <div className="sm-homepage-center" aria-busy="true" aria-label="Loading dashboard">
        <div className="sm-welcome-bar">
          <div>
            <div className="sm-skeleton h-7 w-52 mb-2" />
            <div className="sm-skeleton h-4 w-72" />
          </div>
          <div className="sm-skeleton h-8 w-36 rounded-full" />
        </div>
        <div className="sm-skeleton h-[230px] w-full rounded-2xl" />
        <div className="sm-skeleton h-28 w-full rounded-2xl" />
        <div className="sm-qa-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="sm-skeleton h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="sm-kpi-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="sm-skeleton h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sm-homepage-center">
      {/* 0. Greeting & Target Context */}
      <section className="sm-welcome-bar">
        <div>
          <h1 className="sm-welcome-title">
            {firstName ? `Welcome back, ${firstName}` : 'Command Center'}
          </h1>
          <p className="sm-welcome-sub">
            Pick up your practice session, attempt mock tests, or review mistakes.
          </p>
        </div>
        {(profile?.target_year || profile?.class) && (
          <div className="sm-target-pill">
            <span className="sm-target-dot" aria-hidden="true" />
            <span>
              {[
                profile?.class ? `Class ${profile.class}` : null,
                profile?.target_year ? `Target ${profile.target_year}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        )}
      </section>

      {/* 1. Dynamic Banner Slider */}
      <section
        className="sm-banner-container"
        aria-roledescription="carousel"
        aria-label="Featured announcements"
        onMouseEnter={() => setIsBannerPaused(true)}
        onMouseLeave={() => setIsBannerPaused(false)}
        onFocusCapture={() => setIsBannerPaused(true)}
        onBlurCapture={() => setIsBannerPaused(false)}
      >
        {banners.map((banner, idx) => (
          <div
            key={idx}
            className={`sm-banner-slide ${idx === currentSlide ? 'active' : ''}`}
            aria-hidden={idx !== currentSlide}
          >
            <img src={banner.image_url} alt={banner.title} className="sm-banner-image" />
            <div className="sm-banner-overlay" />
            <div className="sm-banner-content">
              <div className="sm-banner-title">{banner.title}</div>
              <div className="sm-banner-subtitle">{banner.subtitle}</div>
              <Link
                href={banner.button_link || '#'}
                tabIndex={idx === currentSlide ? 0 : -1}
                className="sm-btn-primary sm-focus-ring"
              >
                <span>{banner.button_text || 'Explore'}</span>
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        ))}

        {banners.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => setCurrentSlide(prev => (prev - 1 + banners.length) % banners.length)}
              className="sm-banner-nav prev sm-focus-ring"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => setCurrentSlide(prev => (prev + 1) % banners.length)}
              className="sm-banner-nav next sm-focus-ring"
            >
              <ChevronRight size={16} />
            </button>
            <div className="sm-banner-dots" role="tablist" aria-label="Slide navigation">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-selected={idx === currentSlide}
                  onClick={() => setCurrentSlide(idx)}
                  className={`sm-banner-dot sm-focus-ring ${idx === currentSlide ? 'active' : ''}`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* 2. Continue Learning */}
      <section>
        <div className="sm-section-title">Continue Learning</div>
        {sessionLoading ? (
          <div className="sm-card sm-continue-card">
            <div className="sm-continue-info space-y-2.5">
              <div className="sm-skeleton h-3 w-24" />
              <div className="sm-skeleton h-6 w-56" />
              <div className="sm-skeleton h-2 w-full mt-3" />
            </div>
            <div className="sm-skeleton h-10 w-36 rounded-lg" />
          </div>
        ) : activeSession ? (
          <div className="sm-card sm-card-interactive sm-continue-card">
            <div className="sm-continue-info">
              <div className="sm-continue-subject">{activeSession.subject}</div>
              <div className="sm-continue-chapter">{activeSession.chapter}</div>
              <div className="sm-progress-wrap">
                <div className="sm-progress-text">
                  <span>Session Progress ({activeSession.progress}%)</span>
                  <span>{activeSession.solved} / {activeSession.total} Questions</span>
                </div>
                <div className="sm-progress-bar-bg">
                  <div className="sm-progress-bar-fill" style={{ width: `${activeSession.progress}%` }} />
                </div>
              </div>
            </div>
            <div className="sm-continue-action">
              <Link
                href={`/solving?exam=${encodeURIComponent(activeSession.examType)}&subject=${encodeURIComponent(activeSession.subject)}&chapter=${encodeURIComponent(activeSession.chapter)}`}
                className="sm-btn-primary sm-focus-ring"
              >
                <span>Continue Practice</span>
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="sm-card sm-continue-card">
            <div className="sm-continue-info">
              <div className="sm-continue-subject">Ready to begin</div>
              <div className="sm-continue-chapter">No Active Sessions</div>
              <p className="sm-continue-desc">
                Pick a chapter and start your first practice session. Your progress will be saved here automatically.
              </p>
            </div>
            <div className="sm-continue-action">
              <Link href="/solving" className="sm-btn-primary sm-focus-ring">
                <span>Start Practice</span>
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 3. Quick Access */}
      <section>
        <div className="sm-section-title">Quick Access</div>
        <div className="sm-qa-grid">
          <Link href="/solving" className="sm-qa-btn sm-focus-ring">
            <div className="sm-qa-icon-box"><Zap size={19} /></div>
            <div className="sm-qa-label">Practice</div>
          </Link>
          <Link href="/tests" className="sm-qa-btn sm-focus-ring">
            <div className="sm-qa-icon-box"><ClipboardList size={19} /></div>
            <div className="sm-qa-label">Mock Tests</div>
          </Link>
          <Link href="/booklets" className="sm-qa-btn sm-focus-ring">
            <div className="sm-qa-icon-box"><BookOpen size={19} /></div>
            <div className="sm-qa-label">Booklets</div>
          </Link>
          <Link href="/booklets" className="sm-qa-btn sm-focus-ring">
            <div className="sm-qa-icon-box"><RotateCcw size={19} /></div>
            <div className="sm-qa-label">Revision</div>
          </Link>
          <Link href="/levelup" className="sm-qa-btn sm-focus-ring">
            <div className="sm-qa-icon-box"><Award size={19} /></div>
            <div className="sm-qa-label">Leaderboard</div>
          </Link>
          <Link href="/community" className="sm-qa-btn sm-focus-ring">
            <div className="sm-qa-icon-box"><Users size={19} /></div>
            <div className="sm-qa-label">Community</div>
          </Link>
        </div>
      </section>

      {/* 4. Daily Progress */}
      <section>
        <div className="sm-section-title">Daily Progress</div>
        <div className="sm-kpi-grid">
          <div className="sm-card sm-card-interactive sm-kpi-card">
            <div className="sm-kpi-icon-wrap sm-c-orange">
              <Flame size={19} />
            </div>
            <div>
              <div className="sm-kpi-val">{data?.streak.current || 0}</div>
              <div className="sm-kpi-label">Day Streak</div>
            </div>
          </div>
          <div className="sm-card sm-card-interactive sm-kpi-card">
            <div className="sm-kpi-icon-wrap sm-c-purple">
              <Award size={19} />
            </div>
            <div>
              <div className="sm-kpi-val">{profile?.aura_score || 0}</div>
              <div className="sm-kpi-label">Atoms</div>
            </div>
          </div>
          <div className="sm-card sm-card-interactive sm-kpi-card">
            <div className="sm-kpi-icon-wrap sm-c-green">
              <Target size={19} />
            </div>
            <div>
              <div className="sm-kpi-val">{data?.accuracy.overall || 0}%</div>
              <div className="sm-kpi-label">Accuracy</div>
            </div>
          </div>
          <div className="sm-card sm-card-interactive sm-kpi-card">
            <div className="sm-kpi-icon-wrap sm-c-cyan">
              <Clock size={19} />
            </div>
            <div>
              <div className="sm-kpi-val">{studyTimeDisplay}</div>
              <div className="sm-kpi-label">Study Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Recommended For You */}
      <section>
        <div className="sm-section-title">Recommended For You</div>
        <div className="sm-tabs" role="tablist" aria-label="Recommendations">
          {[
            { id: 'weak', label: 'Weak Chapters' },
            { id: 'tests', label: 'Mock Tests' },
            { id: 'revision', label: 'Revision' },
            { id: 'ai', label: 'AI Beta' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeRecTab === tab.id}
              className={`sm-tab sm-focus-ring ${activeRecTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveRecTab(tab.id as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="sm-rec-grid">
          {activeRecTab === 'weak' && (
            weakChapters.length > 0 ? (
              weakChapters.slice(0, 4).map((c: any, i: number) => (
                <div key={i} className="sm-card sm-card-interactive sm-rec-card">
                  <div>
                    <div className="sm-rec-meta text-[var(--red)] mb-1">{c.subject}</div>
                    <div className="sm-rec-title">{c.chapter}</div>
                  </div>
                  <div className="sm-rec-footer">
                    <span className="text-sm font-bold text-[var(--red)] tabular-nums">{c.accuracy}% Accuracy</span>
                    <Link
                      href={`/solving?subject=${encodeURIComponent(c.subject)}&chapter=${encodeURIComponent(c.chapter)}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent)] hover:underline sm-focus-ring rounded"
                    >
                      Practice <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="sm-card sm-empty-panel">
                <Target size={22} className="text-[var(--accent)]" />
                <div className="sm-empty-title">No weak chapters flagged yet</div>
                <p className="sm-empty-desc">
                  Solve questions across chapters to uncover topics between 20%–70% accuracy that need focused practice.
                </p>
                <Link href="/solving" className="sm-btn-secondary sm-focus-ring mt-2">
                  Start Practice <ChevronRight size={14} />
                </Link>
              </div>
            )
          )}

          {activeRecTab === 'tests' && (
            activeTests.length > 0 ? (
              activeTests.map(test => (
                <div key={test.id} className="sm-card sm-card-interactive sm-rec-card">
                  <div>
                    <div className="sm-rec-meta text-[var(--accent)] mb-1">{test.exam_type}</div>
                    <div className="sm-rec-title">{test.title}</div>
                  </div>
                  <div className="sm-rec-footer">
                    <span className="text-xs text-[var(--text2)] tabular-nums">
                      {test.total_questions} Questions · {test.duration} Mins
                    </span>
                    <Link
                      href="/tests"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent)] hover:underline sm-focus-ring rounded"
                    >
                      Resume <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="sm-card sm-empty-panel">
                <ClipboardList size={22} className="text-[var(--accent)]" />
                <div className="sm-empty-title">No in-progress mock tests</div>
                <p className="sm-empty-desc">
                  Start a timed JEE Main or Advanced mock test to simulate exam conditions and track your score.
                </p>
                <Link href="/tests" className="sm-btn-secondary sm-focus-ring mt-2">
                  Browse Mock Tests <ChevronRight size={14} />
                </Link>
              </div>
            )
          )}

          {activeRecTab === 'revision' && (
            <div className="sm-card sm-empty-panel">
              <BookMarked size={22} className="text-[var(--accent)]" />
              <div className="sm-empty-title">Revisit your mistakes</div>
              <p className="sm-empty-desc">
                Practice every question you got wrong in Solver sessions and Mock Tests inside My Mistakes Library.
              </p>
              <Link href="/booklets" className="sm-btn-secondary sm-focus-ring mt-2">
                Open Mistakes Library <ChevronRight size={14} />
              </Link>
            </div>
          )}

          {activeRecTab === 'ai' && (
            <div className="sm-card sm-rec-card col-span-full">
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="sm-kpi-icon-wrap sm-c-purple">
                    <Brain size={19} />
                  </div>
                  <span className="font-bold text-base text-[var(--text)]">AI Protocol</span>
                </div>
                <span className="sm-soon-badge">Calibrating</span>
              </div>
              <p className="text-sm text-[var(--text2)] leading-relaxed max-w-2xl">
                Our neural engine is analyzing your solving patterns. Personalized hyper-optimization paths will appear here soon.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 6. Explore Exams */}
      <section>
        <div className="sm-section-title">Explore Exams</div>
        <div className="sm-exam-grid">
          {[
            { id: 'jee-mains', name: 'JEE Main', logo: 'https://res.cloudinary.com/dsflyu8vg/image/upload/q_auto/f_auto/v1781265251/1714022307392-4pune-jee-main-results-decla-1599551417_qb0dhp.jpg', comingSoon: false },
            { id: 'jee-advanced', name: 'JEE Advanced', logo: 'https://res.cloudinary.com/dsflyu8vg/image/upload/q_auto/f_auto/v1781265251/jee-advance_sh2wwu.png', comingSoon: false },
            { id: 'bitsat', name: 'BITSAT', logo: 'https://res.cloudinary.com/dsflyu8vg/image/upload/q_auto/f_auto/v1781265251/BITS_Pilani-Logo.svg_o2z5v1.png', comingSoon: true },
            { id: 'iat', name: 'IAT', logo: 'https://res.cloudinary.com/dsflyu8vg/image/upload/q_auto/f_auto/v1781265252/iiser_ll9ssf.png', comingSoon: true },
            { id: 'mht-cet', name: 'MHT CET', logo: 'https://res.cloudinary.com/dsflyu8vg/image/upload/q_auto/f_auto/v1781265251/MHT-CET_logo_ejx6dg.png', comingSoon: true },
            { id: 'comedk', name: 'COMEDK', logo: 'https://res.cloudinary.com/dsflyu8vg/image/upload/q_auto/f_auto/v1781265234/comedk_gsw5ye.jpg', comingSoon: true },
          ].map((exam) => (
            exam.comingSoon ? (
              <div key={exam.name} className="sm-card sm-exam-card sm-exam-card-soon" aria-disabled="true">
                <span className="sm-soon-tag">Soon</span>
                <div className="sm-exam-logo">
                  <img src={exam.logo} alt={exam.name} className="w-full h-full object-contain" />
                </div>
                <div className="sm-exam-name">{exam.name}</div>
              </div>
            ) : (
              <Link
                key={exam.name}
                href={`/solving?exam=${encodeURIComponent(exam.id)}`}
                className="sm-card sm-card-interactive sm-exam-card sm-exam-card-active sm-focus-ring"
              >
                <div className="sm-exam-logo">
                  <img src={exam.logo} alt={exam.name} className="w-full h-full object-contain" />
                </div>
                <div className="sm-exam-name">{exam.name}</div>
              </Link>
            )
          ))}
        </div>
      </section>

      {/* 7. Coming Soon */}
      <section>
        <div className="sm-section-title">Coming Soon</div>
        <div className="sm-section-subtitle">Features actively in development</div>
        <div className="sm-soon-grid">
          <div className="sm-card sm-soon-card">
            <div className="sm-soon-top">
              <div className="sm-soon-icon-box text-[var(--accent)]">
                <BookMarked size={18} />
              </div>
              <span className="sm-soon-badge">Soon</span>
            </div>
            <div className="sm-soon-title">Concept Notes</div>
            <div className="sm-soon-desc">High-yield revision notes tailored to exact exam syllabus.</div>
          </div>
          <div className="sm-card sm-soon-card">
            <div className="sm-soon-top">
              <div className="sm-soon-icon-box text-[var(--green)]">
                <Library size={18} />
              </div>
              <span className="sm-soon-badge">Soon</span>
            </div>
            <div className="sm-soon-title">NCERT Toolkit</div>
            <div className="sm-soon-desc">Line-by-line NCERT extraction for Chemistry and Physics.</div>
          </div>
          <div className="sm-card sm-soon-card">
            <div className="sm-soon-top">
              <div className="sm-soon-icon-box text-[var(--purple)]">
                <GraduationCap size={18} />
              </div>
              <span className="sm-soon-badge">Beta</span>
            </div>
            <div className="sm-soon-title">Mentorship</div>
            <div className="sm-soon-desc">Direct guidance from IITians and top rankers.</div>
          </div>
          <div className="sm-card sm-soon-card">
            <div className="sm-soon-top">
              <div className="sm-soon-icon-box text-[var(--orange)]">
                <Beaker size={18} />
              </div>
              <span className="sm-soon-badge">Soon</span>
            </div>
            <div className="sm-soon-title">Study Rooms</div>
            <div className="sm-soon-desc">Live virtual study sessions with friends.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
