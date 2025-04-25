import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Search,
    Filter,
    ArrowUpDown,
    Download,
    Calendar,
    TrendingUp,
    TrendingDown,
    ArrowLeft,
    ArrowRight,
    BarChart3,
    FileText,
    Package,
    Building2,
    Tag,
    User,
    Clock
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn, formatCurrency } from '../../../lib/utils';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { useTimeZone } from '../../../contexts/TimeZoneContext';
import { TransactionWithDetails, TransactionType, getTransactionTypeLabel } from './inventoryTypes';

export const InventoryTransactions = () => {
    const { selectedOrganization } = useOrganization();
    const { formatDate, formatTime } = useTimeZone();
    const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<TransactionWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [dateFilter, setDateFilter] = useState<string>('all');
    const [referenceFilter, setReferenceFilter] = useState('');
    const [sortConfig, setSortConfig] = useState<{
        key: string;
        direction: 'asc' | 'desc';
    }>({
        key: 'created_at',
        direction: 'desc'
    });

    // Fetch transactions
    useEffect(() => {
        if (!selectedOrganization?.id) return;

        const fetchTransactions = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch transactions without nested joins
                const { data: transactionsData, error } = await supabase
                    .from('inventory_transactions')
                    .select(`
                    id,
                    product_id,
                    location_id,
                    transaction_type,
                    quantity,
                    unit_cost,
                    total_cost,
                    reference_id,
                    reference_type,
                    notes,
                    source_location_id,
                    destination_location_id,
                    created_by,
                    created_at
                `)
                    .eq('organization_id', selectedOrganization.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (transactionsData && transactionsData.length > 0) {
                    // 2. Collect all product IDs and unique location IDs
                    const productIds = [...new Set(transactionsData.map(tx => tx.product_id).filter(Boolean))];

                    // Get all location IDs (regular, source, and destination)
                    const locationIds = [...new Set([
                        ...transactionsData.map(tx => tx.location_id),
                        ...transactionsData.map(tx => tx.source_location_id),
                        ...transactionsData.map(tx => tx.destination_location_id)
                    ].filter(Boolean))];

                    const userIds = [...new Set(transactionsData.map(tx => tx.created_by).filter(Boolean))];

                    // 3. Fetch all products in a single query
                    const productsMap = {};
                    if (productIds.length > 0) {
                        const { data: productsData } = await supabase
                            .from('products')
                            .select('id, name, sku, stock_unit')
                            .in('id', productIds);

                        if (productsData) {
                            productsData.forEach(product => {
                                productsMap[product.id] = product;
                            });
                        }
                    }

                    // 4. Fetch all locations in a single query
                    const locationsMap = {};
                    if (locationIds.length > 0) {
                        const { data: locationsData } = await supabase
                            .from('locations')
                            .select('id, name')
                            .in('id', locationIds);

                        if (locationsData) {
                            locationsData.forEach(location => {
                                locationsMap[location.id] = location;
                            });
                        }
                    }

                    // 5. Fetch all users in a single query
                    const usersMap = {};
                    if (userIds.length > 0) {
                        const { data: usersData } = await supabase
                            .from('user_profiles')
                            .select('user_id, full_name, email')
                            .in('user_id', userIds);

                        if (usersData) {
                            usersData.forEach(user => {
                                usersMap[user.user_id] = user;
                            });
                        }
                    }

                    // 6. Combine all the data
                    const enhancedData = transactionsData.map(transaction => {
                        const product = productsMap[transaction.product_id] || { name: 'Unknown Product', sku: '', stock_unit: '' };
                        const location = locationsMap[transaction.location_id] || { name: 'Unknown Location' };
                        const sourceLocation = locationsMap[transaction.source_location_id] || null;
                        const destLocation = locationsMap[transaction.destination_location_id] || null;
                        const user = usersMap[transaction.created_by] || null;

                        return {
                            ...transaction,
                            product: {
                                name: product.name,
                                sku: product.sku,
                                stock_unit: product.stock_unit
                            },
                            location: {
                                name: location.name
                            },
                            source_location: sourceLocation ? { name: sourceLocation.name } : undefined,
                            destination_location: destLocation ? { name: destLocation.name } : undefined,
                            user: user ? {
                                name: user.full_name,
                                email: user.email
                            } : {}
                        };
                    });

                    setTransactions(enhancedData);
                    setFilteredTransactions(enhancedData);
                }
            } catch (error) {
                console.error('Error fetching transactions:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransactions();
    }, [selectedOrganization?.id]);

    // Apply filters
    useEffect(() => {
        if (!transactions.length) return;

        let result = [...transactions];

        // Apply search filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(
                item =>
                    item.product.name.toLowerCase().includes(lowerSearch) ||
                    item.product.sku.toLowerCase().includes(lowerSearch) ||
                    item.location.name.toLowerCase().includes(lowerSearch) ||
                    item.reference_id?.toLowerCase().includes(lowerSearch) ||
                    item.notes?.toLowerCase().includes(lowerSearch)
            );
        }

        // Apply transaction type filter
        if (typeFilter) {
            result = result.filter(item => item.transaction_type === typeFilter);
        }

        // Apply reference filter
        if (referenceFilter) {
            result = result.filter(
                item => item.reference_id?.toLowerCase().includes(referenceFilter.toLowerCase())
            );
        }

        // Apply date filter
        if (dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startDate = new Date(today);

            switch (dateFilter) {
                case 'today':
                    // Already set
                    break;
                case 'yesterday':
                    startDate.setDate(today.getDate() - 1);
                    break;
                case 'thisWeek':
                    startDate.setDate(today.getDate() - today.getDay()); // First day of week (Sunday)
                    break;
                case 'lastWeek':
                    startDate.setDate(today.getDate() - today.getDay() - 7); // Previous week's Sunday
                    const endOfLastWeek = new Date(today);
                    endOfLastWeek.setDate(today.getDate() - today.getDay() - 1); // Previous week's Saturday
                    result = result.filter(
                        item => {
                            const date = new Date(item.created_at);
                            return date >= startDate && date <= endOfLastWeek;
                        }
                    );
                    break;
                case 'thisMonth':
                    startDate.setDate(1); // First day of month
                    break;
                case 'lastMonth':
                    startDate.setMonth(today.getMonth() - 1, 1); // First day of previous month
                    const endOfLastMonth = new Date(today);
                    endOfLastMonth.setDate(0); // Last day of previous month
                    result = result.filter(
                        item => {
                            const date = new Date(item.created_at);
                            return date >= startDate && date <= endOfLastMonth;
                        }
                    );
                    break;
                default:
                // No date filtering
            }

            if (dateFilter !== 'lastWeek' && dateFilter !== 'lastMonth') {
                result = result.filter(
                    item => {
                        const date = new Date(item.created_at);
                        return date >= startDate && date <= now;
                    }
                );
            }
        }

        // Apply sorting
        result.sort((a, b) => {
            const aValue = a[sortConfig.key as keyof TransactionWithDetails];
            const bValue = b[sortConfig.key as keyof TransactionWithDetails];

            if (!aValue && !bValue) return 0;
            if (!aValue) return 1;
            if (!bValue) return -1;

            // Special case for dates
            if (sortConfig.key === 'created_at') {
                return sortConfig.direction === 'asc'
                    ? new Date(aValue as string).getTime() - new Date(bValue as string).getTime()
                    : new Date(bValue as string).getTime() - new Date(aValue as string).getTime();
            }

            // String comparison for other fields
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            // Number comparison
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'asc'
                    ? aValue - bValue
                    : bValue - aValue;
            }

            return 0;
        });

        setFilteredTransactions(result);
    }, [transactions, searchTerm, typeFilter, dateFilter, referenceFilter, sortConfig]);

    // Handle sorting
    const handleSort = (key: string) => {
        setSortConfig(prevConfig => ({
            key,
            direction:
                prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Export transactions to CSV
    const exportToCSV = () => {
        // Create CSV content
        const csvHeader = [
            'Transaction ID',
            'Date',
            'Type',
            'Product',
            'SKU',
            'Location',
            'Quantity',
            'Unit Cost',
            'Total Cost',
            'Reference ID',
            'Notes'
        ].join(',');

        const csvRows = filteredTransactions.map(tx => [
            `"${tx.id}"`,
            `"${formatDate(tx.created_at)}"`,
            `"${getTransactionTypeLabel(tx.transaction_type)}"`,
            `"${tx.product.name.replace(/"/g, '""')}"`,
            `"${tx.product.sku}"`,
            `"${tx.location.name.replace(/"/g, '""')}"`,
            tx.quantity,
            tx.unit_cost || '',
            tx.total_cost || '',
            `"${tx.reference_id || ''}"`,
            `"${tx.notes?.replace(/"/g, '""') || ''}"`,
        ].join(','));

        const csvContent = [csvHeader, ...csvRows].join('\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `inventory-transactions-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper function to get appropriate icon for transaction type
    const getTransactionIcon = (type: string) => {
        switch (type) {
            case TransactionType.PURCHASE:
                return <TrendingUp className="h-4 w-4 text-green-600" />;
            case TransactionType.SALE:
                return <TrendingDown className="h-4 w-4 text-red-600" />;
            case TransactionType.ADJUSTMENT:
                return <BarChart3 className="h-4 w-4 text-purple-600" />;
            case TransactionType.TRANSFER_IN:
                return <ArrowRight className="h-4 w-4 text-blue-600" />;
            case TransactionType.TRANSFER_OUT:
                return <ArrowLeft className="h-4 w-4 text-orange-600" />;
            case TransactionType.RETURN:
                return <ArrowLeft className="h-4 w-4 text-teal-600" />;
            default:
                return <FileText className="h-4 w-4 text-gray-600" />;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Inventory Transactions</h1>
                <div className="space-x-2">
                    <button
                        onClick={exportToCSV}
                        className="inline-flex items-center px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300"
                        disabled={filteredTransactions.length === 0 || isLoading}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search products, SKUs, locations..."
                            className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div>
                        <select
                            className="w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="">All Transaction Types</option>
                            <option value={TransactionType.PURCHASE}>Purchases</option>
                            <option value={TransactionType.SALE}>Sales</option>
                            <option value={TransactionType.ADJUSTMENT}>Adjustments</option>
                            <option value={TransactionType.TRANSFER_IN}>Transfers In</option>
                            <option value={TransactionType.TRANSFER_OUT}>Transfers Out</option>
                            <option value={TransactionType.RETURN}>Returns</option>
                        </select>
                    </div>

                    <div>
                        <select
                            className="w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        >
                            <option value="all">All Dates</option>
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="thisWeek">This Week</option>
                            <option value="lastWeek">Last Week</option>
                            <option value="thisMonth">This Month</option>
                            <option value="lastMonth">Last Month</option>
                        </select>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FileText className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Reference ID"
                            className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500"
                            value={referenceFilter}
                            onChange={(e) => setReferenceFilter(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    {filteredTransactions.length === 0 ? (
                        <div className="text-center py-16">
                            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions found</h3>
                            <p className="text-gray-500">
                                {transactions.length > 0
                                    ? 'Try adjusting your filters'
                                    : 'Start by receiving inventory or processing sales'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
                                <span className="text-sm text-gray-600">
                                    Showing {filteredTransactions.length}
                                    {filteredTransactions.length !== transactions.length && ` of ${transactions.length}`} transactions
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSort('created_at')}
                                            >
                                                <div className="flex items-center">
                                                    <Calendar className="h-4 w-4 mr-1" />
                                                    Date
                                                    {sortConfig.key === 'created_at' && (
                                                        <ArrowUpDown className={cn("h-4 w-4 ml-1", {
                                                            "text-blue-600": sortConfig.key === 'created_at'
                                                        })} />
                                                    )}
                                                </div>
                                            </th>
                                            <th
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSort('transaction_type')}
                                            >
                                                <div className="flex items-center">
                                                    Type
                                                    {sortConfig.key === 'transaction_type' && (
                                                        <ArrowUpDown className={cn("h-4 w-4 ml-1", {
                                                            "text-blue-600": sortConfig.key === 'transaction_type'
                                                        })} />
                                                    )}
                                                </div>
                                            </th>
                                            <th
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Product
                                            </th>
                                            <th
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSort('location_id')}
                                            >
                                                <div className="flex items-center">
                                                    Location
                                                    {sortConfig.key === 'location_id' && (
                                                        <ArrowUpDown className={cn("h-4 w-4 ml-1", {
                                                            "text-blue-600": sortConfig.key === 'location_id'
                                                        })} />
                                                    )}
                                                </div>
                                            </th>
                                            <th
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSort('quantity')}
                                            >
                                                <div className="flex items-center">
                                                    Quantity
                                                    {sortConfig.key === 'quantity' && (
                                                        <ArrowUpDown className={cn("h-4 w-4 ml-1", {
                                                            "text-blue-600": sortConfig.key === 'quantity'
                                                        })} />
                                                    )}
                                                </div>
                                            </th>
                                            <th
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSort('unit_cost')}
                                            >
                                                <div className="flex items-center">
                                                    Cost
                                                    {sortConfig.key === 'unit_cost' && (
                                                        <ArrowUpDown className={cn("h-4 w-4 ml-1", {
                                                            "text-blue-600": sortConfig.key === 'unit_cost'
                                                        })} />
                                                    )}
                                                </div>
                                            </th>
                                            <th
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Reference
                                            </th>
                                            <th
                                                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Details
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredTransactions.map((transaction) => (
                                            <tr key={transaction.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {formatDate(transaction.created_at)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {formatTime(transaction.created_at)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        {getTransactionIcon(transaction.transaction_type)}
                                                        <span className="ml-2 text-sm">
                                                            {getTransactionTypeLabel(transaction.transaction_type)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <Package className="h-4 w-4 text-gray-400 mr-2" />
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {transaction.product.name}
                                                            </div>
                                                            <div className="text-xs text-gray-500 flex items-center">
                                                                <Tag className="h-3 w-3 mr-1" />
                                                                {transaction.product.sku}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                                                        <span className="text-sm text-gray-900">
                                                            {transaction.location.name}
                                                        </span>
                                                    </div>
                                                    {(transaction.transaction_type === TransactionType.TRANSFER_IN ||
                                                        transaction.transaction_type === TransactionType.TRANSFER_OUT) && (
                                                            <div className="text-xs text-gray-500 mt-1 flex items-center">
                                                                {transaction.transaction_type === TransactionType.TRANSFER_IN ? (
                                                                    <>
                                                                        <ArrowRight className="h-3 w-3 mr-1" />
                                                                        From: {transaction.source_location?.name || 'Unknown'}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <ArrowLeft className="h-3 w-3 mr-1" />
                                                                        To: {transaction.destination_location?.name || 'Unknown'}
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className={cn("text-sm font-medium", {
                                                        "text-green-600": transaction.quantity > 0,
                                                        "text-red-600": transaction.quantity < 0
                                                    })}>
                                                        {transaction.quantity > 0 ? '+' : ''}{transaction.quantity} {transaction.product.stock_unit}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    {transaction.unit_cost ? (
                                                        <div className="text-sm text-gray-900">
                                                            {formatCurrency(transaction.unit_cost)}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-500">-</span>
                                                    )}
                                                    {transaction.total_cost && (
                                                        <div className="text-xs text-gray-500">
                                                            Total: {formatCurrency(transaction.total_cost)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {transaction.reference_id || '-'}
                                                    </div>
                                                    {transaction.reference_type && (
                                                        <div className="text-xs text-gray-500">
                                                            {transaction.reference_type}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                                    <Link
                                                        to={`/admin/inventory/transactions/${transaction.id}`}
                                                        className="text-blue-600 hover:text-blue-900"
                                                    >
                                                        View
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default InventoryTransactions;