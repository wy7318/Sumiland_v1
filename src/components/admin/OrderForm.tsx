// import { useState, useEffect, useRef } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import { motion, AnimatePresence } from 'framer-motion';
// import {
//   Save,
//   X,
//   Plus,
//   Trash2,
//   Search,
//   Building2,
//   Package,
//   AlertCircle,
//   Calendar,
//   User,
//   Truck,
//   MapPin,
//   ClipboardList,
//   Box
// } from 'lucide-react';
// import { supabase } from '../../lib/supabase';
// import { cn } from '../../lib/utils';
// import { useAuth } from '../../contexts/AuthContext';
// import { CustomFieldsForm } from './CustomFieldsForm';
// import { useOrganization } from '../../contexts/OrganizationContext';
// import { Loader } from '@googlemaps/js-api-loader';
// import { UserSearch } from './UserSearch'; // Import UserSearch component

// type Customer = {
//   customer_id: string;
//   first_name: string;
//   last_name: string;
//   email: string;
//   phone: string | null;
//   company: string | null;
// };

// type Vendor = {
//   id: string;
//   name: string;
//   type: string;
//   email: string | null;
//   phone: string | null;
//   contact_person: string | null;
// };


// type Product = {
//   id: string;
//   name: string;
//   description: string | null;
//   price: number;
// };

// type OrderItem = {
//   product_id: string | null;
//   product_name?: string;
//   quantity: number;
//   unit_price: number;
//   subtotal: number;
//   notes?: string;
// };

// type FormData = {
//   customer_id: string;
//   vendor_id: string | null;
//   status: string;
//   payment_status: string;
//   payment_amount: number;
//   total_amount: number;
//   notes: string;
//   items: OrderItem[];
//   organization_id: string;
//   // New fields
//   owner_id: string | null;
//   po_number: string | null;
//   po_date: string | null;
//   bill_to_customer_id: string | null;
//   ship_to_customer_id: string | null;
//   shipping_address_line1: string | null;
//   shipping_address_line2: string | null;
//   shipping_city: string | null;
//   shipping_state: string | null;
//   shipping_country: string | null;
//   billing_address_line1: string | null;
//   billing_address_line2: string | null;
//   billing_city: string | null;
//   billing_state: string | null;
//   billing_country: string | null;
//   tracking_carrier: string | null;
//   tracking_number: string | null;
//   order_start_at: string | null;
//   order_end_at: string | null;
// };

// const initialFormData: FormData = {
//   customer_id: '',
//   vendor_id: null,
//   status: 'New',
//   payment_status: 'Pending',
//   payment_amount: 0,
//   total_amount: 0,
//   notes: '',
//   items: [],
//   organization_id: '',
//   // New fields with initial values
//   owner_id: null,
//   po_number: null,
//   po_date: null,
//   bill_to_customer_id: null,
//   ship_to_customer_id: null,
//   shipping_address_line1: null,
//   shipping_address_line2: null,
//   shipping_city: null,
//   shipping_state: null,
//   shipping_country: null,
//   billing_address_line1: null,
//   billing_address_line2: null,
//   billing_city: null,
//   billing_state: null,
//   billing_country: null,
//   tracking_carrier: null,
//   tracking_number: null,
//   order_start_at: null,
//   order_end_at: null
// };

// export function OrderForm() {
//   const navigate = useNavigate();
//   const { id } = useParams();
//   const { selectedOrganization } = useOrganization();
//   const { user } = useAuth();
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [formData, setFormData] = useState<FormData>(initialFormData);
//   const [customFields, setCustomFields] = useState<Record<string, any>>({});
  
//   // Search states
//   const [customerSearch, setCustomerSearch] = useState('');
//   const [vendorSearch, setVendorSearch] = useState('');
//   const [productSearch, setProductSearch] = useState('');
//   const [customers, setCustomers] = useState<Customer[]>([]);
//   const [vendors, setVendors] = useState<Vendor[]>([]);
//   const [products, setProducts] = useState<Product[]>([]);
//   const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
//   const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
//   const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
//   const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
//   const [showVendorDropdown, setShowVendorDropdown] = useState(false);
//   const [showProductDropdown, setShowProductDropdown] = useState(false);
//   const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
//   const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
//   const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);

//   // New states for additional fields
//   const [useShippingForBilling, setUseShippingForBilling] = useState(false);
//   const [shipToCustomerSearch, setShipToCustomerSearch] = useState('');
//   const [billToCustomerSearch, setBillToCustomerSearch] = useState('');
//   const [filteredShipToCustomers, setFilteredShipToCustomers] = useState<Customer[]>([]);
//   const [filteredBillToCustomers, setFilteredBillToCustomers] = useState<Customer[]>([]);
//   const [showShipToCustomerDropdown, setShowShipToCustomerDropdown] = useState(false);
//   const [showBillToCustomerDropdown, setShowBillToCustomerDropdown] = useState(false);
//   const [selectedShipToCustomer, setSelectedShipToCustomer] = useState<Customer | null>(null);
//   const [selectedBillToCustomer, setSelectedBillToCustomer] = useState<Customer | null>(null);
  
//   const customerSearchRef = useRef<HTMLDivElement>(null);
//   const vendorSearchRef = useRef<HTMLDivElement>(null);
//   const productSearchRef = useRef<HTMLDivElement>(null);
//   const shipToCustomerSearchRef = useRef<HTMLDivElement>(null);
//   const billToCustomerSearchRef = useRef<HTMLDivElement>(null);

//   // References for Google Maps Places Autocomplete
//   const shippingAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
//   const billingAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

//   // Load Google Maps API
//   useEffect(() => {
//     // Initialize Google Maps with the Loader
//     const loader = new Loader({
//       apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
//       version: "weekly",
//       libraries: ["places"]
//     });

//     loader.load().then(() => {
//       const shippingInput = document.getElementById('shipping-address-line1') as HTMLInputElement;
//       const billingInput = document.getElementById('billing-address-line1') as HTMLInputElement;

//       if (shippingInput) {
//         shippingAutocompleteRef.current = new google.maps.places.Autocomplete(shippingInput, {
//           types: ['address'],
//           fields: ['address_components', 'formatted_address']
//         });

//         shippingAutocompleteRef.current.addListener('place_changed', () => {
//           const place = shippingAutocompleteRef.current?.getPlace();
//           if (place?.address_components) {
//             updateAddressFromPlace(place, 'shipping');
//           }
//         });
//       }

//       if (billingInput && !useShippingForBilling) {
//         billingAutocompleteRef.current = new google.maps.places.Autocomplete(billingInput, {
//           types: ['address'],
//           fields: ['address_components', 'formatted_address']
//         });

//         billingAutocompleteRef.current.addListener('place_changed', () => {
//           const place = billingAutocompleteRef.current?.getPlace();
//           if (place?.address_components) {
//             updateAddressFromPlace(place, 'billing');
//           }
//         });
//       }
//     }).catch((error) => {
//       console.error('Error loading Google Maps:', error);
//     });
//   }, [useShippingForBilling]);

//   // Function to extract address components from Google Maps
//   const updateAddressFromPlace = (place: google.maps.places.PlaceResult, type: 'shipping' | 'billing') => {
//     let streetNumber = '';
//     let route = '';
//     let city = '';
//     let state = '';
//     let zipCode = '';
//     let country = '';

//     place.address_components?.forEach(component => {
//       const type = component.types[0];
//       switch (type) {
//         case 'street_number':
//           streetNumber = component.long_name;
//           break;
//         case 'route':
//           route = component.long_name;
//           break;
//         case 'locality':
//           city = component.long_name;
//           break;
//         case 'administrative_area_level_1':
//           state = component.short_name;
//           break;
//         case 'postal_code':
//           zipCode = component.long_name;
//           break;
//         case 'country':
//           country = component.long_name;
//           break;
//       }
//     });

//     setFormData(prev => ({
//       ...prev,
//       [`${type}_address_line1`]: `${streetNumber} ${route}`.trim(),
//       [`${type}_city`]: city,
//       [`${type}_state`]: state,
//       [`${type}_country`]: country
//     }));
//   };

//   useEffect(() => {
//     if (id) {
//       fetchOrder();
//     } else if (selectedOrganization) {
//       setFormData(prev => ({
//         ...prev,
//         organization_id: selectedOrganization.id
//       }));
//     }
//   }, [id, selectedOrganization]);

//   useEffect(() => {
//     if (customerSearch) {
//       const filtered = customers.filter(customer => 
//         customer.first_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
//         customer.last_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
//         customer.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
//         customer.company?.toLowerCase().includes(customerSearch.toLowerCase())
//       );
//       setFilteredCustomers(filtered);
//     } else {
//       setFilteredCustomers([]);
//     }
//   }, [customerSearch, customers]);

//   // Ship-to customer filter effect
//   useEffect(() => {
//     if (shipToCustomerSearch) {
//       const filtered = customers.filter(customer =>
//         customer.first_name.toLowerCase().includes(shipToCustomerSearch.toLowerCase()) ||
//         customer.last_name.toLowerCase().includes(shipToCustomerSearch.toLowerCase()) ||
//         customer.email.toLowerCase().includes(shipToCustomerSearch.toLowerCase()) ||
//         customer.company?.toLowerCase().includes(shipToCustomerSearch.toLowerCase())
//       );
//       setFilteredShipToCustomers(filtered);
//     } else {
//       setFilteredShipToCustomers([]);
//     }
//   }, [shipToCustomerSearch, customers]);

//   // Bill-to customer filter effect
//   useEffect(() => {
//     if (billToCustomerSearch) {
//       const filtered = customers.filter(customer =>
//         customer.first_name.toLowerCase().includes(billToCustomerSearch.toLowerCase()) ||
//         customer.last_name.toLowerCase().includes(billToCustomerSearch.toLowerCase()) ||
//         customer.email.toLowerCase().includes(billToCustomerSearch.toLowerCase()) ||
//         customer.company?.toLowerCase().includes(billToCustomerSearch.toLowerCase())
//       );
//       setFilteredBillToCustomers(filtered);
//     } else {
//       setFilteredBillToCustomers([]);
//     }
//   }, [billToCustomerSearch, customers]);


//   useEffect(() => {
//     if (vendorSearch) {
//       const filtered = vendors.filter(vendor => 
//         vendor.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
//         vendor.email?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
//         vendor.contact_person?.toLowerCase().includes(vendorSearch.toLowerCase())
//       );
//       setFilteredVendors(filtered);
//     } else {
//       setFilteredVendors([]);
//     }
//   }, [vendorSearch, vendors]);

//   useEffect(() => {
//     if (productSearch) {
//       const filtered = products.filter(product =>
//         product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
//         product.description?.toLowerCase().includes(productSearch.toLowerCase())
//       );
//       setFilteredProducts(filtered);
//     } else {
//       setFilteredProducts([]);
//     }
//   }, [productSearch, products]);

//   // Handle clicks outside dropdowns
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
//         setShowCustomerDropdown(false);
//       }
//       if (vendorSearchRef.current && !vendorSearchRef.current.contains(event.target as Node)) {
//         setShowVendorDropdown(false);
//       }
//       if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
//         setShowProductDropdown(false);
//       }
//       if (shipToCustomerSearchRef.current && !shipToCustomerSearchRef.current.contains(event.target as Node)) {
//         setShowShipToCustomerDropdown(false);
//       }
//       if (billToCustomerSearchRef.current && !billToCustomerSearchRef.current.contains(event.target as Node)) {
//         setShowBillToCustomerDropdown(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   // Shipping to billing address sync effect
//   useEffect(() => {
//     if (useShippingForBilling) {
//       setFormData(prev => ({
//         ...prev,
//         billing_address_line1: prev.shipping_address_line1,
//         billing_address_line2: prev.shipping_address_line2,
//         billing_city: prev.shipping_city,
//         billing_state: prev.shipping_state,
//         billing_country: prev.shipping_country
//       }));
//     }
//   }, [
//     useShippingForBilling,
//     formData.shipping_address_line1,
//     formData.shipping_address_line2,
//     formData.shipping_city,
//     formData.shipping_state,
//     formData.shipping_country
//   ]);

//   const fetchOrder = async () => {
//     try {
//       const { data: order, error } = await supabase
//         .from('order_hdr')
//         .select(`
//           *,
//           customer:customers(*),
//           vendor:vendors(*),
//           ship_to_customer:customers(customer_id, first_name, last_name, email, phone, company),
//           bill_to_customer:customers(customer_id, first_name, last_name, email, phone, company),
//           items:order_dtl(*)
//         `)
//         .eq('order_id', id)
//         .single();

//       if (error) throw error;
//       if (order) {
//         // Format datetime values for datetime-local input
//         const formatDateTime = (dateTimeString) => {
//           if (!dateTimeString) return null;
//           try {
//             // Parse ISO datetime and format to YYYY-MM-DDThh:mm
//             const date = new Date(dateTimeString);
//             return date.toISOString().slice(0, 16); // Gets YYYY-MM-DDThh:mm
//           } catch (err) {
//             console.error('Error formatting datetime:', err);
//             return null;
//           }
//         };
//         setFormData({
//           customer_id: order.customer_id,
//           vendor_id: order.vendor_id,
//           status: order.status,
//           payment_status: order.payment_status,
//           payment_amount: order.payment_amount,
//           total_amount: order.total_amount,
//           notes: order.notes || '',
//           items: order.items.map((item: any) => ({
//             product_id: item.product_id,
//             product_name: item.item_name,
//             quantity: item.quantity,
//             unit_price: item.unit_price,
//             subtotal: item.subtotal,
//             notes: item.notes
//           })),
//           organization_id: order.organization_id,

//           // New fields
//           owner_id: order.owner_id,
//           po_number: order.po_number || null,
//           po_date: formatDateTime(order.po_date),
//           bill_to_customer_id: order.bill_to_customer_id,
//           ship_to_customer_id: order.ship_to_customer_id,
//           shipping_address_line1: order.shipping_address_line1 || null,
//           shipping_address_line2: order.shipping_address_line2 || null,
//           shipping_city: order.shipping_city || null,
//           shipping_state: order.shipping_state || null,
//           shipping_country: order.shipping_country || null,
//           billing_address_line1: order.billing_address_line1 || null,
//           billing_address_line2: order.billing_address_line2 || null,
//           billing_city: order.billing_city || null,
//           billing_state: order.billing_state || null,
//           billing_country: order.billing_country || null,
//           tracking_carrier: order.tracking_carrier || null,
//           tracking_number: order.tracking_number || null,
//           order_start_at: formatDateTime(order.order_start_at),
//           order_end_at: formatDateTime(order.order_end_at)
//         });

//         // Set selected entities
//         if (order.customer) {
//           setSelectedCustomer(order.customer);
//         }
//         if (order.vendor) {
//           setSelectedVendor(order.vendor);
//         }
//         if (order.owner) {
//           setSelectedOwner(order.owner);
//         }
//         if (order.ship_to_customer) {
//           setSelectedShipToCustomer(order.ship_to_customer);
//         }
//         if (order.bill_to_customer) {
//           setSelectedBillToCustomer(order.bill_to_customer);
//         }

//         // Check if billing address matches shipping address
//         const shippingMatchesBilling =
//           order.billing_address_line1 === order.shipping_address_line1 &&
//           order.billing_address_line2 === order.shipping_address_line2 &&
//           order.billing_city === order.shipping_city &&
//           order.billing_state === order.shipping_state &&
//           order.billing_country === order.shipping_country;

//         setUseShippingForBilling(shippingMatchesBilling);
//       }
//     } catch (err) {
//       console.error('Error fetching order:', err);
//       setError('Failed to load order');
//       navigate('/admin/orders');
//     }
//   };

//   const fetchCustomers = async () => {
//     try {
//       const { data, error } = await supabase
//         .from('customers')
//         .select('*')
//         .eq('organization_id', selectedOrganization?.id)
//         .order('first_name');

//       if (error) throw error;
//       setCustomers(data || []);
//     } catch (err) {
//       console.error('Error fetching customers:', err);
//       setError('Failed to load customers');
//     }
//   };

//   const fetchVendors = async () => {
//     try {
//       const { data, error } = await supabase
//         .from('vendors')
//         .select('*')
//         .eq('organization_id', selectedOrganization?.id)
//         .order('name');

//       if (error) throw error;
//       setVendors(data || []);
//     } catch (err) {
//       console.error('Error fetching vendors:', err);
//       setError('Failed to load vendors');
//     }
//   };

//   const fetchProducts = async () => {
//     try {
//       const { data, error } = await supabase
//         .from('products')
//         .select('*')
//         .eq('organization_id', selectedOrganization?.id)
//         .eq('status', 'active')
//         .order('name');

//       if (error) throw error;
//       setProducts(data || []);
//     } catch (err) {
//       console.error('Error fetching products:', err);
//       setError('Failed to load products');
//     }
//   };


