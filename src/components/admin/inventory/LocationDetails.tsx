import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Building2,
    MapPin,
    Package,
    CheckCircle,
    XCircle,
    Pencil,
    AlertCircle,
    Clock,
    User,
    TrendingUp,
    Filter,
    Search,
    ArrowDown,
    ArrowUp,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn, formatCurrency } from '../../../lib/utils';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { useTimeZone } from '../../../contexts/TimeZoneContext';

interface Location {
    id: string;
    name: string;
    type: string;
    address: string;
    description: string;
    is_active: boolean;
    metadata: any;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
}

interface LocationStatistics {
    totalProducts: number;
    totalItems: number;
    totalValue: number;
    lowStockItems: number;
}

interface InventoryItem {
    id: string;
    product_id: string;
    product_name: string;
    sku: string;
    current_stock: number;
    committed_stock: number;
    available_stock: number;
    min_stock_level: number;
    max_stock_level: number;
    avg_cost: number;
    inventory_value: number;
    stock_unit: string;
    shelf_location: string;
}

export const LocationDetails = () => {
    const { locationId } = useParams<{ locationId: string }>();
    const navigate = useNavigate();
    const { selectedOrganization } = useOrganization();
    const { formatDate } = useTimeZone();

    const [location, setLocation] = useState<Location | null>(null);
    const [stats, setStats] = useState<LocationStatistics>({
        totalProducts: 0,
        totalItems: 0,
        totalValue: 0,
        lowStockItems: 0
    });
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Search and filters
    const [searchTerm, setSearchTerm] = useState('');
    const [stockFilter, setStockFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{
        key: keyof InventoryItem;
        direction: 'asc' | 'desc';
    }>({
        key: 'product_name',
        direction: 'asc'
    });

    // Fetch location details
    useEffect(() => {
        if (!selectedOrganization?.id || !locationId) return;

        const fetchLocationDetails = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Fetch location details
                const { data, error } = await supabase
                    .from('locations')
                    .select('*')
                    .eq('id', locationId)
                    .eq('organization_id', selectedOrganization.id)
                    .single();

                if (error) throw error;

                if (data) {
                    setLocation(data);

                    // Fetch inventory at this location
                    const { data: inventoryData, error: inventoryError } = await supabase
                        .from('available_inventory')
                        .select(`
              id, 
              product_id, 
              product_name, 
              sku, 
              current_stock, 
              committed_stock, 
              available_stock, 
              avg_cost, 
              inventory_value
            `)
                        .eq('location_id', locationId)
                        .eq('organization_id', selectedOrganization.id);

                    if (inventoryError) throw inventoryError;

                    if (inventoryData) {
                        // Get additional product details
                        const productIds = inventoryData.map(item => item.product_id);

                        const { data: productsData } = await supabase
                            .from('products')
                            .select('id, min_stock_level, max_stock_level, stock_unit')
                            .in('id', productIds)
                            .eq('organization_id', selectedOrganization.id);

                        // Get shelf locations
                        const { data: inventoriesData } = await supabase
                            .from('inventories')
                            .select('id, shelf_location')
                            .in('id', inventoryData.map(item => item.id))
                            .eq('organization_id', selectedOrganization.id);

                        // Merge data
                        const mergedInventory = inventoryData.map(item => {
                            const productData = productsData?.find(p => p.id === item.product_id);
                            const inventoryData = inventoriesData?.find(i => i.id === item.id);

                            return {
                                ...item,
                                min_stock_level: productData?.min_stock_level || 0,
                                max_stock_level: productData?.max_stock_level || 0,
                                stock_unit: productData?.stock_unit || 'unit',
                                shelf_location: inventoryData?.shelf_location || ''
                            };
                        });

                        setInventory(mergedInventory);
                        setFilteredInventory(mergedInventory);

                        // Calculate statistics
                        const totalProducts = mergedInventory.length;
                        const totalItems = mergedInventory.reduce((sum, item) => sum + item.current_stock, 0);
                        const totalValue = mergedInventory.reduce((sum, item) => sum + item.inventory_value, 0);
                        const lowStockItems = mergedInventory.filter(item =>
                            item.current_stock < item.min_stock_level && item.min_stock_level > 0
                        ).length;

                        setStats({
                            totalProducts,
                            totalItems,
                            totalValue,
                            lowStockItems
                        });
                    }
                } else {
                    setError('Location not found');
                }
            } catch (error) {
                console.error('Error fetching location details:', error);
                setError('Failed to load location details');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLocationDetails();
    }, [selectedOrganization?.id, locationId]);

    // Apply search and filters
    useEffect(() => {
        if (!inventory.length) return;

        let result = [...inventory];

        // Apply search filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(
                item =>
                    item.product_name.toLowerCase().includes(lowerSearch) ||
                    item.sku.toLowerCase().includes(lowerSearch) ||
                    item.shelf_location?.toLowerCase().includes(lowerSearch)
            );
        }

        // Apply stock level filter
        if (stockFilter === 'low') {
            result = result.filter(item => item.current_stock < item.min_stock_level && item.min_stock_level > 0);
        } else if (stockFilter === 'out') {
            result = result.filter(item => item.current_stock === 0);
        } else if (stockFilter === 'overstocked') {
            result = result.filter(item => item.current_stock > item.max_stock_level && item.max_stock_level > 0);
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

        setFilteredInventory(result);
        // Reset to first page when filters change
        setCurrentPage(1);
    }, [inventory, searchTerm, stockFilter, sortConfig]);

    // Handle sorting
    const handleSort = (key: keyof InventoryItem) => {
        setSortConfig(prevConfig => ({
            key,
            direction:
                prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredInventory.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);

    // Get location type details
    const getLocationTypeDetails = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'warehouse':
                return {
                    icon: <Building2 className="h-5 w-5" />,
                    color: 'text-blue-600 bg-blue-100'
                };
            case 'store':
                return {
                    icon: <ShoppingCart className="h-5 w-5" />,
                    color: 'text-green-600 bg-green-100'
                };
            case 'supplier':
                return {
                    icon: <Truck className="h-5 w-5" />,
                    color: 'text-purple-600 bg-purple-100'
                };
            case 'customer':
                return {
                    icon: <Users className="h-5 w-5" />,
                    color: 'text-orange-600 bg-orange-100'
                };
            case 'transit':
                return {
                    icon: <Truck className="h-5 w-5" />,
                    color: 'text-amber-600 bg-amber-100'
                };
            default:
                return {
                    icon: <Building2 className="h-5 w-5" />,
                    color: 'text-gray-600 bg-gray-100'
                };
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center mb-6">
                <button
                    onClick={() => navigate('/admin/inventory/locations')}
                    className="mr-4 text-gray-600 hover:text-gray-900"
                    aria-label="Back to locations"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-2xl font-bold">Location Details</h1>
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
                            onClick={() => navigate('/admin/inventory/locations')}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            Back to Locations
                        </button>
                    </div>
                </div>
            ) : location ? (
                <>
                    {/* Location Summary */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                            <div className="mb-4 md:mb-0">
                                <div className="flex items-center mb-2">
                                    <h2 className="text-xl font-bold">{location.name}</h2>
                                    {location.is_active ? (
                                        <span className="inline-flex items-center ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            <XCircle className="h-3 w-3 mr-1" />
                                            Inactive
                                        </span>
                                    )}
                                </div>

                                {location.type && (
                                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLocationTypeDetails(location.type).color} mb-2`}>
                                        {getLocationTypeDetails(location.type).icon}
                                        <span className="ml-1 capitalize">{location.type}</span>
                                    </div>
                                )}

                                {location.description && (
                                    <p className="text-sm text-gray-600 mt-2">{location.description}</p>
                                )}

                                {location.address && (
                                    <div className="flex items-start mt-3">
                                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
                                        <p className="text-sm text-gray-700">{location.address}</p>
                                    </div>
                                )}

                                <div className="flex items-center mt-3 text-xs text-gray-500">
                                    <Clock className="h-3 w-3 mr-1" />
                                    <span>Created {formatDate(location.created_at)}</span>
                                </div>
                            </div>

                            <div className="flex flex-col space-y-2">
                                <Link
                                    to={`/admin/inventory/locations/${location.id}/edit`}
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit Location
                                </Link>

                                <Link
                                    to={`/admin/inventory/receive?location=${location.id}`}
                                    className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Receive Inventory
                                </Link>
                            </div>
                        </div>

                        {/* Statistics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t border-gray-200 pt-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-500">Products</p>
                                <p className="text-2xl font-bold">{stats.totalProducts}</p>
                            </div>

                            <div className="text-center">
                                <p className="text-sm text-gray-500">Total Items</p>
                                <p className="text-2xl font-bold">{stats.totalItems.toFixed(0)}</p>
                            </div>

                            <div className="text-center">
                                <p className="text-sm text-gray-500">Total Value</p>
                                <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
                            </div>

                            <div className="text-center">
                                <p className="text-sm text-gray-500">Low Stock Items</p>
                                <p className={`text-2xl font-bold ${stats.lowStockItems > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                                    {stats.lowStockItems}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Inventory in this location */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold mb-4">Inventory in this Location</h2>

                        {/* Search and filters */}
                        <div className="flex flex-col md:flex-row md:items-center mb-4 space-y-2 md:space-y-0 md:space-x-4">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search products, SKUs, shelf locations..."
                                    className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="md:w-48">
                                <select
                                    className="w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                    value={stockFilter}
                                    onChange={(e) => setStockFilter(e.target.value)}
                                >
                                    <option value="all">All Stock Levels</option>
                                    <option value="low">Low Stock</option>
                                    <option value="out">Out of Stock</option>
                                    <option value="overstocked">Overstocked</option>
                                </select>
                            </div>
                        </div>

                        {/* Inventory table */}
                        {inventory.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                                <h3 className="text-lg font-medium text-gray-900">No inventory in this location</h3>
                                <p className="text-gray-500 mt-2 mb-4">
                                    Start by receiving inventory into this location.
                                </p>
                                <Link
                                    to={`/admin/inventory/receive?location=${location.id}`}
                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Receive Inventory
                                </Link>
                            </div>
                        ) : filteredInventory.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                                <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                                <h3 className="text-lg font-medium text-gray-900">No matches found</h3>
                                <p className="text-gray-500 mt-2">
                                    Try adjusting your search or filters
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="border-b border-gray-200 pb-2 mb-2">
                                    <span className="text-sm text-gray-600">
                                        Showing {filteredInventory.length} of {inventory.length} products
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
                                                            sortConfig.direction === 'asc' ?
                                                                <ArrowUp className="h-4 w-4 ml-1 text-blue-600" /> :
                                                                <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                    onClick={() => handleSort('current_stock')}
                                                >
                                                    <div className="flex items-center">
                                                        On Hand
                                                        {sortConfig.key === 'current_stock' && (
                                                            sortConfig.direction === 'asc' ?
                                                                <ArrowUp className="h-4 w-4 ml-1 text-blue-600" /> :
                                                                <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                    onClick={() => handleSort('available_stock')}
                                                >
                                                    <div className="flex items-center">
                                                        Available
                                                        {sortConfig.key === 'available_stock' && (
                                                            sortConfig.direction === 'asc' ?
                                                                <ArrowUp className="h-4 w-4 ml-1 text-blue-600" /> :
                                                                <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                    onClick={() => handleSort('shelf_location')}
                                                >
                                                    <div className="flex items-center">
                                                        Shelf
                                                        {sortConfig.key === 'shelf_location' && (
                                                            sortConfig.direction === 'asc' ?
                                                                <ArrowUp className="h-4 w-4 ml-1 text-blue-600" /> :
                                                                <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                    onClick={() => handleSort('inventory_value')}
                                                >
                                                    <div className="flex items-center">
                                                        Value
                                                        {sortConfig.key === 'inventory_value' && (
                                                            sortConfig.direction === 'asc' ?
                                                                <ArrowUp className="h-4 w-4 ml-1 text-blue-600" /> :
                                                                <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {currentItems.map((item) => {
                                                // Determine stock status
                                                let stockStatus = 'normal';

                                                if (item.current_stock === 0) {
                                                    stockStatus = 'out';
                                                } else if (item.current_stock < item.min_stock_level && item.min_stock_level > 0) {
                                                    stockStatus = 'low';
                                                } else if (item.current_stock > item.max_stock_level && item.max_stock_level > 0) {
                                                    stockStatus = 'over';
                                                }

                                                return (
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
                                                            <div className="text-sm text-gray-900">
                                                                {item.current_stock} {item.stock_unit}
                                                            </div>
                                                            {item.min_stock_level > 0 && (
                                                                <div className="text-xs text-gray-500">
                                                                    Min: {item.min_stock_level}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">
                                                                {item.available_stock} {item.stock_unit}
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
                                                            <div className="text-xs text-gray-500">
                                                                ({formatCurrency(item.avg_cost)} each)
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
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

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 sm:px-6 mt-4">
                                        <div className="flex-1 flex justify-between sm:hidden">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === 1
                                                        ? 'text-gray-400 bg-gray-50'
                                                        : 'text-gray-700 bg-white hover:bg-gray-50'
                                                    }`}
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === totalPages
                                                        ? 'text-gray-400 bg-gray-50'
                                                        : 'text-gray-700 bg-white hover:bg-gray-50'
                                                    }`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm text-gray-700">
                                                    Showing{' '}
                                                    <span className="font-medium">{indexOfFirstItem + 1}</span>{' '}
                                                    to{' '}
                                                    <span className="font-medium">
                                                        {Math.min(indexOfLastItem, filteredInventory.length)}
                                                    </span>{' '}
                                                    of{' '}
                                                    <span className="font-medium">{filteredInventory.length}</span>{' '}
                                                    results
                                                </p>
                                            </div>
                                            <div>
                                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                        disabled={currentPage === 1}
                                                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1
                                                                ? 'text-gray-400 cursor-not-allowed'
                                                                : 'text-gray-500 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <span className="sr-only">Previous</span>
                                                        <ChevronLeft className="h-5 w-5" />
                                                    </button>

                                                    {/* Page numbers */}
                                                    {Array.from({ length: totalPages }, (_, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => setCurrentPage(i + 1)}
                                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === i + 1
                                                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            {i + 1}
                                                        </button>
                                                    ))}

                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                        disabled={currentPage === totalPages}
                                                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages
                                                                ? 'text-gray-400 cursor-not-allowed'
                                                                : 'text-gray-500 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <span className="sr-only">Next</span>
                                                        <ChevronRight className="h-5 w-5" />
                                                    </button>
                                                </nav>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </>
            ) : (
                <div className="text-center py-12">
                    <div className="mx-auto h-12 w-12 text-gray-400">
                        <Building2 className="h-12 w-12" />
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No location found</h3>
                    <p className="mt-1 text-sm text-gray-500">This location does not exist or you don't have permission to view it.</p>
                    <div className="mt-6">
                        <Link
                            to="/admin/inventory/locations"
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Locations
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationDetails;