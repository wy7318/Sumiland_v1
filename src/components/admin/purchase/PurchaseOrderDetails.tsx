import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Edit,
    Truck,
    FileText,
    Package,
    Calendar,
    Map,
    User,
    Clock,
    Download,
    Building2,
    Mail
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn, formatCurrency, formatDate } from '../../../lib/utils';
import { useOrganization } from '../../../contexts/OrganizationContext';

export const PurchaseOrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { selectedOrganization } = useOrganization();

    const [loading, setLoading] = useState(true);
    const [purchaseOrder, setPurchaseOrder] = useState(null);
    const [goodsReceipts, setGoodsReceipts] = useState([]);

    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusOptions] = useState([
        { value: 'draft', label: 'Draft' },
        { value: 'submitted', label: 'Submitted' },
        { value: 'approved', label: 'Approved' },
        { value: 'partially_received', label: 'Partially Received' },
        { value: 'fully_received', label: 'Fully Received' },
        { value: 'cancelled', label: 'Cancelled' }
    ]);

    useEffect(() => {
        fetchPurchaseOrderDetails();
    }, [id, selectedOrganization]);

    const fetchPurchaseOrderDetails = async () => {
        if (!id || !selectedOrganization?.id) return;

        setLoading(true);
        try {
            // Fetch PO with details
            const { data: poData, error: poError } = await supabase
                .from('purchase_orders')
                .select(`
          *,
          vendors(*),
          purchase_order_items(*, products(*))
        `)
                .eq('id', id)
                .eq('organization_id', selectedOrganization.id)
                .single();

            if (poError) throw poError;
            setPurchaseOrder(poData);

            // Fetch goods receipts
            const { data: receiptsData, error: receiptsError } = await supabase
                .from('goods_receipts')
                .select(`
          *,
          goods_receipt_items(*, purchase_order_items(*, products(*)))
        `)
                .eq('purchase_order_id', id)
                .eq('organization_id', selectedOrganization.id)
                .order('receipt_date', { ascending: false });

            if (receiptsError) throw receiptsError;
            setGoodsReceipts(receiptsData || []);
        } catch (error) {
            console.error('Error fetching purchase order details:', error);
            navigate('/admin/purchase-orders');
        } finally {
            setLoading(false);
        }
    };

    // Add this function to update the status
    const updateStatus = async (newStatus) => {
        if (newStatus === purchaseOrder.status) {
            setShowStatusDropdown(false);
            return;
        }

        setUpdatingStatus(true);
        try {
            const { error } = await supabase
                .from('purchase_orders')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('organization_id', selectedOrganization.id);

            if (error) throw error;

            // Update local state
            setPurchaseOrder({
                ...purchaseOrder,
                status: newStatus
            });

            // Refresh the PO details
            fetchPurchaseOrderDetails();
        } catch (err) {
            console.error("Error updating status:", err);
            alert("Failed to update status");
        } finally {
            setUpdatingStatus(false);
            setShowStatusDropdown(false);
        }
    };

    // Status badge component with appropriate colors
    const StatusBadge = ({ status }) => {
        const getStatusConfig = (status) => {
            switch (status) {
                case 'draft':
                    return { bg: 'bg-gray-100', text: 'text-gray-800', icon: <Clock className="w-4 h-4 mr-1" /> };
                case 'submitted':
                    return { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Package className="w-4 h-4 mr-1" /> };
                case 'approved':
                    return { bg: 'bg-green-100', text: 'text-green-800', icon: <User className="w-4 h-4 mr-1" /> };
                case 'partially_received':
                    return { bg: 'bg-amber-100', text: 'text-amber-800', icon: <Package className="w-4 h-4 mr-1" /> };
                case 'fully_received':
                    return { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: <Package className="w-4 h-4 mr-1" /> };
                case 'cancelled':
                    return { bg: 'bg-red-100', text: 'text-red-800', icon: <Clock className="w-4 h-4 mr-1" /> };
                default:
                    return { bg: 'bg-gray-100', text: 'text-gray-800', icon: null };
            }
        };

        const { bg, text, icon } = getStatusConfig(status);

        return (
            <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium", bg, text)}>
                {icon}
                {status.replace('_', ' ')}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!purchaseOrder) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Purchase order not found.</p>
                <button
                    onClick={() => navigate('/admin/purchase-orders')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                    Back to Purchase Orders
                </button>
            </div>
        );
    }

    // Calculate the correct subtotal (sum of line totals)
    const calculateSubtotal = () => {
        if (!purchaseOrder?.purchase_order_items) return 0;

        return purchaseOrder.purchase_order_items.reduce((sum, item) =>
            sum + (parseFloat(item.line_total) || parseFloat(item.quantity) * parseFloat(item.unit_price)),
            0);
    };

    // Calculate the correct tax amount (based on line tax rates)
    const calculateTaxTotal = () => {
        if (!purchaseOrder?.purchase_order_items) return 0;

        return purchaseOrder.purchase_order_items.reduce((sum, item) => {
            const lineAmount = parseFloat(item.line_total) ||
                (parseFloat(item.quantity) * parseFloat(item.unit_price));
            const taxRate = parseFloat(item.tax_rate) || 0;
            return sum + (lineAmount * (taxRate / 100));
        }, 0);
    };

    // Calculate the final total
    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const taxTotal = calculateTaxTotal();
        const shipping = parseFloat(purchaseOrder.shipping_amount) || 0;
        const discount = parseFloat(purchaseOrder.discount_amount) || 0;

        return subtotal + taxTotal + shipping - discount;
    };


    // Calculate received quantities and remaining quantities
    const itemsStatus = purchaseOrder.purchase_order_items.map(item => {
        // Sum up all receipts for this item
        const totalReceived = goodsReceipts.reduce((sum, receipt) => {
            const receiptItem = receipt.goods_receipt_items.find(ri => ri.purchase_order_item_id === item.id);
            return sum + (receiptItem ? parseFloat(receiptItem.quantity) : 0);
        }, 0);

        const remainingQuantity = parseFloat(item.quantity) - totalReceived;

        return {
            ...item,
            received: totalReceived,
            remaining: remainingQuantity,
            isFullyReceived: remainingQuantity <= 0
        };
    });

    const canReceiveGoods = purchaseOrder.status === 'approved' ||
        purchaseOrder.status === 'partially_received';

    const allItemsReceived = itemsStatus.every(item => item.isFullyReceived);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate('/admin/purchase-orders')}
                        className="mr-4 text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Purchase Order: {purchaseOrder.order_number}
                    </h1>
                </div>

                <div className="flex space-x-3">
                    {canReceiveGoods && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
                            onClick={() => navigate(`/admin/purchase-orders/${id}/receive`)}
                        >
                            <Truck className="w-5 h-5 mr-2" />
                            Receive Items
                        </motion.button>
                    )}

                    {purchaseOrder.status === 'draft' && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
                            onClick={() => navigate(`/admin/purchase-orders/${id}/edit`)}
                        >
                            <Edit className="w-5 h-5 mr-2" />
                            Edit
                        </motion.button>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center"
                        onClick={() => {/* PDF export functionality would go here */ }}
                    >
                        <Download className="w-5 h-5 mr-2" />
                        Export PDF
                    </motion.button>

                    {purchaseOrder.vendors?.email && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center"
                            onClick={() => {/* Email sending functionality would go here */ }}
                        >
                            <Mail className="w-5 h-5 mr-2" />
                            Email Vendor
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Status Information */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center">
                        <div className="mr-4 relative">
                            <span className="block text-sm text-gray-500">Status</span>
                            <div className="flex items-center">
                                <StatusBadge status={purchaseOrder.status} />
                                <button
                                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                    className="ml-2 text-gray-400 hover:text-gray-600"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                            </div>

                            {showStatusDropdown && (
                                <div className="absolute z-10 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[180px]">
                                    {statusOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => updateStatus(option.value)}
                                            disabled={updatingStatus}
                                            className={`w-full text-left px-3 py-2 text-sm rounded ${purchaseOrder.status === option.value
                                                    ? 'bg-blue-100 text-blue-800 font-medium'
                                                    : 'hover:bg-gray-100'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="mr-4">
                            <span className="block text-sm text-gray-500">Order Date</span>
                            <span className="text-gray-900 font-medium">
                                {formatDate(purchaseOrder.order_date)}
                            </span>
                        </div>
                        {purchaseOrder.expected_delivery_date && (
                            <div>
                                <span className="block text-sm text-gray-500">Expected Delivery</span>
                                <span className="text-gray-900 font-medium">
                                    {formatDate(purchaseOrder.expected_delivery_date)}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center">
                        <div className="mr-6">
                            <span className="block text-sm text-gray-500">Total Amount</span>
                            <span className="text-gray-900 font-bold text-xl">
                                {formatCurrency(purchaseOrder.total_amount)}
                            </span>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500">Payment Terms</span>
                            <span className="text-gray-900 font-medium">
                                {purchaseOrder.payment_terms || 'Not specified'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Left Column - Vendor & Shipping Information */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-medium text-gray-900">Vendor Information</h2>
                            <Building2 className="w-5 h-5 text-gray-400" />
                        </div>

                        <div className="mb-4">
                            <h3 className="font-medium text-gray-900">{purchaseOrder.vendors?.name}</h3>
                            {purchaseOrder.vendors?.contact_person && (
                                <p className="text-gray-600">{purchaseOrder.vendors.contact_person}</p>
                            )}
                            {purchaseOrder.vendors?.email && (
                                <p className="text-gray-600">{purchaseOrder.vendors.email}</p>
                            )}
                            {purchaseOrder.vendors?.phone && (
                                <p className="text-gray-600">{purchaseOrder.vendors.phone}</p>
                            )}
                        </div>

                        {purchaseOrder.notes && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                                <p className="text-gray-600 whitespace-pre-line">{purchaseOrder.notes}</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-medium text-gray-900">Shipping Information</h2>
                            <Truck className="w-5 h-5 text-gray-400" />
                        </div>

                        <div className="mb-4">
                            <h3 className="font-medium text-gray-900 mb-2">Shipping Address</h3>
                            <address className="not-italic text-gray-600">
                                {purchaseOrder.shipping_address_line1 && (
                                    <p>{purchaseOrder.shipping_address_line1}</p>
                                )}
                                {purchaseOrder.shipping_address_line2 && (
                                    <p>{purchaseOrder.shipping_address_line2}</p>
                                )}
                                {(purchaseOrder.shipping_city || purchaseOrder.shipping_state || purchaseOrder.shipping_postal_code) && (
                                    <p>
                                        {purchaseOrder.shipping_city && `${purchaseOrder.shipping_city}, `}
                                        {purchaseOrder.shipping_state && `${purchaseOrder.shipping_state} `}
                                        {purchaseOrder.shipping_postal_code && purchaseOrder.shipping_postal_code}
                                    </p>
                                )}
                                {purchaseOrder.shipping_country && (
                                    <p>{purchaseOrder.shipping_country}</p>
                                )}
                            </address>
                        </div>

                        <div>
                            <h3 className="font-medium text-gray-900 mb-2">Billing Address</h3>
                            <address className="not-italic text-gray-600">
                                {purchaseOrder.billing_address_line1 && (
                                    <p>{purchaseOrder.billing_address_line1}</p>
                                )}
                                {purchaseOrder.billing_address_line2 && (
                                    <p>{purchaseOrder.billing_address_line2}</p>
                                )}
                                {(purchaseOrder.billing_city || purchaseOrder.billing_state || purchaseOrder.billing_postal_code) && (
                                    <p>
                                        {purchaseOrder.billing_city && `${purchaseOrder.billing_city}, `}
                                        {purchaseOrder.billing_state && `${purchaseOrder.billing_state} `}
                                        {purchaseOrder.billing_postal_code && purchaseOrder.billing_postal_code}
                                    </p>
                                )}
                                {purchaseOrder.billing_country && (
                                    <p>{purchaseOrder.billing_country}</p>
                                )}
                            </address>
                        </div>
                    </div>
                </div>

                {/* Right Column - Items & Receipts */}
                <div className="lg:col-span-2">
                    {/* Order Items */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Order Items</h2>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {itemsStatus.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{item.products.name}</div>
                                                <div className="text-sm text-gray-500">{item.products.sku}</div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.quantity} {item.products.stock_unit}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatCurrency(item.unit_price)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {parseFloat(item.tax_rate).toFixed(2)}%
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatCurrency(item.discount_amount || 0)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {formatCurrency(item.line_total)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={cn(
                                                    "text-sm",
                                                    item.received > 0 ? "text-green-600 font-medium" : "text-gray-500"
                                                )}>
                                                    {item.received} {item.products.stock_unit}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={cn(
                                                    "text-sm",
                                                    item.remaining <= 0
                                                        ? "text-green-600 font-medium"
                                                        : "text-amber-600 font-medium"
                                                )}>
                                                    {item.remaining <= 0
                                                        ? "Fully Received"
                                                        : `${item.remaining} ${item.products.stock_unit}`}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50">
                                    <tr>
                                        <td colSpan="3" className="px-4 py-3 text-right text-sm font-medium text-gray-500">Subtotal:</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {formatCurrency(calculateSubtotal())}
                                        </td>
                                        <td colSpan="2"></td>
                                    </tr>
                                    <tr>
                                        <td colSpan="3" className="px-4 py-3 text-right text-sm font-medium text-gray-500">Tax:</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {formatCurrency(calculateTaxTotal())}
                                        </td>
                                        <td colSpan="2"></td>
                                    </tr>
                                    {(purchaseOrder.shipping_amount > 0) && (
                                        <tr>
                                            <td colSpan="3" className="px-4 py-3 text-right text-sm font-medium text-gray-500">Shipping:</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {formatCurrency(purchaseOrder.shipping_amount)}
                                            </td>
                                            <td colSpan="2"></td>
                                        </tr>
                                    )}
                                    {(purchaseOrder.discount_amount > 0) && (
                                        <tr>
                                            <td colSpan="3" className="px-4 py-3 text-right text-sm font-medium text-gray-500">Discount:</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                -{formatCurrency(purchaseOrder.discount_amount)}
                                            </td>
                                            <td colSpan="2"></td>
                                        </tr>
                                    )}
                                    <tr className="border-t-2 border-gray-200">
                                        <td colSpan="3" className="px-4 py-3 text-right text-sm font-bold text-gray-900">Total:</td>
                                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                                            {formatCurrency(calculateTotal())}
                                        </td>
                                        <td colSpan="2"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Goods Receipts */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-medium text-gray-900">Goods Receipts</h2>
                            {goodsReceipts.length > 0 ? (
                                <span className="text-sm text-gray-500">{goodsReceipts.length} receipt(s)</span>
                            ) : canReceiveGoods ? (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="text-green-600 hover:text-green-800 flex items-center text-sm"
                                    onClick={() => navigate(`/admin/purchase-orders/${id}/receive`)}
                                >
                                    <Truck className="w-4 h-4 mr-1" />
                                    Receive Items
                                </motion.button>
                            ) : null}
                        </div>

                        {goodsReceipts.length === 0 ? (
                            <div className="text-center py-8">
                                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">No goods have been received yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {goodsReceipts.map(receipt => (
                                    <div key={receipt.id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex flex-wrap justify-between items-center mb-4">
                                            <div>
                                                <h3 className="font-medium text-gray-900">{receipt.receipt_number}</h3>
                                                <p className="text-sm text-gray-500">
                                                    Received on {formatDate(receipt.receipt_date)}
                                                </p>
                                            </div>
                                            <Link
                                                to={`/goods-receipts/${receipt.id}`}
                                                className="text-blue-600 hover:text-blue-800 text-sm"
                                            >
                                                View Details
                                            </Link>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Rate %</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {receipt.goods_receipt_items.map(item => (
                                                        <tr key={item.id}>
                                                            <td className="px-4 py-2 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {item.purchase_order_items.products.name}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    {item.purchase_order_items.products.sku}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                                {item.quantity} {item.purchase_order_items.products.stock_unit}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {receipt.notes && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <p className="text-sm text-gray-600">{receipt.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};