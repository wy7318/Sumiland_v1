// import { useState, useEffect, useRef } from 'react';
// import { useNavigate, useParams, Link } from 'react-router-dom';
// import { motion, AnimatePresence } from 'framer-motion';
// import {
//     Save,
//     X,
//     Plus,
//     Trash2,
//     Search,
//     Building2,
//     Package,
//     Calendar,
//     Truck,
//     ClipboardList,
//     ArrowLeft,
//     CreditCard,
//     DollarSign
// } from 'lucide-react';
// import { supabase } from '../../../lib/supabase';
// import { cn, formatCurrency } from '../../../lib/utils';
// import { useAuth } from '../../../contexts/AuthContext';
// import { useOrganization } from '../../../contexts/OrganizationContext';
// import { CustomFieldsForm } from '../CustomFieldsForm';



// export const PurchaseOrderForm = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const { user } = useAuth();
//     const { selectedOrganization } = useOrganization();
//     const isEditing = !!id;
//     const [statusOptions] = useState([
//         { value: 'draft', label: 'Draft' },
//         { value: 'submitted', label: 'Submitted' },
//         { value: 'approved', label: 'Approved' },
//         { value: 'partially_received', label: 'Partially Received' },
//         { value: 'fully_received', label: 'Fully Received' },
//         { value: 'cancelled', label: 'Cancelled' }
//     ]);


//     const [loading, setLoading] = useState(false);
//     const [saving, setSaving] = useState(false);
//     const [vendors, setVendors] = useState([]);
//     const [purchaseOrder, setPurchaseOrder] = useState({
//         vendor_id: '',
//         order_date: new Date().toISOString().split('T')[0],
//         expected_delivery_date: null,
//         shipping_address_line1: '',
//         shipping_address_line2: '',
//         shipping_city: '',
//         shipping_state: '',
//         shipping_country: '',
//         shipping_postal_code: '',
//         billing_address_line1: '',
//         billing_address_line2: '',
//         billing_city: '',
//         billing_state: '',
//         billing_country: '',
//         billing_postal_code: '',
//         currency: 'USD',
//         payment_terms: 'Net 30',
//         notes: '',
//         metadata: {},
//         items: [
//             {
//                 product_id: '',
//                 quantity: 1,
//                 unit_price: 0,
//                 tax_rate: 0,
//                 discount_amount: 0,
//                 notes: '',
//                 expected_delivery_date: null
//             }
//         ]
//     });

//     const [products, setProducts] = useState([]);
//     const [useVendorAddress, setUseVendorAddress] = useState(false);
//     const [useSameAddress, setUseSameAddress] = useState(false);
//     const [formErrors, setFormErrors] = useState({});

//     // Search and dropdown states
//     const [vendorSearch, setVendorSearch] = useState('');
//     const [productSearch, setProductSearch] = useState('');
//     const [showVendorDropdown, setShowVendorDropdown] = useState(false);
//     const [showProductDropdown, setShowProductDropdown] = useState(false);
//     const [filteredVendors, setFilteredVendors] = useState([]);
//     const [filteredProducts, setFilteredProducts] = useState([]);
//     const [selectedVendor, setSelectedVendor] = useState(null);
//     const [selectedProductIndex, setSelectedProductIndex] = useState(null);

//     // Refs for click outside handling
//     const vendorSearchRef = useRef(null);
//     const productSearchRef = useRef(null);

//     // Fetch vendors and products
//     useEffect(() => {
//         if (!selectedOrganization?.id) return;

//         const fetchData = async () => {
//             setLoading(true);
//             try {
//                 // Fetch vendors
//                 await fetchVendors();

//                 // Fetch products
//                 await fetchProducts();

//                 // If editing, fetch the purchase order
//                 if (isEditing) {
//                     await fetchPurchaseOrder();
//                 }
//             } catch (error) {
//                 console.error('Error fetching data:', error);
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchData();
//     }, [selectedOrganization, id, isEditing]);

//     const fetchVendors = async () => {
//         try {
//             const { data, error } = await supabase
//                 .from('vendors')
//                 .select('id, name, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_country, billing_address_line1, billing_address_line2, billing_city, billing_state, billing_country, email, contact_person')
//                 .eq('organization_id', selectedOrganization?.id)
//                 .eq('status', 'active');

//             if (error) throw error;
//             setVendors(data || []);
//         } catch (err) {
//             console.error('Error fetching vendors:', err);
//         }
//     };

//     const fetchProducts = async () => {
//         try {
//             const { data, error } = await supabase
//                 .from('products')
//                 .select('id, name, sku, description, price, stock_unit')
//                 .eq('organization_id', selectedOrganization?.id)
//                 .eq('status', 'active');

//             if (error) throw error;
//             setProducts(data || []);
//         } catch (err) {
//             console.error('Error fetching products:', err);
//         }
//     };

//     const fetchPurchaseOrder = async () => {
//         try {
//             const { data, error } = await supabase
//                 .from('purchase_orders')
//                 .select(`
//                 *, 
//                 purchase_order_items(*),
//                 vendors:vendor_id(id, name, email, contact_person)
//             `)
//                 .eq('id', id)
//                 .eq('organization_id', selectedOrganization?.id)
//                 .single();

//             if (error) throw error;

//             if (data) {
//                 // Set selected vendor
//                 if (data.vendor_id && data.vendors) {
//                     setSelectedVendor(data.vendors);
//                 }

//                 // Format date values correctly - extract just the YYYY-MM-DD portion
//                 const formatDateString = (dateStr) => {
//                     if (!dateStr) return null;
//                     // Parse the date and return just the YYYY-MM-DD portion
//                     try {
//                         return dateStr.split('T')[0];
//                     } catch (err) {
//                         console.error("Error formatting date:", err);
//                         return null;
//                     }
//                 };

//                 // Format dates properly
//                 const formattedData = {
//                     ...data,
//                     // Format main PO date fields
//                     order_date: formatDateString(data.order_date),
//                     expected_delivery_date: formatDateString(data.expected_delivery_date),

//                     // Format items date fields
//                     items: data.purchase_order_items.map(item => ({
//                         ...item,
//                         expected_delivery_date: formatDateString(item.expected_delivery_date)
//                     }))
//                 };

//                 setPurchaseOrder({
//                     ...formattedData,
//                     items: formattedData.purchase_order_items || []
//                 });
//             }
//         } catch (error) {
//             console.error('Error fetching purchase order:', error);
//         }
//     };

//     // Handle vendor address
//     useEffect(() => {
//         if (useVendorAddress && purchaseOrder.vendor_id) {
//             const selectedVendor = vendors.find(v => v.id === purchaseOrder.vendor_id);
//             if (selectedVendor) {
//                 setPurchaseOrder(prev => ({
//                     ...prev,
//                     shipping_address_line1: selectedVendor.shipping_address_line1 || '',
//                     shipping_address_line2: selectedVendor.shipping_address_line2 || '',
//                     shipping_city: selectedVendor.shipping_city || '',
//                     shipping_state: selectedVendor.shipping_state || '',
//                     shipping_country: selectedVendor.shipping_country || ''
//                 }));
//             }
//         }
//     }, [useVendorAddress, purchaseOrder.vendor_id, vendors]);

//     // Handle same address for billing
//     useEffect(() => {
//         if (useSameAddress) {
//             setPurchaseOrder(prev => ({
//                 ...prev,
//                 billing_address_line1: prev.shipping_address_line1,
//                 billing_address_line2: prev.shipping_address_line2,
//                 billing_city: prev.shipping_city,
//                 billing_state: prev.shipping_state,
//                 billing_country: prev.shipping_country,
//                 billing_postal_code: prev.shipping_postal_code
//             }));
//         }
//     }, [useSameAddress, purchaseOrder.shipping_address_line1, purchaseOrder.shipping_address_line2,
//         purchaseOrder.shipping_city, purchaseOrder.shipping_state, purchaseOrder.shipping_country,
//         purchaseOrder.shipping_postal_code]);

//     // Filter vendors based on search
//     useEffect(() => {
//         if (vendorSearch) {
//             const filtered = vendors.filter(vendor =>
//                 vendor.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
//                 (vendor.email && vendor.email.toLowerCase().includes(vendorSearch.toLowerCase())) ||
//                 (vendor.contact_person && vendor.contact_person.toLowerCase().includes(vendorSearch.toLowerCase()))
//             );
//             setFilteredVendors(filtered);
//         } else {
//             setFilteredVendors([]);
//         }
//     }, [vendorSearch, vendors]);

//     // Filter products based on search
//     useEffect(() => {
//         if (productSearch) {
//             const filtered = products.filter(product =>
//                 product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
//                 (product.sku && product.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
//                 (product.description && product.description.toLowerCase().includes(productSearch.toLowerCase()))
//             );
//             setFilteredProducts(filtered);
//         } else {
//             setFilteredProducts([]);
//         }
//     }, [productSearch, products]);

//     // Handle clicks outside dropdowns
//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             if (vendorSearchRef.current && !vendorSearchRef.current.contains(event.target)) {
//                 setShowVendorDropdown(false);
//             }
//             if (productSearchRef.current && !productSearchRef.current.contains(event.target)) {
//                 setShowProductDropdown(false);
//                 setSelectedProductIndex(null);
//             }
//         };

//         document.addEventListener('mousedown', handleClickOutside);
//         return () => document.removeEventListener('mousedown', handleClickOutside);
//     }, []);

//     const handleChange = (e) => {
//         const { name, value } = e.target;

//         // Special handling for dates to prevent empty string values
//         if (name === 'expected_delivery_date') {
//             setPurchaseOrder(prev => ({
//                 ...prev,
//                 [name]: value || null // Convert empty string to null
//             }));
//         } else {
//             setPurchaseOrder(prev => ({
//                 ...prev,
//                 [name]: value
//             }));
//         }
//     };

//     const handleItemChange = (index, field, value) => {
//         const updatedItems = [...purchaseOrder.items];

//         // Special handling for dates
//         if (field === 'expected_delivery_date') {
//             updatedItems[index] = {
//                 ...updatedItems[index],
//                 [field]: value || null // Convert empty string to null
//             };
//         } else {
//             updatedItems[index] = {
//                 ...updatedItems[index],
//                 [field]: value
//             };
//         }

