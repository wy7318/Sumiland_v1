import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import { ImageUpload } from './ImageUpload';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type Post = Database['public']['Tables']['posts']['Row'];

export function EditPostPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { organizations } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Post>>({
    title: '',
    content: '',
    excerpt: '',
    featured_image: '',
  });

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    if (!id) return;

    try {
      const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .in('organization_id', organizations.map(org => org.id))
        .single();

      if (error) throw error;
      if (post) {
        setFormData({
          title: post.title,
          content: post.content,
          excerpt: post.excerpt,
          featured_image: post.featured_image,
          organization_id: post.organization_id
        });
      }
    } catch (err) {
      console.error('Error fetching post:', err);
      setError('Failed to load post');
    }
  };

  const handleImageUploaded = (url: string) => {
    setFormData(prev => ({ ...prev, featured_image: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const userData = await getCurrentUser();
      if (!userData?.user) throw new Error('Not authenticated');

      // Verify organization access
      if (!organizations.some(org => org.id === formData.organization_id)) {
        throw new Error('You do not have permission to edit this post');
      }

      const { error: updateError } = await supabase
        .from('posts')
        .update({
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt,
          featured_image: formData.featured_image,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('organization_id', formData.organization_id);

      if (updateError) throw updateError;
      navigate('/admin/posts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update post');
      console.error('Error updating post:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!formData.organization_id || !organizations.some(org => org.id === formData.organization_id)) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        You do not have permission to edit this post.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Post</h1>
        <button
          onClick={() => navigate('/admin/posts')}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            required
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>

        <div>
          <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-1">
            Excerpt
          </label>
          <textarea
            id="excerpt"
            rows={3}
            value={formData.excerpt || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Featured Image
          </label>
          <ImageUpload
            onImageUploaded={handleImageUploaded}
            currentImage={formData.featured_image || ''}
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Content
          </label>
          <textarea
            id="content"
            required
            rows={10}
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/posts')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}