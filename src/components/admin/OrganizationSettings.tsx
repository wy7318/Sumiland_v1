// import { useState, useEffect, useRef } from 'react';
// import { motion } from 'framer-motion';
// import { Save, AlertCircle, CheckCircle, Building2, Globe, MapPin, Mail, X, Star, StarOff } from 'lucide-react';
// import { supabase } from '../../lib/supabase';
// import { useAuth } from '../../contexts/AuthContext';
// import { Loader } from '@googlemaps/js-api-loader';
// import { useOrganization } from '../../contexts/OrganizationContext';
// import { EmailConfigModal } from './EmailConfigModal';
// import { AutomationSettings } from './AutomationSettings';

// type Organization = {
//   id: string;
//   name: string;
//   website_url: string | null;
//   email_domain: string | null;
//   billing_address_line1: string | null;
//   billing_address_line2: string | null;
//   billing_city: string | null;
//   billing_state: string | null;
//   billing_zip_code: string | null;
//   billing_country: string | null;
//   shipping_address_line1: string | null;
//   shipping_address_line2: string | null;
//   shipping_city: string | null;
//   shipping_state: string | null;
//   shipping_zip_code: string | null;
//   shipping_country: string | null;
//   status: 'active' | 'inactive';
//   type: string | null;
//   timezone: string | null;
//   logo_url?: string;
//   lead_auto_response?: boolean;
//   lead_response_template?: string;
//   case_auto_response?: boolean;
//   case_response_template?: string;
// };

// type EmailConfig = {
//   id: string;
//   provider: 'gmail' | 'outlook';
//   email: string;
//   created_at: string;
//   is_default?: boolean;
// };

// export function OrganizationSettings() {
//   const { user } = useAuth();
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);
//   const [organization, setOrganization] = useState<Organization | null>(null);
//   const [useShippingForBilling, setUseShippingForBilling] = useState(false);
//   const { selectedOrganization } = useOrganization();
//   const [showEmailModal, setShowEmailModal] = useState(false);
//   const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([]);

//   const shippingAutocompleteRef = useRef<google.maps.places.Autocomplete>();
//   const billingAutocompleteRef = useRef<google.maps.places.Autocomplete>();

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

//     setOrganization(prev => {
//       if (!prev) return null;

//       const updates = {
//         [`${type}_address_line1`]: `${streetNumber} ${route}`.trim(),
//         [`${type}_city`]: city,
//         [`${type}_state`]: state,
//         [`${type}_zip_code`]: zipCode,
//         [`${type}_country`]: country
//       };

//       return { ...prev, ...updates };
//     });
//   };

//   useEffect(() => {
//     if (selectedOrganization?.id) {
//       fetchOrganization(selectedOrganization.id);
//       fetchEmailConfigs(selectedOrganization.id);
//     }
//   }, [selectedOrganization]);

//   const fetchOrganization = async (orgId: string) => {
//     try {
//       const { data, error } = await supabase
//         .from('organizations')
//         .select('*')
//         .eq('id', orgId)
//         .single();

//       if (error) throw error;
//       setOrganization(data);

//       // Check if billing address matches shipping address
//       if (data) {
//         const shippingMatches =
//           data.billing_address_line1 === data.shipping_address_line1 &&
//           data.billing_address_line2 === data.shipping_address_line2 &&
//           data.billing_city === data.shipping_city &&
//           data.billing_state === data.shipping_state &&
//           data.billing_zip_code === data.shipping_zip_code &&
//           data.billing_country === data.shipping_country;

//         setUseShippingForBilling(shippingMatches);
//       }
//     } catch (err) {
//       console.error('Error fetching organization:', err);
//       setError('Failed to load organization details');
//     }
//   };

//   const fetchEmailConfigs = async (orgId: string) => {
//     try {
//       const { data, error } = await supabase
//         .from('email_configurations')
//         .select('id, provider, email, created_at, is_default')
//         .eq('organization_id', orgId)
//         .eq('user_id', user.id);

