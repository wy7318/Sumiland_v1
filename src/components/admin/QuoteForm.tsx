import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, Plus, Trash2, Search, Building2, Package, Scale,
  AlertCircle, Calendar, DollarSign, User, Mail, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { CustomFieldsForm } from './CustomFieldsForm';
import { UserSearch } from './UserSearch';

type Customer = {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string | null;
};

type Vendor = {
  id: string;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_unit: 'weight' | 'quantity';
  weight_unit: string | null;
};

type PicklistValue = {
  id: string;
  value: string;
  label: string;
  is_default: boolean;
  is_active: boolean;
  color: string | null;
  text_color: string | null;
};

type QuoteItem = {
  item_name: string;
  item_desc: string | null;
  quantity: number;
  unit_price: number;
};

type FormData = {
  customer_id: string;
  vendor_id: string | null;
  status: string;
  notes: string;
  items: QuoteItem[];
  organization_id: string;
  tax_percent: number | null;
  tax_amount: number | null;
  discount_percent: number | null;
  discount_amount: number | null;
  subtotal: number;
  custom_fields?: Record<string, any>;
};

const initialFormData: FormData = {
  customer_id: '',
  vendor_id: null,
  status: '',
  notes: '',
  items: [],
  organization_id: '',
  tax_percent: null,
  tax_amount: null,
  discount_percent: null,
  discount_amount: null,
  subtotal: 0,
};

