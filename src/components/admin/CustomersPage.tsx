import { useState, useEffect } from 'react';
import {
  Plus, Search, Download, Edit, Trash2, ChevronDown, ChevronUp,
  Check, X, FileSpreadsheet, AlertCircle, Eye, Building2, UserCheck,
  Users, Mail, Phone, MapPin, Calendar, Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { useOrganization } from '../../contexts/OrganizationContext';

type Customer = {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  company: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  vendor_id: string | null;
  owner_id: string | null;
  birthdate: string | null;
  gender: string | null;
  vendor: {
    name: string;
    type: string;
  } | null;
  owner: {
    id: string;
    name: string;
  } | null;
};

export function CustomersPage() {
  const { organizations } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, [selectedOrganization]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          vendor:vendors!customers_vendor_id_fkey(
            name,
            type
          ),
          owner:profiles!customers_owner_id_fkey(
            id,
            name
          )
        `)
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (customerId: string) => {
    try {
      const customerToDelete = customers.find(c => c.customer_id === customerId);
      if (!customerToDelete) return;

      // Verify organization access
      if (!organizations.some(org => org.id === customerToDelete.organization_id)) {
        throw new Error('You do not have permission to delete this customer');
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('customer_id', customerId)
        .eq('organization_id', customerToDelete.organization_id);

      if (error) throw error;
      await fetchCustomers();
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
    }
  };

  const exportToCSV = () => {
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Company',
      'Account',
      'Account Type',
      'Owner',
      'Address',
      'City',
      'State',
      'ZIP Code',
      'Country',
      'Created At'
    ].join(',');

    const csvData = customers.map(customer => [
      customer.first_name,
      customer.last_name,
      customer.email,
      customer.phone || '',
      customer.company || '',
      customer.vendor?.name || '',
      customer.vendor?.type || '',
      customer.owner?.name || '',
      `${customer.address_line1 || ''} ${customer.address_line2 || ''}`,
      customer.city || '',
      customer.state || '',
      customer.zip_code || '',
      customer.country || '',
      new Date(customer.created_at).toLocaleDateString()
    ].join(',')).join('\n');

    const csv = `${headers}\n${csvData}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredCustomers = customers.filter(customer => {
    const searchString = searchTerm.toLowerCase();
    return (
      customer.first_name.toLowerCase().includes(searchString) ||
      customer.last_name.toLowerCase().includes(searchString) ||
      customer.email.toLowerCase().includes(searchString) ||
      customer.company?.toLowerCase().includes(searchString) ||
      customer.phone?.toLowerCase().includes(searchString) ||
      customer.vendor?.name.toLowerCase().includes(searchString) ||
      customer.owner?.name.toLowerCase().includes(searchString)
    );
  });

  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-700 to-purple-500 bg-clip-text text-transparent">
            Customer Management
          </h1>
          <p className="text-gray-500 mt-1">Manage your customer relationships and contacts</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:border-cyan-300"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <Link
            to="/admin/customers/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:from-cyan-700 hover:to-cyan-800"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center border border-red-100 shadow-sm mb-6">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Filter className="w-5 h-5 text-cyan-500" />
              Search Customers
            </h2>
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {filtersExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {filtersExpanded && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-gray-400 w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Search customers by name, email, company, owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all duration-200"
              />
            </div>
          )}
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="w-12 h-12 text-gray-300 mb-2" />
                      <p className="text-lg font-medium">No customers found</p>
                      <p className="text-sm">Try adjusting your search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => (
                  <tr key={customer.customer_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="font-semibold">
                            {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                          </span>
                        </div>
                        <div className="font-medium text-gray-900">
                          {customer.first_name} {customer.last_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 text-gray-400 mr-1.5" />
                          <a
                            href={`mailto:${customer.email}`}
                            className="text-cyan-600 hover:text-cyan-800 transition-colors"
                          >
                            {customer.email}
                          </a>
                        </div>
                        {customer.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="w-4 h-4 text-gray-400 mr-1.5" />
                            <a
                              href={`tel:${customer.phone}`}
                              className="text-cyan-600 hover:text-cyan-800 transition-colors"
                            >
                              {customer.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {customer.company ? (
                        <div className="flex items-center text-sm">
                          <Building2 className="w-4 h-4 text-gray-400 mr-1.5" />
                          <span className="font-medium">{customer.company}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm italic">No company</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {customer.vendor ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {customer.vendor.name}
                          </div>
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {customer.vendor.type}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm italic">No account</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {customer.owner ? (
                        <div className="flex items-center text-sm">
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center mr-2 flex-shrink-0">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <span className="font-medium">{customer.owner.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm italic">No owner assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {customer.city && customer.state ? (
                        <div className="flex items-center text-sm">
                          <MapPin className="w-4 h-4 text-gray-400 mr-1.5" />
                          <span>{customer.city}, {customer.state}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm italic">No location</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 text-gray-400 mr-1.5" />
                        {new Date(customer.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Link
                          to={`/admin/customers/${customer.customer_id}`}
                          className="p-1.5 bg-cyan-50 text-cyan-600 rounded-full hover:bg-cyan-100 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/admin/customers/${customer.customer_id}/edit`}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                          title="Edit customer"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        {showDeleteConfirm === customer.customer_id ? (
                          <>
                            <button
                              onClick={() => handleDelete(customer.customer_id)}
                              className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                              title="Confirm delete"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="p-1.5 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setShowDeleteConfirm(customer.customer_id)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                            title="Delete customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filteredCustomers.length)}</span> of{' '}
                <span className="font-medium text-gray-900">{filteredCustomers.length}</span> customers
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="First page"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronDown className="w-4 h-4 rotate-90 -scale-x-100" />
              </button>

              <div className="flex items-center">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page =>
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1
                  )
                  .map((page, index, array) => {
                    // Add ellipsis where needed
                    if (index > 0 && array[index - 1] !== page - 1) {
                      return (
                        <div key={`gap-${page}`} className="flex items-center">
                          <span className="w-8 text-center text-gray-500">...</span>
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={cn(
                              "flex items-center justify-center w-8 h-8 mx-1 rounded-full text-sm font-medium transition-colors",
                              currentPage === page
                                ? "bg-cyan-100 text-cyan-700 border border-cyan-300"
                                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                            )}
                          >
                            {page}
                          </button>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "flex items-center justify-center w-8 h-8 mx-1 rounded-full text-sm font-medium transition-colors",
                          currentPage === page
                            ? "bg-cyan-100 text-cyan-700 border border-cyan-300"
                            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        {page}
                      </button>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Last page"
              >
                <ChevronDown className="w-4 h-4 -rotate-90 -scale-x-100" />
              </button>
            </div>
          </div>
        )}

        {paginatedCustomers.length > 0 && totalPages <= 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium text-gray-900">{filteredCustomers.length}</span> customers
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-500" />
              <span className="text-gray-700 font-medium">{customers.length} total customers</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}