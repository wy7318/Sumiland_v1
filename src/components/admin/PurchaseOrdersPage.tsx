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

type PurchaseOrder = {
  id: string;
  po_number: string;
  vendor_id: string;
  status: 'draft' | 'sent' | 'received' | 'cancelled';
  total_amount: number;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  notes: string | null;
  created_at: string;
  vendor: {
    name: string;
    email: string;
    contact_person: string;
  };
  items: {
    id: string;
    product_id: string;
    quantity: number;
    unit_cost: number;
    received_quantity: number;
    status: 'pending' | 'partial' | 'received';
    product: {
      name: string;
    };
  }[];
};

const STATUS_COLORS = {
  'draft': 'bg-gray-100 text-gray-800',
  'sent': 'bg-blue-100 text-blue-800',
  'received': 'bg-green-100 text-green-800',
  'cancelled': 'bg-red-100 text-red-800'
};

export function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'po_number' | 'total_amount'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPO, setSelectedPO] = useState<string | null>(null);

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendor:vendors(
            name,
            email,
            contact_person
          ),
          items:purchase_order_items(
            id,
            product_id,
            quantity,
            unit_cost,
            received_quantity,
            status,
            product:products(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchaseOrders(data || []);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (poId: string, newStatus: PurchaseOrder['status']) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', poId);

      if (error) throw error;
      await fetchPurchaseOrders();
    } catch (err) {
      console.error('Error updating PO status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDelete = async (poId: string) => {
    if (!window.confirm('Are you sure you want to delete this purchase order?')) return;

    try {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', poId);

      if (error) throw error;
      await fetchPurchaseOrders();
    } catch (err) {
      console.error('Error deleting purchase order:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete purchase order');
    }
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = 
      po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.vendor.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedPOs = [...filteredPOs].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    return (aValue < bValue ? -1 : 1) * multiplier;
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <Link
          to="/admin/purchase-orders/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Purchase Order
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search purchase orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="created_at">Sort by Date</option>
              <option value="po_number">Sort by PO Number</option>
              <option value="total_amount">Sort by Amount</option>
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

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected Delivery
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPOs.map((po) => (
                <tr 
                  key={po.id}
                  className={cn(
                    "hover:bg-gray-50 cursor-pointer",
                    selectedPO === po.id && "bg-gray-50"
                  )}
                  onClick={() => setSelectedPO(selectedPO === po.id ? null : po.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {po.po_number}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(po.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {po.vendor.name}
                    </div>
                    {po.vendor.contact_person && (
                      <div className="text-sm text-gray-500">
                        Contact: {po.vendor.contact_person}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={po.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStatusChange(po.id, e.target.value as PurchaseOrder['status']);
                      }}
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        STATUS_COLORS[po.status]
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="received">Received</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {po.expected_delivery_date ? (
                      new Date(po.expected_delivery_date).toLocaleDateString()
                    ) : (
                      'Not set'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {formatCurrency(po.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link
                        to={`/admin/purchase-orders/${po.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                      <Link
                        to={`/admin/purchase-orders/${po.id}/edit`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(po.id);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}