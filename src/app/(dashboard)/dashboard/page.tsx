'use client';

import React, { useMemo, useState, useEffect } from 'react';
import './homepage.css';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase/client';
import { useDialog } from '@/components/DialogProvider';
import { 
  Zap, Clock, Target, Award,
  ClipboardList, BookOpen, RotateCcw,
  ChevronRight, Brain, BookMarked,
  GraduationCap, Beaker, Library,
  TrendingUp, Flame
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { profile } = useProfile();
  const { data, loading } = useDashboardAnalytics(profile?.id);
  
  const [banners, setBanners] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [activeRecTab, setActiveRecTab] = useState('weak');
  const [activeTests, setActiveTests] = useState<any[]>([]);

  useEffect(() => {
    async function fetchBanners() {
      const { data, error } = await supabase.from('banners').select('*').eq('is_active', true);
      if (error || !data || data.length === 0) {
        setBanners([
          {
            title: "REAL NTA EXPERIENCE",
            subtitle: "19 JEE Main Previous Year Papers Live",
            button_text: "Attempt Now",
            button_link: "/tests",
            image_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop"
          },
          {
            title: "NEW BOOKLET RELEASED",
            subtitle: "Physics Galaxy Mechanics",
            button_text: "Explore Booklets",
            button_link: "/solving",
            image_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop"
          },
          {
            title: "REVISION SYSTEM",
            subtitle: "Coming Soon",
            button_text: "Learn More",
            button_link: "/community",
            image_url: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1200&auto=format&fit=crop"
          }
        ]);
      } else {
        setBanners(data);
      }
    }
    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

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
        console.error("Failed to fetch session", err);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-cyan-500 font-mono animate-pulse text-xs uppercase tracking-widest">Loading Command Center...</div>
      </div>
    );
  }

  return (
    <div className="sm-homepage-center">
      {/* 1. Dynamic Banner Slider */}
      <section className="sm-banner-container">
        {banners.map((banner, idx) => (
          <div key={idx} className={`sm-banner-slide ${idx === currentSlide ? 'active' : ''}`}>
            <img src={banner.image_url} alt={banner.title} className="sm-banner-image" />
            <div className="sm-banner-overlay"></div>
            <div className="sm-banner-content">
              <div className="sm-banner-title">{banner.title}</div>
              <div className="sm-banner-subtitle">{banner.subtitle}</div>
              <Link href={banner.button_link || '#'} className="sm-btn-primary">
                {banner.button_text || 'Explore'} <ChevronRight size={16} className="ml-1" />
              </Link>
            </div>
          </div>
        ))}
        {banners.length > 1 && (
          <div className="sm-banner-dots">
            {banners.map((_, idx) => (
              <div 
                key={idx} 
                className={`sm-banner-dot ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
              ></div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Continue Learning */}
      <section>
        <div className="sm-section-title">Continue Learning</div>
        {sessionLoading ? (
          <div className="sm-card sm-continue-card animate-pulse">
            <div className="h-16 bg-white/5 rounded w-full"></div>
          </div>
        ) : activeSession ? (
          <div className="sm-card sm-continue-card">
            <div className="sm-continue-info">
              <div className="sm-continue-subject">{activeSession.subject}</div>
              <div className="sm-continue-chapter">{activeSession.chapter}</div>
              <div className="sm-progress-wrap mt-4">
                <div className="sm-progress-text">
                  <span>Session Progress</span>
                  <span>{activeSession.solved} / {activeSession.total} Questions</span>
                </div>
                <div className="sm-progress-bar-bg">
                  <div className="sm-progress-bar-fill" style={{ width: `${activeSession.progress}%` }}></div>
                </div>
              </div>
            </div>
            <div className="sm-continue-action">
              <Link 
                href={`/solving?exam=${encodeURIComponent(activeSession.examType)}&subject=${encodeURIComponent(activeSession.subject)}&chapter=${encodeURIComponent(activeSession.chapter)}`} 
                className="sm-btn-primary"
              >
                Continue Practice
              </Link>
            </div>
          </div>
        ) : (
          <div className="sm-card sm-continue-card">
            <div className="sm-continue-info">
              <div className="sm-continue-chapter">No Active Sessions</div>
              <div className="sm-continue-subject text-gray-500">Ready to level up?</div>
              <div className="text-sm text-gray-400 mt-2">Pick a chapter and start your first practice session. Your progress will be saved here.</div>
            </div>
            <div className="sm-continue-action">
              <Link href="/solving" className="sm-btn-primary">
                Start Practice
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 3. Quick Access */}
      <section>
        <div className="sm-section-title">Quick Access</div>
        <div className="sm-qa-grid">
          <Link href="/solving" className="sm-qa-btn">
            <Zap size={24} className="sm-qa-icon" />
            <div className="sm-qa-label">Practice</div>
          </Link>
          <Link href="/tests" className="sm-qa-btn">
            <ClipboardList size={24} className="sm-qa-icon" />
            <div className="sm-qa-label">Mock Tests</div>
          </Link>
          <Link href="/solving" className="sm-qa-btn">
            <BookOpen size={24} className="sm-qa-icon" />
            <div className="sm-qa-label">Booklets</div>
          </Link>
          <Link href="/solving" className="sm-qa-btn">
            <RotateCcw size={24} className="sm-qa-icon" />
            <div className="sm-qa-label">Revision</div>
          </Link>
          <Link href="/levelup" className="sm-qa-btn">
            <Award size={24} className="sm-qa-icon" />
            <div className="sm-qa-label">Leaderboard</div>
          </Link>
        </div>
      </section>

      {/* 4. Daily Progress */}
      <section>
        <div className="sm-section-title">Daily Progress</div>
        <div className="sm-kpi-grid">
          <div className="sm-card sm-kpi-card">
            <div className="sm-kpi-icon-wrap sm-c-orange">
              <Flame size={20} />
            </div>
            <div>
              <div className="sm-kpi-val">{data?.streak.current || 0}</div>
              <div className="sm-kpi-label">Day Streak</div>
            </div>
          </div>
          <div className="sm-card sm-kpi-card">
            <div className="sm-kpi-icon-wrap sm-c-purple">
              <Award size={20} />
            </div>
            <div>
              <div className="sm-kpi-val">{profile?.aura_score || 0}</div>
              <div className="sm-kpi-label">Atoms</div>
            </div>
          </div>
          <div className="sm-card sm-kpi-card">
            <div className="sm-kpi-icon-wrap sm-c-green">
              <Target size={20} />
            </div>
            <div>
              <div className="sm-kpi-val">{data?.accuracy.overall || 0}%</div>
              <div className="sm-kpi-label">Accuracy</div>
            </div>
          </div>
          <div className="sm-card sm-kpi-card">
            <div className="sm-kpi-icon-wrap sm-c-cyan">
              <Clock size={20} />
            </div>
            <div>
              <div className="sm-kpi-val">
                {(() => {
                  const totalSecs = data?.resourceAllocation.reduce((a, b) => a + b.timeSpent, 0) || 0;
                  if (totalSecs < 3600) return `${Math.round(totalSecs / 60)}m`;
                  return `${(totalSecs / 3600).toFixed(1)}h`;
                })()}
              </div>
              <div className="sm-kpi-label">Study Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Recommended For You */}
      <section>
        <div className="sm-section-title">Recommended For You</div>
        <div className="sm-tabs">
          <div className={`sm-tab ${activeRecTab === 'weak' ? 'active' : ''}`} onClick={() => setActiveRecTab('weak')}>Weak Chapters</div>
          <div className={`sm-tab ${activeRecTab === 'tests' ? 'active' : ''}`} onClick={() => setActiveRecTab('tests')}>Mock Tests</div>
          <div className={`sm-tab ${activeRecTab === 'revision' ? 'active' : ''}`} onClick={() => setActiveRecTab('revision')}>Revision</div>
          <div className={`sm-tab ${activeRecTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveRecTab('ai')}>AI Beta</div>
        </div>
        
        <div className="sm-rec-grid">
          {activeRecTab === 'weak' && (
            data?.chapters.weak && data.chapters.weak.filter((c: any) => c.accuracy >= 20 && c.accuracy <= 70).length > 0 ? (
              data.chapters.weak.filter((c: any) => c.accuracy >= 20 && c.accuracy <= 70).slice(0, 4).map((c: any, i: number) => (
                <div key={i} className="sm-card sm-rec-card">
                  <div>
                    <div className="sm-rec-meta uppercase tracking-wider text-red-500 mb-1">{c.subject}</div>
                    <div className="sm-rec-title">{c.chapter}</div>
                  </div>
                  <div className="sm-rec-footer">
                    <span className="text-sm font-bold text-red-500">{c.accuracy}% Accuracy</span>
                    <Link href={`/solving?subject=${c.subject}&chapter=${encodeURIComponent(c.chapter)}`} className="text-xs font-bold text-cyan-500 hover:text-cyan-400">PRACTICE</Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-gray-500 text-sm">No weak chapters identified yet. Keep practicing!</div>
            )
          )}
          
          {activeRecTab === 'tests' && (
            activeTests.length > 0 ? (
              activeTests.map(test => (
                <div key={test.id} className="sm-card sm-rec-card border-cyan-500/30 bg-cyan-500/5">
                  <div>
                    <div className="sm-rec-meta uppercase tracking-wider text-cyan-500 mb-1">{test.exam_type}</div>
                    <div className="sm-rec-title">{test.title}</div>
                  </div>
                  <div className="sm-rec-footer">
                    <span className="text-xs text-gray-400">{test.total_questions} Questions • {test.duration} Mins</span>
                    <Link href="/tests" className="text-xs font-bold text-cyan-500 hover:text-cyan-400">RESUME</Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-gray-500 text-sm">No active mock tests right now. Start one from the Mock Tests section!</div>
            )
          )}

          {activeRecTab === 'revision' && (
            <div className="col-span-full py-8 text-center text-gray-500 text-sm">Review your solved questions from the past week to reinforce memory.</div>
          )}

          {activeRecTab === 'ai' && (
            <div className="sm-card sm-rec-card col-span-full bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-purple-500/20">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="text-purple-400" />
                <span className="font-bold text-lg">AI Protocol</span>
              </div>
              <p className="text-sm text-gray-400 mb-4">Our neural engine is analyzing your solving patterns. Personalized hyper-optimization paths will appear here soon.</p>
              <div className="text-xs font-bold uppercase tracking-widest text-purple-400">Status: Calibrating</div>
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
              <div key={exam.name} className="sm-card sm-exam-card relative opacity-70">
                <span className="absolute top-2 right-2 text-[0.6rem] font-bold uppercase tracking-wider bg-[var(--bg3)] text-[var(--text2)] px-2 py-1 rounded">Soon</span>
                <div className="sm-exam-logo overflow-hidden bg-white/5 p-0">
                  <img src={exam.logo} alt={exam.name} className="w-full h-full object-contain p-2" />
                </div>
                <div className="sm-exam-name">{exam.name}</div>
              </div>
            ) : (
              <Link key={exam.name} href={`/solving?exam=${encodeURIComponent(exam.id)}`} className="sm-card sm-exam-card">
                <div className="sm-exam-logo overflow-hidden bg-white/5 p-0">
                  <img src={exam.logo} alt={exam.name} className="w-full h-full object-contain p-2" />
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
            <span className="sm-soon-badge">Soon</span>
            <BookMarked size={24} className="text-cyan-500" />
            <div className="sm-soon-title">Concept Notes</div>
            <div className="sm-soon-desc">High-yield revision notes tailored to exact exam syllabus.</div>
          </div>
          <div className="sm-card sm-soon-card">
            <span className="sm-soon-badge">Soon</span>
            <Library size={24} className="text-green-500" />
            <div className="sm-soon-title">NCERT Toolkit</div>
            <div className="sm-soon-desc">Line-by-line NCERT extraction for Chemistry and Physics.</div>
          </div>
          <div className="sm-card sm-soon-card">
            <span className="sm-soon-badge">Beta</span>
            <GraduationCap size={24} className="text-purple-500" />
            <div className="sm-soon-title">Mentorship</div>
            <div className="sm-soon-desc">Direct guidance from IITians and top rankers.</div>
          </div>
          <div className="sm-card sm-soon-card">
            <span className="sm-soon-badge">Soon</span>
            <Beaker size={24} className="text-orange-500" />
            <div className="sm-soon-title">Study Rooms</div>
            <div className="sm-soon-desc">Live virtual study sessions with friends.</div>
          </div>
        </div>
      </section>

    </div>
  );
}
