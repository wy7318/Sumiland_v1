// src/pages/RestaurantListPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, Star, Clock } from 'lucide-react';

interface Restaurant {
    restaurant_id: string;
    name: string;
    slug: string;
    description: string;
    logo_url: string;
    cover_image_url: string;
    city: string;
    state: string;
    cuisine_type?: string;
}

export default function RestaurantListPage() {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchRestaurants();
    }, []);

    const fetchRestaurants = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/restaurant-list`,
                {
                    headers: {
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to load restaurants');
            }

            const data = await response.json();
            setRestaurants(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load restaurants');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading restaurants...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Error Loading Restaurants</h1>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={fetchRestaurants}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Order from Local Restaurants</h1>
                    <p className="text-gray-600">Discover and order from amazing restaurants in your area</p>
                </div>
            </div>

            {/* Restaurant Grid */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                {restaurants.length === 0 ? (
                    <div className="text-center py-16">
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">No restaurants available</h2>
                        <p className="text-gray-600">Check back later for new restaurants!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {restaurants.map((restaurant) => (
                            <RestaurantCard key={restaurant.restaurant_id} restaurant={restaurant} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const RestaurantCard = ({ restaurant }: { restaurant: Restaurant }) => {
    return (
        <Link
            to={`/online-order/store/${restaurant.slug}`}
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow group overflow-hidden"
        >
            {/* Cover Image */}
            <div className="h-48 bg-gray-200 overflow-hidden">
                <img
                    src={restaurant.cover_image_url}
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                    <img
                        src={restaurant.logo_url}
                        alt={`${restaurant.name} logo`}
                        className="w-12 h-12 rounded-full bg-white shadow-sm flex-shrink-0"
                    />
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {restaurant.name}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                            {restaurant.description}
                        </p>
                    </div>
                </div>

                {/* Restaurant Info */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{restaurant.city}, {restaurant.state}</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>4.8</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>25-35 min</span>
                        </div>
                    </div>
                </div>

                {/* Cuisine Type */}
                {restaurant.cuisine_type && (
                    <div className="mt-3">
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {restaurant.cuisine_type}
                        </span>
                    </div>
                )}
            </div>
        </Link>
    );
};