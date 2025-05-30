import React, { useState } from 'react';
import {
    ShoppingCart, Plus, Minus, Clock, Star, MapPin, Phone,
    ChevronRight, X, Check, DollarSign, Square, CheckSquare,
    Calendar, Users, AlertTriangle, CheckCircle
} from 'lucide-react';
import { useSupabaseOrder } from '../hooks/useSupabaseOrder';
import { useCart } from '../hooks/useCart';
import CheckoutModal from './CheckoutModal';
import BusinessHoursDisplay from './BusinessHoursDisplay';

interface Props {
    restaurantData: {
        restaurant: any;
        menu: any;
    };
}

export default function RestaurantOrderingPlatform({ restaurantData }: Props) {
    const { restaurant, menu } = restaurantData;
    const { cart, cartTotal, cartItemCount, addToCart, updateQuantity, clearCart } = useCart();
    const { placeOrder, loading: orderLoading } = useSupabaseOrder(restaurant.slug);

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showBooking, setShowBooking] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);

    // Debug log to check restaurant data structure
    console.log('Restaurant data:', restaurant);
    console.log('Current status:', restaurant.current_status);
    console.log('Website settings:', restaurant.website_settings);

    const handlePlaceOrder = async (orderData: any) => {
        try {
            // Check if restaurant is open before placing order
            if (!restaurant.current_status?.accepts_orders) {
                alert('Sorry, the restaurant is currently closed for orders.');
                return;
            }

            const result = await placeOrder({
                items: cart.map(cartItem => ({
                    item_id: cartItem.item.item_id,
                    quantity: cartItem.quantity,
                    unit_price: cartItem.item.price,
                    total_price: cartItem.totalPrice,
                    selected_options: cartItem.selectedOptions,
                    special_instructions: cartItem.specialInstructions
                })),
                subtotal: cartTotal,
                tax_amount: cartTotal * 0.0875,
                delivery_fee: orderData.order_type === 'delivery' ? (restaurant.delivery_fee || 3.99) : 0,
                total_amount: cartTotal + (cartTotal * 0.0875) + (orderData.order_type === 'delivery' ? (restaurant.delivery_fee || 3.99) : 0),
                ...orderData
            });

            clearCart();
            alert(`Order placed successfully! Order number: ${result.order_number}`);
            setShowCheckout(false);
            setIsCartOpen(false);

        } catch (error) {
            alert(`Failed to place order: ${error.message}`);
        }
    };

    // FIXED: Improved booking handler with better error handling
    const handleBooking = async (bookingData: any) => {
        setBookingLoading(true);
        try {
            console.log('Submitting booking:', bookingData);

            // Use full Supabase URL for edge function
            const supabaseUrl = 'https://jaytpfztifhtzcruxguj.supabase.co/';
            const functionUrl = `${supabaseUrl}/functions/v1/restaurant-store/${restaurant.slug}/booking`;

            console.log('Booking URL:', functionUrl);

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingData)
            });

            console.log('Booking response status:', response.status);
            console.log('Booking response headers:', response.headers);

            // Check if response is OK
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Booking error response:', errorText);

                let errorMessage = 'Booking failed';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    errorMessage = `Server error (${response.status})`;
                }
                throw new Error(errorMessage);
            }

            // Parse JSON response
            let result;
            try {
                const responseText = await response.text();
                console.log('Raw booking response:', responseText);

                if (!responseText.trim()) {
                    throw new Error('Empty response from server');
                }

                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                throw new Error('Invalid response from server');
            }

            console.log('Parsed booking result:', result);

            if (result.success) {
                alert(`Booking confirmed! Booking number: ${result.booking_number}`);
                setShowBooking(false);
            } else {
                throw new Error(result.error || 'Booking failed');
            }
        } catch (error) {
            console.error('Booking error:', error);
            alert(`Booking failed: ${error.message}`);
        } finally {
            setBookingLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Restaurant Header */}
            <RestaurantHeader
                restaurant={restaurant}
                cartItemCount={cartItemCount}
                onCartClick={() => setIsCartOpen(true)}
                onBookingClick={() => setShowBooking(true)}
            />

            {/* Business Hours Status Banner */}
            <BusinessStatusBanner restaurant={restaurant} />

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Menu Content - Takes most of the space */}
                    <div className="lg:col-span-3">
                        <MenuDisplay
                            menu={menu}
                            onItemClick={setSelectedItem}
                            primaryColor={restaurant.website_settings?.primary_color || '#3B82F6'}
                            canOrder={restaurant.current_status?.accepts_orders}
                        />
                    </div>

                    {/* Sidebar with Business Hours - Takes 1/4 of the space */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 space-y-6">
                            {/* Business Hours Display */}
                            <BusinessHoursDisplay
                                operatingHours={restaurant.website_settings?.operating_hours || {}}
                                timezone={restaurant.timezone || 'America/New_York'}
                                restaurant={restaurant}
                                showCurrentStatus={true}
                            />

                            {/* Restaurant Info Card */}
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Restaurant Info</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-500" />
                                        <span>{restaurant.address_line1}, {restaurant.city}, {restaurant.state}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-500" />
                                        <span>{restaurant.phone}</span>
                                    </div>
                                    {restaurant.estimated_delivery_time && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-500" />
                                            <span>Delivery: {restaurant.estimated_delivery_time} min</span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-4 space-y-2">
                                    {restaurant.accepts_bookings && (
                                        <button
                                            onClick={() => setShowBooking(true)}
                                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                                        >
                                            <Calendar className="w-4 h-4" />
                                            Book a Table
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setIsCartOpen(true)}
                                        className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
                                    >
                                        <ShoppingCart className="w-4 h-4" />
                                        View Cart ({cartItemCount})
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* All your existing modals */}
            {selectedItem && (
                <ItemCustomizationModal
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onAddToCart={(item, options, quantity) => {
                        if (!restaurant.current_status?.accepts_orders) {
                            alert('Sorry, the restaurant is currently closed for orders.');
                            return;
                        }
                        addToCart(item, options, quantity);
                        setSelectedItem(null);
                    }}
                    primaryColor={restaurant.website_settings?.primary_color || '#3B82F6'}
                    canOrder={restaurant.current_status?.accepts_orders}
                />
            )}

            {isCartOpen && (
                <CartSidebar
                    cart={cart}
                    cartTotal={cartTotal}
                    restaurant={restaurant}
                    onClose={() => setIsCartOpen(false)}
                    onUpdateQuantity={updateQuantity}
                    onCheckout={() => setShowCheckout(true)}
                    primaryColor={restaurant.website_settings?.primary_color || '#3B82F6'}
                />
            )}

            {showCheckout && (
                <CheckoutModal
                    cart={cart}
                    cartTotal={cartTotal}
                    restaurant={restaurant}
                    onClose={() => setShowCheckout(false)}
                    onPlaceOrder={handlePlaceOrder}
                    loading={orderLoading}
                />
            )}

            {showBooking && (
                <BookingModal
                    restaurant={restaurant}
                    onClose={() => setShowBooking(false)}
                    onBooking={handleBooking}
                    loading={bookingLoading}
                />
            )}

            {cartItemCount > 0 && !isCartOpen && restaurant.current_status?.accepts_orders && (
                <FloatingCartButton
                    itemCount={cartItemCount}
                    total={cartTotal}
                    onClick={() => setIsCartOpen(true)}
                    primaryColor={restaurant.website_settings?.primary_color || '#3B82F6'}
                />
            )}
        </div>
    );
}

