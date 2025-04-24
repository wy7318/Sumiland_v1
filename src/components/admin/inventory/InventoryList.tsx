import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Search,
    Package,
    Building2,
    AlertCircle,
    Filter,
    ArrowUpDown,
    X,
    Download,
    CheckCircle,
    PlusCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn, formatCurrency } from '../../../lib/utils';
import { useOrganization } from '../../../contexts/OrganizationContext';

interface InventoryItem {
    id: string;
    product_id: string;
    product_name: string;
    sku: string;
    location_id: string;
    location_name: string;
    current_stock: number;
    committed_stock: number;
    available_stock: number;
    avg_cost: number;
    inventory_value: number;
    min_stock_level: number;
    max_stock_level: number;
    stock_unit: string;
    shelf_location: string;
}

interface Location {
    id: string;
    name: string;
}

export const InventoryList = () => {
    const { selectedOrganization } = useOrganization();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState<string>('');
    const [stockFilter, setStockFilter] = useState<string>('all');
    const [locations, setLocations] = useState<Location[]>([]);
    const [sortConfig, setSortConfig] = useState<{
        key: keyof InventoryItem;
        direction: 'asc' | 'desc';
    }>({
        key: 'product_name',
        direction: 'asc'
    });

    // Fetch inventory data
    useEffect(() => {
        if (!selectedOrganization?.id) return;

        const fetchInventory = async () => {
            setIsLoading(true);
            try {
                // Fetch all inventory items from our view
                const { data, error } = await supabase
                    .from('available_inventory')
                    .select(`
            id,
            product_id,
            product_name,
            sku,
            location_id,
            location_name,
            current_stock,
            committed_stock,
            available_stock,
            avg_cost,
            inventory_value
          `)
                    .eq('organization_id', selectedOrganization.id);

                if (error) throw error;

                if (data) {
                    // Fetch additional product information
                    const productIds = [...new Set(data.map(item => item.product_id))];
                    const { data: productsData, error: productsError } = await supabase
                        .from('products')
                        .select('id, min_stock_level, max_stock_level, stock_unit')
                        .in('id', productIds)
                        .eq('organization_id', selectedOrganization.id);

                    if (productsError) throw productsError;

                    // Fetch shelf locations
                    const { data: inventoriesData, error: inventoriesError } = await supabase
                        .from('inventories')
                        .select('id, shelf_location')
                        .in('id', data.map(item => item.id))
                        .eq('organization_id', selectedOrganization.id);

                    if (inventoriesError) throw inventoriesError;

                    // Merge all data
                    const mergedData = data.map(item => {
                        const productData = productsData?.find(p => p.id === item.product_id);
                        const inventoryData = inventoriesData?.find(i => i.id === item.id);

                        return {
                            ...item,
                            min_stock_level: productData?.min_stock_level || 0,
                            max_stock_level: productData?.max_stock_level || 0,
                            stock_unit: productData?.stock_unit || '',
                            shelf_location: inventoryData?.shelf_location || ''
                        };
                    });

                    setInventory(mergedData);
                    setFilteredInventory(mergedData);
                }

                // Fetch locations for filter
                const { data: locationsData } = await supabase
                    .from('locations')
                    .select('id, name')
                    .eq('organization_id', selectedOrganization.id)
                    .eq('is_active', true);

                if (locationsData) {
                    setLocations(locationsData);
                }
            } catch (error) {
                console.error('Error fetching inventory:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInventory();
    }, [selectedOrganization?.id]);

    // Apply filters
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

        // Apply location filter
        if (locationFilter) {
            result = result.filter(item => item.location_id === locationFilter);
        }

        // Apply stock level filter
        if (stockFilter === 'low') {
            result = result.filter(item => item.current_stock < item.min_stock_level);
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
    }, [inventory, searchTerm, locationFilter, stockFilter, sortConfig]);

    // Handle sorting
    const handleSort = (key: keyof InventoryItem) => {
        setSortConfig(prevConfig => ({
            key,
            direction:
                prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Export inventory to CSV
    const exportToCSV = () => {
        // Create CSV content
        const csvHeader = [
            'Product',
            'SKU',
            'Location',
            'Current Stock',
            'Committed Stock',
            'Available Stock',
            'Unit Cost',
            'Total Value',
            'Shelf Location'
        ].join(',');

        const csvRows = filteredInventory.map(item => [
            `"${item.product_name.replace(/"/g, '""')}"`,
            `"${item.sku}"`,
            `"${item.location_name}"`,
            item.current_stock,
            item.committed_stock,
            item.available_stock,
            item.avg_cost,
            item.inventory_value,
            `"${item.shelf_location || ''}"`
        ].join(','));

        const csvContent = [csvHeader, ...csvRows].join('\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `inventory-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Reset all filters
    const resetFilters = () => {
        setSearchTerm('');
        setLocationFilter('');
        setStockFilter('all');
        setSortConfig({
            key: 'product_name',
            direction: 'asc'
        });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Inventory</h1>
                <div className="space-x-2">
                    <Link
                        to="/admin/inventory/receive"
                        className="inline-flex items-center px-4 py-2 bg-green-600 rounded-md text-white hover:bg-green-700"
                    >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Receive Inventory
                    </Link>
                    <button
                        onClick={exportToCSV}
                        className="inline-flex items-center px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </button>
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
                            placeholder="Search products, SKUs, shelf locations..."
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
                            value={stockFilter}
                            onChange={(e) => setStockFilter(e.target.value)}
                        >
                            <option value="all">All Stock Levels</option>
                            <option value="low">Low Stock</option>
                            <option value="out">Out of Stock</option>
                            <option value="overstocked">Overstocked</option>
                        </select>
                    </div>

                    <button
                        onClick={resetFilters}
                        className="inline-flex items-center px-4 py-2 bg-gray-200 rounded-md text-gray-700 hover:bg-gray-300"
                    >
                        <X className="h-4 w-4 mr-2" />
                        Reset
                    </button>
                </div>
            </div>

            {/* Results */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    {filteredInventory.length === 0 ? (
                        <div className="text-center py-16">
                            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No inventory items found</h3>
                            <p className="text-gray-500">
                                {inventory.length > 0
                                    ? 'Try adjusting your search or filters'
                                    : 'Start by receiving inventory into your locations'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
                                <span className="text-sm text-gray-600">
                                    Showing {filteredInventory.length}
                                    {filteredInventory.length !== inventory.length && ` of ${inventory.length}`} items
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
                                                    On Hand
                                                    {sortConfig.key === 'current_stock' && (
                                                        <ArrowUpDown className={cn("h-4 w-4 ml-1", {
                                                            "text-blue-600": sortConfig.key === 'current_stock'
                                                        })} />
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
                                                        <ArrowUpDown className={cn("h-4 w-4 ml-1", {
                                                            "text-blue-600": sortConfig.key === 'available_stock'
                                                        })} />
                                                    )}
                                                </div>
                                            </th>
                                            <th
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSort('avg_cost')}
                                            >
                                                <div className="flex items-center">
                                                    Unit Cost
                                                    {sortConfig.key === 'avg_cost' && (
                                                        <ArrowUpDown className={cn("h-4 w-4 ml-1", {
                                                            "text-blue-600": sortConfig.key === 'avg_cost'
                                                        })} />
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
                                                        <ArrowUpDown className={cn("h-4 w-4 ml-1", {
                                                            "text-blue-600": sortConfig.key === 'inventory_value'
                                                        })} />
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
                                        {filteredInventory.map((item) => {
                                            // Determine stock status
                                            let stockStatus = 'normal';
                                            let statusIcon = null;

                                            if (item.current_stock === 0) {
                                                stockStatus = 'out';
                                                statusIcon = <AlertCircle className="h-4 w-4 text-red-600" />;
                                            } else if (item.current_stock < item.min_stock_level) {
                                                stockStatus = 'low';
                                                statusIcon = <AlertCircle className="h-4 w-4 text-orange-600" />;
                                            } else if (item.max_stock_level > 0 && item.current_stock > item.max_stock_level) {
                                                stockStatus = 'over';
                                                statusIcon = <AlertCircle className="h-4 w-4 text-blue-600" />;
                                            } else {
                                                statusIcon = <CheckCircle className="h-4 w-4 text-green-600" />;
                                            }

                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {item.product_name}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    SKU: {item.sku}
                                                                </div>
                                                                {item.shelf_location && (
                                                                    <div className="text-xs text-gray-500">
                                                                        Shelf: {item.shelf_location}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <Building2 className="h-4 w-4 text-gray-500 mr-1" />
                                                            <span className="text-sm text-gray-900">{item.location_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            {item.current_stock} {item.stock_unit}
                                                        </div>
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
                                                            {formatCurrency(item.avg_cost)}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            {formatCurrency(item.inventory_value)}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            {statusIcon}
                                                            <span className={cn("ml-1 text-sm capitalize", {
                                                                "text-green-600": stockStatus === 'normal',
                                                                "text-orange-600": stockStatus === 'low',
                                                                "text-red-600": stockStatus === 'out',
                                                                "text-blue-600": stockStatus === 'over'
                                                            })}>
                                                                {stockStatus === 'normal' ? 'In Stock' :
                                                                    stockStatus === 'low' ? 'Low Stock' :
                                                                        stockStatus === 'out' ? 'Out of Stock' : 'Overstocked'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                                        <Link
                                                            to={`/admin/inventory/products/${item.product_id}`}
                                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                                        >
                                                            View
                                                        </Link>
                                                        <Link
                                                            to={`/admin/inventory/adjust/${item.id}`}
                                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
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
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default InventoryList;