import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Save,
    X,
    Plus,
    Trash2,
    Search,
    Package,
    ArrowLeft,
    Building2,
    ArrowRight,
    AlertCircle,
    CheckCircle,
    Tag
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { TransferInventoryItem } from './inventoryTypes';

interface Location {
    id: string;
    name: string;
}

interface Product {
    id: string;
    product_id: string;
    product_name: string;
    sku: string;
    location_id: string;
    location_name: string;
    current_stock: number;
    available_stock: number;
    stock_unit: string;
}

export const TransferInventory = () => {
    const navigate = useNavigate();
    const { inventoryId } = useParams<{ inventoryId?: string }>();
    const { selectedOrganization } = useOrganization();

    const [sourceLocation, setSourceLocation] = useState<string>('');
    const [sourceLocationName, setSourceLocationName] = useState<string>('');
    const [destinationLocation, setDestinationLocation] = useState<string>('');
    const [locations, setLocations] = useState<Location[]>([]);

    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [items, setItems] = useState<TransferInventoryItem[]>([]);
    const [referenceId, setReferenceId] = useState('');
    const [notes, setNotes] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Calculate totals
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) =>
        sum + (typeof item.quantity === 'number' ? item.quantity : 0), 0);

    // Load locations and inventory data
    useEffect(() => {
        if (!selectedOrganization?.id) return;

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Fetch active locations
                const { data: locationData } = await supabase
                    .from('locations')
                    .select('id, name')
                    .eq('organization_id', selectedOrganization.id)
                    .eq('is_active', true)
                    .order('name');

                if (locationData && locationData.length > 0) {
                    setLocations(locationData);

                    // If we have an inventory ID, we're transferring a specific item
                    if (inventoryId) {
                        const { data: inventoryData } = await supabase
                            .from('available_inventory')
                            .select(`
                id, 
                product_id, 
                product_name,
                sku,
                location_id, 
                location_name,
                current_stock,
                available_stock,
                stock_unit
              `)
                            .eq('id', inventoryId)
                            .eq('organization_id', selectedOrganization.id)
                            .single();

                        if (inventoryData) {
                            setSourceLocation(inventoryData.location_id);
                            setSourceLocationName(inventoryData.location_name);

                            // Add this product to the transfer list
                            const newItem: TransferInventoryItem = {
                                id: crypto.randomUUID(),
                                product_id: inventoryData.product_id,
                                product_name: inventoryData.product_name,
                                sku: inventoryData.sku,
                                quantity: 1,
                                available_quantity: inventoryData.available_stock,
                                stock_unit: inventoryData.stock_unit || 'unit'
                            };

                            setItems([newItem]);
                        }
                    } else if (locationData.length > 0) {
                        // If no inventory ID provided, just set the first location as source
                        setSourceLocation(locationData[0].id);
                        setSourceLocationName(locationData[0].name);
                    }
                }

                // Generate a reference ID
                const today = new Date();
                const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
                setReferenceId(`TR-${dateStr}-001`);

            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Failed to load initial data. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [selectedOrganization?.id, inventoryId]);

    // Load products when source location changes
    useEffect(() => {
        if (!selectedOrganization?.id || !sourceLocation) return;

        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                // Get products in source location with stock
                const { data } = await supabase
                    .from('available_inventory')
                    .select(`
            id, 
            product_id, 
            product_name,
            sku,
            location_id, 
            location_name,
            current_stock,
            available_stock,
            stock_unit
          `)
                    .eq('location_id', sourceLocation)
                    .eq('organization_id', selectedOrganization.id)
                    .gt('current_stock', 0)
                    .order('product_name');

                if (data) {
                    setProducts(data);
                    setFilteredProducts(data);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setIsLoading(false);
            }
        };

        // Only fetch products if we're not in "specific item" mode or if source location changed
        if (!inventoryId || items.length === 0) {
            fetchProducts();
        }
    }, [selectedOrganization?.id, sourceLocation, inventoryId, items.length]);

    // Filter products based on search term
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredProducts(products);
            return;
        }

        const lowerSearch = searchTerm.toLowerCase();
        const filtered = products.filter(
            product =>
                product.product_name.toLowerCase().includes(lowerSearch) ||
                product.sku.toLowerCase().includes(lowerSearch)
        );

        setFilteredProducts(filtered);
    }, [searchTerm, products]);

    // Handle source location change
    const handleSourceLocationChange = (locationId: string) => {
        // Clear items when changing location
        if (sourceLocation !== locationId) {
            setItems([]);
            setSourceLocation(locationId);
            const location = locations.find(loc => loc.id === locationId);
            setSourceLocationName(location?.name || '');
        }
    };

    // Add product to the transfer list
    const addProduct = (product: Product) => {
        // Check if product already exists in the list
        const existingIndex = items.findIndex(item => item.product_id === product.product_id);

        if (existingIndex >= 0) {
            // Increment quantity if already in the list
            const newItems = [...items];
            const currentQty = typeof newItems[existingIndex].quantity === 'number'
                ? newItems[existingIndex].quantity as number
                : 0;

            newItems[existingIndex].quantity = Math.min(
                currentQty + 1,
                product.available_stock
            );

            setItems(newItems);
        } else {
            // Add new item
            const newItem: TransferInventoryItem = {
                id: crypto.randomUUID(),
                product_id: product.product_id,
                product_name: product.product_name,
                sku: product.sku,
                quantity: 1,
                available_quantity: product.available_stock,
                stock_unit: product.stock_unit || 'unit'
            };

            setItems(prevItems => [...prevItems, newItem]);
        }

        setShowProductSearch(false);
        setSearchTerm('');
    };

    // Update item quantity
    const updateQuantity = (index: number, value: number | '') => {
        setItems(prevItems => {
            const newItems = [...prevItems];

            // Don't allow quantity greater than available
            if (typeof value === 'number') {
                value = Math.min(value, newItems[index].available_quantity);
            }

            newItems[index].quantity = value;
            return newItems;
        });
    };

    // Remove item from the list
    const removeItem = (id: string) => {
        setItems(prevItems => prevItems.filter(item => item.id !== id));
    };

    // Submit the transfer
    const handleSubmit = async () => {
        if (!sourceLocation) {
            setError('Please select a source location');
            return;
        }

        if (!destinationLocation) {
            setError('Please select a destination location');
            return;
        }

        if (sourceLocation === destinationLocation) {
            setError('Source and destination locations must be different');
            return;
        }

        if (items.length === 0) {
            setError('Please add at least one product');
            return;
        }

        // Validate quantities
        for (const item of items) {
            if (typeof item.quantity !== 'number' || item.quantity <= 0) {
                setError(`Please enter a valid quantity for ${item.product_name}`);
                return;
            }

            if (item.quantity > item.available_quantity) {
                setError(`Cannot transfer more than available stock for ${item.product_name}`);
                return;
            }
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Process each item
            for (const item of items) {
                const { error } = await supabase.rpc('transfer_inventory', {
                    p_product_id: item.product_id,
                    p_source_location_id: sourceLocation,
                    p_destination_location_id: destinationLocation,
                    p_quantity: item.quantity as number,
                    p_reference_id: referenceId,
                    p_notes: notes
                });

                if (error) throw error;
            }

            // Success! Navigate back
            alert('Inventory transferred successfully');
            navigate('/admin/inventory');
        } catch (error) {
            console.error('Error processing transfer:', error);
            setError('An error occurred while processing your transfer. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center mb-6">
                <button
                    onClick={() => navigate('/admin/inventory')}
                    className="mr-4 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-2xl font-bold">Transfer Inventory</h1>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column - Form inputs */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4">Transfer Details</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Source Location
                                </label>
                                <select
                                    className="w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                    value={sourceLocation}
                                    onChange={(e) => handleSourceLocationChange(e.target.value)}
                                    disabled={isLoading || isSubmitting || !!inventoryId}
                                >
                                    {locations.length === 0 && (
                                        <option value="">No locations available</option>
                                    )}
                                    {locations.map(location => (
                                        <option key={location.id} value={location.id}>
                                            {location.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Destination Location
                                </label>
                                <select
                                    className="w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                    value={destinationLocation}
                                    onChange={(e) => setDestinationLocation(e.target.value)}
                                    disabled={isLoading || isSubmitting}
                                >
                                    <option value="">Select destination location</option>
                                    {locations
                                        .filter(location => location.id !== sourceLocation)
                                        .map(location => (
                                            <option key={location.id} value={location.id}>
                                                {location.name}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reference ID
                                </label>
                                <input
                                    type="text"
                                    className="w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                    value={referenceId}
                                    onChange={(e) => setReferenceId(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <input
                                    type="text"
                                    className="w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    disabled={isSubmitting}
                                    placeholder="Optional notes"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Products to Transfer</h2>
                            {!inventoryId && (
                                <button
                                    type="button"
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    onClick={() => setShowProductSearch(true)}
                                    disabled={isSubmitting || !sourceLocation}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Product
                                </button>
                            )}
                        </div>

                        {items.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                                <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                                <p className="text-gray-500 mb-2">No products added yet</p>
                                <button
                                    type="button"
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    onClick={() => setShowProductSearch(true)}
                                    disabled={isSubmitting || !sourceLocation}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Product
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Product
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Available
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Quantity to Transfer
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {items.map((item, index) => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {item.product_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        SKU: {item.sku}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {item.available_quantity} {item.stock_unit}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        in {sourceLocationName}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="number"
                                                            className="border rounded w-24 py-1 px-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                                            min="0.01"
                                                            step="0.01"
                                                            max={item.available_quantity}
                                                            value={item.quantity === '' ? '' : item.quantity}
                                                            onChange={(e) => updateQuantity(
                                                                index,
                                                                e.target.value === '' ? '' : parseFloat(e.target.value)
                                                            )}
                                                            disabled={isSubmitting}
                                                        />
                                                        <span className="ml-2 text-gray-500 text-sm">
                                                            {item.stock_unit}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                                    {!inventoryId && (
                                                        <button
                                                            type="button"
                                                            className="text-red-600 hover:text-red-900"
                                                            onClick={() => removeItem(item.id)}
                                                            disabled={isSubmitting}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column - Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                        <h2 className="text-lg font-semibold mb-4">Transfer Summary</h2>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Products:</span>
                                <span className="font-medium">{totalItems}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Quantity:</span>
                                <span className="font-medium">{totalQuantity.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-3 mt-3">
                                <div className="flex items-center">
                                    <Building2 className="h-4 w-4 text-gray-500 mr-2" />
                                    <span className="text-gray-600">From:</span>
                                    <span className="font-medium ml-2">
                                        {sourceLocationName || 'None selected'}
                                    </span>
                                </div>
                                <div className="flex items-center mt-2">
                                    <ArrowRight className="h-4 w-4 text-blue-500 mr-2" />
                                    <span className="text-gray-600">To:</span>
                                    <span className="font-medium ml-2">
                                        {locations.find(loc => loc.id === destinationLocation)?.name || 'None selected'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                type="button"
                                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !sourceLocation || !destinationLocation || items.length === 0}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Transfer Inventory
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                onClick={() => navigate('/admin/inventory')}
                                disabled={isSubmitting}
                            >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product search modal */}
            {showProductSearch && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-screen overflow-hidden">
                        <div className="p-4 border-b">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">
                                    Select Products from {sourceLocationName}
                                </h3>
                                <button
                                    type="button"
                                    className="text-gray-400 hover:text-gray-500"
                                    onClick={() => {
                                        setShowProductSearch(false);
                                        setSearchTerm('');
                                    }}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="relative mb-4">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search products by name or SKU..."
                                    className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="max-h-96 overflow-y-auto">
                                {isLoading ? (
                                    <div className="flex justify-center items-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                    </div>
                                ) : filteredProducts.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        {products.length === 0
                                            ? 'No products available in this location'
                                            : `No products found matching "${searchTerm}"`}
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-200">
                                        {filteredProducts.map(product => (
                                            <div
                                                key={product.id}
                                                className="py-3 px-2 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                                                onClick={() => addProduct(product)}
                                            >
                                                <div className="flex items-start">
                                                    <Package className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {product.product_name}
                                                        </div>
                                                        <div className="text-sm text-gray-500 flex items-center">
                                                            <Tag className="h-3 w-3 mr-1" />
                                                            {product.sku}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-900">
                                                        {product.available_stock} {product.stock_unit} available
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        ({product.current_stock} total, {product.current_stock - product.available_stock} reserved)
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50">
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                    onClick={() => {
                                        setShowProductSearch(false);
                                        setSearchTerm('');
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransferInventory;