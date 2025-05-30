import React from 'react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { TimezoneUtils, BusinessHours } from '../lib/timezone';

interface BusinessHoursDisplayProps {
    operatingHours: BusinessHours;
    timezone: string;
    restaurant?: any;
    showCurrentStatus?: boolean;
    className?: string;
}

export default function BusinessHoursDisplay({
    operatingHours,
    timezone,
    restaurant,
    showCurrentStatus = true,
    className = ""
}: BusinessHoursDisplayProps) {
    // Validate inputs
    if (!TimezoneUtils.validateBusinessHours(operatingHours)) {
        return (
            <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Business Hours
                    </h3>
                </div>
                <div className="text-center py-4">
                    <p className="text-gray-500">Operating hours not configured</p>
                </div>
            </div>
        );
    }

    const restaurantStatus = TimezoneUtils.isRestaurantOpen(operatingHours, timezone);
    const allHours = TimezoneUtils.getAllBusinessHours(operatingHours);
    const restaurantTime = TimezoneUtils.getRestaurantTime(timezone);
    const currentDay = TimezoneUtils.getDayName(restaurantTime);

    return (
        <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Business Hours
                </h3>

                {showCurrentStatus && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${restaurantStatus.isOpen
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {restaurantStatus.isOpen ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Open Now
                            </>
                        ) : (
                            <>
                                <XCircle className="w-4 h-4" />
                                Closed
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Current Status Message */}
            {showCurrentStatus && restaurantStatus.message && (
                <div className="mb-4 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800">{restaurantStatus.message}</p>
                    {!restaurantStatus.isOpen && restaurantStatus.nextOpenTime && (
                        <p className="text-xs text-blue-600 mt-1">
                            Next open: {restaurantStatus.nextOpenTime}
                        </p>
                    )}
                </div>
            )}

            {/* Hours List */}
            <div className="space-y-2">
                {Object.entries(allHours).map(([day, hours]) => {
                    const dayKey = day.toLowerCase();
                    const isToday = dayKey === currentDay;
                    const dayHours = operatingHours[dayKey];

                    return (
                        <div
                            key={day}
                            className={`flex justify-between items-center py-2 px-3 rounded ${isToday ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                                }`}
                        >
                            <span className={`font-medium ${isToday ? 'text-blue-900' : 'text-gray-700'
                                }`}>
                                {day}
                                {isToday && (
                                    <span className="ml-2 text-xs text-blue-600 font-normal">
                                        (Today)
                                    </span>
                                )}
                            </span>

                            <span className={`text-sm ${dayHours?.isOpen
                                ? (isToday ? 'text-blue-800' : 'text-gray-600')
                                : 'text-red-600'
                                }`}>
                                {hours}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Restaurant Time Zone Info */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 text-center">
                    <p>Restaurant Time: {restaurantTime.toLocaleString()}</p>
                    <p>Timezone: {timezone}</p>
                </div>
            </div>

            {/* Additional Info */}
            {restaurant && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        {restaurant.estimated_delivery_time && (
                            <div>
                                <span className="text-gray-500">Delivery Time:</span>
                                <span className="ml-2 font-medium">{restaurant.estimated_delivery_time} min</span>
                            </div>
                        )}

                        {restaurant.cuisine_type && (
                            <div>
                                <span className="text-gray-500">Cuisine:</span>
                                <span className="ml-2 font-medium">{restaurant.cuisine_type}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {restaurant.accepts_online_orders && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                Online Ordering
                            </span>
                        )}

                        {restaurant.accepts_bookings && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Table Bookings
                            </span>
                        )}

                        {restaurant.website_settings?.delivery_enabled && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                Delivery Available
                            </span>
                        )}

                        {restaurant.website_settings?.pickup_enabled && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                                Pickup Available
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Compact version for smaller spaces
export function BusinessHoursCompact({
    operatingHours,
    timezone,
    className = ""
}: BusinessHoursDisplayProps) {
    if (!TimezoneUtils.validateBusinessHours(operatingHours)) {
        return (
            <div className={`flex items-center gap-3 ${className}`}>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    <Clock className="w-3 h-3" />
                    Hours unavailable
                </div>
            </div>
        );
    }

    const restaurantStatus = TimezoneUtils.isRestaurantOpen(operatingHours, timezone);
    const restaurantTime = TimezoneUtils.getRestaurantTime(timezone);
    const currentDay = TimezoneUtils.getDayName(restaurantTime);
    const todayHours = operatingHours[currentDay];

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${restaurantStatus.isOpen
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
                }`}>
                <Clock className="w-3 h-3" />
                {restaurantStatus.isOpen ? 'Open' : 'Closed'}
            </div>

            {todayHours && (
                <span className="text-sm text-gray-600">
                    Today: {todayHours.isOpen
                        ? `${TimezoneUtils.formatTime(todayHours.open)} - ${TimezoneUtils.formatTime(todayHours.close)}`
                        : 'Closed'
                    }
                </span>
            )}
        </div>
    );
}