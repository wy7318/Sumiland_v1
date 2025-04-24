import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Package,
    Tag,
    Building2,
    Edit,
    TrendingUp,
    TrendingDown,
    BarChart3,
    Clock,
    AlertCircle,
    DollarSign,
    Truck,
    ChevronDown,
    ChevronRight,
    Users,
    ArrowDownRight,
    ArrowUpRight,
    Search
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn, formatCurrency } from '../../../lib/utils';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { useTimeZone } from '../../../contexts/TimeZoneContext';
import { TransactionType } from './inventoryTypes';

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    status: string;
    category_id: string;
    category: string;
    image_url: string;
    avg_cost: number;
    min_stock_level: number;
    max_stock_level: number;
    stock_unit: string;
    weight_unit: string;
    vendor_ids: string[];
    last_purchase_cost: number;
    sku: string;
    metadata: any;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
}

interface Inventory {
    id: string;
    location_id: string;
    location_name: string;
    current_stock: number;
    committed_stock: number;
    available_stock: number;
    shelf_location: string;
    inventory_value: number;
}

interface Transaction {
    id: string;
    transaction_type: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
    reference_id: string;
    reference_type: string;
    location_name: string;
    created_at: string;
}

interface VendorInfo {
    id: string;
    name: string;
    contact_info: string;
}

