import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, X, AlertCircle, Package, Scale } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ImageUpload } from './ImageUpload';
import { cn } from '../../lib/utils';

type Category = {
  id: string;
  name: string;
  category_type: string;
};

type ProductFormData = {
  name: string;
  description: string;
  price: string;
  category_id: string;
  status: 'active' | 'inactive';
  image_url: string;
  // Inventory fields
  stock_unit: 'weight' | 'quantity';
  weight_unit: 'kg' | 'g' | 'lb' | 'oz' | null;
  min_stock_level: string;
  max_stock_level: string;
  avg_cost: string;
};

export function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    category_id: '',
    status: 'active',
    image_url: '',
    // Initialize inventory fields
    stock_unit: 'quantity',
    weight_unit: null,
    min_stock_level: '0',
    max_stock_level: '',
    avg_cost: '0',
  });

  useEffect(() => {
    checkSuperAdmin();
    fetchCategories();
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const checkSuperAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      navigate('/admin');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
    }
  };

  const fetchProduct = async () => {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (product) {
        setFormData({
          name: product.name,
          description: product.description || '',
          price: product.price.toString(),
          category_id: product.category_id || '',
          status: product.status,
          image_url: product.image_url || '',
          stock_unit: product.stock_unit || 'quantity',
          weight_unit: product.weight_unit,
          min_stock_level: product.min_stock_level?.toString() || '0',
          max_stock_level: product.max_stock_level?.toString() || '',
          avg_cost: product.avg_cost?.toString() || '0',
        });
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Failed to load product');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        category_id: formData.category_id || null,
        status: formData.status,
        image_url: formData.image_url || null,
        stock_unit: formData.stock_unit,
        weight_unit: formData.stock_unit === 'weight' ? formData.weight_unit : null,
        min_stock_level: parseFloat(formData.min_stock_level) || 0,
        max_stock_level: formData.max_stock_level ? parseFloat(formData.max_stock_level) : null,
        avg_cost: parseFloat(formData.avg_cost) || 0,
      };

      if (id) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            ...productData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('products')
          .insert([{
            ...productData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);

        if (insertError) throw insertError;
      }

      navigate('/admin/products');
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{id ? 'Edit Product' : 'Create New Product'}</h1>
        <button
          onClick={() => navigate('/admin/products')}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={formData.category_id}
                onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.category_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <input
                type="number"
                id="price"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                required
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Inventory Management Section */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Scale className="w-5 h-5 mr-2" />
            Inventory Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Unit Type
              </label>
              <select
                value={formData.stock_unit}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  stock_unit: e.target.value as 'weight' | 'quantity',
                  weight_unit: e.target.value === 'weight' ? 'kg' : null
                }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              >
                <option value="quantity">Quantity (Units)</option>
                <option value="weight">Weight</option>
              </select>
            </div>

            {formData.stock_unit === 'weight' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight Unit
                </label>
                <select
                  value={formData.weight_unit || 'kg'}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight_unit: e.target.value as 'kg' | 'g' | 'lb' | 'oz' }))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="lb">Pounds (lb)</option>
                  <option value="oz">Ounces (oz)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Stock Level
              </label>
              <input
                type="number"
                min="0"
                step={formData.stock_unit === 'weight' ? '0.001' : '1'}
                value={formData.min_stock_level}
                onChange={(e) => setFormData(prev => ({ ...prev, min_stock_level: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
              <p className="mt-1 text-sm text-gray-500">
                Alert will be triggered when stock falls below this level
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Stock Level
              </label>
              <input
                type="number"
                min="0"
                step={formData.stock_unit === 'weight' ? '0.001' : '1'}
                value={formData.max_stock_level}
                onChange={(e) => setFormData(prev => ({ ...prev, max_stock_level: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
              <p className="mt-1 text-sm text-gray-500">
                Optional. Alert will be triggered when stock exceeds this level
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Average Cost
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.avg_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, avg_cost: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
              <p className="mt-1 text-sm text-gray-500">
                This will be automatically updated based on purchase orders
              </p>
            </div>
          </div>
        </div>

        {/* Image and Description Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Image
              </label>
              <ImageUpload
                onImageUploaded={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                currentImage={formData.image_url}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
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
            {loading ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}