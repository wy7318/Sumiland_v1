import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, User, ArrowLeft, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import { useBlogPost } from '../hooks/useBlogPost';

export function BlogPost() {
  const { slug } = useParams();
  const { post, loading, error } = useBlogPost(slug || '');

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-12 flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen pt-20 pb-12 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">Post not found</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <Link
            to="/blog"
            className="inline-flex items-center text-black hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 bg-white">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        {/* Back to Blog */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            to="/blog"
            className="inline-flex items-center text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
        </motion.div>

        <article>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            {/* Featured Image */}
            <img
              src={post.featured_image || `https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=600&fit=crop`}
              alt={post.title}
              className="w-full h-64 md:h-96 object-cover rounded-2xl mb-8"
            />

            {/* Post Meta */}
            <div className="flex flex-wrap gap-4 items-center text-sm text-gray-500 mb-6">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(post.published_at || post.created_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {post.author?.name || 'SimpliDone Team'}
              </span>
              {post.categories.map(category => (
                <span
                  key={category.id}
                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                >
                  {category.name}
                </span>
              ))}
            </div>

            {/* Post Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-8 leading-tight">
              {post.title}
            </h1>

            {/* Post Content */}
            <div className="prose prose-lg max-w-none">
              <div
                className="text-gray-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: post.content || post.excerpt || 'No content available.' }}
              />
            </div>
          </motion.div>

          {/* Author & Social Share Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="border-t border-gray-200 pt-8 mt-12"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Author Info */}
              <div className="flex items-center gap-4">
                <img
                  src={post.author?.avatar_url || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face`}
                  alt={post.author?.name || 'Author'}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold text-black">{post.author?.name || 'SimpliDone Team'}</h3>
                  <p className="text-sm text-gray-500">{post.author?.bio || 'Content Creator'}</p>
                </div>
              </div>

              {/* Social Share */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 font-medium">Share:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`, '_blank')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Share on Facebook"
                  >
                    <Facebook className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => window.open(`https://twitter.com/intent/tweet?url=${window.location.href}&text=${post.title}`, '_blank')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Share on Twitter"
                  >
                    <Twitter className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${window.location.href}`, '_blank')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Share on LinkedIn"
                  >
                    <Linkedin className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </article>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 text-center"
        >
          <div className="bg-black rounded-2xl p-12 shadow-xl">
            <h3 className="text-3xl font-bold text-white mb-4">
              Ready to Transform Your Business?
            </h3>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of businesses that have streamlined their operations with SimpliDone.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => {
                  window.location.href = '/#contact';
                }}
                className="bg-white text-black px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Start Free Trial
              </button>
              <button
                onClick={() => {
                  window.location.href = '/#contact';
                }}
                className="border border-gray-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:border-gray-400 transition-colors"
              >
                Schedule Demo
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}