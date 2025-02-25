import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

type Post = Database['public']['Tables']['posts']['Row'];

export function PostsPage() {
  const { organizations } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [organizations]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      // Only fetch posts for user's organizations
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .in('organization_id', organizations.map(org => org.id))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const togglePublished = async (post: Post) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          published: !post.published,
          published_at: !post.published ? new Date().toISOString() : null
        })
        .eq('id', post.id)
        .eq('organization_id', post.organization_id); // Add organization check

      if (error) throw error;
      await fetchPosts();
    } catch (err) {
      console.error('Error toggling post status:', err);
    }
  };

  const deletePost = async (id: string, organizationId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId); // Add organization check

      if (error) throw error;
      await fetchPosts();
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center">
        Error loading posts: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Blog Posts</h1>
        <Link
          to="/admin/posts/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {posts.map((post) => (
            <motion.li
              key={post.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {post.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => togglePublished(post)}
                    className={`p-2 rounded-full ${
                      post.published
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {post.published ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <Link
                    to={`/admin/posts/${post.id}/edit`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                  >
                    <Edit className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => deletePost(post.id, post.organization_id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}