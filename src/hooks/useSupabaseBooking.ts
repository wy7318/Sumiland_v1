// src/hooks/useSupabaseBooking.ts
import { useState } from 'react';

interface BookingData {
    booking_date: string;
    booking_time: string;
    party_size: number;
    customer_name: string;
    customer_email: string;  // Now required
    customer_phone: string;
    special_requests?: string;
}

interface BookingResult {
    success: boolean;
    booking_id: string;
    booking_number: string;
    customer_id: string;
    status: string;
    message: string;
}

export const useSupabaseBooking = (restaurantSlug: string) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const makeBooking = async (bookingData: BookingData): Promise<BookingResult> => {
        setLoading(true);
        setError(null);

        try {
            // Validate required fields on frontend as well
            const requiredFields = ['booking_date', 'booking_time', 'party_size', 'customer_name', 'customer_email', 'customer_phone'];
            const missingFields = requiredFields.filter(field => !bookingData[field as keyof BookingData]);
            
            if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(bookingData.customer_email)) {
                throw new Error('Please enter a valid email address');
            }

            // Validate party size
            if (bookingData.party_size < 1 || bookingData.party_size > 20) {
                throw new Error('Party size must be between 1 and 20 people');
            }

            // Validate booking date is in the future
            const bookingDateTime = new Date(`${bookingData.booking_date}T${bookingData.booking_time}`);
            const now = new Date();
            
            if (bookingDateTime <= now) {
                throw new Error('Booking must be scheduled for a future date and time');
            }

            console.log('Making booking request with data:', bookingData);

            // Use the correct Supabase function URL
            const functionUrl = `/functions/v1/restaurant-store/${restaurantSlug}/booking`;
            
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingData)
            });

            console.log('Booking response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Booking error response:', errorText);

                let errorMessage = 'Failed to create booking';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                    
                    // Handle specific error cases
                    if (errorData.required) {
                        errorMessage = `Missing required information: ${errorData.required.join(', ')}`;
                    }
                } catch (parseError) {
                    errorMessage = `Server error (${response.status}): ${errorText}`;
                }
                
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('Booking result:', result);

            if (!result.success) {
                throw new Error(result.error || 'Failed to create booking');
            }

            return result;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create booking';
            console.error('Booking error:', errorMessage);
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

    const clearError = () => {
        setError(null);
    };

    return {
        makeBooking,
        checkAvailability,
        loading,
        error,
        clearError
    };
};