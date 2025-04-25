import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Clock,
    Package,
    Building2,
    User,
    FileText,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    BarChart3,
    Tag,
    DollarSign,
    Info,
    Truck,
    Calendar
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn, formatCurrency } from '../../../lib/utils';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { useTimeZone } from '../../../contexts/TimeZoneContext';
import { TransactionWithDetails, TransactionType, getTransactionTypeLabel } from './inventoryTypes';

export const TransactionDetails = () => {
    const { transactionId } = useParams<{ transactionId: string }>();
    const navigate = useNavigate();
    const { selectedOrganization } = useOrganization();
    const { formatDate, formatTime } = useTimeZone();
    const [transaction, setTransaction] = useState<TransactionWithDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedOrganization?.id || !transactionId) return;

        const fetchTransaction = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // 1. Fetch the transaction without nested joins
                const { data: txData, error } = await supabase
                    .from('inventory_transactions')
                    .select(`
                    id,
                    product_id,
                    location_id,
                    transaction_type,
                    quantity,
                    unit_cost,
                    total_cost,
                    reference_id,
                    reference_type,
                    notes,
                    source_location_id,
                    destination_location_id,
                    created_by,
                    created_at
                `)
                    .eq('id', transactionId)
                    .eq('organization_id', selectedOrganization.id)
                    .single();

                if (error) throw error;

                if (txData) {
                    // 2. Fetch related data in parallel instead of nested
                    const [productResult, locationResult, sourceLocationResult, destLocationResult, userResult] = await Promise.all([
                        // Fetch product data
                        txData.product_id ? supabase
                            .from('products')
                            .select('name, sku, stock_unit, image_url, category')
                            .eq('id', txData.product_id)
                            .single() : { data: null },

                        // Fetch primary location data
                        txData.location_id ? supabase
                            .from('locations')
                            .select('name, type, address')
                            .eq('id', txData.location_id)
                            .single() : { data: null },

                        // Fetch source location data
                        txData.source_location_id ? supabase
                            .from('locations')
                            .select('name, type, address')
                            .eq('id', txData.source_location_id)
                            .single() : { data: null },

                        // Fetch destination location data
                        txData.destination_location_id ? supabase
                            .from('locations')
                            .select('name, type, address')
                            .eq('id', txData.destination_location_id)
                            .single() : { data: null },

                        // Fetch user data
                        txData.created_by ? supabase
                            .from('user_profiles')
                            .select('full_name, email')
                            .eq('user_id', txData.created_by)
                            .single() : { data: null }
                    ]);

                    const productData = productResult.data;
                    const locationData = locationResult.data;
                    const sourceLocationData = sourceLocationResult.data;
                    const destLocationData = destLocationResult.data;
                    const userData = userResult.data;

                    // 3. Combine everything into a single object
                    const formattedTransaction = {
                        ...txData,
                        product: {
                            name: productData?.name || 'Unknown Product',
                            sku: productData?.sku || '',
                            stock_unit: productData?.stock_unit,
                            image_url: productData?.image_url,
                            category: productData?.category
                        },
                        location: {
                            name: locationData?.name || 'Unknown Location',
                            type: locationData?.type,
                            address: locationData?.address
                        },
                        source_location: sourceLocationData ? {
                            name: sourceLocationData.name,
                            type: sourceLocationData.type,
                            address: sourceLocationData.address
                        } : undefined,
                        destination_location: destLocationData ? {
                            name: destLocationData.name,
                            type: destLocationData.type,
                            address: destLocationData.address
                        } : undefined,
                        user: userData ? {
                            name: userData.full_name,
                            email: userData.email
                        } : {}
                    };

                    setTransaction(formattedTransaction);
                } else {
                    setError('Transaction not found');
                }
            } catch (error) {
                console.error('Error fetching transaction:', error);
                setError('Error loading transaction details');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransaction();
    }, [selectedOrganization?.id, transactionId]);

    // Helper function to get transaction icon and color
    const getTransactionTypeDetails = (type: string) => {
        switch (type) {
            case TransactionType.PURCHASE:
                return {
                    icon: <TrendingUp className="h-5 w-5" />,
                    color: 'text-green-600 bg-green-100',
                    label: 'Purchase'
                };
            case TransactionType.SALE:
                return {
                    icon: <TrendingDown className="h-5 w-5" />,
                    color: 'text-red-600 bg-red-100',
                    label: 'Sale'
                };
            case TransactionType.ADJUSTMENT:
                return {
                    icon: <BarChart3 className="h-5 w-5" />,
                    color: 'text-purple-600 bg-purple-100',
                    label: 'Adjustment'
                };
            case TransactionType.TRANSFER_IN:
                return {
                    icon: <ArrowRight className="h-5 w-5" />,
                    color: 'text-blue-600 bg-blue-100',
                    label: 'Transfer In'
                };
            case TransactionType.TRANSFER_OUT:
                return {
                    icon: <ArrowLeft className="h-5 w-5" />,
                    color: 'text-orange-600 bg-orange-100',
                    label: 'Transfer Out'
                };
            case TransactionType.RETURN:
                return {
                    icon: <Truck className="h-5 w-5" />,
                    color: 'text-teal-600 bg-teal-100',
                    label: 'Return'
                };
            default:
                return {
                    icon: <FileText className="h-5 w-5" />,
                    color: 'text-gray-600 bg-gray-100',
                    label: getTransactionTypeLabel(type)
                };
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center mb-6">
                <button
                    onClick={() => navigate('/admin/inventory/transactions')}
                    className="mr-4 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-2xl font-bold">Transaction Details</h1>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            ) : transaction ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Transaction Overview */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center">
                                    {(() => {
                                        const { icon, color, label } = getTransactionTypeDetails(transaction.transaction_type);
                                        return (
                                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color}`}>
                                                {icon}
                                                <span className="ml-2">{label}</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    {formatDate(transaction.created_at)} at {formatTime(transaction.created_at)}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Product Details */}
                                <div className="border rounded-lg p-4">
                                    <h3 className="text-lg font-medium mb-3 flex items-center">
                                        <Package className="h-5 w-5 text-blue-500 mr-2" />
                                        Product
                                    </h3>

                                    <div className="flex items-start">
                                        {transaction.product.image_url ? (
                                            <div className="w-16 h-16 flex-shrink-0 mr-4 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                                                <img src={transaction.product.image_url} alt={transaction.product.name} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 flex-shrink-0 mr-4 bg-gray-100 rounded flex items-center justify-center">
                                                <Package className="h-8 w-8 text-gray-400" />
                                            </div>
                                        )}

                                        <div>
                                            <h4 className="font-medium">{transaction.product.name}</h4>
                                            <div className="text-sm text-gray-500 flex items-center">
                                                <Tag className="h-3 w-3 mr-1" />
                                                {transaction.product.sku}
                                            </div>
                                            {transaction.product.category && (
                                                <div className="text-sm text-gray-500 mt-1">
                                                    Category: {transaction.product.category}
                                                </div>
                                            )}
                                            <Link
                                                to={`/admin/inventory/products/${transaction.product_id}`}
                                                className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                                            >
                                                View Product
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                {/* Location Details */}
                                <div className="border rounded-lg p-4">
                                    <h3 className="text-lg font-medium mb-3 flex items-center">
                                        <Building2 className="h-5 w-5 text-indigo-500 mr-2" />
                                        Location
                                    </h3>

                                    <div>
                                        <h4 className="font-medium">{transaction.location.name}</h4>
                                        {transaction.location.type && (
                                            <div className="text-sm text-gray-500">
                                                Type: {transaction.location.type}
                                            </div>
                                        )}
                                        {transaction.location.address && (
                                            <div className="text-sm text-gray-500 mt-1">
                                                {transaction.location.address}
                                            </div>
                                        )}
                                        <Link
                                            to={`/admin/inventory/locations/${transaction.location_id}`}
                                            className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                                        >
                                            View Location
                                        </Link>
                                    </div>
                                </div>

                                {/* Transfer Details - only show for transfers */}
                                {(transaction.transaction_type === TransactionType.TRANSFER_IN ||
                                    transaction.transaction_type === TransactionType.TRANSFER_OUT) && (
                                        <div className="border rounded-lg p-4 md:col-span-2">
                                            <h3 className="text-lg font-medium mb-3 flex items-center">
                                                <Truck className="h-5 w-5 text-orange-500 mr-2" />
                                                Transfer Details
                                            </h3>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <h4 className="font-medium">
                                                        {transaction.transaction_type === TransactionType.TRANSFER_IN ? 'Source' : 'Destination'}
                                                    </h4>
                                                    <div className="text-sm">
                                                        {transaction.transaction_type === TransactionType.TRANSFER_IN
                                                            ? transaction.source_location?.name
                                                            : transaction.destination_location?.name}
                                                    </div>
                                                    {transaction.transaction_type === TransactionType.TRANSFER_IN
                                                        ? transaction.source_location?.address
                                                        : transaction.destination_location?.address
                                                            ? <div className="text-sm text-gray-500">{transaction.transaction_type === TransactionType.TRANSFER_IN
                                                                ? transaction.source_location?.address
                                                                : transaction.destination_location?.address}</div>
                                                            : null}
                                                </div>

                                                <div className="flex items-center justify-center">
                                                    <ArrowRight className="h-8 w-8 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                {/* Quantity and Cost Details */}
                                <div className="border rounded-lg p-4">
                                    <h3 className="text-lg font-medium mb-3 flex items-center">
                                        <BarChart3 className="h-5 w-5 text-green-500 mr-2" />
                                        Quantity
                                    </h3>

                                    <div className="text-2xl font-bold mb-2">
                                        <span className={cn({
                                            "text-green-600": transaction.quantity > 0,
                                            "text-red-600": transaction.quantity < 0
                                        })}>
                                            {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                                        </span>
                                        <span className="text-lg font-normal ml-1">
                                            {transaction.product.stock_unit}
                                        </span>
                                    </div>
                                </div>

                                <div className="border rounded-lg p-4">
                                    <h3 className="text-lg font-medium mb-3 flex items-center">
                                        <DollarSign className="h-5 w-5 text-yellow-500 mr-2" />
                                        Cost
                                    </h3>

                                    {transaction.unit_cost ? (
                                        <div>
                                            <div className="mb-2">
                                                <span className="text-sm text-gray-500">Unit Cost: </span>
                                                <span className="font-medium">{formatCurrency(transaction.unit_cost)}</span>
                                            </div>
                                            <div>
                                                <span className="text-sm text-gray-500">Total Cost: </span>
                                                <span className="font-medium">{formatCurrency(transaction.total_cost || 0)}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-gray-500">No cost information</div>
                                    )}
                                </div>
                            </div>

                            {/* Reference and Notes */}
                            <div className="border rounded-lg p-4 mt-6">
                                <h3 className="text-lg font-medium mb-3 flex items-center">
                                    <FileText className="h-5 w-5 text-purple-500 mr-2" />
                                    Reference Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-medium">Reference ID</h4>
                                        <div className="text-gray-700">
                                            {transaction.reference_id || 'N/A'}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-medium">Reference Type</h4>
                                        <div className="text-gray-700">
                                            {transaction.reference_type || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                {transaction.notes && (
                                    <div className="mt-4">
                                        <h4 className="font-medium">Notes</h4>
                                        <div className="text-gray-700 p-3 bg-gray-50 rounded mt-1">
                                            {transaction.notes}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Information */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                            <h3 className="text-lg font-medium mb-4 flex items-center">
                                <Info className="h-5 w-5 text-blue-500 mr-2" />
                                Additional Information
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500">Transaction ID</h4>
                                    <div className="text-sm font-mono break-all">{transaction.id}</div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium text-gray-500">Created By</h4>
                                    <div className="flex items-center">
                                        <User className="h-4 w-4 text-gray-400 mr-1" />
                                        <span>{transaction.user?.name || 'Unknown User'}</span>
                                    </div>
                                    {transaction.user?.email && (
                                        <div className="text-sm text-gray-500">{transaction.user.email}</div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium text-gray-500">Created At</h4>
                                    <div className="flex items-center">
                                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                                        <span>{formatDate(transaction.created_at)}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-500">
                                        <Clock className="h-3 w-3 text-gray-400 mr-1" />
                                        <span>{formatTime(transaction.created_at)}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <Link
                                        to={`/admin/inventory/products/${transaction.product_id}`}
                                        className="block w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 mb-3"
                                    >
                                        View Product Details
                                    </Link>

                                    <Link
                                        to={`/admin/inventory/locations/${transaction.location_id}`}
                                        className="block w-full text-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        View Location Details
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12">
                    <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Transaction Not Found</h3>
                    <p className="text-gray-500 mb-6">
                        The transaction you're looking for doesn't exist or you don't have permission to view it.
                    </p>
                    <button
                        onClick={() => navigate('/admin/inventory/transactions')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Transactions
                    </button>
                </div>
            )}
        </div>
    );
};

export default TransactionDetails;