//       if (error) throw error;

//       // If there's only one email config, make sure it's set as default
//       if (data && data.length === 1 && !data[0].is_default) {
//         await setDefaultEmail(data[0].id);
//         data[0].is_default = true;
//       }

//       setEmailConfigs(data || []);
//     } catch (err) {
//       console.error('Error fetching email configurations:', err);
//     }
//   };

//   const setDefaultEmail = async (configId: string) => {
//     setLoading(true);
//     setError(null);

//     try {
//       // First, remove default flag from all email configs for this organization
//       const { error: resetError } = await supabase
//         .from('email_configurations')
//         .update({ is_default: false })
//         .eq('organization_id', selectedOrganization.id);

//       if (resetError) throw resetError;

//       // Then set the new default
//       const { error: updateError } = await supabase
//         .from('email_configurations')
//         .update({ is_default: true })
//         .eq('id', configId);

//       if (updateError) throw updateError;

//       // Update local state
//       setEmailConfigs(prev => prev.map(config => ({
//         ...config,
//         is_default: config.id === configId
//       })));

//       setSuccess('Default email updated successfully');
//     } catch (err) {
//       console.error('Error setting default email:', err);
//       setError('Failed to set default email');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file || !selectedOrganization) return;

//     const fileExt = file.name.split('.').pop();
//     const fileName = `${selectedOrganization.id}-${Date.now()}.${fileExt}`;
//     const filePath = `logos/${fileName}`;

//     setLoading(true);
//     setError(null);
//     setSuccess(null);

//     // Upload to Supabase Storage
//     const { error: uploadError } = await supabase
//       .storage
//       .from('organization-logos')
//       .upload(filePath, file, {
//         cacheControl: '3600',
//         upsert: true,
//         contentType: file.type
//       });

//     if (uploadError) {
//       console.error('Logo upload error:', uploadError);
//       setError('Failed to upload logo');
//       setLoading(false);
//       return;
//     }

//     if (file.size > 5 * 1024 * 1024) {
//       setError('Logo file size should be less than 5MB');
//       return;
//     }

//     // Get public URL
//     const { data: publicUrlData } = supabase
//       .storage
//       .from('organization-logos')
//       .getPublicUrl(filePath);

//     const logoUrl = publicUrlData.publicUrl;

//     // Save logo_url to DB
//     const { error: dbError } = await supabase
//       .from('organizations')
//       .update({ logo_url: logoUrl, updated_at: new Date().toISOString(), updated_by: user.id })
//       .eq('id', selectedOrganization.id);

//     if (dbError) {
//       console.error('Error saving logo_url:', dbError);
//       setError('Failed to update logo URL');
//     } else {
//       setOrganization(prev => prev ? { ...prev, logo_url: logoUrl } : prev);
//       setSuccess('Logo uploaded successfully');
//     }

//     setLoading(false);
//   };

//   const handleAutomationSettingsUpdate = async (automationSettings) => {
//     if (!selectedOrganization?.id) return;

//     setLoading(true);
//     setError(null);
//     setSuccess(null);

//     try {
//       const { error } = await supabase
//         .from('organizations')
//         .update({
//           lead_auto_response: automationSettings.lead_auto_response,
//           lead_response_template: automationSettings.lead_response_template,
//           case_auto_response: automationSettings.case_auto_response,
//           case_response_template: automationSettings.case_response_template,
//           updated_at: new Date().toISOString(),
//           updated_by: user.id
//         })
//         .eq('id', selectedOrganization.id);

//       if (error) throw error;

//       // Update local state
//       setOrganization(prev => {
//         if (!prev) return null;
//         return {
//           ...prev,
//           ...automationSettings
//         };
//       });

//       setSuccess('Automation settings updated successfully');
//     } catch (err) {
//       console.error('Error updating automation settings:', err);
//       setError('Failed to update automation settings');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!selectedOrganization?.id) return;

//     setLoading(true);
//     setError(null);
//     setSuccess(null);

