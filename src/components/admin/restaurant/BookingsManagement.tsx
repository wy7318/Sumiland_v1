// import React, { useState, useEffect, useMemo } from 'react';
// import {
//     Calendar,
//     Users,
//     Clock,
//     Plus,
//     Search,
//     Filter,
//     Edit2,
//     Trash2,
//     Phone,
//     Mail,
//     User,
//     AlertCircle,
//     Loader2,
//     CheckCircle,
//     XCircle,
//     Clock3,
//     MapPin,
//     Save,
//     X,
//     ChevronLeft,
//     ChevronRight,
//     BarChart3,
//     TrendingUp,
//     TrendingDown,
//     DollarSign,
//     Percent,
//     CalendarDays,
//     List,
//     PieChart,
//     Activity
// } from 'lucide-react';
// import { supabase } from '../../../lib/supabase';
// import { useAuth } from '../../../contexts/AuthContext';
// import { useOrganization } from '../../../contexts/OrganizationContext';

// // Status configurations
// const STATUS_CONFIG = {
//     pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', bgColor: '#fef3c7', icon: Clock3 },
//     confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800', bgColor: '#dcfce7', icon: CheckCircle },
//     cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', bgColor: '#fee2e2', icon: XCircle },
//     completed: { label: 'Completed', color: 'bg-blue-100 text-blue-800', bgColor: '#dbeafe', icon: CheckCircle },
//     no_show: { label: 'No Show', color: 'bg-gray-100 text-gray-800', bgColor: '#f3f4f6', icon: XCircle }
// };

// export default function BookingsManagement() {
//     const { user } = useAuth();
//     const { selectedOrganization } = useOrganization();

//     // State management
//     const [bookings, setBookings] = useState([]);
//     const [allBookings, setAllBookings] = useState([]); // For calendar and analytics
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [statusFilter, setStatusFilter] = useState('all');
//     const [dateFilter, setDateFilter] = useState('today');
//     const [showNewBookingForm, setShowNewBookingForm] = useState(false);
//     const [editingBooking, setEditingBooking] = useState(null);
//     const [restaurantId, setRestaurantId] = useState(null);
//     const [activeView, setActiveView] = useState('list'); // 'list', 'calendar', 'analytics'
//     const [selectedDate, setSelectedDate] = useState(new Date());

//     // Stats state
//     const [stats, setStats] = useState({
//         todayBookings: 0,
//         totalGuests: 0,
//         nextBooking: null
//     });

//     // Calendar state
//     const [calendarDate, setCalendarDate] = useState(new Date());

//     // Main effect to fetch restaurant and bookings
//     useEffect(() => {
//         if (selectedOrganization?.id) {
//             fetchRestaurantAndBookings();
//         }
//     }, [selectedOrganization, dateFilter, statusFilter]);

//     // Fetch restaurant and initial bookings
//     const fetchRestaurantAndBookings = async () => {
//         try {
//             setLoading(true);
//             setError(null);

//             // Get or create restaurant for this organization
//             let { data: restaurant, error: restaurantError } = await supabase
//                 .from('restaurants')
//                 .select('restaurant_id')
//                 .eq('organization_id', selectedOrganization.id)
//                 .single();

//             if (restaurantError && restaurantError.code === 'PGRST116') {
//                 // No restaurant found, create one
//                 const { data: newRestaurant, error: createError } = await supabase
//                     .from('restaurants')
//                     .insert({
//                         organization_id: selectedOrganization.id,
//                         name: selectedOrganization.name,
//                         slug: selectedOrganization.name.toLowerCase().replace(/\s+/g, '-'),
//                         created_by: user?.id,
//                         is_active: true,
//                         accepts_bookings: true
//                     })
//                     .select()
//                     .single();

//                 if (createError) throw createError;
//                 restaurant = newRestaurant;
//             } else if (restaurantError) {
//                 throw restaurantError;
//             }

//             if (!restaurant) throw new Error('No restaurant found');
//             setRestaurantId(restaurant.restaurant_id);

//             // Fetch both filtered bookings and all bookings
//             await Promise.all([
//                 fetchBookings(restaurant.restaurant_id),
//                 fetchAllBookings(restaurant.restaurant_id)
//             ]);

//         } catch (err) {
//             console.error('Error fetching restaurant and bookings:', err);
//             setError(err instanceof Error ? err.message : 'Failed to load restaurant data');
//         } finally {
//             setLoading(false);
//         }
//     };

//     // Fetch filtered bookings for list view
//     const fetchBookings = async (restId = restaurantId) => {
//         if (!restId) return;

//         try {
//             let query = supabase
//                 .from('bookings')
//                 .select('*')
//                 .eq('restaurant_id', restId)
//                 .order('booking_date', { ascending: true })
//                 .order('booking_time', { ascending: true });

//             // Apply date filter
//             const today = new Date().toISOString().split('T')[0];
//             if (dateFilter === 'today') {
//                 query = query.eq('booking_date', today);
//             } else if (dateFilter === 'tomorrow') {
//                 const tomorrow = new Date();
//                 tomorrow.setDate(tomorrow.getDate() + 1);
//                 const tomorrowStr = tomorrow.toISOString().split('T')[0];
//                 query = query.eq('booking_date', tomorrowStr);
//             } else if (dateFilter === 'this_week') {
//                 const weekFromNow = new Date();
//                 weekFromNow.setDate(weekFromNow.getDate() + 7);
//                 query = query
//                     .gte('booking_date', today)
//                     .lte('booking_date', weekFromNow.toISOString().split('T')[0]);
//             }

//             // Apply status filter
//             if (statusFilter !== 'all') {
//                 query = query.eq('status', statusFilter);
//             }

//             const { data: bookingsData, error: bookingsError } = await query;

//             if (bookingsError) throw bookingsError;

//             setBookings(bookingsData || []);

//             // Calculate stats for today only
//             const { data: todayBookingsData } = await supabase
//                 .from('bookings')
//                 .select('*')
//                 .eq('restaurant_id', restId)
//                 .eq('booking_date', today)
//                 .order('booking_time', { ascending: true });

//             if (todayBookingsData) {
//                 const totalGuests = todayBookingsData.reduce((sum, b) => sum + b.party_size, 0);
//                 const nextBooking = todayBookingsData
//                     .filter(b => b.status === 'confirmed')
//                     .find(b => b.booking_time > new Date().toTimeString().slice(0, 5));

//                 setStats({
//                     todayBookings: todayBookingsData.length,
//                     totalGuests,
//                     nextBooking
//                 });
//             }

//         } catch (err) {
//             console.error('Error fetching bookings:', err);
//             setError('Failed to load bookings');
//         }
//     };

//     // Fetch all bookings for calendar and analytics (not filtered)
//     const fetchAllBookings = async (restId = restaurantId) => {
//         if (!restId) return;

//         try {
//             const { data: allBookingsData, error: bookingsError } = await supabase
//                 .from('bookings')
//                 .select('*')
//                 .eq('restaurant_id', restId)
//                 .order('booking_date', { ascending: true })
//                 .order('booking_time', { ascending: true });

//             if (bookingsError) throw bookingsError;

//             setAllBookings(allBookingsData || []);
//         } catch (err) {
//             console.error('Error fetching all bookings:', err);
//         }
//     };

//     // Analytics calculations using allBookings
//     const analytics = useMemo(() => {
//         const analyticsBookings = allBookings;

//         if (analyticsBookings.length === 0) {
//             return {
//                 totalBookings: 0,
//                 recentBookings: 0,
//                 statusCounts: {},
//                 hourlyDistribution: {},
//                 avgPartySize: 0,
//                 cancellationRate: 0,
//                 peakHour: '0'
//             };
//         }

//         const last30Days = new Date();
//         last30Days.setDate(last30Days.getDate() - 30);
//         const last30DaysStr = last30Days.toISOString().split('T')[0];

//         const recentBookings = analyticsBookings.filter(b => b.booking_date >= last30DaysStr);

//         const statusCounts = analyticsBookings.reduce((acc, booking) => {
//             acc[booking.status] = (acc[booking.status] || 0) + 1;
//             return acc;
//         }, {});

//         const hourlyDistribution = analyticsBookings.reduce((acc, booking) => {
//             const hour = parseInt(booking.booking_time.split(':')[0]);
//             acc[hour] = (acc[hour] || 0) + 1;
//             return acc;
//         }, {});

//         const avgPartySize = analyticsBookings.length > 0
//             ? (analyticsBookings.reduce((sum, b) => sum + b.party_size, 0) / analyticsBookings.length).toFixed(1)
//             : 0;

//         const cancellationRate = analyticsBookings.length > 0
//             ? ((statusCounts.cancelled || 0) / analyticsBookings.length * 100).toFixed(1)
//             : 0;

//         return {
//             totalBookings: analyticsBookings.length,
//             recentBookings: recentBookings.length,
//             statusCounts,
//             hourlyDistribution,
//             avgPartySize,
//             cancellationRate,
//             peakHour: Object.keys(hourlyDistribution).length > 0
//                 ? Object.keys(hourlyDistribution).reduce((a, b) =>
//                     hourlyDistribution[a] > hourlyDistribution[b] ? a : b)
//                 : '0'
//         };
//     }, [allBookings]);

