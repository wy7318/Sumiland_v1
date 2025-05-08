import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    X, Save, Building, AlertCircle, Layers
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

type CreateOrganizationModalProps = {
    onClose: () => void;
    onSuccess: () => void;
    onError: (message: string) => void;
    currentUserId: string;
};

type NewOrganization = {
    name: string;
    website_url: string;
    status: string;
    type: string;
    timezone: string;
    license_limit: string;
    license_contract_start_date: string;
    license_contract_end_date: string;
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

const defaultModules = {
    module_accounts: true,
    module_contacts: true,
    module_leads: true,
    module_cases: false,
    module_opportunities: true,
    module_quotes: false,
    module_orders: false,
    module_tasks: true,
    module_purchase_orders: false,
    module_work_orders: false,
    module_inventories: false,
    module_blog: false,
    module_portfolio: false,
    module_reports: true,
    module_sales_assistant: false,
    module_products: false,
    module_user_management: true,
    module_org_management: false
};

export function CreateOrganizationModal({
    onClose,
    onSuccess,
    onError,
    currentUserId
}: CreateOrganizationModalProps) {
    const [formData, setFormData] = useState<NewOrganization>({
        name: '',
        website_url: '',
        status: 'active',
        type: 'customer',
        timezone: 'UTC',
        license_limit: '',
        license_contract_start_date: '',
        license_contract_end_date: '',
        ...defaultModules
    });

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'modules'>('details');
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

        // Clear validation error for this field if it exists
        if (validationErrors[name]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        // Required fields
        if (!formData.name.trim()) {
            errors.name = 'Organization name is required';
        }

        if (!formData.status) {
            errors.status = 'Status is required';
        }

        if (!formData.type) {
            errors.type = 'Type is required';
        }

        // Validate license dates
        if (formData.license_contract_start_date && formData.license_contract_end_date) {
            const startDate = new Date(formData.license_contract_start_date);
            const endDate = new Date(formData.license_contract_end_date);

            if (endDate < startDate) {
                errors.license_contract_end_date = 'End date cannot be before start date';
            }
        }

        // License limit should be a number if provided
        if (formData.license_limit && isNaN(Number(formData.license_limit))) {
            errors.license_limit = 'License limit must be a number';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);

            // Format the data for insertion
            const organizationData = {
                ...formData,
                license_limit: formData.license_limit ? Number(formData.license_limit) : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: currentUserId,
                updated_by: currentUserId
            };

            // Insert the new organization
            const { data, error } = await supabase
                .from('organizations')
                .insert(organizationData)
                .select('id')
                .single();

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error creating organization:', err);
            onError(err instanceof Error ? err.message : 'Failed to create organization');
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
                className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white">
                            <Building className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-800">Create New Organization</h2>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
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

                        <div className="p-4 mt-6">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
                                    <div>
                                        <p className="font-medium mb-1">Important</p>
                                        <p>Creating a new organization will not automatically add any users to it. You will need to add users separately after the organization is created.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main content area */}
                    <div className="flex-1 overflow-auto p-6">
                        <form onSubmit={handleSubmit}>
                            {/* Organization Details */}
                            {activeTab === 'details' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-medium text-gray-800 mb-4">Organization Details</h3>

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
                                                className={cn(
                                                    "w-full rounded-lg border px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                                                    validationErrors.name ? "border-red-300" : "border-gray-300"
                                                )}
                                                required
                                            />
                                            {validationErrors.name && (
                                                <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 mb-1">
                                                Website URL
                                            </label>
                                            <input
                                                type="url"
                                                id="website_url"
                                                name="website_url"
                                                value={formData.website_url}
                                                onChange={handleInputChange}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                                Status <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                id="status"
                                                name="status"
                                                value={formData.status}
                                                onChange={handleInputChange}
                                                className={cn(
                                                    "w-full rounded-lg border px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                                                    validationErrors.status ? "border-red-300" : "border-gray-300"
                                                )}
                                                required
                                            >
                                                <option value="">Select Status</option>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="suspended">Suspended</option>
                                            </select>
                                            {validationErrors.status && (
                                                <p className="mt-1 text-sm text-red-600">{validationErrors.status}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                                                Type <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                id="type"
                                                name="type"
                                                value={formData.type}
                                                onChange={handleInputChange}
                                                className={cn(
                                                    "w-full rounded-lg border px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                                                    validationErrors.type ? "border-red-300" : "border-gray-300"
                                                )}
                                                required
                                            >
                                                <option value="">Select Type</option>
                                                <option value="customer">Customer</option>
                                                <option value="partner">Partner</option>
                                                <option value="vendor">Vendor</option>
                                                <option value="other">Other</option>
                                            </select>
                                            {validationErrors.type && (
                                                <p className="mt-1 text-sm text-red-600">{validationErrors.type}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                                                Timezone
                                            </label>
                                            <select
                                                id="timezone"
                                                name="timezone"
                                                value={formData.timezone}
                                                onChange={handleInputChange}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            >
                                                <option value="">Select Timezone</option>
                                                {timezones.map(tz => (
                                                    <option key={tz} value={tz}>{tz}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-medium text-gray-800 mt-8 mb-4">License Information</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="license_limit" className="block text-sm font-medium text-gray-700 mb-1">
                                                License Limit (Users)
                                            </label>
                                            <input
                                                type="text"
                                                id="license_limit"
                                                name="license_limit"
                                                value={formData.license_limit}
                                                onChange={handleInputChange}
                                                placeholder="Leave blank for unlimited"
                                                className={cn(
                                                    "w-full rounded-lg border px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                                                    validationErrors.license_limit ? "border-red-300" : "border-gray-300"
                                                )}
                                            />
                                            {validationErrors.license_limit ? (
                                                <p className="mt-1 text-sm text-red-600">{validationErrors.license_limit}</p>
                                            ) : (
                                                <p className="mt-1 text-xs text-gray-500">Leave blank for unlimited users</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="license_contract_start_date" className="block text-sm font-medium text-gray-700 mb-1">
                                                Contract Start Date
                                            </label>
                                            <input
                                                type="date"
                                                id="license_contract_start_date"
                                                name="license_contract_start_date"
                                                value={formData.license_contract_start_date}
                                                onChange={handleInputChange}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                                                value={formData.license_contract_end_date}
                                                onChange={handleInputChange}
                                                className={cn(
                                                    "w-full rounded-lg border px-4 py-2.5 text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                                                    validationErrors.license_contract_end_date ? "border-red-300" : "border-gray-300"
                                                )}
                                            />
                                            {validationErrors.license_contract_end_date && (
                                                <p className="mt-1 text-sm text-red-600">{validationErrors.license_contract_end_date}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modules */}
                            {activeTab === 'modules' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-medium text-gray-800">Available Modules</h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    // Enable all modules
                                                    const allEnabled = Object.keys(defaultModules).reduce((acc, key) => {
                                                        acc[key] = true;
                                                        return acc;
                                                    }, {} as Record<string, boolean>);
                                                    setFormData(prev => ({ ...prev, ...allEnabled }));
                                                }}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                                            >
                                                Enable All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    // Disable all modules
                                                    const allDisabled = Object.keys(defaultModules).reduce((acc, key) => {
                                                        acc[key] = false;
                                                        return acc;
                                                    }, {} as Record<string, boolean>);
                                                    setFormData(prev => ({ ...prev, ...allDisabled }));
                                                }}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                                            >
                                                Disable All
                                            </button>
                                        </div>
                                    </div>

                                    <p className="text-gray-500 text-sm mb-4">
                                        Select modules that will be available to this organization
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <ModuleToggle
                                            name="module_accounts"
                                            label="Accounts"
                                            checked={formData.module_accounts}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_contacts"
                                            label="Contacts"
                                            checked={formData.module_contacts}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_leads"
                                            label="Leads"
                                            checked={formData.module_leads}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_cases"
                                            label="Cases"
                                            checked={formData.module_cases}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_opportunities"
                                            label="Opportunities"
                                            checked={formData.module_opportunities}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_quotes"
                                            label="Quotes"
                                            checked={formData.module_quotes}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_orders"
                                            label="Orders"
                                            checked={formData.module_orders}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_tasks"
                                            label="Tasks"
                                            checked={formData.module_tasks}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_purchase_orders"
                                            label="Purchase Orders"
                                            checked={formData.module_purchase_orders}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_work_orders"
                                            label="Work Orders"
                                            checked={formData.module_work_orders}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_inventories"
                                            label="Inventory"
                                            checked={formData.module_inventories}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_products"
                                            label="Products"
                                            checked={formData.module_products}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_blog"
                                            label="Blog"
                                            checked={formData.module_blog}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_portfolio"
                                            label="Portfolio"
                                            checked={formData.module_portfolio}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_reports"
                                            label="Reports"
                                            checked={formData.module_reports}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_sales_assistant"
                                            label="Sales Assistant"
                                            checked={formData.module_sales_assistant}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_user_management"
                                            label="User Management"
                                            checked={formData.module_user_management}
                                            onChange={handleInputChange}
                                        />
                                        <ModuleToggle
                                            name="module_org_management"
                                            label="Organization Management"
                                            checked={formData.module_org_management}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-5 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                                <span>Creating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                <span>Create Organization</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// Helper component
function ModuleToggle({
    name,
    label,
    checked,
    onChange
}: {
    name: string;
    label: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className={cn(
            "p-4 rounded-lg border transition-colors",
            checked
                ? "border-primary-200 bg-primary-50"
                : "border-gray-200 bg-gray-50",
            "hover:border-primary-300"
        )}>
            <label className="flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    name={name}
                    checked={checked}
                    onChange={onChange}
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