//         // Recalculate line total
//         if (field === 'quantity' || field === 'unit_price' || field === 'discount_amount') {
//             const quantity = field === 'quantity' ? parseFloat(value) : parseFloat(updatedItems[index].quantity);
//             const unitPrice = field === 'unit_price' ? parseFloat(value) : parseFloat(updatedItems[index].unit_price);
//             const discount = field === 'discount_amount' ? parseFloat(value) : parseFloat(updatedItems[index].discount_amount || 0);

//             updatedItems[index].line_total = (quantity * unitPrice) - discount;
//         }

//         setPurchaseOrder(prev => ({
//             ...prev,
//             items: updatedItems
//         }));
//     };

//     const handleVendorSelect = (vendor) => {
//         setSelectedVendor(vendor);
//         setPurchaseOrder(prev => ({ ...prev, vendor_id: vendor.id }));
//         setVendorSearch('');
//         setShowVendorDropdown(false);
//     };

//     const handleProductSelect = (product, index = null) => {
//         const itemIndex = index !== null ? index : selectedProductIndex;

//         if (itemIndex !== null) {
//             // Update existing item
//             const updatedItems = [...purchaseOrder.items];
//             updatedItems[itemIndex] = {
//                 ...updatedItems[itemIndex],
//                 product_id: product.id,
//                 unit_price: product.price,
//                 line_total: product.price * updatedItems[itemIndex].quantity
//             };

//             setPurchaseOrder(prev => ({
//                 ...prev,
//                 items: updatedItems
//             }));
//         } else {
//             // Add as new item
//             setPurchaseOrder(prev => ({
//                 ...prev,
//                 items: [
//                     ...prev.items,
//                     {
//                         product_id: product.id,
//                         quantity: 1,
//                         unit_price: product.price,
//                         tax_rate: 0,
//                         discount_amount: 0,
//                         notes: '',
//                         expected_delivery_date: null,
//                         line_total: product.price
//                     }
//                 ]
//             }));
//         }

//         setProductSearch('');
//         setShowProductDropdown(false);
//         setSelectedProductIndex(null);
//     };

//     const addItem = () => {
//         setPurchaseOrder(prev => ({
//             ...prev,
//             items: [
//                 ...prev.items,
//                 {
//                     product_id: '',
//                     quantity: 1,
//                     unit_price: 0,
//                     tax_rate: 0,
//                     discount_amount: 0,
//                     notes: '',
//                     expected_delivery_date: null
//                 }
//             ]
//         }));
//     };

//     const removeItem = (index) => {
//         if (purchaseOrder.items.length === 1) {
//             return; // Keep at least one line item
//         }

//         const updatedItems = [...purchaseOrder.items];
//         updatedItems.splice(index, 1);

//         setPurchaseOrder(prev => ({
//             ...prev,
//             items: updatedItems
//         }));
//     };

//     const validateForm = () => {
//         const errors = {};

//         if (!purchaseOrder.vendor_id) errors.vendor_id = 'Vendor is required';
//         if (!purchaseOrder.order_date) errors.order_date = 'Order date is required';

//         // Validate items
//         const itemErrors = [];
//         purchaseOrder.items.forEach((item, index) => {
//             const error = {};
//             if (!item.product_id) error.product_id = 'Product is required';
//             if (!item.quantity || item.quantity <= 0) error.quantity = 'Valid quantity is required';
//             if (item.unit_price < 0) error.unit_price = 'Price cannot be negative';

//             if (Object.keys(error).length > 0) {
//                 itemErrors[index] = error;
//             }
//         });

//         if (itemErrors.length > 0) {
//             errors.items = itemErrors;
//         }

//         setFormErrors(errors);
//         return Object.keys(errors).length === 0;
//     };

//     // const savePurchaseOrder = async () => {
//     //     if (!validateForm()) return;

//     //     setSaving(true);

//     //     try {
//     //         // Prepare data for saving - ensure date fields are handled properly
//     //         const purchaseOrderData = {
//     //             ...purchaseOrder,
//     //             organization_id: selectedOrganization?.id,
//     //             status: isEditing ? purchaseOrder.status : 'draft',
//     //             updated_by: user.id,
//     //             // Ensure dates are null if empty
//     //             expected_delivery_date: purchaseOrder.expected_delivery_date || null
//     //         };

//     //         if (!isEditing) {
//     //             purchaseOrderData.created_by = user.id;
//     //         }

//     //         // Remove items from main object
//     //         const { items, ...poData } = purchaseOrderData;

//     //         let poId;

//     //         if (isEditing) {
//     //             // Update existing PO
//     //             const { error: updateError } = await supabase
//     //                 .from('purchase_orders')
//     //                 .update(poData)
//     //                 .eq('id', id);

//     //             if (updateError) throw updateError;
//     //             poId = id;

//     //             // Delete existing items and re-add
//     //             const { error: deleteError } = await supabase
//     //                 .from('purchase_order_items')
//     //                 .delete()
//     //                 .eq('purchase_order_id', id);

//     //             if (deleteError) throw deleteError;
//     //         } else {
//     //             // Create new PO
//     //             const { data: newPo, error: insertError } = await supabase
//     //                 .from('purchase_orders')
//     //                 .insert(poData)
//     //                 .select('id')
//     //                 .single();

//     //             if (insertError) throw insertError;
//     //             poId = newPo.id;
//     //         }

//     //         // Prepare items with proper date handling
//     //         const itemsWithPoId = items.map(item => ({
//     //             ...item,
//     //             purchase_order_id: poId,
//     //             organization_id: selectedOrganization?.id,
//     //             created_by: user.id,
//     //             updated_by: user.id,
//     //             // Ensure dates are null if empty
//     //             expected_delivery_date: item.expected_delivery_date || null
//     //         }));

//     //         // Insert all items
//     //         const { error: itemsError } = await supabase
//     //             .from('purchase_order_items')
//     //             .insert(itemsWithPoId);

//     //         if (itemsError) throw itemsError;

//     //         // Navigate to the PO details
//     //         navigate(`/admin/purchase-orders/${poId}`);
//     //     } catch (error) {
//     //         console.error('Error saving purchase order:', error);
//     //         alert('Failed to save purchase order. Please try again.');
//     //     } finally {
//     //         setSaving(false);
//     //     }
//     // };

//     const savePurchaseOrder = async () => {
//         if (!validateForm()) return;

//         setSaving(true);

//         try {
//             // Ensure we have an organization ID
//             if (!selectedOrganization?.id) {
//                 throw new Error("No organization selected");
//             }

//             // Prepare data for saving - ensure date fields are handled properly
//             // IMPORTANT: Remove nested structures and references to other tables
//             const purchaseOrderData = {
//                 vendor_id: purchaseOrder.vendor_id,
//                 order_date: purchaseOrder.order_date,
//                 expected_delivery_date: purchaseOrder.expected_delivery_date || null,
//                 shipping_address_line1: purchaseOrder.shipping_address_line1,
//                 shipping_address_line2: purchaseOrder.shipping_address_line2,
//                 shipping_city: purchaseOrder.shipping_city,
//                 shipping_state: purchaseOrder.shipping_state,
//                 shipping_country: purchaseOrder.shipping_country,
//                 shipping_postal_code: purchaseOrder.shipping_postal_code,
//                 billing_address_line1: purchaseOrder.billing_address_line1,
//                 billing_address_line2: purchaseOrder.billing_address_line2,
//                 billing_city: purchaseOrder.billing_city,
//                 billing_state: purchaseOrder.billing_state,
//                 billing_country: purchaseOrder.billing_country,
//                 billing_postal_code: purchaseOrder.billing_postal_code,
//                 currency: purchaseOrder.currency,
//                 payment_terms: purchaseOrder.payment_terms,
//                 notes: purchaseOrder.notes,
//                 total_amount: purchaseOrder.total_amount || 0,
//                 tax_amount: purchaseOrder.tax_amount || 0,
//                 shipping_amount: parseFloat(purchaseOrder.shipping_amount) || 0,
//                 discount_amount: parseFloat(purchaseOrder.discount_amount) || 0,
//                 status: purchaseOrder.status || 'draft',
//                 organization_id: selectedOrganization.id,
//                 updated_by: user.id,
//                 updated_at: new Date().toISOString()
//             };

//             // Add created_by for new records
//             if (!isEditing) {
//                 purchaseOrderData.created_by = user.id;
//                 purchaseOrderData.created_at = new Date().toISOString();
//             }

//             let poId;

//             if (isEditing) {
//                 // Update existing PO
//                 console.log("Updating purchase order:", id);

//                 const { error: updateError } = await supabase
//                     .from('purchase_orders')
//                     .update(purchaseOrderData)
//                     .eq('id', id)
//                     .eq('organization_id', selectedOrganization.id);

//                 if (updateError) {
//                     console.error("Error updating purchase order:", updateError);
//                     throw updateError;
//                 }

//                 poId = id;

//                 // Delete existing items
//                 console.log("Deleting existing items for PO:", poId);

//                 const { error: deleteError } = await supabase
//                     .from('purchase_order_items')
//                     .delete()
//                     .eq('purchase_order_id', poId)
//                     .eq('organization_id', selectedOrganization.id);

//                 if (deleteError) {
//                     console.error("Error deleting purchase order items:", deleteError);
//                     throw deleteError;
//                 }
//             } else {
//                 // Create new PO
//                 console.log("Creating new purchase order");

//                 const { data: newPo, error: insertError } = await supabase
//                     .from('purchase_orders')
//                     .insert(purchaseOrderData)
//                     .select('id')
//                     .single();

//                 if (insertError) {
//                     console.error("Error creating purchase order:", insertError);
//                     throw insertError;
//                 }

//                 poId = newPo.id;
//             }

//             // Prepare items with proper date handling
//             const itemsWithPoId = purchaseOrder.items.map(item => {
//                 // Filter out any non-database fields
//                 const cleanItem = {
//                     purchase_order_id: poId,
//                     product_id: item.product_id,
//                     quantity: parseFloat(item.quantity) || 0,
//                     unit_price: parseFloat(item.unit_price) || 0,
//                     tax_rate: parseFloat(item.tax_rate) || 0,
//                     discount_amount: parseFloat(item.discount_amount) || 0,
//                     line_total: parseFloat(item.line_total) || parseFloat(item.quantity) * parseFloat(item.unit_price),
//                     notes: item.notes || '',
//                     expected_delivery_date: item.expected_delivery_date || null,
//                     organization_id: selectedOrganization.id,
//                     created_by: user.id,
//                     updated_by: user.id,
//                     created_at: new Date().toISOString(),
//                     updated_at: new Date().toISOString()
//                 };

//                 return cleanItem;
//             });

//             console.log("Inserting purchase order items:", itemsWithPoId.length);

//             // Insert all items
//             if (itemsWithPoId.length > 0) {
//                 const { error: itemsError } = await supabase
//                     .from('purchase_order_items')
//                     .insert(itemsWithPoId);

//                 if (itemsError) {
//                     console.error("Error inserting purchase order items:", itemsError, itemsWithPoId);
//                     throw itemsError;
//                 }
//             }

//             // Navigate to the PO details
//             navigate(`/admin/purchase-orders/${poId}`);
//         } catch (error) {
//             console.error('Error saving purchase order:', error);
//             alert(`Failed to save purchase order: ${error.message}`);
//         } finally {
//             setSaving(false);
//         }
//     };

//     if (loading) {
//         return (
//             <div className="flex justify-center items-center h-64">
//                 <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
//             </div>
//         );
//     }

//     // Calculate totals
//     const subtotal = purchaseOrder.items.reduce((sum, item) => {
//         return sum + (parseFloat(item.line_total) || parseFloat(item.quantity) * parseFloat(item.unit_price) - parseFloat(item.discount_amount || 0));
//     }, 0);

//     const taxTotal = purchaseOrder.items.reduce((sum, item) => {
//         const lineAmount = parseFloat(item.line_total) || parseFloat(item.quantity) * parseFloat(item.unit_price) - parseFloat(item.discount_amount || 0);
//         return sum + (lineAmount * (parseFloat(item.tax_rate) / 100));
//     }, 0);

//     const total = subtotal + taxTotal + parseFloat(purchaseOrder.shipping_amount || 0) - parseFloat(purchaseOrder.discount_amount || 0);

//     // Find product name by ID
//     const getProductNameById = (productId) => {
//         const product = products.find(p => p.id === productId);
//         return product ? `${product.name} ${product.sku ? `(${product.sku})` : ''}` : '';
//     };

//     return (
//         <div className="container mx-auto px-4 py-8">
//             <div className="flex items-center mb-6">
//                 <button
//                     onClick={() => navigate(-1)}
//                     className="mr-4 text-gray-600 hover:text-gray-900"
//                 >
//                     <ArrowLeft className="w-5 h-5" />
//                 </button>
//                 <h1 className="text-2xl font-bold text-gray-900">
//                     {isEditing ? 'Edit Purchase Order' : 'Create Purchase Order'}
//                 </h1>
//             </div>

//             <div className="bg-white rounded-lg shadow-md p-6 mb-8">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//                     {/* Vendor Selection */}
//                     <div ref={vendorSearchRef} className="relative">
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             Vendor <span className="text-red-500">*</span>
//                         </label>

//                         {selectedVendor ? (
//                             <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
//                                 <div className="flex items-center">
//                                     <Building2 className="w-5 h-5 text-gray-400 mr-3" />
//                                     <div>
//                                         <div className="font-medium">{selectedVendor.name}</div>
//                                         {selectedVendor.contact_person && (
//                                             <div className="text-sm text-gray-500">
//                                                 Contact: {selectedVendor.contact_person}
//                                             </div>
//                                         )}
//                                         {selectedVendor.email && (
//                                             <div className="text-sm text-gray-500">
//                                                 {selectedVendor.email}
//                                             </div>
//                                         )}
//                                     </div>
//                                 </div>
//                                 <button
//                                     type="button"
//                                     onClick={() => {
//                                         setSelectedVendor(null);
//                                         setPurchaseOrder(prev => ({ ...prev, vendor_id: '' }));
//                                     }}
//                                     className="p-1 hover:bg-gray-200 rounded-full"
//                                 >
//                                     <X className="w-4 h-4" />
//                                 </button>
//                             </div>
//                         ) : (
//                             <div className="relative">
//                                 <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
//                                 <input
//                                     type="text"
//                                     value={vendorSearch}
//                                     onChange={(e) => {
//                                         setVendorSearch(e.target.value);
//                                         setShowVendorDropdown(true);
//                                     }}
//                                     onFocus={() => setShowVendorDropdown(true)}
//                                     placeholder="Search vendors..."
//                                     className={cn(
//                                         "pl-10 pr-4 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500",
//                                         formErrors.vendor_id ? "border-red-500" : "border-gray-300"
//                                     )}
//                                 />

//                                 <AnimatePresence>
//                                     {showVendorDropdown && vendorSearch && (
//                                         <motion.div
//                                             initial={{ opacity: 0, y: -10 }}
//                                             animate={{ opacity: 1, y: 0 }}
//                                             exit={{ opacity: 0, y: -10 }}
//                                             className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
//                                         >
//                                             {filteredVendors.length > 0 ? (
//                                                 <ul className="py-1 max-h-60 overflow-auto">
//                                                     {filteredVendors.map(vendor => (
//                                                         <li
//                                                             key={vendor.id}
//                                                             onClick={() => handleVendorSelect(vendor)}
//                                                             className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
//                                                         >
//                                                             <div className="font-medium">{vendor.name}</div>
//                                                             {vendor.contact_person && (
//                                                                 <div className="text-sm text-gray-500">
//                                                                     Contact: {vendor.contact_person}
//                                                                 </div>
//                                                             )}
//                                                             {vendor.email && (
//                                                                 <div className="text-sm text-gray-500">
//                                                                     {vendor.email}
//                                                                 </div>
//                                                             )}
//                                                         </li>
//                                                     ))}
//                                                 </ul>
//                                             ) : (
//                                                 <div className="p-4 text-gray-500">
//                                                     No vendors found
//                                                 </div>
//                                             )}
//                                         </motion.div>
//                                     )}
//                                 </AnimatePresence>
//                             </div>
//                         )}

//                         {formErrors.vendor_id && (
//                             <p className="text-red-500 text-xs mt-1">{formErrors.vendor_id}</p>
//                         )}
//                     </div>
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             Status
//                         </label>
//                         <div className="relative">
//                             <ClipboardList className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
//                             <select
//                                 name="status"
//                                 value={purchaseOrder.status || 'draft'}
//                                 onChange={handleChange}
//                                 className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             >
//                                 {statusOptions.map(option => (
//                                     <option key={option.value} value={option.value}>{option.label}</option>
//                                 ))}
//                             </select>
//                         </div>
//                     </div>

//                     {/* Order Date */}
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             Order Date <span className="text-red-500">*</span>
//                         </label>
//                         <div className="relative">
//                             <Calendar className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
//                             <input
//                                 type="date"
//                                 name="order_date"
//                                 value={purchaseOrder.order_date}
//                                 onChange={handleChange}
//                                 className={cn(
//                                     "pl-10 pr-4 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500",
//                                     formErrors.order_date ? "border-red-500" : "border-gray-300"
//                                 )}
//                             />
//                         </div>
//                         {formErrors.order_date && (
//                             <p className="text-red-500 text-xs mt-1">{formErrors.order_date}</p>
//                         )}
//                     </div>

//                     {/* Expected Delivery Date */}
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             Expected Delivery Date
//                         </label>
//                         <div className="relative">
//                             <Truck className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
//                             <input
//                                 type="date"
//                                 name="expected_delivery_date"
//                                 value={purchaseOrder.expected_delivery_date || ''}
//                                 onChange={handleChange}
//                                 className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             />
//                         </div>
//                     </div>

//                     {/* Currency */}
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             Currency
//                         </label>
//                         <div className="relative">
//                             <DollarSign className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
//                             <select
//                                 name="currency"
//                                 value={purchaseOrder.currency}
//                                 onChange={handleChange}
//                                 className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             >
//                                 <option value="USD">USD - US Dollar</option>
//                                 <option value="EUR">EUR - Euro</option>
//                                 <option value="GBP">GBP - British Pound</option>
//                                 <option value="CAD">CAD - Canadian Dollar</option>
//                                 <option value="AUD">AUD - Australian Dollar</option>
//                                 <option value="JPY">JPY - Japanese Yen</option>
//                             </select>
//                         </div>
//                     </div>

//                     {/* Payment Terms */}
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             Payment Terms
//                         </label>
//                         <div className="relative">
//                             <CreditCard className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
//                             <select
//                                 name="payment_terms"
//                                 value={purchaseOrder.payment_terms}
//                                 onChange={handleChange}
//                                 className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             >
//                                 <option value="Net 30">Net 30</option>
//                                 <option value="Net 15">Net 15</option>
//                                 <option value="Net 60">Net 60</option>
//                                 <option value="Due on Receipt">Due on Receipt</option>
//                                 <option value="Cash on Delivery">Cash on Delivery</option>
//                             </select>
//                         </div>
//                     </div>

//                     {/* Notes */}
//                     <div className="md:col-span-2">
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             Notes
//                         </label>
//                         <textarea
//                             name="notes"
//                             value={purchaseOrder.notes || ''}
//                             onChange={handleChange}
//                             rows={3}
//                             className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="Additional notes or instructions..."
//                         ></textarea>
//                     </div>
//                 </div>

//                 {/* Shipping Address */}
//                 <div className="mb-8">
//                     <div className="flex justify-between items-center mb-4">
//                         <h3 className="text-lg font-medium text-gray-900">Shipping Address</h3>
//                         {purchaseOrder.vendor_id && (
//                             <label className="flex items-center">
//                                 <input
//                                     type="checkbox"
//                                     checked={useVendorAddress}
//                                     onChange={e => setUseVendorAddress(e.target.checked)}
//                                     className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//                                 />
//                                 <span className="text-sm text-gray-600">Use vendor address</span>
//                             </label>
//                         )}
//                     </div>

