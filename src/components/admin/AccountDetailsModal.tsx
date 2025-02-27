import { motion } from 'framer-motion';
import { X, Building2, Mail, Phone, User, MapPin, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

type Vendor = {
  id: string;
  name: string;
  type: string;
  status: string;
  payment_terms: string | null;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    company: string | null;
  } | null;
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
  organization_id: string;
};

type Props = {
  vendor: Vendor;
  onClose: () => void;
};

export function AccountDetailsModal({ vendor, onClose }: Props) {
  const formatAddress = (
    line1: string | null,
    line2: string | null,
    city: string | null,
    state: string | null,
    country: string | null
  ) => {
    return [line1, line2, city, state, country]
      .filter(Boolean)
      .join(', ');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Account Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <Link
                to={`/admin/vendors/${vendor.id}/edit`}
                className="text-primary-600 hover:text-primary-700 flex items-center"
                onClick={onClose}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                View Full Details
              </Link>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center">
                <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <div className="font-medium">{vendor.name}</div>
                  <div className="text-sm text-gray-500">
                    Type: {vendor.type}
                  </div>
                </div>
              </div>
              {vendor.payment_terms && (
                <div className="text-sm text-gray-600">
                  Payment Terms: {vendor.payment_terms}
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          {vendor.customer && (
            <div>
              <h3 className="text-lg font-medium mb-4">Contact Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <div className="font-medium">
                      {vendor.customer.first_name} {vendor.customer.last_name}
                    </div>
                    {vendor.customer.company && (
                      <div className="text-sm text-gray-500">
                        {vendor.customer.company}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-gray-400 mr-3" />
                  <a
                    href={`mailto:${vendor.customer.email}`}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {vendor.customer.email}
                  </a>
                </div>
                {vendor.customer.phone && (
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-gray-400 mr-3" />
                    <a
                      href={`tel:${vendor.customer.phone}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {vendor.customer.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shipping Address */}
            <div>
              <h3 className="text-lg font-medium mb-4">Shipping Address</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                  <div className="text-sm text-gray-600">
                    {formatAddress(
                      vendor.shipping_address_line1,
                      vendor.shipping_address_line2,
                      vendor.shipping_city,
                      vendor.shipping_state,
                      vendor.shipping_country
                    ) || 'No shipping address provided'}
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <h3 className="text-lg font-medium mb-4">Billing Address</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                  <div className="text-sm text-gray-600">
                    {formatAddress(
                      vendor.billing_address_line1,
                      vendor.billing_address_line2,
                      vendor.billing_city,
                      vendor.billing_state,
                      vendor.billing_country
                    ) || 'No billing address provided'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}