// Business Status Banner Component
const BusinessStatusBanner = ({ restaurant }: any) => {
    const { current_status } = restaurant;

    if (!current_status) return null;

    const { is_open, today_hours, accepts_orders, accepts_bookings, message } = current_status;

    return (
        <div className={`py-3 px-4 text-center text-white ${is_open ? 'bg-green-600' : 'bg-red-600'}`}>
            <div className="max-w-6xl mx-auto flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">
                        {is_open ? 'Open Now' : 'Closed'}
                    </span>
                </div>

                {message && (
                    <div className="hidden sm:block">
                        {message}
                    </div>
                )}

                {today_hours && (
                    <div className="hidden md:block">
                        Today: {today_hours.isOpen ? `${today_hours.open} - ${today_hours.close}` : 'Closed'}
                    </div>
                )}

                {!is_open && (
                    <div className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span>
                            {!accepts_orders && 'Ordering unavailable'}
                            {!accepts_orders && !accepts_bookings && ' • '}
                            {!accepts_bookings && 'Bookings unavailable'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// Updated Restaurant Header Component
const RestaurantHeader = ({ restaurant, cartItemCount, onCartClick, onBookingClick }: any) => {
    const { current_status } = restaurant;
    const isOpen = current_status?.is_open;

    return (
        <div className="relative">
            <div
                className="h-64 bg-cover bg-center relative"
                style={{
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${restaurant.hero_image_url || restaurant.cover_image_url || 'https://via.placeholder.com/1200x400?text=Restaurant'})`
                }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                        <img
                            src={restaurant.logo_url || 'https://via.placeholder.com/100x100?text=Logo'}
                            alt={restaurant.name}
                            className="w-20 h-20 mx-auto mb-4 rounded-full bg-white p-2"
                        />
                        <h1 className="text-4xl font-bold mb-2">{restaurant.name}</h1>
                        <p className="text-xl opacity-90">{restaurant.description}</p>
                        {restaurant.cuisine_type && (
                            <p className="text-lg opacity-75 mt-2">{restaurant.cuisine_type}</p>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex gap-3">
                    {/* Book Table Button */}
                    {restaurant.accepts_bookings && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onBookingClick();
                            }}
                            className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2 hover:bg-gray-50"
                        >
                            <Calendar className="w-6 h-6 text-gray-700" />
                            <span className="text-gray-700 font-medium hidden sm:inline">Book Table</span>
                        </button>
                    )}

                    {/* Cart Button */}
                    <button
                        onClick={onCartClick}
                        className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow relative"
                    >
                        <div className="relative">
                            <ShoppingCart className="w-6 h-6 text-gray-700" />
                            {cartItemCount > 0 && (
                                <span
                                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs font-bold text-white flex items-center justify-center"
                                    style={{ backgroundColor: restaurant.website_settings?.primary_color || '#3B82F6' }}
                                >
                                    {cartItemCount}
                                </span>
                            )}
                        </div>
                    </button>
                </div>
            </div>

            {/* Restaurant Info Bar */}
            <div className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{restaurant.address_line1}, {restaurant.city}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                <span>{restaurant.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span className={`${isOpen ? 'text-green-600' : 'text-red-600'} font-medium`}>
                                    {isOpen ? 'Open Now' : 'Closed'}
                                </span>
                                {restaurant.estimated_delivery_time && (
                                    <span className="text-gray-500">• {restaurant.estimated_delivery_time} min</span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{restaurant.average_rating || '4.8'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Updated Menu Display Component
const MenuDisplay = ({ menu, onItemClick, primaryColor, canOrder }: any) => {
    if (!menu || menu.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">No menu items available</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {!canOrder && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                    <p className="text-yellow-800 font-medium">Restaurant is currently closed for orders</p>
                    <p className="text-yellow-700 text-sm mt-1">You can browse the menu but cannot place orders at this time</p>
                </div>
            )}

            {menu.map((category: any) => (
                <MenuCategory
                    key={category.category_id}
                    category={category}
                    onItemClick={onItemClick}
                    primaryColor={primaryColor}
                    canOrder={canOrder}
                />
            ))}
        </div>
    );
};

// Updated Menu Category Component
const MenuCategory = ({ category, onItemClick, primaryColor, canOrder }: any) => {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-2" style={{ borderColor: primaryColor }}>
                {category.display_name || category.name}
            </h2>

            {category.items && category.items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.items.map((item: any) => (
                        <MenuItem
                            key={item.item_id}
                            item={item}
                            onClick={() => onItemClick(item)}
                            primaryColor={primaryColor}
                            canOrder={canOrder}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 italic">No items in this category</p>
            )}
        </div>
    );
};

// Updated Menu Item Component
const MenuItem = ({ item, onClick, primaryColor, canOrder }: any) => {
    const hasOptions = item.options && item.options.length > 0;

    return (
        <div
            className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow group ${canOrder ? 'cursor-pointer' : 'opacity-75'}`}
            onClick={canOrder ? onClick : undefined}
        >
            {item.image_url && (
                <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                />
            )}

            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-semibold text-gray-900 ${canOrder ? 'group-hover:text-gray-700' : ''}`}>
                        {item.display_name || item.name}
                    </h3>
                    <span className="font-bold text-green-600 ml-2">
                        ${parseFloat(item.price).toFixed(2)}
                        {hasOptions && <span className="text-xs text-gray-500 ml-1">+</span>}
                    </span>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {item.description}
                </p>

                <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                        {item.tags?.map((tag: any) => (
                            <span
                                key={tag.tag_id || tag.name}
                                className="px-2 py-1 text-xs text-white rounded-full flex items-center gap-1"
                                style={{ backgroundColor: tag.color || '#6B7280' }}
                            >
                                {tag.icon && <span>{tag.icon}</span>}
                                {tag.name}
                            </span>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        {item.preparation_time_minutes && (
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{item.preparation_time_minutes} min</span>
                            </div>
                        )}
                        {hasOptions && (
                            <span className="text-xs" style={{ color: primaryColor }}>
                                Customizable
                            </span>
                        )}
                    </div>
                </div>

                {!canOrder && (
                    <div className="mt-2 text-xs text-red-600 text-center">
                        Not available during closed hours
                    </div>
                )}
            </div>
        </div>
    );
};

// Updated Item Customization Modal
const ItemCustomizationModal = ({ item, onClose, onAddToCart, primaryColor, canOrder }: any) => {
    const [selectedOptions, setSelectedOptions] = useState<any>({});
    const [quantity, setQuantity] = useState(1);
    const [isValid, setIsValid] = useState(false);

    React.useEffect(() => {
        const requiredOptions = item.options?.filter((opt: any) => opt.is_required) || [];
        const allRequiredSelected = requiredOptions.every((option: any) =>
            selectedOptions[option.option_id] &&
            (option.type === 'multiple' ? selectedOptions[option.option_id].length > 0 : true)
        );
        setIsValid(allRequiredSelected);
    }, [selectedOptions, item.options]);

    const handleOptionChange = (optionId: string, optionType: string, selection: any) => {
        setSelectedOptions((prev: any) => {
            const newOptions = { ...prev };

            if (optionType === 'single') {
                newOptions[optionId] = selection;
            } else {
                if (!newOptions[optionId]) newOptions[optionId] = [];

                const existingIndex = newOptions[optionId].findIndex((s: any) => s.option_item_id === selection.option_item_id);
                if (existingIndex >= 0) {
                    newOptions[optionId].splice(existingIndex, 1);
                } else {
                    newOptions[optionId].push(selection);
                }
            }

            return newOptions;
        });
    };

    const calculatePrice = () => {
        let basePrice = parseFloat(item.price);
        let optionsPrice = 0;

        Object.values(selectedOptions).forEach((optionSelections: any) => {
            if (Array.isArray(optionSelections)) {
                optionSelections.forEach((selection: any) => {
                    optionsPrice += parseFloat(selection.additional_price || 0);
                });
            } else if (optionSelections) {
                optionsPrice += parseFloat(optionSelections.additional_price || 0);
            }
        });

        return (basePrice + optionsPrice) * quantity;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold">{item.display_name || item.name}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-6">
                    {!canOrder && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 mx-auto mb-2" />
                            <p className="text-yellow-800 font-medium">Restaurant is currently closed</p>
                            <p className="text-yellow-700 text-sm">You cannot add items to cart at this time</p>
                        </div>
                    )}

                    {item.image_url && (
                        <img src={item.image_url} alt={item.name} className="w-full h-48 object-cover rounded-lg" />
                    )}

                    <div>
                        <p className="text-gray-600 mb-4">{item.description}</p>
                        <div className="text-lg font-bold text-green-600">${parseFloat(item.price).toFixed(2)}</div>
                    </div>

                    {/* Options */}
                    {item.options && item.options.length > 0 ? (
                        item.options.map((option: any) => (
                            <OptionGroup
                                key={option.option_id}
                                option={option}
                                selectedOptions={selectedOptions}
                                onOptionChange={handleOptionChange}
                                primaryColor={primaryColor}
                                disabled={!canOrder}
                            />
                        ))
                    ) : (
                        <div className="text-gray-500 italic">No customization options available</div>
                    )}

                    {/* Quantity */}
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Quantity</span>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                disabled={!canOrder}
                                className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-medium w-8 text-center">{quantity}</span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                disabled={!canOrder}
                                className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t p-4">
                    <button
                        onClick={() => onAddToCart(item, selectedOptions, quantity)}
                        disabled={!canOrder || (!isValid && item.options?.some((opt: any) => opt.is_required))}
                        className="w-full py-3 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {canOrder ? `Add to Cart - $${calculatePrice().toFixed(2)}` : 'Restaurant Closed'}
                    </button>
                    {canOrder && !isValid && item.options?.some((opt: any) => opt.is_required) && (
                        <p className="text-xs text-red-600 mt-2 text-center">
                            Please select all required options
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

// Updated Option Group Component
const OptionGroup = ({ option, selectedOptions, onOptionChange, primaryColor, disabled }: any) => {
    const selections = selectedOptions[option.option_id] || (option.type === 'multiple' ? [] : null);

    if (!option.items || option.items.length === 0) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <h3 className="font-medium">{option.name}</h3>
                    {option.is_required && <span className="text-red-500 text-sm">*</span>}
                </div>
                <div className="text-sm text-gray-500 italic">No options available for {option.name}</div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <h3 className="font-medium">{option.name}</h3>
                {option.is_required && <span className="text-red-500 text-sm">*</span>}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                    {option.type === 'single' ? <Square className="w-3 h-3" /> : <CheckSquare className="w-3 h-3" />}
                    <span>{option.type === 'single' ? 'Choose one' : 'Choose multiple'}</span>
                </div>
            </div>

            <div className="space-y-2">
                {option.items.map((optionItem: any) => {
                    const isSelected = option.type === 'single'
                        ? selections?.option_item_id === optionItem.option_item_id
                        : selections.some((s: any) => s.option_item_id === optionItem.option_item_id);

                    return (
                        <label
                            key={optionItem.option_item_id}
                            className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                } ${isSelected ? 'border-2' : 'border-gray-200 hover:border-gray-300'}`}
                            style={{ borderColor: isSelected ? primaryColor : undefined }}
                        >
                            <div className="flex items-center gap-3">
                                <input
                                    type={option.type === 'single' ? 'radio' : 'checkbox'}
                                    name={option.option_id}
                                    checked={isSelected}
                                    disabled={disabled}
                                    onChange={() => !disabled && onOptionChange(option.option_id, option.type, optionItem)}
                                    className="hidden"
                                />
                                <div
                                    className={`w-4 h-4 border-2 rounded flex items-center justify-center ${isSelected ? 'text-white' : 'border-gray-300'
                                        }`}
                                    style={{
                                        backgroundColor: isSelected ? primaryColor : 'transparent',
                                        borderColor: isSelected ? primaryColor : undefined
                                    }}
                                >
                                    {isSelected && <Check className="w-3 h-3" />}
                                </div>
                                <span className={isSelected ? 'font-medium' : ''}>{optionItem.name}</span>
                            </div>

                            {parseFloat(optionItem.additional_price || 0) > 0 && (
                                <span className="text-green-600 font-medium">
                                    +${parseFloat(optionItem.additional_price).toFixed(2)}
                                </span>
                            )}
                        </label>
                    );
                })}
            </div>
        </div>
    );
};