//     const updatePayload = {
//       name: organization?.name,
//       website_url: organization?.website_url,
//       email_domain: organization?.email_domain,
//       timezone: organization?.timezone || null,
//       shipping_address_line1: organization?.shipping_address_line1,
//       shipping_address_line2: organization?.shipping_address_line2,
//       shipping_city: organization?.shipping_city,
//       shipping_state: organization?.shipping_state,
//       shipping_zip_code: organization?.shipping_zip_code,
//       shipping_country: organization?.shipping_country,
//       billing_address_line1: useShippingForBilling
//         ? organization?.shipping_address_line1
//         : organization?.billing_address_line1,
//       billing_address_line2: useShippingForBilling
//         ? organization?.shipping_address_line2
//         : organization?.billing_address_line2,
//       billing_city: useShippingForBilling
//         ? organization?.shipping_city
//         : organization?.billing_city,
//       billing_state: useShippingForBilling
//         ? organization?.shipping_state
//         : organization?.billing_state,
//       billing_zip_code: useShippingForBilling
//         ? organization?.shipping_zip_code
//         : organization?.billing_zip_code,
//       billing_country: useShippingForBilling
//         ? organization?.shipping_country
//         : organization?.billing_country,
//       updated_at: new Date().toISOString(),
//       updated_by: user.id,
//     };

//     const { error } = await supabase
//       .from('organizations')
//       .update(updatePayload)
//       .eq('id', selectedOrganization.id);

//     if (error) {
//       console.error('Update Error:', error);
//       setError('Failed to update organization');
//     } else {
//       setSuccess('Organization settings updated successfully');
//     }

//     setLoading(false);
//   };

//   const handleEmailConfigSuccess = async () => {
//     setShowEmailModal(false);
//     if (selectedOrganization?.id) {
//       await fetchEmailConfigs(selectedOrganization.id);
//       setSuccess('Email configuration successfully added');
//     }
//   };

//   const handleRemoveEmailConfig = async (configId: string) => {
//     if (!confirm('Are you sure you want to remove this email configuration?')) {
//       return;
//     }

//     try {
//       // Check if this is the default email
//       const isDefault = emailConfigs.find(config => config.id === configId)?.is_default;

//       const { error } = await supabase
//         .from('email_configurations')
//         .delete()
//         .eq('id', configId)
//         .eq('user_id', user.id);

//       if (error) throw error;

//       // Update the UI by filtering out the removed config
//       const updatedConfigs = emailConfigs.filter(config => config.id !== configId);

//       // If we removed the default email and have other emails, set a new default
//       if (isDefault && updatedConfigs.length > 0) {
//         await setDefaultEmail(updatedConfigs[0].id);
//       }

//       setEmailConfigs(updatedConfigs);
//       setSuccess('Email configuration removed successfully');
//     } catch (err) {
//       console.error('Error removing email configuration:', err);
//       setError('Failed to remove email configuration');
//     }
//   };

//   if (!selectedOrganization || !organization) {
//     return (
//       <div className="text-center text-gray-500">
//         You need admin or owner access to manage organization settings.
//       </div>
//     );
//   }

//   return (
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       className="max-w-4xl mx-auto"
//     >
//       <h2 className="text-2xl font-bold mb-6">Organization Settings</h2>

//       {error && (
//         <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center">
//           <AlertCircle className="w-5 h-5 mr-2" />
//           {error}
//         </div>
//       )}

//       {success && (
//         <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-lg flex items-center">
//           <CheckCircle className="w-5 h-5 mr-2" />
//           {success}
//         </div>
//       )}

//       {/* Email Configuration Section */}
//       <div className="bg-white rounded-lg shadow p-6 mb-6">
//         <h3 className="text-lg font-semibold mb-4 flex items-center">
//           <Mail className="w-5 h-5 mr-2" />
//           Email Configuration
//         </h3>

