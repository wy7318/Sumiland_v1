import React, { useState, useEffect } from 'react';
import {
    Smartphone, Bell, Filter, Search, ChevronDown, MoreVertical,
    Package, Truck, DollarSign, TrendingUp, Users, Phone, Mail,
    Edit, Trash2, Loader2, AlertCircle, XCircle, X, Clock,
    MapPin, CreditCard, FileText, ChevronRight
} from 'lucide-react';
// Replace these with your actual imports
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../contexts/OrganizationContext';


// Types
interface Restaurant {
    restaurant_id: string;
    organization_id: string;
    name: string;
    slug: string;
    description?: string;
    phone?: string;
    email?: string;
    address_line1?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    timezone: string;
    currency_code: string;
    is_active: boolean;
    accepts_online_orders: boolean;
    estimated_delivery_time?: number;
}

interface Order {
    order_id: string;
    order_number: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    order_type: 'pickup' | 'delivery' | 'dine-in';
    status: string;
    subtotal: number;
    tax_amount: number;
    tip_amount: number;
    delivery_fee: number;
    total_amount: number;
    special_instructions?: string;
    created_at: string;
    updated_at: string;
    items?: OrderItem[];
}

interface OrderItem {
    order_item_id: string;
    item_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    special_instructions?: string;
    menu_item?: {
        name: string;
        display_name?: string;
    };
}

const ORDER_STATUSES = [
    { key: 'pending', label: 'Pending', color: 'bg-yellow-100 border-yellow-200' },
    { key: 'preparing', label: 'Preparing', color: 'bg-blue-100 border-blue-200' },
    { key: 'ready', label: 'Ready', color: 'bg-green-100 border-green-200' },
    { key: 'completed', label: 'Completed', color: 'bg-gray-100 border-gray-200' },
    { key: 'cancelled', label: 'Cancelled', color: 'bg-red-100 border-red-200' }
];

