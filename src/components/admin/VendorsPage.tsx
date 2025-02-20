import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Building2, Mail, Phone, User, Edit, 
  Trash2, AlertCircle, FileDown, Filter, ChevronDown, ChevronUp 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type Vendor = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  contact_person: string | null;
  status: 'active' | 'inactive';
  payment_terms: string | null;
  notes: string | null;
  created_at: string;
};

type SortConfig = {
  key: keyof Vendor;
  direction: 'asc' | 'desc';
};

export function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'created_at',
    direction: 'desc'
  });
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: keyof Vendor) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleStatusChange = async (vendorId: string, newStatus: Vendor['status']) => {
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', vendorId);

      if (error) throw error;
      await fetchVendors();
    } catch (err) {
      console.error('Error updating vendor status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update vendor status');
    }
  };

  const handleDelete = async (vendorId: string) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;

    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId);

      if (error) throw error;
      await fetchVendors();
    } catch (err) {
      console.error('Error deleting vendor:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete vendor');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (!selectedVendors.length) return;

    try {
      if (action === 'delete') {
        if (!window.confirm('Are you sure you want to delete the selected vendors?')) return;
        
        const { error } = await supabase
          .from('vendors')
          .delete()
          .in('id', selectedVendors);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendors')
          .update({ 
            status: action,
            updated_at: new Date().toISOString()
          })
          .in('id', selectedVendors);

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
      'Email',
      'Phone',
      'Contact Person',
      'Address',
      'Status',
      'Payment Terms',
      'Created At'
    ].join(',');

    const csvData = vendors.map(vendor => [
      vendor.name,
      vendor.email || '',
      vendor.phone || '',
      vendor.contact_person || '',
      vendor.address || '',
      vendor.status,
      vendor.payment_terms || '',
      new Date(vendor.created_at).toLocaleDateString()
    ].join(',')).join('\n');

    const csv = `${headers}\n${csvData}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendors-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = 
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.contact_person?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedVendors = [...filteredVendors].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
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
        <h1 className="text-2xl font-bold">Vendor Management</h1>
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
            Add Vendor
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
                  placeholder="Search vendors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
                  onClick={() => handleSort('name')}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('created_at')}
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
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {vendor.contact_person && (
                        <div className="flex items-center text-sm">
                          <User className="w-4 h-4 text-gray-400 mr-1" />
                          {vendor.contact_person}
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 text-gray-400 mr-1" />
                          <a
                            href={`mailto:${vendor.email}`}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            {vendor.email}
                          </a>
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center text-sm">
                          <Phone className="w-4 h-4 text-gray-400 mr-1" />
                          <a
                            href={`tel:${vendor.phone}`}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            {vendor.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={vendor.status}
                      onChange={(e) => handleStatusChange(vendor.id, e.target.value as Vendor['status'])}
                      className={cn(
                        "text-sm font-medium rounded-full px-3 py-1 border-2",
                        vendor.status === 'active'
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-gray-100 text-gray-800 border-gray-200"
                      )}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(vendor.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
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