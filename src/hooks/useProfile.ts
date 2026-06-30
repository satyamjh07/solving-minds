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
  streak?: number;
  lifetime_atoms?: number;
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
        // The profiles row does not exist yet (PostgREST status 406 or null)! Let's initialize a default one.
        const defaultProfile = {
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
          email: user.email || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          class: '',
          target_year: '',
          bio: 'A fresh mind ready to solve.'
        };
        
        // Attempt to insert default profile row in Supabase with minimum required columns
        // to prevent check constraint violations (like empty string check constraints on class/year)
        // or non-nullable column violations.
        const { data: newProfile, error: dbErr } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name: defaultProfile.name,
            email: defaultProfile.email,
            avatar_url: defaultProfile.avatar_url
          })
          .select()
          .single();
        
        if (newProfile) {
          setProfile(newProfile);
          sessionStorage.setItem('user_profile', JSON.stringify(newProfile));
        } else {
          // Fallback if DB insert has delays or RLS restrictions — return local mock until onboarding upsert
          setProfile(defaultProfile as any);
          sessionStorage.setItem('user_profile', JSON.stringify(defaultProfile));
        }
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
