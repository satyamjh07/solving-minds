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

        // STRATEGY: 
        // 1. For Global ranking (or as fallback), use profiles table (Source of Truth for NEW Aura Score)
        // 2. For Daily/Weekly, we try the RPC to get active users, but map their activity to Aura Score logic
        
        console.log(`Fetching ${mode} leaderboard...`);

        if (mode === 'daily' || mode === 'weekly') {
          // Attempt RPC for periodic data
          const { data: rpcData, error: rpcErr } = await supabase.rpc('get_leaderboard', {
            since_ts: since,
            row_limit: 10
          });

          if (!rpcErr && rpcData && rpcData.length > 0) {
            console.log(`${mode} RPC data found:`, rpcData);
            setEntries(rpcData.map((r: any, idx: number) => ({
              user_id: r.user_id || r.id,
              name: r.name,
              avatar_url: r.avatar_url,
              class: r.class,
              target_year: r.target_year,
              role: r.role,
              // Map legacy total_seconds to a relative aura score for the period
              // Formula: (seconds / 360) * 10 (approx 10 points per 6 mins of work)
              aura_score: Math.floor((r.total_seconds || 0) / 36) || 0,
              rank: idx + 1
            })));
            return;
          }
        }

        // FALLBACK / GLOBAL: Query profiles directly
        // This ensures the NEW aura_score from the profiles table is used.
        const { data: profileData, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .order('aura_score', { ascending: false })
          .limit(10);
        
        if (profileData) {
          console.log('Using profiles for leaderboard:', profileData);
          setEntries(profileData.map((p, idx) => ({
            user_id: p.id,
            name: p.name,
            avatar_url: p.avatar_url,
            class: p.class,
            target_year: p.target_year,
            role: p.role || 'user',
            aura_score: Number(p.aura_score) || 0,
            rank: idx + 1
          })));
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
