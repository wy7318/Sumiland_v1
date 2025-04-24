import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Save,
    X,
    Plus,
    Trash2,
    Search,
    Package,
    ArrowLeft,
    Building2,
    ShoppingCart,
    Tag,
    TrendingUp
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatCurrency } from '../../../lib/utils';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { useAuth } from '../../../contexts/AuthContext';

interface Product {
    id: string;
    name: string;
    sku: string;
    avg_cost: number;
    last_purchase_cost: number;
    stock_unit: string;
    weight_unit: string;
}

interface Location {
    id: string;
    name: string;
}

interface ReceiveItem {
    id: string;
    product_id: string;
    product_name: string;
    sku: string;
    quantity: number | '';
    unit_cost: number | '';
    total_cost: number;
    stock_unit: string;
}

export const ReceiveInventory = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [referenceId, setReferenceId] = useState('');
    const [referenceType, setReferenceType] = useState('purchase');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<ReceiveItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showProductSearch, setShowProductSearch] = useState(false);

    // Calculate totals
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) =>
        sum + (typeof item.quantity === 'number' ? item.quantity : 0), 0);
    const totalValue = items.reduce((sum, item) => sum + item.total_cost, 0);

    // Load locations and products
    useEffect(() => {
        if (!selectedOrganization?.id) return;

        const fetchData = async () => {
            setIsLoading(true);
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
                    setSelectedLocation(locationData[0].id);
                }

                // Fetch products
                const { data: productData } = await supabase
                    .from('products')
                    .select('id, name, sku, avg_cost, last_purchase_cost, stock_unit, weight_unit')
                    .eq('organization_id', selectedOrganization.id)
                    .eq('status', 'active')
                    .order('name');

                if (productData) {
                    setProducts(productData);
                    setFilteredProducts(productData);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [selectedOrganization?.id]);

    // Generate a sequential reference ID if empty
    useEffect(() => {
        if (!referenceId) {
            const today = new Date();
            const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
            setReferenceId(`PO-${dateStr}-001`);
        }
    }, [referenceId]);

    // Filter products based on search term
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredProducts(products);
            return;
        }

        const lowerSearch = searchTerm.toLowerCase();
        const filtered = products.filter(
            product =>
                product.name.toLowerCase().includes(lowerSearch) ||
                product.sku.toLowerCase().includes(lowerSearch)
        );

        setFilteredProducts(filtered);
    }, [searchTerm, products]);

    // Update total cost when quantity or unit cost changes
    const updateTotalCost = (index: number, field: 'quantity' | 'unit_cost', value: number | '') => {
        setItems(prevItems => {
            const newItems = [...prevItems];
            newItems[index][field] = value;

            const quantity = typeof newItems[index].quantity === 'number' ? newItems[index].quantity : 0;
            const unitCost = typeof newItems[index].unit_cost === 'number' ? newItems[index].unit_cost : 0;

            newItems[index].total_cost = quantity * unitCost;
            return newItems;
        });
    };

    // Add product to the receive list
    const addProduct = (product: Product) => {
        // Check if product already exists in the list
        const existingIndex = items.findIndex(item => item.product_id === product.id);

        if (existingIndex >= 0) {
            // Increment quantity if already in the list
            const newItems = [...items];
            const currentQty = typeof newItems[existingIndex].quantity === 'number'
                ? newItems[existingIndex].quantity as number
                : 0;

            newItems[existingIndex].quantity = currentQty + 1;
            newItems[existingIndex].total_cost =
                (currentQty + 1) * (newItems[existingIndex].unit_cost as number || 0);

            setItems(newItems);
        } else {
            // Add new item
            const newItem: ReceiveItem = {
                id: crypto.randomUUID(),
                product_id: product.id,
                product_name: product.name,
                sku: product.sku,
                quantity: 1,
                unit_cost: product.last_purchase_cost || product.avg_cost || 0,
                total_cost: (product.last_purchase_cost || product.avg_cost || 0),
                stock_unit: product.stock_unit || 'unit'
            };

            setItems(prevItems => [...prevItems, newItem]);
        }

        setShowProductSearch(false);
        setSearchTerm('');
    };

    // Remove item from the list
    const removeItem = (id: string) => {
        setItems(prevItems => prevItems.filter(item => item.id !== id));
    };

    // Submit the receive form
    const handleSubmit = async () => {
        if (!selectedLocation) {
            alert('Please select a location');
            return;
        }

        if (items.length === 0) {
            alert('Please add at least one product');
            return;
        }

        // Validate inputs
        for (const item of items) {
            if (typeof item.quantity !== 'number' || item.quantity <= 0) {
                alert(`Please enter a valid quantity for ${item.product_name}`);
                return;
            }

            if (typeof item.unit_cost !== 'number' || item.unit_cost < 0) {
                alert(`Please enter a valid unit cost for ${item.product_name}`);
                return;
            }
        }

        setIsSubmitting(true);

        try {
            // Process each item
            for (const item of items) {
                const { error } = await supabase.rpc('receive_inventory', {
                    p_product_id: item.product_id,
                    p_location_id: selectedLocation,
                    p_quantity: item.quantity as number,
                    p_unit_cost: item.unit_cost as number,
                    p_reference_id: referenceId,
                    p_reference_type: referenceType,
                    p_notes: notes,
                    p_metadata: null
                });

                if (error) throw error;
            }

            // Success! Navigate to inventory list
            alert('Inventory received successfully');
            navigate('/admin/inventory');
        } catch (error) {
            console.error('Error processing receive:', error);
            alert('An error occurred while processing your request');
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
                <h1 className="text-2xl font-bold">Receive Inventory</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column - Form inputs */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4">Transaction Details</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Location
                                </label>
                                <select
                                    className="w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                    value={selectedLocation}
                                    onChange={(e) => setSelectedLocation(e.target.value)}
                                    disabled={isLoading || isSubmitting}
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
                                    Reference ID (PO #)
                                </label>
                                <input
                                    type="text"
                                    className="w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                    value={referenceId}
                                    onChange={(e) => setReferenceId(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reference Type
                                </label>
                                <select
                                    className="w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                    value={referenceType}
                                    onChange={(e) => setReferenceType(e.target.value)}
                                    disabled={isSubmitting}
                                >
                                    <option value="purchase">Purchase Order</option>
                                    <option value="return">Customer Return</option>
                                    <option value="adjustment">Inventory Adjustment</option>
                                </select>
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
                            <h2 className="text-lg font-semibold">Products</h2>
                            <button
                                type="button"
                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                onClick={() => setShowProductSearch(true)}
                                disabled={isSubmitting}
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Product
                            </button>
                        </div>

                        {items.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                                <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                                <p className="text-gray-500 mb-2">No products added yet</p>
                                <button
                                    type="button"
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    onClick={() => setShowProductSearch(true)}
                                    disabled={isSubmitting}
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
                                                Quantity
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Unit Cost
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Total
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
                                                    <div className="flex items-center">
                                                        <input
                                                            type="number"
                                                            className="border rounded w-20 py-1 px-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                                            min="0.01"
                                                            step="0.01"
                                                            value={item.quantity === '' ? '' : item.quantity}
                                                            onChange={(e) => updateTotalCost(
                                                                index,
                                                                'quantity',
                                                                e.target.value === '' ? '' : parseFloat(e.target.value)
                                                            )}
                                                            disabled={isSubmitting}
                                                        />
                                                        <span className="ml-2 text-gray-500 text-sm">
                                                            {item.stock_unit}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <span className="text-gray-500 mr-1">$</span>
                                                        <input
                                                            type="number"
                                                            className="border rounded w-24 py-1 px-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.unit_cost === '' ? '' : item.unit_cost}
                                                            onChange={(e) => updateTotalCost(
                                                                index,
                                                                'unit_cost',
                                                                e.target.value === '' ? '' : parseFloat(e.target.value)
                                                            )}
                                                            disabled={isSubmitting}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {formatCurrency(item.total_cost)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                                    <button
                                                        type="button"
                                                        className="text-red-600 hover:text-red-900"
                                                        onClick={() => removeItem(item.id)}
                                                        disabled={isSubmitting}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
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
                        <h2 className="text-lg font-semibold mb-4">Summary</h2>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Products:</span>
                                <span className="font-medium">{totalItems}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Quantity:</span>
                                <span className="font-medium">{totalQuantity.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Value:</span>
                                <span className="font-medium">{formatCurrency(totalValue)}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-3 mt-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Location:</span>
                                    <span className="font-medium">
                                        {locations.find(loc => loc.id === selectedLocation)?.name || 'None selected'}
                                    </span>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-gray-600">Reference:</span>
                                    <span className="font-medium">{referenceId || 'None'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                type="button"
                                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Receive Inventory
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
                                <h3 className="text-lg font-semibold">Add Product</h3>
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
                                {filteredProducts.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        No products found matching "{searchTerm}"
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-200">
                                        {filteredProducts.map(product => (
                                            <div
                                                key={product.id}
                                                className="py-3 px-2 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                                                onClick={() => addProduct(product)}
                                            >
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {product.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500 flex items-center">
                                                        <Tag className="h-3 w-3 mr-1" />
                                                        {product.sku}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-900">
                                                        {formatCurrency(product.last_purchase_cost || product.avg_cost || 0)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {product.stock_unit || 'unit'}
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

export default ReceiveInventory;