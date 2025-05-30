import React, { useState, useEffect } from 'react';
import {
    Globe, Smartphone, Eye, Save, Copy, ExternalLink,
    Clock, MapPin, Palette, Settings, Bell, Filter,
    Search, ChevronDown, MoreVertical, CheckCircle,
    XCircle, Package, Truck, DollarSign, TrendingUp,
    Calendar, Users, Phone, Mail, Edit, Trash2, Loader2, AlertCircle,
    Upload, Image as ImageIcon, X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../contexts/OrganizationContext';

// Types
interface RestaurantWebsite {
    website_id: string;
    restaurant_id: string;
    theme_name: string;
    primary_color: string;
    secondary_color: string;
    hero_image_url?: string;
    about_text?: string;
    operating_hours?: any; // ADD THIS - for business hours
    social_media?: any;
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string;
    custom_css?: string;
    is_published: boolean; // ADD THIS
    ordering_enabled?: boolean;
    delivery_enabled?: boolean;
    pickup_enabled?: boolean;
    online_payment_enabled?: boolean;
    min_order_amount?: number;
    delivery_fee?: number;
    delivery_radius_miles?: number;
}

interface Restaurant {
    restaurant_id: string;
    organization_id: string;
    name: string;
    slug: string;
    description?: string;
    logo_url?: string;
    cover_image_url?: string;
    phone?: string;
    email?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
    timezone: string; // ADD THIS
    currency_code: string; // ADD THIS
    is_active: boolean;
    accepts_online_orders: boolean;
    accepts_bookings?: boolean; // ADD THIS
    cuisine_type?: string; // ADD THIS
    estimated_delivery_time?: number; // ADD THIS
}


interface Order {
    order_id: string;
    order_number: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    order_type: 'pickup' | 'delivery' | 'dine-in';
    status: string;
    subtotal: number;
    tax_amount: number;
    tip_amount: number;
    delivery_fee: number;
    total_amount: number;
    special_instructions?: string;
    created_at: string;
    updated_at: string;
    items?: OrderItem[];
}

interface OrderItem {
    order_item_id: string;
    item_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    special_instructions?: string;
    menu_item?: {
        name: string;
        display_name?: string;
    };
}

export default function OnlineOrdering() {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();

    // State
    const [activeTab, setActiveTab] = useState('website');
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [websiteSettings, setWebsiteSettings] = useState<RestaurantWebsite | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);

    // UI State
    const [orderFilter, setOrderFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // File upload helper functions
    const uploadImage = async (file: File, type: 'logo' | 'cover') => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${restaurant?.restaurant_id}-${type}-${Date.now()}.${fileExt}`;
            const filePath = `${selectedOrganization?.id}/${fileName}`;

            const { data, error } = await supabase.storage
                .from('restaurant-store')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('restaurant-store')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    };

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !restaurant) return;

        try {
            setUploadingLogo(true);
            setError(null);

            // Validate file type
            if (!file.type.startsWith('image/')) {
                throw new Error('Please select an image file');
            }

            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('Image size must be less than 5MB');
            }

            const logoUrl = await uploadImage(file, 'logo');

            // Update restaurant in database
            const { error: updateError } = await supabase
                .from('restaurants')
                .update({
                    logo_url: logoUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('restaurant_id', restaurant.restaurant_id);

            if (updateError) throw updateError;

            // Update local state
            setRestaurant({ ...restaurant, logo_url: logoUrl });

        } catch (err) {
            console.error('Error uploading logo:', err);
            setError(err instanceof Error ? err.message : 'Failed to upload logo');
        } finally {
            setUploadingLogo(false);
            event.target.value = ''; // Reset file input
        }
    };

    const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !restaurant) return;

        try {
            setUploadingCover(true);
            setError(null);

            // Validate file type
            if (!file.type.startsWith('image/')) {
                throw new Error('Please select an image file');
            }

            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('Image size must be less than 5MB');
            }

            const coverUrl = await uploadImage(file, 'cover');

            // Update restaurant in database
            const { error: updateError } = await supabase
                .from('restaurants')
                .update({
                    cover_image_url: coverUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('restaurant_id', restaurant.restaurant_id);

            if (updateError) throw updateError;

            // Update local state
            setRestaurant({ ...restaurant, cover_image_url: coverUrl });

        } catch (err) {
            console.error('Error uploading cover image:', err);
            setError(err instanceof Error ? err.message : 'Failed to upload cover image');
        } finally {
            setUploadingCover(false);
            event.target.value = ''; // Reset file input
        }
    };

    const removeImage = async (type: 'logo' | 'cover') => {
        if (!restaurant) return;

        try {
            const field = type === 'logo' ? 'logo_url' : 'cover_image_url';

            // Update restaurant in database
            const { error: updateError } = await supabase
                .from('restaurants')
                .update({
                    [field]: null,
                    updated_at: new Date().toISOString()
                })
                .eq('restaurant_id', restaurant.restaurant_id);

            if (updateError) throw updateError;

            // Update local state
            setRestaurant({ ...restaurant, [field]: null });

        } catch (err) {
            console.error(`Error removing ${type}:`, err);
            setError(`Failed to remove ${type}`);
        }
    };

    useEffect(() => {
        if (selectedOrganization?.id) {
            fetchRestaurantData();
        }
    }, [selectedOrganization]);

    const fetchRestaurantData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get or create restaurant
            let { data: restaurantData, error: restaurantError } = await supabase
                .from('restaurants')
                .select('*')
                .eq('organization_id', selectedOrganization!.id)
                .single();

            if (restaurantError && restaurantError.code === 'PGRST116') {
                // Create restaurant if it doesn't exist - WITH NEW FIELDS
                const { data: newRestaurant, error: createError } = await supabase
                    .from('restaurants')
                    .insert({
                        organization_id: selectedOrganization!.id,
                        name: selectedOrganization!.name,
                        slug: selectedOrganization!.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                        // NEW FIELDS WITH DEFAULTS
                        timezone: 'America/New_York',
                        currency_code: 'USD',
                        is_active: true,
                        accepts_online_orders: true,
                        accepts_bookings: false, // Default to false for bookings
                        estimated_delivery_time: 30, // Default 30 minutes
                        created_by: user?.id
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                restaurantData = newRestaurant;
                } else if (restaurantError) {
                throw restaurantError;
            }

            setRestaurant(restaurantData);

            // Fetch website settings
            await fetchWebsiteSettings(restaurantData.restaurant_id);

            // Fetch orders
            await fetchOrders(restaurantData.restaurant_id);

        } catch (err) {
            console.error('Error fetching restaurant data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load restaurant data');
        } finally {
            setLoading(false);
        }
    };

    const fetchWebsiteSettings = async (restaurantId: string) => {
        try {
            let { data: websiteData, error: websiteError } = await supabase
                .from('restaurant_websites')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .single();

            if (websiteError && websiteError.code === 'PGRST116') {
                // Create default website settings with business hours
                const defaultBusinessHours = {
                    monday: { isOpen: true, open: '09:00', close: '22:00' },
                    tuesday: { isOpen: true, open: '09:00', close: '22:00' },
                    wednesday: { isOpen: true, open: '09:00', close: '22:00' },
                    thursday: { isOpen: true, open: '09:00', close: '22:00' },
                    friday: { isOpen: true, open: '09:00', close: '23:00' },
                    saturday: { isOpen: true, open: '09:00', close: '23:00' },
                    sunday: { isOpen: true, open: '10:00', close: '21:00' }
                };

                const { data: newWebsite, error: createError } = await supabase
                    .from('restaurant_websites')
                    .insert({
                        restaurant_id: restaurantId,
                        theme_name: 'default',
                        primary_color: '#3B82F6',
                        secondary_color: '#EFF6FF',
                        operating_hours: defaultBusinessHours, // NEW
                        is_published: false, // NEW
                        ordering_enabled: true,
                        delivery_enabled: true,
                        pickup_enabled: true,
                        online_payment_enabled: true,
                        min_order_amount: 15.00,
                        delivery_fee: 3.99,
                        delivery_radius_miles: 5
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                websiteData = newWebsite;
            } else if (websiteError) {
                throw websiteError;
            }

            // Ensure operating_hours has default structure if missing
            if (!websiteData.operating_hours) {
                websiteData.operating_hours = {
                    monday: { isOpen: true, open: '09:00', close: '22:00' },
                    tuesday: { isOpen: true, open: '09:00', close: '22:00' },
                    wednesday: { isOpen: true, open: '09:00', close: '22:00' },
                    thursday: { isOpen: true, open: '09:00', close: '22:00' },
                    friday: { isOpen: true, open: '09:00', close: '23:00' },
                    saturday: { isOpen: true, open: '09:00', close: '23:00' },
                    sunday: { isOpen: true, open: '10:00', close: '21:00' }
                };
            }

            setWebsiteSettings(websiteData);
        } catch (err) {
            console.error('Error fetching website settings:', err);
        }
    };

    const fetchOrders = async (restaurantId: string) => {
        try {
            // Fetch orders with customer info and order items
            const { data: ordersData, error: ordersError } = await supabase
                .from('restaurant_orders')
                .select(`
                    *,
                    order_items (
                        *,
                        menu_items (
                            name,
                            display_name
                        )
                    )
                `)
                .eq('restaurant_id', restaurantId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (ordersError) throw ordersError;

            // Transform the data to match our interface
            const transformedOrders = (ordersData || []).map(order => ({
                ...order,
                items: order.order_items?.map((item: any) => ({
                    ...item,
                    menu_item: item.menu_items
                })) || []
            }));

            setOrders(transformedOrders);
        } catch (err) {
            console.error('Error fetching orders:', err);
        }
    };

    const handleSaveSettings = async () => {
        if (!websiteSettings || !restaurant) return;

        try {
            setSaving(true);
            setError(null);

            // Update restaurant with ALL fields including NEW ones
            const { error: restaurantError } = await supabase
                .from('restaurants')
                .update({
                    name: restaurant.name,
                    slug: restaurant.slug,
                    description: restaurant.description,
                    phone: restaurant.phone,
                    email: restaurant.email,
                    address_line1: restaurant.address_line1,
                    city: restaurant.city,
                    state: restaurant.state,
                    zip_code: restaurant.zip_code,
                    // NEW FIELDS:
                    cuisine_type: restaurant.cuisine_type,
                    estimated_delivery_time: restaurant.estimated_delivery_time,
                    timezone: restaurant.timezone || 'America/New_York',
                    currency_code: restaurant.currency_code || 'USD',
                    is_active: restaurant.is_active,
                    accepts_online_orders: restaurant.accepts_online_orders,
                    accepts_bookings: restaurant.accepts_bookings,
                    updated_at: new Date().toISOString()
                })
                .eq('restaurant_id', restaurant.restaurant_id);

            if (restaurantError) throw restaurantError;

            // Update website settings with ALL fields including NEW ones
            const { error: websiteError } = await supabase
                .from('restaurant_websites')
                .update({
                    primary_color: websiteSettings.primary_color,
                    secondary_color: websiteSettings.secondary_color,
                    hero_image_url: websiteSettings.hero_image_url,
                    about_text: websiteSettings.about_text,
                    seo_title: websiteSettings.seo_title,
                    seo_description: websiteSettings.seo_description,
                    // NEW FIELDS:
                    operating_hours: websiteSettings.operating_hours, // Business hours
                    is_published: websiteSettings.is_published, // Published status
                    ordering_enabled: websiteSettings.ordering_enabled,
                    delivery_enabled: websiteSettings.delivery_enabled,
                    pickup_enabled: websiteSettings.pickup_enabled,
                    min_order_amount: websiteSettings.min_order_amount,
                    delivery_fee: websiteSettings.delivery_fee,
                    delivery_radius_miles: websiteSettings.delivery_radius_miles,
                    updated_at: new Date().toISOString()
                })
                .eq('website_id', websiteSettings.website_id);

            if (websiteError) throw websiteError;

            alert('Settings saved successfully!');
        } catch (err) {
            console.error('Error saving settings:', err);
            setError(err instanceof Error ? err.message : 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handlePreviewWebsite = () => {
        if (restaurant?.slug) {
            window.open(`/online-order/store/${restaurant.slug}`, '_blank');
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('restaurant_orders')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('order_id', orderId);

            if (error) throw error;

            // Update local state
            setOrders(orders.map(order =>
                order.order_id === orderId
                    ? { ...order, status: newStatus }
                    : order
            ));
        } catch (err) {
            console.error('Error updating order status:', err);
            setError('Failed to update order status');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'preparing': return 'bg-blue-100 text-blue-800';
            case 'ready': return 'bg-green-100 text-green-800';
            case 'completed': return 'bg-gray-100 text-gray-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesFilter = orderFilter === 'all' || order.status === orderFilter;
        const matchesSearch = order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const todayOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at).toDateString();
        const today = new Date().toDateString();
        return orderDate === today;
    });

    const todayStats = {
        totalOrders: todayOrders.length,
        totalRevenue: todayOrders.reduce((sum, order) => sum + order.total_amount, 0),
        avgOrderValue: todayOrders.length > 0 ? todayOrders.reduce((sum, order) => sum + order.total_amount, 0) / todayOrders.length : 0,
        pendingOrders: todayOrders.filter(o => o.status === 'pending').length
    };

    // Loading and error states
    if (!selectedOrganization) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
                        Please select an organization to manage online ordering.
                    </div>

                    {/* Images */}
                    <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            <ImageIcon className="w-5 h-5 inline mr-2" />
                            Restaurant Images
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Logo Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Restaurant Logo
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                                    {restaurant.logo_url ? (
                                        <div className="relative">
                                            <img
                                                src={restaurant.logo_url}
                                                alt="Restaurant Logo"
                                                className="w-full h-32 object-contain bg-white rounded"
                                            />
                                            <button
                                                onClick={() => onRemoveImage('logo')}
                                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                                            <p className="text-sm text-gray-500 mb-2">Upload your restaurant logo</p>
                                            <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                                        </div>
                                    )}

                                    <div className="mt-3">
                                        <label className="block">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={onLogoUpload}
                                                disabled={uploadingLogo}
                                                className="hidden"
                                            />
                                            <div className="w-full bg-white border border-gray-300 rounded-md px-4 py-2 text-center cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                                {uploadingLogo ? (
                                                    <div className="flex items-center justify-center">
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                        Uploading...
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center">
                                                        <Upload className="w-4 h-4 mr-2" />
                                                        {restaurant.logo_url ? 'Change Logo' : 'Upload Logo'}
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Cover Image Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cover Image
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                                    {restaurant.cover_image_url ? (
                                        <div className="relative">
                                            <img
                                                src={restaurant.cover_image_url}
                                                alt="Restaurant Cover"
                                                className="w-full h-32 object-cover rounded"
                                            />
                                            <button
                                                onClick={() => onRemoveImage('cover')}
                                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                                            <p className="text-sm text-gray-500 mb-2">Upload a cover image</p>
                                            <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                                        </div>
                                    )}

                                    <div className="mt-3">
                                        <label className="block">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={onCoverUpload}
                                                disabled={uploadingCover}
                                                className="hidden"
                                            />
                                            <div className="w-full bg-white border border-gray-300 rounded-md px-4 py-2 text-center cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                                {uploadingCover ? (
                                                    <div className="flex items-center justify-center">
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                        Uploading...
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center">
                                                        <Upload className="w-4 h-4 mr-2" />
                                                        {restaurant.cover_image_url ? 'Change Cover' : 'Upload Cover'}
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading restaurant data...</p>
                </div>
            </div>
        );
    }

    if (!restaurant || !websiteSettings) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-red-50 text-red-800 p-4 rounded-lg">
                        Failed to load restaurant data. Please try refreshing the page.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Online Ordering</h1>
                    <p className="text-gray-600">Manage your online ordering website and incoming orders</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto text-red-700 hover:text-red-800"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6">
                            <button
                                onClick={() => setActiveTab('website')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'website'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Globe className="w-4 h-4 inline mr-2" />
                                Website Settings
                            </button>
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'orders'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Smartphone className="w-4 h-4 inline mr-2" />
                                Order Management
                                {todayStats.pendingOrders > 0 && (
                                    <span className="ml-2 bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs">
                                        {todayStats.pendingOrders}
                                    </span>
                                )}
                            </button>
                        </nav>
                    </div>

                    {/* Website Settings Tab */}
                    {activeTab === 'website' && (
                        <WebsiteSettingsTab
                            restaurant={restaurant}
                            websiteSettings={websiteSettings}
                            setRestaurant={setRestaurant}
                            setWebsiteSettings={setWebsiteSettings}
                            onSave={handleSaveSettings}
                            onPreview={handlePreviewWebsite}
                            onLogoUpload={handleLogoUpload}
                            onCoverUpload={handleCoverUpload}
                            onRemoveImage={removeImage}
                            uploadingLogo={uploadingLogo}
                            uploadingCover={uploadingCover}
                            saving={saving}
                            todayStats={todayStats}
                        />
                    )}

                    {/* Order Management Tab */}
                    {activeTab === 'orders' && (
                        <OrderManagementTab
                            orders={filteredOrders}
                            orderFilter={orderFilter}
                            searchTerm={searchTerm}
                            setOrderFilter={setOrderFilter}
                            setSearchTerm={setSearchTerm}
                            onUpdateOrderStatus={updateOrderStatus}
                            getStatusColor={getStatusColor}
                            todayStats={todayStats}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// Website Settings Tab Component
// Updated WebsiteSettingsTab Component
const WebsiteSettingsTab = ({ restaurant, websiteSettings, setRestaurant, setWebsiteSettings, onSave, onPreview, onLogoUpload, onCoverUpload, onRemoveImage, uploadingLogo, uploadingCover, saving, todayStats }) => (
    <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Settings Form */}
            <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Restaurant Name
                            </label>
                            <input
                                type="text"
                                value={restaurant.name || ''}
                                onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Website URL Slug
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                    /store/
                                </span>
                                <input
                                    type="text"
                                    value={restaurant.slug || ''}
                                    onChange={(e) => setRestaurant({ ...restaurant, slug: e.target.value })}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                value={restaurant.description || ''}
                                onChange={(e) => setRestaurant({ ...restaurant, description: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={restaurant.phone || ''}
                                onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={restaurant.email || ''}
                                onChange={(e) => setRestaurant({ ...restaurant, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Address
                            </label>
                            <input
                                type="text"
                                value={restaurant.address_line1 || ''}
                                onChange={(e) => setRestaurant({ ...restaurant, address_line1: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                                placeholder="Street Address"
                            />
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    value={restaurant.city || ''}
                                    onChange={(e) => setRestaurant({ ...restaurant, city: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="City"
                                />
                                <input
                                    type="text"
                                    value={restaurant.state || ''}
                                    onChange={(e) => setRestaurant({ ...restaurant, state: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="State"
                                />
                                <input
                                    type="text"
                                    value={restaurant.zip_code || ''}
                                    onChange={(e) => setRestaurant({ ...restaurant, zip_code: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="ZIP"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Restaurant Details */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Restaurant Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cuisine Type
                            </label>
                            <select
                                value={restaurant.cuisine_type || ''}
                                onChange={(e) => setRestaurant({ ...restaurant, cuisine_type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select cuisine type</option>
                                <option value="American">American</option>
                                <option value="Italian">Italian</option>
                                <option value="Chinese">Chinese</option>
                                <option value="Mexican">Mexican</option>
                                <option value="Indian">Indian</option>
                                <option value="Japanese">Japanese</option>
                                <option value="Thai">Thai</option>
                                <option value="French">French</option>
                                <option value="Mediterranean">Mediterranean</option>
                                <option value="Greek">Greek</option>
                                <option value="Korean">Korean</option>
                                <option value="Vietnamese">Vietnamese</option>
                                <option value="Lebanese">Lebanese</option>
                                <option value="Spanish">Spanish</option>
                                <option value="Pizza">Pizza</option>
                                <option value="Burgers">Burgers</option>
                                <option value="Seafood">Seafood</option>
                                <option value="Steakhouse">Steakhouse</option>
                                <option value="Fast Food">Fast Food</option>
                                <option value="Cafe">Cafe</option>
                                <option value="Bakery">Bakery</option>
                                <option value="BBQ">BBQ</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Estimated Delivery Time (minutes)
                            </label>
                            <input
                                type="number"
                                min="10"
                                max="120"
                                value={restaurant.estimated_delivery_time || 30}
                                onChange={(e) => setRestaurant({ ...restaurant, estimated_delivery_time: parseInt(e.target.value) || 30 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Timezone
                            </label>
                            <select
                                value={restaurant.timezone || 'America/New_York'}
                                onChange={(e) => setRestaurant({ ...restaurant, timezone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="America/New_York">Eastern Time</option>
                                <option value="America/Chicago">Central Time</option>
                                <option value="America/Denver">Mountain Time</option>
                                <option value="America/Los_Angeles">Pacific Time</option>
                                <option value="America/Anchorage">Alaska Time</option>
                                <option value="Pacific/Honolulu">Hawaii Time</option>
                                <option value="UTC">UTC</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Currency
                            </label>
                            <select
                                value={restaurant.currency_code || 'USD'}
                                onChange={(e) => setRestaurant({ ...restaurant, currency_code: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="USD">US Dollar ($)</option>
                                <option value="EUR">Euro (€)</option>
                                <option value="GBP">British Pound (£)</option>
                                <option value="CAD">Canadian Dollar (C$)</option>
                                <option value="AUD">Australian Dollar (A$)</option>
                                <option value="JPY">Japanese Yen (¥)</option>
                            </select>
                        </div>
                    </div>
                </div>

// 2. ADD THIS SECTION after the "Restaurant Details" section
                {/* Business Hours */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        <Clock className="w-5 h-5 inline mr-2" />
                        Business Hours
                    </h3>
                    <div className="space-y-3">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                            const dayHours = websiteSettings?.operating_hours?.[day] || { isOpen: true, open: '09:00', close: '22:00' };
                            return (
                                <div key={day} className="flex items-center justify-between p-3 bg-white rounded-md border">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-24">
                                            <span className="font-medium text-gray-900 capitalize">{day}</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={dayHours.isOpen}
                                                onChange={(e) => {
                                                    const newHours = {
                                                        ...websiteSettings.operating_hours,
                                                        [day]: { ...dayHours, isOpen: e.target.checked }
                                                    };
                                                    setWebsiteSettings({ ...websiteSettings, operating_hours: newHours });
                                                }}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                        <span className="text-sm text-gray-600">
                                            {dayHours.isOpen ? 'Open' : 'Closed'}
                                        </span>
                                    </div>
                                    {dayHours.isOpen && (
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="time"
                                                value={dayHours.open}
                                                onChange={(e) => {
                                                    const newHours = {
                                                        ...websiteSettings.operating_hours,
                                                        [day]: { ...dayHours, open: e.target.value }
                                                    };
                                                    setWebsiteSettings({ ...websiteSettings, operating_hours: newHours });
                                                }}
                                                className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-gray-500">to</span>
                                            <input
                                                type="time"
                                                value={dayHours.close}
                                                onChange={(e) => {
                                                    const newHours = {
                                                        ...websiteSettings.operating_hours,
                                                        [day]: { ...dayHours, close: e.target.value }
                                                    };
                                                    setWebsiteSettings({ ...websiteSettings, operating_hours: newHours });
                                                }}
                                                className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                        <div className="flex items-center">
                            <AlertCircle className="w-4 h-4 text-blue-600 mr-2" />
                            <span className="text-sm font-medium text-blue-800">
                                Orders and bookings will be restricted to these hours
                            </span>
                        </div>
                    </div>
                </div>

                {/* Images - ADD THIS SECTION */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        <ImageIcon className="w-5 h-5 inline mr-2" />
                        Restaurant Images
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Restaurant Logo
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                                {restaurant.logo_url ? (
                                    <div className="relative">
                                        <img
                                            src={restaurant.logo_url}
                                            alt="Restaurant Logo"
                                            className="w-full h-32 object-contain bg-white rounded"
                                        />
                                        <button
                                            onClick={() => onRemoveImage('logo')}
                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                                        <p className="text-sm text-gray-500 mb-2">Upload your restaurant logo</p>
                                        <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                                    </div>
                                )}

                                <div className="mt-3">
                                    <label className="block">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={onLogoUpload}
                                            disabled={uploadingLogo}
                                            className="hidden"
                                        />
                                        <div className="w-full bg-white border border-gray-300 rounded-md px-4 py-2 text-center cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                            {uploadingLogo ? (
                                                <div className="flex items-center justify-center">
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    Uploading...
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center">
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    {restaurant.logo_url ? 'Change Logo' : 'Upload Logo'}
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Cover Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cover Image
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                                {restaurant.cover_image_url ? (
                                    <div className="relative">
                                        <img
                                            src={restaurant.cover_image_url}
                                            alt="Restaurant Cover"
                                            className="w-full h-32 object-cover rounded"
                                        />
                                        <button
                                            onClick={() => onRemoveImage('cover')}
                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                                        <p className="text-sm text-gray-500 mb-2">Upload a cover image</p>
                                        <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                                    </div>
                                )}

                                <div className="mt-3">
                                    <label className="block">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={onCoverUpload}
                                            disabled={uploadingCover}
                                            className="hidden"
                                        />
                                        <div className="w-full bg-white border border-gray-300 rounded-md px-4 py-2 text-center cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                            {uploadingCover ? (
                                                <div className="flex items-center justify-center">
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    Uploading...
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center">
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    {restaurant.cover_image_url ? 'Change Cover' : 'Upload Cover'}
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Appearance */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        <Palette className="w-5 h-5 inline mr-2" />
                        Appearance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Primary Color
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="color"
                                    value={websiteSettings.primary_color || '#3B82F6'}
                                    onChange={(e) => setWebsiteSettings({ ...websiteSettings, primary_color: e.target.value })}
                                    className="w-12 h-10 rounded border border-gray-300"
                                />
                                <input
                                    type="text"
                                    value={websiteSettings.primary_color || '#3B82F6'}
                                    onChange={(e) => setWebsiteSettings({ ...websiteSettings, primary_color: e.target.value })}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Secondary Color
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="color"
                                    value={websiteSettings.secondary_color || '#EFF6FF'}
                                    onChange={(e) => setWebsiteSettings({ ...websiteSettings, secondary_color: e.target.value })}
                                    className="w-12 h-10 rounded border border-gray-300"
                                />
                                <input
                                    type="text"
                                    value={websiteSettings.secondary_color || '#EFF6FF'}
                                    onChange={(e) => setWebsiteSettings({ ...websiteSettings, secondary_color: e.target.value })}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Service & Ordering Settings */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        <Settings className="w-5 h-5 inline mr-2" />
                        Service & Ordering Settings
                    </h3>
                    <div className="space-y-4">
                        {/* Main Service Toggles */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 bg-white rounded-md border">
                                <div>
                                    <h4 className="font-medium text-gray-900">Restaurant Active</h4>
                                    <p className="text-sm text-gray-500">Restaurant is active and accepting orders</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={restaurant.is_active || false}
                                        onChange={(e) => setRestaurant({ ...restaurant, is_active: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white rounded-md border">
                                <div>
                                    <h4 className="font-medium text-gray-900">Website Published</h4>
                                    <p className="text-sm text-gray-500">Website is live and accessible to customers</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={websiteSettings.is_published || false}
                                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, is_published: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white rounded-md border">
                                <div>
                                    <h4 className="font-medium text-gray-900">Online Ordering</h4>
                                    <p className="text-sm text-gray-500">Accept online orders</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={restaurant.accepts_online_orders || false}
                                        onChange={(e) => setRestaurant({ ...restaurant, accepts_online_orders: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white rounded-md border">
                                <div>
                                    <h4 className="font-medium text-gray-900">Table Bookings</h4>
                                    <p className="text-sm text-gray-500">Accept table reservations</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={restaurant.accepts_bookings || false}
                                        onChange={(e) => setRestaurant({ ...restaurant, accepts_bookings: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Order Type Settings */}
                        <div className="border-t pt-4">
                            <h4 className="font-medium text-gray-900 mb-3">Order Types</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Pickup Orders</h4>
                                        <p className="text-sm text-gray-500">Accept pickup orders</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={websiteSettings.pickup_enabled || false}
                                            onChange={(e) => setWebsiteSettings({ ...websiteSettings, pickup_enabled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Delivery Orders</h4>
                                        <p className="text-sm text-gray-500">Accept delivery orders</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={websiteSettings.delivery_enabled || false}
                                            onChange={(e) => setWebsiteSettings({ ...websiteSettings, delivery_enabled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Pricing Settings */}
                        <div className="border-t pt-4">
                            <h4 className="font-medium text-gray-900 mb-3">Pricing & Delivery</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Minimum Order ($)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={websiteSettings.min_order_amount || 0}
                                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, min_order_amount: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Delivery Fee ($)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={websiteSettings.delivery_fee || 0}
                                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, delivery_fee: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Delivery Radius (miles)
                                    </label>
                                    <input
                                        type="number"
                                        value={websiteSettings.delivery_radius_miles || 0}
                                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, delivery_radius_miles: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Panel */}
            <WebsitePreviewPanel
                restaurant={restaurant}
                websiteSettings={websiteSettings}
                onPreview={onPreview}
                todayStats={todayStats}
            />
        </div>

        {/* Save Button */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
                Changes will be applied immediately to your website
            </div>
            <button
                onClick={onSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
                {saving ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Settings
                    </>
                )}
            </button>
        </div>
    </div>
);

// Website Preview Panel Component
// REPLACE your existing WebsitePreviewPanel with this updated version:

const WebsitePreviewPanel = ({ restaurant, websiteSettings, onPreview, todayStats }) => (
    <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Website Preview</h3>

            {/* Mini Preview */}
            <div className="border rounded-lg overflow-hidden mb-4">
                <div
                    className="h-32 bg-gradient-to-r from-gray-400 to-gray-600 relative"
                    style={{ backgroundColor: websiteSettings?.primary_color || '#3B82F6' }}
                >
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                        <div className="text-center text-white">
                            <div className="w-8 h-8 bg-white rounded-full mx-auto mb-2"></div>
                            <h4 className="font-bold text-sm">{restaurant?.name || 'Restaurant Name'}</h4>
                            <p className="text-xs opacity-90">{restaurant?.cuisine_type || restaurant?.description || 'Restaurant description'}</p>
                        </div>
                    </div>
                </div>
                <div className="p-3 bg-white">
                    <div className="flex justify-between items-center text-xs text-gray-600">
                        <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {restaurant?.city || 'City'}, {restaurant?.state || 'State'}
                        </div>
                        <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {restaurant?.estimated_delivery_time || 30} min
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <button
                    onClick={onPreview}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"
                >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Website
                </button>

                <div className="flex space-x-2">
                    <button
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/online-order/store/${restaurant?.slug || ''}`)}
                        className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 flex items-center justify-center text-sm"
                    >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy URL
                    </button>
                    <button
                        onClick={onPreview}
                        className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Status Indicators */}
            <div className="space-y-2 mt-4">
                <div className={`p-3 rounded-md ${websiteSettings?.is_published ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    <div className="flex items-center">
                        {websiteSettings?.is_published ? (
                            <>
                                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                                <span className="text-sm font-medium text-green-800">Website Published</span>
                            </>
                        ) : (
                            <>
                                <XCircle className="w-4 h-4 text-yellow-600 mr-2" />
                                <span className="text-sm font-medium text-yellow-800">Website Unpublished</span>
                            </>
                        )}
                    </div>
                    <p className={`text-xs mt-1 ${websiteSettings?.is_published ? 'text-green-600' : 'text-yellow-600'}`}>
                        Your ordering site is {websiteSettings?.is_published ? 'live and accessible' : 'offline and not accessible'}
                    </p>
                </div>

                <div className={`p-3 rounded-md ${restaurant?.is_active ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex items-center">
                        {restaurant?.is_active ? (
                            <>
                                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                                <span className="text-sm font-medium text-green-800">Restaurant Active</span>
                            </>
                        ) : (
                            <>
                                <XCircle className="w-4 h-4 text-red-600 mr-2" />
                                <span className="text-sm font-medium text-red-800">Restaurant Inactive</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Stats</h3>
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Orders</span>
                    <span className="font-medium">{todayStats?.totalOrders || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Revenue</span>
                    <span className="font-medium">
                        {restaurant?.currency_code === 'EUR' && '€'}
                        {restaurant?.currency_code === 'GBP' && '£'}
                        {restaurant?.currency_code === 'JPY' && '¥'}
                        {(!restaurant?.currency_code || restaurant?.currency_code === 'USD') && '$'}
                        {(todayStats?.totalRevenue || 0).toFixed(2)}
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg Order</span>
                    <span className="font-medium">
                        {restaurant?.currency_code === 'EUR' && '€'}
                        {restaurant?.currency_code === 'GBP' && '£'}
                        {restaurant?.currency_code === 'JPY' && '¥'}
                        {(!restaurant?.currency_code || restaurant?.currency_code === 'USD') && '$'}
                        {(todayStats?.avgOrderValue || 0).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>

        {/* Restaurant Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Restaurant Info</h3>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Cuisine</span>
                    <span className="font-medium">{restaurant?.cuisine_type || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Time</span>
                    <span className="font-medium">{restaurant?.estimated_delivery_time || 30} min</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Currency</span>
                    <span className="font-medium">{restaurant?.currency_code || 'USD'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Online Orders</span>
                    <span className={`font-medium ${restaurant?.accepts_online_orders ? 'text-green-600' : 'text-red-600'}`}>
                        {restaurant?.accepts_online_orders ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Table Bookings</span>
                    <span className={`font-medium ${restaurant?.accepts_bookings ? 'text-green-600' : 'text-red-600'}`}>
                        {restaurant?.accepts_bookings ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
            </div>
        </div>
    </div>
);

// Order Management Tab Component
const OrderManagementTab = ({ orders, orderFilter, searchTerm, setOrderFilter, setSearchTerm, onUpdateOrderStatus, getStatusColor, todayStats }: any) => (
    <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-blue-600">Total Orders</p>
                        <p className="text-2xl font-bold text-blue-900">{todayStats.totalOrders}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-600" />
                </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-green-600">Revenue</p>
                        <p className="text-2xl font-bold text-green-900">${todayStats.totalRevenue.toFixed(2)}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-purple-600">Avg Order</p>
                        <p className="text-2xl font-bold text-purple-900">${todayStats.avgOrderValue.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-orange-600">Pending</p>
                        <p className="text-2xl font-bold text-orange-900">{todayStats.pendingOrders}</p>
                    </div>
                    <Bell className="w-8 h-8 text-orange-600" />
                </div>
            </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center space-x-4">
                <div className="relative">
                    <select
                        value={orderFilter}
                        onChange={(e) => setOrderFilter(e.target.value)}
                        className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Orders</option>
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2 top-3 text-gray-400" />
                </div>

                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="text-sm text-gray-500">
                Showing {orders.length} orders
            </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
            {orders.map((order: Order) => (
                <OrderCard
                    key={order.order_id}
                    order={order}
                    onUpdateStatus={onUpdateOrderStatus}
                    getStatusColor={getStatusColor}
                />
            ))}

            {orders.length === 0 && (
                <div className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                    <p className="text-gray-500">
                        {orderFilter === 'all'
                            ? "You haven't received any orders yet."
                            : `No ${orderFilter} orders found.`
                        }
                    </p>
                </div>
            )}
        </div>
    </div>
);

// Order Card Component
const OrderCard = ({ order, onUpdateStatus, getStatusColor }: { order: Order; onUpdateStatus: (id: string, status: string) => void; getStatusColor: (status: string) => string }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
                <div>
                    <h3 className="font-medium text-gray-900">{order.order_number}</h3>
                    <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
                <div className="flex items-center text-sm text-gray-500">
                    {order.order_type === 'delivery' ? (
                        <Truck className="w-4 h-4 mr-1" />
                    ) : (
                        <Package className="w-4 h-4 mr-1" />
                    )}
                    {order.order_type}
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <div className="text-right">
                    <p className="font-medium text-gray-900">${order.total_amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{order.items?.length || 0} items</p>
                </div>
                <div className="relative">
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="font-medium text-gray-900 mb-2">Customer</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                        {order.customer_name && (
                            <div className="flex items-center">
                                <Users className="w-4 h-4 mr-2" />
                                {order.customer_name}
                            </div>
                        )}
                        {order.customer_email && (
                            <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-2" />
                                {order.customer_email}
                            </div>
                        )}
                        {order.customer_phone && (
                            <div className="flex items-center">
                                <Phone className="w-4 h-4 mr-2" />
                                {order.customer_phone}
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="font-medium text-gray-900 mb-2">Items</h4>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                        {order.items?.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                    {item.quantity}x {item.menu_item?.display_name || item.menu_item?.name || 'Unknown Item'}
                                </span>
                                <span className="text-gray-900">${item.total_price.toFixed(2)}</span>
                            </div>
                        )) || (
                                <p className="text-sm text-gray-500">No item details available</p>
                            )}
                    </div>
                </div>
            </div>

            {order.special_instructions && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                    <h4 className="font-medium text-gray-900 text-sm mb-1">Special Instructions</h4>
                    <p className="text-sm text-gray-600">{order.special_instructions}</p>
                </div>
            )}

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                <div className="flex space-x-2">
                    {order.status === 'pending' && (
                        <button
                            onClick={() => onUpdateStatus(order.order_id, 'preparing')}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                        >
                            Start Preparing
                        </button>
                    )}
                    {order.status === 'preparing' && (
                        <button
                            onClick={() => onUpdateStatus(order.order_id, 'ready')}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                        >
                            Mark Ready
                        </button>
                    )}
                    {order.status === 'ready' && (
                        <button
                            onClick={() => onUpdateStatus(order.order_id, 'completed')}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                        >
                            Complete Order
                        </button>
                    )}
                    {['pending', 'preparing'].includes(order.status) && (
                        <button
                            onClick={() => onUpdateStatus(order.order_id, 'cancelled')}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                        >
                            Cancel
                        </button>
                    )}
                </div>

                <div className="flex space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    </div>
);