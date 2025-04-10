import { useState, useEffect } from 'react';
import {
    Plus, Search, Building2, Mail, Phone, User,
    Edit, Trash2, AlertCircle, FileDown, Filter,
    ChevronDown, ChevronUp, Eye, Users, Briefcase, Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { useOrganization } from '../../contexts/OrganizationContext';

type PicklistValue = {
    id: string;
    value: string;
    label: string;
    is_default: boolean;
    is_active: boolean;
    color: string | null;
    text_color: string | null;
};

type Vendor = {
    id: string;
    name: string;
    type: string;
    customer_id: string | null;
    status: string;
    payment_terms: string | null;
    notes: string | null;
    created_at: string;
    organization_id: string;
    owner_id: string | null;
    parent_id: string | null;
    annual_revenue: number | null;
    website: string | null;
    customer: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string | null;
        company: string | null;
    } | null;
    owner: {
        id: string;
        name: string;
    } | null;
    shipping_address_line1: string | null;
    shipping_city: string | null;
    shipping_state: string | null;
    shipping_country: string | null;
};

type SortConfig = {
    key: keyof Vendor | 'customer.name' | 'owner.name';
    direction: 'asc' | 'desc';
};

export function VendorsPage() {
    const { organizations } = useAuth();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const { selectedOrganization } = useOrganization();
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        key: 'created_at',
        direction: 'desc'
    });
    const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
    const [accountTypes, setAccountTypes] = useState<PicklistValue[]>([]);
    const [accountStatuses, setAccountStatuses] = useState<PicklistValue[]>([]);
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    useEffect(() => {
        fetchPicklists();
        fetchVendors();
    }, [selectedOrganization]);

    // Fetch picklist values for account_type and account_status
    const fetchPicklists = async () => {
        try {
            // Fetch account types
            const { data: typeData, error: typeError } = await supabase
                .from('picklist_values')
                .select('id, value, label, is_default, is_active, color, text_color')
                .eq('type', 'account_type')
                .eq('is_active', true)
                .eq('organization_id', selectedOrganization?.id)
                .order('display_order', { ascending: true });

            if (typeError) throw typeError;
            setAccountTypes(typeData || []);

            // Fetch account statuses
            const { data: statusData, error: statusError } = await supabase
                .from('picklist_values')
                .select('id, value, label, is_default, is_active, color, text_color')
                .eq('type', 'account_status')
                .eq('is_active', true)
                .eq('organization_id', selectedOrganization?.id)
                .order('display_order', { ascending: true });

            if (statusError) throw statusError;
            setAccountStatuses(statusData || []);
        } catch (err) {
            console.error('Error fetching picklists:', err);
            setError('Failed to load picklist values');
        }
    };

    const fetchVendors = async () => {
        try {
            setLoading(true);

            // First fetch vendors with customer data
            const { data: vendorsData, error: vendorsError } = await supabase
                .from('vendors')
                .select(`
                    *,
                    customer:customers!vendors_customer_id_fkey(
                        first_name,
                        last_name,
                        email,
                        phone,
                        company
                    )
                `)
                .eq('organization_id', selectedOrganization?.id)
                .order('created_at', { ascending: false });

            if (vendorsError) throw vendorsError;

            // Now get the owner information for each vendor that has an owner_id
            const vendorsWithOwners = await Promise.all(vendorsData.map(async (vendor) => {
                if (vendor.owner_id) {
                    try {
                        const { data: ownerData, error: ownerError } = await supabase
                            .from('profiles')
                            .select('id, name')
                            .eq('id', vendor.owner_id)
                            .single();

                        if (ownerError) {
                            console.error('Error fetching owner for vendor:', vendor.id, ownerError);
                            return { ...vendor, owner: null };
                        }

                        return { ...vendor, owner: ownerData };
                    } catch (err) {
                        console.error('Error processing owner for vendor:', vendor.id, err);
                        return { ...vendor, owner: null };
                    }
                }
                return { ...vendor, owner: null };
            }));

            setVendors(vendorsWithOwners || []);
        } catch (err) {
            console.error('Error fetching accounts:', err);
            setError(err instanceof Error ? err.message : 'Failed to load accounts');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (vendorId: string, newStatus: string) => {
        try {
            const vendorToUpdate = vendors.find(v => v.id === vendorId);
            if (!vendorToUpdate) return;

            // Verify organization access
            if (!organizations.some(org => org.id === vendorToUpdate.organization_id)) {
                throw new Error('You do not have permission to update this account');
            }

            const { error } = await supabase
                .from('vendors')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', vendorId)
                .eq('organization_id', vendorToUpdate.organization_id);

            if (error) throw error;
            await fetchVendors();
        } catch (err) {
            console.error('Error updating account status:', err);
            setError(err instanceof Error ? err.message : 'Failed to update account status');
        }
    };

    const handleDelete = async (vendorId: string) => {
        if (!window.confirm('Are you sure you want to delete this account?')) return;

        try {
            const vendorToDelete = vendors.find(v => v.id === vendorId);
            if (!vendorToDelete) return;

            // Verify organization access
            if (!organizations.some(org => org.id === vendorToDelete.organization_id)) {
                throw new Error('You do not have permission to delete this account');
            }

            const { error } = await supabase
                .from('vendors')
                .delete()
                .eq('id', vendorId)
                .eq('organization_id', vendorToDelete.organization_id);

            if (error) throw error;
            await fetchVendors();
        } catch (err) {
            console.error('Error deleting account:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete account');
        }
    };

    const handleBulkAction = async (action: string) => {
        if (!selectedVendors.length) return;

        try {
            const vendorsToUpdate = vendors.filter(v => selectedVendors.includes(v.id));

            // Verify organization access for all selected vendors
            const hasAccess = vendorsToUpdate.every(v =>
                organizations.some(org => org.id === v.organization_id)
            );

            if (!hasAccess) {
                throw new Error('You do not have permission to update some of these accounts');
            }

            if (action === 'delete') {
                if (!window.confirm('Are you sure you want to delete the selected accounts?')) return;

                const { error } = await supabase
                    .from('vendors')
                    .delete()
                    .in('id', selectedVendors)
                    .eq('organization_id', selectedOrganization?.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('vendors')
                    .update({
                        status: action,
                        updated_at: new Date().toISOString()
                    })
                    .in('id', selectedVendors)
                    .eq('organization_id', selectedOrganization?.id);

                if (error) throw error;
            }

            await fetchVendors();
            setSelectedVendors([]);
        } catch (err) {
            console.error('Error performing bulk action:', err);
            setError(err instanceof Error ? err.message : 'Failed to perform action');
        }
    };

    const exportToCSV = () => {
        const headers = [
            'Name',
            'Type',
            'Owner',
            'Contact Name',
            'Email',
            'Phone',
            'Company',
            'Status',
            'Payment Terms',
            'Shipping Address',
            'Created At'
        ].join(',');

        const csvData = vendors.map(vendor => [
            vendor.name,
            vendor.type || '',
            vendor.owner ? vendor.owner.name : '',
            vendor.customer ? `${vendor.customer.first_name} ${vendor.customer.last_name}` : '',
            vendor.customer?.email || '',
            vendor.customer?.phone || '',
            vendor.customer?.company || '',
            vendor.status,
            vendor.payment_terms || '',
            [
                vendor.shipping_address_line1,
                vendor.shipping_city,
                vendor.shipping_state,
                vendor.shipping_country
            ].filter(Boolean).join(', '),
            new Date(vendor.created_at).toLocaleDateString()
        ].join(',')).join('\n');

        const csv = `${headers}\n${csvData}`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `accounts-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const filteredVendors = vendors.filter(vendor => {
        // Extended search to include owner name
        const matchesSearch =
            vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vendor.customer?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            `${vendor.customer?.first_name} ${vendor.customer?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vendor.customer?.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vendor.owner?.name?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
        const matchesType = typeFilter === 'all' || vendor.type === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    const sortedVendors = [...filteredVendors].sort((a, b) => {
        let aValue: any = a;
        let bValue: any = b;

        if (sortConfig.key === 'customer.name') {
            aValue = a.customer ? `${a.customer.first_name} ${a.customer.last_name}` : '';
            bValue = b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : '';
        } else if (sortConfig.key === 'owner.name') {
            aValue = a.owner ? a.owner.name : '';
            bValue = b.owner ? b.owner.name : '';
        } else {
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const statusColorMap = {
        active: 'green',
        inactive: 'gray',
        pending: 'yellow',
        declined: 'red'
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6 bg-gray-50 min-h-screen font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-700 to-purple-500 bg-clip-text text-transparent">
                        Account Management
                    </h1>
                    <p className="text-gray-500 mt-1">Manage and organize your business accounts</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:border-indigo-300"
                    >
                        <FileDown className="w-4 h-4" />
                        <span>Export CSV</span>
                    </button>
                    <Link
                        to="/admin/vendors/new"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:from-indigo-700 hover:to-indigo-800"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Account</span>
                    </Link>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center border border-red-100 shadow-sm mb-6">
                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Search & Filters Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <Filter className="w-5 h-5 text-indigo-500" />
                            Search & Filters
                        </h2>
                        <button
                            onClick={() => setFiltersExpanded(!filtersExpanded)}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            {filtersExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                    </div>

                    {filtersExpanded && (
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search className="text-gray-400 w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search accounts by name, contact, owner..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600 mb-1.5 font-medium">Status Filter</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200 bg-white"
                                    >
                                        <option value="all">All Status</option>
                                        {accountStatuses.map(status => (
                                            <option key={status.id} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600 mb-1.5 font-medium">Type Filter</label>
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200 bg-white"
                                    >
                                        <option value="all">All Types</option>
                                        {accountTypes.map(type => (
                                            <option key={type.id} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedVendors.length > 0 && (
                                    <div className="flex flex-col">
                                        <label className="text-sm text-gray-600 mb-1.5 font-medium">Bulk Actions</label>
                                        <div className="flex items-center gap-3">
                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        handleBulkAction(e.target.value);
                                                        e.target.value = '';
                                                    }
                                                }}
                                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200 bg-white"
                                            >
                                                <option value="">Select Action</option>
                                                <option value="active">Mark as Active</option>
                                                <option value="inactive">Mark as Inactive</option>
                                                <option value="delete">Delete Selected</option>
                                            </select>
                                            <span className="rounded-full bg-indigo-100 text-indigo-800 px-3 py-1 text-sm font-medium">
                                                {selectedVendors.length} selected
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-6 py-4 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedVendors.length === filteredVendors.length && filteredVendors.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedVendors(filteredVendors.map(v => v.id));
                                            } else {
                                                setSelectedVendors([]);
                                            }
                                        }}
                                        className="rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                    />
                                </th>
                                <th
                                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                    onClick={() => {
                                        setSortConfig({
                                            key: 'name',
                                            direction: sortConfig.key === 'name' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                        });
                                    }}
                                >
                                    <div className="flex items-center">
                                        <span>Name</span>
                                        {sortConfig.key === 'name' && (
                                            sortConfig.direction === 'asc' ?
                                                <ChevronUp className="w-4 h-4 ml-1 text-indigo-500" /> :
                                                <ChevronDown className="w-4 h-4 ml-1 text-indigo-500" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                    onClick={() => {
                                        setSortConfig({
                                            key: 'type',
                                            direction: sortConfig.key === 'type' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                        });
                                    }}
                                >
                                    <div className="flex items-center">
                                        <span>Type</span>
                                        {sortConfig.key === 'type' && (
                                            sortConfig.direction === 'asc' ?
                                                <ChevronUp className="w-4 h-4 ml-1 text-indigo-500" /> :
                                                <ChevronDown className="w-4 h-4 ml-1 text-indigo-500" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                    onClick={() => {
                                        setSortConfig({
                                            key: 'owner.name',
                                            direction: sortConfig.key === 'owner.name' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                        });
                                    }}
                                >
                                    <div className="flex items-center">
                                        <span>Owner</span>
                                        {sortConfig.key === 'owner.name' && (
                                            sortConfig.direction === 'asc' ?
                                                <ChevronUp className="w-4 h-4 ml-1 text-indigo-500" /> :
                                                <ChevronDown className="w-4 h-4 ml-1 text-indigo-500" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                    onClick={() => {
                                        setSortConfig({
                                            key: 'customer.name',
                                            direction: sortConfig.key === 'customer.name' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                        });
                                    }}
                                >
                                    <div className="flex items-center">
                                        <span>Contact</span>
                                        {sortConfig.key === 'customer.name' && (
                                            sortConfig.direction === 'asc' ?
                                                <ChevronUp className="w-4 h-4 ml-1 text-indigo-500" /> :
                                                <ChevronDown className="w-4 h-4 ml-1 text-indigo-500" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Address
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th
                                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                    onClick={() => {
                                        setSortConfig({
                                            key: 'created_at',
                                            direction: sortConfig.key === 'created_at' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                        });
                                    }}
                                >
                                    <div className="flex items-center">
                                        <span>Created</span>
                                        {sortConfig.key === 'created_at' && (
                                            sortConfig.direction === 'asc' ?
                                                <ChevronUp className="w-4 h-4 ml-1 text-indigo-500" /> :
                                                <ChevronDown className="w-4 h-4 ml-1 text-indigo-500" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedVendors.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-10 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Briefcase className="w-12 h-12 text-gray-300 mb-2" />
                                            <p className="text-lg font-medium">No accounts found</p>
                                            <p className="text-sm">Try adjusting your search or filters</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sortedVendors.map((vendor) => (
                                    <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedVendors.includes(vendor.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedVendors(prev => [...prev, vendor.id]);
                                                    } else {
                                                        setSelectedVendors(prev => prev.filter(id => id !== vendor.id));
                                                    }
                                                }}
                                                className="rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mr-3 flex-shrink-0">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{vendor.name}</div>
                                                    {vendor.payment_terms && (
                                                        <div className="text-sm text-gray-500">
                                                            Terms: {vendor.payment_terms}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={cn(
                                                    "px-3 py-1.5 text-xs font-medium rounded-full inline-flex items-center",
                                                    accountTypes.find((type) => type.value === vendor.type)?.color
                                                        ? `bg-${accountTypes.find((type) => type.value === vendor.type)?.color}-100 text-${accountTypes.find((type) => type.value === vendor.type)?.text_color}-800`
                                                        : "bg-gray-100 text-gray-800"
                                                )}
                                            >
                                                {accountTypes.find((type) => type.value === vendor.type)?.label || vendor.type || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {vendor.owner ? (
                                                <div className="flex items-center text-sm">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mr-2 flex-shrink-0">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium">{vendor.owner.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-sm italic">No owner assigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {vendor.customer ? (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center text-sm">
                                                        <User className="w-4 h-4 text-gray-400 mr-1.5" />
                                                        <span className="font-medium">{vendor.customer.first_name} {vendor.customer.last_name}</span>
                                                    </div>
                                                    <div className="flex items-center text-sm">
                                                        <Mail className="w-4 h-4 text-gray-400 mr-1.5" />
                                                        <a
                                                            href={`mailto:${vendor.customer.email}`}
                                                            className="text-indigo-600 hover:text-indigo-800 transition-colors"
                                                        >
                                                            {vendor.customer.email}
                                                        </a>
                                                    </div>
                                                    {vendor.customer.phone && (
                                                        <div className="flex items-center text-sm">
                                                            <Phone className="w-4 h-4 text-gray-400 mr-1.5" />
                                                            <a
                                                                href={`tel:${vendor.customer.phone}`}
                                                                className="text-indigo-600 hover:text-indigo-800 transition-colors"
                                                            >
                                                                {vendor.customer.phone}
                                                            </a>
                                                        </div>
                                                    )}
                                                    {vendor.customer.company && (
                                                        <div className="flex items-center text-sm">
                                                            <Building2 className="w-4 h-4 text-gray-400 mr-1.5" />
                                                            {vendor.customer.company}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-sm italic">No contact assigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-500">
                                                {[
                                                    vendor.shipping_address_line1,
                                                    vendor.shipping_city,
                                                    vendor.shipping_state,
                                                    vendor.shipping_country
                                                ].filter(Boolean).join(', ') || (
                                                        <span className="text-gray-400 italic">No address provided</span>
                                                    )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={vendor.status}
                                                onChange={(e) => handleStatusChange(vendor.id, e.target.value)}
                                                className={cn(
                                                    "text-sm font-medium px-3 py-1.5 rounded-full border-2 appearance-none cursor-pointer",
                                                    vendor.status === 'active'
                                                        ? "bg-green-50 text-green-700 border-green-200"
                                                        : vendor.status === 'inactive'
                                                            ? "bg-gray-50 text-gray-600 border-gray-200"
                                                            : vendor.status === 'pending'
                                                                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                                                : "bg-red-50 text-red-700 border-red-200"
                                                )}
                                                style={{
                                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`,
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundPosition: 'right 0.5rem center',
                                                    backgroundSize: '1.5em 1.5em',
                                                    paddingRight: '2.5rem'
                                                }}
                                            >
                                                {accountStatuses.map(status => (
                                                    <option key={status.id} value={status.value}>
                                                        {status.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(vendor.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-1">
                                            <div className="flex justify-end items-center gap-2">
                                                <Link
                                                    to={`/admin/vendors/${vendor.id}`}
                                                    className="p-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                                                    title="View details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    to={`/admin/vendors/${vendor.id}/edit`}
                                                    className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                                                    title="Edit account"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(vendor.id)}
                                                    className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                                                    title="Delete account"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {sortedVendors.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            Showing <span className="font-medium text-gray-700">{sortedVendors.length}</span> of <span className="font-medium text-gray-700">{vendors.length}</span> accounts
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-500" />
                            <span className="text-gray-700 font-medium">{vendors.length} total accounts</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}