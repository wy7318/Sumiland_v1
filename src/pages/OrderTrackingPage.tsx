// src/pages/OrderTrackingPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle, Clock, Package, Truck, AlertCircle, ArrowLeft } from 'lucide-react';
import { useSupabaseOrder } from '../hooks/useSupabaseOrder';

interface OrderStatus {
    order_id: string;
    order_number: string;
    status: string;
    order_type: string;
    total_amount: number;
    estimated_ready_time: string;
    actual_ready_time?: string;
    created_at: string;
    status_history: Array<{
        status: string;
        notes?: string;
        created_at: string;
    }>;
}

export default function OrderTrackingPage() {
    const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
    const { trackOrder } = useSupabaseOrder(slug || '');
    const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const fetchOrderStatus = async () => {
            if (!orderId) return;

            try {
                setLoading(true);
                setError(null);
                const data = await trackOrder(orderId);
                setOrderStatus(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to track order');
            } finally {
                setLoading(false);
            }
        };

        // Initial fetch
        fetchOrderStatus();

        // Poll for updates every 30 seconds if order is not completed
        interval = setInterval(() => {
            if (orderStatus && !['ready', 'completed', 'cancelled'].includes(orderStatus.status)) {
                fetchOrderStatus();
            }
        }, 30000);

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [orderId, trackOrder]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="w-6 h-6 text-orange-500" />;
            case 'confirmed':
                return <CheckCircle className="w-6 h-6 text-blue-500" />;
            case 'preparing':
                return <Package className="w-6 h-6 text-yellow-500" />;
            case 'ready':
                return <CheckCircle className="w-6 h-6 text-green-500" />;
            case 'out_for_delivery':
                return <Truck className="w-6 h-6 text-purple-500" />;
            case 'completed':
                return <CheckCircle className="w-6 h-6 text-green-500" />;
            case 'cancelled':
                return <AlertCircle className="w-6 h-6 text-red-500" />;
            default:
                return <Clock className="w-6 h-6 text-gray-500" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending':
                return 'Order Received';
            case 'confirmed':
                return 'Order Confirmed';
            case 'preparing':
                return 'Being Prepared';
            case 'ready':
                return 'Ready for Pickup';
            case 'out_for_delivery':
                return 'Out for Delivery';
            case 'completed':
                return 'Order Completed';
            case 'cancelled':
                return 'Order Cancelled';
            default:
                return status.charAt(0).toUpperCase() + status.slice(1);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'text-orange-600 bg-orange-50';
            case 'confirmed':
                return 'text-blue-600 bg-blue-50';
            case 'preparing':
                return 'text-yellow-600 bg-yellow-50';
            case 'ready':
                return 'text-green-600 bg-green-50';
            case 'out_for_delivery':
                return 'text-purple-600 bg-purple-50';
            case 'completed':
                return 'text-green-600 bg-green-50';
            case 'cancelled':
                return 'text-red-600 bg-red-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading order status...</p>
                </div>
            </div>
        );
    }

    if (error || !orderStatus) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h1>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <Link
                        to={`/online-order/store/${slug}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Restaurant
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Link
                            to={`/online-order/store/${slug}`}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Order Tracking</h1>
                            <p className="text-gray-600">Order #{orderStatus.order_number}</p>
                        </div>
                    </div>

                    {/* Current Status */}
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${getStatusColor(orderStatus.status)}`}>
                        {getStatusIcon(orderStatus.status)}
                        <span>{getStatusText(orderStatus.status)}</span>
                    </div>
                </div>
            </div>

            {/* Order Details */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Status Timeline */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h2>

                        <div className="space-y-4">
                            {orderStatus.status_history.map((statusUpdate, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-1">
                                        {getStatusIcon(statusUpdate.status)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{getStatusText(statusUpdate.status)}</p>
                                        {statusUpdate.notes && (
                                            <p className="text-sm text-gray-600 mt-1">{statusUpdate.notes}</p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(statusUpdate.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Order Type</span>
                                <span className="font-medium capitalize">{orderStatus.order_type}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-600">Order Time</span>
                                <span className="font-medium">
                                    {new Date(orderStatus.created_at).toLocaleString()}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-600">Estimated Ready Time</span>
                                <span className="font-medium">
                                    {new Date(orderStatus.estimated_ready_time).toLocaleString()}
                                </span>
                            </div>

                            {orderStatus.actual_ready_time && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Actual Ready Time</span>
                                    <span className="font-medium text-green-600">
                                        {new Date(orderStatus.actual_ready_time).toLocaleString()}
                                    </span>
                                </div>
                            )}

                            <div className="border-t pt-3 mt-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-900 font-semibold">Total Amount</span>
                                    <span className="font-bold text-lg">${orderStatus.total_amount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Status-specific messages */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            {orderStatus.status === 'preparing' && (
                                <p className="text-sm text-gray-700">
                                    🍳 Your order is being prepared! We'll notify you when it's ready.
                                </p>
                            )}
                            {orderStatus.status === 'ready' && orderStatus.order_type === 'pickup' && (
                                <p className="text-sm text-green-700">
                                    ✅ Your order is ready for pickup! Please come to the restaurant.
                                </p>
                            )}
                            {orderStatus.status === 'out_for_delivery' && (
                                <p className="text-sm text-purple-700">
                                    🚚 Your order is on the way! Expected delivery soon.
                                </p>
                            )}
                            {orderStatus.status === 'completed' && (
                                <p className="text-sm text-green-700">
                                    🎉 Order completed! Thank you for your business!
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}