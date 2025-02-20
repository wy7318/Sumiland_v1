import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Edit, Trash2, Eye, EyeOff, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  status: 'active' | 'inactive';
  category_id: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  category: { 
    name: string;
    category_type: string;
  } | null;
};

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchProducts();
  }, [sortBy, sortOrder]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(name, category_type)
        `)
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
      const newStatus = product.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
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

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <Link
          to="/admin/products/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Product
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
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
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'created_at')}
          className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
        >
          <option value="created_at">Sort by Date</option>
          <option value="name">Sort by Name</option>
          <option value="price">Sort by Price</option>
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
          {filteredProducts.map((product) => (
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
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {product.name}
                    </h3>
                    <div className="mt-1 flex items-center">
                      <span className="text-sm text-gray-500 truncate">
                        {product.category?.name || 'No Category'} 
                        {product.category?.category_type && ` (${product.category.category_type})`}
                      </span>
                      <span className="mx-2 text-gray-300">•</span>
                      <span className="text-sm font-medium text-gray-900">
                        ${product.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => toggleStatus(product)}
                    className={cn(
                      "p-2 rounded-full",
                      product.status === 'active'
                        ? "text-green-600 hover:bg-green-50"
                        : "text-gray-400 hover:bg-gray-50"
                    )}
                  >
                    {product.status === 'active' ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
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