//   const handleCustomerSelect = (customer: Customer) => {
//     setSelectedCustomer(customer);
//     setFormData(prev => ({ ...prev, customer_id: customer.customer_id }));
//     setCustomerSearch('');
//     setShowCustomerDropdown(false);
//   };

//   const handleVendorSelect = (vendor: Vendor) => {
//     setSelectedVendor(vendor);
//     setFormData(prev => ({ ...prev, vendor_id: vendor.id }));
//     setVendorSearch('');
//     setShowVendorDropdown(false);
//   };

//   const handleShipToCustomerSelect = (customer: Customer) => {
//     setSelectedShipToCustomer(customer);
//     setFormData(prev => ({ ...prev, ship_to_customer_id: customer.customer_id }));
//     setShipToCustomerSearch('');
//     setShowShipToCustomerDropdown(false);
//   };

//   const handleBillToCustomerSelect = (customer: Customer) => {
//     setSelectedBillToCustomer(customer);
//     setFormData(prev => ({ ...prev, bill_to_customer_id: customer.customer_id }));
//     setBillToCustomerSearch('');
//     setShowBillToCustomerDropdown(false);
//   };



//   const handleProductSelect = (product: Product) => {
//     if (selectedProductIndex !== null) {
//       // Update existing item
//       setFormData(prev => ({
//         ...prev,
//         items: prev.items.map((item, index) => 
//           index === selectedProductIndex
//             ? {
//                 product_id: product.id,
//                 product_name: product.name,
//                 quantity: 1,
//                 unit_price: product.price,
//                 subtotal: product.price
//               }
//             : item
//         )
//       }));
//     } else {
//       // Add new item
//       setFormData(prev => ({
//         ...prev,
//         items: [
//           ...prev.items,
//           {
//             product_id: product.id,
//             product_name: product.name,
//             quantity: 1,
//             unit_price: product.price,
//             subtotal: product.price
//           }
//         ]
//       }));
//     }
//     setProductSearch('');
//     setShowProductDropdown(false);
//     setSelectedProductIndex(null);
//   };

//   const updateItem = (index: number, field: keyof OrderItem, value: any) => {
//     setFormData(prev => ({
//       ...prev,
//       items: prev.items.map((item, i) => {
//         if (i === index) {
//           const updatedItem = { ...item, [field]: value };
//           // Recalculate subtotal if quantity or unit_price changes
//           if (field === 'quantity' || field === 'unit_price') {
//             updatedItem.subtotal = updatedItem.quantity * updatedItem.unit_price;
//           }
//           return updatedItem;
//         }
//         return item;
//       })
//     }));
//   };

//   const removeItem = (index: number) => {
//     setFormData(prev => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index)
//     }));
//   };