export default function OnlineOrdering() {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();

    // State
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);

    useEffect(() => {
        if (selectedOrganization?.id) {
            fetchRestaurantData();
        }
    }, [selectedOrganization]);

    const fetchRestaurantData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get or create restaurant
            let { data: restaurantData, error: restaurantError } = await supabase
                .from('restaurants')
                .select('*')
                .eq('organization_id', selectedOrganization!.id)
                .single();

            if (restaurantError && restaurantError.code === 'PGRST116') {
                // Create restaurant if it doesn't exist
                const { data: newRestaurant, error: createError } = await supabase
                    .from('restaurants')
                    .insert({
                        organization_id: selectedOrganization!.id,
                        name: selectedOrganization!.name,
                        slug: selectedOrganization!.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                        timezone: 'America/New_York',
                        currency_code: 'USD',
                        is_active: true,
                        accepts_online_orders: true,
                        estimated_delivery_time: 30,
                        created_by: user?.id
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                restaurantData = newRestaurant;
            } else if (restaurantError) {
                throw restaurantError;
            }

            setRestaurant(restaurantData);

            // Fetch orders
            await fetchOrders(restaurantData.restaurant_id);

        } catch (err) {
            console.error('Error fetching restaurant data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load restaurant data');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async (restaurantId: string) => {
        try {
            // Fetch orders with customer info and order items
            const { data: ordersData, error: ordersError } = await supabase
                .from('restaurant_orders')
                .select(`
                    *,
                    order_items (
                        *,
                        menu_items (
                            name,
                            display_name
                        )
                    )
                `)
                .eq('restaurant_id', restaurantId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (ordersError) throw ordersError;

            // Transform the data to match our interface
            const transformedOrders = (ordersData || []).map(order => ({
                ...order,
                items: order.order_items?.map((item: any) => ({
                    ...item,
                    menu_item: item.menu_items
                })) || []
            }));

            setOrders(transformedOrders);
        } catch (err) {
            console.error('Error fetching orders:', err);
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('restaurant_orders')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('order_id', orderId);

            if (error) throw error;

            // Update local state
            setOrders(orders.map(order =>
                order.order_id === orderId
                    ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
                    : order
            ));
        } catch (err) {
            console.error('Error updating order status:', err);
            setError('Failed to update order status');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'ready': return 'bg-green-100 text-green-800 border-green-200';
            case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getCurrencySymbol = (currencyCode?: string) => {
        switch (currencyCode) {
            case 'EUR': return '€';
            case 'GBP': return '£';
            case 'JPY': return '¥';
            default: return '$';
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const todayOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at).toDateString();
        const today = new Date().toDateString();
        return orderDate === today;
    });

    const todayStats = {
        totalOrders: todayOrders.length,
        totalRevenue: todayOrders.reduce((sum, order) => sum + order.total_amount, 0),
        avgOrderValue: todayOrders.length > 0 ? todayOrders.reduce((sum, order) => sum + order.total_amount, 0) / todayOrders.length : 0,
        pendingOrders: todayOrders.filter(o => o.status === 'pending').length
    };

    const handleDragStart = (e: React.DragEvent, order: Order) => {
        setDraggedOrder(order);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        if (draggedOrder && draggedOrder.status !== newStatus) {
            updateOrderStatus(draggedOrder.order_id, newStatus);
        }
        setDraggedOrder(null);
    };

    // Loading and error states
    if (!selectedOrganization) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
                        Please select an organization to manage online ordering.
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading order data...</p>
                </div>
            </div>
        );
    }

    if (!restaurant) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-red-50 text-red-800 p-4 rounded-lg">
                        Failed to load restaurant data. Please try refreshing the page.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Management</h1>
                            <p className="text-gray-600">Manage incoming orders for {restaurant?.name}</p>
                        </div>
                        {todayStats.pendingOrders > 0 && (
                            <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg flex items-center">
                                <Bell className="w-5 h-5 mr-2" />
                                {todayStats.pendingOrders} pending orders
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto text-red-700 hover:text-red-800"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600">Total Orders</p>
                                <p className="text-2xl font-bold text-blue-900">{todayStats.totalOrders}</p>
                            </div>
                            <Package className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600">Revenue</p>
                                <p className="text-2xl font-bold text-green-900">
                                    {getCurrencySymbol(restaurant?.currency_code)}{todayStats.totalRevenue.toFixed(2)}
                                </p>
                            </div>
                            <DollarSign className="w-8 h-8 text-green-600" />
                        </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-600">Avg Order</p>
                                <p className="text-2xl font-bold text-purple-900">
                                    {getCurrencySymbol(restaurant?.currency_code)}{todayStats.avgOrderValue.toFixed(2)}
                                </p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-purple-600" />
                        </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-orange-600">Pending</p>
                                <p className="text-2xl font-bold text-orange-900">{todayStats.pendingOrders}</p>
                            </div>
                            <Bell className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Kanban Board */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-x-auto">
                    {ORDER_STATUSES.map((status) => (
                        <div
                            key={status.key}
                            className={`${status.color} rounded-lg border-2 border-dashed min-h-96`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, status.key)}
                        >
                            <div className="p-4 border-b border-gray-200">
                                <h3 className="font-semibold text-gray-900">{status.label}</h3>
                                <p className="text-sm text-gray-600">
                                    {filteredOrders.filter(order => order.status === status.key).length} orders
                                </p>
                            </div>
                            <div className="p-4 space-y-3">
                                {filteredOrders
                                    .filter(order => order.status === status.key)
                                    .map((order) => (
                                        <OrderCard
                                            key={order.order_id}
                                            order={order}
                                            restaurant={restaurant}
                                            onDragStart={handleDragStart}
                                            onClick={() => setSelectedOrder(order)}
                                            isDragging={draggedOrder?.order_id === order.order_id}
                                            getCurrencySymbol={getCurrencySymbol}
                                        />
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Order Detail Modal */}
                {selectedOrder && (
                    <OrderDetailModal
                        order={selectedOrder}
                        restaurant={restaurant}
                        onClose={() => setSelectedOrder(null)}
                        onUpdateStatus={updateOrderStatus}
                        getStatusColor={getStatusColor}
                        getCurrencySymbol={getCurrencySymbol}
                    />
                )}
            </div>
        </div>
    );
}

// Order Card Component for Kanban
const OrderCard = ({
    order,
    restaurant,
    onDragStart,
    onClick,
    isDragging,
    getCurrencySymbol
}: {
    order: Order;
    restaurant: Restaurant | null;
    onDragStart: (e: React.DragEvent, order: Order) => void;
    onClick: () => void;
    isDragging: boolean;
    getCurrencySymbol: (currencyCode?: string) => string;
}) => (
    <div
        draggable
        onDragStart={(e) => onDragStart(e, order)}
        onClick={onClick}
        className={`bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all duration-200 ${isDragging ? 'opacity-50 transform rotate-2' : ''
            }`}
    >
        <div className="flex items-center justify-between mb-3">
            <div>
                <h4 className="font-medium text-gray-900 text-sm">{order.order_number}</h4>
                <p className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleTimeString()}
                </p>
            </div>
            <div className="flex items-center text-xs text-gray-500">
                {order.order_type === 'delivery' ? (
                    <Truck className="w-3 h-3 mr-1" />
                ) : (
                    <Package className="w-3 h-3 mr-1" />
                )}
                {order.order_type}
            </div>
        </div>

        <div className="mb-3">
            <p className="text-sm font-medium text-gray-900">{order.customer_name}</p>
            <p className="text-xs text-gray-500">{order.customer_phone}</p>
        </div>

        <div className="flex justify-between items-center mb-3">
            <span className="text-lg font-semibold text-gray-900">
                {getCurrencySymbol(restaurant?.currency_code)}{order.total_amount.toFixed(2)}
            </span>
            <span className="text-xs text-gray-500">
                {order.items?.length || 0} items
            </span>
        </div>

        {order.special_instructions && (
            <div className="mb-3 p-2 bg-yellow-50 rounded text-xs">
                <p className="text-yellow-800 truncate">{order.special_instructions}</p>
            </div>
        )}

        <div className="flex items-center justify-between">
            <Clock className="w-4 h-4 text-gray-400" />
            <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
    </div>
);

// Order Detail Modal
const OrderDetailModal = ({
    order,
    restaurant,
    onClose,
    onUpdateStatus,
    getStatusColor,
    getCurrencySymbol
}: {
    order: Order;
    restaurant: Restaurant | null;
    onClose: () => void;
    onUpdateStatus: (id: string, status: string) => void;
    getStatusColor: (status: string) => string;
    getCurrencySymbol: (currencyCode?: string) => string;
}) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Order Details</h2>
                    <p className="text-gray-600">{order.order_number}</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-6 space-y-6">
                {/* Status and Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Status</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Order Type</h3>
                        <div className="flex items-center text-sm text-gray-600">
                            {order.order_type === 'delivery' ? (
                                <Truck className="w-4 h-4 mr-2" />
                            ) : (
                                <Package className="w-4 h-4 mr-2" />
                            )}
                            {order.order_type.charAt(0).toUpperCase() + order.order_type.slice(1)}
                        </div>
                    </div>
                </div>

                {/* Customer Information */}
                <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Customer Information</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        {order.customer_name && (
                            <div className="flex items-center">
                                <Users className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="text-sm text-gray-900">{order.customer_name}</span>
                            </div>
                        )}
                        {order.customer_email && (
                            <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="text-sm text-gray-900">{order.customer_email}</span>
                            </div>
                        )}
                        {order.customer_phone && (
                            <div className="flex items-center">
                                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="text-sm text-gray-900">{order.customer_phone}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Order Items */}
                <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Order Items</h3>
                    <div className="border border-gray-200 rounded-lg">
                        {order.items?.map((item, index) => (
                            <div key={index} className="flex justify-between items-center p-4 border-b border-gray-200 last:border-b-0">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {item.menu_item?.display_name || item.menu_item?.name || 'Unknown Item'}
                                    </p>
                                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                    {item.special_instructions && (
                                        <p className="text-xs text-yellow-600 mt-1">{item.special_instructions}</p>
                                    )}
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                    {getCurrencySymbol(restaurant?.currency_code)}{item.total_price.toFixed(2)}
                                </span>
                            </div>
                        )) || (
                                <p className="p-4 text-sm text-gray-500">No item details available</p>
                            )}
                    </div>
                </div>

                {/* Order Summary */}
                <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Order Summary</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="text-gray-900">{getCurrencySymbol(restaurant?.currency_code)}{order.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tax</span>
                            <span className="text-gray-900">{getCurrencySymbol(restaurant?.currency_code)}{order.tax_amount.toFixed(2)}</span>
                        </div>
                        {order.delivery_fee > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Delivery Fee</span>
                                <span className="text-gray-900">{getCurrencySymbol(restaurant?.currency_code)}{order.delivery_fee.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tip</span>
                            <span className="text-gray-900">{getCurrencySymbol(restaurant?.currency_code)}{order.tip_amount.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 flex justify-between font-medium">
                            <span className="text-gray-900">Total</span>
                            <span className="text-gray-900">{getCurrencySymbol(restaurant?.currency_code)}{order.total_amount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Special Instructions */}
                {order.special_instructions && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Special Instructions</h3>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800">{order.special_instructions}</p>
                        </div>
                    </div>
                )}

                {/* Timestamps */}
                <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Timestamps</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-600">Order Placed</p>
                            <p className="text-gray-900">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Last Updated</p>
                            <p className="text-gray-900">{new Date(order.updated_at).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                        {order.status === 'pending' && (
                            <button
                                onClick={() => {
                                    onUpdateStatus(order.order_id, 'preparing');
                                    onClose();
                                }}
                                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                            >
                                Start Preparing
                            </button>
                        )}
                        {order.status === 'preparing' && (
                            <button
                                onClick={() => {
                                    onUpdateStatus(order.order_id, 'ready');
                                    onClose();
                                }}
                                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors"
                            >
                                Mark Ready
                            </button>
                        )}
                        {order.status === 'ready' && (
                            <button
                                onClick={() => {
                                    onUpdateStatus(order.order_id, 'completed');
                                    onClose();
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                            >
                                Complete Order
                            </button>
                        )}
                        {['pending', 'preparing'].includes(order.status) && (
                            <button
                                onClick={() => {
                                    onUpdateStatus(order.order_id, 'cancelled');
                                    onClose();
                                }}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
                            >
                                Cancel Order
                            </button>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>
);