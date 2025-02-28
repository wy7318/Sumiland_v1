import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ImageUpload } from './ImageUpload';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type PortfolioItem = Database['public']['Tables']['portfolio_items']['Row'];
type PicklistValue = {
  id: string;
  value: string;
  label: string;
  is_default: boolean;
  is_active: boolean;
};

export function EditPortfolioPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { organizations } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<PicklistValue[]>([]);
  const [formData, setFormData] = useState<Partial<PortfolioItem>>({
    title: '',
    description: '',
    category: '',
    image_url: '',
    organization_id: '',
  });

  useEffect(() => {
    fetchCategories();
    if (id) {
      fetchPortfolioItem();
    } else if (organizations.length > 0) {
      setFormData(prev => ({
        ...prev,
        organization_id: organizations[0].id
      }));
    }
  }, [id, organizations]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active')
        .eq('type', 'portfolio_category')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('label', { ascending: true });

      if (error) throw error;
      setCategories(data || []);

      // If no category is selected and we have categories, select the default one
      if (!formData.category && data && data.length > 0) {
        const defaultCategory = data.find(c => c.is_default)?.value || data[0].value;
        setFormData(prev => ({ ...prev, category: defaultCategory }));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
    }
  };

  const fetchPortfolioItem = async () => {
    try {
      const { data: item, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('id', id)
        .in('organization_id', organizations.map(org => org.id))
        .single();

      if (error) throw error;
      if (item) {
        setFormData({
          title: item.title,
          description: item.description,
          category: item.category,
          image_url: item.image_url,
          organization_id: item.organization_id,
        });
      }
    } catch (err) {
      console.error('Error fetching portfolio item:', err);
      setError('Failed to load portfolio item or you do not have access');
      navigate('/admin/portfolio');
    }
  };

  const handleImageUploaded = (url: string) => {
    setFormData(prev => ({ ...prev, image_url: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organization_id) return;

    // Verify organization access
    if (!organizations.some(org => org.id === formData.organization_id)) {
      setError('You do not have permission to edit this item');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (id) {
        const { error: updateError } = await supabase
          .from('portfolio_items')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('organization_id', formData.organization_id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('portfolio_items')
          .insert([{
            ...formData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);

        if (insertError) throw insertError;
      }

      navigate('/admin/portfolio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save portfolio item');
    } finally {
      setLoading(false);
    }
  };

  if (!formData.organization_id || !organizations.some(org => org.id === formData.organization_id)) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        You do not have permission to edit this item.
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
        <h1 className="text-2xl font-bold">
          {id ? 'Edit Portfolio Item' : 'Add New Portfolio Item'}
        </h1>
        <button
          onClick={() => navigate('/admin/portfolio')}
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
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            required
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          >
            <option value="">Select a category</option>
            {categories.map(category => (
              <option key={category.id} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image
          </label>
          <ImageUpload
            onImageUploaded={handleImageUploaded}
            currentImage={formData.image_url}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            required
            rows={5}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/portfolio')}
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