import { useState, useEffect } from 'react';
import { X, Package, Save, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../contexts/OrganizationContext';

type WorkOrderItem = {
    id?: string;
    work_order_id: string;
    type: string;
    product_id: string | null;
    name: string;
    description: string | null;
    quantity_required: number;
    quantity_consumed: number;
    unit_cost: number | null;
    total_cost: number | null;
    status: string;
};

type Product = {
    id: string;
    name: string;
    sku: string;
    price: number;
    avg_cost: number;
    description: string | null;
};

interface WorkOrderItemFormProps {
    workOrderId: string;
    item?: WorkOrderItem;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export function WorkOrderItemForm({
    workOrderId,
    item,
    isOpen,
    onClose,
    onSave
}: WorkOrderItemFormProps) {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const isEditMode = !!item?.id;

    // Form state
    const [formData, setFormData] = useState<WorkOrderItem>({
        work_order_id: workOrderId,
        type: 'material',
        product_id: null,
        name: '',
        description: null,
        quantity_required: 1,
        quantity_consumed: 0,
        unit_cost: null,
        total_cost: null,
        status: 'pending'
    });

    // Product search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load item data if in edit mode
    useEffect(() => {
        if (isEditMode && item) {
            setFormData(item);
            if (item.product_id) {
                fetchProduct(item.product_id);
            }
        }
    }, [item, isEditMode]);

    // Fetch product details
    const fetchProduct = async (productId: string) => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('id, name, sku, price, avg_cost, description')
                .eq('id', productId)
                .single();

            if (error) throw error;

            if (data) {
                setSelectedProduct(data);
            }
        } catch (err) {
            console.error('Error fetching product:', err);
        }
    };

    // Search for products
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        try {
            setIsSearching(true);

            const { data, error } = await supabase
                .from('products')
                .select('id, name, sku, price, avg_cost, description')
                .eq('organization_id', selectedOrganization?.id)
                .or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`)
                .limit(10);

            if (error) throw error;

            setSearchResults(data || []);
        } catch (err) {
            console.error('Error searching products:', err);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle product selection
    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setFormData(prev => ({
            ...prev,
            product_id: product.id,
            name: product.name,
            description: product.description,
            unit_cost: product.avg_cost || product.price || null,
            total_cost: (product.avg_cost || product.price || 0) * formData.quantity_required
        }));
        setSearchResults([]);
        setSearchQuery('');
    };

    // Handle form field changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === 'quantity_required') {
            const quantity = parseFloat(value);
            setFormData(prev => {
                const unitCost = prev.unit_cost || 0;
                return {
                    ...prev,
                    [name]: quantity,
                    total_cost: quantity * unitCost
                };
            });
        } else if (name === 'unit_cost') {
            const unitCost = parseFloat(value);
            setFormData(prev => ({
                ...prev,
                [name]: unitCost,
                total_cost: prev.quantity_required * unitCost
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error('Not authenticated');

            // Prepare data for saving
            const itemData = {
                ...formData,
                organization_id: selectedOrganization?.id,
                updated_at: new Date().toISOString(),
                updated_by: userData.user.id
            };

            let result;

            if (isEditMode) {
                // Update existing item
                result = await supabase
                    .from('work_order_items')
                    .update(itemData)
                    .eq('id', item!.id);
            } else {
                // Create new item
                result = await supabase
                    .from('work_order_items')
                    .insert([{
                        ...itemData,
                        created_at: new Date().toISOString(),
                        created_by: userData.user.id
                    }]);
            }

            if (result.error) throw result.error;

            onSave();
            onClose();
        } catch (err) {
            console.error('Error saving item:', err);
            setError(err instanceof Error ? err.message : 'Failed to save item');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <Package className="w-6 h-6 text-indigo-500 mr-2" />
                        {isEditMode ? 'Edit Item' : 'Add Item'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Item Type */}
                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                                Item Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="type"
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                            >
                                <option value="material">Material</option>
                                <option value="labor">Labor</option>
                                <option value="equipment">Equipment</option>
                                <option value="service">Service</option>
                            </select>
                        </div>

                        {/* Product Search (for material type) */}
                        {formData.type === 'material' && (
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-700">
                                    Search Product
                                </label>
                                <div className="flex space-x-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                            placeholder="Search by name or SKU"
                                        />
                                        {isSearching && (
                                            <div className="absolute right-3 top-3">
                                                <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSearch}
                                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    >
                                        <Search className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Search Results */}
                                {searchResults.length > 0 && (
                                    <div className="mt-2 border rounded-lg overflow-hidden">
                                        <div className="max-h-60 overflow-y-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Name
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            SKU
                                                        </th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Cost
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {searchResults.map(product => (
                                                        <tr
                                                            key={product.id}
                                                            onClick={() => handleSelectProduct(product)}
                                                            className="cursor-pointer hover:bg-gray-50"
                                                        >
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <div className="text-sm text-gray-500">{product.sku}</div>
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-right">
                                                                <div className="text-sm text-gray-900">
                                                                    ${(product.avg_cost || product.price || 0).toFixed(2)}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Selected Product */}
                                {selectedProduct && (
                                    <div className="mt-2 p-3 bg-indigo-50 rounded-lg">
                                        <div className="flex justify-between">
                                            <div>
                                                <div className="font-medium text-gray-900">{selectedProduct.name}</div>
                                                <div className="text-sm text-gray-500">SKU: {selectedProduct.sku}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedProduct(null);
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        product_id: null
                                                    }));
                                                }}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Item Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Item Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                placeholder="Enter item name"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description || ''}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                placeholder="Enter description"
                            />
                        </div>

                        {/* Quantity and Cost */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="quantity_required" className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity Required <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="quantity_required"
                                    name="quantity_required"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.quantity_required}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label htmlFor="unit_cost" className="block text-sm font-medium text-gray-700 mb-1">
                                    Unit Cost
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500">$</span>
                                    </div>
                                    <input
                                        id="unit_cost"
                                        name="unit_cost"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.unit_cost || ''}
                                        onChange={handleChange}
                                        className="w-full pl-7 px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Total Cost (calculated) */}
                        {(formData.unit_cost !== null && formData.quantity_required > 0) && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Total Cost
                                </label>
                                <div className="px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700">
                                    ${(formData.total_cost || 0).toFixed(2)}
                                </div>
                            </div>
                        )}

                        {/* Item Status */}
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                Status <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="mt-8 flex items-center justify-end space-x-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Item
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}