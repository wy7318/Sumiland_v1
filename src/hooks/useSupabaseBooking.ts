// src/hooks/useSupabaseBooking.ts
import { useState } from 'react';

export const useSupabaseBooking = (restaurantSlug: string) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const makeBooking = async (bookingData: {
        booking_date: string;
        booking_time: string;
        party_size: number;
        customer_name: string;
        customer_email?: string;
        customer_phone: string;
        special_requests?: string;
    }) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/functions/v1/restaurant-store/${restaurantSlug}/booking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingData)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to create booking');
            }

            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create booking';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const checkAvailability = async (date: string, time: string, partySize: number) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/functions/v1/restaurant-store/${restaurantSlug}/availability?date=${date}&time=${time}&party_size=${partySize}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to check availability');
            }

            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to check availability';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return {
        makeBooking,
        checkAvailability,
        loading,
        error
    };
};