// FIXED: Booking Modal Component with proper loading state
const BookingModal = ({ restaurant, onClose, onBooking, loading }: any) => {
    const [bookingData, setBookingData] = useState({
        booking_date: '',
        booking_time: '',
        party_size: 2,
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        special_requests: ''
    });

    // Get tomorrow's date as minimum booking date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    const handleSubmit = async () => {
        if (!isFormValid) {
            alert('Please fill in all required fields');
            return;
        }

        await onBooking(bookingData);
    };

    const isFormValid = bookingData.booking_date && bookingData.booking_time &&
        bookingData.party_size && bookingData.customer_name && bookingData.customer_phone;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Book a Table</h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-2 hover:bg-gray-100 rounded-full disabled:cursor-not-allowed"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date *
                            </label>
                            <input
                                type="date"
                                min={minDate}
                                value={bookingData.booking_date}
                                onChange={(e) => setBookingData({ ...bookingData, booking_date: e.target.value })}
                                disabled={loading}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Time *
                            </label>
                            <input
                                type="time"
                                value={bookingData.booking_time}
                                onChange={(e) => setBookingData({ ...bookingData, booking_time: e.target.value })}
                                disabled={loading}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Party Size *
                        </label>
                        <select
                            value={bookingData.party_size}
                            onChange={(e) => setBookingData({ ...bookingData, party_size: parseInt(e.target.value) })}
                            disabled={loading}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            required
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(size => (
                                <option key={size} value={size}>
                                    {size} {size === 1 ? 'person' : 'people'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Name *
                        </label>
                        <input
                            type="text"
                            value={bookingData.customer_name}
                            onChange={(e) => setBookingData({ ...bookingData, customer_name: e.target.value })}
                            disabled={loading}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number *
                        </label>
                        <input
                            type="tel"
                            value={bookingData.customer_phone}
                            onChange={(e) => setBookingData({ ...bookingData, customer_phone: e.target.value })}
                            disabled={loading}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email (optional)
                        </label>
                        <input
                            type="email"
                            value={bookingData.customer_email}
                            onChange={(e) => setBookingData({ ...bookingData, customer_email: e.target.value })}
                            disabled={loading}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Special Requests (optional)
                        </label>
                        <textarea
                            value={bookingData.special_requests}
                            onChange={(e) => setBookingData({ ...bookingData, special_requests: e.target.value })}
                            rows={3}
                            disabled={loading}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Any special requests or dietary requirements..."
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !isFormValid}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Booking...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Confirm Booking
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Cart Sidebar Component (unchanged)
const CartSidebar = ({ cart, cartTotal, restaurant, onClose, onUpdateQuantity, onCheckout, primaryColor }: any) => {
    const tax = cartTotal * 0.0875;
    const finalTotal = cartTotal + tax;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
            <div className="bg-white w-full max-w-md h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-bold">Your Order</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Your cart is empty</p>
                        </div>
                    ) : (
                        cart.map((cartItem: any) => (
                            <CartItem
                                key={cartItem.id}
                                cartItem={cartItem}
                                onUpdateQuantity={onUpdateQuantity}
                                primaryColor={primaryColor}
                            />
                        ))
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="border-t p-4 space-y-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>${cartTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax</span>
                                <span>${tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2">
                                <span>Total</span>
                                <span>${finalTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            onClick={onCheckout}
                            disabled={!restaurant.current_status?.accepts_orders}
                            className="w-full py-3 rounded-lg text-white font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {restaurant.current_status?.accepts_orders ? 'Proceed to Checkout' : 'Restaurant Closed'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Cart Item Component (unchanged)
const CartItem = ({ cartItem, onUpdateQuantity, primaryColor }: any) => {
    return (
        <div className="border rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-start">
                <h4 className="font-medium">{cartItem.item.display_name || cartItem.item.name}</h4>
                <span className="font-bold text-green-600">${cartItem.totalPrice.toFixed(2)}</span>
            </div>

            {Object.entries(cartItem.selectedOptions).map(([optionId, selections]: any) => {
                const optionName = cartItem.item.options?.find((opt: any) => opt.option_id === optionId)?.name;
                const selectionNames = Array.isArray(selections)
                    ? selections.map((s: any) => s.name).join(', ')
                    : selections?.name;

                return (
                    <div key={optionId} className="text-xs text-gray-600">
                        <span className="font-medium">{optionName}:</span> {selectionNames}
                    </div>
                );
            })}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onUpdateQuantity(cartItem.id, cartItem.quantity - 1)}
                        className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-gray-50"
                    >
                        <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center">{cartItem.quantity}</span>
                    <button
                        onClick={() => onUpdateQuantity(cartItem.id, cartItem.quantity + 1)}
                        className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-gray-50"
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                </div>

                <button
                    onClick={() => onUpdateQuantity(cartItem.id, 0)}
                    className="text-xs text-red-600 hover:text-red-700"
                >
                    Remove
                </button>
            </div>
        </div>
    );
};

// Floating Cart Button (unchanged)
const FloatingCartButton = ({ itemCount, total, onClick, primaryColor }: any) => {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-6 right-6 px-6 py-3 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-shadow flex items-center gap-3"
            style={{ backgroundColor: primaryColor }}
        >
            <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-white text-xs font-bold rounded-full flex items-center justify-center" style={{ color: primaryColor }}>
                    {itemCount}
                </span>
            </div>
            <span>${total.toFixed(2)}</span>
            <ChevronRight className="w-4 h-4" />
        </button>
    );
};