export const ProductDetails = () => {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();
    const { selectedOrganization } = useOrganization();
    const { formatDate } = useTimeZone();

    const [product, setProduct] = useState<Product | null>(null);
    const [inventoryItems, setInventoryItems] = useState<Inventory[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [vendors, setVendors] = useState<VendorInfo[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI state
    const [showAllLocations, setShowAllLocations] = useState(false);
    const [showAllTransactions, setShowAllTransactions] = useState(false);
    const [expandDescription, setExpandDescription] = useState(false);

    // Summary stats
    const [summary, setSummary] = useState({
        totalStock: 0,
        totalValue: 0,
        totalLocations: 0,
        lowStockLocations: 0
    });

    // Fetch product details
    useEffect(() => {
        if (!selectedOrganization?.id || !productId) return;

        const fetchProductDetails = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Fetch product details
                const { data: productData, error: productError } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', productId)
                    .eq('organization_id', selectedOrganization.id)
                    .single();

                if (productError) throw productError;

                if (productData) {
                    setProduct(productData);

                    // Fetch inventory for this product across all locations
                    const { data: inventoryData, error: inventoryError } = await supabase
                        .from('available_inventory')
                        .select(`
              id,
              location_id,
              location_name,
              current_stock,
              committed_stock,
              available_stock,
              inventory_value
            `)
                        .eq('product_id', productId)
                        .eq('organization_id', selectedOrganization.id);

                    if (inventoryError) throw inventoryError;

                    if (inventoryData) {
                        // Get shelf locations
                        const { data: inventoriesData } = await supabase
                            .from('inventories')
                            .select('id, shelf_location')
                            .in('id', inventoryData.map(item => item.id))
                            .eq('organization_id', selectedOrganization.id);

                        // Merge data
                        const mergedInventory = inventoryData.map(item => {
                            const inventoryDetail = inventoriesData?.find(i => i.id === item.id);

                            return {
                                ...item,
                                shelf_location: inventoryDetail?.shelf_location || ''
                            };
                        });

                        setInventoryItems(mergedInventory);

                        // Calculate summary
                        const totalStock = mergedInventory.reduce((sum, item) => sum + item.current_stock, 0);
                        const totalValue = mergedInventory.reduce((sum, item) => sum + item.inventory_value, 0);
                        const lowStockLocations = mergedInventory.filter(
                            item => item.current_stock < productData.min_stock_level && productData.min_stock_level > 0
                        ).length;

                        setSummary({
                            totalStock,
                            totalValue,
                            totalLocations: mergedInventory.length,
                            lowStockLocations
                        });
                    }

                    // Fetch recent transactions
                    const { data: transactionsData, error: transactionsError } = await supabase
                        .from('inventory_transactions')
                        .select(`
              id,
              transaction_type,
              quantity,
              unit_cost,
              total_cost,
              reference_id,
              reference_type,
              created_at,
              locations(name)
            `)
                        .eq('product_id', productId)
                        .eq('organization_id', selectedOrganization.id)
                        .order('created_at', { ascending: false })
                        .limit(10);

                    if (transactionsError) throw transactionsError;

                    if (transactionsData) {
                        const formattedTransactions = transactionsData.map(tx => ({
                            id: tx.id,
                            transaction_type: tx.transaction_type,
                            quantity: tx.quantity,
                            unit_cost: tx.unit_cost,
                            total_cost: tx.total_cost,
                            reference_id: tx.reference_id,
                            reference_type: tx.reference_type,
                            location_name: tx.locations?.name || 'Unknown',
                            created_at: tx.created_at
                        }));

                        setRecentTransactions(formattedTransactions);
                    }

                    // Fetch vendor information if vendor_ids present
                    if (productData.vendor_ids && productData.vendor_ids.length > 0) {
                        const { data: vendorsData } = await supabase
                            .from('vendors') // Adjust based on your vendor table name
                            .select('id, name, contact_info')
                            .in('id', productData.vendor_ids)
                            .eq('organization_id', selectedOrganization.id);

                        if (vendorsData) {
                            setVendors(vendorsData);
                        }
                    }
                } else {
                    setError('Product not found');
                }
            } catch (error) {
                console.error('Error fetching product details:', error);
                setError('Failed to load product details');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProductDetails();
    }, [selectedOrganization?.id, productId]);

    // Helper function to get transaction icon
    const getTransactionIcon = (type: string) => {
        switch (type) {
            case TransactionType.PURCHASE:
                return <TrendingUp className="h-4 w-4 text-green-600" />;
            case TransactionType.SALE:
                return <TrendingDown className="h-4 w-4 text-red-600" />;
            case TransactionType.ADJUSTMENT:
                return <BarChart3 className="h-4 w-4 text-purple-600" />;
            case TransactionType.TRANSFER_IN:
                return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
            case TransactionType.TRANSFER_OUT:
                return <ArrowDownRight className="h-4 w-4 text-orange-600" />;
            default:
                return <Package className="h-4 w-4 text-gray-600" />;
        }
    };

    // Helper function to get transaction type label
    const getTransactionTypeLabel = (type: string) => {
        switch (type) {
            case TransactionType.PURCHASE:
                return 'Purchase';
            case TransactionType.SALE:
                return 'Sale';
            case TransactionType.ADJUSTMENT:
                return 'Adjustment';
            case TransactionType.TRANSFER_IN:
                return 'Transfer In';
            case TransactionType.TRANSFER_OUT:
                return 'Transfer Out';
            case TransactionType.RETURN:
                return 'Return';
            default:
                return type;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center mb-6">
                <button
                    onClick={() => navigate('/admin/inventory/products')}
                    className="mr-4 text-gray-600 hover:text-gray-900"
                    aria-label="Back to products"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-2xl font-bold">Product Details</h1>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                        <div className="text-red-700">
                            <h3 className="text-sm font-medium">Error</h3>
                            <p className="mt-1 text-sm">{error}</p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <button
                            onClick={() => navigate('/admin/inventory/products')}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            Back to Products
                        </button>
                    </div>
                </div>
            ) : product ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Product Information */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold">{product.name}</h2>
                                    <div className="flex items-center mt-1">
                                        <Tag className="h-4 w-4 text-gray-400 mr-1" />
                                        <span className="text-sm text-gray-500">SKU: {product.sku}</span>
                                    </div>
                                </div>

                                {product.status && (
                                    <span className={cn("px-2 inline-flex text-xs leading-5 font-semibold rounded-full", {
                                        "bg-green-100 text-green-800": product.status === 'active',
                                        "bg-red-100 text-red-800": product.status === 'inactive',
                                        "bg-gray-100 text-gray-800": product.status !== 'active' && product.status !== 'inactive'
                                    })}>
                                        {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                                    </span>
                                )}
                            </div>

                            {product.description && (
                                <div className="mb-4">
                                    <p className={cn("text-sm text-gray-600", {
                                        "line-clamp-3": !expandDescription
                                    })}>
                                        {product.description}
                                    </p>
                                    {product.description.length > 150 && (
                                        <button
                                            className="text-sm text-blue-600 mt-1"
                                            onClick={() => setExpandDescription(!expandDescription)}
                                        >
                                            {expandDescription ? 'Show less' : 'Show more'}
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="border-t border-gray-200 pt-4 pb-2">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Product Details</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {product.category && (
                                        <div>
                                            <p className="text-xs text-gray-500">Category</p>
                                            <p className="text-sm">{product.category}</p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-xs text-gray-500">Unit of Measure</p>
                                        <p className="text-sm">{product.stock_unit || 'N/A'}</p>
                                    </div>

                                    {product.weight_unit && (
                                        <div>
                                            <p className="text-xs text-gray-500">Weight Unit</p>
                                            <p className="text-sm">{product.weight_unit}</p>
                                        </div>
                                    )}

                                    {typeof product.price === 'number' && (
                                        <div>
                                            <p className="text-xs text-gray-500">Sell Price</p>
                                            <p className="text-sm font-medium">{formatCurrency(product.price)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Inventory Settings */}
                        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Inventory Settings</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-gray-500">Min Stock Level</p>
                                    <p className="text-sm">
                                        {product.min_stock_level ? `${product.min_stock_level} ${product.stock_unit}` : 'Not set'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500">Max Stock Level</p>
                                    <p className="text-sm">
                                        {product.max_stock_level ? `${product.max_stock_level} ${product.stock_unit}` : 'Not set'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500">Average Cost</p>
                                    <p className="text-sm font-medium">{formatCurrency(product.avg_cost || 0)}</p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500">Last Purchase Cost</p>
                                    <p className="text-sm">{formatCurrency(product.last_purchase_cost || 0)}</p>
                                </div>
                            </div>

                            <div className="mt-4 border-t border-gray-200 pt-4">
                                <div className="flex justify-end">
                                    <Link
                                        to={`/admin/inventory/products/${product.id}/edit`}
                                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit Product
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Vendors */}
                        {vendors.length > 0 && (
                            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Vendors</h3>
                                <div className="space-y-3">
                                    {vendors.map(vendor => (
                                        <div key={vendor.id} className="flex items-start">
                                            <Users className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium">{vendor.name}</p>
                                                {vendor.contact_info && (
                                                    <p className="text-xs text-gray-500">{vendor.contact_info}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Inventory and Transactions */}
                    <div className="md:col-span-2">
                        {/* Summary cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white p-4 rounded-lg shadow-md">
                                <div className="flex items-center mb-1">
                                    <Package className="h-5 w-5 text-blue-600 mr-2" />
                                    <h3 className="text-sm font-medium text-gray-700">Total Stock</h3>
                                </div>
                                <p className="text-2xl font-bold">{summary.totalStock.toFixed(1)}</p>
                                <p className="text-xs text-gray-500">Across all locations</p>
                            </div>

                            <div className="bg-white p-4 rounded-lg shadow-md">
                                <div className="flex items-center mb-1">
                                    <Building2 className="h-5 w-5 text-purple-600 mr-2" />
                                    <h3 className="text-sm font-medium text-gray-700">Locations</h3>
                                </div>
                                <p className="text-2xl font-bold">{summary.totalLocations}</p>
                                <p className="text-xs text-gray-500">Stocking locations</p>
                            </div>

                            <div className="bg-white p-4 rounded-lg shadow-md">
                                <div className="flex items-center mb-1">
                                    <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
                                    <h3 className="text-sm font-medium text-gray-700">Low Stock</h3>
                                </div>
                                <p className="text-2xl font-bold">{summary.lowStockLocations}</p>
                                <p className="text-xs text-gray-500">
                                    {summary.lowStockLocations === 1 ? 'Location' : 'Locations'} below minimum
                                </p>
                            </div>

                            <div className="bg-white p-4 rounded-lg shadow-md">
                                <div className="flex items-center mb-1">
                                    <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                                    <h3 className="text-sm font-medium text-gray-700">Total Value</h3>
                                </div>
                                <p className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</p>
                                <p className="text-xs text-gray-500">Based on avg. cost</p>
                            </div>
                        </div>

                        {/* Inventory by Location */}
                        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">Inventory by Location</h2>

                                <div className="flex space-x-2">
                                    <Link
                                        to={`/admin/inventory/receive?product=${product.id}`}
                                        className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                    >
                                        <TrendingUp className="h-4 w-4 mr-2" />
                                        Receive
                                    </Link>
                                </div>
                            </div>

                            {inventoryItems.length === 0 ? (
                                <div className="text-center py-8">
                                    <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">No inventory found</h3>
                                    <p className="text-gray-500 mb-4">
                                        This product isn't stocked in any location yet.
                                    </p>
                                    <Link
                                        to={`/admin/inventory/receive?product=${product.id}`}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                    >
                                        <TrendingUp className="h-4 w-4 mr-2" />
                                        Receive Inventory
                                    </Link>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Location
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    On Hand
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Available
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Shelf
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Value
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {inventoryItems
                                                .slice(0, showAllLocations ? inventoryItems.length : 5)
                                                .map((item) => {
                                                    const isLowStock = product.min_stock_level && item.current_stock < product.min_stock_level;

                                                    return (
                                                        <tr key={item.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                                                                    <Link
                                                                        to={`/admin/inventory/locations/${item.location_id}`}
                                                                        className="text-sm font-medium text-gray-900 hover:text-blue-600"
                                                                    >
                                                                        {item.location_name}
                                                                    </Link>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <div className={cn("text-sm font-medium", {
                                                                    "text-red-600": item.current_stock === 0,
                                                                    "text-orange-600": isLowStock && item.current_stock > 0,
                                                                    "text-gray-900": !isLowStock && item.current_stock > 0
                                                                })}>
                                                                    {item.current_stock} {product.stock_unit}

                                                                    {isLowStock && (
                                                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                            <AlertCircle className="h-3 w-3 mr-0.5" />
                                                                            Low
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900">
                                                                    {item.available_stock} {product.stock_unit}
                                                                </div>
                                                                {item.committed_stock > 0 && (
                                                                    <div className="text-xs text-gray-500">
                                                                        ({item.committed_stock} reserved)
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900">
                                                                    {item.shelf_location || <span className="text-gray-400">—</span>}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900">
                                                                    {formatCurrency(item.inventory_value)}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                                                <Link
                                                                    to={`/admin/inventory/adjust/${item.id}`}
                                                                    className="text-blue-600 hover:text-blue-900 mr-3"
                                                                >
                                                                    Adjust
                                                                </Link>
                                                                <Link
                                                                    to={`/admin/inventory/transfer/${item.id}`}
                                                                    className="text-green-600 hover:text-green-900"
                                                                >
                                                                    Transfer
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {inventoryItems.length > 5 && (
                                <div className="mt-4 text-center">
                                    <button
                                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                                        onClick={() => setShowAllLocations(!showAllLocations)}
                                    >
                                        {showAllLocations ? (
                                            <>
                                                Show Less
                                                <ChevronDown className="h-4 w-4 ml-1" />
                                            </>
                                        ) : (
                                            <>
                                                Show All ({inventoryItems.length}) Locations
                                                <ChevronRight className="h-4 w-4 ml-1" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Recent Transactions */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">Recent Transactions</h2>

                                <Link
                                    to={`/admin/inventory/transactions?product=${product.id}`}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    View All
                                </Link>
                            </div>

                            {recentTransactions.length === 0 ? (
                                <div className="text-center py-8">
                                    <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900">No transactions yet</h3>
                                    <p className="text-gray-500">
                                        There are no recorded transactions for this product.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Date
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Type
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Location
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Quantity
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Value
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Details
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {recentTransactions
                                                .slice(0, showAllTransactions ? recentTransactions.length : 5)
                                                .map((transaction) => (
                                                    <tr key={transaction.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">
                                                                {formatDate(transaction.created_at)}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                {getTransactionIcon(transaction.transaction_type)}
                                                                <span className="ml-1.5 text-sm text-gray-900">
                                                                    {getTransactionTypeLabel(transaction.transaction_type)}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <Building2 className="h-4 w-4 text-gray-400 mr-1.5" />
                                                                <span className="text-sm text-gray-900">
                                                                    {transaction.location_name}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className={cn("text-sm font-medium", {
                                                                "text-green-600": transaction.quantity > 0,
                                                                "text-red-600": transaction.quantity < 0
                                                            })}>
                                                                {transaction.quantity > 0 ? '+' : ''}{transaction.quantity} {product.stock_unit}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            {transaction.total_cost ? (
                                                                <div className="text-sm text-gray-900">
                                                                    {formatCurrency(transaction.total_cost)}
                                                                </div>
                                                            ) : (
                                                                <span className="text-sm text-gray-500">—</span>
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
                            )}

                            {recentTransactions.length > 5 && (
                                <div className="mt-4 text-center">
                                    <button
                                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                                        onClick={() => setShowAllTransactions(!showAllTransactions)}
                                    >
                                        {showAllTransactions ? (
                                            <>
                                                Show Less
                                                <ChevronDown className="h-4 w-4 ml-1" />
                                            </>
                                        ) : (
                                            <>
                                                Show More
                                                <ChevronRight className="h-4 w-4 ml-1" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12">
                    <div className="mx-auto h-12 w-12 text-gray-400">
                        <Package className="h-12 w-12" />
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No product found</h3>
                    <p className="mt-1 text-sm text-gray-500">This product does not exist or you don't have permission to view it.</p>
                    <div className="mt-6">
                        <Link
                            to="/admin/inventory/products"
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Products
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDetails;