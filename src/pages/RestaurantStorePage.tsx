// src/pages/RestaurantStorePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import RestaurantOrderingPlatform from '../components/RestaurantOrderingPlatform';
import { Loader2, AlertCircle } from 'lucide-react';

interface RestaurantData {
    restaurant: any;
    menu: any;
}

export default function RestaurantStorePage() {
    const { slug } = useParams<{ slug: string }>();
    const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (slug) {
            fetchRestaurantData(slug);
        }
    }, [slug]);

    const fetchRestaurantData = async (restaurantSlug: string) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/restaurant-store/${restaurantSlug}`,
                {
                    headers: {
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    },
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Restaurant not found');
                }
                throw new Error('Failed to load restaurant');
            }

            const data = await response.json();
            setRestaurantData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load restaurant');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading restaurant...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Restaurant Not Found</h1>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <a
                        href="/online-order"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Browse Restaurants
                    </a>
                </div>
            </div>
        );
    }

    if (!restaurantData) {
        return null;
    }

    return <RestaurantOrderingPlatform restaurantData={restaurantData} />;
}