//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
//                             <input
//                                 type="text"
//                                 name="shipping_address_line1"
//                                 value={purchaseOrder.shipping_address_line1 || ''}
//                                 onChange={handleChange}
//                                 className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             />
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
//                             <input
//                                 type="text"
//                                 name="shipping_address_line2"
//                                 value={purchaseOrder.shipping_address_line2 || ''}
//                                 onChange={handleChange}
//                                 className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             />
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
//                             <input
//                                 type="text"
//                                 name="shipping_city"
//                                 value={purchaseOrder.shipping_city || ''}
//                                 onChange={handleChange}
//                                 className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             />
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
//                             <input
//                                 type="text"
//                                 name="shipping_state"
//                                 value={purchaseOrder.shipping_state || ''}
//                                 onChange={handleChange}
//                                 className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             />
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
//                             <input
//                                 type="text"
//                                 name="shipping_country"
//                                 value={purchaseOrder.shipping_country || ''}
//                                 onChange={handleChange}
//                                 className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             />
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
//                             <input
//                                 type="text"
//                                 name="shipping_postal_code"
//                                 value={purchaseOrder.shipping_postal_code || ''}
//                                 onChange={handleChange}
//                                 className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             />
//                         </div>
//                     </div>
//                 </div>

//                 {/* Billing Address */}
//                 <div className="mb-8">
//                     <div className="flex justify-between items-center mb-4">
//                         <h3 className="text-lg font-medium text-gray-900">Billing Address</h3>
//                         <label className="flex items-center">
//                             <input
//                                 type="checkbox"
//                                 checked={useSameAddress}
//                                 onChange={e => setUseSameAddress(e.target.checked)}
//                                 className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//                             />
//                             <span className="text-sm text-gray-600">Same as shipping address</span>
//                         </label>
//                     </div>

//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
//                             <input
//                                 type="text"
//                                 name="billing_address_line1"
//                                 value={purchaseOrder.billing_address_line1 || ''}
//                                 onChange={handleChange}
//                                 disabled={useSameAddress}
//                                 className={cn(
//                                     "w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500",
//                                     useSameAddress && "bg-gray-100"
//                                 )}
//                             />
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
//                             <input
//                                 type="text"
//                                 name="billing_address_line2"
//                                 value={purchaseOrder.billing_address_line2 || ''}
//                                 onChange={handleChange}
//                                 disabled={useSameAddress}
//                                 className={cn(
//                                     "w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500",
//                                     useSameAddress && "bg-gray-100"
//                                 )}
//                             />
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
//                             <input
//                                 type="text"
//                                 name="billing_city"
//                                 value={purchaseOrder.billing_city || ''}
//                                 onChange={handleChange}
//                                 disabled={useSameAddress}
//                                 className={cn(
//                                     "w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500",
//                                     useSameAddress && "bg-gray-100"
//                                 )}
//                             />
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
//                             <input
//                                 type="text"
//                                 name="billing_state"
//                                 value={purchaseOrder.billing_state || ''}
//                                 onChange={handleChange}
//                                 disabled={useSameAddress}
//                                 className={cn(
//                                     "w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500",
//                                     useSameAddress && "bg-gray-100"
//                                 )}
//                             />
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
//                             <input
//                                 type="text"
//                                 name="billing_country"
//                                 value={purchaseOrder.billing_country || ''}
//                                 onChange={handleChange}
//                                 disabled={useSameAddress}
//                                 className={cn(
//                                     "w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500",
//                                     useSameAddress && "bg-gray-100"
//                                 )}
//                             />
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
//                             <input
//                                 type="text"
//                                 name="billing_postal_code"
//                                 value={purchaseOrder.billing_postal_code || ''}
//                                 onChange={handleChange}
//                                 disabled={useSameAddress}
//                                 className={cn(
//                                     "w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500",
//                                     useSameAddress && "bg-gray-100"
//                                 )}
//                             />
//                         </div>
//                     </div>
//                 </div>

//                 {/* Line Items */}
//                 <div className="mb-8">
//                     <div className="flex justify-between items-center mb-4">
//                         <h3 className="text-lg font-medium text-gray-900">Order Items</h3>
//                         <button
//                             type="button"
//                             onClick={addItem}
//                             className="text-blue-600 hover:text-blue-800 flex items-center"
//                         >
//                             <Plus className="w-4 h-4 mr-1" />
//                             Add Item
//                         </button>
//                     </div>

//                     <div className="overflow-x-auto">
//                         <table className="min-w-full divide-y divide-gray-200">
//                             <thead className="bg-gray-50">
//                                 <tr>
//                                     <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
//                                     <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
//                                     <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
//                                     <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Rate %</th>
//                                     <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
//                                     <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line Total</th>
//                                     <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
//                                 </tr>
//                             </thead>
//                             <tbody className="bg-white divide-y divide-gray-200">
//                                 {purchaseOrder.items.map((item, index) => (
//                                     <tr key={index}>
//                                         <td className="px-3 py-2">
//                                             <div ref={productSearchRef} className="relative">
//                                                 {item.product_id ? (
//                                                     <div className="flex items-center justify-between p-2 border rounded-lg bg-gray-50">
//                                                         <span className="text-sm font-medium text-gray-900">
//                                                             {getProductNameById(item.product_id)}
//                                                         </span>
//                                                         <button
//                                                             type="button"
//                                                             onClick={() => {
//                                                                 const updatedItems = [...purchaseOrder.items];
//                                                                 updatedItems[index] = {
//                                                                     ...updatedItems[index],
//                                                                     product_id: ''
//                                                                 };
//                                                                 setPurchaseOrder(prev => ({
//                                                                     ...prev,
//                                                                     items: updatedItems
//                                                                 }));
//                                                             }}
//                                                             className="p-1 hover:bg-gray-200 rounded-full"
//                                                         >
//                                                             <X className="w-4 h-4" />
//                                                         </button>
//                                                     </div>
//                                                 ) : (
//                                                     <div className="relative">
//                                                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
//                                                         <input
//                                                             type="text"
//                                                             value={selectedProductIndex === index ? productSearch : ''}
//                                                             onChange={(e) => {
//                                                                 setProductSearch(e.target.value);
//                                                                 setSelectedProductIndex(index);
//                                                                 setShowProductDropdown(true);
//                                                             }}
//                                                             onFocus={() => {
//                                                                 setSelectedProductIndex(index);
//                                                                 setShowProductDropdown(true);
//                                                             }}
//                                                             placeholder="Search products..."
//                                                             className={cn(
//                                                                 "w-full pl-9 pr-4 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
//                                                                 formErrors.items?.[index]?.product_id ? "border-red-500" : "border-gray-300"
//                                                             )}
//                                                         />

//                                                         <AnimatePresence>
//                                                             {showProductDropdown && selectedProductIndex === index && productSearch && (
//                                                                 <motion.div
//                                                                     initial={{ opacity: 0, y: -10 }}
//                                                                     animate={{ opacity: 1, y: 0 }}
//                                                                     exit={{ opacity: 0, y: -10 }}
//                                                                     className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
//                                                                 >
//                                                                     {filteredProducts.length > 0 ? (
//                                                                         <ul className="py-1 max-h-60 overflow-auto">
//                                                                             {filteredProducts.map(product => (
//                                                                                 <li
//                                                                                     key={product.id}
//                                                                                     onClick={() => handleProductSelect(product, index)}
//                                                                                     className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
//                                                                                 >
//                                                                                     <div className="font-medium">{product.name}</div>
//                                                                                     <div className="text-sm text-gray-500">
//                                                                                         {product.sku && `SKU: ${product.sku}`}
//                                                                                     </div>
//                                                                                     <div className="text-sm text-gray-500">
//                                                                                         Price: {formatCurrency(product.price)}
//                                                                                     </div>
//                                                                                 </li>
//                                                                             ))}
//                                                                         </ul>
//                                                                     ) : (
//                                                                         <div className="p-4 text-gray-500">
//                                                                             No products found
//                                                                         </div>
//                                                                     )}
//                                                                 </motion.div>
//                                                             )}
//                                                         </AnimatePresence>
//                                                     </div>
//                                                 )}
//                                                 {formErrors.items?.[index]?.product_id && (
//                                                     <p className="text-red-500 text-xs mt-1">{formErrors.items[index].product_id}</p>
//                                                 )}
//                                             </div>
//                                         </td>
//                                         <td className="px-3 py-2">
//                                             <input
//                                                 type="number"
//                                                 value={item.quantity}
//                                                 onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
//                                                 min="0.01"
//                                                 step="0.01"
//                                                 className={cn(
//                                                     "w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
//                                                     formErrors.items?.[index]?.quantity ? "border-red-500" : "border-gray-300"
//                                                 )}
//                                             />
//                                             {formErrors.items?.[index]?.quantity && (
//                                                 <p className="text-red-500 text-xs mt-1">{formErrors.items[index].quantity}</p>
//                                             )}
//                                         </td>
//                                         <td className="px-3 py-2">
//                                             <input
//                                                 type="number"
//                                                 value={item.unit_price}
//                                                 onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
//                                                 min="0"
//                                                 step="0.01"
//                                                 className={cn(
//                                                     "w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
//                                                     formErrors.items?.[index]?.unit_price ? "border-red-500" : "border-gray-300"
//                                                 )}
//                                             />
//                                             {formErrors.items?.[index]?.unit_price && (
//                                                 <p className="text-red-500 text-xs mt-1">{formErrors.items[index].unit_price}</p>
//                                             )}
//                                         </td>
//                                         <td className="px-3 py-2">
//                                             <input
//                                                 type="number"
//                                                 value={item.tax_rate || 0}
//                                                 onChange={(e) => handleItemChange(index, 'tax_rate', e.target.value)}
//                                                 min="0"
//                                                 step="0.01"
//                                                 className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                             />
//                                         </td>
//                                         <td className="px-3 py-2">
//                                             <input
//                                                 type="number"
//                                                 value={item.discount_amount || 0}
//                                                 onChange={(e) => handleItemChange(index, 'discount_amount', e.target.value)}
//                                                 min="0"
//                                                 step="0.01"
//                                                 className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                             />
//                                         </td>
//                                         <td className="px-3 py-2 text-sm font-medium">
//                                             {formatCurrency(
//                                                 (parseFloat(item.line_total) || parseFloat(item.quantity) * parseFloat(item.unit_price) - parseFloat(item.discount_amount || 0))
//                                             )}
//                                         </td>
//                                         <td className="px-3 py-2">
//                                             <button
//                                                 type="button"
//                                                 onClick={() => removeItem(index)}
//                                                 className="text-red-600 hover:text-red-900"
//                                                 disabled={purchaseOrder.items.length === 1}
//                                             >
//                                                 <Trash2 className="w-4 h-4" />
//                                             </button>
//                                         </td>
//                                     </tr>
//                                 ))}
//                             </tbody>
//                         </table>
//                     </div>
//                 </div>

