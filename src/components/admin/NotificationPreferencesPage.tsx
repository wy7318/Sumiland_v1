import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Mail, AlertCircle, CheckCircle, RefreshCw, Settings, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { cn } from '../../lib/utils';

type NotificationObjectType =
    | 'vendor'
    | 'customer'
    | 'lead'
    | 'case'
    | 'opportunity'
    | 'quote'
    | 'order'
    | 'task';

type NotificationPreference = {
    id?: string;
    user_id: string;
    organization_id: string;
    object_type: NotificationObjectType;
    in_app_enabled: boolean;
    email_enabled: boolean;
};

type ObjectTypeInfo = {
    type: NotificationObjectType;
    label: string;
    description: string;
    icon: typeof Bell;
};

export function NotificationPreferencesPage() {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Object types that can have notification preferences
    const objectTypes: ObjectTypeInfo[] = [
        {
            type: 'vendor',
            label: 'Vendors',
            description: 'Notifications when you are assigned as a vendor owner',
            icon: Bell
        },
        {
            type: 'customer',
            label: 'Customers',
            description: 'Notifications when you are assigned as a customer owner',
            icon: Bell
        },
        {
            type: 'lead',
            label: 'Leads',
            description: 'Notifications when you are assigned as a lead owner',
            icon: Bell
        },
        {
            type: 'case',
            label: 'Cases',
            description: 'Notifications when you are assigned as a case owner',
            icon: Bell
        },
        {
            type: 'opportunity',
            label: 'Opportunities',
            description: 'Notifications when you are assigned as an opportunity owner',
            icon: Bell
        },
        {
            type: 'quote',
            label: 'Quotes',
            description: 'Notifications when you are assigned as a quote owner',
            icon: Bell
        },
        {
            type: 'order',
            label: 'Orders',
            description: 'Notifications when you are assigned as an order owner',
            icon: Bell
        },
        {
            type: 'task',
            label: 'Tasks',
            description: 'Notifications when you are assigned a task',
            icon: Bell
        },
    ];

    useEffect(() => {
        if (user && selectedOrganization) {
            fetchPreferences();
        }
    }, [user, selectedOrganization]);

    const fetchPreferences = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('notification_object_preferences')
                .select('*')
                .eq('user_id', user?.id)
                .eq('organization_id', selectedOrganization?.id);

            if (error) throw error;

            // Initialize preferences with defaults for any missing object types
            const initializedPreferences = objectTypes.map(objType => {
                const existingPref = data?.find(p => p.object_type === objType.type);

                return existingPref || {
                    user_id: user?.id,
                    organization_id: selectedOrganization?.id,
                    object_type: objType.type,
                    in_app_enabled: true,   // Default to in-app enabled
                    email_enabled: false,   // Default to email disabled
                };
            });

            setPreferences(initializedPreferences);
        } catch (err) {
            console.error('Error fetching notification preferences:', err);
            setError('Failed to load notification preferences');
        } finally {
            setLoading(false);
        }
    };

    const togglePreference = async (objType: NotificationObjectType, field: 'in_app_enabled' | 'email_enabled') => {
        try {
            // Optimistically update UI
            setPreferences(prev =>
                prev.map(pref =>
                    pref.object_type === objType
                        ? { ...pref, [field]: !pref[field] }
                        : pref
                )
            );

            setSaving(true);
            setSuccess(null);
            setError(null);

            const preference = preferences.find(p => p.object_type === objType);

            if (!preference) return;

            const updates = {
                ...preference,
                [field]: !preference[field]
            };

            if (preference.id) {
                // Update existing preference
                const { error } = await supabase
                    .from('notification_object_preferences')
                    .update({
                        [field]: updates[field]
                    })
                    .eq('id', preference.id);

                if (error) throw error;
            } else {
                // Create new preference
                const { error } = await supabase
                    .from('notification_object_preferences')
                    .insert([{
                        user_id: user?.id,
                        organization_id: selectedOrganization?.id,
                        object_type: objType,
                        in_app_enabled: updates.in_app_enabled,
                        email_enabled: updates.email_enabled
                    }]);

                if (error) throw error;
            }

            setSuccess('Preferences updated successfully');

            // Refetch to ensure we have the latest data
            await fetchPreferences();
        } catch (err) {
            console.error('Error updating notification preferences:', err);
            setError('Failed to update preferences');

            // Revert optimistic update on error
            await fetchPreferences();
        } finally {
            setSaving(false);
        }
    };

    const bulkUpdate = async (action: 'enable_all_in_app' | 'disable_all_in_app' | 'enable_all_email' | 'disable_all_email') => {
        try {
            setSaving(true);
            setSuccess(null);
            setError(null);

            const field = action.includes('in_app') ? 'in_app_enabled' : 'email_enabled';
            const value = action.includes('enable') ? true : false;

            // Optimistically update UI
            setPreferences(prev => prev.map(pref => ({ ...pref, [field]: value })));

            // Prepare updates for each preference
            const updates = preferences.map(pref => {
                return {
                    user_id: user?.id,
                    organization_id: selectedOrganization?.id,
                    object_type: pref.object_type,
                    [field]: value,
                    ...(field === 'in_app_enabled' ? { in_app_enabled: value } : { email_enabled: value }),
                    ...(pref.id ? { id: pref.id } : {})
                };
            });

            // For existing preferences, update them
            const existingPrefs = updates.filter(p => p.id);
            if (existingPrefs.length > 0) {
                for (const pref of existingPrefs) {
                    const { error } = await supabase
                        .from('notification_object_preferences')
                        .update({ [field]: value })
                        .eq('id', pref.id);

                    if (error) throw error;
                }
            }

            // For new preferences, insert them
            const newPrefs = updates.filter(p => !p.id);
            if (newPrefs.length > 0) {
                const { error } = await supabase
                    .from('notification_object_preferences')
                    .insert(newPrefs.map(p => ({
                        user_id: p.user_id,
                        organization_id: p.organization_id,
                        object_type: p.object_type,
                        in_app_enabled: field === 'in_app_enabled' ? value : true,
                        email_enabled: field === 'email_enabled' ? value : false
                    })));

                if (error) throw error;
            }

            setSuccess('All preferences updated successfully');

            // Refetch to ensure we have the latest data
            await fetchPreferences();
        } catch (err) {
            console.error('Error updating bulk preferences:', err);
            setError('Failed to update preferences');

            // Revert optimistic update on error
            await fetchPreferences();
        } finally {
            setSaving(false);
        }
    };

    const getPreference = (objType: NotificationObjectType) => {
        return preferences.find(p => p.object_type === objType) || {
            in_app_enabled: true,
            email_enabled: false
        };
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Notification Preferences</h1>
                <button
                    onClick={fetchPreferences}
                    disabled={loading}
                    className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                </button>
            </div>

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

            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                    Configure how you'd like to be notified when you're assigned as the owner of various objects.
                    These preferences apply across all assignments within your organization.
                </p>
            </div>

            <div className="mb-8 flex flex-wrap gap-4">
                <button
                    onClick={() => bulkUpdate('enable_all_in_app')}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm flex items-center"
                >
                    <Bell className="w-4 h-4 mr-2" />
                    Enable All In-App
                </button>
                <button
                    onClick={() => bulkUpdate('disable_all_in_app')}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm flex items-center"
                >
                    <Bell className="w-4 h-4 mr-2 text-gray-400" />
                    Disable All In-App
                </button>
                <button
                    onClick={() => bulkUpdate('enable_all_email')}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm flex items-center"
                >
                    <Mail className="w-4 h-4 mr-2" />
                    Enable All Email
                </button>
                <button
                    onClick={() => bulkUpdate('disable_all_email')}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm flex items-center"
                >
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    Disable All Email
                </button>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-6 gap-4 px-4 py-2 bg-gray-100 rounded-lg font-medium text-sm">
                    <div className="col-span-3">Object Type</div>
                    <div className="col-span-1 text-center">In-App</div>
                    <div className="col-span-1 text-center">Email</div>
                    <div className="col-span-1 text-center">Status</div>
                </div>

                {objectTypes.map(objType => {
                    const pref = getPreference(objType.type);
                    return (
                        <div key={objType.type} className="grid grid-cols-6 gap-4 px-4 py-4 border-b border-gray-100 items-center">
                            <div className="col-span-3">
                                <div className="flex items-center">
                                    <objType.icon className="w-5 h-5 mr-3 text-gray-500" />
                                    <div>
                                        <h3 className="font-medium">{objType.label}</h3>
                                        <p className="text-sm text-gray-500">{objType.description}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-1 flex justify-center">
                                <button
                                    onClick={() => togglePreference(objType.type, 'in_app_enabled')}
                                    disabled={saving}
                                    className={cn(
                                        "p-1 rounded-full transition-colors",
                                        pref.in_app_enabled ? "text-primary-600" : "text-gray-400"
                                    )}
                                >
                                    {pref.in_app_enabled ? (
                                        <ToggleRight className="w-8 h-8" />
                                    ) : (
                                        <ToggleLeft className="w-8 h-8" />
                                    )}
                                </button>
                            </div>

                            <div className="col-span-1 flex justify-center">
                                <button
                                    onClick={() => togglePreference(objType.type, 'email_enabled')}
                                    disabled={saving}
                                    className={cn(
                                        "p-1 rounded-full transition-colors",
                                        pref.email_enabled ? "text-primary-600" : "text-gray-400"
                                    )}
                                >
                                    {pref.email_enabled ? (
                                        <ToggleRight className="w-8 h-8" />
                                    ) : (
                                        <ToggleLeft className="w-8 h-8" />
                                    )}
                                </button>
                            </div>

                            <div className="col-span-1 text-center">
                                {pref.in_app_enabled || pref.email_enabled ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                        Enabled
                                    </span>
                                ) : (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                        Disabled
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}