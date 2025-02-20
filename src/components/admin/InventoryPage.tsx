import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Search, Filter, Plus, ChevronDown, ChevronUp, AlertCircle,
  Edit, Trash2, ArrowUp, ArrowDown, FileDown, BarChart2, Bell
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { InventoryAdjustmentModal } from './InventoryAdjustmentModal';
import { InventoryTransactionModal } from './InventoryTransactionModal';

type Product = {
  id: string;
  name: string;
  description: string;
  avg_cost: number;
  min_stock_level: number;
  max_stock_level: number | null;
  stock_unit: 'weight' | 'quantity';
  weight_unit: 'kg' | 'g' | 'lb' | 'oz' | null;
  current_stock: number;
  status: 'active' | 'inactive';
};

type InventoryAlert = {
  id: string;
  product_id: string;
  alert_type: 'low_stock' | 'overstock' | 'expiring';
  status: 'new' | 'acknowledged' | 'resolved';
  message: string;
  created_at: string;
  product: {
    name: string;
  };
};

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'normal' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'current_stock' | 'avg_cost'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchAlerts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Get products with their current stock levels and transactions
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          current_stock:inventory_transactions(
            quantity,
            transaction_type,
            weight,
            weight_unit,
            unit_cost
          )
        `);

      if (productsError) throw productsError;

      // Calculate current stock and average cost for each product
      const productsWithStock = productsData?.map(product => {
        const transactions = product.current_stock as any[];
        let currentStock = 0;
        let totalCost = 0;
        let totalQuantity = 0;

        if (product.stock_unit === 'weight') {
          // For weight-based products
          transactions?.forEach(transaction => {
            if (transaction.weight && transaction.unit_cost) {
              const weight = transaction.weight || 0;
              if (['purchase_received', 'work_order_return'].includes(transaction.transaction_type)) {
                totalCost += weight * transaction.unit_cost;
                totalQuantity += weight;
              }
            }
            
            // Calculate current stock
            const weight = transaction.weight || 0;
            currentStock += ['purchase_received', 'work_order_return'].includes(transaction.transaction_type)
              ? weight
              : -weight;
          });
        } else {
          // For quantity-based products
          transactions?.forEach(transaction => {
            if (transaction.quantity && transaction.unit_cost) {
              const quantity = transaction.quantity || 0;
              if (['purchase_received', 'work_order_return'].includes(transaction.transaction_type)) {
                totalCost += quantity * transaction.unit_cost;
                totalQuantity += quantity;
              }
            }
            
            // Calculate current stock
            const quantity = transaction.quantity || 0;
            currentStock += ['purchase_received', 'work_order_return'].includes(transaction.transaction_type)
              ? quantity
              : -quantity;
          });
        }

        // Calculate average cost
        const avgCost = totalQuantity > 0 ? totalCost / totalQuantity : product.avg_cost || 0;

        return {
          ...product,
          current_stock: currentStock,
          avg_cost: avgCost
        };
      }) || [];

      setProducts(productsWithStock);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_alerts')
        .select(`
          *,
          product:products(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('inventory_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
      await fetchAlerts();
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Product Name',
      'Description',
      'Current Stock',
      'Unit',
      'Min Level',
      'Max Level',
      'Average Cost',
      'Status'
    ].join(',');

    const csvData = filteredProducts.map(product => [
      product.name,
      product.description || '',
      product.current_stock,
      product.stock_unit + (product.weight_unit ? ` (${product.weight_unit})` : ''),
      product.min_stock_level,
      product.max_stock_level || '',
      product.avg_cost?.toFixed(2) || '0.00',
      product.status
    ].join(',')).join('\n');

    const csv = `${headers}\n${csvData}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;

    const matchesStock = stockFilter === 'all' || (
      stockFilter === 'low' && product.current_stock <= product.min_stock_level ||
      stockFilter === 'normal' && product.current_stock > product.min_stock_level && (!product.max_stock_level || product.current_stock <= product.max_stock_level) ||
      stockFilter === 'high' && product.max_stock_level && product.current_stock > product.max_stock_level
    );

    return matchesSearch && matchesStatus && matchesStock;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    return (aValue < bValue ? -1 : 1) * multiplier;
  });

  // Calculate metrics
  const metrics = {
    totalProducts: products.length,
    lowStock: products.filter(p => p.current_stock <= p.min_stock_level).length,
    totalValue: products.reduce((sum, p) => sum + ((p.current_stock || 0) * (p.avg_cost || 0)), 0),
    activeAlerts: alerts.filter(a => a.status === 'new').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <Package className="w-8 h-8 text-primary-500" />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Products</h3>
          <p className="text-3xl font-bold">{metrics.totalProducts}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Low Stock Items</h3>
          <p className="text-3xl font-bold text-red-600">{metrics.lowStock}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Value</h3>
          <p className="text-3xl font-bold">${metrics.totalValue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Active Alerts</h3>
          <p className="text-3xl font-bold text-yellow-600">{metrics.activeAlerts}</p>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Bell className="w-5 h-5 mr-2 text-yellow-500" />
              Recent Alerts
            </h2>
            <Link
              to="/admin/inventory/alerts"
              className="text-primary-600 hover:text-primary-700 text-sm"
            >
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={cn(
                  "p-4 rounded-lg border",
                  alert.status === 'new' 
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{alert.product.name}</h3>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                  {alert.status === 'new' && (
                    <button
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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

            <div className="flex gap-2">
              <button
                onClick={() => setShowTransactionModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center"
              >
                <BarChart2 className="w-4 h-4 mr-2" />
                View Transactions
              </button>

              <button
                onClick={exportToCSV}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortBy === 'name') {
                      setSortOrder(order => order === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('name');
                      setSortOrder('asc');
                    }
                  }}
                >
                  <div className="flex items-center">
                    <span>Product</span>
                    {sortBy === 'name' && (
                      sortOrder === 'asc' ? 
                        <ChevronUp className="w-4 h-4 ml-1" /> : 
                        <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortBy === 'current_stock') {
                      setSortOrder(order => order === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('current_stock');
                      setSortOrder('asc');
                    }
                  }}
                >
                  <div className="flex items-center">
                    <span>Current Stock</span>
                    {sortBy === 'current_stock' && (
                      sortOrder === 'asc' ? 
                        <ChevronUp className="w-4 h-4 ml-1" /> : 
                        <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Levels
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortBy === 'avg_cost') {
                      setSortOrder(order => order === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('avg_cost');
                      setSortOrder('asc');
                    }
                  }}
                >
                  <div className="flex items-center">
                    <span>Average Cost</span>
                    {sortBy === 'avg_cost' && (
                      sortOrder === 'asc' ? 
                        <ChevronUp className="w-4 h-4 ml-1" /> : 
                        <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Package className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-gray-500">{product.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {product.current_stock} {product.stock_unit === 'quantity' ? 'units' : product.weight_unit}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <ArrowDown className={cn(
                        "w-4 h-4",
                        product.current_stock <= product.min_stock_level
                          ? "text-red-500"
                          : "text-gray-400"
                      )} />
                      <span className="text-sm text-gray-500">Min: {product.min_stock_level}</span>
                      {product.max_stock_level && (
                        <>
                          <ArrowUp className={cn(
                            "w-4 h-4",
                            product.current_stock > product.max_stock_level
                              ? "text-yellow-500"
                              : "text-gray-400"
                          )} />
                          <span className="text-sm text-gray-500">Max: {product.max_stock_level}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${(product.avg_cost || 0).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                      product.status === 'active'
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    )}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowAdjustmentModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                        title="Adjust Stock"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <Link
                        to={`/admin/products/${product.id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Product"
                      >
                        <Package className="w-5 h-5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAdjustmentModal && (
          <InventoryAdjustmentModal
            product={selectedProduct}
            onClose={() => {
              setShowAdjustmentModal(false);
              setSelectedProduct(null);
            }}
            onSave={async () => {
              await fetchProducts();
              setShowAdjustmentModal(false);
              setSelectedProduct(null);
            }}
          />
        )}

        {showTransactionModal && (
          <InventoryTransactionModal
            onClose={() => setShowTransactionModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}