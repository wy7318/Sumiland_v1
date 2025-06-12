import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Post = Database['public']['Tables']['posts']['Row'] & {
  author: Database['public']['Tables']['authors']['Row'];
  categories: Database['public']['Tables']['categories']['Row'][];
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
        console.log('🔍 Starting to fetch posts (without tags)...');

        let query = supabase
          .from('posts')
          .select(`
            *,
            author:authors(*),
            categories:post_categories(categories(*))
          `);

        // Add filters based on context
        if (adminView && organizations.length > 0) {
          console.log('📝 Admin view: filtering by organization IDs:', organizations.map(org => org.id));
          query = query.in('organization_id', organizations.map(org => org.id));
        } else {
          console.log('🌐 Public view: filtering by published=true and specific org');
          query = query
            .eq('published', true)
            .eq('organization_id', '53c12775-1877-4116-a8bc-9b52eb4a3a34');
        }

        query = query.order('created_at', { ascending: false });

        console.log('📤 Executing query without tags...');
        const { data, error } = await query;
        
        if (error) {
          console.error('❌ Query failed:', error);
          throw error;
        }

        console.log('✅ Query successful!');
        console.log('📊 Raw data received:', data);

        if (mounted) {
          // Transform the nested data structure (without tags)
          const transformedPosts = data?.map(post => {
            console.log('🔄 Transforming post:', post.id, post.title);
            return {
              ...post,
              author: post.author,
              categories: post.categories?.map((c: any) => c.categories) || []
            };
          }) || [];

          console.log('✅ Transformed posts:', transformedPosts);
          setPosts(transformedPosts);
        }
      } catch (err) {
        console.error('💥 Error in fetchPosts:', err);
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