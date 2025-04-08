import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { X, ChevronRight, ShoppingBag, Clock, List, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../lib/utils';

type Order = {
    order_id: string;
    order_number: string;
    status: string;
    total_amount: number;
    payment_status: string;
    created_at: string;
};

type Props = {
    recordId: string;
    organizationId: string;
    title?: string;
    refreshKey?: number;
    defaultExpanded?: boolean;
};

export function RelatedOrders({
    recordId,
    organizationId,
    title = 'Orders',
    refreshKey,
    defaultExpanded = false
}: Props) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const fetchOrders = async () => {
        if (!organizationId || !recordId) return;

        setLoading(true);

        const { data, error } = await supabase
            .from('order_hdr')
            .select('*')
            .eq('customer_id', recordId)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch orders:', error);
        } else {
            setOrders(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (organizationId && recordId) {
            fetchOrders();
        }
    }, [recordId, organizationId, refreshKey]);

    // Function to render an order item - reused in both views
    const renderOrderItem = (order: Order) => (
        <Link
            key={order.order_id}
            to={`/admin/orders/${order.order_id}`}
            className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150 flex items-start"
        >
            <div className="flex-shrink-0 bg-blue-100 rounded-full p-1.5 mt-0.5 mr-3">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                    {order.order_number}
                </p>
                <div className="flex items-center mt-1 text-xs text-gray-500 space-x-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {order.status}
                    </span>
                    <span className="text-xs text-gray-500">
                        {formatCurrency(order.total_amount)}
                    </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                        {order.payment_status}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(order.created_at).toLocaleDateString()}
                    </span>
                </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 ml-2" />
        </Link>
    );

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
                <ShoppingBag className="w-4 h-4 text-gray-500 mr-2" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</h3>
                <span className="ml-auto bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full mr-2">
                    {orders.length}
                </span>
                <button
                    onClick={toggleExpanded}
                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </button>
            </div>

            {isExpanded && (
                <>
                    {loading ? (
                        <div className="p-4 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                            No orders found for this record.
                        </div>
                    ) : (
                        <>
                            <div className="divide-y divide-gray-200">
                                {/* Only show the first 5 orders */}
                                {orders.slice(0, 5).map(renderOrderItem)}
                            </div>

                            {/* "View All" button - only show if there are more than 5 orders */}
                            {orders.length > 5 && (
                                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-center">
                                    <button
                                        onClick={() => setIsViewAllModalOpen(true)}
                                        className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center"
                                    >
                                        <List className="w-4 h-4 mr-1" />
                                        View All Orders ({orders.length})
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* View All Orders Modal */}
            {isViewAllModalOpen && (
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setIsViewAllModalOpen(false)}
                >
                    <motion.div
                        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900">All Orders</h4>
                                <p className="text-sm text-gray-500 mt-1">
                                    Showing all {orders.length} orders
                                </p>
                            </div>
                            <button
                                onClick={() => setIsViewAllModalOpen(false)}
                                className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            <div className="divide-y divide-gray-200">
                                {orders.map(renderOrderItem)}
                            </div>
                        </div>

                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setIsViewAllModalOpen(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}