//     const handleCreateBooking = async (bookingData) => {
//         if (!restaurantId) {
//             setError('Restaurant not found');
//             return;
//         }

//         try {
//             // Generate booking number
//             const { data: existingBookings } = await supabase
//                 .from('bookings')
//                 .select('booking_number')
//                 .eq('restaurant_id', restaurantId)
//                 .order('created_at', { ascending: false })
//                 .limit(1);

//             let bookingNumber = 'BK001';
//             if (existingBookings && existingBookings.length > 0) {
//                 const lastNumber = parseInt(existingBookings[0].booking_number.replace('BK', ''));
//                 bookingNumber = `BK${String(lastNumber + 1).padStart(3, '0')}`;
//             }

//             // Try to find existing customer
//             let customerId = null;
//             if (bookingData.customer_email) {
//                 const { data: existingCustomer } = await supabase
//                     .from('customers')
//                     .select('customer_id')
//                     .eq('email', bookingData.customer_email)
//                     .eq('organization_id', selectedOrganization.id)
//                     .single();

//                 if (existingCustomer) {
//                     customerId = existingCustomer.customer_id;
//                 } else {
//                     // Create new customer
//                     const nameParts = bookingData.customer_name.split(' ');
//                     const { data: newCustomer, error: customerError } = await supabase
//                         .from('customers')
//                         .insert({
//                             first_name: nameParts[0] || 'Unknown',
//                             last_name: nameParts.slice(1).join(' ') || 'Customer',
//                             email: bookingData.customer_email,
//                             phone: bookingData.customer_phone,
//                             organization_id: selectedOrganization.id,
//                             type: 'Customer',
//                             created_by: user?.id
//                         })
//                         .select()
//                         .single();

//                     if (!customerError && newCustomer) {
//                         customerId = newCustomer.customer_id;
//                     }
//                 }
//             }

//             // Create booking
//             const { data: newBooking, error: bookingError } = await supabase
//                 .from('bookings')
//                 .insert({
//                     restaurant_id: restaurantId,
//                     customer_id: customerId,
//                     booking_number: bookingNumber,
//                     ...bookingData,
//                     created_at: new Date().toISOString()
//                 })
//                 .select()
//                 .single();

//             if (bookingError) throw bookingError;

//             setShowNewBookingForm(false);

//             // Refresh both data sets
//             await Promise.all([
//                 fetchBookings(),
//                 fetchAllBookings()
//             ]);

//         } catch (err) {
//             console.error('Error creating booking:', err);
//             setError('Failed to create booking');
//         }
//     };

//     const handleUpdateBooking = async (bookingId, updates) => {
//         try {
//             const { error } = await supabase
//                 .from('bookings')
//                 .update({
//                     ...updates,
//                     updated_at: new Date().toISOString()
//                 })
//                 .eq('booking_id', bookingId);

//             if (error) throw error;

//             setEditingBooking(null);

//             // Refresh both data sets
//             await Promise.all([
//                 fetchBookings(),
//                 fetchAllBookings()
//             ]);

//         } catch (err) {
//             console.error('Error updating booking:', err);
//             setError('Failed to update booking');
//         }
//     };

//     const handleDeleteBooking = async (bookingId) => {
//         if (!confirm('Are you sure you want to delete this booking?')) return;

//         try {
//             const { error } = await supabase
//                 .from('bookings')
//                 .delete()
//                 .eq('booking_id', bookingId);

//             if (error) throw error;

//             // Refresh both data sets
//             await Promise.all([
//                 fetchBookings(),
//                 fetchAllBookings()
//             ]);

//         } catch (err) {
//             console.error('Error deleting booking:', err);
//             setError('Failed to delete booking');
//         }
//     };

//     // Filter bookings based on search term
//     const filteredBookings = bookings.filter(booking =>
//         booking.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         booking.booking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         booking.customer_phone?.includes(searchTerm) ||
//         (booking.customer_email && booking.customer_email.toLowerCase().includes(searchTerm.toLowerCase()))
//     );