export function QuoteForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { organizations, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  
  // Search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  const [quoteStatuses, setQuoteStatuses] = useState<PicklistValue[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  
  const customerSearchRef = useRef<HTMLDivElement>(null);
  const vendorSearchRef = useRef<HTMLDivElement>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatedTotal = calculateTotal();
    setFormData(prev => ({
      ...prev,
      subtotal: calculateSubtotal(),
      tax_amount: formData.tax_amount ?? 0,
      discount_amount: formData.discount_amount ?? 0,
      total_amount: updatedTotal
    }));
  }, [formData.items, formData.tax_amount, formData.discount_amount]);


  useEffect(() => {
    fetchPicklists();
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
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (vendorSearchRef.current && !vendorSearchRef.current.contains(event.target as Node)) {
        setShowVendorDropdown(false);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [id, organizations]);

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

  useEffect(() => {
    if (vendorSearch) {
      const searchTerm = vendorSearch.toLowerCase();
      const filtered = vendors.filter(vendor => 
        vendor.name.toLowerCase().includes(searchTerm) ||
        vendor.email?.toLowerCase().includes(searchTerm) ||
        vendor.contact_person?.toLowerCase().includes(searchTerm)
      );
      setFilteredVendors(filtered);
    } else {
      setFilteredVendors([]);
    }
  }, [vendorSearch, vendors]);

  useEffect(() => {
    if (productSearch.trim()) {
      const searchTerm = productSearch.toLowerCase();
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm)
      );
      setFilteredProducts(filtered);
      setShowProductDropdown(true);
    } else {
      setFilteredProducts([]);
      setShowProductDropdown(false);
    }
  }, [productSearch, products]);

  useEffect(() => {
    if (!products.length) {
      fetchProducts();
    }
  }, []);

  const fetchPicklists = async () => {
    try {
      // Fetch quote statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'quote_status')
        .eq('is_active', true)
        .eq('organization_id', organizations.map(org => org.id))
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setQuoteStatuses(statusData || []);

      // If no quote is being edited, set default status
      if (!id && statusData) {
        const defaultStatus = statusData.find(s => s.is_default)?.value || statusData[0]?.value;
        if (defaultStatus) {
          setFormData(prev => ({ ...prev, status: defaultStatus }));
        }
      }
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchQuote = async () => {
    try {
      const { data: quote, error } = await supabase
        .from('quote_hdr')
        .select(`
          *,
          vendor:vendors(*),
          customer:customers(*),
          quote_dtl(*)
        `)
        .eq('quote_id', id)
        .single();
  
      if (error) throw error;
      if (quote) {
        const subtotal = quote.subtotal || 0;
        const discountAmount = quote.discount_amount || 0;
        const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
  
        setFormData({
          customer_id: quote.customer_id,
          vendor_id: quote.vendor_id,
          status: quote.status,
          notes: quote.notes || '',
          tax_percent: quote.tax_percent || 0,
          tax_amount: quote.tax_amount || 0,
          discount_amount: discountAmount,
          discount_percent: discountPercent,
          subtotal: subtotal,
          items: quote.quote_dtl.map((item: any) => ({
            item_name: item.item_name,
            item_desc: item.item_desc,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
          organization_id: quote.organization_id,
        });
  
        setSelectedCustomer(quote.customer);
        if (quote.vendor) {
          setSelectedVendor(quote.vendor);
        }
  
        // Fetch custom fields for this quote
        const { data: customFieldValues, error: customFieldsError } = await supabase
          .from('custom_field_values')
          .select('field_id, value')
          .eq('entity_id', id);
  
        if (customFieldsError) throw customFieldsError;
  
        // Convert custom field values to a key-value pair object
        const customFieldsData = customFieldValues?.reduce((acc, field) => {
          acc[field.field_id] = field.value;
          return acc;
        }, {} as Record<string, any>) || {};
  
        setCustomFields(customFieldsData);
      }
    } catch (err) {
      console.error('Error fetching quote:', err);
      setError('Failed to load quote');
      navigate('/admin/quotes');
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

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .in('organization_id', organizations.map(org => org.id))
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setVendors(data || []);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError('Failed to load vendors');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('organization_id', organizations.map(org => org.id))
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };
  
  const roundToTwo = (value: number | null) => {
    return value !== null ? Math.round(value * 100) / 100 : null;
  };
  
  const calculateTaxAmount = (taxPercent: number | null, subtotal: number) => {
    return roundToTwo(taxPercent !== null ? (subtotal * taxPercent) / 100 : null);
  };
  
  const calculateDiscountAmount = (discountPercent: number | null, subtotal: number) => {
    return roundToTwo(discountPercent !== null ? (subtotal * discountPercent) / 100 : null);
  };
  
  const calculateTaxPercent = (taxAmount: number | null, subtotal: number) => {
    return roundToTwo(taxAmount !== null && subtotal !== 0 ? (taxAmount / subtotal) * 100 : null);
  };
  
  const calculateDiscountPercent = (discountAmount: number | null, subtotal: number) => {
    return roundToTwo(discountAmount !== null && subtotal !== 0 ? (discountAmount / subtotal) * 100 : null);
  };


  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customer_id: customer.customer_id }));
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const handleVendorSelect = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setFormData(prev => ({ ...prev, vendor_id: vendor.id }));
    setVendorSearch('');
    setShowVendorDropdown(false);
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
                item_desc: product.description || null,
                quantity: 1,
                unit_price: product.price
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
            item_desc: product.description || null,
            quantity: 1,
            unit_price: product.price
          }
        ]
      }));
    }
    setProductSearch('');
    setShowProductDropdown(false);
    setSelectedProductIndex(null);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_name: '',
          item_desc: null,
          quantity: 1,
          unit_price: 0
        }
      ]
    }));
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item)
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = formData.tax_amount ?? 0;
    const discountAmount = formData.discount_amount ?? 0;
    const total = subtotal + taxAmount - discountAmount;
  
    console.log("🟢 Debug - Total Calculation:", {
      subtotal,
      taxAmount,
      discountAmount,
      total
    });
  
    return total;
  };


  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!formData.customer_id) {
  //     setError('Please select a customer');
  //     return;
  //   }
  //   if (formData.items.length === 0) {
  //     setError('Please add at least one item');
  //     return;
  //   }

  //   setLoading(true);
  //   setError(null);

  //   try {
  //     const { data: userData } = await supabase.auth.getUser();
  //     if (!userData.user) throw new Error('Not authenticated');

  //     let quoteId = id; // Use let since we might update it

  //     if (id) {
  //       // Update existing quote
  //       const { error: updateError } = await supabase
  //         .from('quote_hdr')
  //         .update({
  //           customer_id: formData.customer_id,
  //           vendor_id: formData.vendor_id,
  //           status: formData.status,
  //           notes: formData.notes || null,
  //           total_amount: calculateTotal(),
  //           updated_at: new Date().toISOString(),
  //           updated_by: userData.user.id
  //         })
  //         .eq('quote_id', id);

  //       if (updateError) throw updateError;

  //       // Delete existing items
  //       const { error: deleteError } = await supabase
  //         .from('quote_dtl')
  //         .delete()
  //         .eq('quote_id', id);

  //       if (deleteError) throw deleteError;

  //       // Insert new items
  //       const { error: itemsError } = await supabase
  //         .from('quote_dtl')
  //         .insert(
  //           formData.items.map(({ item_name, item_desc, quantity, unit_price }) => ({
  //             quote_id: id,
  //             item_name,
  //             item_desc,
  //             quantity,
  //             unit_price,
  //             organization_id: formData.organization_id
  //           }))
  //         );

  //       if (itemsError) throw itemsError;
  //     } else {
  //       // Create new quote
  //       const { data: newQuote, error: insertError } = await supabase
  //         .from('quote_hdr')
  //         .insert([{
  //           customer_id: formData.customer_id,
  //           vendor_id: formData.vendor_id,
  //           status: formData.status,
  //           notes: formData.notes || null,
  //           total_amount: calculateTotal(),
  //           organization_id: formData.organization_id,
  //           created_by: userData.user.id,
  //           created_at: new Date().toISOString(),
  //           updated_by: userData.user.id,
  //           updated_at: new Date().toISOString()
  //         }])
  //         .select()
  //         .single();

  //       if (insertError) throw insertError;

  //       // Set the new quote ID for custom fields
  //       if (newQuote) {
  //         quoteId = newQuote.quote_id;

  //         // Insert items
  //         const { error: itemsError } = await supabase
  //           .from('quote_dtl')
  //           .insert(
  //             formData.items.map(({ item_name, item_desc, quantity, unit_price }) => ({
  //               quote_id: quoteId,
  //               item_name,
  //               item_desc,
  //               quantity,
  //               unit_price,
  //               organization_id: formData.organization_id
  //             }))
  //           );

  //         if (itemsError) throw itemsError;
  //       }
  //     }

  //     // Save custom field values
  //     if (userData.user) {
  //       for (const [fieldId, value] of Object.entries(customFields)) {
  //         const { error: valueError } = await supabase
  //           .from('custom_field_values')
  //           .upsert({
  //             organization_id: formData.organization_id,
  //             entity_id: quoteId,
  //             field_id: fieldId,
  //             value,
  //             created_by: userData.user.id,
  //             updated_by: userData.user.id,
  //             updated_at: new Date().toISOString()
  //           }, {
  //             onConflict: 'organization_id,field_id,entity_id'
  //           });

  //         if (valueError) {
  //           console.error('Error saving custom field value:', valueError);
  //         }
  //       }
  //     }

  //     navigate('/admin/quotes');
  //   } catch (err) {
  //     console.error('Error saving quote:', err);
  //     setError(err instanceof Error ? err.message : 'Failed to save quote');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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
  
      // ✅ Explicitly calculate values before saving
      const subtotal = calculateSubtotal();
      const discountAmount = formData.discount_amount ?? 0;
      const taxAmount = formData.tax_amount ?? 0;
      const total = subtotal + taxAmount - discountAmount;
  
      console.log("🟢 Debug - Calculated Values Before Saving");
      console.log("Subtotal:", subtotal);
      console.log("Discount Amount:", discountAmount);
      console.log("Tax Amount:", taxAmount);
      console.log("Total (Expected Total Amount):", total);
  
      let quoteId = id;
  
      if (id) {
        console.log("🟢 Debug - Updating Existing Quote");
        const { error: updateError } = await supabase
          .from('quote_hdr')
          .update({
            customer_id: formData.customer_id,
            vendor_id: formData.vendor_id,
            status: formData.status,
            notes: formData.notes || null,
            subtotal,
            tax_percent: formData.tax_percent,
            tax_amount: taxAmount,
            discount_amount: discountAmount,
            total_amount: total,  // ✅ Ensure the correct total is saved
            updated_at: new Date().toISOString(),
            updated_by: userData.user.id,
          })
          .eq('quote_id', id);
  
        if (updateError) throw updateError;
      } else {
        console.log("🟢 Debug - Creating New Quote");
        const { data: newQuote, error: insertError } = await supabase
          .from('quote_hdr')
          .insert([{
            customer_id: formData.customer_id,
            vendor_id: formData.vendor_id,
            status: formData.status,
            notes: formData.notes || null,
            subtotal,
            tax_percent: formData.tax_percent,
            tax_amount: taxAmount,
            discount_amount: discountAmount,
            total_amount: total,  // ✅ Ensure the correct total is saved
            organization_id: formData.organization_id,
            created_by: userData.user.id,
            created_at: new Date().toISOString(),
            updated_by: userData.user.id,
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single();
  
        if (insertError) throw insertError;
        quoteId = newQuote.quote_id;
      }
  
      navigate('/admin/quotes');
    } catch (err) {
      console.error('❌ Error saving quote:', err);
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
          <div ref={customerSearchRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer *
            </label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-2 border rounded-lg">
                <div>
                  <p className="font-medium">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                  {selectedCustomer.company && (
                    <p className="text-sm text-gray-500">{selectedCustomer.company}</p>
                  )}
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
                          {customer.company && (
                            <div className="text-sm text-gray-500">
                              {customer.company}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-gray-500">
                      No customers found
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div ref={vendorSearchRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account (Optional)
            </label>
            {selectedVendor ? (
              <div className="flex items-center justify-between p-2 border rounded-lg">
                <div>
                  <p className="font-medium">{selectedVendor.name}</p>
                  {selectedVendor.contact_person && (
                    <p className="text-sm text-gray-500">
                      Contact: {selectedVendor.contact_person}
                    </p>
                  )}
                  {selectedVendor.email && (
                    <p className="text-sm text-gray-500">{selectedVendor.email}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVendor(null);
                    setFormData(prev => ({ ...prev, vendor_id: null }));
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
                          {vendor.contact_person && (
                            <div className="text-sm text-gray-500">
                              Contact: {vendor.contact_person}
                            </div>
                          )}
                          {vendor.email && (
                            <div className="text-sm text-gray-500">
                              {vendor.email}
                            </div>
                          )}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              required
            >
              <option value="">Select Status</option>
              {quoteStatuses.map(status => (
                <option key={status.id} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Quote Items</h2>
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => {
                          updateItem(index, 'item_name', e.target.value);
                          if (!showProductDropdown) {
                            setSelectedProductIndex(index);
                            setProductSearch(e.target.value);
                            setShowProductDropdown(true);
                            if (!products.length) {
                              fetchProducts();
                            }
                          }
                        }}
                        onFocus={() => {
                          setSelectedProductIndex(index);
                          setProductSearch(item.item_name);
                          setShowProductDropdown(true);
                          if (!products.length) {
                            fetchProducts();
                          }
                        }}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                        required
                      />
                    </div>

                    {selectedProductIndex === index && showProductDropdown && (
                      <div className="relative">
                        <div ref={productSearchRef} className="absolute z-20 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
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
                                        Price: ${product.price.toFixed(2)} |
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
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={item.item_desc || ''}
                      onChange={(e) => updateItem(index, 'item_desc', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">Subtotal:</span>
                    <span className="ml-2 font-medium">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-500 transition-colors flex items-center justify-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Item
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tax Percentage and Tax Amount */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tax_percent ?? ''}
                    onChange={(e) => {
                      const taxPercent = e.target.value ? parseFloat(e.target.value) : null;
                      const subtotal = calculateSubtotal();
                      const taxAmount = calculateTaxAmount(taxPercent, subtotal);
                      setFormData((prev) => ({
                        ...prev,
                        tax_percent: taxPercent,
                        tax_amount: taxAmount,
                      }));
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tax_amount ?? ''}
                    onChange={(e) => {
                      const taxAmount = e.target.value ? parseFloat(e.target.value) : null;
                      const subtotal = calculateSubtotal();
                      const taxPercent = calculateTaxPercent(taxAmount, subtotal);
                      setFormData((prev) => ({
                        ...prev,
                        tax_amount: taxAmount,
                        tax_percent: taxPercent,
                      }));
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
              </div>
            
              {/* Discount Percentage and Discount Amount */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_percent ?? ''}
                    onChange={(e) => {
                      const discountPercent = e.target.value ? parseFloat(e.target.value) : null;
                      const subtotal = calculateSubtotal();
                      const discountAmount = calculateDiscountAmount(discountPercent, subtotal);
                      setFormData((prev) => ({
                        ...prev,
                        discount_percent: discountPercent,
                        discount_amount: discountAmount,
                      }));
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_amount ?? ''}
                    onChange={(e) => {
                      const discountAmount = e.target.value ? parseFloat(e.target.value) : null;
                      const subtotal = calculateSubtotal();
                      const discountPercent = calculateDiscountPercent(discountAmount, subtotal);
                      setFormData((prev) => ({
                        ...prev,
                        discount_amount: discountAmount,
                        discount_percent: discountPercent,
                      }));
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
              </div>
            </div>


            <div className="flex justify-end">
              <div className="text-right">
                <div className="text-sm text-gray-500">Subtotal: ${calculateSubtotal().toFixed(2)}</div>
                <div className="text-sm text-gray-500">Tax: ${(formData.tax_amount ?? 0).toFixed(2)}</div>
                <div className="text-sm text-gray-500">Discount: ${(formData.discount_amount ?? 0).toFixed(2)}</div>
                <div className="text-lg font-medium">Total: ${calculateTotal().toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>

        

        <CustomFieldsForm
          entityType="quote"
          entityId={id}
          organizationId={formData.organization_id}
          onChange={(values) => setCustomFields(values)}
          className="border-t border-gray-200 pt-6"
        />

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
    </motion.div>
  );
}