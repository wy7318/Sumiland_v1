import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, User, Tag, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import { useBlogPost } from '../hooks/useBlogPost';

export function BlogPost() {
  const { slug } = useParams();
  const { post, loading, error } = useBlogPost(slug || '');

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen pt-20 pb-12 flex items-center justify-center">
        <div className="text-red-500">
          {error || 'Post not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <img
            src={post.featured_image || `https://source.unsplash.com/random/1200x600?${post.categories[0]?.name.toLowerCase()}`}
            alt={post.title}
            className="w-full h-[400px] object-cover rounded-xl mb-8"
          />
          
          <div className="flex flex-wrap gap-4 items-center text-sm text-gray-500 mb-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(post.published_at || post.created_at).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {post.author.name}
            </span>
            {post.categories.map(category => (
              <span
                key={category.id}
                className="text-primary-600 bg-primary-50 px-3 py-1 rounded-full"
              >
                {category.name}
              </span>
            ))}
          </div>

          <h1 className="text-4xl font-bold mb-6">{post.title}</h1>
          
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border-t border-gray-200 pt-8 mt-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={post.author.avatar_url || `https://source.unsplash.com/random/100x100?portrait&sig=1`}
                alt={post.author.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h3 className="font-semibold">{post.author.name}</h3>
                <p className="text-sm text-gray-500">{post.author.bio || 'Content Creator'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Share:</span>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Facebook className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Twitter className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Linkedin className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </article>
    </div>
  );
}