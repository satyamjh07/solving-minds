'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface Post {
  id: string;
  user_id: string;
  content: string;
  title: string;
  image_url: string;
  image_urls: string[] | string;
  created_at: string;
  profiles: {
    id: string;
    name: string;
    avatar_url: string;
    class: string;
    target_year: string;
    role: string;
  };
  tags: string[] | null;
  score: number;
  myVote: number;
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPosts() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: postsData, error } = await supabase
      .from('posts')
      .select('*, profiles(id, name, avatar_url, class, target_year, role)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !postsData) {
      setLoading(false);
      return;
    }

    const postIds = postsData.map(p => p.id);
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
      score: scoreMap[p.id] || 0,
      myVote: myVoteMap[p.id] || 0,
    }));

    setPosts(formattedPosts);
    setLoading(false);
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  return { posts, setPosts, loading, refetch: fetchPosts };
}
