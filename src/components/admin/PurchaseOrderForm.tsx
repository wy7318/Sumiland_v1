import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, X, Plus, Trash2, Search, Building2, Package, Scale,
  AlertCircle, Calendar, DollarSign, Check 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type Vendor = {
  id: string;
  name: string;
  email: string;
  contact_person: string;
};

type Product = {
  id: string;
  name: string;
  description: string;
  last_purchase_cost: number;
  stock_unit: 'weight' | 'quantity';
  weight_unit: 'kg' | 'g' | 'lb' | 'oz' | null;
};

type PurchaseOrderItem = {
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_cost: number;
  unit_weight?: number;
  weight_unit?: 'kg' | 'g' | 'lb' | 'oz' | null;
  total_weight?: number;
  notes?: string;
  stock_unit?: 'weight' | 'quantity';
};

type FormData = {
  vendor_id: string;
  vendor_name?: string;
  expected_delivery_date: string;
  notes: string;
  items: PurchaseOrderItem[];
};

const initialFormData: FormData = {
  vendor_id: '',
  expected_delivery_date: '',
  notes: '',
  items: []
};

export function PurchaseOrderForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  
  // Search states
  const [vendorSearch, setVendorSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);

  const vendorSearchRef = useRef<HTMLDivElement>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVendors();
    fetchProducts();
    if (id) {
      fetchPurchaseOrder();
    }

    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (vendorSearchRef.current && !vendorSearchRef.current.contains(event.target as Node)) {
        setShowVendorDropdown(false);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [id]);

  // Filter vendors based on search
  useEffect(() => {
    if (vendorSearch) {
      const searchTerm = vendorSearch.toLowerCase();
      const filtered = vendors.filter(vendor => 
        vendor.name.toLowerCase().includes(searchTerm) ||
        vendor.email.toLowerCase().includes(searchTerm) ||
        vendor.contact_person?.toLowerCase().includes(searchTerm)
      );
      setFilteredVendors(filtered);
    } else {
      setFilteredVendors([]);
    }
  }, [vendorSearch, vendors]);

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

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
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
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    }
  };

  const fetchPurchaseOrder = async () => {
    try {
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendor:vendors(*),
          items:purchase_order_items(
            *,
            product:products(
              name,
              stock_unit,
              weight_unit
            )
          )
        `)
        .eq('id', id)
        .single();

      if (poError) throw poError;

      if (po) {
        setFormData({
          vendor_id: po.vendor_id,
          vendor_name: po.vendor.name,
          expected_delivery_date: po.expected_delivery_date || '',
          notes: po.notes || '',
          items: po.items.map((item: any) => ({
            product_id: item.product_id,
            product_name: item.product.name,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            unit_weight: item.unit_weight,
            weight_unit: item.weight_unit,
            total_weight: item.total_weight,
            notes: item.notes,
            stock_unit: item.product.stock_unit
          }))
        });
      }
    } catch (err) {
      console.error('Error fetching purchase order:', err);
      setError('Failed to load purchase order');
    }
  };

  const handleVendorSelect = (vendor: Vendor) => {
    setFormData(prev => ({
      ...prev,
      vendor_id: vendor.id,
      vendor_name: vendor.name
    }));
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
                ...item,
                product_id: product.id,
                product_name: product.name,
                unit_cost: product.last_purchase_cost || 0,
                stock_unit: product.stock_unit,
                weight_unit: product.weight_unit,
                unit_weight: 0,
                total_weight: 0
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
            unit_cost: product.last_purchase_cost || 0,
            stock_unit: product.stock_unit,
            weight_unit: product.weight_unit,
            unit_weight: 0,
            total_weight: 0
          }
        ]
      }));
    }
    setProductSearch('');
    setShowProductDropdown(false);
    setSelectedProductIndex(null);
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          
          // If updating quantity or unit_weight, recalculate total_weight
          if (field === 'quantity' || field === 'unit_weight') {
            updatedItem.total_weight = updatedItem.unit_weight * updatedItem.quantity;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendor_id) {
      setError('Please select a vendor');
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

      const poData = {
        vendor_id: formData.vendor_id,
        expected_delivery_date: formData.expected_delivery_date || null,
        notes: formData.notes || null,
        total_amount: formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0),
        status: 'draft',
        created_by: userData.user.id,
        updated_by: userData.user.id
      };

      if (id) {
        // Update existing PO
        const { error: poError } = await supabase
          .from('purchase_orders')
          .update(poData)
          .eq('id', id);

        if (poError) throw poError;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('purchase_order_items')
          .delete()
          .eq('po_id', id);

        if (deleteError) throw deleteError;

        // Insert new items
        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(
            formData.items.map(item => ({
              po_id: id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              unit_weight: item.unit_weight,
              weight_unit: item.weight_unit,
              total_weight: item.total_weight,
              notes: item.notes,
              status: 'pending'
            }))
          );

        if (itemsError) throw itemsError;
      } else {
        // Create new PO
        const { data: po, error: poError } = await supabase
          .from('purchase_orders')
          .insert([{
            ...poData,
            po_number: await generatePONumber()
          }])
          .select()
          .single();

        if (poError) throw poError;

        // Insert items
        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(
            formData.items.map(item => ({
              po_id: po.id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              unit_weight: item.unit_weight,
              weight_unit: item.weight_unit,
              total_weight: item.total_weight,
              notes: item.notes,
              status: 'pending'
            }))
          );

        if (itemsError) throw itemsError;
      }

      navigate('/admin/purchase-orders');
    } catch (err) {
      console.error('Error saving purchase order:', err);
      setError(err instanceof Error ? err.message : 'Failed to save purchase order');
    } finally {
      setLoading(false);
    }
  };

  const generatePONumber = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_po_number');
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error generating PO number:', err);
      throw err;
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
          {id ? 'Edit Purchase Order' : 'Create Purchase Order'}
        </h1>
        <button
          onClick={() => navigate('/admin/purchase-orders')}
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
          <div ref={vendorSearchRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor
            </label>
            {formData.vendor_name ? (
              <div className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center">
                  <Building2 className="w-5 h-5 text-gray-400 mr-2" />
                  <span>{formData.vendor_name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, vendor_id: '', vendor_name: '' }));
                    setVendorSearch('');
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
                  }}
                  onFocus={() => setShowVendorDropdown(true)}
                  placeholder="Search vendors..."
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
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-gray-500">
                      No vendors found
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Delivery Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Order Items</h2>
            <div className="flex gap-2">
              <div ref={productSearchRef} className="relative">
                <div className="flex items-center">
                  <input
                    type="text"
                    value={selectedProductIndex === null ? '' : productSearch}
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
                onClick={() => {
                  setSelectedProductIndex(null);
                  setProductSearch('');
                  setShowProductDropdown(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </button>
            </div>
          </div>

          {formData.items.map((item, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product
                  </label>
                  {item.product_name ? (
                    <div className="flex items-center justify-between p-2 border rounded-lg bg-white">
                      <div className="flex items-center">
                        {item.stock_unit === 'quantity' ? (
                          <Package className="w-5 h-5 text-gray-400 mr-2" />
                        ) : (
                          <Scale className="w-5 h-5 text-gray-400 mr-2" />
                        )}
                        <span>{item.product_name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductIndex(index);
                          setProductSearch('');

                          setShowProductDropdown(true);
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
                        value={selectedProductIndex === index ? productSearch : ''}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowProductDropdown(true);
                          setSelectedProductIndex(index);
                        }}
                        onFocus={() => {
                          setShowProductDropdown(true);
                          setSelectedProductIndex(index);
                        }}
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    step={item.stock_unit === 'weight' ? '0.001' : '1'}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                {item.stock_unit === 'weight' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Weight ({item.weight_unit})
                    </label>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={item.unit_weight}
                      onChange={(e) => updateItem(index, 'unit_weight', parseFloat(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Cost
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_cost}
                    onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={item.notes || ''}
                  onChange={(e) => updateItem(index, 'notes', e.target.value)}
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
                <div className="text-right space-y-1">
                  {item.stock_unit === 'weight' && (
                    <div className="text-sm text-gray-500">
                      Total Weight: {(item.total_weight || 0).toFixed(3)} {item.weight_unit}
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-gray-500">Line Total:</span>
                    <span className="ml-2 font-medium">
                      ${(item.quantity * item.unit_cost).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <div className="text-right">
              <span className="text-lg font-medium">Total:</span>
              <span className="ml-2 text-xl font-bold">
                ${formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0).toFixed(2)}
              </span>
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

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/purchase-orders')}
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
            {loading ? 'Saving...' : 'Save Purchase Order'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
