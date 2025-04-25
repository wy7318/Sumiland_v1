import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Save,
    X,
    ArrowLeft,
    AlertCircle,
    BarChart3,
    Package,
    Building2,
    FileText,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn, formatCurrency } from '../../../lib/utils';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { AdjustInventoryItem } from './inventoryTypes';

interface Inventory {
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
    stock_unit: string;
}

export const AdjustInventory = () => {
    const navigate = useNavigate();
    const { inventoryId } = useParams<{ inventoryId: string }>();
    const { selectedOrganization } = useOrganization();

    const [inventory, setInventory] = useState<Inventory | null>(null);
    const [item, setItem] = useState<AdjustInventoryItem | null>(null);

    const [newQuantity, setNewQuantity] = useState<number | ''>('');
    const [adjustment, setAdjustment] = useState<number>(0);
    const [reason, setReason] = useState<string>('count');
    const [notes, setNotes] = useState<string>('');
    const [referenceId, setReferenceId] = useState<string>('');

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Generate reference ID
    useEffect(() => {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        setReferenceId(`ADJ-${dateStr}-001`);
    }, []);

    // Load inventory data
    useEffect(() => {
        if (!selectedOrganization?.id || !inventoryId) return;

        const fetchInventory = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Fetch inventory with details
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
            stock_unit
          `)
                    .eq('id', inventoryId)
                    .eq('organization_id', selectedOrganization.id)
                    .single();

                if (error) throw error;

                if (data) {
                    setInventory(data);
                    setNewQuantity(data.current_stock);

                    // Create adjustment item
                    setItem({
                        id: data.id,
                        product_id: data.product_id,
                        product_name: data.product_name,
                        sku: data.sku,
                        current_quantity: data.current_stock,
                        new_quantity: data.current_stock,
                        adjustment: 0,
                        reason: reason,
                        stock_unit: data.stock_unit || 'unit'
                    });
                } else {
                    setError('Inventory not found');
                }
            } catch (error) {
                console.error('Error fetching inventory:', error);
                setError('Failed to load inventory data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInventory();
    }, [selectedOrganization?.id, inventoryId]);

    // Calculate adjustment when new quantity changes
    useEffect(() => {
        if (item && typeof newQuantity === 'number') {
            const adjustmentValue = newQuantity - item.current_quantity;
            setAdjustment(adjustmentValue);

            // Update item state
            setItem(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    new_quantity: newQuantity,
                    adjustment: adjustmentValue
                };
            });
        }
    }, [newQuantity, item]);

    // Handle form submission
    const handleSubmit = async () => {
        if (!item || !inventory) {
            setError('Inventory data not available');
            return;
        }

        if (typeof newQuantity !== 'number') {
            setError('Please enter a valid quantity');
            return;
        }

        if (newQuantity < 0) {
            setError('Quantity cannot be negative');
            return;
        }

        if (adjustment === 0) {
            setError('No adjustment to make');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Use different procedures based on adjustment type (positive or negative)
            if (adjustment > 0) {
                // For positive adjustment (adding stock), use receive_inventory with special reference type
                const { error } = await supabase.rpc('receive_inventory', {
                    p_product_id: item.product_id,
                    p_location_id: inventory.location_id,
                    p_quantity: adjustment,
                    p_unit_cost: inventory.avg_cost,
                    p_reference_id: referenceId,
                    p_reference_type: reason,
                    p_notes: notes || `Adjusted from ${item.current_quantity} to ${newQuantity}`,
                    p_metadata: null
                });

                if (error) throw error;
            } else {
                // For negative adjustment (removing stock), use a custom adjustment procedure
                // We need to create a transaction with negative quantity
                const { error } = await supabase
                    .from('inventory_transactions')
                    .insert({
                        product_id: item.product_id,
                        location_id: inventory.location_id,
                        transaction_type: 'adjustment',
                        quantity: adjustment, // Already negative
                        unit_cost: inventory.avg_cost,
                        total_cost: adjustment * inventory.avg_cost,
                        reference_id: referenceId,
                        reference_type: reason,
                        notes: notes || `Adjusted from ${item.current_quantity} to ${newQuantity}`,
                        organization_id: selectedOrganization?.id
                    });

                if (error) throw error;

                // Update the inventory quantity
                const { error: updateError } = await supabase
                    .from('inventories')
                    .update({
                        current_stock: newQuantity,
                        updated_by: selectedOrganization?.id
                    })
                    .eq('id', inventory.id)
                    .eq('organization_id', selectedOrganization?.id);

                if (updateError) throw updateError;
            }

            // Success
            alert('Inventory adjusted successfully');
            navigate('/admin/inventory');
        } catch (error) {
            console.error('Error adjusting inventory:', error);
            setError('Failed to adjust inventory. Please try again.');
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
                <h1 className="text-2xl font-bold">Adjust Inventory</h1>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : inventory && item ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left column - Product info */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-center mb-4">
                                <Package className="h-6 w-6 text-blue-500 mr-3" />
                                <h2 className="text-lg font-semibold">Product Details</h2>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-medium">{inventory.product_name}</h3>
                                    <p className="text-sm text-gray-500">SKU: {inventory.sku}</p>
                                </div>

                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-500">Location:</span>
                                        <span className="font-medium flex items-center">
                                            <Building2 className="h-4 w-4 mr-1 text-gray-400" />
                                            {inventory.location_name}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-500">Current Stock:</span>
                                        <span className="font-medium">
                                            {inventory.current_stock} {inventory.stock_unit}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-500">Reserved:</span>
                                        <span className="font-medium">
                                            {inventory.committed_stock} {inventory.stock_unit}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-500">Available:</span>
                                        <span className="font-medium">
                                            {inventory.available_stock} {inventory.stock_unit}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
                                        <span className="text-gray-500">Unit Value:</span>
                                        <span className="font-medium">
                                            {formatCurrency(inventory.avg_cost)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Total Value:</span>
                                        <span className="font-medium">
                                            {formatCurrency(inventory.avg_cost * inventory.current_stock)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle column - Adjustment form */}
                    <div className="md:col-span-2">
                        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                            <div className="flex items-center mb-4">
                                <BarChart3 className="h-6 w-6 text-purple-500 mr-3" />
                                <h2 className="text-lg font-semibold">Adjustment Details</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Current Quantity
                                    </label>
                                    <div className="flex items-center">
                                        <input
                                            type="text"
                                            className="border rounded-md py-2 px-3 bg-gray-100 w-full"
                                            value={`${item.current_quantity} ${item.stock_unit}`}
                                            disabled
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        New Quantity
                                    </label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            className="border rounded-md py-2 px-3 w-full focus:ring-blue-500 focus:border-blue-500"
                                            min="0"
                                            step="0.01"
                                            value={newQuantity === '' ? '' : newQuantity}
                                            onChange={(e) => setNewQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            disabled={isSubmitting}
                                        />
                                        <span className="ml-2 text-gray-500">
                                            {item.stock_unit}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Adjustment
                                    </label>
                                    <div className={cn("flex items-center font-medium", {
                                        "text-green-600": adjustment > 0,
                                        "text-red-600": adjustment < 0,
                                        "text-gray-500": adjustment === 0
                                    })}>
                                        {adjustment > 0 ? (
                                            <TrendingUp className="h-5 w-5 mr-1" />
                                        ) : adjustment < 0 ? (
                                            <TrendingDown className="h-5 w-5 mr-1" />
                                        ) : null}
                                        {adjustment > 0 ? '+' : ''}{adjustment} {item.stock_unit}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reference ID
                                    </label>
                                    <input
                                        type="text"
                                        className="border rounded-md py-2 px-3 w-full focus:ring-blue-500 focus:border-blue-500"
                                        value={referenceId}
                                        onChange={(e) => setReferenceId(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reason for Adjustment
                                    </label>
                                    <select
                                        className="border rounded-md py-2 px-3 w-full focus:ring-blue-500 focus:border-blue-500"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        disabled={isSubmitting}
                                    >
                                        <option value="count">Inventory Count</option>
                                        <option value="damage">Damaged/Expired</option>
                                        <option value="return">Customer Return</option>
                                        <option value="loss">Lost/Theft</option>
                                        <option value="correction">Data Correction</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        className="border rounded-md py-2 px-3 w-full focus:ring-blue-500 focus:border-blue-500"
                                        rows={3}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Optional details about this adjustment"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                onClick={() => navigate('/admin/inventory')}
                                disabled={isSubmitting}
                            >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                onClick={handleSubmit}
                                disabled={isSubmitting || adjustment === 0}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Adjustment
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Inventory Not Found</h3>
                    <p className="text-gray-500 mb-4">
                        The inventory item you're looking for doesn't exist or you don't have permission to view it.
                    </p>
                    <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        onClick={() => navigate('/admin/inventory')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Inventory
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdjustInventory;