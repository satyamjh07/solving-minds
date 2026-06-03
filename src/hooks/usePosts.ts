'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface Post {
  id: string;
  user_id: string;
  content: string;
  title: string;
  image_url?: string;
  image_urls: string[] | string;
  created_at: string;
  profiles: {
    id: string;
    name: string;
    avatar_url: string;
    class: string;
    target_year: string;
    role: string;
    muted_until: string | null;
  };
  tags: string[] | null;
  score: number;
  myVote: number;
}

interface PostFilters {
  type?: 'all' | 'my' | 'popular';
  targetYear?: string;
  class_?: string;
  tag?: string;
  timeRange?: string;
}

export function usePosts(filters: PostFilters = {}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPosts() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('posts')
      .select('id, user_id, title, content, image_urls, tags, created_at, profiles!inner(id, name, avatar_url, class, target_year, role, muted_until)');

    // Apply Filters Server-side
    if (filters.type === 'my' && user) {
      query = query.eq('user_id', user.id);
    }
    
    if (filters.targetYear && filters.targetYear !== 'ALL') {
      query = query.eq('profiles.target_year', filters.targetYear);
    }

    if (filters.class_ && filters.class_ !== 'ALL') {
       query = query.eq('profiles.class', filters.class_);
    }

    if (filters.tag && filters.tag !== 'ALL') {
      query = query.contains('tags', [filters.tag]);
    }

    if (filters.timeRange && filters.timeRange !== 'ALL') {
      const now = new Date();
      let dateLimit = new Date();
      if (filters.timeRange === 'TODAY') {
        dateLimit.setHours(0, 0, 0, 0);
        query = query.gte('created_at', dateLimit.toISOString());
      } else if (filters.timeRange === 'YESTERDAY') {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfYesterday = new Date();
        startOfYesterday.setDate(now.getDate() - 1);
        startOfYesterday.setHours(0, 0, 0, 0);
        query = query.gte('created_at', startOfYesterday.toISOString())
                     .lt('created_at', startOfToday.toISOString());
      } else if (filters.timeRange === '1_WEEK') {
        dateLimit.setDate(now.getDate() - 7);
        query = query.gte('created_at', dateLimit.toISOString());
      } else if (filters.timeRange === '1_MONTH') {
        dateLimit.setMonth(now.getMonth() - 1);
        query = query.gte('created_at', dateLimit.toISOString());
      }
    }

    query = query.order('created_at', { ascending: false }).limit(30);

    const { data: postsData, error } = await query;

    if (error || !postsData) {
      console.error('Fetch error:', error);
      setLoading(false);
      return;
    }

    const postIds = postsData.map(p => p.id);
    if (postIds.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const [{ data: voteCounts }, { data: myVotes }] = await Promise.all([
      supabase.from('votes').select('post_id, value').in('post_id', postIds),
      user
        ? supabase.from('votes').select('post_id, value').eq('user_id', user.id).in('post_id', postIds)
        : { data: [] },
    ]);

    const scoreMap: Record<string, number> = {};
    (voteCounts || []).forEach(v => { scoreMap[v.post_id] = (scoreMap[v.post_id] || 0) + v.value; });
    
    const myVoteMap: Record<string, number> = {};
    (myVotes || []).forEach(v => { myVoteMap[v.post_id] = v.value; });

    const formattedPosts = postsData.map(p => ({
      ...p,
      profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
      score: scoreMap[p.id] || 0,
      myVote: myVoteMap[p.id] || 0,
    } as unknown as Post));

    // Client-side popular filter (since score isn't a column)
    let finalPosts = formattedPosts;
    if (filters.type === 'popular') {
      finalPosts = formattedPosts.filter(p => p.score >= 10);
    }

    setPosts(finalPosts);
    setLoading(false);
  }

  useEffect(() => {
    fetchPosts();
  }, [JSON.stringify(filters)]); // Re-run when filters change

  return { posts, setPosts, loading, refetch: fetchPosts };
}