//         <div className="mb-4">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Organization Email Domain
//           </label>
//           <div className="relative flex">
//             <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">@</span>
//             <input
//               type="text"
//               value={organization.email_domain || ''}
//               onChange={(e) => setOrganization(prev => prev ? { ...prev, email_domain: e.target.value } : null)}
//               className="flex-1 px-4 py-2 rounded-r-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
//               placeholder="yourdomain.com"
//             />
//           </div>
//           <p className="mt-1 text-sm text-gray-500">
//             Enter your organization's email domain. This helps us verify authentic email addresses from your organization.
//           </p>
//         </div>

//         <div className="mb-4">
//           <div className="flex justify-between items-center mb-2">
//             <h4 className="font-medium">Connected Email Accounts</h4>
//             <button
//               onClick={() => setShowEmailModal(true)}
//               className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
//             >
//               Connect Email
//             </button>
//           </div>

//           {emailConfigs.length === 0 ? (
//             <p className="text-gray-500 italic py-2">No email accounts connected yet</p>
//           ) : (
//             <ul className="divide-y divide-gray-200">
//               {emailConfigs.map(config => (
//                 <li key={config.id} className="py-3 flex items-center justify-between">
//                   <div className="flex items-center">
//                     <div className="bg-primary-100 p-2 rounded-full mr-3">
//                       <Mail className="w-4 h-4 text-primary-600" />
//                     </div>
//                     <div>
//                       <div className="font-medium flex items-center">
//                         {config.email}
//                         {config.is_default && (
//                           <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
//                             <Star className="w-3 h-3 mr-1" />
//                             Default
//                           </span>
//                         )}
//                       </div>
//                       <div className="text-sm text-gray-500 capitalize">{config.provider}</div>
//                     </div>
//                   </div>
//                   <div className="flex items-center space-x-2">
//                     {!config.is_default && (
//                       <button
//                         onClick={() => setDefaultEmail(config.id)}
//                         className="text-gray-500 hover:text-primary-600"
//                         title="Set as default email"
//                         disabled={loading}
//                       >
//                         <StarOff className="w-5 h-5" />
//                       </button>
//                     )}
//                     <button
//                       onClick={() => handleRemoveEmailConfig(config.id)}
//                       className="text-gray-400 hover:text-red-500"
//                       aria-label="Remove email configuration"
//                       disabled={loading}
//                     >
//                       <X className="w-5 h-5" />
//                     </button>
//                   </div>
//                 </li>
//               ))}
//             </ul>
//           )}

//           <p className="mt-4 text-sm text-gray-500">
//             Connected email accounts allow you to send emails on behalf of your organization through our system.
//             The default email (marked with a star) will be used for automated responses.
//           </p>
//         </div>
//       </div>

//       {/* Automation Settings Section */}
//       <AutomationSettings
//         organization={organization}
//         emailConfigs={emailConfigs}
//         isLoading={loading}
//         onUpdate={handleAutomationSettingsUpdate}
//       />

//       <form onSubmit={handleSubmit} className="space-y-6">
//         {/* Basic Information */}
//         <div className="bg-white rounded-lg shadow p-6">
//           <h3 className="text-lg font-semibold mb-4 flex items-center">
//             <Building2 className="w-5 h-5 mr-2" />
//             Basic Information
//           </h3>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Organization Name
//               </label>
//               <input
//                 type="text"
//                 value={organization.name}
//                 onChange={(e) => setOrganization(prev => prev ? { ...prev, name: e.target.value } : null)}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
//                 required
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Website URL
//               </label>
//               <div className="relative">
//                 <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
//                 <input
//                   type="url"
//                   value={organization.website_url || ''}
//                   onChange={(e) => setOrganization(prev => prev ? { ...prev, website_url: e.target.value } : null)}
//                   className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
//                   placeholder="https://"
//                 />
//               </div>
//             </div>

