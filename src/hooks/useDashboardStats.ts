'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface DashboardStats {
  todayTime: number;
  weekTime: number;
  totalSessions: number;
  streak: number;
  bestStreak: number;
  accuracy: number;
  physicsAccuracy: number;
  chemistryAccuracy: number;
  mathAccuracy: number;
  atomsScore: number | string;
  atomsLeague: string;
  atomsPercentile: number | null;
  studyDates: Set<number>;
  dayTotals: number[];
}

export function useDashboardStats(userId: string | undefined) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    async function fetchStats() {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); weekStart.setHours(0,0,0,0);
      const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // 1. Sessions
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('start_time, duration_seconds')
        .eq('user_id', userId)
        .eq('status', 'complete')
        .gte('start_time', threeMonthsAgo.toISOString());

      const sess = sessions || [];
      const todaySecs = sess.filter(s => new Date(s.start_time) >= todayStart).reduce((a, s) => a + (s.duration_seconds || 0), 0);
      const weekSecs = sess.filter(s => new Date(s.start_time) >= weekStart).reduce((a, s) => a + (s.duration_seconds || 0), 0);
      const studyDates = new Set(sess.map(s => {
        const d = new Date(s.start_time); d.setHours(0,0,0,0); return d.getTime();
      }));

      // Streak
      let streak = 0;
      let checkDate = new Date(todayStart);
      while (studyDates.has(checkDate.getTime())) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      // Best streak
      let bestStreak = streak;
      let tempStreak = 0;
      const sortedDates = Array.from(studyDates).sort((a,b) => a - b);
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0 || sortedDates[i] - sortedDates[i-1] === 86400000) {
          tempStreak++;
          if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else {
          tempStreak = 1;
        }
      }

      // Weekly bars
      const dayTotals = Array(7).fill(0);
      sess.forEach(s => {
        const d = new Date(s.start_time); d.setHours(0,0,0,0);
        const diff = Math.floor((d.getTime() - weekStart.getTime()) / 86400000);
        if (diff >= 0 && diff < 7) dayTotals[diff] += (s.duration_seconds || 0);
      });

      // 2. Accuracy
      const { data: attempts } = await supabase
        .from('user_attempts')
        .select('is_correct, questions!inner(subject)')
        .eq('user_id', userId);

      const atts = attempts || [];
      const subjs: Record<string, { t: number, c: number }> = { physics: {t:0,c:0}, chemistry: {t:0,c:0}, mathematics: {t:0,c:0} };
      atts.forEach(row => {
        const s = ((row.questions as any)?.subject || '').toLowerCase();
        const normS = s === 'math' || s === 'maths' ? 'mathematics' : s;
        if (subjs[normS]) {
          subjs[normS].t++;
          if (row.is_correct) subjs[normS].c++;
        }
      });

      const totalAttempts = atts.length;
      const totalCorrect = atts.filter(a => a.is_correct).length;
      const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

      // 3. Atoms (from profile)
      const { data: profile } = await supabase.from('profiles').select('aura_score, aura_level').eq('id', userId).single();

      setStats({
        todayTime: todaySecs,
        weekTime: weekSecs,
        totalSessions: sess.length,
        streak,
        bestStreak,
        accuracy: overallAccuracy,
        physicsAccuracy: subjs.physics.t > 0 ? Math.round((subjs.physics.c / subjs.physics.t) * 100) : 0,
        chemistryAccuracy: subjs.chemistry.t > 0 ? Math.round((subjs.chemistry.c / subjs.chemistry.t) * 100) : 0,
        mathAccuracy: subjs.mathematics.t > 0 ? Math.round((subjs.mathematics.c / subjs.mathematics.t) * 100) : 0,
        atomsScore: profile?.aura_score || '—',
        atomsLeague: profile?.aura_level || '',
        atomsPercentile: null,
        studyDates,
        dayTotals
      });
      setLoading(false);
    }

    fetchStats();
  }, [userId]);

  return { stats, loading };
}
