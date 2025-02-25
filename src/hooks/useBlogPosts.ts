import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Post = Database['public']['Tables']['posts']['Row'] & {
  author: Database['public']['Tables']['authors']['Row'];
  categories: Database['public']['Tables']['categories']['Row'][];
  tags: Database['public']['Tables']['tags']['Row'][];
};

export function useBlogPosts(adminView = false) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, organizations } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function fetchPosts() {
      try {
        setLoading(true);
        let query = supabase
          .from('posts')
          .select(`
            *,
            author:authors(*),
            categories:post_categories(categories(*)),
            tags:post_tags(tags(*))
          `);

        // If in admin view, only show posts for user's organizations
        if (adminView && organizations.length > 0) {
          query = query.in('organization_id', organizations.map(org => org.id));
        } else {
          // For public view, only show published posts
          query = query.eq('published', true);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
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
  }, [adminView, organizations]);

  return { posts, loading, error };
}