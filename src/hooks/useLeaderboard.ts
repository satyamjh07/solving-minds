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
          // Fallback: Fetch from aura_leaderboard view or similar
          // For now, let's just return empty or attempt a limited direct query if RLS allows
          console.warn('Leaderboard RPC failed or not found, falling back to basic query.');
          const { data: profiles, error: pErr } = await supabase
            .from('profiles')
            .select('id, name, avatar_url, class, target_year, role')
            .order('aura_score', { ascending: false })
            .limit(10);
          
          if (profiles) {
              setEntries(profiles.map((p, idx) => ({
                  user_id: p.id,
                  name: p.name,
                  avatar_url: p.avatar_url,
                  class: p.class,
                  target_year: p.target_year,
                  role: p.role,
                  aura_score: p.aura_score || 0,
                  rank: idx + 1
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
