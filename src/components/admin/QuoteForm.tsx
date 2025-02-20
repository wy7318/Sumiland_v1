import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, X, Plus, Trash2, AlertCircle, Search, 
  UserPlus, Package, Check, Copy 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type Customer = {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
};

type QuoteFormData = {
  customer_id: string;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerFormData>(initialCustomerForm);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<QuoteFormData>({
    customer_id: '',
    status: 'Pending',
    notes: '',
    items: []
  });

  const customerSearchRef = useRef<HTMLDivElement>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    if (id) {
      fetchQuote();
    }

    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [id]);

  useEffect(() => {
    if (customerSearch) {
      const searchTerm = customerSearch.toLowerCase();
      const filtered = customers.filter(customer => 
        customer.first_name.toLowerCase().includes(searchTerm) ||
        customer.last_name.toLowerCase().includes(searchTerm) ||
        customer.email.toLowerCase().includes(searchTerm)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  }, [customerSearch, customers]);

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

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
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
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    }
  };

  const fetchQuote = async () => {
    try {
      const { data: quote, error } = await supabase
        .from('quote_hdr')
        .select(`
          *,
          items:quote_dtl(*),
          customer:customers(*)
        `)
        .eq('quote_id', id)
        .single();

      if (error) throw error;

      if (quote) {
        setFormData({
          customer_id: quote.customer_id,
          status: quote.status,
          notes: quote.notes || '',
          items: quote.items.map((item: any) => ({
            item_name: item.item_name,
            item_desc: item.item_desc,
            quantity: item.quantity,
            unit_price: item.unit_price
          }))
        });
        setSelectedCustomer(quote.customer);
      }
    } catch (err) {
      console.error('Error fetching quote:', err);
      setError('Failed to load quote');
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customer_id: customer.customer_id }));
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const handleProductSelect = (product: Product) => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_name: product.name,
          item_desc: product.description || undefined,
          quantity: 1,
          unit_price: product.price
        }
      ]
    }));
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleCreateCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([customerForm])
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

  const handleStatusChange = async (newStatus: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('quote_hdr')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('quote_id', id);

      if (updateError) throw updateError;

      // If status was changed to Approved, wait briefly then navigate to orders
      if (newStatus === 'Approved') {
        setTimeout(() => {
          navigate('/admin/orders');
        }, 1000);
      } else {
        await fetchQuote();
      }
    } catch (err) {
      console.error('Error updating quote status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update quote status');
      // Refresh quote data to get current status
      await fetchQuote();
    } finally {
      setLoading(false);
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

      const quoteData = {
        customer_id: formData.customer_id,
        status: formData.status,
        notes: formData.notes,
        total_amount: formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0),
        created_by: userData.user.id,
        updated_at: new Date().toISOString()
      };

      if (id) {
        const { error: updateError } = await supabase
          .from('quote_hdr')
          .update(quoteData)
          .eq('quote_id', id);

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
            ...item
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
            ...item
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

  const handleDuplicate = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Create new quote header
      const { data: newQuote, error: quoteError } = await supabase
        .from('quote_hdr')
        .insert([{
          customer_id: formData.customer_id,
          total_amount: formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0),
          notes: formData.notes,
          status: 'Draft',
          created_by: userData.user.id,
          updated_by: userData.user.id
        }])
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create new quote items
      if (formData.items.length > 0) {
        const { error: detailsError } = await supabase
          .from('quote_dtl')
          .insert(
            formData.items.map(item => ({
              quote_id: newQuote.quote_id,
              item_name: item.item_name,
              item_desc: item.item_desc,
              quantity: item.quantity,
              unit_price: item.unit_price
            }))
          );

        if (detailsError) throw detailsError;
      }

      // Navigate to edit page of new quote
      navigate(`/admin/quotes/${newQuote.quote_id}/edit`);
    } catch (err) {
      console.error('Error duplicating quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to duplicate quote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{id ? 'Edit Quote' : 'Create New Quote'}</h1>
        <div className="flex items-center space-x-4">
          {id && (
            <button
              onClick={handleDuplicate}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-primary-600 text-sm font-medium rounded-md text-primary-600 hover:bg-primary-50"
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicate Quote
            </button>
          )}
          <button
            onClick={() => navigate('/admin/quotes')}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search customers..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            )}

            <AnimatePresence>
              {showCustomerDropdown && (customerSearch || filteredCustomers.length > 0) && (
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
                        <UserPlus className="w-4 h-4 mr-2" />
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
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Search products..."
                    className="w-64 px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <AnimatePresence>
                  {showProductDropdown && (productSearch || filteredProducts.length > 0) && (
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
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-500">
                                ${product.price.toFixed(2)}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-4">
                          <p className="text-gray-500 mb-2">No products found</p>
                          <button
                            type="button"
                            onClick={addCustomItem}
                            className="inline-flex items-center text-primary-600 hover:text-primary-700"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Custom Item
                          </button>
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
                                        className="w-full px-4 py-2 rounded-lg border border-gray -300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
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