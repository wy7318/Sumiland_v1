// src/hooks/useSupabaseOrder.ts
import { useState } from 'react';

interface OrderData {
  items: any[];
  customer: any;
  order_type: 'pickup' | 'delivery';
  payment_method: string;
  special_instructions?: string;
}

export function useSupabaseOrder(restaurantSlug: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeOrder = async (orderData: OrderData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/restaurant-store/${restaurantSlug}/order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(orderData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to place order');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to place order';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const trackOrder = async (orderId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/restaurant-store/${restaurantSlug}/status/${orderId}`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Order not found');
      }

      return await response.json();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to track order');
    }
  };

  return { placeOrder, trackOrder, loading, error };
}