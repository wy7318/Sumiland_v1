import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, X, AlertCircle, Package, Scale } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ImageUpload } from './ImageUpload';
import { useAuth } from '../../contexts/AuthContext';
import { CustomFieldsForm } from './CustomFieldsForm';
import { cn } from '../../lib/utils';

type PicklistValue = {
  id: string;
  value: string;
  label: string;
  is_default: boolean;
  is_active: boolean;
  color: string | null;
  text_color: string | null;
};

type Category = {
  id: string;
  name: string;
  category_type: string;
  organization_id: string;
};

type ProductFormData = {
  name: string;
  description: string;
  price: string;
  category: string;
  status: 'active' | 'inactive';
  image_url: string;
  stock_unit: string;
  weight_unit: string | null;
  min_stock_level: string;
  max_stock_level: string;
  avg_cost: string;
  custom_fields?: Record<string, any>;
};

export function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { organizations, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockUnits, setStockUnits] = useState<PicklistValue[]>([]);
  const [weightUnits, setWeightUnits] = useState<PicklistValue[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    category: '',
    status: 'active',
    image_url: '',
    stock_unit: '',
    weight_unit: null,
    min_stock_level: '0',
    max_stock_level: '',
    avg_cost: '0',
  });

  useEffect(() => {
    fetchPicklists();
    fetchCategories();
    if (id) {
      fetchProduct();
    }
  }, [id, organizations]);

  const fetchPicklists = async () => {
    try {
      // Fetch stock unit types
      const { data: stockUnitData, error: stockUnitError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'product_stock_unit')
        .eq('is_active', true)
        .eq('organization_id', organizations.map(org => org.id))
        .order('display_order', { ascending: true });

      if (stockUnitError) throw stockUnitError;
      setStockUnits(stockUnitData || []);

      // If no product is being edited, set default stock unit
      if (!id && stockUnitData) {
        const defaultUnit = stockUnitData.find(u => u.is_default)?.value || stockUnitData[0]?.value;
        if (defaultUnit) {
          setFormData(prev => ({ ...prev, stock_unit: defaultUnit }));
        }
      }

      // Fetch weight units
      const { data: weightUnitData, error: weightUnitError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'product_weight_unit')
        .eq('is_active', true)
        .eq('organization_id', organizations.map(org => org.id))
        .order('display_order', { ascending: true });

      if (weightUnitError) throw weightUnitError;
      setWeightUnits(weightUnitData || []);
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'product_category')
        .eq('is_active', true)
        .eq('organization_id', organizations.map(org => org.id))
        .order('display_order', { ascending: true });
  
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
        .in('organization_id', organizations.map(org => org.id))
        .single();

      if (error) throw error;
      if (product) {
        setFormData({
          name: product.name,
          description: product.description || '',
          price: product.price.toString(),
          category: product.category || '',
          status: product.status,
          image_url: product.image_url || '',
          stock_unit: product.stock_unit || '',
          weight_unit: product.weight_unit,
          min_stock_level: product.min_stock_level?.toString() || '0',
          max_stock_level: product.max_stock_level?.toString() || '',
          avg_cost: product.avg_cost?.toString() || '0',
        });
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Failed to load product or you do not have access');
      navigate('/admin/products');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let productId = id;
      const { custom_fields, ...productData } = formData;

      if (id) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update({
            ...productData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('organization_id', organizations[0].id);

        if (updateError) throw updateError;
      } else {
        // Create new product
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert([{
            ...productData,
            organization_id: organizations[0].id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        productId = newProduct.id;
      }

      // Save custom field values
      if (custom_fields && productId && user) {
        for (const [fieldId, value] of Object.entries(custom_fields)) {
          const { error: valueError } = await supabase
            .from('custom_field_values')
            .upsert({
              organization_id: organizations[0].id,
              entity_id: productId,
              field_id: fieldId,
              value,
              created_by: user.id,
              updated_by: user.id,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'organization_id,field_id,entity_id'
            });

          if (valueError) {
            console.error('Error saving custom field value:', valueError);
          }
        }
      }

      navigate('/admin/products');
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (organizations.length === 0) {
    return (
      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
        You need to be part of an organization to manage products.
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
                  stock_unit: e.target.value,
                  weight_unit: e.target.value === 'weight' ? weightUnits[0]?.value || null : null
                }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              >
                <option value="">Select Unit Type</option>
                {stockUnits.map(unit => (
                  <option key={unit.id} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.stock_unit === 'weight' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight Unit
                </label>
                <select
                  value={formData.weight_unit || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight_unit: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                >
                  <option value="">Select Weight Unit</option>
                  {weightUnits.map(unit => (
                    <option key={unit.id} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
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

        {/* Custom Fields Section */}
        <CustomFieldsForm
          entityType="product"
          entityId={id}
          organizationId={organizations[0]?.id}
          onChange={(customFieldValues) => {
            setFormData(prev => ({
              ...prev,
              custom_fields: customFieldValues
            }));
          }}
          className="border-t border-gray-200 pt-6"
        />

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