'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface Profile {
  id: string;
  name: string;
  email: string;
  class: string;
  target_year: string;
  bio: string;
  avatar_url: string;
  role: string;
  theme: string;
  aura_score: number;
  aura_level: string;
  muted_until: string | null;
  daily_target: number;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (force = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        sessionStorage.removeItem('user_profile');
        setProfile(null);
        setLoading(false);
        return;
      }

      // Check Cache
      if (!force) {
        const cached = sessionStorage.getItem('user_profile');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.id === user.id) {
              setProfile(parsed);
              setLoading(false);
              return;
            }
          } catch (_) {
            sessionStorage.removeItem('user_profile');
          }
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setProfile(data);
        sessionStorage.setItem('user_profile', JSON.stringify(data));
      } else {
        setProfile(null);
        sessionStorage.removeItem('user_profile');
      }
    } catch (err) {
      console.error('Error in useProfile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return { profile, loading, refetch: () => fetchProfile(true) };
}
