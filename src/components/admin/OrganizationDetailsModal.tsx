import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    X, Edit, Check, Save, Building, Globe, MapPin,
    Calendar, Clock, User, CheckCircle, XCircle, AlertCircle,
    Layers, FileText, Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type Organization = {
    id: string;
    name: string;
    website_url: string | null;
    billing_address_line1: string | null;
    billing_address_line2: string | null;
    billing_city: string | null;
    billing_state: string | null;
    billing_zip_code: string | null;
    billing_country: string | null;
    shipping_address_line1: string | null;
    shipping_address_line2: string | null;
    shipping_city: string | null;
    shipping_state: string | null;
    shipping_zip_code: string | null;
    shipping_country: string | null;
    status: string | null;
    type: string | null;
    created_at: string;
    created_by: string | null;
    updated_at: string;
    updated_by: string | null;
    timezone: string | null;
    license_limit: number | null;
    license_contract_start_date: string | null;
    license_contract_end_date: string | null;
    // Module flags
    module_accounts: boolean;
    module_contacts: boolean;
    module_leads: boolean;
    module_cases: boolean;
    module_opportunities: boolean;
    module_quotes: boolean;
    module_orders: boolean;
    module_tasks: boolean;
    module_purchase_orders: boolean;
    module_work_orders: boolean;
    module_inventories: boolean;
    module_blog: boolean;
    module_portfolio: boolean;
    module_reports: boolean;
    module_sales_assistant: boolean;
    module_products: boolean;
    module_user_management: boolean;
    module_org_management: boolean;
};

type OrganizationDetailsModalProps = {
    organization: Organization;
    mode: 'view' | 'edit';
    onClose: () => void;
    onModeChange: (mode: 'view' | 'edit') => void;
    onUpdate: (updates: Partial<Organization>) => Promise<void>;
    onSuccess: () => void;
    onError: (message: string) => void;
};

const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Australia/Sydney',
    // Add more common timezones as needed
];

