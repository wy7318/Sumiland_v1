// GoodsReceiptForm.tsx - Component for receiving goods from a purchase order
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Package,
    Calendar,
    Truck,
    ClipboardList,
    Save,
    X,
    Map
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../contexts/OrganizationContext';

export const GoodsReceiptForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [purchaseOrder, setPurchaseOrder] = useState(null);
    const [goodsReceipt, setGoodsReceipt] = useState({
        receipt_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: []
    });

    const [locations, setLocations] = useState([]);
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        fetchPurchaseOrderDetails();
        fetchLocations();
    }, [id, selectedOrganization]);

    const fetchPurchaseOrderDetails = async () => {
        if (!id || !selectedOrganization?.id) return;

        setLoading(true);
        try {
            // Fetch PO with details
            const { data: poData, error: poError } = await supabase
                .from('purchase_orders')
                .select(`
          *,
          vendors(*),
          purchase_order_items(*, products(*))
        `)
                .eq('id', id)
                .eq('organization_id', selectedOrganization.id)
                .single();

            if (poError) throw poError;

            // Only allow receiving for approved or partially received POs
            if (poData.status !== 'approved' && poData.status !== 'partially_received') {
                throw new Error('This purchase order cannot receive goods in its current status.');
            }

            setPurchaseOrder(poData);

            // Calculate remaining quantities
            const { data: receiptsData, error: receiptsError } = await supabase
                .from('goods_receipts')
                .select(`
          goods_receipt_items(purchase_order_item_id, quantity)
        `)
                .eq('purchase_order_id', id)
                .eq('organization_id', selectedOrganization.id);

            if (receiptsError) throw receiptsError;

            // Initialize goodsReceipt items with remaining quantities
            const receiptItems = poData.purchase_order_items.map(item => {
                // Calculate total received so far
                const totalReceived = receiptsData.reduce((sum, receipt) => {
                    return sum + receipt.goods_receipt_items.reduce((itemSum, ri) => {
                        return itemSum + (ri.purchase_order_item_id === item.id ? parseFloat(ri.quantity) : 0);
                    }, 0);
                }, 0);

                const remainingQuantity = parseFloat(item.quantity) - totalReceived;

                return {
                    purchase_order_item_id: item.id,
                    product_id: item.product_id,
                    product_name: item.products.name,
                    product_sku: item.products.sku,
                    stock_unit: item.products.stock_unit,
                    unit_price: item.unit_price, // Add this to use for inventory transaction
                    total_quantity: parseFloat(item.quantity),
                    received_quantity: totalReceived,
                    remaining_quantity: remainingQuantity,
                    quantity: remainingQuantity > 0 ? remainingQuantity : 0,
                    location_id: '', // Using location_id instead of inventory_id
                    notes: ''
                };
            });

            setGoodsReceipt(prev => ({
                ...prev,
                items: receiptItems.filter(item => item.remaining_quantity > 0)
            }));
        } catch (error) {
            console.error('Error fetching purchase order details:', error);
            alert(error.message || 'Failed to load purchase order details.');
            navigate(`/admin/purchase-orders/${id}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchLocations = async () => {
        if (!selectedOrganization?.id) return;

        try {
            // Fetch active locations from locations table
            const { data, error } = await supabase
                .from('locations')
                .select('id, name, type')
                .eq('organization_id', selectedOrganization.id)
                .eq('is_active', true);

            if (error) throw error;
            setLocations(data || []);
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setGoodsReceipt(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...goodsReceipt.items];
        updatedItems[index] = {
            ...updatedItems[index],
            [field]: value
        };

        setGoodsReceipt(prev => ({
            ...prev,
            items: updatedItems
        }));
    };

    const validateForm = () => {
        const errors = {};

        if (!goodsReceipt.receipt_date) errors.receipt_date = 'Receipt date is required';

        // Validate at least one item is being received
        const isAnyItemReceived = goodsReceipt.items.some(item => parseFloat(item.quantity) > 0);
        if (!isAnyItemReceived) {
            errors.items = 'At least one item must have a quantity greater than zero';
        }

        // Validate individual items
        const itemErrors = [];
        let hasItemErrors = false;

        goodsReceipt.items.forEach((item, index) => {
            const error = {};

            if (parseFloat(item.quantity) < 0) {
                error.quantity = 'Quantity cannot be negative';
                hasItemErrors = true;
            }

            if (parseFloat(item.quantity) > parseFloat(item.remaining_quantity)) {
                error.quantity = `Cannot exceed remaining quantity (${item.remaining_quantity})`;
                hasItemErrors = true;
            }

            if (parseFloat(item.quantity) > 0 && !item.location_id) {
                error.location_id = 'Storage location is required';
                hasItemErrors = true;
            }

            itemErrors[index] = error;
        });

        if (hasItemErrors) {
            errors.itemErrors = itemErrors;
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };


    const saveGoodsReceipt = async () => {
        if (!validateForm()) return;

        setSaving(true);

        try {
            // Generate a receipt number
            const timestamp = Date.now().toString(36);
            const receiptNumber = `GR-${timestamp.toUpperCase()}`;

            // Filter out items with zero quantity
            const itemsToReceive = goodsReceipt.items.filter(item => parseFloat(item.quantity) > 0);

            if (itemsToReceive.length === 0) {
                throw new Error('No items to receive');
            }

            // Create the goods receipt
            const { data: receiptData, error: receiptError } = await supabase
                .from('goods_receipts')
                .insert({
                    purchase_order_id: id,
                    receipt_number: receiptNumber,
                    receipt_date: goodsReceipt.receipt_date,
                    notes: goodsReceipt.notes,
                    received_by: user.id,
                    organization_id: selectedOrganization.id,
                    created_by: user.id,
                    updated_by: user.id
                })
                .select('id')
                .single();

            if (receiptError) throw receiptError;

            // Process each item
            for (const item of itemsToReceive) {
                // 1. Insert goods receipt item
                const { error: itemError } = await supabase
                    .from('goods_receipt_items')
                    .insert({
                        goods_receipt_id: receiptData.id,
                        purchase_order_item_id: item.purchase_order_item_id,
                        quantity: item.quantity,
                        location_id: item.location_id, // Use location_id instead of inventory_id
                        notes: item.notes,
                        organization_id: selectedOrganization.id,
                        created_by: user.id,
                        updated_by: user.id
                    });

                if (itemError) throw itemError;

                // 2. Check if an inventory record exists for this product at this location
                const { data: existingInventory, error: inventoryCheckError } = await supabase
                    .from('inventories')
                    .select('id, current_stock')
                    .eq('product_id', item.product_id)
                    .eq('location_id', item.location_id)
                    .eq('organization_id', selectedOrganization.id)
                    .maybeSingle(); // Use maybeSingle to handle both found and not found cases

                if (inventoryCheckError) throw inventoryCheckError;

                // 3. Update or create the inventory record
                const quantityReceived = parseFloat(item.quantity);

                if (existingInventory) {
                    // Update existing inventory record
                    const { error: updateInventoryError } = await supabase
                        .from('inventories')
                        .update({
                            current_stock: parseFloat(existingInventory.current_stock) + quantityReceived,
                            last_count_date: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            updated_by: user.id
                        })
                        .eq('id', existingInventory.id);

                    if (updateInventoryError) throw updateInventoryError;
                } else {
                    // Create new inventory record
                    const { error: createInventoryError } = await supabase
                        .from('inventories')
                        .insert({
                            product_id: item.product_id,
                            location_id: item.location_id,
                            current_stock: quantityReceived,
                            committed_stock: 0,
                            shelf_location: '', // Default empty shelf location
                            last_count_date: new Date().toISOString(),
                            status: 'active',
                            organization_id: selectedOrganization.id,
                            created_by: user.id,
                            updated_by: user.id
                        });

                    if (createInventoryError) throw createInventoryError;
                }

                // 4. Create an inventory transaction record
                const { error: transactionError } = await supabase
                    .from('inventory_transactions')
                    .insert({
                        product_id: item.product_id,
                        location_id: item.location_id,
                        transaction_type: 'receipt',
                        quantity: quantityReceived,
                        unit_cost: item.unit_price || 0,
                        total_cost: (item.unit_price || 0) * quantityReceived,
                        reference_id: receiptData.id,
                        reference_type: 'goods_receipt',
                        notes: `Goods receipt from PO: ${purchaseOrder.order_number}`,
                        organization_id: selectedOrganization.id,
                        created_by: user.id
                    });

                if (transactionError) throw transactionError;
            }

            // 5. Update purchase order status if needed
            await updatePurchaseOrderStatus(id);

            // Navigate back to the PO
            navigate(`/admin/purchase-orders/${id}`);
        } catch (error) {
            console.error('Error saving goods receipt:', error);
            alert(`Failed to save goods receipt: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const updatePurchaseOrderStatus = async (poId) => {
        try {
            // Get the purchase order items
            const { data: poItems, error: poItemsError } = await supabase
                .from('purchase_order_items')
                .select('id, quantity')
                .eq('purchase_order_id', poId);

            if (poItemsError) throw poItemsError;

            // Get all goods receipt items for this PO
            const { data: receipts, error: receiptsError } = await supabase
                .from('goods_receipts')
                .select(`
                id,
                goods_receipt_items(purchase_order_item_id, quantity)
            `)
                .eq('purchase_order_id', poId);

            if (receiptsError) throw receiptsError;

            // Calculate total received quantities for each PO item
            const receivedQuantities = {};
            receipts.forEach(receipt => {
                receipt.goods_receipt_items.forEach(item => {
                    const poItemId = item.purchase_order_item_id;
                    receivedQuantities[poItemId] = (receivedQuantities[poItemId] || 0) + parseFloat(item.quantity);
                });
            });

            // Check if all items are fully received
            let allItemsReceived = true;
            let anyItemsReceived = false;

            poItems.forEach(item => {
                const received = receivedQuantities[item.id] || 0;
                if (received < parseFloat(item.quantity)) {
                    allItemsReceived = false;
                }
                if (received > 0) {
                    anyItemsReceived = true;
                }
            });

            // Update PO status
            let newStatus = 'approved'; // Default if no change needed

            if (allItemsReceived) {
                newStatus = 'fully_received';
            } else if (anyItemsReceived) {
                newStatus = 'partially_received';
            }

            // Update the purchase order
            const { error: updateError } = await supabase
                .from('purchase_orders')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                    updated_by: user.id
                })
                .eq('id', poId);

            if (updateError) throw updateError;
        } catch (error) {
            console.error('Error updating purchase order status:', error);
            // Don't throw here, we'll just log the error
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!purchaseOrder) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Purchase order not found or cannot receive goods in its current status.</p>
                <button
                    onClick={() => navigate(`/admin/purchase-orders/${id}`)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                    Back to Purchase Order
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center mb-6">
                <button
                    onClick={() => navigate(`/admin/purchase-orders/${id}`)}
                    className="mr-4 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                    Receive Goods - {purchaseOrder.order_number}
                </h1>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                {/* Vendor and Order Info */}
                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex-1 min-w-[250px]">
                        <span className="block text-sm text-gray-500 mb-1">Vendor</span>
                        <span className="block text-lg font-medium text-gray-900">{purchaseOrder.vendors?.name}</span>
                    </div>
                    <div className="flex-1 min-w-[250px]">
                        <span className="block text-sm text-gray-500 mb-1">PO Number</span>
                        <span className="block text-lg font-medium text-blue-600">{purchaseOrder.order_number}</span>
                    </div>
                    <div className="flex-1 min-w-[250px]">
                        <span className="block text-sm text-gray-500 mb-1">Order Date</span>
                        <span className="block text-base text-gray-900">{new Date(purchaseOrder.order_date).toLocaleDateString()}</span>
                    </div>
                </div>

                {/* Receipt Details Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Receipt Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                            <input
                                type="date"
                                name="receipt_date"
                                value={goodsReceipt.receipt_date}
                                onChange={handleChange}
                                className={cn(
                                    "pl-10 pr-4 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500",
                                    formErrors.receipt_date ? "border-red-500" : "border-gray-300"
                                )}
                            />
                        </div>
                        {formErrors.receipt_date && (
                            <p className="text-red-500 text-xs mt-1">{formErrors.receipt_date}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                        </label>
                        <textarea
                            name="notes"
                            value={goodsReceipt.notes || ''}
                            onChange={handleChange}
                            rows={1}
                            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Any notes about this receipt..."
                        ></textarea>
                    </div>
                </div>

                {/* Line Items */}
                <div className="mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Items to Receive</h3>

                    {formErrors.items && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                            {formErrors.items}
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previously Received</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty to Receive</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage Location</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {goodsReceipt.items.map((item, index) => (
                                    <tr key={index} className={item.remaining_quantity === 0 ? "bg-gray-50 opacity-60" : ""}>
                                        <td className="px-3 py-2">
                                            <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                                            <div className="text-xs text-gray-500">{item.product_sku}</div>
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-500">
                                            {item.total_quantity} {item.stock_unit}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-500">
                                            {item.received_quantity} {item.stock_unit}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-500">
                                            {item.remaining_quantity} {item.stock_unit}
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                min="0"
                                                max={item.remaining_quantity}
                                                step="0.01"
                                                disabled={item.remaining_quantity === 0}
                                                className={cn(
                                                    "w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                                                    formErrors.itemErrors?.[index]?.quantity ? "border-red-500" : "border-gray-300",
                                                    item.remaining_quantity === 0 ? "bg-gray-100" : ""
                                                )}
                                            />
                                            {formErrors.itemErrors?.[index]?.quantity && (
                                                <p className="text-red-500 text-xs mt-1">{formErrors.itemErrors[index].quantity}</p>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            <select
                                                value={item.location_id || ''}
                                                onChange={(e) => handleItemChange(index, 'location_id', e.target.value)}
                                                disabled={parseFloat(item.quantity) === 0}
                                                className={cn(
                                                    "w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                                                    formErrors.itemErrors?.[index]?.location_id ? "border-red-500" : "border-gray-300",
                                                    parseFloat(item.quantity) === 0 ? "bg-gray-100" : ""
                                                )}
                                            >
                                                <option value="">Select location</option>
                                                {locations.map(location => (
                                                    <option key={location.id} value={location.id}>
                                                        {location.name} ({location.type})
                                                    </option>
                                                ))}
                                            </select>
                                            {formErrors.itemErrors?.[index]?.location_id && (
                                                <p className="text-red-500 text-xs mt-1">{formErrors.itemErrors[index].location_id}</p>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                value={item.notes || ''}
                                                onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                                                disabled={parseFloat(item.quantity) === 0}
                                                placeholder="Item notes"
                                                className={cn(
                                                    "w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                                                    parseFloat(item.quantity) === 0 ? "bg-gray-100" : ""
                                                )}
                                            />
                                        </td>
                                    </tr>
                                ))}

                                {goodsReceipt.items.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                            All items have been fully received.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => navigate(`/admin/purchase-orders/${id}`)}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Cancel
                    </button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={saveGoodsReceipt}
                        disabled={saving || goodsReceipt.items.length === 0}
                        className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                Processing...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Receive Goods
                            </>
                        )}
                    </motion.button>
                </div>
            </div>
        </div>
    );
};