//     if (!selectedOrganization) {
//         return (
//             <div className="min-h-screen bg-gray-50 p-6">
//                 <div className="max-w-6xl mx-auto">
//                     <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
//                         Please select an organization to manage bookings.
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     if (loading) {
//         return (
//             <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//                 <div className="text-center">
//                     <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
//                     <p className="text-gray-600">Loading bookings...</p>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="min-h-screen bg-gray-50 p-6">
//             <div className="max-w-7xl mx-auto">
//                 {/* Header */}
//                 <div className="mb-8">
//                     <h1 className="text-3xl font-bold text-gray-900">Table Bookings</h1>
//                     <p className="text-gray-600 mt-2">Manage restaurant reservations and table assignments</p>
//                 </div>

//                 {error && (
//                     <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
//                         <AlertCircle className="w-5 h-5 mr-2" />
//                         {error}
//                         <button
//                             onClick={() => setError(null)}
//                             className="ml-auto text-red-600 hover:text-red-800"
//                         >
//                             <X className="w-4 h-4" />
//                         </button>
//                     </div>
//                 )}

//                 {/* Stats Cards */}
//                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//                     <div className="bg-white rounded-lg shadow-sm p-6">
//                         <div className="flex items-center justify-between">
//                             <div>
//                                 <p className="text-gray-600">Today's Bookings</p>
//                                 <p className="text-2xl font-bold">{stats.todayBookings}</p>
//                             </div>
//                             <Calendar className="w-8 h-8 text-blue-600" />
//                         </div>
//                     </div>
//                     <div className="bg-white rounded-lg shadow-sm p-6">
//                         <div className="flex items-center justify-between">
//                             <div>
//                                 <p className="text-gray-600">Total Guests Today</p>
//                                 <p className="text-2xl font-bold">{stats.totalGuests}</p>
//                             </div>
//                             <Users className="w-8 h-8 text-green-600" />
//                         </div>
//                     </div>
//                     <div className="bg-white rounded-lg shadow-sm p-6">
//                         <div className="flex items-center justify-between">
//                             <div>
//                                 <p className="text-gray-600">Next Booking</p>
//                                 <p className="text-2xl font-bold">
//                                     {stats.nextBooking ?
//                                         stats.nextBooking.booking_time.slice(0, 5) :
//                                         'None'
//                                     }
//                                 </p>
//                             </div>
//                             <Clock className="w-8 h-8 text-purple-600" />
//                         </div>
//                     </div>
//                     <div className="bg-white rounded-lg shadow-sm p-6">
//                         <div className="flex items-center justify-between">
//                             <div>
//                                 <p className="text-gray-600">Total Bookings</p>
//                                 <p className="text-2xl font-bold">{analytics.totalBookings}</p>
//                             </div>
//                             <BarChart3 className="w-8 h-8 text-orange-600" />
//                         </div>
//                     </div>
//                 </div>

//                 {/* View Tabs */}
//                 <div className="bg-white rounded-lg shadow-sm mb-6">
//                     <div className="border-b border-gray-200">
//                         <nav className="flex space-x-8 px-6">
//                             <button
//                                 onClick={() => setActiveView('list')}
//                                 className={`py-4 px-1 border-b-2 font-medium text-sm ${activeView === 'list'
//                                     ? 'border-blue-500 text-blue-600'
//                                     : 'border-transparent text-gray-500 hover:text-gray-700'
//                                     }`}
//                             >
//                                 <div className="flex items-center gap-2">
//                                     <List className="w-4 h-4" />
//                                     List View
//                                 </div>
//                             </button>
//                             <button
//                                 onClick={() => setActiveView('calendar')}
//                                 className={`py-4 px-1 border-b-2 font-medium text-sm ${activeView === 'calendar'
//                                     ? 'border-blue-500 text-blue-600'
//                                     : 'border-transparent text-gray-500 hover:text-gray-700'
//                                     }`}
//                             >
//                                 <div className="flex items-center gap-2">
//                                     <CalendarDays className="w-4 h-4" />
//                                     Calendar View
//                                 </div>
//                             </button>
//                             <button
//                                 onClick={() => setActiveView('analytics')}
//                                 className={`py-4 px-1 border-b-2 font-medium text-sm ${activeView === 'analytics'
//                                     ? 'border-blue-500 text-blue-600'
//                                     : 'border-transparent text-gray-500 hover:text-gray-700'
//                                     }`}
//                             >
//                                 <div className="flex items-center gap-2">
//                                     <BarChart3 className="w-4 h-4" />
//                                     Analytics
//                                 </div>
//                             </button>
//                         </nav>
//                     </div>

//                     {/* Controls - shown for list and calendar views */}
//                     {(activeView === 'list' || activeView === 'calendar') && (
//                         <div className="p-6">
//                             <div className="flex flex-col lg:flex-row gap-4 justify-between">
//                                 <div className="flex flex-col sm:flex-row gap-4 flex-1">
//                                     {/* Search */}
//                                     <div className="relative flex-1 max-w-md">
//                                         <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
//                                         <input
//                                             type="text"
//                                             placeholder="Search bookings..."
//                                             value={searchTerm}
//                                             onChange={(e) => setSearchTerm(e.target.value)}
//                                             className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
//                                         />
//                                     </div>

//                                     {/* Date Filter */}
//                                     <select
//                                         value={dateFilter}
//                                         onChange={(e) => setDateFilter(e.target.value)}
//                                         className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                     >
//                                         <option value="all">All Dates</option>
//                                         <option value="today">Today</option>
//                                         <option value="tomorrow">Tomorrow</option>
//                                         <option value="this_week">This Week</option>
//                                     </select>

//                                     {/* Status Filter */}
//                                     <select
//                                         value={statusFilter}
//                                         onChange={(e) => setStatusFilter(e.target.value)}
//                                         className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                     >
//                                         <option value="all">All Status</option>
//                                         <option value="pending">Pending</option>
//                                         <option value="confirmed">Confirmed</option>
//                                         <option value="completed">Completed</option>
//                                         <option value="cancelled">Cancelled</option>
//                                         <option value="no_show">No Show</option>
//                                     </select>
//                                 </div>

//                                 {/* Add Booking Button */}
//                                 <button
//                                     onClick={() => setShowNewBookingForm(true)}
//                                     disabled={!restaurantId}
//                                     className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
//                                 >
//                                     <Plus className="w-5 h-5" />
//                                     New Booking
//                                 </button>
//                             </div>
//                         </div>
//                     )}
//                 </div>

//                 {/* View Content */}
//                 {activeView === 'list' && (
//                     <ListViewContent
//                         bookings={filteredBookings}
//                         onEdit={setEditingBooking}
//                         onDelete={handleDeleteBooking}
//                         onUpdateStatus={(bookingId, status) => handleUpdateBooking(bookingId, { status })}
//                         editingBooking={editingBooking}
//                         onSaveEdit={(bookingId, updates) => handleUpdateBooking(bookingId, updates)}
//                         onCancelEdit={() => setEditingBooking(null)}
//                         showNewBookingForm={showNewBookingForm}
//                         onCreateBooking={handleCreateBooking}
//                         onCancelNewBooking={() => setShowNewBookingForm(false)}
//                         searchTerm={searchTerm}
//                         statusFilter={statusFilter}
//                         dateFilter={dateFilter}
//                     />
//                 )}

//                 {activeView === 'calendar' && (
//                     <CalendarViewContent
//                         bookings={allBookings} // Use allBookings for calendar
//                         calendarDate={calendarDate}
//                         setCalendarDate={setCalendarDate}
//                         onEdit={setEditingBooking}
//                         onDelete={handleDeleteBooking}
//                         onUpdateStatus={(bookingId, status) => handleUpdateBooking(bookingId, { status })}
//                         onCreateBooking={handleCreateBooking}
//                         showNewBookingForm={showNewBookingForm}
//                         setShowNewBookingForm={setShowNewBookingForm}
//                         selectedDate={selectedDate}
//                         setSelectedDate={setSelectedDate}
//                         restaurantId={restaurantId}
//                     />
//                 )}

//                 {activeView === 'analytics' && (
//                     <AnalyticsViewContent
//                         bookings={allBookings} // Use allBookings for analytics
//                         analytics={analytics}
//                     />
//                 )}
//             </div>
//         </div>
//     );
// }

// // List View Component
// const ListViewContent = ({
//     bookings, onEdit, onDelete, onUpdateStatus, editingBooking, onSaveEdit, onCancelEdit,
//     showNewBookingForm, onCreateBooking, onCancelNewBooking, searchTerm, statusFilter, dateFilter
// }) => {
//     return (
//         <>
//             {/* New Booking Form */}
//             {showNewBookingForm && (
//                 <div className="mb-6">
//                     <BookingForm
//                         onSave={onCreateBooking}
//                         onCancel={onCancelNewBooking}
//                     />
//                 </div>
//             )}

//             {/* Bookings List */}
//             <div className="bg-white rounded-lg shadow-sm">
//                 <div className="p-6 border-b border-gray-200">
//                     <h2 className="text-lg font-semibold text-gray-900">
//                         Bookings ({bookings.length})
//                     </h2>
//                 </div>

//                 {bookings.length === 0 ? (
//                     <div className="p-8 text-center text-gray-500">
//                         <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
//                         <p>No bookings found</p>
//                         <p className="text-sm mt-1">
//                             {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
//                                 ? 'Try adjusting your filters'
//                                 : 'Create your first booking to get started'
//                             }
//                         </p>
//                     </div>
//                 ) : (
//                     <div className="divide-y divide-gray-200">
//                         {bookings.map((booking) => (
//                             <BookingCard
//                                 key={booking.booking_id}
//                                 booking={booking}
//                                 onEdit={onEdit}
//                                 onDelete={onDelete}
//                                 onUpdateStatus={onUpdateStatus}
//                                 isEditing={editingBooking?.booking_id === booking.booking_id}
//                                 onSaveEdit={onSaveEdit}
//                                 onCancelEdit={onCancelEdit}
//                             />
//                         ))}
//                     </div>
//                 )}
//             </div>
//         </>
//     );
// };

// // Calendar View Component
// const CalendarViewContent = ({
//     bookings, calendarDate, setCalendarDate, onEdit, onDelete, onUpdateStatus,
//     onCreateBooking, showNewBookingForm, setShowNewBookingForm, selectedDate, setSelectedDate,
//     restaurantId
// }) => {
//     const monthNames = [
//         'January', 'February', 'March', 'April', 'May', 'June',
//         'July', 'August', 'September', 'October', 'November', 'December'
//     ];

//     const getDaysInMonth = (date) => {
//         const year = date.getFullYear();
//         const month = date.getMonth();
//         const firstDay = new Date(year, month, 1);
//         const lastDay = new Date(year, month + 1, 0);
//         const daysInMonth = lastDay.getDate();
//         const startingDayOfWeek = firstDay.getDay();

//         const days = [];

//         // Add empty cells for days before the first day of the month
//         for (let i = 0; i < startingDayOfWeek; i++) {
//             days.push(null);
//         }

//         // Add all days of the month
//         for (let day = 1; day <= daysInMonth; day++) {
//             days.push(new Date(year, month, day));
//         }

//         return days;
//     };

//     const getBookingsForDate = (date) => {
//         if (!date || !bookings || bookings.length === 0) return [];
//         const dateStr = date.toISOString().split('T')[0];
//         return bookings.filter(booking => booking.booking_date === dateStr);
//     };

//     const navigateMonth = (direction) => {
//         const newDate = new Date(calendarDate);
//         newDate.setMonth(newDate.getMonth() + direction);
//         setCalendarDate(newDate);
//     };

//     const handleDateClick = (date) => {
//         setSelectedDate(date);
//     };

//     const days = getDaysInMonth(calendarDate);
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     return (
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//             {/* Calendar */}
//             <div className="lg:col-span-2">
//                 <div className="bg-white rounded-lg shadow-sm">
//                     {/* Calendar Header */}
//                     <div className="flex items-center justify-between p-6 border-b border-gray-200">
//                         <h2 className="text-lg font-semibold text-gray-900">
//                             {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
//                         </h2>
//                         <div className="flex gap-2">
//                             <button
//                                 onClick={() => navigateMonth(-1)}
//                                 className="p-2 hover:bg-gray-100 rounded-md"
//                             >
//                                 <ChevronLeft className="w-4 h-4" />
//                             </button>
//                             <button
//                                 onClick={() => setCalendarDate(new Date())}
//                                 className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
//                             >
//                                 Today
//                             </button>
//                             <button
//                                 onClick={() => navigateMonth(1)}
//                                 className="p-2 hover:bg-gray-100 rounded-md"
//                             >
//                                 <ChevronRight className="w-4 h-4" />
//                             </button>
//                         </div>
//                     </div>

//                     {/* Calendar Grid */}
//                     <div className="p-6">
//                         {/* Day Labels */}
//                         <div className="grid grid-cols-7 gap-1 mb-2">
//                             {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
//                                 <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
//                                     {day}
//                                 </div>
//                             ))}
//                         </div>

//                         {/* Calendar Days */}
//                         <div className="grid grid-cols-7 gap-1">
//                             {days.map((date, index) => {
//                                 if (!date) {
//                                     return <div key={index} className="p-2 h-24"></div>;
//                                 }

//                                 const dateBookings = getBookingsForDate(date);
//                                 const isToday = date.getTime() === today.getTime();
//                                 const isSelected = selectedDate && date.getTime() === selectedDate.getTime();

//                                 return (
//                                     <div
//                                         key={index}
//                                         onClick={() => handleDateClick(date)}
//                                         className={`p-2 h-24 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${isToday ? 'bg-blue-50 border-blue-500' : ''
//                                             } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
//                                     >
//                                         <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
//                                             {date.getDate()}
//                                         </div>
//                                         <div className="mt-1 space-y-1">
//                                             {dateBookings.slice(0, 2).map(booking => (
//                                                 <div
//                                                     key={booking.booking_id}
//                                                     className="text-xs px-1 py-0.5 rounded text-white"
//                                                     style={{ backgroundColor: STATUS_CONFIG[booking.status].bgColor }}
//                                                 >
//                                                     {booking.booking_time.slice(0, 5)} {booking.customer_name.split(' ')[0]}
//                                                 </div>
//                                             ))}
//                                             {dateBookings.length > 2 && (
//                                                 <div className="text-xs text-gray-500">
//                                                     +{dateBookings.length - 2} more
//                                                 </div>
//                                             )}
//                                         </div>
//                                     </div>
//                                 );
//                             })}
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Side Panel */}
//             <div className="space-y-6">
//                 {/* Selected Date Info */}
//                 {selectedDate && (
//                     <div className="bg-white rounded-lg shadow-sm p-6">
//                         <h3 className="text-lg font-semibold text-gray-900 mb-4">
//                             {selectedDate.toLocaleDateString('en-US', {
//                                 weekday: 'long',
//                                 year: 'numeric',
//                                 month: 'long',
//                                 day: 'numeric'
//                             })}
//                         </h3>

//                         <div className="space-y-3">
//                             {getBookingsForDate(selectedDate).map(booking => (
//                                 <div key={booking.booking_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
//                                     <div>
//                                         <div className="font-medium text-sm">{booking.customer_name}</div>
//                                         <div className="text-xs text-gray-500">
//                                             {booking.booking_time.slice(0, 5)} • {booking.party_size} guests
//                                         </div>
//                                     </div>
//                                     <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[booking.status].color}`}>
//                                         {STATUS_CONFIG[booking.status].label}
//                                     </span>
//                                 </div>
//                             ))}

//                             {getBookingsForDate(selectedDate).length === 0 && (
//                                 <div className="text-center text-gray-500 py-4">
//                                     <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
//                                     <p className="text-sm">No bookings for this date</p>
//                                 </div>
//                             )}
//                         </div>

//                         <button
//                             onClick={() => setShowNewBookingForm(true)}
//                             className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
//                         >
//                             <Plus className="w-4 h-4" />
//                             Add Booking
//                         </button>
//                     </div>
//                 )}

//                 {/* Quick Stats */}
//                 <div className="bg-white rounded-lg shadow-sm p-6">
//                     <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
//                     <div className="space-y-3">
//                         <div className="flex justify-between">
//                             <span className="text-sm text-gray-600">This Month</span>
//                             <span className="text-sm font-medium">{bookings.filter(b => {
//                                 const bookingDate = new Date(b.booking_date);
//                                 return bookingDate.getMonth() === calendarDate.getMonth() &&
//                                     bookingDate.getFullYear() === calendarDate.getFullYear();
//                             }).length} bookings</span>
//                         </div>
//                         <div className="flex justify-between">
//                             <span className="text-sm text-gray-600">Confirmed</span>
//                             <span className="text-sm font-medium text-green-600">
//                                 {bookings.filter(b => b.status === 'confirmed').length}
//                             </span>
//                         </div>
//                         <div className="flex justify-between">
//                             <span className="text-sm text-gray-600">Pending</span>
//                             <span className="text-sm font-medium text-yellow-600">
//                                 {bookings.filter(b => b.status === 'pending').length}
//                             </span>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* New Booking Modal for Calendar */}
//             {showNewBookingForm && (
//                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//                     <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
//                         <BookingForm
//                             initialDate={selectedDate}
//                             onSave={(data) => {
//                                 onCreateBooking(data);
//                                 setShowNewBookingForm(false);
//                             }}
//                             onCancel={() => setShowNewBookingForm(false)}
//                         />
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// // Analytics View Component
// const AnalyticsViewContent = ({ bookings, analytics }) => {
//     const statusColors = {
//         confirmed: '#10b981',
//         pending: '#f59e0b',
//         cancelled: '#ef4444',
//         completed: '#3b82f6',
//         no_show: '#6b7280'
//     };

//     return (
//         <div className="space-y-6">
//             {/* Key Metrics */}
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                 <div className="bg-white rounded-lg shadow-sm p-6">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <p className="text-sm font-medium text-gray-600">Total Bookings</p>
//                             <p className="text-2xl font-bold text-gray-900">{analytics.totalBookings}</p>
//                         </div>
//                         <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
//                             <BarChart3 className="w-6 h-6 text-blue-600" />
//                         </div>
//                     </div>
//                     <div className="mt-4 flex items-center">
//                         <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
//                         <span className="text-sm text-green-500">+12% from last month</span>
//                     </div>
//                 </div>

//                 <div className="bg-white rounded-lg shadow-sm p-6">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <p className="text-sm font-medium text-gray-600">Avg Party Size</p>
//                             <p className="text-2xl font-bold text-gray-900">{analytics.avgPartySize}</p>
//                         </div>
//                         <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
//                             <Users className="w-6 h-6 text-green-600" />
//                         </div>
//                     </div>
//                     <div className="mt-4 flex items-center">
//                         <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
//                         <span className="text-sm text-green-500">+0.2 from last month</span>
//                     </div>
//                 </div>

//                 <div className="bg-white rounded-lg shadow-sm p-6">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <p className="text-sm font-medium text-gray-600">Cancellation Rate</p>
//                             <p className="text-2xl font-bold text-gray-900">{analytics.cancellationRate}%</p>
//                         </div>
//                         <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
//                             <Percent className="w-6 h-6 text-red-600" />
//                         </div>
//                     </div>
//                     <div className="mt-4 flex items-center">
//                         <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
//                         <span className="text-sm text-red-500">+2.1% from last month</span>
//                     </div>
//                 </div>

//                 <div className="bg-white rounded-lg shadow-sm p-6">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <p className="text-sm font-medium text-gray-600">Peak Hour</p>
//                             <p className="text-2xl font-bold text-gray-900">{analytics.peakHour}:00</p>
//                         </div>
//                         <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
//                             <Clock className="w-6 h-6 text-purple-600" />
//                         </div>
//                     </div>
//                     <div className="mt-4 flex items-center">
//                         <Activity className="w-4 h-4 text-purple-500 mr-1" />
//                         <span className="text-sm text-purple-500">Most popular time</span>
//                     </div>
//                 </div>
//             </div>

//             {/* Charts Row */}
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                 {/* Booking Status Distribution */}
//                 <div className="bg-white rounded-lg shadow-sm p-6">
//                     <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Status Distribution</h3>
//                     <div className="space-y-4">
//                         {Object.entries(analytics.statusCounts).map(([status, count]) => (
//                             <div key={status} className="flex items-center justify-between">
//                                 <div className="flex items-center">
//                                     <div
//                                         className="w-4 h-4 rounded-full mr-3"
//                                         style={{ backgroundColor: statusColors[status] || '#6b7280' }}
//                                     ></div>
//                                     <span className="text-sm font-medium capitalize">{status}</span>
//                                 </div>
//                                 <div className="flex items-center">
//                                     <span className="text-sm text-gray-600 mr-2">{count}</span>
//                                     <div className="w-20 bg-gray-200 rounded-full h-2">
//                                         <div
//                                             className="h-2 rounded-full"
//                                             style={{
//                                                 backgroundColor: statusColors[status] || '#6b7280',
//                                                 width: `${(count / analytics.totalBookings) * 100}%`
//                                             }}
//                                         ></div>
//                                     </div>
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 </div>

//                 {/* Hourly Distribution */}
//                 <div className="bg-white rounded-lg shadow-sm p-6">
//                     <h3 className="text-lg font-semibold text-gray-900 mb-4">Bookings by Hour</h3>
//                     <div className="space-y-3">
//                         {Object.entries(analytics.hourlyDistribution)
//                             .sort(([a], [b]) => parseInt(a) - parseInt(b))
//                             .map(([hour, count]) => (
//                                 <div key={hour} className="flex items-center">
//                                     <div className="w-12 text-sm text-gray-600">{hour}:00</div>
//                                     <div className="flex-1 mx-3">
//                                         <div className="w-full bg-gray-200 rounded-full h-2">
//                                             <div
//                                                 className="bg-blue-600 h-2 rounded-full"
//                                                 style={{
//                                                     width: `${(count / Math.max(...Object.values(analytics.hourlyDistribution))) * 100}%`
//                                                 }}
//                                             ></div>
//                                         </div>
//                                     </div>
//                                     <div className="w-8 text-sm text-gray-900 text-right">{count}</div>
//                                 </div>
//                             ))}
//                     </div>
//                 </div>
//             </div>

//             {/* Recent Activity */}
//             <div className="bg-white rounded-lg shadow-sm p-6">
//                 <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
//                 <div className="space-y-4">
//                     {bookings.slice(0, 5).map(booking => (
//                         <div key={booking.booking_id} className="flex items-center justify-between border-l-4 border-blue-500 pl-4">
//                             <div>
//                                 <p className="text-sm font-medium text-gray-900">
//                                     {booking.customer_name} - {booking.party_size} guests
//                                 </p>
//                                 <p className="text-xs text-gray-500">
//                                     {booking.booking_date} at {booking.booking_time.slice(0, 5)}
//                                 </p>
//                             </div>
//                             <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[booking.status].color}`}>
//                                 {STATUS_CONFIG[booking.status].label}
//                             </span>
//                         </div>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// };

// // Booking Form Component (same as before but with initialDate support)
// const BookingForm = ({ booking = null, onSave, onCancel, initialDate = null }) => {
//     const [formData, setFormData] = useState({
//         customer_name: booking?.customer_name || '',
//         customer_email: booking?.customer_email || '',
//         customer_phone: booking?.customer_phone || '',
//         booking_date: booking?.booking_date || (initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
//         booking_time: booking?.booking_time || '',
//         party_size: booking?.party_size || 2,
//         table_number: booking?.table_number || '',
//         special_requests: booking?.special_requests || '',
//         status: booking?.status || 'pending'
//     });
//     const [saving, setSaving] = useState(false);

//     const handleSubmit = async () => {
//         if (!formData.customer_name || !formData.customer_phone || !formData.customer_email || !formData.booking_date || !formData.booking_time) {
//             alert('Please fill in all required fields');
//             return;
//         }

//         setSaving(true);
//         try {
//             await onSave(formData);
//         } finally {
//             setSaving(false);
//         }
//     };

//     return (
//         <div className="bg-white rounded-lg shadow-sm border-2 border-blue-500 p-6">
//             <h3 className="text-lg font-semibold text-gray-900 mb-4">
//                 {booking ? 'Edit Booking' : 'New Booking'}
//             </h3>

//             <div className="space-y-4">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             Customer Name *
//                         </label>
//                         <input
//                             type="text"
//                             required
//                             value={formData.customer_name}
//                             onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="Enter customer name"
//                         />
//                     </div>

//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             Phone Number *
//                         </label>
//                         <input
//                             type="tel"
//                             required
//                             value={formData.customer_phone}
//                             onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="Enter phone number"
//                         />
//                     </div>

//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             Email *
//                         </label>
//                         <input
//                             type="email"
//                             required
//                             value={formData.customer_email}
//                             onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="Enter email address"
//                         />
//                     </div>

//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             Party Size *
//                         </label>
//                         <input
//                             type="number"
//                             min="1"
//                             max="20"
//                             required
//                             value={formData.party_size}
//                             onChange={(e) => setFormData(prev => ({ ...prev, party_size: parseInt(e.target.value) }))}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                         />
//                     </div>

//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             Date *
//                         </label>
//                         <input
//                             type="date"
//                             required
//                             value={formData.booking_date}
//                             onChange={(e) => setFormData(prev => ({ ...prev, booking_date: e.target.value }))}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             min={new Date().toISOString().split('T')[0]}
//                         />
//                     </div>

//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             Time *
//                         </label>
//                         <input
//                             type="time"
//                             required
//                             value={formData.booking_time}
//                             onChange={(e) => setFormData(prev => ({ ...prev, booking_time: e.target.value }))}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                         />
//                     </div>

//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             Table Number
//                         </label>
//                         <input
//                             type="text"
//                             value={formData.table_number}
//                             onChange={(e) => setFormData(prev => ({ ...prev, table_number: e.target.value }))}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="e.g., T12"
//                         />
//                     </div>

//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             Status
//                         </label>
//                         <select
//                             value={formData.status}
//                             onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                         >
//                             <option value="pending">Pending</option>
//                             <option value="confirmed">Confirmed</option>
//                             <option value="completed">Completed</option>
//                             <option value="cancelled">Cancelled</option>
//                             <option value="no_show">No Show</option>
//                         </select>
//                     </div>
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                         Special Requests
//                     </label>
//                     <textarea
//                         value={formData.special_requests}
//                         onChange={(e) => setFormData(prev => ({ ...prev, special_requests: e.target.value }))}
//                         rows={3}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                         placeholder="Any special requests or notes..."
//                     />
//                 </div>

//                 <div className="flex justify-end gap-3 pt-4">
//                     <button
//                         type="button"
//                         onClick={onCancel}
//                         className="px-4 py-2 text-gray-600 hover:text-gray-800"
//                         disabled={saving}
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         type="button"
//                         onClick={handleSubmit}
//                         disabled={saving}
//                         className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
//                     >
//                         {saving && <Loader2 className="w-4 h-4 animate-spin" />}
//                         {booking ? 'Update Booking' : 'Create Booking'}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// // Booking Card Component (same as before)
// const BookingCard = ({ booking, onEdit, onDelete, onUpdateStatus, isEditing, onSaveEdit, onCancelEdit }) => {
//     const statusConfig = STATUS_CONFIG[booking.status];
//     const StatusIcon = statusConfig.icon;

//     if (isEditing) {
//         return (
//             <div className="p-6">
//                 <BookingForm
//                     booking={booking}
//                     onSave={(updates) => onSaveEdit(booking.booking_id, updates)}
//                     onCancel={onCancelEdit}
//                 />
//             </div>
//         );
//     }

//     const formatDate = (dateStr) => {
//         if (!dateStr) return 'No date';
//         return new Date(dateStr).toLocaleDateString('en-US', {
//             weekday: 'short',
//             month: 'short',
//             day: 'numeric'
//         });
//     };

//     const formatTime = (timeStr) => {
//         if (!timeStr) return 'No time';
//         return timeStr.slice(0, 5);
//     };

//     return (
//         <div className="p-6 hover:bg-gray-50 transition-colors">
//             <div className="flex items-start justify-between">
//                 <div className="flex-1">
//                     <div className="flex items-center gap-3 mb-2">
//                         <h3 className="font-semibold text-gray-900">{booking.customer_name}</h3>
//                         <span className="text-sm text-gray-500">#{booking.booking_number}</span>
//                         <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
//                             <StatusIcon className="w-3 h-3" />
//                             {statusConfig.label}
//                         </span>
//                     </div>

//                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
//                         <div className="flex items-center gap-2">
//                             <Calendar className="w-4 h-4" />
//                             <span>{formatDate(booking.booking_date)} at {formatTime(booking.booking_time)}</span>
//                         </div>

//                         <div className="flex items-center gap-2">
//                             <Users className="w-4 h-4" />
//                             <span>{booking.party_size} guests</span>
//                             {booking.table_number && (
//                                 <>
//                                     <span className="text-gray-400">•</span>
//                                     <MapPin className="w-4 h-4" />
//                                     <span>Table {booking.table_number}</span>
//                                 </>
//                             )}
//                         </div>

//                         <div className="flex items-center gap-4">
//                             <div className="flex items-center gap-1">
//                                 <Phone className="w-4 h-4" />
//                                 <span>{booking.customer_phone || 'No phone'}</span>
//                             </div>
//                             {booking.customer_email && (
//                                 <div className="flex items-center gap-1">
//                                     <Mail className="w-4 h-4" />
//                                     <span>{booking.customer_email}</span>
//                                 </div>
//                             )}
//                         </div>
//                     </div>

//                     {booking.special_requests && (
//                         <div className="mt-3 p-3 bg-gray-50 rounded-md">
//                             <p className="text-sm text-gray-700">
//                                 <strong>Special requests:</strong> {booking.special_requests}
//                             </p>
//                         </div>
//                     )}
//                 </div>

//                 <div className="flex items-center gap-2 ml-4">
//                     {/* Quick Status Update */}
//                     <select
//                         value={booking.status}
//                         onChange={(e) => onUpdateStatus(booking.booking_id, e.target.value)}
//                         className="text-sm px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     >
//                         <option value="pending">Pending</option>
//                         <option value="confirmed">Confirmed</option>
//                         <option value="completed">Completed</option>
//                         <option value="cancelled">Cancelled</option>
//                         <option value="no_show">No Show</option>
//                     </select>

//                     <button
//                         onClick={() => onEdit(booking)}
//                         className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
//                         title="Edit booking"
//                     >
//                         <Edit2 className="w-4 h-4" />
//                     </button>

//                     <button
//                         onClick={() => onDelete(booking.booking_id)}
//                         className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
//                         title="Delete booking"
//                     >
//                         <Trash2 className="w-4 h-4" />
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };


