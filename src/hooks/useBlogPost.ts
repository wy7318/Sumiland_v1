import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Post = Database['public']['Tables']['posts']['Row'] & {
  author: Database['public']['Tables']['authors']['Row'];
  categories: Database['public']['Tables']['categories']['Row'][];
  tags: Database['public']['Tables']['tags']['Row'][];
};

export function useBlogPost(slug: string) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPost() {
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
          .eq('slug', slug)
          .eq('published', true)
          .single();

        if (error) throw error;

        if (data) {
          // Transform the nested data structure
          const transformedPost = {
            ...data,
            author: data.author,
            categories: data.categories.map((c: any) => c.categories),
            tags: data.tags.map((t: any) => t.tags)
          };
          setPost(transformedPost);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchPost();
    }
  }, [slug]);

  return { post, loading, error };
}