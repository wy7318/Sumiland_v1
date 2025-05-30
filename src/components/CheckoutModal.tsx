// src/components/CheckoutModal.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CheckoutModalProps {
    cart: any[];
    cartTotal: number;
    restaurant: any;
    onClose: () => void;
    onPlaceOrder: (orderData: any) => Promise<void>;
    loading: boolean;
}

export default function CheckoutModal({ cart, cartTotal, restaurant, onClose, onPlaceOrder, loading }: CheckoutModalProps) {
    const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('pickup');
    const [customer, setCustomer] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: {
            line1: '',
            city: '',
            state: '',
            zip_code: ''
        }
    });
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [specialInstructions, setSpecialInstructions] = useState('');

    const tax = cartTotal * 0.0875;
    const deliveryFee = orderType === 'delivery' ? (restaurant.delivery_fee || 3.99) : 0;
    const total = cartTotal + tax + deliveryFee;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!customer.first_name || !customer.last_name || !customer.email || !customer.phone) {
            alert('Please fill in all required customer information');
            return;
        }

        if (orderType === 'delivery' && (!customer.address.line1 || !customer.address.city)) {
            alert('Please fill in delivery address');
            return;
        }

        await onPlaceOrder({
            customer,
            order_type: orderType,
            payment_method: paymentMethod,
            special_instructions: specialInstructions
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Checkout</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Order Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Order Type</label>
                            <div className="flex gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="pickup"
                                        checked={orderType === 'pickup'}
                                        onChange={(e) => setOrderType(e.target.value as 'pickup')}
                                        className="mr-2"
                                    />
                                    Pickup
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="delivery"
                                        checked={orderType === 'delivery'}
                                        onChange={(e) => setOrderType(e.target.value as 'delivery')}
                                        className="mr-2"
                                    />
                                    Delivery
                                </label>
                            </div>
                        </div>

                        {/* Customer Information */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={customer.first_name}
                                    onChange={(e) => setCustomer({ ...customer, first_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={customer.last_name}
                                    onChange={(e) => setCustomer({ ...customer, last_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={customer.email}
                                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                                <input
                                    type="tel"
                                    required
                                    value={customer.phone}
                                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Delivery Address */}
                        {orderType === 'delivery' && (
                            <div className="space-y-4">
                                <h3 className="font-medium">Delivery Address</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                                    <input
                                        type="text"
                                        required
                                        value={customer.address.line1}
                                        onChange={(e) => setCustomer({
                                            ...customer,
                                            address: { ...customer.address, line1: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                                        <input
                                            type="text"
                                            required
                                            value={customer.address.city}
                                            onChange={(e) => setCustomer({
                                                ...customer,
                                                address: { ...customer.address, city: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                        <input
                                            type="text"
                                            value={customer.address.state}
                                            onChange={(e) => setCustomer({
                                                ...customer,
                                                address: { ...customer.address, state: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                                        <input
                                            type="text"
                                            value={customer.address.zip_code}
                                            onChange={(e) => setCustomer({
                                                ...customer,
                                                address: { ...customer.address, zip_code: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Special Instructions */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                            <textarea
                                value={specialInstructions}
                                onChange={(e) => setSpecialInstructions(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="Any special requests or notes..."
                            />
                        </div>

                        {/* Order Summary */}
                        <div className="border-t pt-4">
                            <h3 className="font-medium mb-3">Order Summary</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>${cartTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax</span>
                                    <span>${tax.toFixed(2)}</span>
                                </div>
                                {deliveryFee > 0 && (
                                    <div className="flex justify-between">
                                        <span>Delivery Fee</span>
                                        <span>${deliveryFee.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-lg border-t pt-2">
                                    <span>Total</span>
                                    <span>${total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Placing Order...
                                </>
                            ) : (
                                `Place Order - $${total.toFixed(2)}`
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}