import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar,
    Users,
    Clock,
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    Phone,
    Mail,
    User,
    AlertCircle,
    Loader2,
    CheckCircle,
    XCircle,
    Clock3,
    MapPin,
    Save,
    X,
    ChevronLeft,
    ChevronRight,
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Percent,
    CalendarDays,
    List,
    PieChart,
    Activity
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../contexts/OrganizationContext';

// Status configurations
const STATUS_CONFIG = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', bgColor: '#fef3c7', icon: Clock3 },
    confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800', bgColor: '#dcfce7', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', bgColor: '#fee2e2', icon: XCircle },
    completed: { label: 'Completed', color: 'bg-blue-100 text-blue-800', bgColor: '#dbeafe', icon: CheckCircle },
    no_show: { label: 'No Show', color: 'bg-gray-100 text-gray-800', bgColor: '#f3f4f6', icon: XCircle }
};

export default function BookingsManagement() {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();

    // State management
    const [bookings, setBookings] = useState([]);
    const [allBookings, setAllBookings] = useState([]); // For calendar and analytics
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('today');
    const [showNewBookingForm, setShowNewBookingForm] = useState(false);
    const [editingBooking, setEditingBooking] = useState(null);
    const [restaurantId, setRestaurantId] = useState(null);
    const [activeView, setActiveView] = useState('list'); // 'list', 'calendar', 'analytics'
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [operatingHours, setOperatingHours] = useState(null);

    // Stats state
    const [stats, setStats] = useState({
        todayBookings: 0,
        totalGuests: 0,
        nextBooking: null
    });

    // Calendar state
    const [calendarDate, setCalendarDate] = useState(new Date());

    // Main effect to fetch restaurant and bookings
    useEffect(() => {
        if (selectedOrganization?.id) {
            fetchRestaurantAndBookings();
        }
    }, [selectedOrganization, dateFilter, statusFilter]);

    // Fetch restaurant and initial bookings
    const fetchRestaurantAndBookings = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get or create restaurant for this organization
            let { data: restaurant, error: restaurantError } = await supabase
                .from('restaurants')
                .select('restaurant_id')
                .eq('organization_id', selectedOrganization.id)
                .single();

            if (restaurantError && restaurantError.code === 'PGRST116') {
                // No restaurant found, create one
                const { data: newRestaurant, error: createError } = await supabase
                    .from('restaurants')
                    .insert({
                        organization_id: selectedOrganization.id,
                        name: selectedOrganization.name,
                        slug: selectedOrganization.name.toLowerCase().replace(/\s+/g, '-'),
                        created_by: user?.id,
                        is_active: true,
                        accepts_bookings: true
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                restaurant = newRestaurant;
            } else if (restaurantError) {
                throw restaurantError;
            }

            if (!restaurant) throw new Error('No restaurant found');
            setRestaurantId(restaurant.restaurant_id);

            // Fetch operating hours from restaurant_websites
            const { data: websiteData } = await supabase
                .from('restaurant_websites')
                .select('operating_hours')
                .eq('restaurant_id', restaurant.restaurant_id)
                .single();

            if (websiteData?.operating_hours) {
                setOperatingHours(websiteData.operating_hours);
            }

            // Fetch both filtered bookings and all bookings
            await Promise.all([
                fetchBookings(restaurant.restaurant_id),
                fetchAllBookings(restaurant.restaurant_id)
            ]);

        } catch (err) {
            console.error('Error fetching restaurant and bookings:', err);
            setError(err instanceof Error ? err.message : 'Failed to load restaurant data');
        } finally {
            setLoading(false);
        }
    };

    // Fetch filtered bookings for list view
    const fetchBookings = async (restId = restaurantId) => {
        if (!restId) return;

        try {
            let query = supabase
                .from('bookings')
                .select('*')
                .eq('restaurant_id', restId)
                .order('booking_date', { ascending: true })
                .order('booking_time', { ascending: true });

            // Apply date filter
            const today = new Date().toISOString().split('T')[0];
            if (dateFilter === 'today') {
                query = query.eq('booking_date', today);
            } else if (dateFilter === 'tomorrow') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toISOString().split('T')[0];
                query = query.eq('booking_date', tomorrowStr);
            } else if (dateFilter === 'this_week') {
                const weekFromNow = new Date();
                weekFromNow.setDate(weekFromNow.getDate() + 7);
                query = query
                    .gte('booking_date', today)
                    .lte('booking_date', weekFromNow.toISOString().split('T')[0]);
            }

            // Apply status filter
            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            const { data: bookingsData, error: bookingsError } = await query;

            if (bookingsError) throw bookingsError;

            setBookings(bookingsData || []);

            // Calculate stats for today only
            const { data: todayBookingsData } = await supabase
                .from('bookings')
                .select('*')
                .eq('restaurant_id', restId)
                .eq('booking_date', today)
                .order('booking_time', { ascending: true });

            if (todayBookingsData) {
                const totalGuests = todayBookingsData.reduce((sum, b) => sum + b.party_size, 0);
                const nextBooking = todayBookingsData
                    .filter(b => b.status === 'confirmed')
                    .find(b => b.booking_time > new Date().toTimeString().slice(0, 5));

                setStats({
                    todayBookings: todayBookingsData.length,
                    totalGuests,
                    nextBooking
                });
            }

        } catch (err) {
            console.error('Error fetching bookings:', err);
            setError('Failed to load bookings');
        }
    };

    // Fetch all bookings for calendar and analytics (not filtered)
    const fetchAllBookings = async (restId = restaurantId) => {
        if (!restId) return;

        try {
            const { data: allBookingsData, error: bookingsError } = await supabase
                .from('bookings')
                .select('*')
                .eq('restaurant_id', restId)
                .order('booking_date', { ascending: true })
                .order('booking_time', { ascending: true });

            if (bookingsError) throw bookingsError;

            setAllBookings(allBookingsData || []);
        } catch (err) {
            console.error('Error fetching all bookings:', err);
        }
    };

    // Validate booking time against operating hours
    const validateBookingTime = (bookingDate, bookingTime) => {
        if (!operatingHours || !bookingDate || !bookingTime) {
            return { isValid: false, error: 'Missing booking information' };
        }

        // Get day of week (Sunday = 0, Monday = 1, etc.)
        const date = new Date(bookingDate);
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[date.getDay()];

        const dayHours = operatingHours[dayName];

        if (!dayHours || !dayHours.isOpen) {
            return { isValid: false, error: `Restaurant is closed on ${dayName}s` };
        }

        // Convert booking time to minutes for comparison
        const [bookingHour, bookingMinute] = bookingTime.split(':').map(Number);
        const bookingMinutes = bookingHour * 60 + bookingMinute;

        // Convert operating hours to minutes
        const [openHour, openMinute] = dayHours.open.split(':').map(Number);
        const [closeHour, closeMinute] = dayHours.close.split(':').map(Number);
        const openMinutes = openHour * 60 + openMinute;
        const closeMinutes = closeHour * 60 + closeMinute;

        // Handle case where restaurant closes after midnight (e.g., 23:59 to 02:00)
        if (closeMinutes < openMinutes) {
            // Restaurant is open across midnight
            if (bookingMinutes >= openMinutes || bookingMinutes <= closeMinutes) {
                return { isValid: true, error: null };
            }
        } else {
            // Normal hours (e.g., 09:00 to 22:00)
            if (bookingMinutes >= openMinutes && bookingMinutes <= closeMinutes) {
                return { isValid: true, error: null };
            }
        }

        return {
            isValid: false,
            error: `Restaurant is closed at this time. Operating hours on ${dayName}s: ${dayHours.open} - ${dayHours.close}`
        };
    };

    // Analytics calculations using allBookings
    const analytics = useMemo(() => {
        const analyticsBookings = allBookings;

        if (analyticsBookings.length === 0) {
            return {
                totalBookings: 0,
                recentBookings: 0,
                statusCounts: {},
                hourlyDistribution: {},
                avgPartySize: 0,
                cancellationRate: 0,
                peakHour: '0'
            };
        }

        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        const last30DaysStr = last30Days.toISOString().split('T')[0];

        const recentBookings = analyticsBookings.filter(b => b.booking_date >= last30DaysStr);

        const statusCounts = analyticsBookings.reduce((acc, booking) => {
            acc[booking.status] = (acc[booking.status] || 0) + 1;
            return acc;
        }, {});

        const hourlyDistribution = analyticsBookings.reduce((acc, booking) => {
            const hour = parseInt(booking.booking_time.split(':')[0]);
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});

        const avgPartySize = analyticsBookings.length > 0
            ? (analyticsBookings.reduce((sum, b) => sum + b.party_size, 0) / analyticsBookings.length).toFixed(1)
            : 0;

        const cancellationRate = analyticsBookings.length > 0
            ? ((statusCounts.cancelled || 0) / analyticsBookings.length * 100).toFixed(1)
            : 0;

        return {
            totalBookings: analyticsBookings.length,
            recentBookings: recentBookings.length,
            statusCounts,
            hourlyDistribution,
            avgPartySize,
            cancellationRate,
            peakHour: Object.keys(hourlyDistribution).length > 0
                ? Object.keys(hourlyDistribution).reduce((a, b) =>
                    hourlyDistribution[a] > hourlyDistribution[b] ? a : b)
                : '0'
        };
    }, [allBookings]);

    const handleCreateBooking = async (bookingData) => {
        if (!restaurantId) {
            setError('Restaurant not found');
            return;
        }

        try {
            // Generate booking number
            const { data: existingBookings } = await supabase
                .from('bookings')
                .select('booking_number')
                .eq('restaurant_id', restaurantId)
                .order('created_at', { ascending: false })
                .limit(1);

            let bookingNumber = 'BK001';
            if (existingBookings && existingBookings.length > 0) {
                const lastNumber = parseInt(existingBookings[0].booking_number.replace('BK', ''));
                bookingNumber = `BK${String(lastNumber + 1).padStart(3, '0')}`;
            }

            // Try to find existing customer
            let customerId = null;
            if (bookingData.customer_email) {
                const { data: existingCustomer } = await supabase
                    .from('customers')
                    .select('customer_id')
                    .eq('email', bookingData.customer_email)
                    .eq('organization_id', selectedOrganization.id)
                    .single();

                if (existingCustomer) {
                    customerId = existingCustomer.customer_id;
                } else {
                    // Create new customer
                    const nameParts = bookingData.customer_name.split(' ');
                    const { data: newCustomer, error: customerError } = await supabase
                        .from('customers')
                        .insert({
                            first_name: nameParts[0] || 'Unknown',
                            last_name: nameParts.slice(1).join(' ') || 'Customer',
                            email: bookingData.customer_email,
                            phone: bookingData.customer_phone,
                            organization_id: selectedOrganization.id,
                            type: 'Customer',
                            created_by: user?.id
                        })
                        .select()
                        .single();

                    if (!customerError && newCustomer) {
                        customerId = newCustomer.customer_id;
                    }
                }
            }

            // Create booking
            const { data: newBooking, error: bookingError } = await supabase
                .from('bookings')
                .insert({
                    restaurant_id: restaurantId,
                    customer_id: customerId,
                    booking_number: bookingNumber,
                    ...bookingData,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (bookingError) throw bookingError;

            setShowNewBookingForm(false);

            // Refresh both data sets
            await Promise.all([
                fetchBookings(),
                fetchAllBookings()
            ]);

        } catch (err) {
            console.error('Error creating booking:', err);
            setError('Failed to create booking');
        }
    };

    const handleUpdateBooking = async (bookingId, updates) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('booking_id', bookingId);

            if (error) throw error;

            setEditingBooking(null);

            // Refresh both data sets
            await Promise.all([
                fetchBookings(),
                fetchAllBookings()
            ]);

        } catch (err) {
            console.error('Error updating booking:', err);
            setError('Failed to update booking');
        }
    };

    const handleDeleteBooking = async (bookingId) => {
        if (!confirm('Are you sure you want to delete this booking?')) return;

        try {
            const { error } = await supabase
                .from('bookings')
                .delete()
                .eq('booking_id', bookingId);

            if (error) throw error;

            // Refresh both data sets
            await Promise.all([
                fetchBookings(),
                fetchAllBookings()
            ]);

        } catch (err) {
            console.error('Error deleting booking:', err);
            setError('Failed to delete booking');
        }
    };

    // Filter bookings based on search term
    const filteredBookings = bookings.filter(booking =>
        booking.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.booking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customer_phone?.includes(searchTerm) ||
        (booking.customer_email && booking.customer_email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (!selectedOrganization) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
                        Please select an organization to manage bookings.
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
                    <p className="text-gray-600">Loading bookings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Table Bookings</h1>
                    <p className="text-gray-600 mt-2">Manage restaurant reservations and table assignments</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto text-red-600 hover:text-red-800"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600">Today's Bookings</p>
                                <p className="text-2xl font-bold">{stats.todayBookings}</p>
                            </div>
                            <Calendar className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600">Total Guests Today</p>
                                <p className="text-2xl font-bold">{stats.totalGuests}</p>
                            </div>
                            <Users className="w-8 h-8 text-green-600" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600">Next Booking</p>
                                <p className="text-2xl font-bold">
                                    {stats.nextBooking ?
                                        stats.nextBooking.booking_time.slice(0, 5) :
                                        'None'
                                    }
                                </p>
                            </div>
                            <Clock className="w-8 h-8 text-purple-600" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600">Total Bookings</p>
                                <p className="text-2xl font-bold">{analytics.totalBookings}</p>
                            </div>
                            <BarChart3 className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>
                </div>

                {/* View Tabs */}
                <div className="bg-white rounded-lg shadow-sm mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6">
                            <button
                                onClick={() => setActiveView('list')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeView === 'list'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <List className="w-4 h-4" />
                                    List View
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveView('calendar')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeView === 'calendar'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4" />
                                    Calendar View
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveView('analytics')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeView === 'analytics'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    Analytics
                                </div>
                            </button>
                        </nav>
                    </div>

                    {/* Controls - shown for list and calendar views */}
                    {(activeView === 'list' || activeView === 'calendar') && (
                        <div className="p-6">
                            <div className="flex flex-col lg:flex-row gap-4 justify-between">
                                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                                    {/* Search */}
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search bookings..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                        />
                                    </div>

                                    {/* Date Filter */}
                                    <select
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All Dates</option>
                                        <option value="today">Today</option>
                                        <option value="tomorrow">Tomorrow</option>
                                        <option value="this_week">This Week</option>
                                    </select>

                                    {/* Status Filter */}
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="no_show">No Show</option>
                                    </select>
                                </div>

                                {/* Add Booking Button */}
                                <button
                                    onClick={() => setShowNewBookingForm(true)}
                                    disabled={!restaurantId}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus className="w-5 h-5" />
                                    New Booking
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* View Content */}
                {activeView === 'list' && (
                    <ListViewContent
                        bookings={filteredBookings}
                        onEdit={setEditingBooking}
                        onDelete={handleDeleteBooking}
                        onUpdateStatus={(bookingId, status) => handleUpdateBooking(bookingId, { status })}
                        editingBooking={editingBooking}
                        onSaveEdit={(bookingId, updates) => handleUpdateBooking(bookingId, updates)}
                        onCancelEdit={() => setEditingBooking(null)}
                        showNewBookingForm={showNewBookingForm}
                        onCreateBooking={handleCreateBooking}
                        onCancelNewBooking={() => setShowNewBookingForm(false)}
                        searchTerm={searchTerm}
                        statusFilter={statusFilter}
                        dateFilter={dateFilter}
                        validateBookingTime={validateBookingTime}
                        operatingHours={operatingHours}
                    />
                )}

                {activeView === 'calendar' && (
                    <CalendarViewContent
                        bookings={allBookings} // Use allBookings for calendar
                        calendarDate={calendarDate}
                        setCalendarDate={setCalendarDate}
                        onEdit={setEditingBooking}
                        onDelete={handleDeleteBooking}
                        onUpdateStatus={(bookingId, status) => handleUpdateBooking(bookingId, { status })}
                        onCreateBooking={handleCreateBooking}
                        showNewBookingForm={showNewBookingForm}
                        setShowNewBookingForm={setShowNewBookingForm}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        restaurantId={restaurantId}
                        validateBookingTime={validateBookingTime}
                        operatingHours={operatingHours}
                    />
                )}

                {activeView === 'analytics' && (
                    <AnalyticsViewContent
                        bookings={allBookings} // Use allBookings for analytics
                        analytics={analytics}
                    />
                )}
            </div>
        </div>
    );
}

// List View Component
const ListViewContent = ({
    bookings, onEdit, onDelete, onUpdateStatus, editingBooking, onSaveEdit, onCancelEdit,
    showNewBookingForm, onCreateBooking, onCancelNewBooking, searchTerm, statusFilter, dateFilter,
    validateBookingTime, operatingHours
}) => {
    return (
        <>
            {/* New Booking Form */}
            {showNewBookingForm && (
                <div className="mb-6">
                    <BookingForm
                        onSave={onCreateBooking}
                        onCancel={onCancelNewBooking}
                        validateBookingTime={validateBookingTime}
                        operatingHours={operatingHours}
                    />
                </div>
            )}

            {/* Bookings List */}
            <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Bookings ({bookings.length})
                    </h2>
                </div>

                {bookings.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No bookings found</p>
                        <p className="text-sm mt-1">
                            {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Create your first booking to get started'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {bookings.map((booking) => (
                            <BookingCard
                                key={booking.booking_id}
                                booking={booking}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onUpdateStatus={onUpdateStatus}
                                isEditing={editingBooking?.booking_id === booking.booking_id}
                                onSaveEdit={onSaveEdit}
                                onCancelEdit={onCancelEdit}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

// Calendar View Component
const CalendarViewContent = ({
    bookings, calendarDate, setCalendarDate, onEdit, onDelete, onUpdateStatus,
    onCreateBooking, showNewBookingForm, setShowNewBookingForm, selectedDate, setSelectedDate,
    restaurantId, validateBookingTime, operatingHours
}) => {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    const getBookingsForDate = (date) => {
        if (!date || !bookings || bookings.length === 0) return [];
        const dateStr = date.toISOString().split('T')[0];
        return bookings.filter(booking => booking.booking_date === dateStr);
    };

    const navigateMonth = (direction) => {
        const newDate = new Date(calendarDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setCalendarDate(newDate);
    };

    const handleDateClick = (date) => {
        setSelectedDate(date);
    };

    const days = getDaysInMonth(calendarDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigateMonth(-1)}
                                className="p-2 hover:bg-gray-100 rounded-md"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCalendarDate(new Date())}
                                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Today
                            </button>
                            <button
                                onClick={() => navigateMonth(1)}
                                className="p-2 hover:bg-gray-100 rounded-md"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="p-6">
                        {/* Day Labels */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="grid grid-cols-7 gap-1">
                            {days.map((date, index) => {
                                if (!date) {
                                    return <div key={index} className="p-2 h-24"></div>;
                                }

                                const dateBookings = getBookingsForDate(date);
                                const isToday = date.getTime() === today.getTime();
                                const isSelected = selectedDate && date.getTime() === selectedDate.getTime();

                                return (
                                    <div
                                        key={index}
                                        onClick={() => handleDateClick(date)}
                                        className={`p-2 h-24 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${isToday ? 'bg-blue-50 border-blue-500' : ''
                                            } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                                    >
                                        <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                                            {date.getDate()}
                                        </div>
                                        <div className="mt-1 space-y-1">
                                            {dateBookings.slice(0, 2).map(booking => (
                                                <div
                                                    key={booking.booking_id}
                                                    className="text-xs px-1 py-0.5 rounded text-white"
                                                    style={{ backgroundColor: STATUS_CONFIG[booking.status].bgColor }}
                                                >
                                                    {booking.booking_time.slice(0, 5)} {booking.customer_name.split(' ')[0]}
                                                </div>
                                            ))}
                                            {dateBookings.length > 2 && (
                                                <div className="text-xs text-gray-500">
                                                    +{dateBookings.length - 2} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
                {/* Selected Date Info */}
                {selectedDate && (
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {selectedDate.toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </h3>

                        <div className="space-y-3">
                            {getBookingsForDate(selectedDate).map(booking => (
                                <div key={booking.booking_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                    <div>
                                        <div className="font-medium text-sm">{booking.customer_name}</div>
                                        <div className="text-xs text-gray-500">
                                            {booking.booking_time.slice(0, 5)} • {booking.party_size} guests
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[booking.status].color}`}>
                                        {STATUS_CONFIG[booking.status].label}
                                    </span>
                                </div>
                            ))}

                            {getBookingsForDate(selectedDate).length === 0 && (
                                <div className="text-center text-gray-500 py-4">
                                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No bookings for this date</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowNewBookingForm(true)}
                            className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Booking
                        </button>
                    </div>
                )}

                {/* Quick Stats */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">This Month</span>
                            <span className="text-sm font-medium">{bookings.filter(b => {
                                const bookingDate = new Date(b.booking_date);
                                return bookingDate.getMonth() === calendarDate.getMonth() &&
                                    bookingDate.getFullYear() === calendarDate.getFullYear();
                            }).length} bookings</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Confirmed</span>
                            <span className="text-sm font-medium text-green-600">
                                {bookings.filter(b => b.status === 'confirmed').length}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Pending</span>
                            <span className="text-sm font-medium text-yellow-600">
                                {bookings.filter(b => b.status === 'pending').length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* New Booking Modal for Calendar */}
            {showNewBookingForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <BookingForm
                            initialDate={selectedDate}
                            onSave={(data) => {
                                onCreateBooking(data);
                                setShowNewBookingForm(false);
                            }}
                            onCancel={() => setShowNewBookingForm(false)}
                            validateBookingTime={validateBookingTime}
                            operatingHours={operatingHours}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// Analytics View Component
const AnalyticsViewContent = ({ bookings, analytics }) => {
    const statusColors = {
        confirmed: '#10b981',
        pending: '#f59e0b',
        cancelled: '#ef4444',
        completed: '#3b82f6',
        no_show: '#6b7280'
    };

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                            <p className="text-2xl font-bold text-gray-900">{analytics.totalBookings}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-500">+12% from last month</span>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Avg Party Size</p>
                            <p className="text-2xl font-bold text-gray-900">{analytics.avgPartySize}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Users className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-500">+0.2 from last month</span>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Cancellation Rate</p>
                            <p className="text-2xl font-bold text-gray-900">{analytics.cancellationRate}%</p>
                        </div>
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                            <Percent className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                        <span className="text-sm text-red-500">+2.1% from last month</span>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Peak Hour</p>
                            <p className="text-2xl font-bold text-gray-900">{analytics.peakHour}:00</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <Activity className="w-4 h-4 text-purple-500 mr-1" />
                        <span className="text-sm text-purple-500">Most popular time</span>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Booking Status Distribution */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Status Distribution</h3>
                    <div className="space-y-4">
                        {Object.entries(analytics.statusCounts).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div
                                        className="w-4 h-4 rounded-full mr-3"
                                        style={{ backgroundColor: statusColors[status] || '#6b7280' }}
                                    ></div>
                                    <span className="text-sm font-medium capitalize">{status}</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-sm text-gray-600 mr-2">{count}</span>
                                    <div className="w-20 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full"
                                            style={{
                                                backgroundColor: statusColors[status] || '#6b7280',
                                                width: `${(count / analytics.totalBookings) * 100}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hourly Distribution */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Bookings by Hour</h3>
                    <div className="space-y-3">
                        {Object.entries(analytics.hourlyDistribution)
                            .sort(([a], [b]) => parseInt(a) - parseInt(b))
                            .map(([hour, count]) => (
                                <div key={hour} className="flex items-center">
                                    <div className="w-12 text-sm text-gray-600">{hour}:00</div>
                                    <div className="flex-1 mx-3">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{
                                                    width: `${(count / Math.max(...Object.values(analytics.hourlyDistribution))) * 100}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="w-8 text-sm text-gray-900 text-right">{count}</div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                    {bookings.slice(0, 5).map(booking => (
                        <div key={booking.booking_id} className="flex items-center justify-between border-l-4 border-blue-500 pl-4">
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                    {booking.customer_name} - {booking.party_size} guests
                                </p>
                                <p className="text-xs text-gray-500">
                                    {booking.booking_date} at {booking.booking_time.slice(0, 5)}
                                </p>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[booking.status].color}`}>
                                {STATUS_CONFIG[booking.status].label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Booking Form Component (same as before but with initialDate support)
const BookingForm = ({ booking = null, onSave, onCancel, initialDate = null, validateBookingTime, operatingHours }) => {
    const [formData, setFormData] = useState({
        customer_name: booking?.customer_name || '',
        customer_email: booking?.customer_email || '',
        customer_phone: booking?.customer_phone || '',
        booking_date: booking?.booking_date || (initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        booking_time: booking?.booking_time || '',
        party_size: booking?.party_size || 2,
        table_number: booking?.table_number || '',
        special_requests: booking?.special_requests || '',
        status: booking?.status || 'pending'
    });
    const [saving, setSaving] = useState(false);
    const [timeError, setTimeError] = useState('');

    // Validate booking time whenever date or time changes
    useEffect(() => {
        if (formData.booking_date && formData.booking_time && validateBookingTime) {
            const validation = validateBookingTime(formData.booking_date, formData.booking_time);
            if (!validation.isValid) {
                setTimeError(validation.error);
            } else {
                setTimeError('');
            }
        } else {
            setTimeError('');
        }
    }, [formData.booking_date, formData.booking_time, validateBookingTime]);

    const handleSubmit = async () => {
        if (!formData.customer_name || !formData.customer_phone || !formData.customer_email || !formData.booking_date || !formData.booking_time) {
            alert('Please fill in all required fields');
            return;
        }

        // Validate booking time before submitting
        if (validateBookingTime) {
            const validation = validateBookingTime(formData.booking_date, formData.booking_time);
            if (!validation.isValid) {
                alert(validation.error);
                return;
            }
        }

        setSaving(true);
        try {
            await onSave(formData);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border-2 border-blue-500 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {booking ? 'Edit Booking' : 'New Booking'}
            </h3>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customer Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.customer_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter customer name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number *
                        </label>
                        <input
                            type="tel"
                            required
                            value={formData.customer_phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter phone number"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.customer_email}
                            onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter email address"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Party Size *
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            required
                            value={formData.party_size}
                            onChange={(e) => setFormData(prev => ({ ...prev, party_size: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date *
                        </label>
                        <input
                            type="date"
                            required
                            value={formData.booking_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, booking_date: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Time *
                        </label>
                        <input
                            type="time"
                            required
                            value={formData.booking_time}
                            onChange={(e) => setFormData(prev => ({ ...prev, booking_time: e.target.value }))}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${timeError ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {timeError && (
                            <p className="text-red-500 text-xs mt-1">{timeError}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Table Number
                        </label>
                        <input
                            type="text"
                            value={formData.table_number}
                            onChange={(e) => setFormData(prev => ({ ...prev, table_number: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., T12"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No Show</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Special Requests
                    </label>
                    <textarea
                        value={formData.special_requests}
                        onChange={(e) => setFormData(prev => ({ ...prev, special_requests: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Any special requests or notes..."
                    />
                </div>

                {/* Operating Hours Display */}
                {operatingHours && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">Restaurant Operating Hours</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-800">
                            {Object.entries(operatingHours).map(([day, hours]) => (
                                <div key={day} className="flex justify-between">
                                    <span className="capitalize font-medium">{day}:</span>
                                    <span>
                                        {hours.isOpen ? `${hours.open} - ${hours.close}` : 'Closed'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving || timeError}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {booking ? 'Update Booking' : 'Create Booking'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Booking Card Component (same as before)
const BookingCard = ({ booking, onEdit, onDelete, onUpdateStatus, isEditing, onSaveEdit, onCancelEdit, validateBookingTime, operatingHours }) => {
    const statusConfig = STATUS_CONFIG[booking.status];
    const StatusIcon = statusConfig.icon;

    if (isEditing) {
        return (
            <div className="p-6">
                <BookingForm
                    booking={booking}
                    onSave={(updates) => onSaveEdit(booking.booking_id, updates)}
                    onCancel={onCancelEdit}
                    validateBookingTime={validateBookingTime}
                    operatingHours={operatingHours}
                />
            </div>
        );
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'No date';
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return 'No time';
        return timeStr.slice(0, 5);
    };

    return (
        <div className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{booking.customer_name}</h3>
                        <span className="text-sm text-gray-500">#{booking.booking_number}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(booking.booking_date)} at {formatTime(booking.booking_time)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{booking.party_size} guests</span>
                            {booking.table_number && (
                                <>
                                    <span className="text-gray-400">•</span>
                                    <MapPin className="w-4 h-4" />
                                    <span>Table {booking.table_number}</span>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                <span>{booking.customer_phone || 'No phone'}</span>
                            </div>
                            {booking.customer_email && (
                                <div className="flex items-center gap-1">
                                    <Mail className="w-4 h-4" />
                                    <span>{booking.customer_email}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {booking.special_requests && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-700">
                                <strong>Special requests:</strong> {booking.special_requests}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                    {/* Quick Status Update */}
                    <select
                        value={booking.status}
                        onChange={(e) => onUpdateStatus(booking.booking_id, e.target.value)}
                        className="text-sm px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                    </select>

                    <button
                        onClick={() => onEdit(booking)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit booking"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => onDelete(booking.booking_id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete booking"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};