import { useState, useEffect, useRef } from 'react';
import { Search, ShoppingBag, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OrderSearchProps {
    organizationId: string;
    selectedOrderId: string;
    onSelect: (orderId: string, orderData: any) => void;
}

export function OrderSearch({
    organizationId,
    selectedOrderId,
    onSelect
}: OrderSearchProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Fetch the selected order on mount if there is one
    useEffect(() => {
        if (selectedOrderId) {
            fetchSelectedOrder();
        }
    }, [selectedOrderId]);

    // Close the search results when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch the currently selected order
    const fetchSelectedOrder = async () => {
        try {
            const { data, error } = await supabase
                .from('order_hdr')
                .select(`
          order_id, 
          order_number, 
          customer_id, 
          status,
          total_amount,
          customers:customer_id(name)
        `)
                .eq('order_id', selectedOrderId)
                .single();

            if (error) throw error;
            setSelectedOrder(data);
        } catch (err) {
            console.error('Error fetching selected order:', err);
        }
    };

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length >= 2) {
            searchOrders(query);
            setIsSearchOpen(true);
        } else {
            setSearchResults([]);
            setIsSearchOpen(false);
        }
    };

    // Search for orders
    const searchOrders = async (query: string) => {
        try {
            setIsLoading(true);

            const { data, error } = await supabase
                .from('order_hdr')
                .select(`
          order_id, 
          order_number, 
          customer_id, 
          status,
          total_amount
        `)
                .eq('organization_id', organizationId)
                .or(`order_number.ilike.%${query}%,po_number.ilike.%${query}%`)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            setSearchResults(data || []);
        } catch (err) {
            console.error('Error searching orders:', err);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle order selection
    const handleOrderSelect = (order: any) => {
        setSelectedOrder(order);
        setSearchQuery('');
        setSearchResults([]);
        setIsSearchOpen(false);
        onSelect(order.order_id, order);
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    // Get status style
    const getStatusStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            case 'in_progress':
                return 'bg-yellow-100 text-yellow-800';
            case 'pending':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="relative" ref={searchRef}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ShoppingBag className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    placeholder={selectedOrder ? `Order #${selectedOrder.order_number}` : "Search for an order..."}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-colors"
                    onFocus={() => {
                        if (searchQuery.length >= 2) {
                            setIsSearchOpen(true);
                        }
                    }}
                />
                {isLoading && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                    </div>
                )}
            </div>

            {isSearchOpen && searchResults.length > 0 && (
                <div className="fixed z-50 bg-white shadow-lg rounded-lg border border-gray-200 max-h-60 overflow-y-auto" style={{
                    width: searchRef.current?.offsetWidth + 'px',
                    top: (searchRef.current?.getBoundingClientRect().bottom || 0) + 5 + 'px',
                    left: (searchRef.current?.getBoundingClientRect().left || 0) + 'px'
                }}>
                    <ul className="py-1">
                        {searchResults.map((order) => (
                            <li
                                key={order.order_id}
                                onClick={() => handleOrderSelect(order)}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start">
                                        <ShoppingBag className="h-5 w-5 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                Order #{order.order_number}
                                            </div>
                                            {order.customers && (
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <User className="h-4 w-4 mr-1 text-gray-400" />
                                                    {order.customers.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusStyle(order.status)}`}>
                                            {order.status}
                                        </span>
                                        {order.total_amount && (
                                            <span className="text-sm font-medium text-gray-700 mt-1">
                                                {formatCurrency(order.total_amount)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isSearchOpen && searchQuery.length >= 2 && searchResults.length === 0 && !isLoading && (
                <div className="fixed z-50 bg-white shadow-lg rounded-lg border border-gray-200 p-4" style={{
                    width: searchRef.current?.offsetWidth + 'px',
                    top: (searchRef.current?.getBoundingClientRect().bottom || 0) + 5 + 'px',
                    left: (searchRef.current?.getBoundingClientRect().left || 0) + 'px'
                }}>
                    <p className="text-gray-500 text-center">No orders found</p>
                </div>
            )}
        </div>
    );
}