import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Plus, Search, Building2, Mail, Phone, User, Edit,
    Trash2, AlertCircle, FileDown, Filter, ChevronDown, ChevronUp,
    Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

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
    customer: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string | null;
        company: string | null;
    } | null;
    shipping_address_line1: string | null;
    shipping_city: string | null;
    shipping_state: string | null;
    shipping_country: string | null;
};

type SortConfig = {
    key: keyof Vendor | 'customer.name';
    direction: 'asc' | 'desc';
};

export function VendorsPage() {
    const { organizations } = useAuth();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        fetchPicklists();
        fetchVendors();
    }, [organizations]);

    // Fetch picklist values for account_type and account_status
    const fetchPicklists = async () => {
        try {
            // Fetch account types
            const { data: typeData, error: typeError } = await supabase
                .from('picklist_values')
                .select('id, value, label, is_default, is_active, color, text_color')
                .eq('type', 'account_type')
                .eq('is_active', true)
                .eq('organization_id', organizations.map(org => org.id))
                .order('display_order', { ascending: true });

            if (typeError) throw typeError;
            setAccountTypes(typeData || []);

            // Fetch account statuses
            const { data: statusData, error: statusError } = await supabase
                .from('picklist_values')
                .select('id, value, label, is_default, is_active, color, text_color')
                .eq('type', 'account_status')
                .eq('is_active', true)
                .eq('organization_id', organizations.map(org => org.id))
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
            const { data, error } = await supabase
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
                .in('organization_id', organizations.map(org => org.id))
                .order('created_at', { ascending: false });

            if (error) throw error;
            setVendors(data || []);
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
                    .in('organization_id', organizations.map(org => org.id));

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('vendors')
                    .update({
                        status: action,
                        updated_at: new Date().toISOString()
                    })
                    .in('id', selectedVendors)
                    .in('organization_id', organizations.map(org => org.id));

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
        const matchesSearch =
            vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vendor.customer?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            `${vendor.customer?.first_name} ${vendor.customer?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vendor.customer?.company?.toLowerCase().includes(searchQuery.toLowerCase());

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
        } else {
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Account Management</h1>
                <div className="flex gap-4">
                    <button
                        onClick={exportToCSV}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <FileDown className="w-4 h-4 mr-2" />
                        Export CSV
                    </button>
                    <Link
                        to="/admin/vendors/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Account
                    </Link>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            <div className="bg-white shadow rounded-lg">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[300px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search accounts..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                                />
                            </div>
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                        >
                            <option value="all">All Status</option>
                            {accountStatuses.map(status => (
                                <option key={status.id} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                        >
                            <option value="all">All Types</option>
                            {accountTypes.map(type => (
                                <option key={type.id} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>

                        {selectedVendors.length > 0 && (
                            <div className="flex items-center gap-2">
                                <select
                                    onChange={(e) => handleBulkAction(e.target.value)}
                                    className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                                >
                                    <option value="">Bulk Actions</option>
                                    <option value="active">Mark as Active</option>
                                    <option value="inactive">Mark as Inactive</option>
                                    <option value="delete">Delete Selected</option>
                                </select>
                                <span className="text-sm text-gray-500">
                                    {selectedVendors.length} selected
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <input
                                        type="checkbox"
                                        checked={selectedVendors.length === filteredVendors.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedVendors(filteredVendors.map(v => v.id));
                                            } else {
                                                setSelectedVendors([]);
                                            }
                                        }}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => {
                                        if (sortConfig.key === 'name') {
                                            setSortConfig({
                                                key: 'name',
                                                direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                            });
                                        } else {
                                            setSortConfig({
                                                key: 'name',
                                                direction: 'asc'
                                            });
                                        }
                                    }}
                                >
                                    <div className="flex items-center">
                                        <span>Name</span>
                                        {sortConfig.key === 'name' && (
                                            sortConfig.direction === 'asc' ?
                                                <ChevronUp className="w-4 h-4 ml-1" /> :
                                                <ChevronDown className="w-4 h-4 ml-1" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => {
                                        if (sortConfig.key === 'type') {
                                            setSortConfig({
                                                key: 'type',
                                                direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                            });
                                        } else {
                                            setSortConfig({
                                                key: 'type',
                                                direction: 'asc'
                                            });
                                        }
                                    }}
                                >
                                    <div className="flex items-center">
                                        <span>Type</span>
                                        {sortConfig.key === 'type' && (
                                            sortConfig.direction === 'asc' ?
                                                <ChevronUp className="w-4 h-4 ml-1" /> :
                                                <ChevronDown className="w-4 h-4 ml-1" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => {
                                        if (sortConfig.key === 'customer.name') {
                                            setSortConfig({
                                                key: 'customer.name',
                                                direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                            });
                                        } else {
                                            setSortConfig({
                                                key: 'customer.name',
                                                direction: 'asc'
                                            });
                                        }
                                    }}
                                >
                                    <div className="flex items-center">
                                        <span>Contact</span>
                                        {sortConfig.key === 'customer.name' && (
                                            sortConfig.direction === 'asc' ?
                                                <ChevronUp className="w-4 h-4 ml-1" /> :
                                                <ChevronDown className="w-4 h-4 ml-1" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Address
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => {
                                        if (sortConfig.key === 'created_at') {
                                            setSortConfig({
                                                key: 'created_at',
                                                direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                            });
                                        } else {
                                            setSortConfig({
                                                key: 'created_at',
                                                direction: 'desc'
                                            });
                                        }
                                    }}
                                >
                                    <div className="flex items-center">
                                        <span>Created</span>
                                        {sortConfig.key === 'created_at' && (
                                            sortConfig.direction === 'asc' ?
                                                <ChevronUp className="w-4 h-4 ml-1" /> :
                                                <ChevronDown className="w-4 h-4 ml-1" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedVendors.map((vendor) => (
                                <tr key={vendor.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
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
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <Building2 className="w-5 h-5 text-gray-400 mr-3" />
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
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={cn(
                                                "px-2 py-1 text-xs font-medium rounded-full",
                                                accountTypes.find((type) => type.value === vendor.type)?.color
                                                    ? `bg-${accountTypes.find((type) => type.value === vendor.type)?.color}-100 text-${accountTypes.find((type) => type.value === vendor.type)?.text_color}-800`
                                                    : "bg-gray-100 text-gray-800" // Fallback style
                                            )}
                                        >
                                            {accountTypes.find((type) => type.value === vendor.type)?.label || vendor.type || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {vendor.customer ? (
                                            <div className="space-y-1">
                                                <div className="flex items-center text-sm">
                                                    <User className="w-4 h-4 text-gray-400 mr-1" />
                                                    {vendor.customer.first_name} {vendor.customer.last_name}
                                                </div>
                                                <div className="flex items-center text-sm">
                                                    <Mail className="w-4 h-4 text-gray-400 mr-1" />
                                                    <a
                                                        href={`mailto:${vendor.customer.email}`}
                                                        className="text-primary-600 hover:text-primary-700"
                                                    >
                                                        {vendor.customer.email}
                                                    </a>
                                                </div>
                                                {vendor.customer.phone && (
                                                    <div className="flex items-center text-sm">
                                                        <Phone className="w-4 h-4 text-gray-400 mr-1" />
                                                        <a
                                                            href={`tel:${vendor.customer.phone}`}
                                                            className="text-primary-600 hover:text-primary-700"
                                                        >
                                                            {vendor.customer.phone}
                                                        </a>
                                                    </div>
                                                )}
                                                {vendor.customer.company && (
                                                    <div className="flex items-center text-sm">
                                                        <Building2 className="w-4 h-4 text-gray-400 mr-1" />
                                                        {vendor.customer.company}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">No contact assigned</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-500">
                                            {[
                                                vendor.shipping_address_line1,
                                                vendor.shipping_city,
                                                vendor.shipping_state,
                                                vendor.shipping_country
                                            ].filter(Boolean).join(', ') || 'No address provided'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={vendor.status}
                                            onChange={(e) => handleStatusChange(vendor.id, e.target.value)}
                                            className={cn(
                                                "text-sm font-medium rounded-full px-3 py-1 border-2",
                                                vendor.status === 'active'
                                                    ? "bg-green-100 text-green-800 border-green-200"
                                                    : "bg-gray-100 text-gray-800 border-gray-200"
                                            )}
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
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2">
                                            <Link
                                                to={`/admin/vendors/${vendor.id}`}
                                                className="text-primary-600 hover:text-primary-900"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </Link>
                                            <Link
                                                to={`/admin/vendors/${vendor.id}/edit`}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(vendor.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}