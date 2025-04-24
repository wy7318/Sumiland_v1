import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertCircle,
    Package,
    Building2,
    Download,
    Search,
    ArrowUpDown,
    ArrowLeft,
    TrendingUp,
    ShoppingCart,
    Filter,
    BarChart3
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn, formatCurrency } from '../../../lib/utils';
import { useOrganization } from '../../../contexts/OrganizationContext';

interface LowStockItem {
    id: string;
    product_id: string;
    product_name: string;
    sku: string;
    location_id: string;
    location_name: string;
    current_stock: number;
    min_stock_level: number;
    max_stock_level: number;
    stock_unit: string;
    avg_cost: number;
    inventory_value: number;
    reorder_quantity: number;
    stock_status: 'out' | 'low' | 'critical';
    deficit: number;
}

export const LowStockReport = () => {
    const { selectedOrganization } = useOrganization();
    const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<LowStockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [locations, setLocations] = useState<{ id: string, name: string }[]>([]);

    // Sorting
    const [sortConfig, setSortConfig] = useState<{
        key: keyof LowStockItem;
        direction: 'asc' | 'desc';
    }>({
        key: 'deficit',
        direction: 'desc'
    });

    // Summary metrics
    const [summary, setSummary] = useState({
        totalItems: 0,
        outOfStock: 0,
        lowStock: 0,
        criticalStock: 0,
        totalDeficit: 0
    });

    // Fetch low stock items
    useEffect(() => {
        if (!selectedOrganization?.id) return;

        const fetchLowStockItems = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Fetch all inventory with product details
                const { data: inventoryData, error: inventoryError } = await supabase
                    .from('available_inventory')
                    .select(`
            id,
            product_id,
            product_name,
            sku,
            location_id,
            location_name,
            current_stock,
            avg_cost,
            inventory_value
          `)
                    .eq('organization_id', selectedOrganization.id);

                if (inventoryError) throw inventoryError;

                if (inventoryData) {
                    // Get additional product details
                    const productIds = [...new Set(inventoryData.map(item => item.product_id))];

                    const { data: productsData, error: productsError } = await supabase
                        .from('products')
                        .select('id, min_stock_level, max_stock_level, stock_unit, metadata')
                        .in('id', productIds)
                        .eq('organization_id', selectedOrganization.id);

                    if (productsError) throw productsError;

                    // Find items that are below min_stock_level
                    const lowItems = inventoryData
                        .map(item => {
                            const productData = productsData?.find(p => p.id === item.product_id);

                            if (!productData || !productData.min_stock_level) return null;

                            // Only include if below min stock level
                            if (item.current_stock >= productData.min_stock_level) return null;

                            // Calculate deficit (how many items needed to reach min level)
                            const deficit = productData.min_stock_level - item.current_stock;

                            // Determine status
                            let status: 'out' | 'low' | 'critical' = 'low';
                            if (item.current_stock <= 0) {
                                status = 'out';
                            } else if (item.current_stock <= productData.min_stock_level * 0.25) {
                                status = 'critical';
                            }

                            // Get reorder quantity from metadata if available
                            const metadata = productData.metadata || {};
                            const reorderQuantity = metadata.reorder_quantity || productData.min_stock_level || 0;

                            return {
                                ...item,
                                min_stock_level: productData.min_stock_level,
                                max_stock_level: productData.max_stock_level || 0,
                                stock_unit: productData.stock_unit || 'unit',
                                reorder_quantity: reorderQuantity,
                                stock_status: status,
                                deficit
                            };
                        })
                        .filter(Boolean) as LowStockItem[];

                    setLowStockItems(lowItems);
                    setFilteredItems(lowItems);

                    // Calculate summary
                    const outOfStock = lowItems.filter(item => item.stock_status === 'out').length;
                    const criticalStock = lowItems.filter(item => item.stock_status === 'critical').length;
                    const lowStock = lowItems.filter(item => item.stock_status === 'low').length;
                    const totalDeficit = lowItems.reduce((sum, item) => sum + item.deficit, 0);

                    setSummary({
                        totalItems: lowItems.length,
                        outOfStock,
                        lowStock,
                        criticalStock,
                        totalDeficit
                    });

                    // Fetch locations for filter
                    const { data: locationsData } = await supabase
                        .from('locations')
                        .select('id, name')
                        .eq('organization_id', selectedOrganization.id)
                        .eq('is_active', true);

                    if (locationsData) {
                        setLocations(locationsData);
                    }
                }
            } catch (error) {
                console.error('Error fetching low stock items:', error);
                setError('Failed to load low stock report');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLowStockItems();
    }, [selectedOrganization?.id]);

    // Apply filters
    useEffect(() => {
        if (!lowStockItems.length) return;

        let result = [...lowStockItems];

        // Apply search filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(
                item =>
                    item.product_name.toLowerCase().includes(lowerSearch) ||
                    item.sku.toLowerCase().includes(lowerSearch) ||
                    item.location_name.toLowerCase().includes(lowerSearch)
            );
        }

        // Apply location filter
        if (locationFilter) {
            result = result.filter(item => item.location_id === locationFilter);
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            result = result.filter(item => item.stock_status === statusFilter);
        }

        // Apply sorting
        result.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        setFilteredItems(result);
    }, [lowStockItems, searchTerm, locationFilter, statusFilter, sortConfig]);

    // Handle sorting
    const handleSort = (key: keyof LowStockItem) => {
        setSortConfig(prevConfig => ({
            key,
            direction:
                prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Export low stock report to CSV
    const exportToCSV = () => {
        if (!filteredItems.length) return;

        // Create CSV content
        const csvHeader = [
            'Product',
            'SKU',
            'Location',
            'Current Stock',
            'Minimum Level',
            'Stock Status',
            'Deficit',
            'Reorder Quantity',
            'Unit Cost',
            'Total Value'
        ].join(',');

        const csvRows = filteredItems.map(item => [
            `"${item.product_name.replace(/"/g, '""')}"`,
            `"${item.sku}"`,
            `"${item.location_name.replace(/"/g, '""')}"`,
            item.current_stock,
            item.min_stock_level,
            item.stock_status,
            item.deficit,
            item.reorder_quantity,
            item.avg_cost,
            item.inventory_value
        ].join(','));

        const csvContent = [csvHeader, ...csvRows].join('\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `low-stock-report-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center mb-6">
                <Link
                    to="/admin/inventory"
                    className="mr-4 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h1 className="text-2xl font-bold">Low Stock Report</h1>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <div className="flex items-center mb-1">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                        <h3 className="text-sm font-medium text-gray-700">Total Items</h3>
                    </div>
                    <p className="text-2xl font-bold">{summary.totalItems}</p>
                    <p className="text-xs text-gray-500">Items below minimum stock</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md">
                    <div className="flex items-center mb-1">
                        <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                        <h3 className="text-sm font-medium text-gray-700">Out of Stock</h3>
                    </div>
                    <p className="text-2xl font-bold">{summary.outOfStock}</p>
                    <p className="text-xs text-gray-500">Items with zero stock</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md">
                    <div className="flex items-center mb-1">
                        <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
                        <h3 className="text-sm font-medium text-gray-700">Critical</h3>
                    </div>
                    <p className="text-2xl font-bold">{summary.criticalStock}</p>
                    <p className="text-xs text-gray-500">Items at &lt;25% of minimum</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md">
                    <div className="flex items-center mb-1">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                        <h3 className="text-sm font-medium text-gray-700">Low Stock</h3>
                    </div>
                    <p className="text-2xl font-bold">{summary.lowStock}</p>
                    <p className="text-xs text-gray-500">Items below minimum</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md">
                    <div className="flex items-center mb-1">
                        <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="text-sm font-medium text-gray-700">Total Deficit</h3>
                    </div>
                    <p className="text-2xl font-bold">{summary.totalDeficit.toFixed(0)}</p>
                    <p className="text-xs text-gray-500">Units needed to reach min levels</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
                    <div className="relative flex-1">
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

                    <div className="w-full md:w-48">
                        <select
                            className="w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                        >
                            <option value="">All Locations</option>
                            {locations.map(location => (
                                <option key={location.id} value={location.id}>
                                    {location.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="w-full md:w-48">
                        <select
                            className="w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="out">Out of Stock</option>
                            <option value="critical">Critical Stock</option>
                            <option value="low">Low Stock</option>
                        </select>
                    </div>

                    <button
                        onClick={exportToCSV}
                        disabled={filteredItems.length === 0}
                        className="inline-flex items-center px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </button>
                </div>
            </div>

            {/* Low stock items table */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                        <div className="text-red-700">
                            <h3 className="text-sm font-medium">Error</h3>
                            <p className="mt-1 text-sm">{error}</p>
                        </div>
                    </div>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    {lowStockItems.length === 0 ? (
                        <>
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">All stocked up!</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                You don't have any items below their minimum stock levels.
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                                <Filter className="h-6 w-6 text-gray-600" />
                            </div>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Try adjusting your search or filters to see more results.
                            </p>
                        </>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
                        <span className="text-sm text-gray-600">
                            Showing {filteredItems.length}
                            {filteredItems.length !== lowStockItems.length && ` of ${lowStockItems.length}`} low stock items
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort('product_name')}
                                    >
                                        <div className="flex items-center">
                                            Product
                                            {sortConfig.key === 'product_name' && (
                                                <ArrowUpDown className={cn("h-4 w-4 ml-1", {
                                                    "text-blue-600": sortConfig.key === 'product_name'
                                                })} />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort('location_name')}
                                    >
                                        <div className="flex items-center">
                                            Location
                                            {sortConfig.key === 'location_name' && (
                                                <ArrowUpDown className={cn("h-4 w-4 ml-1", {
                                                    "text-blue-600": sortConfig.key === 'location_name'
                                                })} />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort('current_stock')}
                                    >
                                        <div className="flex items-center">
                                            Current
                                            {sortConfig.key === 'current_stock' && (
                                                <ArrowUpDown className={cn("h-4 w-4 ml-1", {
                                                    "text-blue-600": sortConfig.key === 'current_stock'
                                                })} />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort('min_stock_level')}
                                    >
                                        <div className="flex items-center">
                                            Minimum
                                            {sortConfig.key === 'min_stock_level' && (
                                                <ArrowUpDown className={cn("h-4 w-4 ml-1", {
                                                    "text-blue-600": sortConfig.key === 'min_stock_level'
                                                })} />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort('deficit')}
                                    >
                                        <div className="flex items-center">
                                            Deficit
                                            {sortConfig.key === 'deficit' && (
                                                <ArrowUpDown className={cn("h-4 w-4 ml-1", {
                                                    "text-blue-600": sortConfig.key === 'deficit'
                                                })} />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => handleSort('reorder_quantity')}
                                    >
                                        <div className="flex items-center">
                                            Reorder Qty
                                            {sortConfig.key === 'reorder_quantity' && (
                                                <ArrowUpDown className={cn("h-4 w-4 ml-1", {
                                                    "text-blue-600": sortConfig.key === 'reorder_quantity'
                                                })} />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        Status
                                    </th>
                                    <th
                                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        <Link
                                                            to={`/admin/inventory/products/${item.product_id}`}
                                                            className="hover:text-blue-600"
                                                        >
                                                            {item.product_name}
                                                        </Link>
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        SKU: {item.sku}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                                                <span className="text-sm text-gray-900">{item.location_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className={cn("text-sm font-medium", {
                                                "text-red-600": item.stock_status === 'out',
                                                "text-orange-600": item.stock_status === 'critical',
                                                "text-yellow-600": item.stock_status === 'low'
                                            })}>
                                                {item.current_stock} {item.stock_unit}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {item.min_stock_level} {item.stock_unit}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-red-600">
                                                {item.deficit} {item.stock_unit}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {item.reorder_quantity} {item.stock_unit}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={cn("px-2 inline-flex text-xs leading-5 font-semibold rounded-full", {
                                                "bg-red-100 text-red-800": item.stock_status === 'out',
                                                "bg-orange-100 text-orange-800": item.stock_status === 'critical',
                                                "bg-yellow-100 text-yellow-800": item.stock_status === 'low'
                                            })}>
                                                {item.stock_status === 'out' ? 'Out of Stock' :
                                                    item.stock_status === 'critical' ? 'Critical' : 'Low Stock'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link
                                                to={`/admin/inventory/receive?product=${item.product_id}&location=${item.location_id}&quantity=${item.reorder_quantity}`}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                            >
                                                <div className="inline-flex items-center">
                                                    <TrendingUp className="h-4 w-4 mr-1" />
                                                    Restock
                                                </div>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LowStockReport;