//   const calculateTotal = () => {
//     return formData.items.reduce((sum, item) => sum + item.subtotal, 0);
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!formData.customer_id) {
//       setError('Please select a customer');
//       return;
//     }

//     setLoading(true);
//     setError(null);

//     try {
//       const total = calculateTotal();
//       const organizationId = selectedOrganization?.id;
//       const { data: orderNumberData, error: orderNumberError } = await supabase
//         .rpc('generate_order_number', { org_id: organizationId });

//       if (orderNumberError) throw orderNumberError;

//       const generatedOrderNumber = orderNumberData;

//       const { data: userData } = await supabase.auth.getUser();
//       if (!userData.user) throw new Error('Not authenticated');

//       // Prepare the billing address (copy from shipping if useShippingForBilling is true)
//       const billingAddressData = useShippingForBilling ? {
//         billing_address_line1: formData.shipping_address_line1,
//         billing_address_line2: formData.shipping_address_line2,
//         billing_city: formData.shipping_city,
//         billing_state: formData.shipping_state,
//         billing_country: formData.shipping_country
//       } : {
//         billing_address_line1: formData.billing_address_line1,
//         billing_address_line2: formData.billing_address_line2,
//         billing_city: formData.billing_city,
//         billing_state: formData.billing_state,
//         billing_country: formData.billing_country
//       };

//       const orderData = {
//         ...formData,
//         ...billingAddressData,
//         po_date: formData.po_date,
//         order_start_at: formData.order_start_at,
//         order_end_at: formData.order_end_at,
//         total_amount: total,
//         organization_id: selectedOrganization?.id
//       };

//       if (id) {
//         // Update existing order
//         const { error: updateError } = await supabase
//           .from('order_hdr')
//           .update({
//             customer_id: orderData.customer_id,
//             vendor_id: orderData.vendor_id,
//             status: orderData.status,
//             payment_status: orderData.payment_status,
//             payment_amount: orderData.payment_amount,
//             total_amount: orderData.total_amount,
//             notes: orderData.notes,
//             updated_at: new Date().toISOString(),

//             // New fields
//             owner_id: orderData.owner_id,
//             po_number: orderData.po_number,
//             po_date: orderData.po_date,
//             bill_to_customer_id: orderData.bill_to_customer_id,
//             ship_to_customer_id: orderData.ship_to_customer_id,
//             shipping_address_line1: orderData.shipping_address_line1,
//             shipping_address_line2: orderData.shipping_address_line2,
//             shipping_city: orderData.shipping_city,
//             shipping_state: orderData.shipping_state,
//             shipping_country: orderData.shipping_country,
//             billing_address_line1: orderData.billing_address_line1,
//             billing_address_line2: orderData.billing_address_line2,
//             billing_city: orderData.billing_city,
//             billing_state: orderData.billing_state,
//             billing_country: orderData.billing_country,
//             tracking_carrier: orderData.tracking_carrier,
//             tracking_number: orderData.tracking_number,
//             order_start_at: orderData.order_start_at,
//             order_end_at: orderData.order_end_at
//           })
//           .eq('order_id', id);

//         if (updateError) throw updateError;

//         // Delete existing items
//         const { error: deleteError } = await supabase
//           .from('order_dtl')
//           .delete()
//           .eq('order_id', id);

//         if (deleteError) throw deleteError;

//         // Insert new items
//         const { error: itemsError } = await supabase
//           .from('order_dtl')
//           .insert(
//             orderData.items.map(item => ({
//               order_id: id,
//               product_id: item.product_id,
//               item_name: item.product_name,
//               quantity: item.quantity,
//               unit_price: item.unit_price,
//               subtotal: item.subtotal,
//               notes: item.notes,
//               organization_id: orderData.organization_id
//             }))
//           );

//         if (itemsError) throw itemsError;
//       } else {
//         // Create new order
//         const { data: newOrder, error: insertError } = await supabase
//           .from('order_hdr')
//           .insert([{
//             order_number: generatedOrderNumber,
//             customer_id: formData.customer_id,
//             vendor_id: formData.vendor_id,
//             status: formData.status,
//             payment_status: formData.payment_status,
//             payment_amount: formData.payment_amount,
//             total_amount: total,
//             notes: formData.notes,
//             created_at: new Date().toISOString(),
//             created_by: userData.user.id,
//             updated_at: new Date().toISOString(),
//             updated_by: userData.user.id,
//             organization_id: organizationId,

//             // New fields
//             owner_id: orderData.owner_id,
//             po_number: orderData.po_number,
//             po_date: orderData.po_date,
//             bill_to_customer_id: orderData.bill_to_customer_id,
//             ship_to_customer_id: orderData.ship_to_customer_id,
//             shipping_address_line1: orderData.shipping_address_line1,
//             shipping_address_line2: orderData.shipping_address_line2,
//             shipping_city: orderData.shipping_city,
//             shipping_state: orderData.shipping_state,
//             shipping_country: orderData.shipping_country,
//             billing_address_line1: orderData.billing_address_line1,
//             billing_address_line2: orderData.billing_address_line2,
//             billing_city: orderData.billing_city,
//             billing_state: orderData.billing_state,
//             billing_country: orderData.billing_country,
//             tracking_carrier: orderData.tracking_carrier,
//             tracking_number: orderData.tracking_number,
//             order_start_at: orderData.order_start_at,
//             order_end_at: orderData.order_end_at
//           }])
//           .select()
//           .single();

//         if (insertError) throw insertError;

//         // Insert items
//         const { error: itemsError } = await supabase
//           .from('order_dtl')
//           .insert(
//             orderData.items.map(item => ({
//               order_id: newOrder.order_id,
//               product_id: item.product_id,
//               item_name: item.product_name,
//               quantity: item.quantity,
//               unit_price: item.unit_price,
//               subtotal: item.subtotal,
//               notes: item.notes,
//               created_at: new Date().toISOString(),
//               updated_at: new Date().toISOString(),
//               organization_id: orderData.organization_id
//             }))
//           );

//         if (itemsError) throw itemsError;
//       }

//       navigate('/admin/orders');
//     } catch (err) {
//       console.error('Error saving order:', err);
//       setError(err instanceof Error ? err.message : 'Failed to save order');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       className="bg-white rounded-lg shadow-md p-6"
//     >
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-bold">
//           {id ? 'Edit Order' : 'Create New Order'}
//         </h1>
//         <button
//           onClick={() => navigate('/admin/orders')}
//           className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
//         >
//           <X className="w-6 h-6" />
//         </button>
//       </div>

//       {error && (
//         <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
//           <AlertCircle className="w-5 h-5 mr-2" />
//           {error}
//         </div>
//       )}

//       <form onSubmit={handleSubmit} className="space-y-6">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <div ref={customerSearchRef} className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Customer *
//             </label>
//             {selectedCustomer ? (
//               <div className="flex items-center justify-between p-2 border rounded-lg">
//                 <div>
//                   <p className="font-medium">
//                     {selectedCustomer.first_name} {selectedCustomer.last_name}
//                   </p>
//                   <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
//                   {selectedCustomer.company && (
//                     <p className="text-sm text-gray-500">{selectedCustomer.company}</p>
//                   )}
//                 </div>
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setSelectedCustomer(null);
//                     setFormData(prev => ({ ...prev, customer_id: '' }));
//                   }}
//                   className="p-1 hover:bg-gray-100 rounded-full"
//                 >
//                   <X className="w-4 h-4" />
//                 </button>
//               </div>
//             ) : (
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
//                 <input
//                   type="text"
//                   value={customerSearch}
//                   onChange={(e) => {
//                     setCustomerSearch(e.target.value);
//                     setShowCustomerDropdown(true);
//                     if (!customers.length) {
//                       fetchCustomers();
//                     }
//                   }}
//                   onFocus={() => {
//                     setShowCustomerDropdown(true);
//                     if (!customers.length) {
//                       fetchCustomers();
//                     }
//                   }}
//                   placeholder="Search customers..."
//                   className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//                 />
//               </div>
//             )}

//             <AnimatePresence>
//               {showCustomerDropdown && customerSearch && (
//                 <motion.div
//                   initial={{ opacity: 0, y: -10 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   exit={{ opacity: 0, y: -10 }}
//                   className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
//                 >
//                   {filteredCustomers.length > 0 ? (
//                     <ul className="py-1 max-h-60 overflow-auto">
//                       {filteredCustomers.map(customer => (
//                         <li
//                           key={customer.customer_id}
//                           onClick={() => handleCustomerSelect(customer)}
//                           className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
//                         >
//                           <div className="font-medium">
//                             {customer.first_name} {customer.last_name}
//                           </div>
//                           <div className="text-sm text-gray-500">
//                             {customer.email}
//                           </div>
//                           {customer.company && (
//                             <div className="text-sm text-gray-500">
//                               {customer.company}
//                             </div>
//                           )}
//                         </li>
//                       ))}
//                     </ul>
//                   ) : (
//                     <div className="p-4 text-gray-500">
//                       No customers found
//                     </div>
//                   )}
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </div>

//           <div ref={vendorSearchRef} className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Account
//             </label>
//             {selectedVendor ? (
//               <div className="flex items-center justify-between p-2 border rounded-lg">
//                 <div>
//                   <p className="font-medium">{selectedVendor.name}</p>
//                   {selectedVendor.contact_person && (
//                     <p className="text-sm text-gray-500">
//                       Contact: {selectedVendor.contact_person}
//                     </p>
//                   )}
//                   {selectedVendor.email && (
//                     <p className="text-sm text-gray-500">{selectedVendor.email}</p>
//                   )}
//                 </div>
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setSelectedVendor(null);
//                     setFormData(prev => ({ ...prev, vendor_id: null }));
//                   }}
//                   className="p-1 hover:bg-gray-100 rounded-full"
//                 >
//                   <X className="w-4 h-4" />
//                 </button>
//               </div>
//             ) : (
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
//                 <input
//                   type="text"
//                   value={vendorSearch}
//                   onChange={(e) => {
//                     setVendorSearch(e.target.value);
//                     setShowVendorDropdown(true);
//                     if (!vendors.length) {
//                       fetchVendors();
//                     }
//                   }}
//                   onFocus={() => {
//                     setShowVendorDropdown(true);
//                     if (!vendors.length) {
//                       fetchVendors();
//                     }
//                   }}
//                   placeholder="Search accounts..."
//                   className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//                 />
//               </div>
//             )}

//             <AnimatePresence>
//               {showVendorDropdown && vendorSearch && (
//                 <motion.div
//                   initial={{ opacity: 0, y: -10 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   exit={{ opacity: 0, y: -10 }}
//                   className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
//                 >
//                   {filteredVendors.length > 0 ? (
//                     <ul className="py-1 max-h-60 overflow-auto">
//                       {filteredVendors.map(vendor => (
//                         <li
//                           key={vendor.id}
//                           onClick={() => handleVendorSelect(vendor)}
//                           className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
//                         >
//                           <div className="font-medium">{vendor.name}</div>
//                           {vendor.contact_person && (
//                             <div className="text-sm text-gray-500">
//                               Contact: {vendor.contact_person}
//                             </div>
//                           )}
//                           {vendor.email && (
//                             <div className="text-sm text-gray-500">
//                               {vendor.email}
//                             </div>
//                           )}
//                         </li>
//                       ))}
//                     </ul>
//                   ) : (
//                     <div className="p-4 text-gray-500">
//                       No accounts found
//                     </div>
//                   )}
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </div>

//           {/* New field: Owner ID */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Owner
//             </label>
//             <UserSearch
//               organizationId={selectedOrganization?.id}
//               selectedUserId={formData.owner_id}
//               onSelect={(userId) => setFormData(prev => ({ ...prev, owner_id: userId }))}
//             />
//           </div>

//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 PO Number
//               </label>
//               <input
//                 type="text"
//                 value={formData.po_number || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, po_number: e.target.value }))}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 PO Date
//               </label>
//               <input
//                 type="datetime-local"
//                 value={formData.po_date || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, po_date: e.target.value }))}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//               />
//             </div>
//           </div>

//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Start Date
//               </label>
//               <input
//                 type="datetime-local"
//                 value={formData.order_start_at || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, order_start_at: e.target.value }))}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 End Date
//               </label>
//               <input
//                 type="datetime-local"
//                 value={formData.order_end_at || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, order_end_at: e.target.value }))}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//               />
//             </div>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Status
//             </label>
//             <select
//               value={formData.status}
//               onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
//               className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//             >
//               <option value="New">New</option>
//               <option value="In Progress">In Progress</option>
//               <option value="In Review">In Review</option>
//               <option value="Completed">Completed</option>
//               <option value="Cancelled">Cancelled</option>
//             </select>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Payment Status
//             </label>
//             <select
//               value={formData.payment_status}
//               onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
//               className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//             >
//               <option value="Pending">Pending</option>
//               <option value="Partial Received">Partial Received</option>
//               <option value="Fully Received">Fully Received</option>
//             </select>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Payment Amount
//             </label>
//             <input
//               type="number"
//               min="0"
//               step="0.01"
//               value={formData.payment_amount}
//               onChange={(e) => setFormData(prev => ({ ...prev, payment_amount: parseFloat(e.target.value) || 0 }))}
//               className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//             />
//           </div>
//         </div>

//         {/* Shipping Information Section */}
//         <div className="bg-white rounded-lg border border-gray-200 p-4">
//           <h2 className="text-lg font-semibold mb-4 flex items-center">
//             <MapPin className="w-5 h-5 mr-2 text-gray-600" />
//             Shipping Information
//           </h2>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div ref={shipToCustomerSearchRef} className="relative md:col-span-2">
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Ship To Customer
//               </label>
//               {selectedShipToCustomer ? (
//                 <div className="flex items-center justify-between p-2 border rounded-lg">
//                   <div>
//                     <p className="font-medium">
//                       {selectedShipToCustomer.first_name} {selectedShipToCustomer.last_name}
//                     </p>
//                     <p className="text-sm text-gray-500">{selectedShipToCustomer.email}</p>
//                     {selectedShipToCustomer.company && (
//                       <p className="text-sm text-gray-500">{selectedShipToCustomer.company}</p>
//                     )}
//                   </div>
//                   <button
//                     type="button"
//                     onClick={() => {
//                       setSelectedShipToCustomer(null);
//                       setFormData(prev => ({ ...prev, ship_to_customer_id: null }));
//                     }}
//                     className="p-1 hover:bg-gray-100 rounded-full"
//                   >
//                     <X className="w-4 h-4" />
//                   </button>
//                 </div>
//               ) : (
//                 <div className="relative">
//                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
//                   <input
//                     type="text"
//                     value={shipToCustomerSearch}
//                     onChange={(e) => {
//                       setShipToCustomerSearch(e.target.value);
//                       setShowShipToCustomerDropdown(true);
//                       if (!customers.length) {
//                         fetchCustomers();
//                       }
//                     }}
//                     onFocus={() => {
//                       setShowShipToCustomerDropdown(true);
//                       if (!customers.length) {
//                         fetchCustomers();
//                       }
//                     }}
//                     placeholder="Search customers for shipping..."
//                     className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//                   />
//                 </div>
//               )}

//               <AnimatePresence>
//                 {showShipToCustomerDropdown && shipToCustomerSearch && (
//                   <motion.div
//                     initial={{ opacity: 0, y: -10 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     exit={{ opacity: 0, y: -10 }}
//                     className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
//                   >
//                     {filteredShipToCustomers.length > 0 ? (
//                       <ul className="py-1 max-h-60 overflow-auto">
//                         {filteredShipToCustomers.map(customer => (
//                           <li
//                             key={customer.customer_id}
//                             onClick={() => handleShipToCustomerSelect(customer)}
//                             className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
//                           >
//                             <div className="font-medium">
//                               {customer.first_name} {customer.last_name}
//                             </div>
//                             <div className="text-sm text-gray-500">
//                               {customer.email}
//                             </div>
//                             {customer.company && (
//                               <div className="text-sm text-gray-500">
//                                 {customer.company}
//                               </div>
//                             )}
//                           </li>
//                         ))}
//                       </ul>
//                     ) : (
//                       <div className="p-4 text-gray-500">
//                         No customers found
//                       </div>
//                     )}
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>

//             <div className="md:col-span-2">
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Address Line 1
//               </label>
//               <input
//                 id="shipping-address-line1"
//                 type="text"
//                 value={formData.shipping_address_line1 || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, shipping_address_line1: e.target.value }))}
//                 placeholder="Type to search for an address"
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//               />
//             </div>

//             <div className="md:col-span-2">
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Address Line 2
//               </label>
//               <input
//                 type="text"
//                 value={formData.shipping_address_line2 || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, shipping_address_line2: e.target.value }))}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 City
//               </label>
//               <input
//                 type="text"
//                 value={formData.shipping_city || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, shipping_city: e.target.value }))}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 State
//               </label>
//               <input
//                 type="text"
//                 value={formData.shipping_state || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, shipping_state: e.target.value }))}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Country
//               </label>
//               <input
//                 type="text"
//                 value={formData.shipping_country || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, shipping_country: e.target.value }))}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Billing Information Section */}
//         <div className="bg-white rounded-lg border border-gray-200 p-4">
//           <div className="flex items-center justify-between mb-4">
//             <h2 className="text-lg font-semibold flex items-center">
//               <Building2 className="w-5 h-5 mr-2 text-gray-600" />
//               Billing Information
//             </h2>
//             <label className="flex items-center space-x-2">
//               <input
//                 type="checkbox"
//                 checked={useShippingForBilling}
//                 onChange={(e) => setUseShippingForBilling(e.target.checked)}
//                 className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
//               />
//               <span className="text-sm text-gray-600">Same as shipping</span>
//             </label>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div ref={billToCustomerSearchRef} className="relative md:col-span-2">
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Bill To Customer
//               </label>
//               {selectedBillToCustomer ? (
//                 <div className="flex items-center justify-between p-2 border rounded-lg">
//                   <div>
//                     <p className="font-medium">
//                       {selectedBillToCustomer.first_name} {selectedBillToCustomer.last_name}
//                     </p>
//                     <p className="text-sm text-gray-500">{selectedBillToCustomer.email}</p>
//                     {selectedBillToCustomer.company && (
//                       <p className="text-sm text-gray-500">{selectedBillToCustomer.company}</p>
//                     )}
//                   </div>
//                   <button
//                     type="button"
//                     onClick={() => {
//                       setSelectedBillToCustomer(null);
//                       setFormData(prev => ({ ...prev, bill_to_customer_id: null }));
//                     }}
//                     className="p-1 hover:bg-gray-100 rounded-full"
//                   >
//                     <X className="w-4 h-4" />
//                   </button>
//                 </div>
//               ) : (
//                 <div className="relative">
//                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
//                   <input
//                     type="text"
//                     value={billToCustomerSearch}
//                     onChange={(e) => {
//                       setBillToCustomerSearch(e.target.value);
//                       setShowBillToCustomerDropdown(true);
//                       if (!customers.length) {
//                         fetchCustomers();
//                       }
//                     }}
//                     onFocus={() => {
//                       setShowBillToCustomerDropdown(true);
//                       if (!customers.length) {
//                         fetchCustomers();
//                       }
//                     }}
//                     placeholder="Search customers for billing..."
//                     className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//                   />
//                 </div>
//               )}

//               <AnimatePresence>
//                 {showBillToCustomerDropdown && billToCustomerSearch && (
//                   <motion.div
//                     initial={{ opacity: 0, y: -10 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     exit={{ opacity: 0, y: -10 }}
//                     className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
//                   >
//                     {filteredBillToCustomers.length > 0 ? (
//                       <ul className="py-1 max-h-60 overflow-auto">
//                         {filteredBillToCustomers.map(customer => (
//                           <li
//                             key={customer.customer_id}
//                             onClick={() => handleBillToCustomerSelect(customer)}
//                             className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
//                           >
//                             <div className="font-medium">
//                               {customer.first_name} {customer.last_name}
//                             </div>
//                             <div className="text-sm text-gray-500">
//                               {customer.email}
//                             </div>
//                             {customer.company && (
//                               <div className="text-sm text-gray-500">
//                                 {customer.company}
//                               </div>
//                             )}
//                           </li>
//                         ))}
//                       </ul>
//                     ) : (
//                       <div className="p-4 text-gray-500">
//                         No customers found
//                       </div>
//                     )}
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>

//             <div className="md:col-span-2">
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Address Line 1
//               </label>
//               <input
//                 id="billing-address-line1"
//                 type="text"
//                 value={formData.billing_address_line1 || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, billing_address_line1: e.target.value }))}
//                 disabled={useShippingForBilling}
//                 placeholder={!useShippingForBilling ? "Type to search for an address" : undefined}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
//               />
//             </div>

//             <div className="md:col-span-2">
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Address Line 2
//               </label>
//               <input
//                 type="text"
//                 value={formData.billing_address_line2 || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, billing_address_line2: e.target.value }))}
//                 disabled={useShippingForBilling}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 City
//               </label>
//               <input
//                 type="text"
//                 value={formData.billing_city || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, billing_city: e.target.value }))}
//                 disabled={useShippingForBilling}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 State
//               </label>
//               <input
//                 type="text"
//                 value={formData.billing_state || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, billing_state: e.target.value }))}
//                 disabled={useShippingForBilling}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Country
//               </label>
//               <input
//                 type="text"
//                 value={formData.billing_country || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, billing_country: e.target.value }))}
//                 disabled={useShippingForBilling}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Tracking Information Section */}
//         <div className="bg-white rounded-lg border border-gray-200 p-4">
//           <h2 className="text-lg font-semibold mb-4 flex items-center">
//             <Truck className="w-5 h-5 mr-2 text-gray-600" />
//             Tracking Information
//           </h2>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Carrier
//               </label>
//               <input
//                 type="text"
//                 value={formData.tracking_carrier || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, tracking_carrier: e.target.value }))}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//                 placeholder="UPS, FedEx, USPS, etc."
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Tracking Number
//               </label>
//               <input
//                 type="text"
//                 value={formData.tracking_number || ''}
//                 onChange={(e) => setFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//               />
//             </div>
//           </div>
//         </div>

//         <div className="border-t border-gray-200 pt-6">
//           <div className="flex justify-between items-center mb-4">
//             <h2 className="text-lg font-semibold">Order Items</h2>
//             <div ref={productSearchRef} className="relative">
//               <div className="flex items-center gap-2">
//                 <input
//                   type="text"
//                   value={selectedProductIndex === null ? '' : productSearch}
//                   onChange={(e) => {
//                     setProductSearch(e.target.value);
//                     setShowProductDropdown(true);
//                     if (!products.length) {
//                       fetchProducts();
//                     }
//                   }}
//                   onFocus={() => {
//                     setShowProductDropdown(true);
//                     if (!products.length) {
//                       fetchProducts();
//                     }
//                   }}
//                   placeholder="Search products..."
//                   className="w-64 px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setSelectedProductIndex(null);
//                     setProductSearch('');
//                     setShowProductDropdown(true);
//                   }}
//                   className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
//                 >
//                   <Plus className="w-4 h-4 mr-2" />
//                   Add Product
//                 </button>
//               </div>

//               <AnimatePresence>
//                 {showProductDropdown && productSearch && (
//                   <motion.div
//                     initial={{ opacity: 0, y: -10 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     exit={{ opacity: 0, y: -10 }}
//                     className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
//                   >
//                     {filteredProducts.length > 0 ? (
//                       <ul className="py-1 max-h-60 overflow-auto">
//                         {filteredProducts.map(product => (
//                           <li
//                             key={product.id}
//                             onClick={() => handleProductSelect(product)}
//                             className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
//                           >
//                             <div className="flex items-center">
//                               <Package className="w-4 h-4 text-gray-400 mr-2" />
//                               <div>
//                                 <div className="font-medium">{product.name}</div>
//                                 <div className="text-sm text-gray-500">
//                                   Price: ${product.price.toFixed(2)}
//                                 </div>
//                               </div>
//                             </div>
//                           </li>
//                         ))}
//                       </ul>
//                     ) : (
//                       <div className="p-4 text-gray-500">
//                         No products found
//                       </div>
//                     )}
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>
//           </div>

//           <div className="space-y-4">
//             {formData.items.map((item, index) => (
//               <div key={index} className="bg-gray-50 p-4 rounded-lg">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Item Name *
//                     </label>
//                     <input
//                       type="text"
//                       value={item.product_name || ''}
//                       onChange={(e) => updateItem(index, 'product_name', e.target.value)}
//                       className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//                       required
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Quantity *
//                     </label>
//                     <input
//                       type="number"
//                       min="1"
//                       value={item.quantity}
//                       onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
//                       className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//                       required
//                     />
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Unit Price *
//                     </label>
//                     <input
//                       type="number"
//                       min="0"
//                       step="0.01"
//                       value={item.unit_price}
//                       onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
//                       className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//                       required
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Notes
//                     </label>
//                     <input
//                       type="text"
//                       value={item.notes || ''}
//                       onChange={(e) => updateItem(index, 'notes', e.target.value)}
//                       className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//                     />
//                   </div>
//                 </div>

//                 <div className="mt-4 flex justify-between items-center">
//                   <button
//                     type="button"
//                     onClick={() => removeItem(index)}
//                     className="text-red-600 hover:text-red-700"
//                   >
//                     <Trash2 className="w-5 h-5" />
//                   </button>
//                   <div className="text-right">
//                     <span className="text-sm text-gray-500">Subtotal:</span>
//                     <span className="ml-2 font-medium">
//                       ${item.subtotal.toFixed(2)}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             ))}

//             <button
//               type="button"
//               onClick={() => {
//                 setFormData(prev => ({
//                   ...prev,
//                   items: [
//                     ...prev.items,
//                     {
//                       product_id: null,
//                       product_name: '',
//                       quantity: 1,
//                       unit_price: 0,
//                       subtotal: 0
//                     }
//                   ]
//                 }));
//               }}
//               className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-500 hover:text-orange-500 transition-colors flex items-center justify-center"
//             >
//               <Plus className="w-5 h-5 mr-2" />
//               Add Item
//             </button>

//             <div className="flex justify-end">
//               <div className="text-right">
//                 <div className="text-sm text-gray-500">Total: ${calculateTotal().toFixed(2)}</div>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Notes
//           </label>
//           <textarea
//             value={formData.notes}
//             onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
//             rows={4}
//             className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
//           />
//         </div>

//         <CustomFieldsForm
//           entityType="orders"
//           entityId={id}
//           organizationId={selectedOrganization?.id}
//           onChange={(values) => setCustomFields(values)}
//           className="border-t border-gray-200 pt-6"
//         />

//         <div className="flex justify-end space-x-4">
//           <button
//             type="button"
//             onClick={() => navigate('/admin/orders')}
//             className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
//           >
//             Cancel
//           </button>
//           <button
//             type="submit"
//             disabled={loading}
//             className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center"
//           >
//             <Save className="w-4 h-4 mr-2" />
//             {loading ? 'Saving...' : 'Save Order'}
//           </button>
//         </div>
//       </form>
//     </motion.div>
//   );
// }



import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  X,
  Plus,
  Trash2,
  Search,
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Calendar,
  FileText,
  DollarSign,
  User,
  CheckCircle,
  Package,
  Truck,
  MapPin,
  ClipboardList,
  Box,
  FileBarChart2,
  LinkIcon,
  Briefcase,
  MessageSquare,
  CreditCard,
  Tag,
  UserCheck,
  Clock,
  AlertCircle,
  Bookmark
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency, formatDateTime } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { CustomFieldsForm } from './CustomFieldsForm';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Loader } from '@googlemaps/js-api-loader';
import { UserSearch } from './UserSearch';

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

