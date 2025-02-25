import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, X, Plus, Trash2, Search, Building2, Package, Scale,
  AlertCircle, Calendar, DollarSign, Check 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

type Vendor = {
  id: string;
  name: string;
  type: string;
  customer_id: string | null;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    company: string | null;
  } | null;
};

type Customer = {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  organization_id: string;
};

type Product = {
  id: string;
  name: string;
  description: string;
  last_purchase_cost: number;
  stock_unit: 'weight' | 'quantity';
  weight_unit: 'kg' | 'g' | 'lb' | 'oz' | null;
  organization_id: string;
};

type QuoteFormData = {
  vendor_id: string;
  customer_id: string;
  organization_id: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Expired';
  notes: string;
  items: {
    item_name: string;
    item_desc?: string;
    quantity: number;
    unit_price: number;
  }[];
};

type CustomerFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
};

const initialCustomerForm: CustomerFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip_code: '',
  country: ''
};

export function QuoteForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { organizations } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<QuoteFormData>({
    vendor_id: '',
    customer_id: '',
    organization_id: organizations[0]?.id || '',
    status: 'Pending',
    notes: '',
    items: []
  });
  
  // Vendor search states
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  
  // Customer search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Product search states
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);

  // Customer form state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerFormData>(initialCustomerForm);

  // Refs for dropdowns
  const vendorSearchRef = useRef<HTMLDivElement>(null);
  const customerSearchRef = useRef<HTMLDivElement>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchQuote();
    } else if (organizations.length > 0) {
      setFormData(prev => ({
        ...prev,
        organization_id: organizations[0].id
      }));
    }

    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (vendorSearchRef.current && !vendorSearchRef.current.contains(event.target as Node)) {
        setShowVendorDropdown(false);
      }
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [id, organizations]);

  // Filter vendors based on search
  useEffect(() => {
    if (vendorSearch) {
      const searchTerm = vendorSearch.toLowerCase();
      const filtered = vendors.filter(vendor => 
        vendor.name.toLowerCase().includes(searchTerm) ||
        vendor.customer?.company?.toLowerCase().includes(searchTerm) ||
        vendor.customer?.first_name.toLowerCase().includes(searchTerm) ||
        vendor.customer?.last_name.toLowerCase().includes(searchTerm)
      );
      setFilteredVendors(filtered);
    } else {
      setFilteredVendors([]);
    }
  }, [vendorSearch, vendors]);

  // Filter customers based on search
  useEffect(() => {
    if (customerSearch) {
      const searchTerm = customerSearch.toLowerCase();
      const filtered = customers.filter(customer => 
        customer.first_name.toLowerCase().includes(searchTerm) ||
        customer.last_name.toLowerCase().includes(searchTerm) ||
        customer.email.toLowerCase().includes(searchTerm) ||
        customer.company?.toLowerCase().includes(searchTerm)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  }, [customerSearch, customers]);

  // Filter products based on search
  useEffect(() => {
    if (productSearch) {
      const searchTerm = productSearch.toLowerCase();
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm)
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [productSearch, products]);

  const fetchQuote = async () => {
    try {
      const { data: quote, error } = await supabase
        .from('quote_hdr')
        .select(`
          *,
          vendor:vendors(
            id,
            name,
            type,
            customer:customers(
              first_name,
              last_name,
              email,
              company
            )
          ),
          customer:customers(*),
          items:quote_dtl(*)
        `)
        .eq('quote_id', id)
        .in('organization_id', organizations.map(org => org.id))
        .single();

      if (error) throw error;

      if (quote) {
        setFormData({
          vendor_id: quote.vendor_id || '',
          customer_id: quote.customer_id,
          organization_id: quote.organization_id,
          status: quote.status,
          notes: quote.notes || '',
          items: quote.items.map((item: any) => ({
            item_name: item.item_name,
            item_desc: item.item_desc,
            quantity: item.quantity,
            unit_price: item.unit_price
          }))
        });

        if (quote.vendor) {
          setSelectedVendor(quote.vendor);
        }

        if (quote.customer) {
          setSelectedCustomer(quote.customer);
        }
      }
    } catch (err) {
      console.error('Error fetching quote:', err);
      setError('Failed to load quote');
    }
  };

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          *,
          customer:customers(
            first_name,
            last_name,
            email,
            company
          )
        `)
        .in('organization_id', organizations.map(org => org.id))
        .order('name');

      if (error) throw error;
      setVendors(data || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load accounts');
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .in('organization_id', organizations.map(org => org.id))
        .order('first_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .in('organization_id', organizations.map(org => org.id))
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    }
  };

  const handleVendorSelect = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setFormData(prev => ({
      ...prev,
      vendor_id: vendor.id,
      // If vendor has an associated customer, use that as default
      customer_id: vendor.customer_id || prev.customer_id
    }));
    setVendorSearch('');
    setShowVendorDropdown(false);

    // If vendor has an associated customer, select it
    if (vendor.customer) {
      setSelectedCustomer({
        customer_id: vendor.customer_id!,
        first_name: vendor.customer.first_name,
        last_name: vendor.customer.last_name,
        email: vendor.customer.email,
        company: vendor.customer.company,
        phone: null, // We don't have this in the vendor's customer data
        organization_id: vendor.organization_id
      });
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customer_id: customer.customer_id }));
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const handleProductSelect = (product: Product) => {
    if (selectedProductIndex !== null) {
      // Update existing item
      setFormData(prev => ({
        ...prev,
        items: prev.items.map((item, index) => 
          index === selectedProductIndex
            ? {
                item_name: product.name,
                item_desc: product.description,
                quantity: 1,
                unit_price: product.last_purchase_cost || 0
              }
            : item
        )
      }));
    } else {
      // Add new item
      setFormData(prev => ({
        ...prev,
        items: [
          ...prev.items,
          {
            item_name: product.name,
            item_desc: product.description,
            quantity: 1,
            unit_price: product.last_purchase_cost || 0
          }
        ]
      }));
    }
    setProductSearch('');
    setShowProductDropdown(false);
    setSelectedProductIndex(null);
  };

  const handleCreateCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          ...customerForm,
          organization_id: formData.organization_id
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchCustomers();
      setSelectedCustomer(data);
      setFormData(prev => ({ ...prev, customer_id: data.customer_id }));
      setShowCustomerModal(false);
      setCustomerForm(initialCustomerForm);
    } catch (err) {
      console.error('Error creating customer:', err);
      setError('Failed to create customer');
    }
  };

  const addCustomItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_name: '',
          quantity: 1,
          unit_price: 0
        }
      ]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) {
      setError('Please select a customer');
      return;
    }
    if (formData.items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Verify organization access
      if (!organizations.some(org => org.id === formData.organization_id)) {
        throw new Error('You do not have permission to manage quotes for this organization');
      }

      const quoteData = {
        vendor_id: formData.vendor_id || null,
        customer_id: formData.customer_id,
        organization_id: formData.organization_id,
        status: formData.status,
        notes: formData.notes,
        total_amount: formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0),
        created_by: userData.user.id,
        updated_by: userData.user.id
      };

      if (id) {
        const { error: updateError } = await supabase
          .from('quote_hdr')
          .update(quoteData)
          .eq('quote_id', id)
          .eq('organization_id', formData.organization_id);

        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
          .from('quote_dtl')
          .delete()
          .eq('quote_id', id);

        if (deleteError) throw deleteError;

        const { error: itemsError } = await supabase
          .from('quote_dtl')
          .insert(formData.items.map(item => ({
            quote_id: id,
            ...item,
            organization_id: formData.organization_id
          })));

        if (itemsError) throw itemsError;
      } else {
        const { data: quote, error: quoteError } = await supabase
          .from('quote_hdr')
          .insert([quoteData])
          .select()
          .single();

        if (quoteError) throw quoteError;

        const { error: itemsError } = await supabase
          .from('quote_dtl')
          .insert(formData.items.map(item => ({
            quote_id: quote.quote_id,
            ...item,
            organization_id: formData.organization_id
          })));

        if (itemsError) throw itemsError;
      }

      navigate('/admin/quotes');
    } catch (err) {
      console.error('Error saving quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to save quote');
    } finally {
      setLoading(false);
    }
  };

  if (organizations.length === 0) {
    return (
      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
        You need to be part of an organization to manage quotes.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {id ? 'Edit Quote' : 'Create New Quote'}
        </h1>
        <button
          onClick={() => navigate('/admin/quotes')}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization
            </label>
            <select
              value={formData.organization_id}
              onChange={(e) => setFormData(prev => ({ ...prev, organization_id: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              required
            >
              <option value="">Select Organization</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div ref={vendorSearchRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account
            </label>
            {selectedVendor ? (
              <div className="flex items-center justify-between p-2 border rounded-lg">
                <div>
                  <p className="font-medium">{selectedVendor.name}</p>
                  <div className="text-sm text-gray-500">
                    <span className="capitalize">{selectedVendor.type}</span>
                    {selectedVendor.customer && (
                      <span className="ml-2">
                        • Contact: {selectedVendor.customer.first_name} {selectedVendor.customer.last_name}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVendor(null);
                    setFormData(prev => ({ ...prev, vendor_id: '' }));
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={vendorSearch}
                  onChange={(e) => {
                    setVendorSearch(e.target.value);
                    setShowVendorDropdown(true);
                    if (!vendors.length) {
                      fetchVendors();
                    }
                  }}
                  onFocus={() => {
                    setShowVendorDropdown(true);
                    if (!vendors.length) {
                      fetchVendors();
                    }
                  }}
                  placeholder="Search accounts..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            )}

            <AnimatePresence>
              {showVendorDropdown && vendorSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
                >
                  {filteredVendors.length > 0 ? (
                    <ul className="py-1 max-h-60 overflow-auto">
                      {filteredVendors.map(vendor => (
                        <li
                          key={vendor.id}
                          onClick={() => handleVendorSelect(vendor)}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="font-medium">{vendor.name}</div>
                          <div className="text-sm text-gray-500">
                            <span className="capitalize">{vendor.type}</span>
                            {vendor.customer && (
                              <span className="ml-2">
                                • Contact: {vendor.customer.first_name} {vendor.customer.last_name}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-gray-500">
                      No accounts found
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div ref={customerSearchRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-2 border rounded-lg">
                <div>
                  <p className="font-medium">{selectedCustomer.first_name} {selectedCustomer.last_name}</p>
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setFormData(prev => ({ ...prev, customer_id: '' }));
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    if (!customers.length) {
                      fetchCustomers();
                    }
                  }}
                  onFocus={() => {
                    setShowCustomerDropdown(true);
                    if (!customers.length) {
                      fetchCustomers();
                    }
                  }}
                  placeholder="Search customers..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            )}

            <AnimatePresence>
              {showCustomerDropdown && customerSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
                >
                  {filteredCustomers.length > 0 ? (
                    <ul className="py-1 max-h-60 overflow-auto">
                      {filteredCustomers.map(customer => (
                        <li
                          key={customer.customer_id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="font-medium">
                            {customer.first_name} {customer.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {customer.email}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4">
                      <p className="text-gray-500 mb-2">No customers found</p>
                      <button
                        type="button"
                        onClick={() => setShowCustomerModal(true)}
                        className="inline-flex items-center text-primary-600 hover:text-primary-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Customer
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as QuoteFormData['status'] }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Quote Items</h2>
            <div className="flex gap-2">
              <div ref={productSearchRef} className="relative">
                <div className="flex items-center">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                      if (!products.length) {
                        fetchProducts();
                      }
                    }}
                    onFocus={() => {
                      setShowProductDropdown(true);
                      if (!products.length) {
                        fetchProducts();
                      }
                    }}
                    placeholder="Search products..."
                    className="w-64 px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <AnimatePresence>
                  {showProductDropdown && productSearch && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
                    >
                      {filteredProducts.length > 0 ? (
                        <ul className="py-1 max-h-60 overflow-auto">
                          {filteredProducts.map(product => (
                            <li
                              key={product.id}
                              onClick={() => handleProductSelect(product)}
                              className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <div className="flex items-center">
                                {product.stock_unit === 'quantity' ? (
                                  <Package className="w-4 h-4 text-gray-400 mr-2" />
                                ) : (
                                  <Scale className="w-4 h-4 text-gray-400 mr-2" />
                                )}
                                <div>
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-gray-500">
                                    Last Cost: ${product.last_purchase_cost.toFixed(2)} |
                                    {product.stock_unit === 'quantity' ? ' Units' : ` Weight (${product.weight_unit})`}
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-4 text-gray-500">
                          No products found
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={addCustomItem}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Item
              </button>
            </div>
          </div>

          {formData.items.map((item, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={item.item_name}
                    onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={item.item_desc || ''}
                  onChange={(e) => updateItem(index, 'item_desc', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
              <div className="mt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="text-right">
                  <span className="text-sm text-gray-500">Line Total:</span>
                  <span className="ml-2 font-medium">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <div className="text-right">
              <span className="text-lg font-medium">Total:</span>
              <span className="ml-2 text-xl font-bold">
                ${formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/quotes')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Quote'}
          </button>
        </div>
      </form>

      {/* New Customer Modal */}
      <AnimatePresence>
        {showCustomerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Add New Customer</h2>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={customerForm.first_name}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={customerForm.last_name}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={customerForm.address_line1}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, address_line1: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={customerForm.address_line2}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, address_line2: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={customerForm.state}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={customerForm.zip_code}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, zip_code: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={customerForm.country}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6 space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateCustomer}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Create Customer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}