//                 {/* Order Totals */}
//                 <div className="flex flex-col items-end mb-8">
//                     <div className="w-full md:w-80">
//                         <div className="flex justify-between py-2 border-b">
//                             <span className="text-gray-600">Subtotal:</span>
//                             <span className="font-medium">{formatCurrency(subtotal)}</span>
//                         </div>
//                         <div className="flex justify-between py-2 border-b">
//                             <span className="text-gray-600">Tax:</span>
//                             <span className="font-medium">{formatCurrency(taxTotal)}</span>
//                         </div>
//                         <div className="flex justify-between py-2 border-b">
//                             <span className="text-gray-600">Shipping:</span>
//                             <div className="flex items-center">
//                                 <input
//                                     type="number"
//                                     name="shipping_amount"
//                                     value={purchaseOrder.shipping_amount || 0}
//                                     onChange={handleChange}
//                                     min="0"
//                                     step="0.01"
//                                     className="w-24 border border-gray-300 rounded p-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 />
//                             </div>
//                         </div>
//                         <div className="flex justify-between py-2 border-b">
//                             <span className="text-gray-600">Discount:</span>
//                             <div className="flex items-center">
//                                 <input
//                                     type="number"
//                                     name="discount_amount"
//                                     value={purchaseOrder.discount_amount || 0}
//                                     onChange={handleChange}
//                                     min="0"
//                                     step="0.01"
//                                     className="w-24 border border-gray-300 rounded p-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 />
//                             </div>
//                         </div>
//                         <div className="flex justify-between py-3 font-bold text-lg">
//                             <span>Total:</span>
//                             <span>{formatCurrency(total)}</span>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Custom Fields - This would be implemented separately */}
//                 <div className="mb-8">
//                     <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Fields</h3>
//                     <CustomFieldsForm
//                         metadata={purchaseOrder.metadata}
//                         onChange={(metadata) => setPurchaseOrder(prev => ({ ...prev, metadata }))}
//                     />
//                 </div>

//                 {/* Action Buttons */}
//                 <div className="flex justify-end space-x-4">
//                     <button
//                         type="button"
//                         onClick={() => navigate(-1)}
//                         className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
//                     >
//                         Cancel
//                     </button>
//                     <motion.button
//                         whileHover={{ scale: 1.02 }}
//                         whileTap={{ scale: 0.98 }}
//                         type="button"
//                         onClick={savePurchaseOrder}
//                         disabled={saving}
//                         className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
//                     >
//                         {saving ? (
//                             <>
//                                 <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
//                                 Saving...
//                             </>
//                         ) : (
//                             <>
//                                 <Save className="w-4 h-4 mr-2" />
//                                 Save Purchase Order
//                             </>
//                         )}
//                     </motion.button>
//                 </div>
//             </div>
//         </div>
//     );
// };

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save,
    X,
    Plus,
    Trash2,
    Search,
    Building2,
    Package,
    Calendar,
    Truck,
    ClipboardList,
    ArrowLeft,
    CreditCard,
    DollarSign,
    MapPin,
    ChevronDown,
    ChevronUp,
    Info,
    Check
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn, formatCurrency } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { CustomFieldsForm } from '../CustomFieldsForm';

