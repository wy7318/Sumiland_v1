import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, Send, FileDown, Truck,
  CheckCircle, X, DollarSign, Package
} from 'lucide-react';
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
    phone: string;
    contact_person: string;
    address: string;
  };
  items: {
    id: string;
    product_id: string;
    quantity: number;
    unit_cost: number;
    received_quantity: number;
    status: 'pending' | 'partial' | 'received';
    notes: string | null;
    product: {
      name: string;
      description: string;
    };
  }[];
};

const STATUS_COLORS = {
  'draft': 'bg-gray-100 text-gray-800',
  'sent': 'bg-blue-100 text-blue-800',
  'received': 'bg-green-100 text-green-800',
  'cancelled': 'bg-red-100 text-red-800'
};

const ITEM_STATUS_COLORS = {
  'pending': 'bg-yellow-100 text-yellow-800',
  'partial': 'bg-blue-100 text-blue-800',
  'received': 'bg-green-100 text-green-800'
};

export function PurchaseOrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPurchaseOrder();
    }
  }, [id]);

  const fetchPurchaseOrder = async () => {
    try {
      if (!id) return;

      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendor:vendors(*),
          items:purchase_order_items(
            *,
            product:products(
              name,
              description
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setPO(data);
    } catch (err) {
      console.error('Error fetching purchase order:', err);
      setError(err instanceof Error ? err.message : 'Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: PurchaseOrder['status']) => {
    try {
      if (!id) return;

      const { error } = await supabase
        .from('purchase_orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      // If status is changed to received, handle receiving items
      if (newStatus === 'received') {
        await handleReceiveItems();
      } else {
        await fetchPurchaseOrder();
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleReceiveItems = async () => {
    if (!po) return;

    try {
      setProcessingAction(true);
      
      // Update PO status
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({ 
          status: 'received',
          actual_delivery_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (poError) throw poError;

      // Get the current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Update items status and create inventory transactions
      for (const item of po.items) {
        // Update item status
        const { error: itemError } = await supabase
          .from('purchase_order_items')
          .update({
            status: 'received',
            received_quantity: item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        if (itemError) throw itemError;

        // Create inventory transaction
        const { error: transactionError } = await supabase
          .from('inventory_transactions')
          .insert([{
            product_id: item.product_id,
            transaction_type: 'purchase_received',
            quantity: item.quantity, // Positive quantity for receiving items
            unit_cost: item.unit_cost,
            reference_id: po.id,
            reference_type: 'purchase_order',
            notes: `Received from PO ${po.po_number}`,
            created_by: userData.user.id
          }]);

        if (transactionError) throw transactionError;
      }

      await fetchPurchaseOrder();
    } catch (err) {
      console.error('Error receiving items:', err);
      setError(err instanceof Error ? err.message : 'Failed to receive items');
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        Purchase order not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/purchase-orders')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Purchase Orders
        </button>
        <div className="flex items-center space-x-4">
          {po.status === 'sent' && (
            <button
              onClick={() => handleStatusChange('received')}
              disabled={processingAction}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <Truck className="w-4 h-4 mr-2" />
              Receive Items
            </button>
          )}
          <Link
            to={`/admin/purchase-orders/${id}/edit`}
            className={cn(
              "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700",
              (po.status === 'received' || po.status === 'cancelled') && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit PO
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{po.po_number}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(po.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <select
                value={po.status}
                onChange={(e) => handleStatusChange(e.target.value as PurchaseOrder['status'])}
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium border-2",
                  STATUS_COLORS[po.status]
                )}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-semibold mb-4">Vendor Information</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex items-center">
                  <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <div className="font-medium">{po.vendor.name}</div>
                    {po.vendor.contact_person && (
                      <div className="text-sm text-gray-500">
                        Contact: {po.vendor.contact_person}
                      </div>
                    )}
                  </div>
                </div>
                {po.vendor.email && (
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-gray-400 mr-3" />
                    <a
                      href={`mailto:${po.vendor.email}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {po.vendor.email}
                    </a>
                  </div>
                )}
                {po.vendor.phone && (
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-gray-400 mr-3" />
                    <a
                      href={`tel:${po.vendor.phone}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {po.vendor.phone}
                    </a>
                  </div>
                )}
                {po.vendor.address && (
                  <div className="flex items-start">
                    <Building2 className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                    <div className="text-gray-600 whitespace-pre-wrap">
                      {po.vendor.address}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Order Details</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Expected Delivery</div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    {po.expected_delivery_date ? (
                      new Date(po.expected_delivery_date).toLocaleDateString()
                    ) : (
                      'Not specified'
                    )}
                  </div>
                </div>
                {po.actual_delivery_date && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Actual Delivery</div>
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      {new Date(po.actual_delivery_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {po.notes && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Notes</div>
                    <p className="text-gray-600 whitespace-pre-wrap">{po.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Order Items</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Cost
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {po.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Package className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {item.product.name}
                            </div>
                            {item.product.description && (
                              <div className="text-sm text-gray-500">
                                {item.product.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.quantity}</div>
                        {item.received_quantity > 0 && (
                          <div className="text-sm text-gray-500">
                            Received: {item.received_quantity}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(item.unit_cost)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(item.quantity * item.unit_cost)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full justify-center",
                          ITEM_STATUS_COLORS[item.status]
                        )}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-6 py-4 text-right font-medium">
                      Total Amount:
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(po.total_amount)}
                      </div>
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}