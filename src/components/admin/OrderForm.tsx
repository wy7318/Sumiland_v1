import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, X, AlertCircle, DollarSign, Percent } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { CustomFieldsForm } from './CustomFieldsForm';

type Order = {
  order_id: string;
  order_number: string;
  customer_id: string;
  status: 'New' | 'In Progress' | 'In Review' | 'Completed' | 'Cancelled';
  payment_status: 'Pending' | 'Partial Received' | 'Fully Received';
  payment_amount: number;
  total_amount: number;
  notes: string | null;
  quote_id: string | null;
  organization_id: string;
};

type OrderItem = {
  order_dtl_id: string;
  product_id: string | null;
  item_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string | null;
};

export function OrderForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentPercent, setPaymentPercent] = useState<number>(0);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  useEffect(() => {
    if (order) {
      setPaymentAmount(order.payment_amount);
      setPaymentPercent((order.payment_amount / order.total_amount) * 100);
    }
  }, [order]);

  const fetchOrder = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('order_hdr')
        .select('*')
        .eq('order_id', id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // If order came from a quote, get quote details first
      let quoteDetails = null;
      if (orderData.quote_id) {
        const { data: quoteData, error: quoteError } = await supabase
          .from('quote_dtl')
          .select('*')
          .eq('quote_id', orderData.quote_id);

        if (quoteError) throw quoteError;
        quoteDetails = quoteData;
      }

      // Get order details
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_dtl')
        .select('*')
        .eq('order_id', id);

      if (itemsError) throw itemsError;

      // Combine order details with quote details
      const combinedItems = itemsData.map((item: any, index: number) => {
        // If this item came from a quote, find the matching quote detail
        const quoteItem = quoteDetails?.[index]; // Match by index since they should be in same order

        return {
          ...item,
          item_name: quoteItem?.item_name || item.notes || 'Custom Item',
          description: item.description || null,
          unit_price: quoteItem?.unit_price || item.unit_price
        };
      });

      setItems(combinedItems);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError(err instanceof Error ? err.message : 'Failed to load order');
    }
  };

  const handlePaymentAmountChange = (amount: number) => {
    if (!order) return;
    
    // Validate amount is between 0 and total
    const validAmount = Math.max(0, Math.min(order.total_amount, amount));
    setPaymentAmount(validAmount);
    
    // Calculate and update percentage
    const newPercent = (validAmount / order.total_amount) * 100;
    setPaymentPercent(newPercent);
  };

  const handlePaymentPercentChange = (percent: number) => {
    if (!order) return;
    
    // Validate percent is between 0 and 100
    const validPercent = Math.max(0, Math.min(100, percent));
    setPaymentPercent(validPercent);

    // Calculate new payment amount based on percentage
    const newAmount = (validPercent / 100) * order.total_amount;
    setPaymentAmount(newAmount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    setLoading(true);
    setError(null);

    try {
      // Update order header
      const { error: updateError } = await supabase
        .from('order_hdr')
        .update({
          status: order.status,
          payment_amount: paymentAmount,
          notes: order.notes,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', id);

      if (updateError) throw updateError;

      // Update items
      for (const item of items) {
        const { error: itemError } = await supabase
          .from('order_dtl')
          .update({
            item_name: item.item_name,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.quantity * item.unit_price,
            notes: item.notes
          })
          .eq('order_dtl_id', item.order_dtl_id);

        if (itemError) throw itemError;
      }

      // Save custom field values
      if (user) {
        for (const [fieldId, value] of Object.entries(customFields)) {
          const { error: valueError } = await supabase
            .from('custom_field_values')
            .upsert({
              organization_id: order.organization_id,
              entity_id: id,
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

      navigate(`/admin/orders/${id}`);
    } catch (err) {
      console.error('Error updating order:', err);
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
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
        <h1 className="text-2xl font-bold">Edit Order {order.order_number}</h1>
        <button
          onClick={() => navigate(`/admin/orders/${id}`)}
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={order.status}
            onChange={(e) => setOrder(prev => prev ? { ...prev, status: e.target.value as Order['status'] } : null)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          >
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Payment Details
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => handlePaymentAmountChange(parseFloat(e.target.value))}
                min="0"
                max={order.total_amount}
                step="0.01"
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>
            <span className="text-sm text-gray-500 whitespace-nowrap">
              of {formatCurrency(order.total_amount)}
            </span>
          </div>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="number"
              value={paymentPercent}
              onChange={(e) => handlePaymentPercentChange(parseFloat(e.target.value))}
              min="0"
              max="100"
              step="0.01"
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={order.notes || ''}
            onChange={(e) => setOrder(prev => prev ? { ...prev, notes: e.target.value } : null)}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Order Items</h2>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.order_dtl_id} className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name
                    </label>
                    <input
                      type="text"
                      value={item.item_name}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index] = { ...item, item_name: e.target.value };
                        setItems(newItems);
                      }}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index] = { 
                          ...item, 
                          quantity: parseInt(e.target.value),
                          subtotal: parseInt(e.target.value) * item.unit_price
                        };
                        setItems(newItems);
                      }}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={item.description || ''}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index] = { ...item, description: e.target.value };
                      setItems(newItems);
                    }}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index] = { 
                          ...item, 
                          unit_price: parseFloat(e.target.value),
                          subtotal: item.quantity * parseFloat(e.target.value)
                        };
                        setItems(newItems);
                      }}
                      min="0"
                      step="0.01"
                      className="w-32 px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">Subtotal:</span>
                    <span className="ml-2 font-medium">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <CustomFieldsForm
          entityType="order"
          entityId={id}
          organizationId={order.organization_id}
          onChange={(values) => setCustomFields(values)}
          className="border-t border-gray-200 pt-6"
        />

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(`/admin/orders/${id}`)}
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
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}