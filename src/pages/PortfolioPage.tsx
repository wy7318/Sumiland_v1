import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronLeft, X, ZoomIn, Home } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string;
  published: boolean;
  created_at: string;
};

const ITEMS_PER_PAGE = 12;

export function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchPortfolio();
  }, [selectedCategory, page]);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('portfolio_items')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      // Add pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      if (page === 1) {
        setItems(data || []);
      } else {
        setItems(prev => [...prev, ...(data || [])]);
      }
      
      setHasMore((data?.length || 0) === ITEMS_PER_PAGE);

      // Get unique categories
      const { data: allItems } = await supabase
        .from('portfolio_items')
        .select('category')
        .eq('published', true);

      const uniqueCategories = Array.from(new Set(allItems?.map(item => item.category) || []));
      setCategories(['all', ...uniqueCategories]);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError(err instanceof Error ? err.message : 'Failed to load portfolio items');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
    setItems([]);
    setHasMore(true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 mb-8 text-sm">
          <Link to="/" className="text-gray-500 hover:text-gray-700">
            <Home className="w-4 h-4" />
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900">Portfolio</span>
        </nav>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold mb-8"
        >
          Our Portfolio
        </motion.h1>

        <div className="flex flex-wrap gap-4 mb-12">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={cn(
                "px-6 py-2 rounded-full transition-colors",
                selectedCategory === category
                  ? "bg-primary-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {items.map(item => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="group cursor-pointer"
              onClick={() => setSelectedItem(item)}
            >
              <div className="relative overflow-hidden rounded-lg shadow-lg">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-white text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-gray-200 line-clamp-2">{item.description}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageModalOpen(true);
                      }}
                      className="mt-4 inline-flex items-center text-white hover:text-primary-200 transition-colors"
                    >
                      <ZoomIn className="w-4 h-4 mr-2" />
                      View Full Image
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {loading && (
          <div className="flex justify-center mt-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        )}

        {hasMore && !loading && (
          <div className="flex justify-center mt-12">
            <button
              onClick={loadMore}
              className="px-8 py-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
            >
              Load More
            </button>
          </div>
        )}

        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedItem(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="relative mb-6">
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.title}
                    className="w-full rounded-lg"
                    style={{ maxHeight: '70vh', objectFit: 'contain' }}
                  />
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <h3 className="text-2xl font-bold mb-4">{selectedItem.title}</h3>
                <p className="text-gray-600 mb-6">{selectedItem.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Category: {selectedItem.category}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(selectedItem.created_at).toLocaleDateString()}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          )}

          {imageModalOpen && selectedItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
              onClick={() => setImageModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full h-full flex items-center justify-center"
                onClick={e => e.stopPropagation()}
              >
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.title}
                  className="max-w-full max-h-full object-contain"
                />
                <button
                  onClick={() => setImageModalOpen(false)}
                  className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}