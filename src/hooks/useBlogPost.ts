// import { useEffect, useState } from 'react';
// import { supabase } from '../lib/supabase';
// import type { Database } from '../lib/database.types';

// type Post = Database['public']['Tables']['posts']['Row'] & {
//   author: Database['public']['Tables']['authors']['Row'];
//   categories: Database['public']['Tables']['categories']['Row'][];
//   tags: Database['public']['Tables']['tags']['Row'][];
// };

// export function useBlogPost(slug: string) {
//   const [post, setPost] = useState<Post | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     async function fetchPost() {
//       try {
//         setLoading(true);
//         const { data, error } = await supabase
//           .from('posts')
//           .select(`
//             *,
//             author:authors(*),
//             categories:post_categories(categories(*)),
//             tags:post_tags(tags(*))
//           `)
//           .eq('slug', slug)
//           .eq('published', true)
//           .eq('organization_id', '53c12775-1877-4116-a8bc-9b52eb4a3a34')
//           .single();

//         if (error) throw error;

//         if (data) {
//           // Transform the nested data structure
//           const transformedPost = {
//             ...data,
//             author: data.author,
//             categories: data.categories.map((c: any) => c.categories),
//             tags: data.tags.map((t: any) => t.tags)
//           };
//           setPost(transformedPost);
//         }
//       } catch (err) {
//         setError(err instanceof Error ? err.message : 'An error occurred');
//       } finally {
//         setLoading(false);
//       }
//     }

//     if (slug) {
//       fetchPost();
//     }
//   }, [slug]);

//   return { post, loading, error };
// }


import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Post = Database['public']['Tables']['posts']['Row'] & {
  author: Database['public']['Tables']['authors']['Row'];
  categories: Database['public']['Tables']['categories']['Row'][];
};

export function useBlogPost(slug: string) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchPost() {
      if (!slug) {
        setError('No slug provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🔍 Fetching individual post with slug:', slug);

        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            author:authors(*),
            categories:post_categories(categories(*))
          `)
          .eq('slug', slug)
          .eq('published', true)
          .single();

        if (error) {
          console.error('❌ Error fetching post:', error);
          throw error;
        }

        console.log('✅ Individual post data received:', data);

        if (mounted) {
          // Transform the nested data structure (without tags)
          const transformedPost = {
            ...data,
            author: data.author,
            categories: data.categories?.map((c: any) => c.categories) || []
          };

          console.log('✅ Transformed individual post:', transformedPost);
          setPost(transformedPost);
        }
      } catch (err) {
        console.error('💥 Error in fetchPost:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchPost();

    return () => {
      mounted = false;
    };
  }, [slug]);

  return { post, loading, error };
}