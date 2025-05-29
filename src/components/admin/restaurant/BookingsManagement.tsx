import React from 'react';
import { Calendar, Users, Clock } from 'lucide-react';

export default function BookingsManagement() {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Table Bookings</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600">Today's Bookings</p>
                                <p className="text-2xl font-bold">12</p>
                            </div>
                            <Calendar className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600">Total Guests</p>
                                <p className="text-2xl font-bold">48</p>
                            </div>
                            <Users className="w-8 h-8 text-green-600" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600">Next Booking</p>
                                <p className="text-2xl font-bold">6:30 PM</p>
                            </div>
                            <Clock className="w-8 h-8 text-purple-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <p className="text-gray-600">Booking calendar and management coming soon...</p>
                </div>
            </div>
        </div>
    );
}