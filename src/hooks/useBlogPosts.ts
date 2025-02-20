import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Post = Database['public']['Tables']['posts']['Row'] & {
  author: Database['public']['Tables']['authors']['Row'];
  categories: Database['public']['Tables']['categories']['Row'][];
  tags: Database['public']['Tables']['tags']['Row'][];
};

export function useBlogPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchPosts() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            author:authors(*),
            categories:post_categories(categories(*)),
            tags:post_tags(tags(*))
          `)
          .eq('published', true)
          .order('published_at', { ascending: false });

        if (error) throw error;

        if (mounted) {
          // Transform the nested data structure
          const transformedPosts = data?.map(post => ({
            ...post,
            author: post.author,
            categories: post.categories.map((c: any) => c.categories),
            tags: post.tags.map((t: any) => t.tags)
          })) || [];

          setPosts(transformedPosts);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchPosts();

    return () => {
      mounted = false;
    };
  }, []);

  return { posts, loading, error };
}