import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

const initialFormData: CustomerFormData = {
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

export function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof CustomerFormData, string>>>({});

  useEffect(() => {
    if (id) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('customer_id', id)
        .single();

      if (error) throw error;
      if (customer) {
        setFormData(customer);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CustomerFormData, string>> = {};

    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      errors.email = 'Invalid email address';
    }

    if (formData.phone && !/^\+?[\d\s-()]{10,}$/.test(formData.phone)) {
      errors.phone = 'Invalid phone number';
    }

    if (!formData.address_line1.trim()) {
      errors.address_line1 = 'Address is required';
    }

    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      errors.state = 'State is required';
    }

    if (!formData.zip_code.trim()) {
      errors.zip_code = 'ZIP code is required';
    }

    if (!formData.country.trim()) {
      errors.country = 'Country is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      if (id) {
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('customer_id', id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('customers')
          .insert([{
            ...formData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (insertError) throw insertError;
      }

      navigate('/admin/customers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer');
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
          {id ? 'Edit Customer' : 'Add New Customer'}
        </h1>
        <button
          onClick={() => navigate('/admin/customers')}
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
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              className={`w-full px-4 py-2 rounded-lg border ${
                validationErrors.first_name 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
              } outline-none`}
            />
            {validationErrors.first_name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.first_name}</p>
            )}
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              className={`w-full px-4 py-2 rounded-lg border ${
                validationErrors.last_name 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
              } outline-none`}
            />
            {validationErrors.last_name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.last_name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={`w-full px-4 py-2 rounded-lg border ${
                validationErrors.email 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
              } outline-none`}
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className={`w-full px-4 py-2 rounded-lg border ${
                validationErrors.phone 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
              } outline-none`}
            />
            {validationErrors.phone && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700 mb-1">
              Address Line 1 *
            </label>
            <input
              type="text"
              id="address_line1"
              value={formData.address_line1}
              onChange={(e) => setFormData(prev => ({ ...prev, address_line1: e.target.value }))}
              className={`w-full px-4 py-2 rounded-lg border ${
                validationErrors.address_line1 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
              } outline-none`}
            />
            {validationErrors.address_line1 && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.address_line1}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700 mb-1">
              Address Line 2
            </label>
            <input
              type="text"
              id="address_line2"
              value={formData.address_line2}
              onChange={(e) => setFormData(prev => ({ ...prev, address_line2: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <input
              type="text"
              id="city"
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              className={`w-full px-4 py-2 rounded-lg border ${
                validationErrors.city 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
              } outline-none`}
            />
            {validationErrors.city && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.city}</p>
            )}
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
              State *
            </label>
            <input
              type="text"
              id="state"
              value={formData.state}
              onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
              className={`w-full px-4 py-2 rounded-lg border ${
                validationErrors.state 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
              } outline-none`}
            />
            {validationErrors.state && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.state}</p>
            )} </div>

          <div>
            <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code *
            </label>
            <input
              type="text"
              id="zip_code"
              value={formData.zip_code}
              onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
              className={`w-full px-4 py-2 rounded-lg border ${
                validationErrors.zip_code 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
              } outline-none`}
            />
            {validationErrors.zip_code && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.zip_code}</p>
            )}
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Country *
            </label>
            <input
              type="text"
              id="country"
              value={formData.country}
              onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
              className={`w-full px-4 py-2 rounded-lg border ${
                validationErrors.country 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
              } outline-none`}
            />
            {validationErrors.country && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.country}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/customers')}
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
            {loading ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}