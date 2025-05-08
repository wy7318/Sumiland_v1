import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, ChevronDown, ChevronUp, Edit, Trash2,
    AlertCircle, CheckCircle, Calendar, Plus,
    RefreshCw, XCircle, X, Check, Building, Globe,
    Clock, FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { OrganizationDetailsModal } from './OrganizationDetailsModal';
import { CreateOrganizationModal } from './CreateOrganizationModal';

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

type SortField = 'name' | 'type' | 'status' | 'created_at' | 'license_limit';
type SortDirection = 'asc' | 'desc';

type OrganizationModalData = {
    organization: Organization;
    mode: 'view' | 'edit';
} | null;

export function OrganizationsPage() {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'customer' | 'partner' | 'vendor' | 'other'>('all');
    const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({
        field: 'created_at',
        direction: 'desc'
    });
    const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [modalData, setModalData] = useState<OrganizationModalData>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [processingAction, setProcessingAction] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [totalOrganizations, setTotalOrganizations] = useState<number>(0);

    useEffect(() => {
        checkUserPermissions();
    }, [currentUser]);

    const checkUserPermissions = async () => {
        try {
            if (!currentUser) {
                navigate('/');
                return;
            }

            // Check if user is super admin or has org management permissions
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('is_super_admin')
                .eq('id', currentUser.id)
                .single();

            if (profileError) throw profileError;

            if (!profile?.is_super_admin) {
                // Check for org_management module permission in any organization
                const { data: userOrgs, error: userOrgsError } = await supabase
                    .from('user_organizations')
                    .select('organization_id, role')
                    .eq('user_id', currentUser.id)
                    .in('role', ['admin', 'owner']);

                if (userOrgsError) throw userOrgsError;

                if (!userOrgs || userOrgs.length === 0) {
                    navigate('/admin');
                    return;
                }

                // Get organizations with org_management module enabled
                const { data: orgs, error: orgsError } = await supabase
                    .from('organizations')
                    .select('id, module_org_management')
                    .in('id', userOrgs.map(uo => uo.organization_id))
                    .eq('module_org_management', true);

                if (orgsError) throw orgsError;

                if (!orgs || orgs.length === 0) {
                    navigate('/admin');
                    return;
                }
            }

            // Only fetch organizations if permission check passes
            await fetchOrganizations();
        } catch (err) {
            console.error('Error checking user permissions:', err);
            navigate('/admin');
        }
    };

    const fetchOrganizations = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get total count of organizations
            const { count: totalCount, error: countError } = await supabase
                .from('organizations')
                .select('id', { count: 'exact', head: true });

            if (countError) throw countError;

            setTotalOrganizations(totalCount || 0);

            // Fetch all organizations
            const { data, error } = await supabase
                .from('organizations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setOrganizations(data || []);
        } catch (err) {
            console.error('Error fetching organizations:', err);
            setError(err instanceof Error ? err.message : 'Failed to load organizations');
        } finally {
            setLoading(false);
        }
    };

    const handleOrganizationUpdate = async (organizationId: string, updates: Partial<Organization>) => {
        try {
            setProcessingAction(organizationId);
            setError(null);

            // Add updated_at and updated_by fields
            const finalUpdates = {
                ...updates,
                updated_at: new Date().toISOString(),
                updated_by: currentUser?.id
            };

            const { error } = await supabase
                .from('organizations')
                .update(finalUpdates)
                .eq('id', organizationId);

            if (error) throw error;

            setSuccessMessage('Organization updated successfully');
            setTimeout(() => setSuccessMessage(null), 3000);

            // Update local state
            setOrganizations(orgs =>
                orgs.map(org =>
                    org.id === organizationId
                        ? { ...org, ...finalUpdates }
                        : org
                )
            );
        } catch (err) {
            console.error('Error updating organization:', err);
            setError(err instanceof Error ? err.message : 'Failed to update organization');
        } finally {
            setProcessingAction(null);
        }
    };

    const handleDelete = async (organizationId: string) => {
        try {
            setProcessingAction(organizationId);
            setError(null);
            setConfirmDelete(null);

            // Check if this organization has any users
            const { count, error: countError } = await supabase
                .from('user_organizations')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId);

            if (countError) throw countError;

            if (count && count > 0) {
                throw new Error(`Cannot delete organization with ${count} associated users. Remove all users first.`);
            }

            const { error } = await supabase
                .from('organizations')
                .delete()
                .eq('id', organizationId);

            if (error) throw error;

            setSuccessMessage('Organization deleted successfully');
            setTimeout(() => setSuccessMessage(null), 3000);

            // Update local state
            setOrganizations(orgs => orgs.filter(org => org.id !== organizationId));
            setTotalOrganizations(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error deleting organization:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete organization');
        } finally {
            setProcessingAction(null);
        }
    };

    const handleStatusChange = async (organizationId: string, newStatus: string) => {
        await handleOrganizationUpdate(organizationId, { status: newStatus });
    };

    const handleBulkAction = async (action: string) => {
        if (!selectedOrganizations.length) return;

        try {
            setProcessingAction('bulk');
            setError(null);

            if (action === 'delete') {
                for (const orgId of selectedOrganizations) {
                    // Skip if organization is being processed in another action
                    if (processingAction === orgId) continue;

                    // Check if this organization has any users
                    const { count, error: countError } = await supabase
                        .from('user_organizations')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', orgId);

                    if (countError) throw countError;

                    if (count && count > 0) {
                        throw new Error(`Cannot delete organizations with associated users. Remove all users first.`);
                    }
                }

                // Delete organizations
                for (const orgId of selectedOrganizations) {
                    // Skip if organization is being processed in another action
                    if (processingAction === orgId) continue;

                    await supabase
                        .from('organizations')
                        .delete()
                        .eq('id', orgId);
                }

                // Update local state
                setOrganizations(orgs => orgs.filter(org => !selectedOrganizations.includes(org.id)));
                setTotalOrganizations(prev => Math.max(0, prev - selectedOrganizations.length));
            } else {
                // Update statuses
                const updates = { status: action };

                for (const orgId of selectedOrganizations) {
                    // Skip if organization is being processed in another action
                    if (processingAction === orgId) continue;

                    await supabase
                        .from('organizations')
                        .update(updates)
                        .eq('id', orgId);
                }

                // Update local state
                setOrganizations(orgs =>
                    orgs.map(org =>
                        selectedOrganizations.includes(org.id)
                            ? { ...org, ...updates }
                            : org
                    )
                );
            }

            setSuccessMessage(`Bulk action completed successfully`);
            setTimeout(() => setSuccessMessage(null), 3000);

            setSelectedOrganizations([]);
        } catch (err) {
            console.error('Error performing bulk action:', err);
            setError(err instanceof Error ? err.message : 'Failed to perform bulk action');
        } finally {
            setProcessingAction(null);
        }
    };

    const handleSort = (field: SortField) => {
        setSortConfig(current => ({
            field,
            direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredOrganizations = useMemo(() => {
        return organizations.filter(org => {
            const searchString = searchTerm.toLowerCase();
            const matchesSearch =
                (org.name?.toLowerCase().includes(searchString) ?? false) ||
                (org.website_url?.toLowerCase().includes(searchString) ?? false) ||
                (org.type?.toLowerCase().includes(searchString) ?? false);

            const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
            const matchesType = typeFilter === 'all' || org.type === typeFilter;

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [organizations, searchTerm, statusFilter, typeFilter]);

    const sortedOrganizations = useMemo(() => {
        return [...filteredOrganizations].sort((a, b) => {
            let aValue: any = a;
            let bValue: any = b;

            switch (sortConfig.field) {
                case 'name':
                    aValue = a.name;
                    bValue = b.name;
                    break;
                case 'type':
                    aValue = a.type;
                    bValue = b.type;
                    break;
                case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                case 'license_limit':
                    aValue = a.license_limit ?? 0;
                    bValue = b.license_limit ?? 0;
                    break;
                case 'created_at':
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
                    break;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredOrganizations, sortConfig]);

    const paginatedOrganizations = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return sortedOrganizations.slice(start, end);
    }, [sortedOrganizations, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedOrganizations.length / itemsPerPage);

    const calculateCompletionPercentage = (org: Organization) => {
        const fields = [
            org.name,
            org.website_url,
            org.billing_address_line1,
            org.billing_city,
            org.billing_country,
            org.status,
            org.type,
            org.timezone
        ];
        const filledFields = fields.filter(field => field !== null && field !== '').length;
        return Math.round((filledFields / fields.length) * 100);
    };

    const getStatusBadgeClass = (status: string | null) => {
        switch (status?.toLowerCase()) {
            case 'active':
                return "bg-green-100 text-green-800";
            case 'inactive':
                return "bg-gray-100 text-gray-800";
            case 'suspended':
                return "bg-red-100 text-red-800";
            default:
                return "bg-blue-100 text-blue-800";
        }
    };

    const getTypeBadgeClass = (type: string | null) => {
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
    };

    const getLicenseStatusClass = (org: Organization) => {
        if (!org.license_contract_end_date) return "text-gray-500";

        const endDate = new Date(org.license_contract_end_date);
        const now = new Date();
        const daysLeft = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) return "text-red-600";
        if (daysLeft < 30) return "text-amber-600";
        return "text-green-600";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-violet-500 bg-clip-text text-transparent">
                        Organization Management
                    </h1>
                    <p className="text-gray-500 mt-1">Manage your organizations and their configurations</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-100">
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-500">Total</span>
                            <span className="text-lg font-semibold text-gray-700">{totalOrganizations}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg shadow-sm font-medium transition-all bg-gradient-to-r from-primary-500 to-violet-500 text-white hover:shadow-md"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Organization</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center border border-red-100 shadow-sm">
                    <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-400 hover:text-red-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {successMessage && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-green-50 text-green-600 p-4 rounded-lg flex items-center border border-green-100 shadow-sm"
                >
                    <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>{successMessage}</span>
                    <button
                        onClick={() => setSuccessMessage(null)}
                        className="ml-auto text-green-400 hover:text-green-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </motion.div>
            )}

            <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[300px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search organizations by name, website, or type..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                                className="px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>

                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                                className="px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
                            >
                                <option value="all">All Types</option>
                                <option value="customer">Customer</option>
                                <option value="partner">Partner</option>
                                <option value="vendor">Vendor</option>
                                <option value="other">Other</option>
                            </select>

                            {selectedOrganizations.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                if (e.target.value === 'delete') {
                                                    if (window.confirm(`Are you sure you want to delete ${selectedOrganizations.length} organizations? This action cannot be undone.`)) {
                                                        handleBulkAction(e.target.value);
                                                    }
                                                } else {
                                                    handleBulkAction(e.target.value);
                                                }
                                                e.target.value = '';
                                            }
                                        }}
                                        className="px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
                                        disabled={processingAction === 'bulk'}
                                    >
                                        <option value="">Bulk Actions</option>
                                        <option value="active">Mark Active</option>
                                        <option value="inactive">Mark Inactive</option>
                                        <option value="suspended">Mark Suspended</option>
                                        <option value="delete">Delete Selected</option>
                                    </select>
                                    <span className="text-sm font-medium px-3 py-1 bg-primary-50 text-primary-600 rounded-lg">
                                        {selectedOrganizations.length} selected
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <input
                                        type="checkbox"
                                        checked={paginatedOrganizations.length > 0 && selectedOrganizations.length === paginatedOrganizations.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedOrganizations(paginatedOrganizations.map(o => o.id));
                                            } else {
                                                setSelectedOrganizations([]);
                                            }
                                        }}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center">
                                        <Building className="w-4 h-4 mr-1" />
                                        <span>Organization</span>
                                        {sortConfig.field === 'name' && (
                                            sortConfig.direction === 'asc' ?
                                                <ChevronUp className="w-4 h-4 ml-1" /> :
                                                <ChevronDown className="w-4 h-4 ml-1" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('status')}
                                >
                                    <div className="flex items-center">
                                        <FileText className="w-4 h-4 mr-1" />
                                        <span>Status</span>
                                        {sortConfig.field === 'status' && (
                                            sortConfig.direction === 'asc' ?
                                                <ChevronUp className="w-4 h-4 ml-1" /> :
                                                <ChevronDown className="w-4 h-4 ml-1" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('type')}
                                >
                                    <div className="flex items-center">
                                        <Filter className="w-4 h-4 mr-1" />
                                        <span>Type</span>
                                        {sortConfig.field === 'type' && (
                                            sortConfig.direction === 'asc' ?
                                                <ChevronUp className="w-4 h-4 ml-1" /> :
                                                <ChevronDown className="w-4 h-4 ml-1" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('license_limit')}
                                >
                                    <div className="flex items-center">
                                        <Users className="w-4 h-4 mr-1" />
                                        <span>License</span>
                                        {sortConfig.field === 'license_limit' && (
                                            sortConfig.direction === 'asc' ?
                                                <ChevronUp className="w-4 h-4 ml-1" /> :
                                                <ChevronDown className="w-4 h-4 ml-1" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('created_at')}
                                >
                                    <div className="flex items-center">
                                        <Calendar className="w-4 h-4 mr-1" />
                                        <span>Created</span>
                                        {sortConfig.field === 'created_at' && (
                                            sortConfig.direction === 'asc' ?
                                                <ChevronUp className="w-4 h-4 ml-1" /> :
                                                <ChevronDown className="w-4 h-4 ml-1" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Profile Completion
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedOrganizations.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                                        <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-lg font-medium text-gray-600 mb-1">No organizations found</p>
                                        <p className="text-sm text-gray-500">Try adjusting your filters or add a new organization</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedOrganizations.map((org) => (
                                    <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedOrganizations.includes(org.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedOrganizations(prev => [...prev, org.id]);
                                                    } else {
                                                        setSelectedOrganizations(prev => prev.filter(id => id !== org.id));
                                                    }
                                                }}
                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white">
                                                        <span className="font-medium">
                                                            {org.name?.charAt(0).toUpperCase() ?? 'O'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {org.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500 flex items-center gap-1">
                                                        <Globe className="w-3.5 h-3.5" />
                                                        {org.website_url || 'No website'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={cn(
                                                "px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 w-fit",
                                                getStatusBadgeClass(org.status)
                                            )}>
                                                <StatusIcon status={org.status} />
                                                <span className="capitalize">{org.status || 'Not Set'}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={cn(
                                                "px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 w-fit",
                                                getTypeBadgeClass(org.type)
                                            )}>
                                                <TypeIcon type={org.type} />
                                                <span className="capitalize">{org.type || 'Not Set'}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-700">
                                                    {org.license_limit ? org.license_limit : '∞'}
                                                </span>
                                                {org.license_contract_end_date && (
                                                    <span className={cn("text-xs flex items-center gap-1", getLicenseStatusClass(org))}>
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {formatLicenseDuration(org.license_contract_end_date)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(org.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full",
                                                            calculateCompletionPercentage(org) < 50
                                                                ? "bg-red-500"
                                                                : calculateCompletionPercentage(org) < 80
                                                                    ? "bg-yellow-500"
                                                                    : "bg-green-500"
                                                        )}
                                                        style={{ width: `${calculateCompletionPercentage(org)}%` }}
                                                    />
                                                </div>
                                                <span className="ml-2 text-sm text-gray-500">
                                                    {calculateCompletionPercentage(org)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    onClick={() => setModalData({ organization: org, mode: 'view' })}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                    title="View Details"
                                                >
                                                    <Edit className="w-5 h-5" />
                                                </button>

                                                <div className="relative">
                                                    <button
                                                        onClick={() => {
                                                            const currentStatus = org.status?.toLowerCase() || 'inactive';
                                                            const newStatus = getNextStatus(currentStatus);
                                                            handleStatusChange(org.id, newStatus);
                                                        }}
                                                        disabled={processingAction === org.id}
                                                        className={cn(
                                                            "p-2 rounded-full transition-colors",
                                                            getStatusButtonClass(org.status),
                                                            processingAction === org.id && "opacity-50 cursor-not-allowed"
                                                        )}
                                                        title={`Change status (currently ${org.status || 'not set'})`}
                                                    >
                                                        {processingAction === org.id ? (
                                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                                        ) : (
                                                            <StatusIcon status={org.status} className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="relative">
                                                    {confirmDelete === org.id ? (
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => handleDelete(org.id)}
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                                title="Confirm delete"
                                                            >
                                                                <Check className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDelete(null)}
                                                                className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors"
                                                                title="Cancel"
                                                            >
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirmDelete(org.id)}
                                                            disabled={processingAction === org.id}
                                                            className={cn(
                                                                "p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors",
                                                                processingAction === org.id && "opacity-50 cursor-not-allowed"
                                                            )}
                                                            title="Delete Organization"
                                                        >
                                                            {processingAction === org.id ? (
                                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Showing{' '}
                            <span className="font-medium text-gray-700">
                                {(currentPage - 1) * itemsPerPage + 1}
                            </span>{' '}
                            to{' '}
                            <span className="font-medium text-gray-700">
                                {Math.min(currentPage * itemsPerPage, filteredOrganizations.length)}
                            </span>{' '}
                            of{' '}
                            <span className="font-medium text-gray-700">{filteredOrganizations.length}</span>{' '}
                            organizations
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    First
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    Previous
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(page =>
                                        page === 1 ||
                                        page === totalPages ||
                                        Math.abs(page - currentPage) <= 1
                                    )
                                    .map((page, index, array) => {
                                        // Add ellipsis
                                        const elements = [];
                                        if (index > 0 && array[index - 1] !== page - 1) {
                                            elements.push(
                                                <span
                                                    key={`ellipsis-${page}`}
                                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                                                >
                                                    ...
                                                </span>
                                            );
                                        }

                                        elements.push(
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={cn(
                                                    "relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors",
                                                    currentPage === page
                                                        ? "z-10 bg-primary-50 border-primary-500 text-primary-600"
                                                        : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                                )}
                                            >
                                                {page}
                                            </button>
                                        );

                                        return elements;
                                    })}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    Next
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    Last
                                </button>
                            </nav>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {modalData && (
                    <OrganizationDetailsModal
                        organization={modalData.organization}
                        mode={modalData.mode}
                        onClose={() => setModalData(null)}
                        onModeChange={(mode) => setModalData({ ...modalData, mode })}
                        onUpdate={(updates) => handleOrganizationUpdate(modalData.organization.id, updates)}
                        onSuccess={() => {
                            setSuccessMessage('Organization updated successfully');
                            setTimeout(() => setSuccessMessage(null), 3000);
                            fetchOrganizations();
                        }}
                        onError={(error) => setError(error)}
                    />
                )}

                {showCreateModal && (
                    <CreateOrganizationModal
                        onClose={() => setShowCreateModal(false)}
                        onSuccess={() => {
                            setSuccessMessage('Organization created successfully');
                            setTimeout(() => setSuccessMessage(null), 3000);
                            fetchOrganizations();
                        }}
                        onError={(error) => setError(error)}
                        currentUserId={currentUser?.id || ''}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Helper functions
function getNextStatus(currentStatus: string): string {
    switch (currentStatus) {
        case 'inactive': return 'active';
        case 'active': return 'suspended';
        case 'suspended': return 'inactive';
        default: return 'active';
    }
}

function getStatusButtonClass(status: string | null): string {
    switch (status?.toLowerCase()) {
        case 'active':
            return "text-green-600 hover:bg-green-50";
        case 'suspended':
            return "text-red-600 hover:bg-red-50";
        default:
            return "text-gray-600 hover:bg-gray-50";
    }
}

function formatLicenseDuration(endDateStr: string): string {
    const endDate = new Date(endDateStr);
    const now = new Date();
    const daysLeft = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return "Expired";
    if (daysLeft === 0) return "Expires today";
    if (daysLeft === 1) return "Expires tomorrow";
    if (daysLeft < 30) return `Expires in ${daysLeft} days`;

    const months = Math.floor(daysLeft / 30);
    return `Expires in ${months} month${months > 1 ? 's' : ''}`;
}

// Missing import declaration
import { Users } from 'lucide-react';

// Custom components for status and type icons
function StatusIcon({ status, className = "w-4 h-4" }: { status: string | null, className?: string }) {
    switch (status?.toLowerCase()) {
        case 'active':
            return <CheckCircle className={className} />;
        case 'inactive':
            return <XCircle className={className} />;
        case 'suspended':
            return <AlertCircle className={className} />;
        default:
            return <Clock className={className} />;
    }
}

function TypeIcon({ type, className = "w-4 h-4" }: { type: string | null, className?: string }) {
    switch (type?.toLowerCase()) {
        case 'customer':
            return <Users className={className} />;
        case 'partner':
            return <HandshakeIcon className={className} />;
        case 'vendor':
            return <ShoppingBagIcon className={className} />;
        default:
            return <Building className={className} />;
    }
}

// Additional icon components
function HandshakeIcon({ className }: { className?: string }) {
    return <div className={className}>🤝</div>;
}

function ShoppingBagIcon({ className }: { className?: string }) {
    return <div className={className}>🛍️</div>;
}