import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    PlusCircle,
    FileText,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Truck
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn, formatCurrency, formatDate } from '../../../lib/utils';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { PurchaseOrderStats } from './PurchaseOrderStats';
import { PurchaseOrderSearch } from './PurchaseOrderSearch';
import { PurchaseOrderFilter } from './PurchaseOrderFilter';

export const PurchaseOrderList = () => {
    const navigate = useNavigate();
    const { selectedOrganization } = useOrganization();

    const [loading, setLoading] = useState(true);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({});
    const [sortField, setSortField] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');

    const pageSize = 10;

    useEffect(() => {
        if (selectedOrganization?.id) {
            fetchPurchaseOrders();
        }
    }, [selectedOrganization, page, searchTerm, filters, sortField, sortDirection]);

    const fetchPurchaseOrders = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('purchase_orders')
                .select(`
                    *,
                    vendors(name),
                    purchase_order_items(id)
                `, { count: 'exact' })
                .eq('organization_id', selectedOrganization.id)
                .order(sortField, { ascending: sortDirection === 'asc' })
                .range((page - 1) * pageSize, page * pageSize - 1);

            
if (searchTerm && searchTerm.trim() !== '') {
    // Use the database function for comprehensive search
    const { data, error } = await supabase.rpc(
        'search_purchase_orders',
        { 
            p_organization_id: selectedOrganization.id,
            p_search_term: searchTerm,
            p_page_size: pageSize,
            p_page: page
        }
    );
    
    if (error) throw error;
    
    // The count will need to be fetched separately when using an RPC
    const { count, error: countError } = await supabase.rpc(
        'count_search_purchase_orders',
        { 
            p_organization_id: selectedOrganization.id,
            p_search_term: searchTerm
        }
    );
    
    if (countError) throw countError;
    
    setPurchaseOrders(data || []);
    setTotalCount(count || 0);
} else {
    // Use the regular query if no search term
    let query = supabase
        .from('purchase_orders')
        .select(`
            *,
            vendors(name),
            purchase_order_items(id)
        `, { count: 'exact' })
        .eq('organization_id', selectedOrganization.id)
        .order(sortField, { ascending: sortDirection === 'asc' }) // Add sorting here
        .range((page - 1) * pageSize, page * pageSize - 1);       // Add pagination here

    // Apply any other filters if needed

    const { data, count, error } = await query;

    if (error) throw error;
    setPurchaseOrders(data || []);
    setTotalCount(count || 0);
}
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
            alert('Failed to fetch purchase orders');
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (field) => {
        if (field === sortField) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleSearch = (term) => {
        setSearchTerm(term);
        setPage(1); // Reset to first page on new search
    };

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        setPage(1); // Reset to first page on filter change
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'draft':
                return 'bg-gray-100 text-gray-800';
            case 'submitted':
                return 'bg-blue-100 text-blue-800';
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'partially_received':
                return 'bg-amber-100 text-amber-800';
            case 'fully_received':
                return 'bg-emerald-100 text-emerald-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/admin/purchase-orders/new')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
                >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    New Purchase Order
                </motion.button>
            </div>

            {/* Statistics Dashboard */}
            <div className="mb-8">
                <PurchaseOrderStats />
            </div>

            {/* Search and Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <PurchaseOrderSearch onSearch={handleSearch} />
                </div>
                <div className="md:col-span-1 flex justify-end">
                    <PurchaseOrderFilter onApplyFilters={handleFilterChange} />
                </div>
            </div>

            {/* Purchase Orders Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : purchaseOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No purchase orders found</h3>
                        <p className="text-gray-500 mt-1">
                            {searchTerm || Object.keys(filters).length > 0
                                ? 'Try adjusting your search or filters'
                                : 'Create your first purchase order to get started'}
                        </p>
                        {!searchTerm && Object.keys(filters).length === 0 && (
                            <button
                                onClick={() => navigate('/admin/purchase-orders/new')}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
                            >
                                Create Purchase Order
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('order_number')}
                                        >
                                            <div className="flex items-center">
                                                PO Number
                                                {sortField === 'order_number' && (
                                                    <ArrowUpDown className={`w-4 h-4 ml-1 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} />
                                                )}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Vendor
                                        </th>
                                        <th
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('order_date')}
                                        >
                                            <div className="flex items-center">
                                                Date
                                                {sortField === 'order_date' && (
                                                    <ArrowUpDown className={`w-4 h-4 ml-1 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} />
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('total_amount')}
                                        >
                                            <div className="flex items-center">
                                                Amount
                                                {sortField === 'total_amount' && (
                                                    <ArrowUpDown className={`w-4 h-4 ml-1 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} />
                                                )}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {purchaseOrders.map((order) => (
                                        <tr
                                            key={order.id}
                                            className="cursor-pointer hover:bg-gray-50"
                                            onClick={() => navigate(`/admin/purchase-orders/${order.id}`)}
                                        >
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-blue-600">{order.order_number}</div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{order.vendors?.name || 'Unknown'}</div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">{formatDate(order.order_date)}</div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{formatCurrency(order.total_amount)}</div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={cn(
                                                    "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                                                    getStatusBadgeClass(order.status)
                                                )}>
                                                    {order.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                                                    {(order.status === 'approved' || order.status === 'partially_received') && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/admin/purchase-orders/${order.id}/receive`);
                                                            }}
                                                            className="text-green-600 hover:text-green-900"
                                                            title="Receive Goods"
                                                        >
                                                            <Truck className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    <button
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page === 1}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                        disabled={page === totalPages}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing <span className="font-medium">{((page - 1) * pageSize) + 1}</span> to{' '}
                                            <span className="font-medium">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                                            <span className="font-medium">{totalCount}</span> results
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            <button
                                                onClick={() => setPage(Math.max(1, page - 1))}
                                                disabled={page === 1}
                                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <span className="sr-only">Previous</span>
                                                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                            </button>

                                            {/* Page numbers */}
                                            {[...Array(totalPages)].map((_, i) => {
                                                const pageNum = i + 1;
                                                // Only show current page and 1 page before/after
                                                if (
                                                    pageNum === 1 ||
                                                    pageNum === totalPages ||
                                                    (pageNum >= page - 1 && pageNum <= page + 1)
                                                ) {
                                                    return (
                                                        <button
                                                            key={pageNum}
                                                            onClick={() => setPage(pageNum)}
                                                            className={cn(
                                                                "relative inline-flex items-center px-4 py-2 border text-sm font-medium",
                                                                page === pageNum
                                                                    ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                                                    : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                                            )}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                } else if (
                                                    (pageNum === 2 && page > 3) ||
                                                    (pageNum === totalPages - 1 && page < totalPages - 2)
                                                ) {
                                                    // Show ellipsis
                                                    return (
                                                        <span
                                                            key={pageNum}
                                                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                                                        >
                                                            ...
                                                        </span>
                                                    );
                                                }

                                                return null;
                                            })}

                                            <button
                                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                                disabled={page === totalPages}
                                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <span className="sr-only">Next</span>
                                                <ChevronRight className="h-5 w-5" aria-hidden="true" />
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