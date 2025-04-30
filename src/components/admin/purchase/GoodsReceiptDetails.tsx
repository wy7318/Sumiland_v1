import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Package,
    Calendar,
    Clipboard,
    Truck,
    User,
    FileText
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatDate, formatCurrency } from '../../../lib/utils';
import { useOrganization } from '../../../contexts/OrganizationContext';

export const GoodsReceiptDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { selectedOrganization } = useOrganization();

    const [loading, setLoading] = useState(true);
    const [goodsReceipt, setGoodsReceipt] = useState(null);

    useEffect(() => {
        fetchGoodsReceiptDetails();
    }, [id, selectedOrganization]);

    const fetchGoodsReceiptDetails = async () => {
        if (!id || !selectedOrganization?.id) return;

        setLoading(true);
        try {
            // Fetch goods receipt with details
            const { data, error } = await supabase
                .from('goods_receipts')
                .select(`
                    *,
                    purchase_orders(*, vendors(*)),
                    goods_receipt_items(
                        *,
                        purchase_order_items(*, products(*)),
                        inventory:inventory_id(*, location:location_id(*))
                    )
                `)
                .eq('id', id)
                .eq('organization_id', selectedOrganization.id)
                .single();

            if (error) throw error;
            setGoodsReceipt(data);
        } catch (error) {
            console.error('Error fetching goods receipt details:', error);
            alert('Failed to load goods receipt details.');
            navigate('/admin/purchase-orders');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!goodsReceipt) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Goods receipt not found.</p>
                <button
                    onClick={() => navigate('/admin/purchase-orders')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                    Back to Purchase Orders
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center mb-6">
                <button
                    onClick={() => navigate(`/admin/purchase-orders/${goodsReceipt.purchase_order_id}`)}
                    className="mr-4 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                    Goods Receipt: {goodsReceipt.receipt_number}
                </h1>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                {/* Receipt Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="flex flex-col">
                        <span className="text-sm text-gray-500 mb-1">Receipt Date</span>
                        <span className="flex items-center text-lg font-medium text-gray-900">
                            <Calendar className="w-5 h-5 mr-2 text-gray-500" />
                            {formatDate(goodsReceipt.receipt_date)}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-gray-500 mb-1">Related Purchase Order</span>
                        <Link
                            to={`/admin/purchase-orders/${goodsReceipt.purchase_order_id}`}
                            className="flex items-center text-lg font-medium text-blue-600 hover:text-blue-800"
                        >
                            <Clipboard className="w-5 h-5 mr-2 text-gray-500" />
                            {goodsReceipt.purchase_orders?.order_number || "N/A"}
                        </Link>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-gray-500 mb-1">Vendor</span>
                        <span className="flex items-center text-lg font-medium text-gray-900">
                            <Truck className="w-5 h-5 mr-2 text-gray-500" />
                            {goodsReceipt.purchase_orders?.vendors?.name || "N/A"}
                        </span>
                    </div>
                </div>

                {goodsReceipt.notes && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
                        <p className="text-gray-600">{goodsReceipt.notes}</p>
                    </div>
                )}

                {/* Received Items */}
                <div className="mt-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Received Items</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage Location</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {goodsReceipt.goods_receipt_items.map(item => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {item.purchase_order_items?.products?.name || "N/A"}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {item.purchase_order_items?.products?.sku || ""}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {item.quantity} {item.purchase_order_items?.products?.stock_unit || ""}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatCurrency(item.purchase_order_items?.unit_price || 0)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatCurrency((item.purchase_order_items?.unit_price || 0) * item.quantity)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {item.inventory?.location?.name || "Unknown"}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.notes || ""}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Information about when received */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-center text-sm text-gray-500">
                        <User className="w-4 h-4 mr-1" />
                        Processed on {formatDate(goodsReceipt.created_at)}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={() => navigate(`/admin/purchase-orders/${goodsReceipt.purchase_order_id}`)}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Back to Purchase Order
                    </button>
                </div>
            </div>
        </div>
    );
};