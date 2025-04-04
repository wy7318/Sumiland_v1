import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
  CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { CustomFieldsForm } from './CustomFieldsForm';
import { useOrganization } from '../../contexts/OrganizationContext';
import { UserSearch } from './UserSearch'; // Import UserSearch component
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
    if (id) {
      fetchQuote();
    } else if (selectedOrganization) {
      setFormData(prev => ({
        ...prev,
        organization_id: selectedOrganization.id
      }));
    }
  }, [id, selectedOrganization]);

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

        // ✅ NEW CODE: If this quote was converted from an opportunity, update the opportunity
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {id ? 'Edit Quote' : (convertedFromOpportunity ? 'Convert Opportunity to Quote' : 'Create New Quote')}
        </h1>
        {/* Show a badge if this is from an opportunity conversion */}
        {convertedFromOpportunity && (
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            Converted from Opportunity
          </div>
        )}
        <button
          onClick={() => navigate('/admin/quotes')}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
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
              Account
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

          {/* New field: Owner ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Owner
            </label>
            <UserSearch
              organizationId={selectedOrganization?.id}
              selectedUserId={formData.owner_id}
              onSelect={(userId) => setFormData(prev => ({ ...prev, owner_id: userId }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Approval Status
            </label>
            <select
              value={formData.approval_status || 'Pending'}
              onChange={(e) => setFormData(prev => ({ ...prev, approval_status: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
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

          {formData.approval_status === 'Approved' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approved By
              </label>
              <UserSearch
                organizationId={selectedOrganization?.id}
                selectedUserId={formData.approved_by}
                onSelect={(userId) => setFormData(prev => ({ ...prev, approved_by: userId }))}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiration Date
            </label>
            <input
              type="datetime-local"
              value={formData.expire_at || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, expire_at: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>
        </div>

        {/* Shipping Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-gray-600" />
            Shipping Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div ref={shipToCustomerSearchRef} className="relative md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ship To Customer
              </label>
              {selectedShipToCustomer ? (
                <div className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {selectedShipToCustomer.first_name} {selectedShipToCustomer.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{selectedShipToCustomer.email}</p>
                    {selectedShipToCustomer.company && (
                      <p className="text-sm text-gray-500">{selectedShipToCustomer.company}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedShipToCustomer(null);
                      setFormData(prev => ({ ...prev, ship_to_customer_id: null }));
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
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                id="shipping-address-line1"
                type="text"
                value={formData.shipping_address_line1 || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, shipping_address_line1: e.target.value }))}
                placeholder="Type to search for an address"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.shipping_address_line2 || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, shipping_address_line2: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.shipping_city || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, shipping_city: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
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
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                value={formData.shipping_country || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, shipping_country: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Billing Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-gray-600" />
              Billing Information
            </h2>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useShippingForBilling}
                onChange={(e) => setUseShippingForBilling(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">Same as shipping</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div ref={billToCustomerSearchRef} className="relative md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bill To Customer
              </label>
              {selectedBillToCustomer ? (
                <div className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {selectedBillToCustomer.first_name} {selectedBillToCustomer.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{selectedBillToCustomer.email}</p>
                    {selectedBillToCustomer.company && (
                      <p className="text-sm text-gray-500">{selectedBillToCustomer.company}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBillToCustomer(null);
                      setFormData(prev => ({ ...prev, bill_to_customer_id: null }));
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
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
              )}

              <AnimatePresence>
                {showBillToCustomerDropdown && billToCustomerSearch && (
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                id="billing-address-line1"
                type="text"
                value={formData.billing_address_line1 || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_address_line1: e.target.value }))}
                disabled={useShippingForBilling}
                placeholder={!useShippingForBilling ? "Type to search for an address" : undefined}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.billing_address_line2 || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_address_line2: e.target.value }))}
                disabled={useShippingForBilling}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.billing_city || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_city: e.target.value }))}
                disabled={useShippingForBilling}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
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
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
              />
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
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Quote Items Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Quote Items</h2>
            <div ref={productSearchRef} className="relative">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={selectedProductIndex === null ? '' : productSearch}
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
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductIndex(null);
                    setProductSearch('');
                    setShowProductDropdown(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
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

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={item.item_name || ''}
                      onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      required
                    />
                  </div>

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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                      ${item.line_total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

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
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-500 transition-colors flex items-center justify-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Item
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Percentage
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max="100"
                  value={formData.tax_percent}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_percent: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col items-end mt-4">
              <div className="w-full md:w-1/3 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${formData.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-${formData.discount_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({formData.tax_percent}%):</span>
                  <span>${formData.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>${formData.total_amount.toFixed(2)}</span>
                </div>
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
          entityType="quotes"
          entityId={id}
          organizationId={selectedOrganization?.id}
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