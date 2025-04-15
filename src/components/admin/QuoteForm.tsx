import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  X,
  Plus,
  Trash2,
  Search,
  Building2,
  Package,
  AlertCircle,
  Calendar,
  User,
  Truck,
  MapPin,
  ClipboardList,
  Box,
  CheckCircle,
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  DollarSign,
  CreditCard,
  Tag,
  UserCheck,
  Bookmark,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { CustomFieldsForm } from './CustomFieldsForm';
import { useOrganization } from '../../contexts/OrganizationContext';
import { UserSearch } from './UserSearch';
import { Loader } from '@googlemaps/js-api-loader';

// Types
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
};

type QuoteItem = {
  item_name: string;
  item_desc?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type PicklistValue = {
  id: string;
  value: string;
  is_default: boolean;
  label?: string;
  color?: string | null;
  text_color?: string | null;
};

type FormData = {
  customer_id: string;
  vendor_id: string | null;
  status: string;
  notes: string;
  items: QuoteItem[];
  organization_id: string;
  subtotal: number;
  discount_amount: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
  // New fields
  owner_id: string | null;
  bill_to_customer_id: string | null;
  ship_to_customer_id: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_country: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_country: string | null;
  expire_at: string | null;
  is_converted: boolean;
  converted_at: string | null;
  converted_to_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  approval_status: string | null;
};

const initialFormData: FormData = {
  customer_id: '',
  vendor_id: null,
  status: 'Draft',
  notes: '',
  items: [],
  organization_id: '',
  subtotal: 0,
  discount_amount: 0,
  tax_percent: 0,
  tax_amount: 0,
  total_amount: 0,
  // New fields with initial values
  owner_id: null,
  bill_to_customer_id: null,
  ship_to_customer_id: null,
  shipping_address_line1: null,
  shipping_address_line2: null,
  shipping_city: null,
  shipping_state: null,
  shipping_country: null,
  billing_address_line1: null,
  billing_address_line2: null,
  billing_city: null,
  billing_state: null,
  billing_country: null,
  expire_at: null,
  is_converted: false,
  converted_at: null,
  converted_to_id: null,
  approved_by: null,
  approved_at: null,
  approval_status: 'Pending'
};

export function QuoteForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { selectedOrganization } = useOrganization();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const location = useLocation();
  const [quoteNumber, setQuoteNumber] = useState<string>('New Quote');

  // Tab state
  const [activeTab, setActiveTab] = useState('details');

  // Status and picklists
  const [quoteStatuses, setQuoteStatuses] = useState<PicklistValue[]>([]);
  const [approvalStatuses, setApprovalStatuses] = useState<PicklistValue[]>([]);

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

  // New states for additional fields
  const [useShippingForBilling, setUseShippingForBilling] = useState(false);
  const [shipToCustomerSearch, setShipToCustomerSearch] = useState('');
  const [billToCustomerSearch, setBillToCustomerSearch] = useState('');
  const [filteredShipToCustomers, setFilteredShipToCustomers] = useState<Customer[]>([]);
  const [filteredBillToCustomers, setFilteredBillToCustomers] = useState<Customer[]>([]);
  const [showShipToCustomerDropdown, setShowShipToCustomerDropdown] = useState(false);
  const [showBillToCustomerDropdown, setShowBillToCustomerDropdown] = useState(false);
  const [selectedShipToCustomer, setSelectedShipToCustomer] = useState<Customer | null>(null);
  const [selectedBillToCustomer, setSelectedBillToCustomer] = useState<Customer | null>(null);
  const [approvalStatusOptions, setApprovalStatusOptions] = useState<PicklistValue[]>([]);

  // Refs
  const customerSearchRef = useRef<HTMLDivElement>(null);
  const vendorSearchRef = useRef<HTMLDivElement>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);
  const shipToCustomerSearchRef = useRef<HTMLDivElement>(null);
  const billToCustomerSearchRef = useRef<HTMLDivElement>(null);

  // References for Google Maps Places Autocomplete
  const shippingAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const billingAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  // Add state to track if this is from an opportunity conversion
  const [convertedFromOpportunity, setConvertedFromOpportunity] = useState(false);
  const [opportunityId, setOpportunityId] = useState<string | null>(null);

  useEffect(() => {
    fetchPicklists();
    if (id) {
      fetchQuote();
    } else if (selectedOrganization) {
      setFormData(prev => ({
        ...prev,
        organization_id: selectedOrganization.id
      }));
    }
  }, [id, selectedOrganization]);

  const fetchPicklists = async () => {
    try {
      // Fetch quote statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'quote_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setQuoteStatuses(statusData || []);

      // Fetch approval statuses
      const { data: approvalData, error: approvalError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'quote_approval_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (approvalError) throw approvalError;
      setApprovalStatuses(approvalData || []);
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  // Load Google Maps API
  useEffect(() => {
    // Initialize Google Maps with the Loader
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: "weekly",
      libraries: ["places"]
    });

    loader.load().then(() => {
      const shippingInput = document.getElementById('shipping-address-line1') as HTMLInputElement;
      const billingInput = document.getElementById('billing-address-line1') as HTMLInputElement;

      if (shippingInput) {
        shippingAutocompleteRef.current = new google.maps.places.Autocomplete(shippingInput, {
          types: ['address'],
          fields: ['address_components', 'formatted_address']
        });

        shippingAutocompleteRef.current.addListener('place_changed', () => {
          const place = shippingAutocompleteRef.current?.getPlace();
          if (place?.address_components) {
            updateAddressFromPlace(place, 'shipping');
          }
        });
      }

      if (billingInput && !useShippingForBilling) {
        billingAutocompleteRef.current = new google.maps.places.Autocomplete(billingInput, {
          types: ['address'],
          fields: ['address_components', 'formatted_address']
        });

        billingAutocompleteRef.current.addListener('place_changed', () => {
          const place = billingAutocompleteRef.current?.getPlace();
          if (place?.address_components) {
            updateAddressFromPlace(place, 'billing');
          }
        });
      }
    }).catch((error) => {
      console.error('Error loading Google Maps:', error);
    });
  }, [useShippingForBilling]);

  // Handle prefilled data from opportunity conversion
  useEffect(() => {
    if (location.state?.convertedFromOpportunity && location.state?.quoteData) {
      setConvertedFromOpportunity(true);
      setOpportunityId(location.state.opportunityId);

      const quoteData = location.state.quoteData;

      // Set form data from converted opportunity
      setFormData({
        ...formData,
        customer_id: quoteData.customer_id || '',
        vendor_id: quoteData.vendor_id || null,
        status: quoteData.status || '',
        notes: quoteData.notes || '',
        items: quoteData.items || [],
        organization_id: quoteData.organization_id || selectedOrganization?.id,
        tax_percent: quoteData.tax_percent ?? 0,       // Use nullish coalescing
        tax_amount: quoteData.tax_amount ?? 0,         // instead of logical OR
        discount_amount: quoteData.discount_amount ?? 0, // to handle 0 values correctly
        subtotal: quoteData.subtotal || 0,
        total_amount: quoteData.total_amount || 0
      });

      // Fetch customer and vendor data to display
      if (quoteData.customer_id) {
        fetchCustomerById(quoteData.customer_id);
      }

      if (quoteData.vendor_id) {
        fetchVendorById(quoteData.vendor_id);
      }
    }
  }, [location.state]);

  // Function to extract address components from Google Maps
  const updateAddressFromPlace = (place: google.maps.places.PlaceResult, type: 'shipping' | 'billing') => {
    let streetNumber = '';
    let route = '';
    let city = '';
    let state = '';
    let zipCode = '';
    let country = '';

    place.address_components?.forEach(component => {
      const type = component.types[0];
      switch (type) {
        case 'street_number':
          streetNumber = component.long_name;
          break;
        case 'route':
          route = component.long_name;
          break;
        case 'locality':
          city = component.long_name;
          break;
        case 'administrative_area_level_1':
          state = component.short_name;
          break;
        case 'postal_code':
          zipCode = component.long_name;
          break;
        case 'country':
          country = component.long_name;
          break;
      }
    });

    setFormData(prev => ({
      ...prev,
      [`${type}_address_line1`]: `${streetNumber} ${route}`.trim(),
      [`${type}_city`]: city,
      [`${type}_state`]: state,
      [`${type}_country`]: country
    }));
  };

  useEffect(() => {
    if (selectedOrganization) {
      fetchApprovalStatusOptions();
    }
  }, [selectedOrganization]);

  useEffect(() => {
    if (customerSearch) {
      const filtered = customers.filter(customer =>
        customer.first_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.last_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.company?.toLowerCase().includes(customerSearch.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  }, [customerSearch, customers]);

  // Ship-to customer filter effect
  useEffect(() => {
    if (shipToCustomerSearch) {
      const filtered = customers.filter(customer =>
        customer.first_name.toLowerCase().includes(shipToCustomerSearch.toLowerCase()) ||
        customer.last_name.toLowerCase().includes(shipToCustomerSearch.toLowerCase()) ||
        customer.email.toLowerCase().includes(shipToCustomerSearch.toLowerCase()) ||
        customer.company?.toLowerCase().includes(shipToCustomerSearch.toLowerCase())
      );
      setFilteredShipToCustomers(filtered);
    } else {
      setFilteredShipToCustomers([]);
    }
  }, [shipToCustomerSearch, customers]);

  // Bill-to customer filter effect
  useEffect(() => {
    if (billToCustomerSearch) {
      const filtered = customers.filter(customer =>
        customer.first_name.toLowerCase().includes(billToCustomerSearch.toLowerCase()) ||
        customer.last_name.toLowerCase().includes(billToCustomerSearch.toLowerCase()) ||
        customer.email.toLowerCase().includes(billToCustomerSearch.toLowerCase()) ||
        customer.company?.toLowerCase().includes(billToCustomerSearch.toLowerCase())
      );
      setFilteredBillToCustomers(filtered);
    } else {
      setFilteredBillToCustomers([]);
    }
  }, [billToCustomerSearch, customers]);

  useEffect(() => {
    if (vendorSearch) {
      const filtered = vendors.filter(vendor =>
        vendor.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
        vendor.contact_person?.toLowerCase().includes(vendorSearch.toLowerCase())
      );
      setFilteredVendors(filtered);
    } else {
      setFilteredVendors([]);
    }
  }, [vendorSearch, vendors]);

  useEffect(() => {
    if (productSearch) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.description?.toLowerCase().includes(productSearch.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [productSearch, products]);

  // Handle clicks outside dropdowns
  useEffect(() => {
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
      if (shipToCustomerSearchRef.current && !shipToCustomerSearchRef.current.contains(event.target as Node)) {
        setShowShipToCustomerDropdown(false);
      }
      if (billToCustomerSearchRef.current && !billToCustomerSearchRef.current.contains(event.target as Node)) {
        setShowBillToCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Shipping to billing address sync effect
  useEffect(() => {
    if (useShippingForBilling) {
      setFormData(prev => ({
        ...prev,
        billing_address_line1: prev.shipping_address_line1,
        billing_address_line2: prev.shipping_address_line2,
        billing_city: prev.shipping_city,
        billing_state: prev.shipping_state,
        billing_country: prev.shipping_country
      }));
    }
  }, [
    useShippingForBilling,
    formData.shipping_address_line1,
    formData.shipping_address_line2,
    formData.shipping_city,
    formData.shipping_state,
    formData.shipping_country
  ]);

  // Auto-update approval_at when approval_status changes to 'Approved'
  useEffect(() => {
    if (formData.approval_status === 'Approved' && !formData.approved_at) {
      setFormData(prev => ({
        ...prev,
        approved_at: new Date().toISOString()
      }));
    }
  }, [formData.approval_status]);

  const fetchQuote = async () => {
    try {
      const { data: quote, error } = await supabase
        .from('quote_hdr')
        .select(`
          *,
          customer:customers(*),
          vendor:vendors(*),
          owner:profiles(id, name),
          approved_by_user:profiles(id, name),
          ship_to_customer:customers(customer_id, first_name, last_name, email, phone, company),
          bill_to_customer:customers(customer_id, first_name, last_name, email, phone, company),
          items:quote_dtl(*)
        `)
        .eq('quote_id', id)
        .single();

      if (error) throw error;
      if (quote) {
        // Format datetime values for datetime-local input
        const formatDateTime = (dateTimeString) => {
          if (!dateTimeString) return null;
          try {
            // Parse ISO datetime and format to YYYY-MM-DDThh:mm
            const date = new Date(dateTimeString);
            return date.toISOString().slice(0, 16); // Gets YYYY-MM-DDThh:mm
          } catch (err) {
            console.error('Error formatting datetime:', err);
            return null;
          }
        };

        setQuoteNumber(quote.quote_number || 'New Quote');

        setFormData({
          customer_id: quote.customer_id,
          vendor_id: quote.vendor_id,
          status: quote.status,
          notes: quote.notes || '',
          items: quote.items.map((item: any) => ({
            item_name: item.item_name,
            item_desc: item.item_desc,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total
          })),
          organization_id: quote.organization_id,
          subtotal: quote.subtotal || 0,
          discount_amount: quote.discount_amount || 0,
          tax_percent: quote.tax_percent || 0,
          tax_amount: quote.tax_amount || 0,
          total_amount: quote.total_amount || 0,

          // New fields
          owner_id: quote.owner_id,
          bill_to_customer_id: quote.bill_to_customer_id,
          ship_to_customer_id: quote.ship_to_customer_id,
          shipping_address_line1: quote.shipping_address_line1 || null,
          shipping_address_line2: quote.shipping_address_line2 || null,
          shipping_city: quote.shipping_city || null,
          shipping_state: quote.shipping_state || null,
          shipping_country: quote.shipping_country || null,
          billing_address_line1: quote.billing_address_line1 || null,
          billing_address_line2: quote.billing_address_line2 || null,
          billing_city: quote.billing_city || null,
          billing_state: quote.billing_state || null,
          billing_country: quote.billing_country || null,
          expire_at: formatDateTime(quote.expire_at),
          is_converted: quote.is_converted || false,
          converted_at: formatDateTime(quote.converted_at),
          converted_to_id: quote.converted_to_id,
          approved_by: quote.approved_by,
          approved_at: formatDateTime(quote.approved_at),
          approval_status: quote.approval_status || 'Pending'
        });

        // Set selected entities
        if (quote.customer) {
          setSelectedCustomer(quote.customer);
        }
        if (quote.vendor) {
          setSelectedVendor(quote.vendor);
        }
        if (quote.ship_to_customer) {
          setSelectedShipToCustomer(quote.ship_to_customer);
        }
        if (quote.bill_to_customer) {
          setSelectedBillToCustomer(quote.bill_to_customer);
        }

        // Check if billing address matches shipping address
        const shippingMatchesBilling =
          quote.billing_address_line1 === quote.shipping_address_line1 &&
          quote.billing_address_line2 === quote.shipping_address_line2 &&
          quote.billing_city === quote.shipping_city &&
          quote.billing_state === quote.shipping_state &&
          quote.billing_country === quote.shipping_country;

        setUseShippingForBilling(shippingMatchesBilling);
      }
    } catch (err) {
      console.error('Error fetching quote:', err);
      setError('Failed to load quote');
      navigate('/admin/quotes');
    }
  };

  const fetchApprovalStatusOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('picklist_values')
        .select('*')
        .eq('type', 'quote_approval_status')
        .order('display_order');

      if (error) throw error;
      setApprovalStatusOptions(data || []);
    } catch (err) {
      console.error('Error fetching approval status options:', err);
    }
  };

  // Add functions to fetch customer and vendor by ID
  const fetchCustomerById = async (customerId) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedCustomer(data);
      }
    } catch (err) {
      console.error('Error fetching customer:', err);
    }
  };

  const fetchVendorById = async (vendorId) => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedVendor(data);
      }
    } catch (err) {
      console.error('Error fetching vendor:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', selectedOrganization?.id)
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
        .eq('organization_id', selectedOrganization?.id)
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
        .eq('organization_id', selectedOrganization?.id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    }
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

  const handleShipToCustomerSelect = (customer: Customer) => {
    setSelectedShipToCustomer(customer);
    setFormData(prev => ({ ...prev, ship_to_customer_id: customer.customer_id }));
    setShipToCustomerSearch('');
    setShowShipToCustomerDropdown(false);
  };

  const handleBillToCustomerSelect = (customer: Customer) => {
    setSelectedBillToCustomer(customer);
    setFormData(prev => ({ ...prev, bill_to_customer_id: customer.customer_id }));
    setBillToCustomerSearch('');
    setShowBillToCustomerDropdown(false);
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
              item_desc: product.description || '',
              quantity: 1,
              unit_price: product.price,
              line_total: product.price
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
            item_desc: product.description || '',
            quantity: 1,
            unit_price: product.price,
            line_total: product.price
          }
        ]
      }));
    }
    setProductSearch('');
    setShowProductDropdown(false);
    setSelectedProductIndex(null);
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          // Recalculate line_total if quantity or unit_price changes
          if (field === 'quantity' || field === 'unit_price') {
            updatedItem.line_total = updatedItem.quantity * updatedItem.unit_price;
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.line_total, 0);
  };

  const calculateTaxAmount = (subtotal, discount, taxPercent) => {
    return (subtotal - discount) * (taxPercent / 100);
  };

  const calculateTotal = (subtotal, discount, taxAmount) => {
    return subtotal - discount + taxAmount;
  };

  const updateTotals = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = calculateTaxAmount(subtotal, formData.discount_amount, formData.tax_percent);
    const total = calculateTotal(subtotal, formData.discount_amount, taxAmount);

    setFormData(prev => ({
      ...prev,
      subtotal,
      tax_amount: taxAmount,
      total_amount: total
    }));
  };

  // Call updateTotals when items, discount, or tax percent changes
  useEffect(() => {
    updateTotals();
  }, [formData.items, formData.discount_amount, formData.tax_percent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) {
      setError('Please select a customer');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const organizationId = selectedOrganization?.id;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Prepare the billing address (copy from shipping if useShippingForBilling is true)
      const billingAddressData = useShippingForBilling ? {
        billing_address_line1: formData.shipping_address_line1,
        billing_address_line2: formData.shipping_address_line2,
        billing_city: formData.shipping_city,
        billing_state: formData.shipping_state,
        billing_country: formData.shipping_country
      } : {
        billing_address_line1: formData.billing_address_line1,
        billing_address_line2: formData.billing_address_line2,
        billing_city: formData.billing_city,
        billing_state: formData.billing_state,
        billing_country: formData.billing_country
      };

      // Additional fields handling
      const shouldUpdateApprovedAt = formData.approval_status === 'Approved';

      const quoteData = {
        ...formData,
        ...billingAddressData,
        approved_at: shouldUpdateApprovedAt && !formData.approved_at ? new Date().toISOString() : formData.approved_at,
        expire_at: formData.expire_at,
        organization_id: selectedOrganization?.id
      };

      let quoteId = id;

      if (id) {
        // Update existing quote
        const { error: updateError } = await supabase
          .from('quote_hdr')
          .update({
            customer_id: quoteData.customer_id,
            vendor_id: quoteData.vendor_id,
            status: quoteData.status,
            notes: quoteData.notes,
            subtotal: quoteData.subtotal,
            discount_amount: quoteData.discount_amount,
            tax_percent: quoteData.tax_percent,
            tax_amount: quoteData.tax_amount,
            total_amount: quoteData.total_amount,
            updated_at: new Date().toISOString(),
            updated_by: userData.user.id,

            // New fields
            owner_id: quoteData.owner_id,
            bill_to_customer_id: quoteData.bill_to_customer_id,
            ship_to_customer_id: quoteData.ship_to_customer_id,
            shipping_address_line1: quoteData.shipping_address_line1,
            shipping_address_line2: quoteData.shipping_address_line2,
            shipping_city: quoteData.shipping_city,
            shipping_state: quoteData.shipping_state,
            shipping_country: quoteData.shipping_country,
            billing_address_line1: quoteData.billing_address_line1,
            billing_address_line2: quoteData.billing_address_line2,
            billing_city: quoteData.billing_city,
            billing_state: quoteData.billing_state,
            billing_country: quoteData.billing_country,
            expire_at: quoteData.expire_at,
            approval_status: quoteData.approval_status,
            approved_by: quoteData.approved_by,
            approved_at: quoteData.approved_at
          })
          .eq('quote_id', id);

        if (updateError) throw updateError;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('quote_dtl')
          .delete()
          .eq('quote_id', id);

        if (deleteError) throw deleteError;

        // Insert new items
        const { error: itemsError } = await supabase
          .from('quote_dtl')
          .insert(
            quoteData.items.map(item => ({
              quote_id: id,
              item_name: item.item_name,
              item_desc: item.item_desc,
              quantity: item.quantity,
              unit_price: item.unit_price,
              organization_id: quoteData.organization_id
            }))
          );

        if (itemsError) throw itemsError;
      } else {
        // Create new quote
        const { data: quote_number_data, error: quote_number_error } = await supabase
          .rpc('generate_quote_number', { org_id: organizationId });

        if (quote_number_error) throw quote_number_error;

        const quote_number = quote_number_data;

        const { data: newQuote, error: insertError } = await supabase
          .from('quote_hdr')
          .insert([{
            quote_number: quote_number,
            customer_id: formData.customer_id,
            vendor_id: formData.vendor_id,
            status: formData.status,
            notes: formData.notes,
            subtotal: formData.subtotal,
            discount_amount: formData.discount_amount,
            tax_percent: formData.tax_percent,
            tax_amount: formData.tax_amount,
            total_amount: formData.total_amount,
            created_at: new Date().toISOString(),
            created_by: userData.user.id,
            updated_at: new Date().toISOString(),
            updated_by: userData.user.id,
            organization_id: organizationId,

            // New fields
            owner_id: quoteData.owner_id,
            bill_to_customer_id: quoteData.bill_to_customer_id,
            ship_to_customer_id: quoteData.ship_to_customer_id,
            shipping_address_line1: quoteData.shipping_address_line1,
            shipping_address_line2: quoteData.shipping_address_line2,
            shipping_city: quoteData.shipping_city,
            shipping_state: quoteData.shipping_state,
            shipping_country: quoteData.shipping_country,
            billing_address_line1: quoteData.billing_address_line1,
            billing_address_line2: quoteData.billing_address_line2,
            billing_city: quoteData.billing_city,
            billing_state: quoteData.billing_state,
            billing_country: quoteData.billing_country,
            expire_at: quoteData.expire_at,
            approval_status: quoteData.approval_status,
            approved_by: shouldUpdateApprovedAt ? userData.user.id : null,
            approved_at: shouldUpdateApprovedAt ? new Date().toISOString() : null
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        quoteId = newQuote.quote_id;

        // Insert items
        const { error: itemsError } = await supabase
          .from('quote_dtl')
          .insert(
            quoteData.items.map(item => ({
              quote_id: newQuote.quote_id,
              item_name: item.item_name,
              item_desc: item.item_desc,
              quantity: item.quantity,
              unit_price: item.unit_price,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              organization_id: quoteData.organization_id
            }))
          );

        if (itemsError) throw itemsError;

        // If this quote was converted from an opportunity, update the opportunity
        if (convertedFromOpportunity && opportunityId) {
          console.log("🟢 Debug - Updating Opportunity as Converted");
          const { error: opportunityError } = await supabase
            .from('opportunities')
            .update({
              is_converted: true,
              converted_to_id: newQuote.quote_id,
              converted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              updated_by: userData.user.id
            })
            .eq('id', opportunityId);

          if (opportunityError) {
            console.error('Warning: Failed to update opportunity conversion status:', opportunityError);
            // Continue with the flow even if this update fails - we don't want to fail the whole transaction
          } else {
            console.log(`Successfully marked opportunity ${opportunityId} as converted to quote ${newQuote.quote_id}`);
          }
        }
      }

      // Save custom field values
      if (userData.user) {
        for (const [fieldId, value] of Object.entries(customFields)) {
          const { error: valueError } = await supabase
            .from('custom_field_values')
            .upsert({
              organization_id: formData.organization_id,
              entity_id: quoteId,
              field_id: fieldId,
              value,
              created_by: userData.user.id,
              updated_by: userData.user.id,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'organization_id,field_id,entity_id'
            });

          if (valueError) {
            console.error('Error saving custom field value:', valueError);
          }
        }
      }

      navigate('/admin/quotes');
    } catch (err) {
      console.error('Error saving quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to save quote');
    } finally {
      setLoading(false);
    }
  };

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = quoteStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get approval status style
  const getApprovalStatusStyle = (status: string) => {
    const statusValue = approvalStatuses.find(s => s.value === status);
    if (!statusValue?.color) {
      // Default colors if not found in picklist
      if (status === 'Approved') return { backgroundColor: '#10B981', color: '#FFFFFF' };
      if (status === 'Rejected') return { backgroundColor: '#EF4444', color: '#FFFFFF' };
      if (status === 'Pending') return { backgroundColor: '#F59E0B', color: '#FFFFFF' };
      return {};
    }
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get current status index for the progress bar
  const getCurrentStatusIndex = () => {
    if (!formData.status || !quoteStatuses.length) return -1;
    return quoteStatuses.findIndex(status =>
      status.value.toLowerCase() === formData.status.toLowerCase()
    );
  };

  // Format a full address from components
  const formatAddress = (line1: string | null, line2: string | null, city: string | null, state: string | null, country: string | null) => {
    const parts = [];
    if (line1) parts.push(line1);
    if (line2) parts.push(line2);

    const cityStateCountry = [];
    if (city) cityStateCountry.push(city);
    if (state) cityStateCountry.push(state);
    if (cityStateCountry.length > 0) parts.push(cityStateCountry.join(', '));

    if (country) parts.push(country);

    return parts.length > 0 ? parts.join(', ') : 'No address provided';
  };

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <form onSubmit={handleSubmit}>
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigate('/admin/quotes')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Back to Quotes</span>
            </button>

            {/* Right buttons group */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Quote'}
              </button>
            </div>
          </div>

          {/* Card Header with Title and Status */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-teal-100 rounded-full p-2.5">
                    <FileText className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {id ? quoteNumber : (convertedFromOpportunity ? 'Convert to Quote' : 'New Quote')}
                    </h1>
                    <div className="flex items-center mt-1.5 space-x-3">
                      {convertedFromOpportunity && (
                        <span className="text-teal-600 text-sm">
                          Converted from Opportunity
                        </span>
                      )}

                      {/* Approval Status Badge - Editable */}
                      <div className="relative">
                        <select
                          value={formData.approval_status || 'Pending'}
                          onChange={(e) => setFormData(prev => ({ ...prev, approval_status: e.target.value }))}
                          className="px-3 py-1 text-xs font-medium rounded-full appearance-none cursor-pointer"
                          style={getApprovalStatusStyle(formData.approval_status || 'Pending')}
                        >
                          {approvalStatusOptions.length > 0 ? (
                            approvalStatusOptions.map(option => (
                              <option key={option.id} value={option.value}>
                                {option.value}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="Pending">Pending</option>
                              <option value="Approved">Approved</option>
                              <option value="Rejected">Rejected</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expiration Information */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-yellow-500" />
                    <span className="font-medium text-yellow-700">Expiration Date</span>
                  </div>
                  <input
                    type="datetime-local"
                    value={formData.expire_at || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, expire_at: e.target.value }))}
                    className="px-3 py-1 text-sm rounded-lg border border-yellow-300 bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  />
                </div>
              </div>

              {/* Status Bar */}
              <div className="mb-8 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                {quoteStatuses.length > 0 && (
                  <div className="relative pt-2">
                    {/* Progress bar track */}
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      {/* Progress bar fill - width based on current status */}
                      <div
                        className="absolute top-2 left-0 h-2 bg-teal-500 rounded-full"
                        style={{
                          width: `${(getCurrentStatusIndex() + 1) * 100 / quoteStatuses.length}%`,
                          transition: 'width 0.3s ease-in-out'
                        }}
                      ></div>
                    </div>

                    {/* Status indicators with dots */}
                    <div className="flex justify-between mt-1">
                      {quoteStatuses.map((status, index) => {
                        // Determine if this status is active (current or passed)
                        const isActive = index <= getCurrentStatusIndex();
                        // Position dots evenly
                        const position = index / (quoteStatuses.length - 1) * 100;

                        return (
                          <div
                            key={status.id}
                            className="flex flex-col items-center"
                            style={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)' }}
                          >
                            {/* Status dot */}
                            <div
                              className={`w-4 h-4 rounded-full border-2 border-white ${isActive ? 'bg-teal-500' : 'bg-gray-300'}`}
                              style={{
                                marginTop: '-10px',
                                boxShadow: '0 0 0 2px white'
                              }}
                            ></div>

                            {/* Status label */}
                            <div
                              onClick={() => setFormData(prev => ({ ...prev, status: status.value }))}
                              className={`text-sm font-medium mt-2 px-3 py-1 rounded-full transition-colors cursor-pointer ${isActive ? 'text-teal-700' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                              {status.label || status.value}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs Navigation */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'details'
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('approval')}
                    className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'approval'
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approval
                  </button>
                </nav>
              </div>

              {/* Details Tab Content */}
              {activeTab === 'details' && (
                <div className="space-y-8">
                  {/* Quote Items */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold flex items-center">
                        <Package className="w-5 h-5 text-teal-500 mr-2" />
                        Quote Items
                      </h2>
                      <div ref={productSearchRef} className="relative">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={selectedProductIndex === null ? productSearch : ''}
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
                            className="px-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductIndex(null);
                              setProductSearch('');
                              setShowProductDropdown(true);
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Product
                          </button>
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
                                        <Package className="w-4 h-4 text-gray-400 mr-2" />
                                        <div>
                                          <div className="font-medium">{product.name}</div>
                                          <div className="text-sm text-gray-500">
                                            Price: ${product.price.toFixed(2)}
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
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Item
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Unit Price
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {formData.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4">
                                <div>
                                  <input
                                    type="text"
                                    value={item.item_name || ''}
                                    onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                                    className="font-medium text-gray-900 w-full px-2 py-1 rounded border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
                                    required
                                  />
                                  <input
                                    type="text"
                                    value={item.item_desc || ''}
                                    onChange={(e) => updateItem(index, 'item_desc', e.target.value)}
                                    placeholder="Description"
                                    className="text-sm text-gray-500 w-full mt-1 px-2 py-1 rounded border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                  className="text-sm text-gray-900 w-20 px-2 py-1 rounded border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none text-right"
                                  required
                                />
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                  className="text-sm text-gray-900 w-24 px-2 py-1 rounded border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none text-right"
                                  required
                                />
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatCurrency(item.line_total)}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {formData.items.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                No items added yet. Search for products or add a new item.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          items: [
                            ...prev.items,
                            {
                              item_name: '',
                              item_desc: '',
                              quantity: 1,
                              unit_price: 0,
                              line_total: 0
                            }
                          ]
                        }));
                      }}
                      className="mt-4 w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-teal-500 hover:text-teal-500 transition-colors flex items-center justify-center"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Item
                    </button>
                  </div>

                  {/* Pricing Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tax and Discount */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Tag className="w-5 h-5 text-teal-500 mr-2" />
                        Tax & Discount
                      </h2>
                      <div className="space-y-4">
                        {/* Tax Section */}
                        <div>
                          <h3 className="text-md font-medium mb-2">Tax Details</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Tax Percentage:</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                max="100"
                                value={formData.tax_percent}
                                onChange={(e) => setFormData(prev => ({ ...prev, tax_percent: parseFloat(e.target.value) || 0 }))}
                                className="w-24 px-3 py-1 text-right rounded border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
                              />
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Tax Amount:</span>
                              <span className="text-sm text-gray-900">
                                {formatCurrency(formData.tax_amount)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-200 my-3"></div>

                        {/* Discount Section */}
                        <div>
                          <h3 className="text-md font-medium mb-2">Discount Details</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Discount Amount:</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.discount_amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
                                className="w-24 px-3 py-1 text-right rounded border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
                              />
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Discount Percentage:</span>
                              <span className="text-sm text-gray-900">
                                {formData.subtotal > 0 ? ((formData.discount_amount / formData.subtotal) * 100).toFixed(2) : '0.00'}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Total Summary */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <DollarSign className="w-5 h-5 text-teal-500 mr-2" />
                        Price Summary
                      </h2>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="text-gray-900 font-medium">
                            {formatCurrency(formData.subtotal)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Tax:</span>
                          <span className="text-gray-900">
                            {formatCurrency(formData.tax_amount)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Discount:</span>
                          <span className="text-gray-900">
                            -{formatCurrency(formData.discount_amount)}
                          </span>
                        </div>

                        <div className="border-t border-gray-200 pt-3 mt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">Total:</span>
                            <span className="text-lg font-bold text-teal-700">
                              {formatCurrency(formData.total_amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Information */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <User className="w-5 h-5 text-teal-500 mr-2" />
                        Customer Information
                      </h2>
                      <div ref={customerSearchRef} className="relative mb-4">
                        {selectedCustomer ? (
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center">
                              <User className="w-5 h-5 text-gray-400 mr-3" />
                              <div>
                                <div className="font-medium">
                                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                                </div>
                                {selectedCustomer.company && (
                                  <div className="text-sm text-gray-500">
                                    {selectedCustomer.company}
                                  </div>
                                )}
                                {selectedCustomer.email && (
                                  <div className="text-sm text-teal-600">
                                    {selectedCustomer.email}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(null);
                                setFormData(prev => ({ ...prev, customer_id: '' }));
                              }}
                              className="p-1 hover:bg-gray-200 rounded-full"
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
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
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
                    </div>

                    {/* Account Information */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Building2 className="w-5 h-5 text-teal-500 mr-2" />
                        Account Information
                      </h2>
                      <div ref={vendorSearchRef} className="relative mb-4">
                        {selectedVendor ? (
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center">
                              <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                              <div>
                                <div className="font-medium">{selectedVendor.name}</div>
                                <div className="text-sm text-gray-500">
                                  Type: {selectedVendor.type}
                                </div>
                                {selectedVendor.email && (
                                  <div className="text-sm text-teal-600">
                                    {selectedVendor.email}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVendor(null);
                                setFormData(prev => ({ ...prev, vendor_id: null }));
                              }}
                              className="p-1 hover:bg-gray-200 rounded-full"
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
                              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
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
                    </div>

                    {/* Owner Information */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <UserCheck className="w-5 h-5 text-teal-500 mr-2" />
                        Owner Information
                      </h2>
                      <UserSearch
                        organizationId={selectedOrganization?.id}
                        selectedUserId={formData.owner_id}
                        onSelect={(userId) => setFormData(prev => ({ ...prev, owner_id: userId }))}
                      />
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <FileText className="w-5 h-5 text-teal-500 mr-2" />
                        Notes
                      </h2>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={4}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                        placeholder="Add notes here..."
                      />
                    </div>
                  </div>

                  {/* Shipping & Billing Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Shipping Information */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <MapPin className="w-5 h-5 text-teal-500 mr-2" />
                        Shipping Information
                      </h2>

                      <div ref={shipToCustomerSearchRef} className="relative mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ship To Customer
                        </label>
                        {selectedShipToCustomer ? (
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center">
                              <User className="w-5 h-5 text-gray-400 mr-3" />
                              <div>
                                <div className="font-medium">
                                  {selectedShipToCustomer.first_name} {selectedShipToCustomer.last_name}
                                </div>
                                {selectedShipToCustomer.company && (
                                  <div className="text-sm text-gray-500">
                                    {selectedShipToCustomer.company}
                                  </div>
                                )}
                                {selectedShipToCustomer.email && (
                                  <div className="text-sm text-teal-600">
                                    {selectedShipToCustomer.email}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedShipToCustomer(null);
                                setFormData(prev => ({ ...prev, ship_to_customer_id: null }));
                              }}
                              className="p-1 hover:bg-gray-200 rounded-full"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              type="text"
                              value={shipToCustomerSearch}
                              onChange={(e) => {
                                setShipToCustomerSearch(e.target.value);
                                setShowShipToCustomerDropdown(true);
                                if (!customers.length) {
                                  fetchCustomers();
                                }
                              }}
                              onFocus={() => {
                                setShowShipToCustomerDropdown(true);
                                if (!customers.length) {
                                  fetchCustomers();
                                }
                              }}
                              placeholder="Search customers for shipping..."
                              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                            />
                          </div>
                        )}

                        <AnimatePresence>
                          {showShipToCustomerDropdown && shipToCustomerSearch && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
                            >
                              {filteredShipToCustomers.length > 0 ? (
                                <ul className="py-1 max-h-60 overflow-auto">
                                  {filteredShipToCustomers.map(customer => (
                                    <li
                                      key={customer.customer_id}
                                      onClick={() => handleShipToCustomerSelect(customer)}
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

                      <div className="space-y-3 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address Line 1
                          </label>
                          <input
                            id="shipping-address-line1"
                            type="text"
                            value={formData.shipping_address_line1 || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, shipping_address_line1: e.target.value }))}
                            placeholder="Type to search for an address"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address Line 2
                          </label>
                          <input
                            type="text"
                            value={formData.shipping_address_line2 || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, shipping_address_line2: e.target.value }))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              City
                            </label>
                            <input
                              type="text"
                              value={formData.shipping_city || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, shipping_city: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              State
                            </label>
                            <input
                              type="text"
                              value={formData.shipping_state || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, shipping_state: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country
                          </label>
                          <input
                            type="text"
                            value={formData.shipping_country || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, shipping_country: e.target.value }))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Billing Information */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center">
                          <CreditCard className="w-5 h-5 text-teal-500 mr-2" />
                          Billing Information
                        </h2>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={useShippingForBilling}
                            onChange={(e) => setUseShippingForBilling(e.target.checked)}
                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-600">Same as shipping</span>
                        </label>
                      </div>

                      <div ref={billToCustomerSearchRef} className="relative mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bill To Customer
                        </label>
                        {selectedBillToCustomer ? (
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center">
                              <User className="w-5 h-5 text-gray-400 mr-3" />
                              <div>
                                <div className="font-medium">
                                  {selectedBillToCustomer.first_name} {selectedBillToCustomer.last_name}
                                </div>
                                {selectedBillToCustomer.company && (
                                  <div className="text-sm text-gray-500">
                                    {selectedBillToCustomer.company}
                                  </div>
                                )}
                                {selectedBillToCustomer.email && (
                                  <div className="text-sm text-teal-600">
                                    {selectedBillToCustomer.email}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBillToCustomer(null);
                                setFormData(prev => ({ ...prev, bill_to_customer_id: null }));
                              }}
                              className="p-1 hover:bg-gray-200 rounded-full"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              type="text"
                              value={billToCustomerSearch}
                              onChange={(e) => {
                                setBillToCustomerSearch(e.target.value);
                                setShowBillToCustomerDropdown(true);
                                if (!customers.length) {
                                  fetchCustomers();
                                }
                              }}
                              onFocus={() => {
                                setShowBillToCustomerDropdown(true);
                                if (!customers.length) {
                                  fetchCustomers();
                                }
                              }}
                              placeholder="Search customers for billing..."
                              disabled={useShippingForBilling}
                              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                            />
                          </div>
                        )}

                        <AnimatePresence>
                          {!useShippingForBilling && showBillToCustomerDropdown && billToCustomerSearch && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
                            >
                              {filteredBillToCustomers.length > 0 ? (
                                <ul className="py-1 max-h-60 overflow-auto">
                                  {filteredBillToCustomers.map(customer => (
                                    <li
                                      key={customer.customer_id}
                                      onClick={() => handleBillToCustomerSelect(customer)}
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

                      <div className="space-y-3 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address Line 1
                          </label>
                          <input
                            id="billing-address-line1"
                            type="text"
                            value={formData.billing_address_line1 || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, billing_address_line1: e.target.value }))}
                            placeholder={!useShippingForBilling ? "Type to search for an address" : undefined}
                            disabled={useShippingForBilling}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address Line 2
                          </label>
                          <input
                            type="text"
                            value={formData.billing_address_line2 || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, billing_address_line2: e.target.value }))}
                            disabled={useShippingForBilling}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              City
                            </label>
                            <input
                              type="text"
                              value={formData.billing_city || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, billing_city: e.target.value }))}
                              disabled={useShippingForBilling}
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              State
                            </label>
                            <input
                              type="text"
                              value={formData.billing_state || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, billing_state: e.target.value }))}
                              disabled={useShippingForBilling}
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country
                          </label>
                          <input
                            type="text"
                            value={formData.billing_country || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, billing_country: e.target.value }))}
                            disabled={useShippingForBilling}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custom Fields */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Bookmark className="w-5 h-5 text-teal-500 mr-2" />
                      Custom Fields
                    </h2>
                    <CustomFieldsForm
                      entityType="quotes"
                      entityId={id}
                      organizationId={selectedOrganization?.id}
                      onChange={(values) => setCustomFields(values)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}