//             <div className="md:col-span-2">
//               <h4 className="text-md font-medium mb-2">Organization Logo</h4>
//               <div className="flex items-center space-x-4">
//                 {organization.logo_url ? (
//                   <img
//                     src={organization.logo_url}
//                     alt="Organization Logo"
//                     className="w-16 h-16 object-cover rounded-lg border"
//                   />
//                 ) : (
//                   <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded-lg border text-gray-400">
//                     No Logo
//                   </div>
//                 )}
//                 <input
//                   type="file"
//                   accept="image/*"
//                   onChange={handleLogoUpload}
//                   className="text-sm"
//                 />
//               </div>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Timezone
//               </label>
//               <select
//                 value={organization.timezone || ''}
//                 onChange={(e) => setOrganization(prev => prev ? { ...prev, timezone: e.target.value } : null)}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
//               >
//                 <option value="">Select Timezone</option>
//                 {Intl.supportedValuesOf('timeZone').map((tz) => (
//                   <option key={tz} value={tz}>
//                     {tz}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           </div>
//         </div>

//         {/* Shipping Address */}
//         <div className="bg-white rounded-lg shadow p-6">
//           <h3 className="text-lg font-semibold mb-4 flex items-center">
//             <MapPin className="w-5 h-5 mr-2" />
//             Shipping Address
//           </h3>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="md:col-span-2">
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Address Line 1
//               </label>
//               <input
//                 id="shipping-address-line1"
//                 type="text"
//                 value={organization.shipping_address_line1 || ''}
//                 onChange={(e) => setOrganization(prev => prev ? { ...prev, shipping_address_line1: e.target.value } : null)}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
//                 placeholder="Start typing to search address..."
//               />
//             </div>

//             <div className="md:col-span-2">
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Address Line 2
//               </label>
//               <input
//                 type="text"
//                 value={organization.shipping_address_line2 || ''}
//                 onChange={(e) => setOrganization(prev => prev ? { ...prev, shipping_address_line2: e.target.value } : null)}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 City
//               </label>
//               <input
//                 type="text"
//                 value={organization.shipping_city || ''}
//                 onChange={(e) => setOrganization(prev => prev ? { ...prev, shipping_city: e.target.value } : null)}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 State
//               </label>
//               <input
//                 type="text"
//                 value={organization.shipping_state || ''}
//                 onChange={(e) => setOrganization(prev => prev ? { ...prev, shipping_state: e.target.value } : null)}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 ZIP Code
//               </label>
//               <input
//                 type="text"
//                 value={organization.shipping_zip_code || ''}
//                 onChange={(e) => setOrganization(prev => prev ? { ...prev, shipping_zip_code: e.target.value } : null)}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Country
//               </label>
//               <input
//                 type="text"
//                 value={organization.shipping_country || ''}
//                 onChange={(e) => setOrganization(prev => prev ? { ...prev, shipping_country: e.target.value } : null)}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Billing Address */}
//         <div className="bg-white rounded-lg shadow p-6">
//           <div className="flex items-center justify-between mb-4">
//             <h3 className="text-lg font-semibold flex items-center">
//               <MapPin className="w-5 h-5 mr-2" />
//               Billing Address
//             </h3>
//             <label className="flex items-center space-x-2">
//               <input
//                 type="checkbox"
//                 checked={useShippingForBilling}
//                 onChange={(e) => {
//                   setUseShippingForBilling(e.target.checked);
//                   if (e.target.checked && organization) {
//                     setOrganization(prev => prev ? {
//                       ...prev,
//                       billing_address_line1: prev.shipping_address_line1,
//                       billing_address_line2: prev.shipping_address_line2,
//                       billing_city: prev.shipping_city,
//                       billing_state: prev.shipping_state,
//                       billing_zip_code: prev.shipping_zip_code,
//                       billing_country: prev.shipping_country
//                     } : null);
//                   }
//                 }}
//                 className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
//               />
//               <span className="text-sm text-gray-600">Same as shipping</span>
//             </label>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="md:col-span-2">
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Address Line 1
//               </label>
//               <input
//                 id="billing-address-line1"
//                 type="text"
//                 value={organization.billing_address_line1 || ''}
//                 onChange={(e) => setOrganization(prev => prev ? { ...prev, billing_address_line1: e.target.value } : null)}
//                 disabled={useShippingForBilling}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
//                 placeholder={!useShippingForBilling ? "Start typing to search address..." : undefined}
//               />
//             </div>

