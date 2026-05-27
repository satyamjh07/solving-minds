'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { calculateAura } from '@/lib/aura';

export interface DashboardAnalytics {
  streak: { current: number; best: number };
  accuracy: { overall: number; physics: number; chemistry: number; mathematics: number };
  questionsSolved: {
    today: number;
    week: number;
    month: number;
    todayTarget: number;
    weekTarget: number;
    monthTarget: number;
  };
  performanceTrend: {
    dates: string[];
    physics: (number | null)[];
    chemistry: (number | null)[];
    mathematics: (number | null)[];
  };
  chapters: {
    top: any[];
    weak: any[];
  };
  weakTopics: any[];
  resourceAllocation: any[];
  activityMap: Record<string, number>;
  studySessions: any[];
}

export function useDashboardAnalytics(userId: string | undefined) {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        // 1. Fetch recent user_attempts joined with questions
        const { data: attempts, error: attemptsErr } = await supabase
          .from('user_attempts')
          .select('id, is_correct, created_at, questions!inner(subject, chapter, topic)')
          .eq('user_id', userId)
          .gte('created_at', threeMonthsAgo.toISOString())
          .order('created_at', { ascending: true });

        if (attemptsErr) throw attemptsErr;

        // 2. Fetch study_sessions
        const { data: sessions, error: sessionsErr } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'complete')
          .order('start_time', { ascending: true });

        if (sessionsErr) throw sessionsErr;

        // --- Processing Logic ---
        const rows = attempts || [];
        const sessRows = sessions || [];

        const activityMap: Record<string, number> = {};
        const chapterMap: Record<string, any> = {};
        const subjectMap: Record<string, { total: number; correct: number; time: number }> = {
          physics: { total: 0, correct: 0, time: 0 },
          chemistry: { total: 0, correct: 0, time: 0 },
          mathematics: { total: 0, correct: 0, time: 0 }
        };
        const sessionByDay: Record<string, any> = {};

        const isoDate = (d: Date) => d.toISOString().split('T')[0];

        rows.forEach(row => {
          const date = isoDate(new Date(row.created_at));
          const subj = ((row.questions as any)?.subject || '').toLowerCase();
          const normSubj = subj === 'math' || subj === 'maths' ? 'mathematics' : subj;
          const chap = (row.questions as any)?.chapter || 'Unknown';
          const topic = (row.questions as any)?.topic || '';
          const isCorr = !!row.is_correct;

          activityMap[date] = (activityMap[date] || 0) + 1;

          const chapKey = normSubj + '/' + chap;
          if (!chapterMap[chapKey]) {
            chapterMap[chapKey] = { subject: normSubj, chapter: chap, total: 0, correct: 0, topics: {} };
          }
          chapterMap[chapKey].total++;
          if (isCorr) chapterMap[chapKey].correct++;

          if (topic) {
            if (!chapterMap[chapKey].topics[topic]) {
              chapterMap[chapKey].topics[topic] = { total: 0, correct: 0 };
            }
            chapterMap[chapKey].topics[topic].total++;
            if (isCorr) chapterMap[chapKey].topics[topic].correct++;
          }

          if (subjectMap[normSubj]) {
            subjectMap[normSubj].total++;
            if (isCorr) subjectMap[normSubj].correct++;
          }

          const daySubjKey = date + '/' + normSubj;
          if (!sessionByDay[daySubjKey]) sessionByDay[daySubjKey] = { total: 0, correct: 0 };
          sessionByDay[daySubjKey].total++;
          if (isCorr) sessionByDay[daySubjKey].correct++;
        });

        // Add time from sessions to subjectMap
        sessRows.forEach(s => {
            const subj = (s.subject || 'physics').toLowerCase();
            const normSubj = subj === 'math' || subj === 'maths' ? 'mathematics' : subj;
            if (subjectMap[normSubj]) {
                subjectMap[normSubj].time += (s.duration_seconds || 0);
            }
        });

        // Compute streak
        const currentStreak = computeStreak(activityMap, now);
        const bestStreak = computeBestStreak(activityMap);

        // Questions solved counts
        const weekStart = new Date(now); weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); weekStart.setHours(0,0,0,0);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const todayN = rows.filter(r => new Date(r.created_at) >= todayStart).length;
        const weekN = rows.filter(r => new Date(r.created_at) >= weekStart).length;
        const monthN = rows.filter(r => new Date(r.created_at) >= monthStart).length;

        // Performance Trend (last 14 days)
        const uniqueDates = Array.from(new Set(Object.keys(sessionByDay).map(k => k.split('/')[0]))).sort();
        const last14 = uniqueDates.slice(-14);
        
        const trendData = {
          dates: last14,
          physics: last14.map(d => getAcc(sessionByDay[d + '/physics'])),
          chemistry: last14.map(d => getAcc(sessionByDay[d + '/chemistry'])),
          mathematics: last14.map(d => getAcc(sessionByDay[d + '/mathematics']))
        };

        // Chapters
        const chaptersArr = Object.values(chapterMap).map((c: any) => ({
          ...c,
          accuracy: c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0
        }));

        const topChapters = chaptersArr.filter(c => c.accuracy >= 75).sort((a,b) => b.accuracy - a.accuracy);
        const weakChapters = chaptersArr.filter(c => c.accuracy < 75).sort((a,b) => a.accuracy - b.accuracy);

        // Weak Topics
        const weakTopics: any[] = [];
        chaptersArr.filter(c => c.accuracy < 75).forEach(c => {
          Object.keys(c.topics).forEach(topicName => {
            const t = c.topics[topicName];
            const acc = Math.round((t.correct / t.total) * 100);
            weakTopics.push({
              topic: topicName,
              subject: c.subject,
              chapter: c.chapter,
              accuracy: acc,
              total: t.total
            });
          });
        });
        weakTopics.sort((a,b) => a.accuracy - b.accuracy);

        // Resource Allocation
        const resourceAllocation = Object.entries(subjectMap).map(([subj, stats]) => ({
          subject: subj,
          timeSpent: stats.time,
          totalQuestions: stats.total,
          correctQuestions: stats.correct,
          accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
          avgTimePerQ: stats.total > 0 ? Math.round(stats.time / stats.total) : 0
        }));

        setData({
          streak: { current: currentStreak, best: bestStreak },
          accuracy: {
            overall: rows.length > 0 ? Math.round((rows.filter(r => r.is_correct).length / rows.length) * 100) : 0,
            physics: subjectMap.physics.total > 0 ? Math.round((subjectMap.physics.correct / subjectMap.physics.total) * 100) : 0,
            chemistry: subjectMap.chemistry.total > 0 ? Math.round((subjectMap.chemistry.correct / subjectMap.chemistry.total) * 100) : 0,
            mathematics: subjectMap.mathematics.total > 0 ? Math.round((subjectMap.mathematics.correct / subjectMap.mathematics.total) * 100) : 0
          },
          questionsSolved: {
            today: todayN,
            week: weekN,
            month: monthN,
            todayTarget: 70,
            weekTarget: 350,
            monthTarget: 1200
          },
          performanceTrend: trendData,
          chapters: { top: topChapters, weak: weakChapters },
          weakTopics: weakTopics.slice(0, 8),
          resourceAllocation,
          activityMap,
          studySessions: sessRows
        });

        // 3. Update profile with new aura score (debounced or simple)
        const aura = calculateAura({
          totalQuestions: resourceAllocation.reduce((acc, curr) => acc + curr.totalQuestions, 0),
          streak: currentStreak,
          accuracy: rows.length > 0 ? Math.round((rows.filter(r => r.is_correct).length / rows.length) * 100) : 0
        });

        if (userId) {
          // 3.1 Update main profile
          // Since aura_leaderboard is a VIEW, it will automatically reflect 
          // changes made to the profiles table.
          await supabase
            .from('profiles')
            .update({ 
              aura_score: aura.score,
              aura_level: `Level ${aura.level}` 
            })
            .eq('id', userId);
        }

      } catch (err) {
        console.error('Error loading dashboard analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId]);

  return { data, loading };
}

function computeStreak(activityMap: Record<string, number>, now: Date) {
  let streak = 0;
  const d = new Date(now);
  d.setHours(0,0,0,0);
  
  const isoDate = (date: Date) => date.toISOString().split('T')[0];

  let checkDate = new Date(d);
  if (!activityMap[isoDate(checkDate)]) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (activityMap[isoDate(checkDate)]) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

function computeBestStreak(activityMap: Record<string, number>) {
  const dates = Object.keys(activityMap).filter(k => activityMap[k] > 0).sort();
  let best = 0;
  let current = 0;
  let prevDate: Date | null = null;

  dates.forEach(dateStr => {
    const curr = new Date(dateStr);
    if (prevDate) {
      const diff = (curr.getTime() - prevDate.getTime()) / 86400000;
      if (diff === 1) current++;
      else current = 1;
    } else {
      current = 1;
    }
    if (current > best) best = current;
    prevDate = curr;
  });
  return best;
}

function getAcc(stats: any) {
  if (!stats || stats.total === 0) return null;
  return Math.round((stats.correct / stats.total) * 100);
}
