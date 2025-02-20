import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type PortfolioItem = Database['public']['Tables']['portfolio_items']['Row'];

export function usePortfolio(category: string = 'all') {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchPortfolio() {
      try {
        setLoading(true);
        let query = supabase
          .from('portfolio_items')
          .select('*')
          .eq('published', true)
          .order('created_at', { ascending: false });

        if (category !== 'all') {
          query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) throw error;
        
        if (mounted) {
          setItems(data || []);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchPortfolio();

    return () => {
      mounted = false;
    };
  }, [category]);

  return { items, loading, error };
}