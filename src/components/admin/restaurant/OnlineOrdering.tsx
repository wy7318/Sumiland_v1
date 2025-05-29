import React from 'react';
import { ShoppingBag, Globe, Smartphone } from 'lucide-react';

export default function OnlineOrdering() {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Online Ordering</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <Globe className="w-8 h-8 text-blue-600 mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Website Settings</h2>
                        <p className="text-gray-600">Configure your online ordering website</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <Smartphone className="w-8 h-8 text-green-600 mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Order Management</h2>
                        <p className="text-gray-600">View and manage incoming orders</p>
                    </div>
                </div>
            </div>
        </div>
    );
}