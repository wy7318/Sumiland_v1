import { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2,
  Eye, Package, Calendar, DollarSign, Building2, AlertCircle,
  FileDown, Send, Check, X, LayoutGrid, LayoutList, Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
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
  const { selectedOrganization } = useOrganization();
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
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchPicklists();
    fetchProducts();
  }, [selectedOrganization]);

  const fetchPicklists = async () => {
    try {
      // Fetch product statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'product_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setProductStatuses(statusData || []);

      // Fetch stock unit types
      const { data: unitData, error: unitError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'product_stock_unit')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (unitError) throw unitError;
      setStockUnits(unitData || []);

      // Fetch product categories
      const { data: categoryData, error: categoryError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'product_category')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
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
        .eq('organization_id', selectedOrganization?.id)
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
      setShowDeleteConfirm(null);
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fuchsia-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-fuchsia-700 to-purple-500 bg-clip-text text-transparent">
            Product Management
          </h1>
          <p className="text-gray-500 mt-1">Manage your inventory and product catalog</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:border-fuchsia-300"
          >
            <FileDown className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <Link
            to="/admin/products/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-fuchsia-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:from-fuchsia-700 hover:to-fuchsia-800"
          >
            <Plus className="w-4 h-4" />
            <span>New Product</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center border border-red-100 shadow-sm mb-6">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filters Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Filter className="w-5 h-5 text-fuchsia-500" />
              Search & Filters
            </h2>
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {filtersExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {filtersExpanded && (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="text-gray-400 w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Search products by name, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1.5 font-medium">Status Filter</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200 bg-white"
                  >
                    <option value="all">All Status</option>
                    {productStatuses.map(status => (
                      <option key={status.id} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1.5 font-medium">Category Filter</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200 bg-white"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1.5 font-medium">Stock Level</label>
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200 bg-white"
                  >
                    <option value="all">All Stock Levels</option>
                    <option value="low">Low Stock</option>
                    <option value="normal">Normal Stock</option>
                    <option value="high">High Stock</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1.5 font-medium">Sort Order</label>
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'created_at')}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 outline-none transition-all duration-200 bg-white"
                    >
                      <option value="created_at">Date Created</option>
                      <option value="name">Product Name</option>
                      <option value="price">Price</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center"
                      title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    >
                      {sortOrder === 'asc' ? (
                        <ChevronUp className="w-5 h-5 text-fuchsia-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-fuchsia-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Products Data */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inventory
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="w-12 h-12 text-gray-300 mb-2" />
                      <p className="text-lg font-medium">No products found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">
                            {product.name}
                          </div>
                          {product.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center text-sm">
                          <DollarSign className="w-4 h-4 text-gray-400 mr-1.5" />
                          <span className="font-medium text-gray-900">
                            ${product.price.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 text-gray-400 mr-1.5" />
                          <span>
                            {new Date(product.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(product)}
                        className="text-sm font-medium rounded-full px-3 py-1.5 border-2"
                        style={getStatusStyle(product.status)}
                      >
                        {getStatusLabel(product.status)}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-3 py-1 text-sm font-medium rounded-full"
                        style={getCategoryStyle(product.category)}
                      >
                        {getCategoryLabel(product.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">{product.current_stock}</span> {getStockUnitLabel(product.stock_unit)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Min: {product.min_stock_level} {product.max_stock_level && `• Max: ${product.max_stock_level}`}
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              product.current_stock <= product.min_stock_level ? "bg-red-500" :
                                (product.max_stock_level && product.current_stock > product.max_stock_level) ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{
                              width: `${Math.min(100, product.max_stock_level ?
                                (product.current_stock / product.max_stock_level) * 100 :
                                (product.current_stock / (product.min_stock_level * 3)) * 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {/* <Link
                          to={`/admin/products/${product.id}`}
                          className="p-1.5 bg-fuchsia-50 text-fuchsia-600 rounded-full hover:bg-fuchsia-100 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link> */}
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                          title="Edit product"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        {showDeleteConfirm === product.id ? (
                          <>
                            <button
                              onClick={() => deleteProduct(product.id)}
                              className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                              title="Confirm delete"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="p-1.5 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setShowDeleteConfirm(product.id)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {sortedProducts.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{sortedProducts.length}</span> of <span className="font-medium text-gray-700">{products.length}</span> products
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-fuchsia-500" />
              <span className="text-gray-700 font-medium">{products.length} total products</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}