export const PurchaseOrderForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const isEditing = !!id;

    const [statusOptions] = useState([
        { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
        { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
        { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
        { value: 'partially_received', label: 'Partially Received', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'fully_received', label: 'Fully Received', color: 'bg-green-100 text-green-800' },
        { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
    ]);

    // Collapsible sections state
    const [expandedSections, setExpandedSections] = useState({
        basic: true,
        shipping: false,
        billing: false,
        items: true,
        totals: true,
        custom: false
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [purchaseOrder, setPurchaseOrder] = useState({
        vendor_id: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: null,
        shipping_address_line1: '',
        shipping_address_line2: '',
        shipping_city: '',
        shipping_state: '',
        shipping_country: '',
        shipping_postal_code: '',
        billing_address_line1: '',
        billing_address_line2: '',
        billing_city: '',
        billing_state: '',
        billing_country: '',
        billing_postal_code: '',
        currency: 'USD',
        payment_terms: 'Net 30',
        notes: '',
        metadata: {},
        items: [
            {
                product_id: '',
                quantity: 1,
                unit_price: 0,
                tax_rate: 0,
                discount_amount: 0,
                notes: '',
                expected_delivery_date: null
            }
        ]
    });

    const [products, setProducts] = useState([]);
    const [useVendorAddress, setUseVendorAddress] = useState(false);
    const [useSameAddress, setUseSameAddress] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    // Search and dropdown states
    const [vendorSearch, setVendorSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [showVendorDropdown, setShowVendorDropdown] = useState(false);
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [filteredVendors, setFilteredVendors] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [selectedProductIndex, setSelectedProductIndex] = useState(null);

    // Refs for click outside handling
    const vendorSearchRef = useRef(null);
    const productSearchRef = useRef(null);

    // Toggle section visibility
    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Fetch vendors and products
    useEffect(() => {
        if (!selectedOrganization?.id) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                await fetchVendors();
                await fetchProducts();
                if (isEditing) {
                    await fetchPurchaseOrder();
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedOrganization, id, isEditing]);

    const fetchVendors = async () => {
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select('id, name, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_country, billing_address_line1, billing_address_line2, billing_city, billing_state, billing_country, email, contact_person')
                .eq('organization_id', selectedOrganization?.id)
                .eq('status', 'active');

            if (error) throw error;
            setVendors(data || []);
        } catch (err) {
            console.error('Error fetching vendors:', err);
        }
    };

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('id, name, sku, description, price, stock_unit')
                .eq('organization_id', selectedOrganization?.id)
                .eq('status', 'active');

            if (error) throw error;
            setProducts(data || []);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    const fetchPurchaseOrder = async () => {
        try {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select(`
                *, 
                purchase_order_items(*),
                vendors:vendor_id(id, name, email, contact_person)
            `)
                .eq('id', id)
                .eq('organization_id', selectedOrganization?.id)
                .single();

            if (error) throw error;

            if (data) {
                if (data.vendor_id && data.vendors) {
                    setSelectedVendor(data.vendors);
                }

                const formatDateString = (dateStr) => {
                    if (!dateStr) return null;
                    try {
                        return dateStr.split('T')[0];
                    } catch (err) {
                        console.error("Error formatting date:", err);
                        return null;
                    }
                };

                const formattedData = {
                    ...data,
                    order_date: formatDateString(data.order_date),
                    expected_delivery_date: formatDateString(data.expected_delivery_date),
                    items: data.purchase_order_items.map(item => ({
                        ...item,
                        expected_delivery_date: formatDateString(item.expected_delivery_date)
                    }))
                };

                setPurchaseOrder({
                    ...formattedData,
                    items: formattedData.purchase_order_items || []
                });

                // Expand relevant sections if data exists
                setExpandedSections(prev => ({
                    ...prev,
                    shipping: !!(data.shipping_address_line1 || data.shipping_city),
                    billing: !!(data.billing_address_line1 || data.billing_city),
                    custom: !!(data.metadata && Object.keys(data.metadata).length > 0)
                }));
            }
        } catch (error) {
            console.error('Error fetching purchase order:', error);
        }
    };

    // Handle vendor address
    useEffect(() => {
        if (useVendorAddress && purchaseOrder.vendor_id && vendors.length > 0) {
            const vendor = vendors.find(v => v.id === purchaseOrder.vendor_id);
            if (vendor) {
                console.log('Applying vendor address:', vendor);
                setPurchaseOrder(prev => ({
                    ...prev,
                    shipping_address_line1: vendor.shipping_address_line1 || '',
                    shipping_address_line2: vendor.shipping_address_line2 || '',
                    shipping_city: vendor.shipping_city || '',
                    shipping_state: vendor.shipping_state || '',
                    shipping_country: vendor.shipping_country || '',
                    // Note: postal code field not available in vendor table schema
                    shipping_postal_code: ''
                }));
            } else {
                console.warn('Vendor not found for address filling');
            }
        } else if (!useVendorAddress) {
            // Optional: Clear shipping address when unchecking (you can remove this if you want to keep existing data)
            // setPurchaseOrder(prev => ({
            //     ...prev,
            //     shipping_address_line1: '',
            //     shipping_address_line2: '',
            //     shipping_city: '',
            //     shipping_state: '',
            //     shipping_country: '',
            //     shipping_postal_code: ''
            // }));
        }
    }, [useVendorAddress, purchaseOrder.vendor_id, vendors]);

    // Handle same address for billing
    useEffect(() => {
        if (useSameAddress) {
            setPurchaseOrder(prev => ({
                ...prev,
                billing_address_line1: prev.shipping_address_line1,
                billing_address_line2: prev.shipping_address_line2,
                billing_city: prev.shipping_city,
                billing_state: prev.shipping_state,
                billing_country: prev.shipping_country,
                billing_postal_code: prev.shipping_postal_code
            }));
        }
    }, [useSameAddress, purchaseOrder.shipping_address_line1, purchaseOrder.shipping_address_line2,
        purchaseOrder.shipping_city, purchaseOrder.shipping_state, purchaseOrder.shipping_country,
        purchaseOrder.shipping_postal_code]);

    // Filter vendors based on search
    useEffect(() => {
        if (vendorSearch) {
            const filtered = vendors.filter(vendor =>
                vendor.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                (vendor.email && vendor.email.toLowerCase().includes(vendorSearch.toLowerCase())) ||
                (vendor.contact_person && vendor.contact_person.toLowerCase().includes(vendorSearch.toLowerCase()))
            );
            setFilteredVendors(filtered);
        } else {
            setFilteredVendors([]);
        }
    }, [vendorSearch, vendors]);

    // Filter products based on search
    useEffect(() => {
        if (productSearch) {
            const filtered = products.filter(product =>
                product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                (product.sku && product.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
                (product.description && product.description.toLowerCase().includes(productSearch.toLowerCase()))
            );
            setFilteredProducts(filtered);
        } else {
            setFilteredProducts([]);
        }
    }, [productSearch, products]);

    // Handle clicks outside dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (vendorSearchRef.current && !vendorSearchRef.current.contains(event.target)) {
                setShowVendorDropdown(false);
            }
            if (productSearchRef.current && !productSearchRef.current.contains(event.target)) {
                setShowProductDropdown(false);
                setSelectedProductIndex(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'expected_delivery_date') {
            setPurchaseOrder(prev => ({
                ...prev,
                [name]: value || null
            }));
        } else {
            setPurchaseOrder(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...purchaseOrder.items];

        if (field === 'expected_delivery_date') {
            updatedItems[index] = {
                ...updatedItems[index],
                [field]: value || null
            };
        } else {
            updatedItems[index] = {
                ...updatedItems[index],
                [field]: value
            };
        }

        if (field === 'quantity' || field === 'unit_price' || field === 'discount_amount') {
            const quantity = field === 'quantity' ? parseFloat(value) : parseFloat(updatedItems[index].quantity);
            const unitPrice = field === 'unit_price' ? parseFloat(value) : parseFloat(updatedItems[index].unit_price);
            const discount = field === 'discount_amount' ? parseFloat(value) : parseFloat(updatedItems[index].discount_amount || 0);

            updatedItems[index].line_total = (quantity * unitPrice) - discount;
        }

        setPurchaseOrder(prev => ({
            ...prev,
            items: updatedItems
        }));
    };

    const handleVendorSelect = (vendor) => {
        setSelectedVendor(vendor);
        setPurchaseOrder(prev => ({ ...prev, vendor_id: vendor.id }));
        setVendorSearch('');
        setShowVendorDropdown(false);

        // Reset use vendor address when vendor changes
        setUseVendorAddress(false);
    };

    const handleProductSelect = (product, index = null) => {
        const itemIndex = index !== null ? index : selectedProductIndex;

        if (itemIndex !== null) {
            const updatedItems = [...purchaseOrder.items];
            updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                product_id: product.id,
                unit_price: product.price,
                line_total: product.price * updatedItems[itemIndex].quantity
            };

            setPurchaseOrder(prev => ({
                ...prev,
                items: updatedItems
            }));
        } else {
            setPurchaseOrder(prev => ({
                ...prev,
                items: [
                    ...prev.items,
                    {
                        product_id: product.id,
                        quantity: 1,
                        unit_price: product.price,
                        tax_rate: 0,
                        discount_amount: 0,
                        notes: '',
                        expected_delivery_date: null,
                        line_total: product.price
                    }
                ]
            }));
        }

        setProductSearch('');
        setShowProductDropdown(false);
        setSelectedProductIndex(null);
    };

    const addItem = () => {
        setPurchaseOrder(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    product_id: '',
                    quantity: 1,
                    unit_price: 0,
                    tax_rate: 0,
                    discount_amount: 0,
                    notes: '',
                    expected_delivery_date: null
                }
            ]
        }));
    };

    const removeItem = (index) => {
        if (purchaseOrder.items.length === 1) {
            return;
        }

        const updatedItems = [...purchaseOrder.items];
        updatedItems.splice(index, 1);

        setPurchaseOrder(prev => ({
            ...prev,
            items: updatedItems
        }));
    };

    const validateForm = () => {
        const errors = {};

        if (!purchaseOrder.vendor_id) errors.vendor_id = 'Vendor is required';
        if (!purchaseOrder.order_date) errors.order_date = 'Order date is required';

        const itemErrors = [];
        purchaseOrder.items.forEach((item, index) => {
            const error = {};
            if (!item.product_id) error.product_id = 'Product is required';
            if (!item.quantity || item.quantity <= 0) error.quantity = 'Valid quantity is required';
            if (item.unit_price < 0) error.unit_price = 'Price cannot be negative';

            if (Object.keys(error).length > 0) {
                itemErrors[index] = error;
            }
        });

        if (itemErrors.length > 0) {
            errors.items = itemErrors;
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const savePurchaseOrder = async () => {
        if (!validateForm()) return;

        setSaving(true);

        try {
            if (!selectedOrganization?.id) {
                throw new Error("No organization selected");
            }

            const purchaseOrderData = {
                vendor_id: purchaseOrder.vendor_id,
                order_date: purchaseOrder.order_date,
                expected_delivery_date: purchaseOrder.expected_delivery_date || null,
                shipping_address_line1: purchaseOrder.shipping_address_line1,
                shipping_address_line2: purchaseOrder.shipping_address_line2,
                shipping_city: purchaseOrder.shipping_city,
                shipping_state: purchaseOrder.shipping_state,
                shipping_country: purchaseOrder.shipping_country,
                shipping_postal_code: purchaseOrder.shipping_postal_code,
                billing_address_line1: purchaseOrder.billing_address_line1,
                billing_address_line2: purchaseOrder.billing_address_line2,
                billing_city: purchaseOrder.billing_city,
                billing_state: purchaseOrder.billing_state,
                billing_country: purchaseOrder.billing_country,
                billing_postal_code: purchaseOrder.billing_postal_code,
                currency: purchaseOrder.currency,
                payment_terms: purchaseOrder.payment_terms,
                notes: purchaseOrder.notes,
                total_amount: purchaseOrder.total_amount || 0,
                tax_amount: purchaseOrder.tax_amount || 0,
                shipping_amount: parseFloat(purchaseOrder.shipping_amount) || 0,
                discount_amount: parseFloat(purchaseOrder.discount_amount) || 0,
                status: purchaseOrder.status || 'draft',
                organization_id: selectedOrganization.id,
                updated_by: user.id,
                updated_at: new Date().toISOString()
            };

            if (!isEditing) {
                purchaseOrderData.created_by = user.id;
                purchaseOrderData.created_at = new Date().toISOString();
            }

            let poId;

            if (isEditing) {
                const { error: updateError } = await supabase
                    .from('purchase_orders')
                    .update(purchaseOrderData)
                    .eq('id', id)
                    .eq('organization_id', selectedOrganization.id);

                if (updateError) {
                    console.error("Error updating purchase order:", updateError);
                    throw updateError;
                }

                poId = id;

                const { error: deleteError } = await supabase
                    .from('purchase_order_items')
                    .delete()
                    .eq('purchase_order_id', poId)
                    .eq('organization_id', selectedOrganization.id);

                if (deleteError) {
                    console.error("Error deleting purchase order items:", deleteError);
                    throw deleteError;
                }
            } else {
                const { data: newPo, error: insertError } = await supabase
                    .from('purchase_orders')
                    .insert(purchaseOrderData)
                    .select('id')
                    .single();

                if (insertError) {
                    console.error("Error creating purchase order:", insertError);
                    throw insertError;
                }

                poId = newPo.id;
            }

            const itemsWithPoId = purchaseOrder.items.map(item => {
                const cleanItem = {
                    purchase_order_id: poId,
                    product_id: item.product_id,
                    quantity: parseFloat(item.quantity) || 0,
                    unit_price: parseFloat(item.unit_price) || 0,
                    tax_rate: parseFloat(item.tax_rate) || 0,
                    discount_amount: parseFloat(item.discount_amount) || 0,
                    line_total: parseFloat(item.line_total) || parseFloat(item.quantity) * parseFloat(item.unit_price),
                    notes: item.notes || '',
                    expected_delivery_date: item.expected_delivery_date || null,
                    organization_id: selectedOrganization.id,
                    created_by: user.id,
                    updated_by: user.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                return cleanItem;
            });

            if (itemsWithPoId.length > 0) {
                const { error: itemsError } = await supabase
                    .from('purchase_order_items')
                    .insert(itemsWithPoId);

                if (itemsError) {
                    console.error("Error inserting purchase order items:", itemsError, itemsWithPoId);
                    throw itemsError;
                }
            }

            navigate(`/admin/purchase-orders/${poId}`);
        } catch (error) {
            console.error('Error saving purchase order:', error);
            alert(`Failed to save purchase order: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Calculate totals
    const subtotal = purchaseOrder.items.reduce((sum, item) => {
        return sum + (parseFloat(item.line_total) || parseFloat(item.quantity) * parseFloat(item.unit_price) - parseFloat(item.discount_amount || 0));
    }, 0);

    const taxTotal = purchaseOrder.items.reduce((sum, item) => {
        const lineAmount = parseFloat(item.line_total) || parseFloat(item.quantity) * parseFloat(item.unit_price) - parseFloat(item.discount_amount || 0);
        return sum + (lineAmount * (parseFloat(item.tax_rate) / 100));
    }, 0);

    const total = subtotal + taxTotal + parseFloat(purchaseOrder.shipping_amount || 0) - parseFloat(purchaseOrder.discount_amount || 0);

    const getProductNameById = (productId) => {
        const product = products.find(p => p.id === productId);
        return product ? `${product.name} ${product.sku ? `(${product.sku})` : ''}` : '';
    };

    const SectionHeader = ({ title, icon: Icon, isExpanded, onToggle, required = false, badge = null }) => (
        <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors duration-200 rounded-lg border border-gray-200"
        >
            <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                    {title}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </h3>
                {badge && (
                    <span className={cn("px-2 py-1 text-xs font-medium rounded-full", badge.color)}>
                        {badge.text}
                    </span>
                )}
            </div>
            {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {isEditing ? 'Edit Purchase Order' : 'Create Purchase Order'}
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    {isEditing ? 'Update your purchase order details' : 'Fill in the details to create a new purchase order'}
                                </p>
                            </div>
                        </div>
                        {isEditing && (
                            <div className="text-right">
                                <div className="text-sm text-gray-500">Status</div>
                                <span className={cn(
                                    "inline-flex px-3 py-1 text-sm font-medium rounded-full",
                                    statusOptions.find(s => s.value === purchaseOrder.status)?.color || 'bg-gray-100 text-gray-800'
                                )}>
                                    {statusOptions.find(s => s.value === purchaseOrder.status)?.label || 'Draft'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Content */}
                <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <SectionHeader
                            title="Basic Information"
                            icon={ClipboardList}
                            isExpanded={expandedSections.basic}
                            onToggle={() => toggleSection('basic')}
                            required={true}
                        />

                        <AnimatePresence>
                            {expandedSections.basic && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-6 space-y-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Vendor Selection */}
                                            <div ref={vendorSearchRef} className="lg:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Vendor <span className="text-red-500">*</span>
                                                </label>

                                                {selectedVendor ? (
                                                    <div className="flex items-center justify-between p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                                <Building2 className="w-5 h-5 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-gray-900">{selectedVendor.name}</div>
                                                                {selectedVendor.contact_person && (
                                                                    <div className="text-sm text-gray-600">
                                                                        {selectedVendor.contact_person}
                                                                    </div>
                                                                )}
                                                                {selectedVendor.email && (
                                                                    <div className="text-sm text-gray-600">
                                                                        {selectedVendor.email}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedVendor(null);
                                                                setPurchaseOrder(prev => ({ ...prev, vendor_id: '' }));
                                                            }}
                                                            className="p-2 hover:bg-blue-100 rounded-full transition-colors duration-200"
                                                        >
                                                            <X className="w-4 h-4 text-gray-600" />
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
                                                            }}
                                                            onFocus={() => setShowVendorDropdown(true)}
                                                            placeholder="Search and select a vendor..."
                                                            className={cn(
                                                                "pl-10 pr-4 py-3 border-2 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                                formErrors.vendor_id ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300"
                                                            )}
                                                        />

                                                        <AnimatePresence>
                                                            {showVendorDropdown && vendorSearch && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: -10 }}
                                                                    className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-auto"
                                                                >
                                                                    {filteredVendors.length > 0 ? (
                                                                        <ul className="py-2">
                                                                            {filteredVendors.map(vendor => (
                                                                                <li
                                                                                    key={vendor.id}
                                                                                    onClick={() => handleVendorSelect(vendor)}
                                                                                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                                                                                >
                                                                                    <div className="font-medium text-gray-900">{vendor.name}</div>
                                                                                    {vendor.contact_person && (
                                                                                        <div className="text-sm text-gray-600">
                                                                                            Contact: {vendor.contact_person}
                                                                                        </div>
                                                                                    )}
                                                                                    {vendor.email && (
                                                                                        <div className="text-sm text-gray-600">
                                                                                            {vendor.email}
                                                                                        </div>
                                                                                    )}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <div className="p-4 text-gray-500 text-center">
                                                                            No vendors found
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}

                                                {formErrors.vendor_id && (
                                                    <p className="text-red-500 text-sm mt-2 flex items-center">
                                                        <Info className="w-4 h-4 mr-1" />
                                                        {formErrors.vendor_id}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Order Date */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Order Date <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                    <input
                                                        type="date"
                                                        name="order_date"
                                                        value={purchaseOrder.order_date}
                                                        onChange={handleChange}
                                                        className={cn(
                                                            "pl-10 pr-4 py-3 border-2 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                            formErrors.order_date ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300"
                                                        )}
                                                    />
                                                </div>
                                                {formErrors.order_date && (
                                                    <p className="text-red-500 text-sm mt-2 flex items-center">
                                                        <Info className="w-4 h-4 mr-1" />
                                                        {formErrors.order_date}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Expected Delivery Date */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Expected Delivery Date
                                                </label>
                                                <div className="relative">
                                                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                    <input
                                                        type="date"
                                                        name="expected_delivery_date"
                                                        value={purchaseOrder.expected_delivery_date || ''}
                                                        onChange={handleChange}
                                                        className="pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                    />
                                                </div>
                                            </div>

                                            {/* Status */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Status
                                                </label>
                                                <div className="relative">
                                                    <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                    <select
                                                        name="status"
                                                        value={purchaseOrder.status || 'draft'}
                                                        onChange={handleChange}
                                                        className="pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                    >
                                                        {statusOptions.map(option => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Currency & Payment Terms */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Currency
                                                </label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                    <select
                                                        name="currency"
                                                        value={purchaseOrder.currency}
                                                        onChange={handleChange}
                                                        className="pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                    >
                                                        <option value="USD">USD - US Dollar</option>
                                                        <option value="EUR">EUR - Euro</option>
                                                        <option value="GBP">GBP - British Pound</option>
                                                        <option value="CAD">CAD - Canadian Dollar</option>
                                                        <option value="AUD">AUD - Australian Dollar</option>
                                                        <option value="JPY">JPY - Japanese Yen</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Payment Terms
                                                </label>
                                                <div className="relative">
                                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                    <select
                                                        name="payment_terms"
                                                        value={purchaseOrder.payment_terms}
                                                        onChange={handleChange}
                                                        className="pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                    >
                                                        <option value="Net 30">Net 30</option>
                                                        <option value="Net 15">Net 15</option>
                                                        <option value="Net 60">Net 60</option>
                                                        <option value="Due on Receipt">Due on Receipt</option>
                                                        <option value="Cash on Delivery">Cash on Delivery</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            <div className="lg:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Notes
                                                </label>
                                                <textarea
                                                    name="notes"
                                                    value={purchaseOrder.notes || ''}
                                                    onChange={handleChange}
                                                    rows={3}
                                                    className="w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                    placeholder="Additional notes or instructions..."
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Order Items */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <SectionHeader
                            title="Order Items"
                            icon={Package}
                            isExpanded={expandedSections.items}
                            onToggle={() => toggleSection('items')}
                            required={true}
                            badge={{
                                text: `${purchaseOrder.items.length} item${purchaseOrder.items.length !== 1 ? 's' : ''}`,
                                color: 'bg-blue-100 text-blue-800'
                            }}
                        />

                        <AnimatePresence>
                            {expandedSections.items && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-6">
                                        <div className="space-y-4">
                                            {purchaseOrder.items.map((item, index) => (
                                                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="font-medium text-gray-900">Item #{index + 1}</h4>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            className="text-red-600 hover:text-red-900 hover:bg-red-100 p-2 rounded-lg transition-colors duration-200"
                                                            disabled={purchaseOrder.items.length === 1}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {/* Product Selection */}
                                                        <div ref={productSearchRef} className="lg:col-span-3">
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Product <span className="text-red-500">*</span>
                                                            </label>

                                                            {item.product_id ? (
                                                                <div className="flex items-center justify-between p-3 border-2 border-green-200 rounded-lg bg-green-50">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                                            <Check className="w-4 h-4 text-green-600" />
                                                                        </div>
                                                                        <span className="font-medium text-gray-900">
                                                                            {getProductNameById(item.product_id)}
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updatedItems = [...purchaseOrder.items];
                                                                            updatedItems[index] = {
                                                                                ...updatedItems[index],
                                                                                product_id: ''
                                                                            };
                                                                            setPurchaseOrder(prev => ({
                                                                                ...prev,
                                                                                items: updatedItems
                                                                            }));
                                                                        }}
                                                                        className="p-1 hover:bg-green-100 rounded-full transition-colors duration-200"
                                                                    >
                                                                        <X className="w-4 h-4 text-gray-600" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="relative">
                                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                                    <input
                                                                        type="text"
                                                                        value={selectedProductIndex === index ? productSearch : ''}
                                                                        onChange={(e) => {
                                                                            setProductSearch(e.target.value);
                                                                            setSelectedProductIndex(index);
                                                                            setShowProductDropdown(true);
                                                                        }}
                                                                        onFocus={() => {
                                                                            setSelectedProductIndex(index);
                                                                            setShowProductDropdown(true);
                                                                        }}
                                                                        placeholder="Search and select a product..."
                                                                        className={cn(
                                                                            "w-full pl-9 pr-4 py-2 border-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                                            formErrors.items?.[index]?.product_id ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300"
                                                                        )}
                                                                    />

                                                                    <AnimatePresence>
                                                                        {showProductDropdown && selectedProductIndex === index && productSearch && (
                                                                            <motion.div
                                                                                initial={{ opacity: 0, y: -10 }}
                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                exit={{ opacity: 0, y: -10 }}
                                                                                className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-auto"
                                                                            >
                                                                                {filteredProducts.length > 0 ? (
                                                                                    <ul className="py-1">
                                                                                        {filteredProducts.map(product => (
                                                                                            <li
                                                                                                key={product.id}
                                                                                                onClick={() => handleProductSelect(product, index)}
                                                                                                className="px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                                                                                            >
                                                                                                <div className="font-medium text-gray-900">{product.name}</div>
                                                                                                <div className="text-sm text-gray-500">
                                                                                                    {product.sku && `SKU: ${product.sku} | `}
                                                                                                    Price: {formatCurrency(product.price)}
                                                                                                </div>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                ) : (
                                                                                    <div className="p-4 text-gray-500 text-center">
                                                                                        No products found
                                                                                    </div>
                                                                                )}
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                            )}
                                                            {formErrors.items?.[index]?.product_id && (
                                                                <p className="text-red-500 text-sm mt-2 flex items-center">
                                                                    <Info className="w-4 h-4 mr-1" />
                                                                    {formErrors.items[index].product_id}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Quantity */}
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Quantity <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={item.quantity}
                                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                                min="0.01"
                                                                step="0.01"
                                                                className={cn(
                                                                    "w-full border-2 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                                    formErrors.items?.[index]?.quantity ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300"
                                                                )}
                                                            />
                                                            {formErrors.items?.[index]?.quantity && (
                                                                <p className="text-red-500 text-sm mt-1">{formErrors.items[index].quantity}</p>
                                                            )}
                                                        </div>

                                                        {/* Unit Price */}
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Unit Price <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={item.unit_price}
                                                                onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                                                min="0"
                                                                step="0.01"
                                                                className={cn(
                                                                    "w-full border-2 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                                    formErrors.items?.[index]?.unit_price ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300"
                                                                )}
                                                            />
                                                            {formErrors.items?.[index]?.unit_price && (
                                                                <p className="text-red-500 text-sm mt-1">{formErrors.items[index].unit_price}</p>
                                                            )}
                                                        </div>

                                                        {/* Line Total */}
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Line Total
                                                            </label>
                                                            <div className="w-full border-2 border-gray-200 rounded-lg p-2 bg-gray-100 text-sm font-semibold text-gray-900">
                                                                {formatCurrency(
                                                                    (parseFloat(item.line_total) || parseFloat(item.quantity) * parseFloat(item.unit_price) - parseFloat(item.discount_amount || 0))
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Tax Rate */}
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Tax Rate (%)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={item.tax_rate || 0}
                                                                onChange={(e) => handleItemChange(index, 'tax_rate', e.target.value)}
                                                                min="0"
                                                                step="0.01"
                                                                className="w-full border-2 border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                            />
                                                        </div>

                                                        {/* Discount */}
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Discount Amount
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={item.discount_amount || 0}
                                                                onChange={(e) => handleItemChange(index, 'discount_amount', e.target.value)}
                                                                min="0"
                                                                step="0.01"
                                                                className="w-full border-2 border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            <button
                                                type="button"
                                                onClick={addItem}
                                                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center space-x-2"
                                            >
                                                <Plus className="w-5 h-5" />
                                                <span>Add Another Item</span>
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Order Totals */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <SectionHeader
                            title="Order Summary"
                            icon={DollarSign}
                            isExpanded={expandedSections.totals}
                            onToggle={() => toggleSection('totals')}
                            badge={{
                                text: formatCurrency(total),
                                color: 'bg-green-100 text-green-800'
                            }}
                        />

                        <AnimatePresence>
                            {expandedSections.totals && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-6">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                                <span className="text-gray-600">Subtotal:</span>
                                                <span className="font-medium text-lg">{formatCurrency(subtotal)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                                <span className="text-gray-600">Tax:</span>
                                                <span className="font-medium text-lg">{formatCurrency(taxTotal)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                                <span className="text-gray-600">Shipping:</span>
                                                <div className="flex items-center">
                                                    <input
                                                        type="number"
                                                        name="shipping_amount"
                                                        value={purchaseOrder.shipping_amount || 0}
                                                        onChange={handleChange}
                                                        min="0"
                                                        step="0.01"
                                                        className="w-32 border-2 border-gray-300 rounded-lg p-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                                <span className="text-gray-600">Order Discount:</span>
                                                <div className="flex items-center">
                                                    <input
                                                        type="number"
                                                        name="discount_amount"
                                                        value={purchaseOrder.discount_amount || 0}
                                                        onChange={handleChange}
                                                        min="0"
                                                        step="0.01"
                                                        className="w-32 border-2 border-gray-300 rounded-lg p-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center py-4 bg-gray-50 rounded-lg px-4">
                                                <span className="text-xl font-bold text-gray-900">Total:</span>
                                                <span className="text-2xl font-bold text-green-600">{formatCurrency(total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <SectionHeader
                            title="Shipping Address"
                            icon={MapPin}
                            isExpanded={expandedSections.shipping}
                            onToggle={() => toggleSection('shipping')}
                        />

                        <AnimatePresence>
                            {expandedSections.shipping && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-6">
                                        {purchaseOrder.vendor_id && (
                                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={useVendorAddress}
                                                        onChange={e => setUseVendorAddress(e.target.checked)}
                                                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <div className="flex items-center">
                                                        <Building2 className="w-4 h-4 text-blue-600 mr-2" />
                                                        <span className="text-sm font-medium text-blue-800">Use vendor address</span>
                                                    </div>
                                                </label>
                                                <p className="text-xs text-blue-600 mt-2 ml-7">
                                                    Automatically fill shipping address with the selected vendor's address
                                                </p>
                                            </div>
                                        )}

                                        <div className={cn(
                                            "grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-200",
                                            useVendorAddress && "opacity-75"
                                        )}>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                                                <input
                                                    type="text"
                                                    name="shipping_address_line1"
                                                    value={purchaseOrder.shipping_address_line1 || ''}
                                                    onChange={handleChange}
                                                    disabled={useVendorAddress}
                                                    className={cn(
                                                        "w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                        useVendorAddress && "bg-gray-100 cursor-not-allowed"
                                                    )}
                                                    placeholder={useVendorAddress ? "Auto-filled from vendor" : "Enter address line 1"}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                                                <input
                                                    type="text"
                                                    name="shipping_address_line2"
                                                    value={purchaseOrder.shipping_address_line2 || ''}
                                                    onChange={handleChange}
                                                    disabled={useVendorAddress}
                                                    className={cn(
                                                        "w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                        useVendorAddress && "bg-gray-100 cursor-not-allowed"
                                                    )}
                                                    placeholder={useVendorAddress ? "Auto-filled from vendor" : "Enter address line 2 (optional)"}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                                <input
                                                    type="text"
                                                    name="shipping_city"
                                                    value={purchaseOrder.shipping_city || ''}
                                                    onChange={handleChange}
                                                    disabled={useVendorAddress}
                                                    className={cn(
                                                        "w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                        useVendorAddress && "bg-gray-100 cursor-not-allowed"
                                                    )}
                                                    placeholder={useVendorAddress ? "Auto-filled from vendor" : "Enter city"}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                                                <input
                                                    type="text"
                                                    name="shipping_state"
                                                    value={purchaseOrder.shipping_state || ''}
                                                    onChange={handleChange}
                                                    disabled={useVendorAddress}
                                                    className={cn(
                                                        "w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                        useVendorAddress && "bg-gray-100 cursor-not-allowed"
                                                    )}
                                                    placeholder={useVendorAddress ? "Auto-filled from vendor" : "Enter state/province"}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                                <input
                                                    type="text"
                                                    name="shipping_country"
                                                    value={purchaseOrder.shipping_country || ''}
                                                    onChange={handleChange}
                                                    disabled={useVendorAddress}
                                                    className={cn(
                                                        "w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                        useVendorAddress && "bg-gray-100 cursor-not-allowed"
                                                    )}
                                                    placeholder={useVendorAddress ? "Auto-filled from vendor" : "Enter country"}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                                                <input
                                                    type="text"
                                                    name="shipping_postal_code"
                                                    value={purchaseOrder.shipping_postal_code || ''}
                                                    onChange={handleChange}
                                                    className="w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                    placeholder="Enter postal code"
                                                />
                                                {useVendorAddress && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Note: Postal code not available from vendor data, please enter manually
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Billing Address */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <SectionHeader
                            title="Billing Address"
                            icon={CreditCard}
                            isExpanded={expandedSections.billing}
                            onToggle={() => toggleSection('billing')}
                        />

                        <AnimatePresence>
                            {expandedSections.billing && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-6">
                                        <div className="mb-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={useSameAddress}
                                                    onChange={e => setUseSameAddress(e.target.checked)}
                                                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <span className="text-sm text-gray-700">Same as shipping address</span>
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                                                <input
                                                    type="text"
                                                    name="billing_address_line1"
                                                    value={purchaseOrder.billing_address_line1 || ''}
                                                    onChange={handleChange}
                                                    disabled={useSameAddress}
                                                    className={cn(
                                                        "w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                        useSameAddress && "bg-gray-100 cursor-not-allowed"
                                                    )}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                                                <input
                                                    type="text"
                                                    name="billing_address_line2"
                                                    value={purchaseOrder.billing_address_line2 || ''}
                                                    onChange={handleChange}
                                                    disabled={useSameAddress}
                                                    className={cn(
                                                        "w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                        useSameAddress && "bg-gray-100 cursor-not-allowed"
                                                    )}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                                <input
                                                    type="text"
                                                    name="billing_city"
                                                    value={purchaseOrder.billing_city || ''}
                                                    onChange={handleChange}
                                                    disabled={useSameAddress}
                                                    className={cn(
                                                        "w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                        useSameAddress && "bg-gray-100 cursor-not-allowed"
                                                    )}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                                                <input
                                                    type="text"
                                                    name="billing_state"
                                                    value={purchaseOrder.billing_state || ''}
                                                    onChange={handleChange}
                                                    disabled={useSameAddress}
                                                    className={cn(
                                                        "w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                        useSameAddress && "bg-gray-100 cursor-not-allowed"
                                                    )}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                                <input
                                                    type="text"
                                                    name="billing_country"
                                                    value={purchaseOrder.billing_country || ''}
                                                    onChange={handleChange}
                                                    disabled={useSameAddress}
                                                    className={cn(
                                                        "w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                        useSameAddress && "bg-gray-100 cursor-not-allowed"
                                                    )}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                                                <input
                                                    type="text"
                                                    name="billing_postal_code"
                                                    value={purchaseOrder.billing_postal_code || ''}
                                                    onChange={handleChange}
                                                    disabled={useSameAddress}
                                                    className={cn(
                                                        "w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200",
                                                        useSameAddress && "bg-gray-100 cursor-not-allowed"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Custom Fields */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <SectionHeader
                            title="Custom Fields"
                            icon={Info}
                            isExpanded={expandedSections.custom}
                            onToggle={() => toggleSection('custom')}
                        />

                        <AnimatePresence>
                            {expandedSections.custom && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-6">
                                        <CustomFieldsForm
                                            metadata={purchaseOrder.metadata}
                                            onChange={(metadata) => setPurchaseOrder(prev => ({ ...prev, metadata }))}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                    <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-6 py-3 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                        >
                            Cancel
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={savePurchaseOrder}
                            disabled={saving}
                            className="flex items-center justify-center px-6 py-3 border-2 border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    {isEditing ? 'Update Purchase Order' : 'Create Purchase Order'}
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>
            </div>
        </div>
    );
};