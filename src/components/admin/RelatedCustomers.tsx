import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { X, ChevronRight, User, Mail, List, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

type Customer = {
    customer_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    company: string | null;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    zip_code: string;
    country: string;
    created_at: string;
    organization_id: string;
    vendor_id: string | null;
    type: string | null;
    owner_id: string | null;
    birthdate: string | null;
    gender: string | null;
};

type Props = {
    vendorId: string;
    organizationId: string;
    title?: string;
    refreshKey?: number;
    defaultExpanded?: boolean;
};

export function RelatedCustomers({
    vendorId,
    organizationId,
    title = 'Customers',
    refreshKey,
    defaultExpanded = true
}: Props) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const fetchCustomers = async () => {
        if (!organizationId || !vendorId) return;

        setLoading(true);

        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('vendor_id', vendorId)
            .eq('organization_id', organizationId)
            .order('first_name', { ascending: true });

        if (error) {
            console.error('Failed to fetch customers:', error);
        } else {
            setCustomers(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (organizationId && vendorId) {
            fetchCustomers();
        }
    }, [vendorId, organizationId, refreshKey]);

    // Function to render a customer item - reused in both views
    const renderCustomerItem = (customer: Customer) => (
        <Link
            key={customer.customer_id}
            to={`/admin/customers/${customer.customer_id}`}
            className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150 flex items-start"
            onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                    // Allow default behavior for ctrl/cmd+click to open in new tab
                    return;
                }
                e.preventDefault();
                setSelectedCustomer(customer);
                setIsViewAllModalOpen(false);
            }}
        >
            <div className="flex-shrink-0 bg-blue-100 rounded-full p-1.5 mt-0.5 mr-3">
                <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                    {customer.first_name} {customer.last_name}
                </p>
                <div className="flex items-center mt-1 text-xs text-gray-500">
                    <Mail className="w-3 h-3 mr-1" />
                    <span className="truncate">{customer.email}</span>
                </div>
                {customer.company && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{customer.company}</p>
                )}
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 ml-2" />
        </Link>
    );

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    // Format a date for display
    const formatDate = (dateString: string | null) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
                <User className="w-4 h-4 text-gray-500 mr-2" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</h3>
                <span className="ml-auto bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full mr-2">
                    {customers.length}
                </span>
                <button
                    onClick={toggleExpanded}
                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </button>
            </div>

            {isExpanded && (
                <>
                    {loading ? (
                        <div className="p-4 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                            No customers found for this vendor.
                        </div>
                    ) : (
                        <>
                            <div className="divide-y divide-gray-200">
                                {/* Only show the first 5 customers */}
                                {customers.slice(0, 5).map(renderCustomerItem)}
                            </div>

                            {/* "View All" button - only show if there are more than 5 customers */}
                            {customers.length > 5 && (
                                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-center">
                                    <button
                                        onClick={() => setIsViewAllModalOpen(true)}
                                        className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center"
                                    >
                                        <List className="w-4 h-4 mr-1" />
                                        View All Customers ({customers.length})
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* View All Customers Modal */}
            {isViewAllModalOpen && (
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setIsViewAllModalOpen(false)}
                >
                    <motion.div
                        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900">All Customers</h4>
                                <p className="text-sm text-gray-500 mt-1">
                                    Showing all {customers.length} customers
                                </p>
                            </div>
                            <button
                                onClick={() => setIsViewAllModalOpen(false)}
                                className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            <div className="divide-y divide-gray-200">
                                {customers.map(renderCustomerItem)}
                            </div>
                        </div>

                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setIsViewAllModalOpen(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Customer Detail Modal */}
            {selectedCustomer && (
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSelectedCustomer(null)}
                >
                    <motion.div
                        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center">
                                <User className="w-5 h-5 text-blue-500 mr-2" />
                                <h2 className="text-lg font-semibold text-gray-900">Customer Details</h2>
                            </div>
                            <button
                                onClick={() => setSelectedCustomer(null)}
                                className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-1">
                                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                                </h3>
                                {selectedCustomer.company && (
                                    <p className="text-sm text-gray-600 mb-2">{selectedCustomer.company}</p>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Information</p>
                                    <div className="mt-2 grid grid-cols-1 gap-2">
                                        <div className="flex items-center">
                                            <Mail className="w-4 h-4 text-gray-400 mr-2" />
                                            <a href={`mailto:${selectedCustomer.email}`} className="text-sm text-blue-600 hover:text-blue-800">
                                                {selectedCustomer.email}
                                            </a>
                                        </div>
                                        {selectedCustomer.phone && (
                                            <div className="flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                                </svg>
                                                <span className="text-sm text-gray-600">{selectedCustomer.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {(selectedCustomer.address_line1 || selectedCustomer.city || selectedCustomer.state) && (
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</p>
                                        <div className="mt-2 text-sm text-gray-600">
                                            {selectedCustomer.address_line1 && <p>{selectedCustomer.address_line1}</p>}
                                            {selectedCustomer.address_line2 && <p>{selectedCustomer.address_line2}</p>}
                                            <p>
                                                {[
                                                    selectedCustomer.city,
                                                    selectedCustomer.state,
                                                    selectedCustomer.zip_code,
                                                    selectedCustomer.country
                                                ].filter(Boolean).join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {(selectedCustomer.gender || selectedCustomer.birthdate) && (
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Personal Information</p>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                                            {selectedCustomer.gender && (
                                                <div>
                                                    <p className="text-xs text-gray-500">Gender</p>
                                                    <p>{selectedCustomer.gender}</p>
                                                </div>
                                            )}
                                            {selectedCustomer.birthdate && (
                                                <div>
                                                    <p className="text-xs text-gray-500">Birthdate</p>
                                                    <p>{formatDate(selectedCustomer.birthdate)}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Account Information</p>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                                        <div>
                                            <p className="text-xs text-gray-500">Created</p>
                                            <p>{formatDate(selectedCustomer.created_at)}</p>
                                        </div>
                                        {selectedCustomer.type && (
                                            <div>
                                                <p className="text-xs text-gray-500">Type</p>
                                                <p>{selectedCustomer.type}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
                            <Link
                                to={`/admin/customers/${selectedCustomer.customer_id}`}
                                className="mr-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                View Full Profile
                            </Link>
                            <button
                                onClick={() => setSelectedCustomer(null)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}