export function OrganizationDetailsModal({
    organization,
    mode,
    onClose,
    onModeChange,
    onUpdate,
    onSuccess,
    onError
}: OrganizationDetailsModalProps) {
    const { user } = useAuth();
    const [formData, setFormData] = useState<Organization>({ ...organization });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'address' | 'license' | 'modules'>('details');
    const [sameAsShipping, setSameAsShipping] = useState(false);
    const [createdByUser, setCreatedByUser] = useState<{ name: string } | null>(null);
    const [updatedByUser, setUpdatedByUser] = useState<{ name: string } | null>(null);

    useEffect(() => {
        const fetchUserDetails = async () => {
            if (organization.created_by) {
                const { data: createdBy, error: createdError } = await supabase
                    .from('profiles')
                    .select('name')
                    .eq('id', organization.created_by)
                    .single();

                if (!createdError && createdBy) {
                    setCreatedByUser(createdBy);
                }
            }

            if (organization.updated_by) {
                const { data: updatedBy, error: updatedError } = await supabase
                    .from('profiles')
                    .select('name')
                    .eq('id', organization.updated_by)
                    .single();

                if (!updatedError && updatedBy) {
                    setUpdatedByUser(updatedBy);
                }
            }
        };

        fetchUserDetails();
    }, [organization]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        // Handle checkbox inputs
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({
                ...prev,
                [name]: checked
            }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddressCopy = () => {
        if (sameAsShipping) {
            // Copy shipping to billing
            setFormData(prev => ({
                ...prev,
                billing_address_line1: prev.shipping_address_line1,
                billing_address_line2: prev.shipping_address_line2,
                billing_city: prev.shipping_city,
                billing_state: prev.shipping_state,
                billing_zip_code: prev.shipping_zip_code,
                billing_country: prev.shipping_country
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setLoading(true);

            const requiredFields = [
                'name',
                'status',
                'type'
            ];

            const missingFields = requiredFields.filter(field => !formData[field as keyof Organization]);

            if (missingFields.length > 0) {
                throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
            }

            // Check for license dates validity
            if (formData.license_contract_start_date && formData.license_contract_end_date) {
                const startDate = new Date(formData.license_contract_start_date);
                const endDate = new Date(formData.license_contract_end_date);

                if (endDate < startDate) {
                    throw new Error('License end date cannot be before the start date');
                }
            }

            // Handle license limit conversions
            const processedData = {
                ...formData,
                license_limit: formData.license_limit ? Number(formData.license_limit) : null
            };

            await onUpdate(processedData);
            onSuccess();
            onModeChange('view');
        } catch (err) {
            console.error('Error updating organization:', err);
            onError(err instanceof Error ? err.message : 'Failed to update organization');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white">
                            <span className="font-medium">
                                {organization.name?.charAt(0).toUpperCase() ?? 'O'}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800">
                                {mode === 'view' ? 'Organization Details' : 'Edit Organization'}
                            </h2>
                            <p className="text-sm text-gray-500">{organization.name}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {mode === 'view' ? (
                            <button
                                onClick={() => onModeChange('edit')}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                            >
                                <Edit className="w-4 h-4" />
                                <span>Edit</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-70"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        <span>Save</span>
                                    </>
                                )}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row h-[calc(90vh-70px)]">
                    {/* Left sidebar / tabs */}
                    <div className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50">
                        <div className="p-4">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={cn(
                                    "flex items-center gap-3 w-full px-4 py-3 text-left rounded-lg mb-1 transition-colors",
                                    activeTab === 'details'
                                        ? "bg-primary-50 text-primary-600 font-medium"
                                        : "text-gray-700 hover:bg-gray-100"
                                )}
                            >
                                <Building className="w-5 h-5" />
                                <span>Organization Details</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('address')}
                                className={cn(
                                    "flex items-center gap-3 w-full px-4 py-3 text-left rounded-lg mb-1 transition-colors",
                                    activeTab === 'address'
                                        ? "bg-primary-50 text-primary-600 font-medium"
                                        : "text-gray-700 hover:bg-gray-100"
                                )}
                            >
                                <MapPin className="w-5 h-5" />
                                <span>Address Information</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('license')}
                                className={cn(
                                    "flex items-center gap-3 w-full px-4 py-3 text-left rounded-lg mb-1 transition-colors",
                                    activeTab === 'license'
                                        ? "bg-primary-50 text-primary-600 font-medium"
                                        : "text-gray-700 hover:bg-gray-100"
                                )}
                            >
                                <FileText className="w-5 h-5" />
                                <span>License & Contracts</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('modules')}
                                className={cn(
                                    "flex items-center gap-3 w-full px-4 py-3 text-left rounded-lg mb-1 transition-colors",
                                    activeTab === 'modules'
                                        ? "bg-primary-50 text-primary-600 font-medium"
                                        : "text-gray-700 hover:bg-gray-100"
                                )}
                            >
                                <Layers className="w-5 h-5" />
                                <span>Modules</span>
                            </button>
                        </div>

                        <div className="px-4 py-6 border-t border-gray-200">
                            <div className="text-xs font-medium uppercase text-gray-500 mb-2">Organization Info</div>

                            <div className="mb-4">
                                <div className="text-xs text-gray-500">Status</div>
                                <div className="flex items-center mt-1">
                                    <StatusBadge status={organization.status} />
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="text-xs text-gray-500">Type</div>
                                <div className="flex items-center mt-1">
                                    <span className={cn(
                                        "px-2.5 py-1 text-xs font-medium rounded-full",
                                        getTypeBadgeClass(organization.type)
                                    )}>
                                        {organization.type || 'Not Set'}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="text-xs text-gray-500">Created</div>
                                <div className="flex items-center gap-1 mt-1 text-sm text-gray-700">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    {new Date(organization.created_at).toLocaleDateString()}
                                </div>
                                {createdByUser && (
                                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                        <User className="w-3 h-3" />
                                        {createdByUser.name}
                                    </div>
                                )}
                            </div>

                            {organization.updated_at && organization.updated_at !== organization.created_at && (
                                <div className="mb-4">
                                    <div className="text-xs text-gray-500">Last Updated</div>
                                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-700">
                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                        {new Date(organization.updated_at).toLocaleDateString()}
                                    </div>
                                    {updatedByUser && (
                                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                            <User className="w-3 h-3" />
                                            {updatedByUser.name}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main content area */}
                    <div className="flex-1 overflow-auto p-6">
                        <form onSubmit={handleSubmit}>
                            {/* Organization Details */}
                            {activeTab === 'details' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-medium text-gray-800">Organization Details</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                                Organization Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                disabled={mode === 'view'}
                                                className={cn(
                                                    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                    mode === 'view' ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                )}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 mb-1">
                                                Website URL
                                            </label>
                                            <input
                                                type="url"
                                                id="website_url"
                                                name="website_url"
                                                value={formData.website_url || ''}
                                                onChange={handleInputChange}
                                                disabled={mode === 'view'}
                                                className={cn(
                                                    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                    mode === 'view' ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                )}
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                                Status <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                id="status"
                                                name="status"
                                                value={formData.status || ''}
                                                onChange={handleInputChange}
                                                disabled={mode === 'view'}
                                                className={cn(
                                                    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                    mode === 'view' ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                )}
                                                required
                                            >
                                                <option value="">Select Status</option>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="suspended">Suspended</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                                                Type <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                id="type"
                                                name="type"
                                                value={formData.type || ''}
                                                onChange={handleInputChange}
                                                disabled={mode === 'view'}
                                                className={cn(
                                                    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                    mode === 'view' ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                )}
                                                required
                                            >
                                                <option value="">Select Type</option>
                                                <option value="customer">Customer</option>
                                                <option value="partner">Partner</option>
                                                <option value="vendor">Vendor</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                                                Timezone
                                            </label>
                                            <select
                                                id="timezone"
                                                name="timezone"
                                                value={formData.timezone || ''}
                                                onChange={handleInputChange}
                                                disabled={mode === 'view'}
                                                className={cn(
                                                    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                    mode === 'view' ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                )}
                                            >
                                                <option value="">Select Timezone</option>
                                                {timezones.map(tz => (
                                                    <option key={tz} value={tz}>{tz}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Address Information */}
                            {activeTab === 'address' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-medium text-gray-800">Shipping Address</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="shipping_address_line1" className="block text-sm font-medium text-gray-700 mb-1">
                                                Address Line 1
                                            </label>
                                            <input
                                                type="text"
                                                id="shipping_address_line1"
                                                name="shipping_address_line1"
                                                value={formData.shipping_address_line1 || ''}
                                                onChange={handleInputChange}
                                                disabled={mode === 'view'}
                                                className={cn(
                                                    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                    mode === 'view' ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                )}
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="shipping_address_line2" className="block text-sm font-medium text-gray-700 mb-1">
                                                Address Line 2
                                            </label>
                                            <input
                                                type="text"
                                                id="shipping_address_line2"
                                                name="shipping_address_line2"
                                                value={formData.shipping_address_line2 || ''}
                                                onChange={handleInputChange}
                                                disabled={mode === 'view'}
                                                className={cn(
                                                    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                    mode === 'view' ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                )}
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="shipping_city" className="block text-sm font-medium text-gray-700 mb-1">
                                                City
                                            </label>
                                            <input
                                                type="text"
                                                id="shipping_city"
                                                name="shipping_city"
                                                value={formData.shipping_city || ''}
                                                onChange={handleInputChange}
                                                disabled={mode === 'view'}
                                                className={cn(
                                                    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                    mode === 'view' ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                )}
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="shipping_state" className="block text-sm font-medium text-gray-700 mb-1">
                                                State / Province
                                            </label>
                                            <input
                                                type="text"
                                                id="shipping_state"
                                                name="shipping_state"
                                                value={formData.shipping_state || ''}
                                                onChange={handleInputChange}
                                                disabled={mode === 'view'}
                                                className={cn(
                                                    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                    mode === 'view' ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                )}
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="shipping_zip_code" className="block text-sm font-medium text-gray-700 mb-1">
                                                Postal / Zip Code
                                            </label>
                                            <input
                                                type="text"
                                                id="shipping_zip_code"
                                                name="shipping_zip_code"
                                                value={formData.shipping_zip_code || ''}
                                                onChange={handleInputChange}
                                                disabled={mode === 'view'}
                                                className={cn(
                                                    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                    mode === 'view' ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                )}
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="shipping_country" className="block text-sm font-medium text-gray-700 mb-1">
                                                Country
                                            </label>
                                            <input
                                                type="text"
                                                id="shipping_country"
                                                name="shipping_country"
                                                value={formData.shipping_country || ''}
                                                onChange={handleInputChange}
                                                disabled={mode === 'view'}
                                                className={cn(
                                                    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                    mode === 'view' ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-medium text-gray-800">Billing Address</h3>

                                            {mode === 'edit' && (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id="sameAsShipping"
                                                        checked={sameAsShipping}
                                                        onChange={(e) => {
                                                            setSameAsShipping(e.target.checked);
                                                            if (e.target.checked) {
                                                                handleAddressCopy();
                                                            }
                                                        }}
                                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                    />
                                                    <label htmlFor="sameAsShipping" className="text-sm text-gray-700">
                                                        Same as shipping address
                                                    </label>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label htmlFor="billing_address_line1" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Address Line 1
                                                </label>
                                                <input
                                                    type="text"
                                                    id="billing_address_line1"
                                                    name="billing_address_line1"
                                                    value={formData.billing_address_line1 || ''}
                                                    onChange={handleInputChange}
                                                    disabled={mode === 'view' || sameAsShipping}
                                                    className={cn(
                                                        "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                        (mode === 'view' || sameAsShipping) ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                    )}
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="billing_address_line2" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Address Line 2
                                                </label>
                                                <input
                                                    type="text"
                                                    id="billing_address_line2"
                                                    name="billing_address_line2"
                                                    value={formData.billing_address_line2 || ''}
                                                    onChange={handleInputChange}
                                                    disabled={mode === 'view' || sameAsShipping}
                                                    className={cn(
                                                        "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                        (mode === 'view' || sameAsShipping) ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                    )}
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="billing_city" className="block text-sm font-medium text-gray-700 mb-1">
                                                    City
                                                </label>
                                                <input
                                                    type="text"
                                                    id="billing_city"
                                                    name="billing_city"
                                                    value={formData.billing_city || ''}
                                                    onChange={handleInputChange}
                                                    disabled={mode === 'view' || sameAsShipping}
                                                    className={cn(
                                                        "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                        (mode === 'view' || sameAsShipping) ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                    )}
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="billing_state" className="block text-sm font-medium text-gray-700 mb-1">
                                                    State / Province
                                                </label>
                                                <input
                                                    type="text"
                                                    id="billing_state"
                                                    name="billing_state"
                                                    value={formData.billing_state || ''}
                                                    onChange={handleInputChange}
                                                    disabled={mode === 'view' || sameAsShipping}
                                                    className={cn(
                                                        "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                        (mode === 'view' || sameAsShipping) ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                    )}
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="billing_zip_code" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Postal / Zip Code
                                                </label>
                                                <input
                                                    type="text"
                                                    id="billing_zip_code"
                                                    name="billing_zip_code"
                                                    value={formData.billing_zip_code || ''}
                                                    onChange={handleInputChange}
                                                    disabled={mode === 'view' || sameAsShipping}
                                                    className={cn(
                                                        "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                        (mode === 'view' || sameAsShipping) ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                    )}
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="billing_country" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Country
                                                </label>
                                                <input
                                                    type="text"
                                                    id="billing_country"
                                                    name="billing_country"
                                                    value={formData.billing_country || ''}
                                                    onChange={handleInputChange}
                                                    disabled={mode === 'view' || sameAsShipping}
                                                    className={cn(
                                                        "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                        (mode === 'view' || sameAsShipping) ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* License & Contracts */}
                            {activeTab === 'license' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-medium text-gray-800">License & Contract Information</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="license_limit" className="block text-sm font-medium text-gray-700 mb-1">
                                                License Limit (Users)
                                            </label>
                                            <input
                                                type="number"
                                                id="license_limit"
                                                name="license_limit"
                                                value={formData.license_limit === null ? '' : formData.license_limit}
                                                onChange={handleInputChange}
                                                disabled={mode === 'view'}
                                                min="0"
                                                placeholder="Unlimited if blank"
                                                className={cn(
                                                    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                    mode === 'view' ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                )}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Leave blank for unlimited users</p>
                                        </div>

                                        <div>
                                            <label htmlFor="license_contract_start_date" className="block text-sm font-medium text-gray-700 mb-1">
                                                Contract Start Date
                                            </label>
                                            <input
                                                type="date"
                                                id="license_contract_start_date"
                                                name="license_contract_start_date"
                                                value={formData.license_contract_start_date?.substring(0, 10) || ''}
                                                onChange={handleInputChange}
                                                disabled={mode === 'view'}
                                                className={cn(
                                                    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                    mode === 'view' ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                )}
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="license_contract_end_date" className="block text-sm font-medium text-gray-700 mb-1">
                                                Contract End Date
                                            </label>
                                            <input
                                                type="date"
                                                id="license_contract_end_date"
                                                name="license_contract_end_date"
                                                value={formData.license_contract_end_date?.substring(0, 10) || ''}
                                                onChange={handleInputChange}
                                                disabled={mode === 'view'}
                                                className={cn(
                                                    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700",
                                                    mode === 'view' ? "bg-gray-50" : "focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {mode === 'view' && formData.license_contract_start_date && formData.license_contract_end_date && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Contract Status</h4>
                                            <ContractStatusBadge
                                                startDate={formData.license_contract_start_date}
                                                endDate={formData.license_contract_end_date}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modules */}
                            {activeTab === 'modules' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-medium text-gray-800">Available Modules</h3>
                                    <p className="text-gray-500 text-sm mb-4">
                                        {mode === 'view'
                                            ? 'Enabled modules for this organization'
                                            : 'Toggle modules available to this organization'}
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <ModuleToggle
                                            name="module_accounts"
                                            label="Accounts"
                                            checked={formData.module_accounts}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_contacts"
                                            label="Contacts"
                                            checked={formData.module_contacts}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_leads"
                                            label="Leads"
                                            checked={formData.module_leads}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_cases"
                                            label="Cases"
                                            checked={formData.module_cases}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_opportunities"
                                            label="Opportunities"
                                            checked={formData.module_opportunities}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_quotes"
                                            label="Quotes"
                                            checked={formData.module_quotes}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_orders"
                                            label="Orders"
                                            checked={formData.module_orders}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_tasks"
                                            label="Tasks"
                                            checked={formData.module_tasks}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_purchase_orders"
                                            label="Purchase Orders"
                                            checked={formData.module_purchase_orders}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_work_orders"
                                            label="Work Orders"
                                            checked={formData.module_work_orders}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_inventories"
                                            label="Inventory"
                                            checked={formData.module_inventories}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_products"
                                            label="Products"
                                            checked={formData.module_products}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_blog"
                                            label="Blog"
                                            checked={formData.module_blog}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_portfolio"
                                            label="Portfolio"
                                            checked={formData.module_portfolio}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_reports"
                                            label="Reports"
                                            checked={formData.module_reports}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_sales_assistant"
                                            label="Sales Assistant"
                                            checked={formData.module_sales_assistant}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_user_management"
                                            label="User Management"
                                            checked={formData.module_user_management}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                        <ModuleToggle
                                            name="module_org_management"
                                            label="Organization Management"
                                            checked={formData.module_org_management}
                                            onChange={handleInputChange}
                                            disabled={mode === 'view'}
                                        />
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// Helper components
function StatusBadge({ status }: { status: string | null }) {
    let bgClass = "bg-gray-100 text-gray-800";
    let Icon = Clock;

    switch (status?.toLowerCase()) {
        case 'active':
            bgClass = "bg-green-100 text-green-800";
            Icon = CheckCircle;
            break;
        case 'inactive':
            bgClass = "bg-gray-100 text-gray-800";
            Icon = XCircle;
            break;
        case 'suspended':
            bgClass = "bg-red-100 text-red-800";
            Icon = AlertCircle;
            break;
    }

    return (
        <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1.5", bgClass)}>
            <Icon className="w-3.5 h-3.5" />
            <span className="capitalize">{status || 'Not Set'}</span>
        </span>
    );
}

function getTypeBadgeClass(type: string | null): string {
    switch (type?.toLowerCase()) {
        case 'customer':
            return "bg-blue-100 text-blue-800";
        case 'partner':
            return "bg-purple-100 text-purple-800";
        case 'vendor':
            return "bg-amber-100 text-amber-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
}

function ContractStatusBadge({ startDate, endDate }: { startDate: string, endDate: string }) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (now < start) {
        return (
            <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    Pending
                </span>
                <span className="text-sm text-gray-500">
                    Contract starts on {start.toLocaleDateString()}
                </span>
            </div>
        );
    }

    if (now > end) {
        return (
            <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                    Expired
                </span>
                <span className="text-sm text-gray-500">
                    Contract ended on {end.toLocaleDateString()}
                </span>
            </div>
        );
    }

    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let statusClass = "bg-green-100 text-green-800";
    let statusText = "Active";

    if (daysLeft <= 30) {
        statusClass = "bg-amber-100 text-amber-800";
        statusText = "Expiring Soon";
    }

    return (
        <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusClass}`}>
                {statusText}
            </span>
            <span className="text-sm text-gray-500">
                {daysLeft} days remaining (ends {end.toLocaleDateString()})
            </span>
        </div>
    );
}

function ModuleToggle({
    name,
    label,
    checked,
    onChange,
    disabled
}: {
    name: string;
    label: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled: boolean;
}) {
    return (
        <div className={cn(
            "p-4 rounded-lg border transition-colors",
            checked
                ? "border-primary-200 bg-primary-50"
                : "border-gray-200 bg-gray-50",
            disabled ? "opacity-70" : "hover:border-primary-300"
        )}>
            <label className="flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    name={name}
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                    className="sr-only"
                />
                <div className={cn(
                    "w-10 h-6 rounded-full p-1 transition-colors mr-3",
                    checked ? "bg-primary-600" : "bg-gray-300"
                )}>
                    <div className={cn(
                        "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform",
                        checked ? "translate-x-4" : "translate-x-0"
                    )}></div>
                </div>
                <span className="text-sm font-medium text-gray-700">{label}</span>
            </label>
        </div>
    );
}