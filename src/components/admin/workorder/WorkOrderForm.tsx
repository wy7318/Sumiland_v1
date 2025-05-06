import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
    ArrowLeft, Calendar, Layers, Save, Package,
    MapPin, AlertCircle, X, ShoppingBag, Clock,
    CheckCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { UserSearch } from '../UserSearch';
import { LocationSearch } from '../LocationSearch';
import { OrderSearch } from '../OrderSearch';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { useAuth } from '../../../contexts/AuthContext';

type PicklistValue = {
    id: string;
    value: string;
    label: string;
    is_default: boolean;
    is_active: boolean;
    color: string | null;
    text_color: string | null;
};

export function WorkOrderForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const isEditMode = !!id;

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'draft',
        priority: 'medium',
        scheduled_start_date: '',
        scheduled_end_date: '',
        actual_start_date: '',
        actual_end_date: '',
        location_id: '',
        assigned_to: '',
        notes: '',
        order_id: ''
    });

    // Related data state
    const [order, setOrder] = useState<any>(null);
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [assignee, setAssignee] = useState<any>(null);

    // UI state
    const [loading, setLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [workOrderStatuses, setWorkOrderStatuses] = useState<PicklistValue[]>([]);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Load work order data if in edit mode
    useEffect(() => {
        if (isEditMode) {
            fetchWorkOrder();
        } else {
            // For new work orders, check if there's state passed (e.g., from an order)
            const passedState = location.state;
            if (passedState?.orderData) {
                const { orderData } = passedState;
                setFormData(prev => ({
                    ...prev,
                    order_id: orderData.order_id,
                    title: `Work Order for Order #${orderData.order_number}`
                }));
                fetchOrder(orderData.order_id);
            }
        }

        fetchPicklists();
    }, [id, location.state]);

    // Fetch picklists for dropdowns
    const fetchPicklists = async () => {
        try {
            // For demo, using hardcoded statuses. In production, this would come from your picklist_values table
            setWorkOrderStatuses([
                { id: '1', value: 'draft', label: 'Draft', is_default: true, is_active: true, color: '#E5E7EB', text_color: '#374151' },
                { id: '2', value: 'scheduled', label: 'Scheduled', is_default: false, is_active: true, color: '#DBEAFE', text_color: '#1E40AF' },
                { id: '3', value: 'in_progress', label: 'In Progress', is_default: false, is_active: true, color: '#FEF3C7', text_color: '#92400E' },
                { id: '4', value: 'completed', label: 'Completed', is_default: false, is_active: true, color: '#D1FAE5', text_color: '#065F46' },
                { id: '5', value: 'cancelled', label: 'Cancelled', is_default: false, is_active: true, color: '#FEE2E2', text_color: '#B91C1C' }
            ]);

            // In real implementation, fetch from Supabase:
            /*
            const { data: statusData, error: statusError } = await supabase
              .from('picklist_values')
              .select('id, value, label, is_default, is_active, color, text_color')
              .eq('type', 'work_order_status')
              .eq('is_active', true)
              .eq('organization_id', selectedOrganization?.id)
              .order('display_order', { ascending: true });
      
            if (statusError) throw statusError;
            setWorkOrderStatuses(statusData || []);
            */
        } catch (err) {
            console.error('Error fetching picklists:', err);
            setError('Failed to load picklist values');
        }
    };

    // Fetch work order data for editing
    const fetchWorkOrder = async () => {
        try {
            setLoading(true);
            if (!id) return;

            // First, fetch the work order without the profile join
            const { data: workOrder, error } = await supabase
                .from('work_orders')
                .select(`
                *,
                location:locations(name, address),
                order:order_hdr(order_id, order_number, customer_id)
            `)
                .eq('id', id)
                .single();

            if (error) throw error;

            if (workOrder) {
                // Fetch the profile separately if there's an assigned_to
                if (workOrder.assigned_to) {
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('id, name')
                        .eq('id', workOrder.assigned_to)
                        .single();

                    if (!profileError && profileData) {
                        // Add the profile data to the workOrder object
                        workOrder.assignee = profileData;
                    }
                }

                // Convert date strings to proper format for date inputs
                const formatDateForInput = (dateString: string | null) => {
                    if (!dateString) return '';
                    return new Date(dateString).toISOString().split('T')[0];
                };

                setFormData({
                    title: workOrder.title,
                    description: workOrder.description || '',
                    status: workOrder.status,
                    priority: workOrder.priority,
                    scheduled_start_date: formatDateForInput(workOrder.scheduled_start_date),
                    scheduled_end_date: formatDateForInput(workOrder.scheduled_end_date),
                    actual_start_date: formatDateForInput(workOrder.actual_start_date),
                    actual_end_date: formatDateForInput(workOrder.actual_end_date),
                    location_id: workOrder.location_id || '',
                    assigned_to: workOrder.assigned_to || '',
                    notes: workOrder.notes || '',
                    order_id: workOrder.order_id || ''
                });

                // Set related entities
                if (workOrder.assignee) {
                    setAssignee(workOrder.assignee);
                }
                if (workOrder.location) {
                    setSelectedLocation(workOrder.location);
                }
                if (workOrder.order) {
                    setOrder({
                        id: workOrder.order.order_id,
                        order_number: workOrder.order.order_number
                    });
                }
            }
        } catch (err) {
            console.error('Error fetching work order:', err);
            setError(err instanceof Error ? err.message : 'Failed to load work order');
        } finally {
            setLoading(false);
        }
    };

    // Fetch order details
    const fetchOrder = async (orderId: string) => {
        try {
            if (!orderId) return;

            const { data, error } = await supabase
                .from('order_hdr')
                .select('order_id, order_number, customer_id')
                .eq('order_id', orderId)
                .single();

            if (error) throw error;

            if (data) {
                setOrder({
                    id: data.order_id,
                    order_number: data.order_number
                });
            }
        } catch (err) {
            console.error('Error fetching order:', err);
        }
    };

    // Handle form field changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle location selection
    const handleLocationSelect = (locationId: string, locationData: any) => {
        setFormData(prev => ({
            ...prev,
            location_id: locationId
        }));
        setSelectedLocation(locationData);
    };

    // Handle assignee selection
    const handleAssigneeSelect = (userId: string, userData: any) => {
        setFormData(prev => ({
            ...prev,
            assigned_to: userId
        }));
        setAssignee(userData);
    };

    // Handle order selection
    const handleOrderSelect = (orderId: string, orderData: any) => {
        setFormData(prev => ({
            ...prev,
            order_id: orderId
        }));
        setOrder(orderData);
    };

    // Save the work order
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error('Not authenticated');

            // Prepare data for saving
            const workOrderData = {
                ...formData,
                organization_id: selectedOrganization?.id,
                updated_at: new Date().toISOString(),
                updated_by: userData.user.id
            };

            // Convert empty strings to null for date fields and foreign keys
            ['scheduled_start_date', 'scheduled_end_date', 'actual_start_date', 'actual_end_date',
                'order_id', 'location_id', 'assigned_to'].forEach(field => {
                    if (workOrderData[field as keyof typeof workOrderData] === '') {
                        workOrderData[field as keyof typeof workOrderData] = null;
                    }
                });

            let result;

            if (isEditMode) {
                // Update existing work order
                result = await supabase
                    .from('work_orders')
                    .update(workOrderData)
                    .eq('id', id);
            } else {
                // Create new work order
                // Add a work order number if creating new
                const workOrderNumber = `WO-${Date.now().toString().slice(-6)}`;

                result = await supabase
                    .from('work_orders')
                    .insert([{
                        ...workOrderData,
                        work_order_number: workOrderNumber, // Generate a work order number
                        created_at: new Date().toISOString(),
                        created_by: userData.user.id
                    }])
                    .select();
            }

            if (result.error) throw result.error;

            setSuccessMessage(isEditMode
                ? 'Work order updated successfully'
                : 'Work order created successfully');

            // Redirect to the work order list after a short delay
            setTimeout(() => {
                if (!isEditMode && result.data?.[0]?.id) {
                    navigate(`/admin/work-orders/${result.data[0].id}`);
                } else {
                    navigate('/admin/work-orders');
                }
            }, 1500);
        } catch (err) {
            console.error('Error saving work order:', err);
            setError(err instanceof Error ? err.message : 'Failed to save work order');
        } finally {
            setSaveLoading(false);
        }
    };

    // Get style for status badge
    const getStatusStyle = (status: string) => {
        const statusValue = workOrderStatuses.find(s => s.value === status);
        if (!statusValue?.color) return {};
        return {
            backgroundColor: statusValue.color,
            color: statusValue.text_color || '#FFFFFF'
        };
    };

    // Get priority style
    const getPriorityStyle = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'low':
                return { backgroundColor: '#E8F5E9', color: '#2E7D32' };
            case 'medium':
                return { backgroundColor: '#FFF8E1', color: '#F57F17' };
            case 'high':
                return { backgroundColor: '#FFEBEE', color: '#C62828' };
            case 'urgent':
                return { backgroundColor: '#B71C1C', color: '#FFFFFF' };
            default:
                return { backgroundColor: '#E3F2FD', color: '#1565C0' };
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="px-4 py-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => navigate('/admin/work-orders')}
                    className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    <span>Back to Work Orders</span>
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditMode ? 'Edit Work Order' : 'Create Work Order'}
                </h1>
            </div>

            {/* Error and Success Messages */}
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center mb-6 border border-red-100">
                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="bg-green-50 text-green-600 p-4 rounded-xl flex items-center mb-6 border border-green-100">
                    <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                            <Layers className="w-5 h-5 text-indigo-500 mr-2" />
                            Work Order Details
                        </h2>

                        <div className="grid grid-cols-1 gap-6 mb-6">
                            {/* Title */}
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                    Work Order Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="title"
                                    name="title"
                                    type="text"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                    placeholder="Enter work order title"
                                />
                            </div>

                            {/* Status and Priority */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                        Status <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="status"
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                        style={getStatusStyle(formData.status)}
                                    >
                                        {workOrderStatuses.map(status => (
                                            <option key={status.id} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                                        Priority <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="priority"
                                        name="priority"
                                        value={formData.priority}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                        style={getPriorityStyle(formData.priority)}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                    placeholder="Describe the work order"
                                />
                            </div>

                            {/* Order Reference */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Related Order
                                </label>
                                <div className="relative">
                                    <OrderSearch
                                        organizationId={selectedOrganization?.id || ''}
                                        selectedOrderId={formData.order_id}
                                        onSelect={handleOrderSelect}
                                    />

                                    {order && (
                                        <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                                            <div className="flex items-center">
                                                <ShoppingBag className="w-5 h-5 text-indigo-500 mr-2" />
                                                <span className="font-medium">Order #{order.order_number}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, order_id: '' }));
                                                    setOrder(null);
                                                }}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Location Section */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                            <MapPin className="w-5 h-5 text-indigo-500 mr-2" />
                            Work Location
                        </h2>

                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Location
                                </label>
                                <div className="relative">
                                    <LocationSearch
                                        organizationId={selectedOrganization?.id || ''}
                                        selectedLocationId={formData.location_id}
                                        onSelect={handleLocationSelect}
                                    />

                                    {selectedLocation && (
                                        <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                                            <div>
                                                <div className="font-medium">{selectedLocation.name}</div>
                                                {selectedLocation.address && (
                                                    <div className="text-sm text-gray-500">{selectedLocation.address}</div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, location_id: '' }));
                                                    setSelectedLocation(null); // Fixed: was incorrectly using selectedLocation as a function
                                                }}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scheduling Section */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                            <Calendar className="w-5 h-5 text-indigo-500 mr-2" />
                            Scheduling
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Scheduled Dates */}
                            <div>
                                <label htmlFor="scheduled_start_date" className="block text-sm font-medium text-gray-700 mb-1">
                                    Scheduled Start Date
                                </label>
                                <input
                                    id="scheduled_start_date"
                                    name="scheduled_start_date"
                                    type="date"
                                    value={formData.scheduled_start_date}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label htmlFor="scheduled_end_date" className="block text-sm font-medium text-gray-700 mb-1">
                                    Scheduled End Date
                                </label>
                                <input
                                    id="scheduled_end_date"
                                    name="scheduled_end_date"
                                    type="date"
                                    value={formData.scheduled_end_date}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                />
                            </div>
                        </div>

                        {/* Actual Dates (typically only used in edit mode) */}
                        {isEditMode && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                                <div>
                                    <label htmlFor="actual_start_date" className="block text-sm font-medium text-gray-700 mb-1">
                                        Actual Start Date
                                    </label>
                                    <div className="flex items-center">
                                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                                        <input
                                            id="actual_start_date"
                                            name="actual_start_date"
                                            type="date"
                                            value={formData.actual_start_date}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="actual_end_date" className="block text-sm font-medium text-gray-700 mb-1">
                                        Actual End Date
                                    </label>
                                    <div className="flex items-center">
                                        <CheckCircle className="w-4 h-4 text-gray-400 mr-2" />
                                        <input
                                            id="actual_end_date"
                                            name="actual_end_date"
                                            type="date"
                                            value={formData.actual_end_date}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Assignment Section */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                            <Package className="w-5 h-5 text-indigo-500 mr-2" />
                            Assignment
                        </h2>

                        <div className="grid grid-cols-1 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Assigned To
                                </label>
                                <UserSearch
                                    organizationId={selectedOrganization?.id || ''}
                                    selectedUserId={formData.assigned_to}
                                    onSelect={handleAssigneeSelect}
                                />
                            </div>

                            <div>
                                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                    placeholder="Additional notes for assignee"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/work-orders')}
                        className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saveLoading}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                    >
                        {saveLoading ? (
                            <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Work Order
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}