import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, User, Mail, Phone, CheckCircle, AlertCircle, RefreshCw, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

type CreateUserModalProps = {
    onClose: () => void;
    onSuccess: () => void;
    onError: (error: string) => void;
    organizationId: string;
    remainingLicenses: number | null;
};

export function CreateUserModal({
    onClose,
    onSuccess,
    onError,
    organizationId,
    remainingLicenses
}: CreateUserModalProps) {
    const { user: currentUser } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'member' as 'member' | 'admin' | 'owner'
    });
    const [loading, setLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!formData.name.trim()) {
            errors.name = 'Name is required';
        }

        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Email is invalid';
        }

        // Phone is optional, but validate format if provided
        if (formData.phone && !/^\+?[0-9\s\-()]{7,}$/.test(formData.phone)) {
            errors.phone = 'Phone number is invalid';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear validation error for this field when user types
        if (validationErrors[name]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;
        if (!organizationId) {
            onError('No organization selected');
            return;
        }

        try {
            setLoading(true);

            // Call the Supabase Edge Function to create the user
            const { data, error } = await supabase.functions.invoke('create-admin-user', {
                body: {
                    email: formData.email,
                    name: formData.name,
                    phone: formData.phone || null,
                    organizationId,
                    organizationRole: formData.role,
                    createdBy: currentUser?.id
                }
            });

            if (error) throw error;
            if (!data?.userId) throw new Error('Failed to create user');

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error creating user:', err);
            onError(err instanceof Error ? err.message : 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
                <div className="p-6 flex justify-between items-center border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary-500" />
                        Add New User
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {remainingLicenses !== null && (
                        <div className="mb-6 bg-blue-50 p-4 rounded-lg text-blue-700 flex items-start gap-3">
                            <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">License information</p>
                                <p className="text-sm mt-1">
                                    Your organization has {remainingLicenses} license{remainingLicenses !== 1 ? 's' : ''} remaining.
                                </p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className={cn(
                                        "block w-full pl-10 pr-3 py-3 rounded-lg border focus:ring-2 focus:outline-none transition-all",
                                        validationErrors.name
                                            ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                            : "border-gray-300 focus:border-primary-500 focus:ring-primary-200"
                                    )}
                                    placeholder="John Doe"
                                />
                            </div>
                            {validationErrors.name && (
                                <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className={cn(
                                        "block w-full pl-10 pr-3 py-3 rounded-lg border focus:ring-2 focus:outline-none transition-all",
                                        validationErrors.email
                                            ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                            : "border-gray-300 focus:border-primary-500 focus:ring-primary-200"
                                    )}
                                    placeholder="john.doe@example.com"
                                />
                            </div>
                            {validationErrors.email && (
                                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number (Optional)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className={cn(
                                        "block w-full pl-10 pr-3 py-3 rounded-lg border focus:ring-2 focus:outline-none transition-all",
                                        validationErrors.phone
                                            ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                            : "border-gray-300 focus:border-primary-500 focus:ring-primary-200"
                                    )}
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>
                            {validationErrors.phone && (
                                <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                                Organization Role
                            </label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                                className="block w-full px-3 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all"
                            >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                                <option value="owner">Owner</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                                Members can view content, Admins can manage users, Owners have full access.
                            </p>
                        </div>

                        <div className="bg-gray-50 -mx-6 -mb-6 p-6 pt-5 rounded-b-2xl border-t border-gray-100">
                            <div className="flex flex-col sm:flex-row-reverse gap-3">
                                <button
                                    type="submit"
                                    disabled={loading || (remainingLicenses !== null && remainingLicenses <= 0)}
                                    className={cn(
                                        "flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all shadow-sm w-full sm:w-auto",
                                        loading
                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                            : remainingLicenses !== null && remainingLicenses <= 0
                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                : "bg-gradient-to-r from-primary-500 to-violet-500 text-white hover:shadow-md"
                                    )}
                                >
                                    {loading ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            Create User
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="px-6 py-3 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto"
                                >
                                    Cancel
                                </button>
                            </div>

                            {remainingLicenses !== null && remainingLicenses <= 0 && (
                                <div className="mt-4 bg-red-50 p-3 rounded-lg text-red-600 flex items-center gap-2 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>You've reached your license limit. Upgrade your plan to add more users.</span>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            </motion.div>
        </motion.div>
    );
}