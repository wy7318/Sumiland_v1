import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Search,
    Plus,
    Package,
    Clock,
    CheckCircle,
    AlertCircle,
    ArrowLeft,
    ArrowRight
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn, formatCurrency } from '../../../lib/utils';
import { useOrganization } from '../../../contexts/OrganizationContext';

export const PurchaseOrderList = () => {
    const navigate = useNavigate();
    const { selectedOrganization } = useOrganization();
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const ordersPerPage = 10;

    useEffect(() => {
        fetchPurchaseOrders();
    }, [selectedOrganization, statusFilter, currentPage, searchTerm]);

    const fetchPurchaseOrders = async () => {
        if (!selectedOrganization?.id) return;
        setLoading(true);

        try {
            let query = supabase
                .from('purchase_orders')
                .select(`
          id, 
          order_number, 
          order_date, 
          expected_delivery_date, 
          status, 
          total_amount,
          vendors(id, name),
          payment_status
        `, { count: 'exact' })
                .eq('organization_id', selectedOrganization?.id)
                .order('created_at', { ascending: false })
                .range((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage - 1);

            // Apply status filter if not 'all'
            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            // Apply search filter
            if (searchTerm) {
                query = query.or(`order_number.ilike.%${searchTerm}%,vendors.name.ilike.%${searchTerm}%`);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            setPurchaseOrders(data || []);
            setTotalCount(count || 0);
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
        } finally {
            setLoading(false);
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
                    return { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-4 h-4 mr-1" /> };
                case 'partially_received':
                    return { bg: 'bg-amber-100', text: 'text-amber-800', icon: <Package className="w-4 h-4 mr-1" /> };
                case 'fully_received':
                    return { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: <CheckCircle className="w-4 h-4 mr-1" /> };
                case 'cancelled':
                    return { bg: 'bg-red-100', text: 'text-red-800', icon: <AlertCircle className="w-4 h-4 mr-1" /> };
                default:
                    return { bg: 'bg-gray-100', text: 'text-gray-800', icon: null };
            }
        };

        const { bg, text, icon } = getStatusConfig(status);

        return (
            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", bg, text)}>
                {icon}
                {status.replace('_', ' ')}
            </span>
        );
    };

    const PaymentStatusBadge = ({ status }) => {
        const getStatusConfig = (status) => {
            switch (status) {
                case 'Pending':
                    return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
                case 'Partial Received':
                    return { bg: 'bg-blue-100', text: 'text-blue-800' };
                case 'Fully Received':
                    return { bg: 'bg-green-100', text: 'text-green-800' };
                default:
                    return { bg: 'bg-gray-100', text: 'text-gray-800' };
            }
        };

        const { bg, text } = getStatusConfig(status);

        return (
            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", bg, text)}>
                {status}
            </span>
        );
    };

    const totalPages = Math.ceil(totalCount / ordersPerPage);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
                    onClick={() => navigate('/admin/purchase-orders/new')}
                >
                    <Plus className="w-5 h-5 mr-1" />
                    New Order
                </motion.button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                    {/* Search Field */}
                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Search orders..."
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                    </div>

                    {/* Status Filter */}
                    <select
                        className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="submitted">Submitted</option>
                        <option value="approved">Approved</option>
                        <option value="partially_received">Partially Received</option>
                        <option value="fully_received">Fully Received</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : purchaseOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders found</h3>
                        <p className="text-gray-500 mb-6">Get started by creating your first purchase order</p>
                        <button
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center mx-auto"
                            onClick={() => navigate('/admin/purchase-orders/new')}
                        >
                            <Plus className="w-5 h-5 mr-1" />
                            Create Purchase Order
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Number</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Delivery</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {purchaseOrders.map((order) => (
                                        <motion.tr
                                            key={order.id}
                                            whileHover={{ backgroundColor: 'rgba(243, 244, 246, 0.5)' }}
                                            className="hover:bg-gray-50 cursor-pointer"
                                            onClick={() => navigate(`/admin/purchase-orders/${order.id}`)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{order.order_number}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.vendors?.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(order.order_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {order.expected_delivery_date
                                                    ? new Date(order.expected_delivery_date).toLocaleDateString()
                                                    : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                {formatCurrency(order.total_amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge status={order.status} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <PaymentStatusBadge status={order.payment_status} />
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                                <div className="flex flex-1 justify-between sm:hidden">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className={cn(
                                            "relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700",
                                            currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                                        )}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className={cn(
                                            "relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700",
                                            currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                                        )}
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing <span className="font-medium">{(currentPage - 1) * ordersPerPage + 1}</span> to{" "}
                                            <span className="font-medium">
                                                {Math.min(currentPage * ordersPerPage, totalCount)}
                                            </span>{" "}
                                            of <span className="font-medium">{totalCount}</span> results
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                            <button
                                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                                disabled={currentPage === 1}
                                                className={cn(
                                                    "relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400",
                                                    currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                                                )}
                                            >
                                                <span className="sr-only">Previous</span>
                                                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                                            </button>
                                            {Array.from({ length: totalPages }, (_, i) => (
                                                <button
                                                    key={i + 1}
                                                    onClick={() => setCurrentPage(i + 1)}
                                                    className={cn(
                                                        "relative inline-flex items-center px-4 py-2 text-sm font-semibold",
                                                        currentPage === i + 1
                                                            ? "z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                                                            : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                                                    )}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                                disabled={currentPage === totalPages}
                                                className={cn(
                                                    "relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400",
                                                    currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                                                )}
                                            >
                                                <span className="sr-only">Next</span>
                                                <ArrowRight className="h-5 w-5" aria-hidden="true" />
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
