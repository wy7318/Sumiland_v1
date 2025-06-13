import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Save, X, AlertCircle, Package, Scale,
  ArrowLeft, ChevronRight, Image, FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ImageUpload } from './ImageUpload';
import { useAuth } from '../../contexts/AuthContext';
import { CustomFieldsForm } from './CustomFieldsForm';
import { cn } from '../../lib/utils';
import { useOrganization } from '../../contexts/OrganizationContext';

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
  sku: string; // Added SKU field
  custom_fields?: Record<string, any>;
};

export function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { selectedOrganization } = useOrganization();
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
    max_stock_level: '0',
    avg_cost: '0',
    sku: '', // Added SKU field with default empty string
  });

  useEffect(() => {
    fetchPicklists();
    fetchCategories();
    if (id) {
      fetchProduct();
    }
  }, [id, selectedOrganization]);

  const fetchPicklists = async () => {
    try {
      // Fetch stock unit types
      const { data: stockUnitData, error: stockUnitError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'product_stock_unit')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
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
        .eq('organization_id', selectedOrganization?.id)
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
        .eq('organization_id', selectedOrganization?.id)
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
        .eq('organization_id', selectedOrganization?.id)
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
          max_stock_level: product.max_stock_level?.toString() || '0',
          avg_cost: product.avg_cost?.toString() || '0',
          sku: product.sku || '', // Added SKU field loading
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
          .eq('organization_id', selectedOrganization?.id);

        if (updateError) throw updateError;
      } else {
        // Create new product
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert([{
            ...productData,
            organization_id: selectedOrganization?.id,
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
              organization_id: selectedOrganization?.id,
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
      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl flex items-center border border-yellow-200 shadow-sm">
        <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
        <span>You need to be part of an organization to manage products.</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-fuchsia-700 to-purple-500 bg-clip-text text-transparent">
            {id ? 'Edit Product' : 'Create New Product'}
          </h1>
          <p className="text-gray-500 mt-1">
            {id ? 'Update product details and inventory information' : 'Add a new product to your inventory'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/admin/products')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:border-fuchsia-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Products</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center border border-red-100 shadow-sm mb-6">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Package className="w-5 h-5 text-fuchsia-500 mr-2" />
              Basic Information
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-600 mb-1.5">
                  Product Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200"
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label htmlFor="sku" className="block text-sm font-medium text-gray-600 mb-1.5">
                  SKU
                </label>
                <input
                  type="text"
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200"
                  placeholder="Enter product SKU"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Unique identifier for inventory tracking
                </p>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-600 mb-1.5">
                  Category
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200 bg-white"
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
                <label htmlFor="price" className="block text-sm font-medium text-gray-600 mb-1.5">
                  Price
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    id="price"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-600 mb-1.5">
                  Status
                </label>
                <select
                  id="status"
                  required
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Management Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Scale className="w-5 h-5 text-fuchsia-500 mr-2" />
              Inventory Management
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Stock Unit Type
                </label>
                <select
                  value={formData.stock_unit}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    stock_unit: e.target.value,
                    weight_unit: e.target.value === 'weight' ? weightUnits[0]?.value || null : null
                  }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200 bg-white"
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
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Weight Unit
                  </label>
                  <select
                    value={formData.weight_unit || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight_unit: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200 bg-white"
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
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Minimum Stock Level
                </label>
                <input
                  type="number"
                  min="0"
                  step={formData.stock_unit === 'weight' ? '0.001' : '1'}
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_stock_level: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Alert will be triggered when stock falls below this level
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Maximum Stock Level
                </label>
                <input
                  type="number"
                  min="0"
                  step={formData.stock_unit === 'weight' ? '0.001' : '1'}
                  value={formData.max_stock_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_stock_level: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Optional. Alert will be triggered when stock exceeds this level
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Average Cost
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.avg_cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, avg_cost: e.target.value }))}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  This will be automatically updated based on purchase orders
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Image and Description Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Image className="w-5 h-5 text-fuchsia-500 mr-2" />
              Additional Information
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Product Image
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 bg-gray-50">
                  <ImageUpload
                    onImageUploaded={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                    currentImage={formData.image_url}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-600 mb-1.5">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200"
                  placeholder="Enter product description..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Custom Fields Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <FileText className="w-5 h-5 text-fuchsia-500 mr-2" />
              Custom Fields
            </h2>
          </div>
          <div className="p-6">
            <CustomFieldsForm
              entityType="products"
              entityId={id}
              organizationId={selectedOrganization?.id}
              onChange={(customFieldValues) => {
                setFormData(prev => ({
                  ...prev,
                  custom_fields: customFieldValues
                }));
              }}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-8">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="px-6 py-3 rounded-full border border-gray-300 text-gray-700 font-medium bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-fuchsia-600 to-fuchsia-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:from-fuchsia-700 hover:to-fuchsia-800 disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  );
}