type OrderItem = {
  product_id: string | null;
  product_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
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

type FormData = {
  customer_id: string;
  vendor_id: string | null;
  status: string;
  payment_status: string;
  payment_amount: number;
  total_amount: number;
  notes: string;
  items: OrderItem[];
  organization_id: string;
  // New fields
  owner_id: string | null;
  po_number: string | null;
  po_date: string | null;
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
  tracking_carrier: string | null;
  tracking_number: string | null;
  order_start_at: string | null;
  order_end_at: string | null;
};

const initialFormData: FormData = {
  customer_id: '',
  vendor_id: null,
  status: 'New',
  payment_status: 'Pending',
  payment_amount: 0,
  total_amount: 0,
  notes: '',
  items: [],
  organization_id: '',
  // New fields with initial values
  owner_id: null,
  po_number: null,
  po_date: null,
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
  tracking_carrier: null,
  tracking_number: null,
  order_start_at: null,
  order_end_at: null
};

export function OrderForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { selectedOrganization } = useOrganization();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [orderNumber, setOrderNumber] = useState<string>('New Order');

  // Tab state
  const [activeTab, setActiveTab] = useState('details');

  // Status
  const [orderStatuses, setOrderStatuses] = useState<PicklistValue[]>([]);

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

  // Refs
  const customerSearchRef = useRef<HTMLDivElement>(null);
  const vendorSearchRef = useRef<HTMLDivElement>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);
  const shipToCustomerSearchRef = useRef<HTMLDivElement>(null);
  const billToCustomerSearchRef = useRef<HTMLDivElement>(null);

  // References for Google Maps Places Autocomplete
  const shippingAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const billingAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    fetchPicklists();
    if (id) {
      fetchOrder();
    } else if (selectedOrganization) {
      setFormData(prev => ({
        ...prev,
        organization_id: selectedOrganization.id
      }));
    }
  }, [id, selectedOrganization]);

  const fetchPicklists = async () => {
    try {
      // Fetch order statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'order_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setOrderStatuses(statusData || []);
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

  const fetchOrder = async () => {
    try {
      const { data: order, error } = await supabase
        .from('order_hdr')
        .select(`
          *,
          customer:customers(*),
          vendor:vendors(*),
          ship_to_customer:customers(customer_id, first_name, last_name, email, phone, company),
          bill_to_customer:customers(customer_id, first_name, last_name, email, phone, company),
          items:order_dtl(*)
        `)
        .eq('order_id', id)
        .single();

      if (error) throw error;
      if (order) {
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

        setOrderNumber(order.order_number || 'New Order');

        setFormData({
          customer_id: order.customer_id,
          vendor_id: order.vendor_id,
          status: order.status,
          payment_status: order.payment_status,
          payment_amount: order.payment_amount,
          total_amount: order.total_amount,
          notes: order.notes || '',
          items: order.items.map((item: any) => ({
            product_id: item.product_id,
            product_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            notes: item.notes
          })),
          organization_id: order.organization_id,

          // New fields
          owner_id: order.owner_id,
          po_number: order.po_number || null,
          po_date: formatDateTime(order.po_date),
          bill_to_customer_id: order.bill_to_customer_id,
          ship_to_customer_id: order.ship_to_customer_id,
          shipping_address_line1: order.shipping_address_line1 || null,
          shipping_address_line2: order.shipping_address_line2 || null,
          shipping_city: order.shipping_city || null,
          shipping_state: order.shipping_state || null,
          shipping_country: order.shipping_country || null,
          billing_address_line1: order.billing_address_line1 || null,
          billing_address_line2: order.billing_address_line2 || null,
          billing_city: order.billing_city || null,
          billing_state: order.billing_state || null,
          billing_country: order.billing_country || null,
          tracking_carrier: order.tracking_carrier || null,
          tracking_number: order.tracking_number || null,
          order_start_at: formatDateTime(order.order_start_at),
          order_end_at: formatDateTime(order.order_end_at)
        });

        // Set selected entities
        if (order.customer) {
          setSelectedCustomer(order.customer);
        }
        if (order.vendor) {
          setSelectedVendor(order.vendor);
        }
        if (order.ship_to_customer) {
          setSelectedShipToCustomer(order.ship_to_customer);
        }
        if (order.bill_to_customer) {
          setSelectedBillToCustomer(order.bill_to_customer);
        }

        // Check if billing address matches shipping address
        const shippingMatchesBilling =
          order.billing_address_line1 === order.shipping_address_line1 &&
          order.billing_address_line2 === order.shipping_address_line2 &&
          order.billing_city === order.shipping_city &&
          order.billing_state === order.shipping_state &&
          order.billing_country === order.shipping_country;

        setUseShippingForBilling(shippingMatchesBilling);
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to load order');
      navigate('/admin/orders');
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
              product_id: product.id,
              product_name: product.name,
              quantity: 1,
              unit_price: product.price,
              subtotal: product.price
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
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            unit_price: product.price,
            subtotal: product.price
          }
        ]
      }));
    }
    setProductSearch('');
    setShowProductDropdown(false);
    setSelectedProductIndex(null);
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          // Recalculate subtotal if quantity or unit_price changes
          if (field === 'quantity' || field === 'unit_price') {
            updatedItem.subtotal = updatedItem.quantity * updatedItem.unit_price;
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

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = orderStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get current status index for the progress bar
  const getCurrentStatusIndex = () => {
    if (!formData.status || !orderStatuses.length) return -1;
    return orderStatuses.findIndex(status =>
      status.value.toLowerCase() === formData.status.toLowerCase()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) {
      setError('Please select a customer');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const total = calculateTotal();
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

      const orderData = {
        ...formData,
        ...billingAddressData,
        po_date: formData.po_date,
        order_start_at: formData.order_start_at,
        order_end_at: formData.order_end_at,
        total_amount: total,
        organization_id: selectedOrganization?.id
      };

      if (id) {
        // Update existing order
        const { error: updateError } = await supabase
          .from('order_hdr')
          .update({
            customer_id: orderData.customer_id,
            vendor_id: orderData.vendor_id,
            status: orderData.status,
            payment_status: orderData.payment_status,
            payment_amount: orderData.payment_amount,
            total_amount: orderData.total_amount,
            notes: orderData.notes,
            updated_at: new Date().toISOString(),

            // New fields
            owner_id: orderData.owner_id,
            po_number: orderData.po_number,
            po_date: orderData.po_date,
            bill_to_customer_id: orderData.bill_to_customer_id,
            ship_to_customer_id: orderData.ship_to_customer_id,
            shipping_address_line1: orderData.shipping_address_line1,
            shipping_address_line2: orderData.shipping_address_line2,
            shipping_city: orderData.shipping_city,
            shipping_state: orderData.shipping_state,
            shipping_country: orderData.shipping_country,
            billing_address_line1: orderData.billing_address_line1,
            billing_address_line2: orderData.billing_address_line2,
            billing_city: orderData.billing_city,
            billing_state: orderData.billing_state,
            billing_country: orderData.billing_country,
            tracking_carrier: orderData.tracking_carrier,
            tracking_number: orderData.tracking_number,
            order_start_at: orderData.order_start_at,
            order_end_at: orderData.order_end_at
          })
          .eq('order_id', id);

        if (updateError) throw updateError;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('order_dtl')
          .delete()
          .eq('order_id', id);

        if (deleteError) throw deleteError;

        // Insert new items
        const { error: itemsError } = await supabase
          .from('order_dtl')
          .insert(
            orderData.items.map(item => ({
              order_id: id,
              product_id: item.product_id,
              item_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
              notes: item.notes,
              organization_id: orderData.organization_id
            }))
          );

        if (itemsError) throw itemsError;
      } else {
        // Create new order
        const { data: orderNumberData, error: orderNumberError } = await supabase
          .rpc('generate_order_number', { org_id: organizationId });

        if (orderNumberError) throw orderNumberError;

        const generatedOrderNumber = orderNumberData;

        const { data: newOrder, error: insertError } = await supabase
          .from('order_hdr')
          .insert([{
            order_number: generatedOrderNumber,
            customer_id: formData.customer_id,
            vendor_id: formData.vendor_id,
            status: formData.status,
            payment_status: formData.payment_status,
            payment_amount: formData.payment_amount,
            total_amount: total,
            notes: formData.notes,
            created_at: new Date().toISOString(),
            created_by: userData.user.id,
            updated_at: new Date().toISOString(),
            updated_by: userData.user.id,
            organization_id: organizationId,

            // New fields
            owner_id: orderData.owner_id,
            po_number: orderData.po_number,
            po_date: orderData.po_date,
            bill_to_customer_id: orderData.bill_to_customer_id,
            ship_to_customer_id: orderData.ship_to_customer_id,
            shipping_address_line1: orderData.shipping_address_line1,
            shipping_address_line2: orderData.shipping_address_line2,
            shipping_city: orderData.shipping_city,
            shipping_state: orderData.shipping_state,
            shipping_country: orderData.shipping_country,
            billing_address_line1: orderData.billing_address_line1,
            billing_address_line2: orderData.billing_address_line2,
            billing_city: orderData.billing_city,
            billing_state: orderData.billing_state,
            billing_country: orderData.billing_country,
            tracking_carrier: orderData.tracking_carrier,
            tracking_number: orderData.tracking_number,
            order_start_at: orderData.order_start_at,
            order_end_at: orderData.order_end_at
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        // Insert items
        const { error: itemsError } = await supabase
          .from('order_dtl')
          .insert(
            orderData.items.map(item => ({
              order_id: newOrder.order_id,
              product_id: item.product_id,
              item_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
              notes: item.notes,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              organization_id: orderData.organization_id
            }))
          );

        if (itemsError) throw itemsError;
      }

      // Save custom field values
      if (userData.user) {
        for (const [fieldId, value] of Object.entries(customFields)) {
          const { error: valueError } = await supabase
            .from('custom_field_values')
            .upsert({
              organization_id: formData.organization_id,
              entity_id: id || newOrder.order_id,
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

      navigate('/admin/orders');
    } catch (err) {
      console.error('Error saving order:', err);
      setError(err instanceof Error ? err.message : 'Failed to save order');
    } finally {
      setLoading(false);
    }
  };

  // Format address for display
  const formatAddress = (
    line1: string | null,
    line2: string | null,
    city: string | null,
    state: string | null,
    country: string | null
  ) => {
    if (!line1 && !city && !state && !country) return 'No address provided';

    return (
      <div className="pl-2 border-l-2 border-orange-100 py-1 space-y-1">
        {line1 && <div className="text-gray-600">{line1}</div>}
        {line2 && <div className="text-gray-600">{line2}</div>}
        <div className="text-gray-600">
          {[city, state].filter(Boolean).join(', ')} {country && ` ${country}`}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <form onSubmit={handleSubmit}>
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigate('/admin/orders')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Back to Orders</span>
            </button>

            {/* Right buttons group */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Order'}
              </button>
            </div>
          </div>

          {/* Card Header with Title and Status */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-orange-100 rounded-full p-2.5">
                    <Package className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {id ? orderNumber : 'New Order'}
                    </h1>
                    <div className="flex items-center mt-1.5 space-x-3">
                      {formData.po_number && (
                        <div className="inline-flex items-center text-sm text-gray-600">
                          <FileBarChart2 className="w-4 h-4 mr-1" />
                          <input
                            type="text"
                            value={formData.po_number}
                            onChange={(e) => setFormData(prev => ({ ...prev, po_number: e.target.value }))}
                            className="inline border-b border-dashed border-gray-300 focus:border-orange-500 focus:outline-none"
                            placeholder="PO Number"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Status Badge */}
                <div className="mt-4 md:mt-0">
                  <select
                    value={formData.payment_status}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-full appearance-none cursor-pointer",
                      formData.payment_status === 'Pending' && "bg-gray-100 text-gray-800",
                      formData.payment_status === 'Partial Received' && "bg-orange-100 text-orange-800",
                      formData.payment_status === 'Fully Received' && "bg-green-100 text-green-800"
                    )}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Partial Received">Partial Received</option>
                    <option value="Fully Received">Fully Received</option>
                  </select>
                </div>
              </div>

              {/* Status Bar */}
              <div className="mb-8 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                {orderStatuses.length > 0 && (
                  <div className="relative pt-2">
                    {/* Progress bar track */}
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      {/* Progress bar fill - width based on current status */}
                      <div
                        className="absolute top-2 left-0 h-2 bg-orange-500 rounded-full"
                        style={{
                          width: `${(getCurrentStatusIndex() + 1) * 100 / orderStatuses.length}%`,
                          transition: 'width 0.3s ease-in-out'
                        }}
                      ></div>
                    </div>

                    {/* Status indicators with dots */}
                    <div className="flex justify-between mt-1">
                      {orderStatuses.map((status, index) => {
                        // Determine if this status is active (current or passed)
                        const isActive = index <= getCurrentStatusIndex();
                        // Position dots evenly
                        const position = index / (orderStatuses.length - 1) * 100;

                        return (
                          <div
                            key={status.id}
                            className="flex flex-col items-center"
                            style={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)' }}
                          >
                            {/* Status dot */}
                            <div
                              className={`w-4 h-4 rounded-full border-2 border-white ${isActive ? 'bg-orange-500' : 'bg-gray-300'}`}
                              style={{
                                marginTop: '-10px',
                                boxShadow: '0 0 0 2px white'
                              }}
                            ></div>

                            {/* Status label */}
                            <div
                              onClick={() => setFormData(prev => ({ ...prev, status: status.value }))}
                              className={`text-sm font-medium mt-2 px-3 py-1 rounded-full transition-colors cursor-pointer ${isActive ? 'text-orange-700' : 'text-gray-500 hover:text-gray-700'
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
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('payment')}
                    className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'payment'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payment
                  </button>
                </nav>
              </div>

              {/* Details Tab Content */}
              {activeTab === 'details' && (
                <div className="space-y-8">
                  {/* Order Items */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold flex items-center">
                        <Package className="w-5 h-5 text-orange-500 mr-2" />
                        Order Items
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
                            className="w-64 px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductIndex(null);
                              setProductSearch('');
                              setShowProductDropdown(true);
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
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
                                    value={item.product_name || ''}
                                    onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                                    className="font-medium text-gray-900 w-full px-2 py-1 rounded border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 outline-none"
                                    required
                                  />
                                  <input
                                    type="text"
                                    value={item.notes || ''}
                                    onChange={(e) => updateItem(index, 'notes', e.target.value)}
                                    placeholder="Description"
                                    className="text-sm text-gray-500 w-full mt-1 px-2 py-1 rounded border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 outline-none"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                  className="text-sm text-gray-900 w-20 px-2 py-1 rounded border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 outline-none text-right"
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
                                  className="text-sm text-gray-900 w-24 px-2 py-1 rounded border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 outline-none text-right"
                                  required
                                />
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatCurrency(item.subtotal)}
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
                              product_id: null,
                              product_name: '',
                              quantity: 1,
                              unit_price: 0,
                              subtotal: 0
                            }
                          ]
                        }));
                      }}
                      className="mt-4 w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-500 hover:text-orange-500 transition-colors flex items-center justify-center"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Item
                    </button>
                  </div>

                  {/* Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Information */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <User className="w-5 h-5 text-orange-500 mr-2" />
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
                                  <div className="text-sm text-orange-600">
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
                              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
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
                        <Building2 className="w-5 h-5 text-orange-500 mr-2" />
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
                                  <div className="text-sm text-orange-600">
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
                              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
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

                    {/* Order Details */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <ClipboardList className="w-5 h-5 text-orange-500 mr-2" />
                        Order Details
                      </h2>
                      <div className="space-y-4">
                        {/* Owner */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Owner
                          </label>
                          <UserSearch
                            organizationId={selectedOrganization?.id}
                            selectedUserId={formData.owner_id}
                            onSelect={(userId) => setFormData(prev => ({ ...prev, owner_id: userId }))}
                          />
                        </div>

                        {/* Purchase Order */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              PO Number
                            </label>
                            <input
                              type="text"
                              value={formData.po_number || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, po_number: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              PO Date
                            </label>
                            <input
                              type="datetime-local"
                              value={formData.po_date || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, po_date: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                            />
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Start Date
                            </label>
                            <input
                              type="datetime-local"
                              value={formData.order_start_at || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, order_start_at: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              End Date
                            </label>
                            <input
                              type="datetime-local"
                              value={formData.order_end_at || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, order_end_at: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tracking Information */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Truck className="w-5 h-5 text-orange-500 mr-2" />
                        Tracking Information
                      </h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Carrier
                          </label>
                          <input
                            type="text"
                            value={formData.tracking_carrier || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, tracking_carrier: e.target.value }))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                            placeholder="UPS, FedEx, USPS, etc."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tracking Number
                          </label>
                          <input
                            type="text"
                            value={formData.tracking_number || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shipping & Billing Addresses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Shipping Address */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <MapPin className="w-5 h-5 text-orange-500 mr-2" />
                        Shipping Address
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
                                  <div className="text-sm text-orange-600">
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
                              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
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
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
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
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
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
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
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
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
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
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Billing Address */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center">
                          <CreditCard className="w-5 h-5 text-orange-500 mr-2" />
                          Billing Address
                        </h2>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={useShippingForBilling}
                            onChange={(e) => setUseShippingForBilling(e.target.checked)}
                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
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
                                  <div className="text-sm text-orange-600">
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
                              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                              disabled={useShippingForBilling}
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
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
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
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
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
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
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
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
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
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <FileText className="w-5 h-5 text-orange-500 mr-2" />
                      Notes
                    </h2>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                      placeholder="Add notes here..."
                    />
                  </div>

                  {/* Custom Fields */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Bookmark className="w-5 h-5 text-orange-500 mr-2" />
                      Custom Fields
                    </h2>
                    <CustomFieldsForm
                      entityType="orders"
                      entityId={id}
                      organizationId={selectedOrganization?.id}
                      onChange={(values) => setCustomFields(values)}
                    />
                  </div>
                </div>
              )}

              {/* Payment Tab Content */}
              {activeTab === 'payment' && (
                <div className="space-y-8">
                  {/* Payment Summary */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <DollarSign className="w-5 h-5 text-orange-500 mr-2" />
                      Payment Summary
                    </h2>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(calculateTotal())}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 border-t border-gray-200 pt-4">
                        <span className="text-lg font-semibold">Total Amount:</span>
                        <span className="text-lg font-bold">{formatCurrency(calculateTotal())}</span>
                      </div>

                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">Amount Received:</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.payment_amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, payment_amount: parseFloat(e.target.value) || 0 }))}
                          className="w-32 px-3 py-1 text-right rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none font-medium text-green-600"
                        />
                      </div>

                      <div className="flex justify-between items-center py-2 border-t border-gray-200 pt-4">
                        <span className="text-lg font-semibold">Balance Due:</span>
                        <span className="text-lg font-bold text-red-600">
                          {formatCurrency(calculateTotal() - formData.payment_amount)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">Payment Status:</span>
                        <select
                          value={formData.payment_status}
                          onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
                          className={cn(
                            "px-3 py-1 text-sm font-medium rounded-full",
                            formData.payment_status === 'Pending' && "bg-gray-100 text-gray-800",
                            formData.payment_status === 'Partial Received' && "bg-orange-100 text-orange-800",
                            formData.payment_status === 'Fully Received' && "bg-green-100 text-green-800"
                          )}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Partial Received">Partial Received</option>
                          <option value="Fully Received">Fully Received</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <CreditCard className="w-5 h-5 text-orange-500 mr-2" />
                      Payment Options
                    </h2>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        After saving this order, you'll be able to create payment links for your customer using Square.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions Section */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mt-6 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center">
              <span className="text-gray-600 mr-2">Status:</span>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
              >
                {orderStatuses.map(status => (
                  <option key={status.id} value={status.value}>
                    {status.label || status.value}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => navigate('/admin/orders')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Order'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}