//             <div className="md:col-span-2">
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Address Line 2
//               </label>
//               <input
//                 type="text"
//                 value={organization.billing_address_line2 || ''}
//                 onChange={(e) => setOrganization(prev => prev ? { ...prev, billing_address_line2: e.target.value } : null)}
//                 disabled={useShippingForBilling}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 City
//               </label>
//               <input
//                 type="text"
//                 value={organization.billing_city || ''}
//                 onChange={(e) => setOrganization(prev => prev ? { ...prev, billing_city: e.target.value } : null)}
//                 disabled={useShippingForBilling}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 State
//               </label>
//               <input
//                 type="text"
//                 value={organization.billing_state || ''}
//                 onChange={(e) => setOrganization(prev => prev ? { ...prev, billing_state: e.target.value } : null)}
//                 disabled={useShippingForBilling}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 ZIP Code
//               </label>
//               <input
//                 type="text"
//                 value={organization.billing_zip_code || ''}
//                 onChange={(e) => setOrganization(prev => prev ? { ...prev, billing_zip_code: e.target.value } : null)}
//                 disabled={useShippingForBilling}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Country
//               </label>
//               <input
//                 type="text"
//                 value={organization.billing_country || ''}
//                 onChange={(e) => setOrganization(prev => prev ? { ...prev, billing_country: e.target.value } : null)}
//                 disabled={useShippingForBilling}
//                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
//               />
//             </div>
//           </div>
//         </div>

//         <div className="flex justify-end">
//           <button
//             type="submit"
//             disabled={loading}
//             className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
//           >
//             <Save className="w-4 h-4 mr-2" />
//             {loading ? 'Saving...' : 'Save Changes'}
//           </button>
//         </div>
//       </form>

//       {showEmailModal && (
//         <EmailConfigModal
//           onClose={() => setShowEmailModal(false)}
//           onSuccess={handleEmailConfigSuccess}
//           organizationId={selectedOrganization.id}
//         />
//       )}
//     </motion.div>
//   );
// }


import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Save, AlertCircle, CheckCircle, Building2, Globe, MapPin, Mail, X, Star, StarOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader } from '@googlemaps/js-api-loader';
import { useOrganization } from '../../contexts/OrganizationContext';
import { EmailConfigModal } from './EmailConfigModal';
import { AutomationSettings } from './AutomationSettings';
import { EmailToCaseSettings } from './EmailToCaseSettings'; // Import the EmailToCaseSettings component

type Organization = {
  id: string;
  name: string;
  website_url: string | null;
  email_domain: string | null;
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
  timezone: string | null;
  logo_url?: string;
  lead_auto_response?: boolean;
  lead_response_template?: string;
  case_auto_response?: boolean;
  case_response_template?: string;
  domain?: string; // Added for email-to-case
  domain_verified?: boolean; // Added for email-to-case
};

type EmailConfig = {
  id: string;
  provider: 'gmail' | 'outlook';
  email: string;
  created_at: string;
  is_default?: boolean;
};

