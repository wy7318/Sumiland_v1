import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type PortfolioItem = Database['public']['Tables']['portfolio_items']['Row'];

export function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const togglePublished = async (item: PortfolioItem) => {
    try {
      const { error } = await supabase
        .from('portfolio_items')
        .update({ published: !item.published })
        .eq('id', item.id);

      if (error) throw error;
      await fetchItems();
    } catch (err) {
      console.error('Error toggling item status:', err);
    }
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchItems();
    } catch (err) {
      console.error('Error deleting item:', err);
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
        Error loading portfolio items: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Portfolio Items</h1>
        <Link
          to="/admin/portfolio/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Item
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="relative aspect-video">
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{item.category}</p>
              <div className="mt-4 flex justify-end space-x-4">
                <button
                  onClick={() => togglePublished(item)}
                  className={`p-2 rounded-full ${
                    item.published
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {item.published ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
                <Link
                  to={`/admin/portfolio/${item.id}/edit`}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                >
                  <Edit className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}