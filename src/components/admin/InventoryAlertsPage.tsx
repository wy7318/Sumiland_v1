import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, Search, Filter, ChevronDown, ChevronUp, AlertCircle,
  CheckCircle, ArrowLeft, Package, Scale
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type InventoryAlert = {
  id: string;
  product_id: string;
  alert_type: 'low_stock' | 'overstock' | 'expiring';
  status: 'new' | 'acknowledged' | 'resolved';
  message: string;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  acknowledged_by: string | null;
  product: {
    name: string;
    stock_unit: 'weight' | 'quantity';
    weight_unit: string | null;
  };
  acknowledged_by_profile?: {
    name: string;
  };
};

const ALERT_TYPE_COLORS = {
  'low_stock': 'bg-red-100 text-red-800',
  'overstock': 'bg-yellow-100 text-yellow-800',
  'expiring': 'bg-orange-100 text-orange-800'
};

const STATUS_COLORS = {
  'new': 'bg-blue-100 text-blue-800',
  'acknowledged': 'bg-purple-100 text-purple-800',
  'resolved': 'bg-green-100 text-green-800'
};

export function InventoryAlertsPage() {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'product'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_alerts')
        .select(`
          *,
          product:products(
            name,
            stock_unit,
            weight_unit
          ),
          acknowledged_by_profile:profiles(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('inventory_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: userData.user.id
        })
        .eq('id', alertId);

      if (error) throw error;
      await fetchAlerts();
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('inventory_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
      await fetchAlerts();
    } catch (err) {
      console.error('Error resolving alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve alert');
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = 
      alert.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || alert.alert_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    if (sortBy === 'product') {
      return (a.product.name.localeCompare(b.product.name)) * (sortOrder === 'asc' ? 1 : -1);
    }
    return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * (sortOrder === 'asc' ? 1 : -1);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/inventory"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold">Inventory Alerts</h1>
        </div>
        <Bell className="w-8 h-8 text-primary-500" />
      </div>

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
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Types</option>
              <option value="low_stock">Low Stock</option>
              <option value="overstock">Overstock</option>
              <option value="expiring">Expiring</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>

            <button
              onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <Filter className={cn(
                "w-5 h-5 transition-transform",
                sortOrder === 'desc' ? "transform rotate-180" : ""
              )} />
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {sortedAlerts.map((alert) => (
            <div key={alert.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {alert.product.stock_unit === 'quantity' ? (
                    <Package className="w-5 h-5 text-gray-400 mt-1" />
                  ) : (
                    <Scale className="w-5 h-5 text-gray-400 mt-1" />
                  )}
                  <div>
                    <h3 className="font-medium">{alert.product.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        ALERT_TYPE_COLORS[alert.alert_type]
                      )}>
                        {alert.alert_type.replace('_', ' ')}
                      </span>
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        STATUS_COLORS[alert.status]
                      )}>
                        {alert.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>
                    {alert.acknowledged_by_profile && (
                      <p className="text-sm text-gray-500 mt-1">
                        Acknowledged by: {alert.acknowledged_by_profile.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {alert.status === 'new' && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md"
                    >
                      Acknowledge
                    </button>
                  )}
                  {alert.status === 'acknowledged' && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="px-3 py-1 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md"
                    >
                      Resolve
                    </button>
                  )}
                  {alert.status === 'resolved' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>
            </div>
          ))}
          {sortedAlerts.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No alerts found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}