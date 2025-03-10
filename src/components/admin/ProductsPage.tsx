import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2, 
  Eye, Package, Calendar, DollarSign, Building2, AlertCircle,
  FileDown, Send
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

type PicklistValue = {
  id: string;
  value: string;
  label: string;
  is_default: boolean;
  is_active: boolean;
  color: string | null;
  text_color: string | null;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  status: string;
  category: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string;
  stock_unit: string;
  weight_unit: string | null;
  min_stock_level: number;
  max_stock_level: number | null;
  avg_cost: number;
  current_stock: number;
};

export function ProductsPage() {
  const { organizations } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'normal' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [productStatuses, setProductStatuses] = useState<PicklistValue[]>([]);
  const [stockUnits, setStockUnits] = useState<PicklistValue[]>([]);
  const [categories, setCategories] = useState<PicklistValue[]>([]);

  useEffect(() => {
    fetchPicklists();
    fetchProducts();
  }, [organizations]);

  const fetchPicklists = async () => {
    try {
      // Fetch product statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'product_status')
        .eq('is_active', true)
        .eq('organization_id', organizations.map(org => org.id))
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setProductStatuses(statusData || []);

      // Fetch stock unit types
      const { data: unitData, error: unitError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'product_stock_unit')
        .eq('is_active', true)
        .eq('organization_id', organizations.map(org => org.id))
        .order('display_order', { ascending: true });

      if (unitError) throw unitError;
      setStockUnits(unitData || []);

      // Fetch product categories
      const { data: categoryData, error: categoryError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'product_category')
        .eq('is_active', true)
        .eq('organization_id', organizations.map(org => org.id))
        .order('display_order', { ascending: true });

      if (categoryError) throw categoryError;
      setCategories(categoryData || []);
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *
        `)
        .in('organization_id', organizations.map(org => org.id))
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (product: Product) => {
    try {
      // Get the next status value
      const currentIndex = productStatuses.findIndex(s => s.value === product.status);
      const nextStatus = productStatuses[(currentIndex + 1) % productStatuses.length];

      const { error } = await supabase
        .from('products')
        .update({ 
          status: nextStatus.value,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) throw error;
      await fetchProducts();
    } catch (err) {
      console.error('Error toggling product status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update product status');
    }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Name',
      'Description',
      'Price',
      'Status',
      'Category',
      'Stock Unit',
      'Current Stock',
      'Min Level',
      'Max Level',
      'Average Cost',
      'Created At'
    ].join(',');

    const csvData = products.map(product => [
      product.name,
      product.description || '',
      product.price,
      productStatuses.find(s => s.value === product.status)?.label || product.status,
      getCategoryLabel(product.category),
      stockUnits.find(u => u.value === product.stock_unit)?.label || product.stock_unit,
      product.current_stock,
      product.min_stock_level,
      product.max_stock_level || '',
      product.avg_cost,
      new Date(product.created_at).toLocaleDateString()
    ].join(',')).join('\n');

    const csv = `${headers}\n${csvData}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getCategoryLabel = (categoryValue: string | null) => {
    if (!categoryValue) return 'Uncategorized';
    return categories.find(c => c.value === categoryValue)?.label || categoryValue;
  };

  const getCategoryStyle = (categoryValue: string | null) => {
    if (!categoryValue) return {};
    const category = categories.find(c => c.value === categoryValue);
    if (!category?.color) return {};
    return {
      backgroundColor: category.color,
      color: category.text_color || '#FFFFFF'
    };
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

    const matchesStock = stockFilter === 'all' || (
      stockFilter === 'low' && product.current_stock <= product.min_stock_level ||
      stockFilter === 'normal' && product.current_stock > product.min_stock_level && (!product.max_stock_level || product.current_stock <= product.max_stock_level) ||
      stockFilter === 'high' && product.max_stock_level && product.current_stock > product.max_stock_level
    );

    return matchesSearch && matchesStatus && matchesCategory && matchesStock;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    return (aValue < bValue ? -1 : 1) * multiplier;
  });

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = productStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get label for status
  const getStatusLabel = (status: string) => {
    return productStatuses.find(s => s.value === status)?.label || status;
  };

  // Get label for stock unit
  const getStockUnitLabel = (unit: string) => {
    return stockUnits.find(u => u.value === unit)?.label || unit;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-4">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Export CSV
          </button>
          <Link
            to="/admin/products/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Product
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
        >
          <option value="all">All Status</option>
          {productStatuses.map(status => (
            <option key={status.id} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category.id} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
          className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
        >
          <option value="all">All Stock Levels</option>
          <option value="low">Low Stock</option>
          <option value="normal">Normal Stock</option>
          <option value="high">High Stock</option>
        </select>
        <button
          onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
          className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          <Filter className={cn(
            "w-5 h-5 transition-transform",
            sortOrder === 'desc' ? "transform rotate-180" : ""
          )} />
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {sortedProducts.map((product) => (
            <motion.li
              key={product.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="hover:bg-gray-50"
            >
              <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                <div className="flex items-center flex-1 min-w-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </div>
                    {product.description && (
                      <div className="text-sm text-gray-500 truncate">
                        {product.description}
                      </div>
                    )}
                    <div className="mt-1 flex items-center">
                      <span className="text-sm text-gray-500">
                        Stock: {product.current_stock} {getStockUnitLabel(product.stock_unit)}
                      </span>
                      <span className="mx-2 text-gray-300">•</span>
                      <span className="text-sm font-medium text-gray-900">
                        ${product.price.toFixed(2)}
                      </span>
                      <span className="mx-2 text-gray-300">•</span>
                      <span
                        className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                        style={getCategoryStyle(product.category)}
                      >
                        {getCategoryLabel(product.category)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => toggleStatus(product)}
                    className="p-2 rounded-full"
                    style={getStatusStyle(product.status)}
                  >
                    {getStatusLabel(product.status)}
                  </button>
                  <Link
                    to={`/admin/products/${product.id}/edit`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                  >
                    <Edit className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => deleteProduct(product.id)}
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