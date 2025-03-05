import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Save, AlertCircle, CheckCircle, Building2, Globe, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader } from '@googlemaps/js-api-loader';

type Organization = {
  id: string;
  name: string;
  website_url: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip_code: string | null;
  billing_country: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip_code: string | null;
  shipping_country: string | null;
  status: 'active' | 'inactive';
  type: string | null;
};

export function OrganizationSettings() {
  const { organizations, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [useShippingForBilling, setUseShippingForBilling] = useState(false);
  
  const shippingAutocompleteRef = useRef<google.maps.places.Autocomplete>();
  const billingAutocompleteRef = useRef<google.maps.places.Autocomplete>();

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

    setOrganization(prev => {
      if (!prev) return null;
      
      const updates = {
        [`${type}_address_line1`]: `${streetNumber} ${route}`.trim(),
        [`${type}_city`]: city,
        [`${type}_state`]: state,
        [`${type}_zip_code`]: zipCode,
        [`${type}_country`]: country
      };

      return { ...prev, ...updates };
    });
  };

  useEffect(() => {
    // Get the first organization where user is admin or owner
    const adminOrg = organizations.find(org => 
      org.role === 'admin' || org.role === 'owner'
    );
    
    if (adminOrg) {
      fetchOrganization(adminOrg.id);
    }
  }, [organizations]);

  const fetchOrganization = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (error) throw error;
      setOrganization(data);

      // Check if billing address matches shipping address
      if (data) {
        const shippingMatches = 
          data.billing_address_line1 === data.shipping_address_line1 &&
          data.billing_address_line2 === data.shipping_address_line2 &&
          data.billing_city === data.shipping_city &&
          data.billing_state === data.shipping_state &&
          data.billing_zip_code === data.shipping_zip_code &&
          data.billing_country === data.shipping_country;

        setUseShippingForBilling(shippingMatches);
      }
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError('Failed to load organization details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !user) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // If using shipping for billing, copy shipping address to billing
      const updateData = {
        ...organization,
        ...(useShippingForBilling ? {
          billing_address_line1: organization.shipping_address_line1,
          billing_address_line2: organization.shipping_address_line2,
          billing_city: organization.shipping_city,
          billing_state: organization.shipping_state,
          billing_zip_code: organization.shipping_zip_code,
          billing_country: organization.shipping_country
        } : {}),
        updated_at: new Date().toISOString(),
        updated_by: user.id
      };

      const { error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organization.id);

      if (error) throw error;
      setSuccess('Organization settings updated successfully');
    } catch (err) {
      console.error('Error updating organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to update organization');
    } finally {
      setLoading(false);
    }
  };

  if (!organization) {
    return (
      <div className="text-center text-gray-500">
        You need admin or owner access to manage organization settings.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto"
    >
      <h2 className="text-2xl font-bold mb-6">Organization Settings</h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={organization.name}
                onChange={(e) => setOrganization(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="url"
                  value={organization.website_url || ''}
                  onChange={(e) => setOrganization(prev => prev ? { ...prev, website_url: e.target.value } : null)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  placeholder="https://"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Shipping Address
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                id="shipping-address-line1"
                type="text"
                value={organization.shipping_address_line1 || ''}
                onChange={(e) => setOrganization(prev => prev ? { ...prev, shipping_address_line1: e.target.value } : null)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                placeholder="Start typing to search address..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={organization.shipping_address_line2 || ''}
                onChange={(e) => setOrganization(prev => prev ? { ...prev, shipping_address_line2: e.target.value } : null)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={organization.shipping_city || ''}
                onChange={(e) => setOrganization(prev => prev ? { ...prev, shipping_city: e.target.value } : null)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={organization.shipping_state || ''}
                onChange={(e) => setOrganization(prev => prev ? { ...prev, shipping_state: e.target.value } : null)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                value={organization.shipping_zip_code || ''}
                onChange={(e) => setOrganization(prev => prev ? { ...prev, shipping_zip_code: e.target.value } : null)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                value={organization.shipping_country || ''}
                onChange={(e) => setOrganization(prev => prev ? { ...prev, shipping_country: e.target.value } : null)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Billing Address
            </h3>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useShippingForBilling}
                onChange={(e) => {
                  setUseShippingForBilling(e.target.checked);
                  if (e.target.checked && organization) {
                    setOrganization(prev => prev ? {
                      ...prev,
                      billing_address_line1: prev.shipping_address_line1,
                      billing_address_line2: prev.shipping_address_line2,
                      billing_city: prev.shipping_city,
                      billing_state: prev.shipping_state,
                      billing_zip_code: prev.shipping_zip_code,
                      billing_country: prev.shipping_country
                    } : null);
                  }
                }}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">Same as shipping</span>
            </label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                id="billing-address-line1"
                type="text"
                value={organization.billing_address_line1 || ''}
                onChange={(e) => setOrganization(prev => prev ? { ...prev, billing_address_line1: e.target.value } : null)}
                disabled={useShippingForBilling}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
                placeholder={!useShippingForBilling ? "Start typing to search address..." : undefined}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={organization.billing_address_line2 || ''}
                onChange={(e) => setOrganization(prev => prev ? { ...prev, billing_address_line2: e.target.value } : null)}
                disabled={useShippingForBilling}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={organization.billing_city || ''}
                onChange={(e) => setOrganization(prev => prev ? { ...prev, billing_city: e.target.value } : null)}
                disabled={useShippingForBilling}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={organization.billing_state || ''}
                onChange={(e) => setOrganization(prev => prev ? { ...prev, billing_state: e.target.value } : null)}
                disabled={useShippingForBilling}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                value={organization.billing_zip_code || ''}
                onChange={(e) => setOrganization(prev => prev ? { ...prev, billing_zip_code: e.target.value } : null)}
                disabled={useShippingForBilling}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                value={organization.billing_country || ''}
                onChange={(e) => setOrganization(prev => prev ? { ...prev, billing_country: e.target.value } : null)}
                disabled={useShippingForBilling}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}