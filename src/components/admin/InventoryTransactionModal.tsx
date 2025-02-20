import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Filter, AlertCircle, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type Transaction = {
  id: string;
  product_id: string;
  transaction_type: string;
  quantity: number;
  unit_cost: number | null;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
  product: {
    name: string;
    stock_unit: string;
    weight_unit: string | null;
  };
  created_by_profile: {
    name: string;
  };
};

type Props = {
  onClose: () => void;
};

export function InventoryTransactionModal({ onClose }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          product:products(name, stock_unit, weight_unit),
          created_by_profile:profiles!inventory_transactions_created_by_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Product',
      'Type',
      'Quantity',
      'Unit Cost',
      'Reference',
      'Notes',
      'Created By'
    ].join(','); //Continuing with the InventoryTransactionModal.tsx file content:

    const csvData = filteredTransactions.map(transaction => [
      new Date(transaction.created_at).toLocaleString(),
      transaction.product.name,
      transaction.transaction_type,
      transaction.quantity,
      transaction.unit_cost || '',
      `${transaction.reference_type || ''} ${transaction.reference_id || ''}`,
      transaction.notes || '',
      transaction.created_by_profile.name
    ].join(',')).join('\n');

    const csv = `${headers}\n${csvData}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'purchase_received':
        return 'bg-green-100 text-green-800';
      case 'work_order_out':
        return 'bg-red-100 text-red-800';
      case 'work_order_return':
        return 'bg-blue-100 text-blue-800';
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800';
      case 'damaged':
        return 'bg-orange-100 text-orange-800';
      case 'transfer':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.notes?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || transaction.transaction_type === typeFilter;

    const matchesDate = dateFilter === 'all' || (() => {
      const date = new Date(transaction.created_at);
      const now = new Date();
      switch (dateFilter) {
        case 'today':
          return date.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          return date >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          return date >= monthAgo;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesType && matchesDate;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Inventory Transactions</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search transactions..."
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
            <option value="purchase_received">Purchase Received</option>
            <option value="work_order_out">Work Order Out</option>
            <option value="work_order_return">Work Order Return</option>
            <option value="adjustment">Adjustment</option>
            <option value="damaged">Damaged</option>
            <option value="transfer">Transfer</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>

          <button
            onClick={exportToCSV}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transaction.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {transaction.product.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                      getTransactionTypeColor(transaction.transaction_type)
                    )}>
                      {getTransactionTypeLabel(transaction.transaction_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {transaction.quantity} {transaction.product.stock_unit}
                      {transaction.product.weight_unit && ` (${transaction.product.weight_unit})`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {transaction.unit_cost ? `$${transaction.unit_cost.toFixed(2)}` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {transaction.reference_type && (
                        <span className="capitalize">
                          {transaction.reference_type.replace('_', ' ')}
                        </span>
                      )}
                      {transaction.reference_id && (
                        <span className="ml-1 text-gray-400">
                          #{transaction.reference_id}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {transaction.notes}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {transaction.created_by_profile.name}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}