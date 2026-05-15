'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  class: string | null;
  target_year: number | string | null;
  role: string | null;
  aura_score: number;
  rank: number;
}

export function useLeaderboard(mode: 'daily' | 'weekly' = 'weekly') {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true);
      try {
        const now = new Date();
        let since: string;
        
        if (mode === 'daily') {
          since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
        } else {
          const dow = now.getUTCDay();
          const daysBack = (dow + 6) % 7;
          since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBack)).toISOString();
        }

        // Try RPC first
        const { data, error } = await supabase.rpc('get_leaderboard', {
          since_ts: since,
          row_limit: 10
        });

        if (!error && data) {
          setEntries(data.map((r: any, idx: number) => ({
            ...r,
            rank: idx + 1
          })));
        } else {
          // Fallback: Fetch from the dedicated aura_leaderboard table
          console.warn('Leaderboard RPC failed or not found, falling back to aura_leaderboard table.');
          const { data: leaderboardData, error: lErr } = await supabase
            .from('aura_leaderboard')
            .select('*')
            .order('aura_score', { ascending: false })
            .limit(10);
          
          if (leaderboardData) {
              setEntries(leaderboardData.map((p, idx) => ({
                  user_id: p.id,
                  name: p.name,
                  avatar_url: p.avatar_url,
                  class: p.class,
                  target_year: p.target_year,
                  role: p.role || 'user',
                  aura_score: Number(p.aura_score) || 0,
                  rank: p.rank || (idx + 1)
              })));
          }
        }
      } catch (err) {
        console.error('Error loading leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, [mode]);

  return { entries, loading };
}