export function OrganizationSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [useShippingForBilling, setUseShippingForBilling] = useState(false);
  const { selectedOrganization } = useOrganization();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([]);

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
    if (selectedOrganization?.id) {
      fetchOrganization(selectedOrganization.id);
      fetchEmailConfigs(selectedOrganization.id);
    }
  }, [selectedOrganization]);

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

  const fetchEmailConfigs = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('email_configurations')
        .select('id, provider, email, created_at, is_default')
        .eq('organization_id', orgId)
        .eq('user_id', user.id);

      if (error) throw error;

      // If there's only one email config, make sure it's set as default
      if (data && data.length === 1 && !data[0].is_default) {
        await setDefaultEmail(data[0].id);
        data[0].is_default = true;
      }

      setEmailConfigs(data || []);
    } catch (err) {
      console.error('Error fetching email configurations:', err);
    }
  };

  const setDefaultEmail = async (configId: string) => {
    setLoading(true);
    setError(null);

    try {
      // First, remove default flag from all email configs for this organization
      const { error: resetError } = await supabase
        .from('email_configurations')
        .update({ is_default: false })
        .eq('organization_id', selectedOrganization.id);

      if (resetError) throw resetError;

      // Then set the new default
      const { error: updateError } = await supabase
        .from('email_configurations')
        .update({ is_default: true })
        .eq('id', configId);

      if (updateError) throw updateError;

      // Update local state
      setEmailConfigs(prev => prev.map(config => ({
        ...config,
        is_default: config.id === configId
      })));

      setSuccess('Default email updated successfully');
    } catch (err) {
      console.error('Error setting default email:', err);
      setError('Failed to set default email');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOrganization) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${selectedOrganization.id}-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    setLoading(true);
    setError(null);
    setSuccess(null);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from('organization-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Logo upload error:', uploadError);
      setError('Failed to upload logo');
      setLoading(false);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Logo file size should be less than 5MB');
      return;
    }

    // Get public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('organization-logos')
      .getPublicUrl(filePath);

    const logoUrl = publicUrlData.publicUrl;

    // Save logo_url to DB
    const { error: dbError } = await supabase
      .from('organizations')
      .update({ logo_url: logoUrl, updated_at: new Date().toISOString(), updated_by: user.id })
      .eq('id', selectedOrganization.id);

    if (dbError) {
      console.error('Error saving logo_url:', dbError);
      setError('Failed to update logo URL');
    } else {
      setOrganization(prev => prev ? { ...prev, logo_url: logoUrl } : prev);
      setSuccess('Logo uploaded successfully');
    }

    setLoading(false);
  };

  const handleAutomationSettingsUpdate = async (automationSettings) => {
    if (!selectedOrganization?.id) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          lead_auto_response: automationSettings.lead_auto_response,
          lead_response_template: automationSettings.lead_response_template,
          case_auto_response: automationSettings.case_auto_response,
          case_response_template: automationSettings.case_response_template,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', selectedOrganization.id);

      if (error) throw error;

      // Update local state
      setOrganization(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...automationSettings
        };
      });

      setSuccess('Automation settings updated successfully');
    } catch (err) {
      console.error('Error updating automation settings:', err);
      setError('Failed to update automation settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrganization?.id) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const updatePayload = {
      name: organization?.name,
      website_url: organization?.website_url,
      email_domain: organization?.email_domain,
      timezone: organization?.timezone || null,
      shipping_address_line1: organization?.shipping_address_line1,
      shipping_address_line2: organization?.shipping_address_line2,
      shipping_city: organization?.shipping_city,
      shipping_state: organization?.shipping_state,
      shipping_zip_code: organization?.shipping_zip_code,
      shipping_country: organization?.shipping_country,
      billing_address_line1: useShippingForBilling
        ? organization?.shipping_address_line1
        : organization?.billing_address_line1,
      billing_address_line2: useShippingForBilling
        ? organization?.shipping_address_line2
        : organization?.billing_address_line2,
      billing_city: useShippingForBilling
        ? organization?.shipping_city
        : organization?.billing_city,
      billing_state: useShippingForBilling
        ? organization?.shipping_state
        : organization?.billing_state,
      billing_zip_code: useShippingForBilling
        ? organization?.shipping_zip_code
        : organization?.billing_zip_code,
      billing_country: useShippingForBilling
        ? organization?.shipping_country
        : organization?.billing_country,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    const { error } = await supabase
      .from('organizations')
      .update(updatePayload)
      .eq('id', selectedOrganization.id);

    if (error) {
      console.error('Update Error:', error);
      setError('Failed to update organization');
    } else {
      setSuccess('Organization settings updated successfully');
    }

    setLoading(false);
  };

  const handleEmailConfigSuccess = async () => {
    setShowEmailModal(false);
    if (selectedOrganization?.id) {
      await fetchEmailConfigs(selectedOrganization.id);
      setSuccess('Email configuration successfully added');
    }
  };

  const handleRemoveEmailConfig = async (configId: string) => {
    if (!confirm('Are you sure you want to remove this email configuration?')) {
      return;
    }

    try {
      // Check if this is the default email
      const isDefault = emailConfigs.find(config => config.id === configId)?.is_default;

      const { error } = await supabase
        .from('email_configurations')
        .delete()
        .eq('id', configId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update the UI by filtering out the removed config
      const updatedConfigs = emailConfigs.filter(config => config.id !== configId);

      // If we removed the default email and have other emails, set a new default
      if (isDefault && updatedConfigs.length > 0) {
        await setDefaultEmail(updatedConfigs[0].id);
      }

      setEmailConfigs(updatedConfigs);
      setSuccess('Email configuration removed successfully');
    } catch (err) {
      console.error('Error removing email configuration:', err);
      setError('Failed to remove email configuration');
    }
  };

  if (!selectedOrganization || !organization) {
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

      {/* Email Configuration Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Mail className="w-5 h-5 mr-2" />
          Email Configuration
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Organization Email Domain
          </label>
          <div className="relative flex">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">@</span>
            <input
              type="text"
              value={organization.email_domain || ''}
              onChange={(e) => setOrganization(prev => prev ? { ...prev, email_domain: e.target.value } : null)}
              className="flex-1 px-4 py-2 rounded-r-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              placeholder="yourdomain.com"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Enter your organization's email domain. This helps us verify authentic email addresses from your organization.
          </p>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Connected Email Accounts</h4>
            <button
              onClick={() => setShowEmailModal(true)}
              className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
            >
              Connect Email
            </button>
          </div>

          {emailConfigs.length === 0 ? (
            <p className="text-gray-500 italic py-2">No email accounts connected yet</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {emailConfigs.map(config => (
                <li key={config.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-primary-100 p-2 rounded-full mr-3">
                      <Mail className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <div className="font-medium flex items-center">
                        {config.email}
                        {config.is_default && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                            <Star className="w-3 h-3 mr-1" />
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">{config.provider}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!config.is_default && (
                      <button
                        onClick={() => setDefaultEmail(config.id)}
                        className="text-gray-500 hover:text-primary-600"
                        title="Set as default email"
                        disabled={loading}
                      >
                        <StarOff className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveEmailConfig(config.id)}
                      className="text-gray-400 hover:text-red-500"
                      aria-label="Remove email configuration"
                      disabled={loading}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-sm text-gray-500">
            Connected email accounts allow you to send emails on behalf of your organization through our system.
            The default email (marked with a star) will be used for automated responses.
          </p>
        </div>
      </div>

      {/* Email-to-Case Configuration Section */}
      <EmailToCaseSettings />

      {/* Automation Settings Section */}
      <AutomationSettings
        organization={organization}
        emailConfigs={emailConfigs}
        isLoading={loading}
        onUpdate={handleAutomationSettingsUpdate}
      />

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

            <div className="md:col-span-2">
              <h4 className="text-md font-medium mb-2">Organization Logo</h4>
              <div className="flex items-center space-x-4">
                {organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt="Organization Logo"
                    className="w-16 h-16 object-cover rounded-lg border"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded-lg border text-gray-400">
                    No Logo
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                value={organization.timezone || ''}
                onChange={(e) => setOrganization(prev => prev ? { ...prev, timezone: e.target.value } : null)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              >
                <option value="">Select Timezone</option>
                {Intl.supportedValuesOf('timeZone').map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
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

      {showEmailModal && (
        <EmailConfigModal
          onClose={() => setShowEmailModal(false)}
          onSuccess={handleEmailConfigSuccess}
          organizationId={selectedOrganization.id}
        />
      )}
    </motion.div>
  );
}