import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Package,
    AlertCircle,
    Truck,
    Building2,
    ArrowLeft,
    ArrowRight,
    Box,
    BarChart3,
    TrendingDown,
    TrendingUp
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn, formatCurrency } from '../../../lib/utils';
import { useOrganization } from '../../../contexts/OrganizationContext';

interface InventorySummary {
    totalProducts: number;
    totalStock: number;
    lowStockItems: number;
    inventoryValue: number;
    locations: number;
}

interface RecentTransaction {
    id: string;
    product_name: string;
    transaction_type: string;
    quantity: number;
    created_at: string;
    location_name: string;
    reference_id: string;
}

export const InventoryDashboard = () => {
    const { selectedOrganization } = useOrganization();
    const [summary, setSummary] = useState<InventorySummary>({
        totalProducts: 0,
        totalStock: 0,
        lowStockItems: 0,
        inventoryValue: 0,
        locations: 0
    });
    const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!selectedOrganization?.id) return;

        const fetchInventorySummary = async () => {
            setIsLoading(true);
            try {
                // Get total products count
                const { count: productsCount } = await supabase
                    .from('products')
                    .select('id', { count: 'exact' })
                    .eq('organization_id', selectedOrganization.id);

                // Get locations count
                const { count: locationsCount } = await supabase
                    .from('locations')
                    .select('id', { count: 'exact' })
                    .eq('organization_id', selectedOrganization.id);

                // Get inventory summary from view
                const { data: inventoryData } = await supabase
                    .from('available_inventory')
                    .select(`
                        current_stock, 
                        available_stock, 
                        inventory_value, 
                        product_id,
                        products!inner(min_stock_level)
                    `)
                    .eq('organization_id', selectedOrganization.id);

                // Calculate totals
                let totalStock = 0;
                let inventoryValue = 0;
                let lowStockItems = 0;

                if (inventoryData) {
                    totalStock = inventoryData.reduce((sum, item) => sum + (item.current_stock || 0), 0);
                    inventoryValue = inventoryData.reduce((sum, item) => sum + (item.inventory_value || 0), 0);
                    lowStockItems = inventoryData.filter(item =>
                        item.current_stock !== null &&
                        item.products?.min_stock_level !== null &&
                        item.current_stock < item.products.min_stock_level
                    ).length;
                }

                setSummary({
                    totalProducts: productsCount || 0,
                    totalStock,
                    lowStockItems,
                    inventoryValue,
                    locations: locationsCount || 0
                });

                // Fetch recent transactions - FLATTENED VERSION
                const { data: transactionsData } = await supabase
                    .from('inventory_transactions')
                    .select(`
                    id,
                    quantity,
                    transaction_type,
                    created_at,
                    reference_id,
                    product_id,
                    location_id
                `)
                    .eq('organization_id', selectedOrganization.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (transactionsData && transactionsData.length > 0) {
                    // Get unique product and location IDs
                    const productIds = [...new Set(transactionsData.map(tx => tx.product_id).filter(Boolean))];
                    const locationIds = [...new Set(transactionsData.map(tx => tx.location_id).filter(Boolean))];

                    // Fetch products in a single query
                    const productsMap = {};
                    if (productIds.length > 0) {
                        const { data: productsData } = await supabase
                            .from('products')
                            .select('id, name')
                            .in('id', productIds);

                        if (productsData) {
                            productsData.forEach(product => {
                                productsMap[product.id] = product;
                            });
                        }
                    }

                    // Fetch locations in a single query
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

                    // Format transactions with the fetched data
                    const formattedTransactions = transactionsData.map(tx => ({
                        id: tx.id,
                        product_name: productsMap[tx.product_id]?.name || 'Unknown Product',
                        transaction_type: tx.transaction_type,
                        quantity: tx.quantity,
                        created_at: tx.created_at,
                        location_name: locationsMap[tx.location_id]?.name || 'Unknown Location',
                        reference_id: tx.reference_id
                    }));

                    setRecentTransactions(formattedTransactions);
                }
            } catch (error) {
                console.error('Error fetching inventory summary:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInventorySummary();
    }, [selectedOrganization?.id]);

    // Helper function to get appropriate icon and color for transaction type
    const getTransactionDetails = (type: string, quantity: number) => {
        switch (type) {
            case 'purchase':
                return {
                    icon: <TrendingUp className="h-4 w-4" />,
                    color: 'text-green-600',
                    label: 'Received'
                };
            case 'sale':
                return {
                    icon: <TrendingDown className="h-4 w-4" />,
                    color: 'text-red-600',
                    label: 'Sold'
                };
            case 'transfer_in':
                return {
                    icon: <ArrowRight className="h-4 w-4" />,
                    color: 'text-blue-600',
                    label: 'Transfer In'
                };
            case 'transfer_out':
                return {
                    icon: <ArrowLeft className="h-4 w-4" />,
                    color: 'text-orange-600',
                    label: 'Transfer Out'
                };
            case 'adjustment':
                return {
                    icon: <BarChart3 className="h-4 w-4" />,
                    color: 'text-purple-600',
                    label: 'Adjustment'
                };
            default:
                return {
                    icon: <Box className="h-4 w-4" />,
                    color: 'text-gray-600',
                    label: type
                };
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Inventory Dashboard</h1>
                <div className="space-x-2">
                    <Link
                        to="/admin/inventory/products"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 rounded-md text-white hover:bg-blue-700"
                    >
                        <Package className="h-4 w-4 mr-2" />
                        Products
                    </Link>
                    <Link
                        to="/admin/inventory/transactions"
                        className="inline-flex items-center px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300"
                    >
                        <Truck className="h-4 w-4 mr-2" />
                        Transactions
                    </Link>
                    <Link
                        to="/admin/inventory/locations"
                        className="inline-flex items-center px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300"
                    >
                        <Building2 className="h-4 w-4 mr-2" />
                        Locations
                    </Link>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white p-6 rounded-lg shadow-md"
                        >
                            <div className="flex items-center mb-2">
                                <Package className="h-5 w-5 text-blue-600 mr-2" />
                                <h3 className="text-lg font-semibold">Total Products</h3>
                            </div>
                            <p className="text-3xl font-bold">{summary.totalProducts}</p>
                            <Link to="/admin/inventory/products" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
                                View all products
                            </Link>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white p-6 rounded-lg shadow-md"
                        >
                            <div className="flex items-center mb-2">
                                <Box className="h-5 w-5 text-green-600 mr-2" />
                                <h3 className="text-lg font-semibold">Total Stock</h3>
                            </div>
                            <p className="text-3xl font-bold">{summary.totalStock.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">{summary.locations} locations</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white p-6 rounded-lg shadow-md"
                        >
                            <div className="flex items-center mb-2">
                                <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
                                <h3 className="text-lg font-semibold">Low Stock Items</h3>
                            </div>
                            <p className="text-3xl font-bold">{summary.lowStockItems}</p>
                            <Link to="/admin/inventory/low-stock" className="text-orange-600 text-sm hover:underline mt-2 inline-block">
                                View low stock items
                            </Link>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white p-6 rounded-lg shadow-md"
                        >
                            <div className="flex items-center mb-2">
                                <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
                                <h3 className="text-lg font-semibold">Inventory Value</h3>
                            </div>
                            <p className="text-3xl font-bold">{formatCurrency(summary.inventoryValue)}</p>
                            <p className="text-sm text-gray-500">Based on avg. cost</p>
                        </motion.div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Recent Transactions</h2>
                            <Link
                                to="/admin/inventory/transactions"
                                className="text-blue-600 hover:underline text-sm"
                            >
                                View all transactions
                            </Link>
                        </div>

                        {recentTransactions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No recent transactions found
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full table-auto">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Product
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Quantity
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Location
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Reference
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {recentTransactions.map((transaction) => {
                                            const { icon, color, label } = getTransactionDetails(
                                                transaction.transaction_type,
                                                transaction.quantity
                                            );

                                            return (
                                                <tr key={transaction.id}>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        {transaction.product_name}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className={`inline-flex items-center ${color}`}>
                                                            {icon}
                                                            <span className="ml-1">{label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={transaction.quantity < 0 ? 'text-red-600' : 'text-green-600'}>
                                                            {Math.abs(transaction.quantity)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        {transaction.location_name}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        {transaction.reference_id || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(transaction.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default InventoryDashboard;