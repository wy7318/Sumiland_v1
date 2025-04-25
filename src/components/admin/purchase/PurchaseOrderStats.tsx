import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Truck, AlertCircle, ClipboardList } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { formatCurrency } from '../../../lib/utils';

export const PurchaseOrderStats = () => {
    const { selectedOrganization } = useOrganization();
    const [stats, setStats] = useState({
        totalOrders: 0,
        pendingOrders: 0,
        lateOrders: 0,
        monthlySpend: 0,
        monthlyChange: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!selectedOrganization?.id) return;

        const fetchStats = async () => {
            setLoading(true);
            try {
                // Get current date for comparisons
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

                const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
                const startOfLastMonth = new Date(lastMonthYear, lastMonth, 1).toISOString();
                const endOfLastMonth = new Date(currentYear, currentMonth, 0).toISOString();

                // Fetch total orders
                const { count: totalCount } = await supabase
                    .from('purchase_orders')
                    .select('id', { count: 'exact' })
                    .eq('organization_id', selectedOrganization.id);

                // Fetch pending orders (not fully received)
                const { count: pendingCount } = await supabase
                    .from('purchase_orders')
                    .select('id', { count: 'exact' })
                    .eq('organization_id', selectedOrganization.id)
                    .in('status', ['submitted', 'approved', 'partially_received']);

                // Fetch late orders
                const { count: lateCount } = await supabase
                    .from('purchase_orders')
                    .select('id', { count: 'exact' })
                    .eq('organization_id', selectedOrganization.id)
                    .in('status', ['submitted', 'approved', 'partially_received'])
                    .lt('expected_delivery_date', now.toISOString());

                // Fetch current month's spend
                const { data: currentMonthData } = await supabase
                    .from('purchase_orders')
                    .select('total_amount')
                    .eq('organization_id', selectedOrganization.id)
                    .gte('order_date', startOfMonth);

                const currentMonthTotal = currentMonthData.reduce(
                    (sum, order) => sum + parseFloat(order.total_amount), 0
                );

                // Fetch last month's spend
                const { data: lastMonthData } = await supabase
                    .from('purchase_orders')
                    .select('total_amount')
                    .eq('organization_id', selectedOrganization.id)
                    .gte('order_date', startOfLastMonth)
                    .lt('order_date', endOfLastMonth);

                const lastMonthTotal = lastMonthData.reduce(
                    (sum, order) => sum + parseFloat(order.total_amount), 0
                );

                // Calculate month-over-month change
                const monthlyChange = lastMonthTotal === 0
                    ? 100
                    : ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;

                setStats({
                    totalOrders: totalCount || 0,
                    pendingOrders: pendingCount || 0,
                    lateOrders: lateCount || 0,
                    monthlySpend: currentMonthTotal || 0,
                    monthlyChange
                });
            } catch (error) {
                console.error('Error fetching purchase order stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [selectedOrganization]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white p-6 rounded-lg shadow-md animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Orders */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                    <h3 className="text-gray-500 font-medium">Total Orders</h3>
                    <ClipboardList className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-2xl font-bold mt-2">{stats.totalOrders}</p>
                <p className="text-gray-500 text-sm mt-2">All purchase orders</p>
            </div>

            {/* Pending Orders */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                    <h3 className="text-gray-500 font-medium">Pending Orders</h3>
                    <Truck className="w-8 h-8 text-amber-500" />
                </div>
                <p className="text-2xl font-bold mt-2">{stats.pendingOrders}</p>
                <p className="text-gray-500 text-sm mt-2">Awaiting delivery</p>
            </div>

            {/* Late Orders */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                    <h3 className="text-gray-500 font-medium">Late Orders</h3>
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-2xl font-bold mt-2">{stats.lateOrders}</p>
                <p className="text-gray-500 text-sm mt-2">Past expected delivery date</p>
            </div>

            {/* Monthly Spend */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                    <h3 className="text-gray-500 font-medium">Monthly Spend</h3>
                    <span className={`inline-flex items-center text-sm font-medium ${stats.monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.monthlyChange.toFixed(1)}%
                        {stats.monthlyChange >= 0 ?
                            <ArrowUpRight className="w-4 h-4 ml-1" /> :
                            <ArrowDownRight className="w-4 h-4 ml-1" />
                        }
                    </span>
                </div>
                <p className="text-2xl font-bold mt-2">{formatCurrency(stats.monthlySpend)}</p>
                <p className="text-gray-500 text-sm mt-2">vs. last month</p>
            </div>
        </div>
    );
};