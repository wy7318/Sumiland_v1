// import { useState, useEffect, useRef } from 'react';
// import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
// import { motion, AnimatePresence } from 'framer-motion';
// import {
//   FileText, Image, LogOut, Users, Package, Quote, MessageSquare,
//   LayoutDashboard, Settings, ShoppingBag, Building2, Truck, ClipboardList,
//   BoxSelect as BoxSeam, UserCog, Home, UserPlus, UserCheck, Target,
//   Search, MoreHorizontal, Zap, BarChart2, CheckSquare, ChevronLeft, ChevronRight,
//   Bell, User
// } from 'lucide-react';
// import { getCurrentUser, signOut } from '../../lib/auth';
// import { cn } from '../../lib/utils';
// import { useAuth } from '../../contexts/AuthContext';
// import { OrganizationSwitcher } from '../OrganizationSwitcher';
// import { NotificationPanel } from './NotificationPanel';
// import { SearchBar } from './search/SearchBar';

// export function AdminLayout() {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const [loading, setLoading] = useState(true);
//   const [isSuperAdmin, setIsSuperAdmin] = useState(false);
//   const [showSettingsMenu, setShowSettingsMenu] = useState(false);
//   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
//   const [userData, setUserData] = useState(null);
//   const { organizations } = useAuth();

//   const settingsMenuRef = useRef(null);
//   const [scrolled, setScrolled] = useState(false);

//   useEffect(() => {
//     const handleScroll = () => setScrolled(window.scrollY > 10);
//     window.addEventListener('scroll', handleScroll);
//     return () => {
//       window.removeEventListener('scroll', handleScroll);
//     };
//   }, []);

//   useEffect(() => {
//     checkAuth();

//     const handleClickOutside = (event) => {
//       if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
//         setShowSettingsMenu(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   const checkAuth = async () => {
//     const userData = await getCurrentUser();
//     if (!userData?.user) {
//       navigate('/login');
//       return;
//     }
//     setUserData(userData);
//     setIsSuperAdmin(!!userData.profile?.is_super_admin);
//     setLoading(false);
//   };

//   const handleSignOut = async () => {
//     await signOut();
//     navigate('/');
//   };

//   const isActive = (path) => {
//     // Special case for Dashboard which is at the root admin path
//     if (path === '/admin') {
//       return location.pathname === '/admin' || location.pathname === '/admin/';
//     }
//     // For all other paths, use the startsWith check
//     return location.pathname.startsWith(path);
//   };

//   // Add this function before your return statement
//   const getMenuHighlightColors = (label) => {
//     switch (label) {
//       case 'Dashboard':
//         return "bg-blue-50 text-blue-600 border-l-4 border-blue-500";
//       case 'Accounts':
//         return "bg-rose-50 text-rose-600 border-l-4 border-rose-500";
//       case 'Contacts':
//         return "bg-cyan-50 text-cyan-600 border-l-4 border-cyan-500";
//       case 'Leads':
//         return "bg-indigo-50 text-indigo-600 border-l-4 border-indigo-500";
//       case 'Cases':
//         return "bg-blue-50 text-blue-600 border-l-4 border-blue-500";
//       case 'Opportunities':
//         return "bg-purple-50 text-purple-600 border-l-4 border-purple-500";
//       case 'Quotes':
//         return "bg-teal-50 text-teal-600 border-l-4 border-teal-500";
//       case 'Orders':
//         return "bg-amber-50 text-amber-600 border-l-4 border-amber-500";
//       case 'Tasks':
//         return "bg-yellow-50 text-yellow-600 border-l-4 border-yellow-500";
//       case 'Reports':
//         return "bg-lime-50 text-lime-600 border-l-4 border-lime-500";
//       case 'Products':
//         return "bg-fuchsia-50 text-fuchsia-600 border-l-4 border-fuchsia-500";
//       // Add more cases for other menu items
//       default:
//         return "bg-primary-100 text-primary-700 border-l-4 border-primary-500";
//     }
//   };

//   const getMenuBgColor = (label) => {
//     const colorClass = getMenuHighlightColors(label).split(' ')[0]; // get bg-xxx-50
//     return colorClass;
//   };

//   const hasAdminAccess = organizations.some(org => org.role === 'admin' || org.role === 'owner');

//   const menuItems = [
//     { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
//     { path: '/admin/vendors', icon: Building2, label: 'Accounts' },
//     { path: '/admin/customers', icon: Users, label: 'Contacts' },
//     { path: '/admin/leads', icon: UserCheck, label: 'Leads' },
//     { path: '/admin/cases', icon: MessageSquare, label: 'Cases' },
//     { path: '/admin/opportunities', icon: Target, label: 'Opportunities' },
//     { path: '/admin/quotes', icon: Quote, label: 'Quotes' },
//     { path: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
//     { path: '/admin/tasks', icon: CheckSquare, label: 'Tasks' },
//     { path: '/admin/purchase-orders', icon: Truck, label: 'Purchase Orders' },
//     { path: '/admin/work-orders', icon: ClipboardList, label: 'Work Orders' },
//     { path: '/admin/inventory', icon: BoxSeam, label: 'Inventory' },
//     { path: '/admin/posts', icon: FileText, label: 'Blog Posts' },
//     { path: '/admin/portfolio', icon: Image, label: 'Portfolio' },
//     { path: '/admin/reports', icon: BarChart2, label: 'Reports' },
//     { path: '/admin/sales-assistant', icon: Zap, label: 'Sales Assistant' },
    
//     ...(hasAdminAccess ? [
//       { path: '/admin/products', icon: Package, label: 'Products' },
//       { path: '/admin/customflow', icon: Package, label: 'Custom Flows' },
//       { path: '/admin/users', icon: UserPlus, label: 'User Management' }
//     ] : []),
//     ...(isSuperAdmin ? [
//       { path: '/admin/user-organizations', icon: UserCog, label: 'User & Org Management' }
      
//     ] : [])
//   ];

//   const currentMenuItem = menuItems.find(item => isActive(item.path));
//   const currentBgColor = currentMenuItem ? getMenuBgColor(currentMenuItem.label) : "bg-white";

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 flex">
//       {/* Sidebar Navigation */}
//       <aside
//         className={cn(
//           "fixed h-screen bg-white shadow-md transition-all duration-300 z-30",
//           "rounded-tr-3xl rounded-br-3xl", // Curved edges
//           sidebarCollapsed ? "w-20" : "w-64"
//         )}
//       >
//         {/* Organization Info Panel */}
//         <div className="p-4 border-b border-gray-200 mb-2">
//           {sidebarCollapsed ? (
//             <div className="flex justify-center">
//               <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
//                 {organizations[0]?.name?.charAt(0) || 'O'}
//               </div>
//             </div>
//           ) : (
//             <OrganizationSwitcher />
//           )}
//         </div>

//         {/* Sidebar Collapse Toggle Button */}
//         <button
//           onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
//           className="absolute -right-3 top-20 bg-white rounded-full p-1 shadow-md border border-gray-200"
//         >
//           {sidebarCollapsed ? (
//             <ChevronRight className="w-4 h-4 text-gray-500" />
//           ) : (
//             <ChevronLeft className="w-4 h-4 text-gray-500" />
//           )}
//         </button>

//         {/* Navigation Menu Items */}
//         <div className={cn(
//           "py-2 flex flex-col h-[calc(100%-10rem)]", // Increase the subtracted height to leave more room for Settings
//           sidebarCollapsed ? "items-center" : ""
//         )}>
//           <div className="flex-grow overflow-y-auto hide-scrollbar pr-1">
//             {menuItems.map((item) => (
//               <Link
//                 key={item.path}
//                 to={item.path}
//                 className={cn(
//                   "flex items-center py-3 mb-1 text-sm font-medium transition-colors",
//                   sidebarCollapsed ? "justify-center mx-2" : "px-4",
//                   isActive(item.path)
//                     ? getMenuHighlightColors(item.label) + " font-semibold"
//                     : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
//                 )}
//               >
//                 <item.icon className={cn("flex-shrink-0", sidebarCollapsed ? "w-6 h-6" : "w-5 h-5 mr-3")} />
//                 {!sidebarCollapsed && <span>{item.label}</span>}
//               </Link>
//             ))}
//           </div>
//         </div>

//         {/* Settings Bottom Section with white background and shadow separation */}
//         <div className="absolute bottom-0 w-full border-t border-gray-200 bg-white py-3 px-4 shadow-inner">
//           <Link
//             to="/admin/settings"
//             className={cn(
//               "flex items-center text-gray-700 hover:text-gray-900 py-2",
//               sidebarCollapsed ? "justify-center" : ""
//             )}
//           >
//             <Settings className="w-5 h-5" />
//             {!sidebarCollapsed && <span className="ml-3 font-medium">Settings</span>}
//           </Link>
//         </div>
//       </aside>

//       {/* Main Content Area */}
//       <div className={cn(
//         "flex-1 transition-all duration-300",
//         sidebarCollapsed ? "ml-20" : "ml-64"
//       )}>
//         {/* Top Header Bar */}
//         <header className={cn(
//           "fixed top-0 right-0 z-20 transition-all duration-300 border-b border-gray-200 shadow-sm",
//           sidebarCollapsed ? "left-20" : "left-64",
//           scrolled ? "py-2" : "py-3",
//           currentBgColor
//         )}>
//           <div className="px-6 flex items-center justify-between">
//             {/* Global Search Bar - Updated to use new SearchBar component */}
//             <div className="w-2/5">
//               <SearchBar />
//             </div>

//             {/* Right Side Controls */}
//             <div className="flex items-center space-x-4">
//               {/* Notification Bell */}
//               <NotificationPanel />

//               {/* User Profile Dropdown */}
//               <div ref={settingsMenuRef} className="relative">
//                 <button
//                   onClick={() => setShowSettingsMenu(!showSettingsMenu)}
//                   className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100"
//                 >
//                   <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
//                     {userData?.profile?.avatar_url ? (
//                       <img
//                         src={userData.profile.avatar_url}
//                         alt="User avatar"
//                         className="w-full h-full object-cover"
//                       />
//                     ) : (
//                       <User className="w-5 h-5 text-blue-700" />
//                     )}
//                   </div>
//                   <span className="text-sm font-medium text-gray-700">
//                     {userData?.profile?.name || "Loading..."}
//                   </span>
//                 </button>

//                 <AnimatePresence>
//                   {showSettingsMenu && (
//                     <motion.div
//                       initial={{ opacity: 0, y: -10 }}
//                       animate={{ opacity: 1, y: 0 }}
//                       exit={{ opacity: 0, y: -10 }}
//                       className="absolute right-0 mt-2 w-48 max-w-xs bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
//                     >
//                       <Link to="/admin/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">
//                         <User className="w-4 h-4 mr-3 text-blue-500" />
//                         My Profile
//                       </Link>
//                       <Link to="/admin/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">
//                         <Settings className="w-4 h-4 mr-3 text-blue-500" />
//                         Settings
//                       </Link>
//                       <Link to="/" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">
//                         <Home className="w-4 h-4 mr-3 text-blue-500" />
//                         Home
//                       </Link>
//                       <button onClick={handleSignOut} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">
//                         <LogOut className="w-4 h-4 mr-3 text-blue-500" />
//                         Sign Out
//                       </button>
//                     </motion.div>
//                   )}
//                 </AnimatePresence>
//               </div>
//             </div>
//           </div>
//         </header>

//         {/* Main Content */}
//         <main className="pt-20 pb-8 px-6 w-full">
//           <Outlet />
//         </main>
//       </div>
//     </div>
//   );
// }




import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Image, LogOut, Users, Package, Quote, MessageSquare,
  LayoutDashboard, Settings, ShoppingBag, Building2, Truck, ClipboardList,
  BoxSelect as BoxSeam, UserCog, Home, UserPlus, UserCheck, Target,
  Search, MoreHorizontal, Zap, BarChart2, CheckSquare, ChevronLeft, ChevronRight,
  Bell, User, ChevronDown, Globe, Utensils, Calendar, BarChart3, PackageOpen, ArrowUpDown, Warehouse
} from 'lucide-react';
import { getCurrentUser, signOut } from '../../lib/auth';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { OrganizationSwitcher } from '../OrganizationSwitcher';
import { NotificationPanel } from './NotificationPanel';
import { SearchBar } from './search/SearchBar';
import { supabase } from '../../lib/supabase'; // Make sure this is imported

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userData, setUserData] = useState(null);
  const { selectedOrganization } = useOrganization();
  const [moduleFlags, setModuleFlags] = useState({});
  const [moduleLoading, setModuleLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});

  const settingsMenuRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  // Toggle a group's expanded state
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Check if a group should be expanded based on active path
  useEffect(() => {
    allMenuItems.forEach(item => {
      if (item.type === 'group' && item.children) {
        const shouldExpand = item.children.some(child => location.pathname.startsWith(child.path));
        if (shouldExpand) {
          setExpandedGroups(prev => ({
            ...prev,
            [item.id]: true
          }));
        }
      }
    });
  }, [location.pathname]);

  // Fetch module access flags when selected organization changes
  useEffect(() => {
    async function fetchModuleFlags() {
      if (!selectedOrganization?.id) {
        setModuleFlags({});
        setModuleLoading(false);
        return;
      }

      try {
        setModuleLoading(true);
        const { data, error } = await supabase
          .from('organizations')
          .select(`
            module_accounts,
            module_contacts,
            module_leads,
            module_cases,
            module_opportunities,
            module_quotes,
            module_orders,
            module_tasks,
            module_purchase_orders,
            module_work_orders,
            module_inventories,
            module_blog,
            module_portfolio,
            module_reports,
            module_sales_assistant,
            module_products,
            module_user_management,
            module_org_management,
            module_restaurant
          `)
          .eq('id', selectedOrganization.id)
          .single();

        if (error) {
          console.error('Error fetching module flags:', error);
          setModuleFlags({});
        } else if (data) {
          console.log('Fetched module flags:', data);
          setModuleFlags(data);
        }
      } catch (error) {
        console.error('Error in fetchModuleFlags:', error);
      } finally {
        setModuleLoading(false);
      }
    }

    fetchModuleFlags();
  }, [selectedOrganization?.id]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    checkAuth();

    const handleClickOutside = (event) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkAuth = async () => {
    const userData = await getCurrentUser();
    if (!userData?.user) {
      navigate('/login');
      return;
    }
    setUserData(userData);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path) => {
    // Special case for Dashboard which is at the root admin path
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    // For all other paths, use the startsWith check
    return location.pathname.startsWith(path);
  };

  // Define menu highlight colors
  const getMenuHighlightColors = (label) => {
    switch (label) {
      case 'Dashboard':
        return "bg-blue-50 text-blue-600 border-l-4 border-blue-500";
      case 'Accounts':
        return "bg-rose-50 text-rose-600 border-l-4 border-rose-500";
      case 'Contacts':
        return "bg-cyan-50 text-cyan-600 border-l-4 border-cyan-500";
      case 'Leads':
        return "bg-indigo-50 text-indigo-600 border-l-4 border-indigo-500";
      case 'Cases':
        return "bg-blue-50 text-blue-600 border-l-4 border-blue-500";
      case 'Opportunities':
        return "bg-purple-50 text-purple-600 border-l-4 border-purple-500";
      case 'Quotes':
        return "bg-teal-50 text-teal-600 border-l-4 border-teal-500";
      case 'Orders':
        return "bg-amber-50 text-amber-600 border-l-4 border-amber-500";
      case 'Tasks':
        return "bg-yellow-50 text-yellow-600 border-l-4 border-yellow-500";
      case 'Reports':
        return "bg-lime-50 text-lime-600 border-l-4 border-lime-500";
      case 'Products':
        return "bg-fuchsia-50 text-fuchsia-600 border-l-4 border-fuchsia-500";
      case 'Blog Posts':
        return "bg-gray-50 text-gray-600 border-l-4 border-gray-500";
      case 'Portfolio':
        return "bg-violet-50 text-violet-600 border-l-4 border-violet-500";
      case 'Web':
        return "bg-indigo-50 text-indigo-600 border-l-4 border-indigo-500";
      case 'Restaurant':
        return "bg-orange-50 text-orange-600 border-l-4 border-orange-500";
      case 'Restaurant Menu':
        return "bg-orange-50 text-orange-600 border-l-4 border-orange-500";
      case 'Menu Management':
        return "bg-orange-50 text-orange-600 border-l-4 border-orange-500";
      default:
        return "bg-primary-100 text-primary-700 border-l-4 border-primary-500";
    }
  };

  const getMenuBgColor = (label) => {
    const colorClass = getMenuHighlightColors(label).split(' ')[0]; // get bg-xxx-50
    return colorClass;
  };

  // Define all menu items with their module flags
  const allMenuItems = [
    // Dashboard is always shown
    {
      type: 'item',
      path: '/admin',
      icon: LayoutDashboard,
      label: 'Dashboard',
      alwaysShow: true
    },

    // Regular module items
    {
      type: 'item',
      path: '/admin/vendors',
      icon: Building2,
      label: 'Accounts',
      moduleFlag: 'module_accounts'
    },
    {
      type: 'item',
      path: '/admin/customers',
      icon: Users,
      label: 'Contacts',
      moduleFlag: 'module_contacts'
    },
    {
      type: 'item',
      path: '/admin/leads',
      icon: UserCheck,
      label: 'Leads',
      moduleFlag: 'module_leads'
    },
    {
      type: 'item',
      path: '/admin/cases',
      icon: MessageSquare,
      label: 'Cases',
      moduleFlag: 'module_cases'
    },
    {
      type: 'item',
      path: '/admin/opportunities',
      icon: Target,
      label: 'Opportunities',
      moduleFlag: 'module_opportunities'
    },
    {
      type: 'item',
      path: '/admin/quotes',
      icon: Quote,
      label: 'Quotes',
      moduleFlag: 'module_quotes'
    },
    {
      type: 'item',
      path: '/admin/orders',
      icon: ShoppingBag,
      label: 'Orders',
      moduleFlag: 'module_orders'
    },
    {
      type: 'item',
      path: '/admin/tasks',
      icon: CheckSquare,
      label: 'Tasks',
      moduleFlag: 'module_tasks'
    },
    {
      type: 'group',
      id: 'restaurant-group',
      icon: Utensils,
      label: 'Restaurant',
      children: [
        {
          type: 'item',
          path: '/admin/restaurant/ordering',
          icon: ShoppingBag,
          label: 'Online Ordering',
          moduleFlag: 'module_restaurant'
        },
        {
          type: 'item',
          path: '/admin/restaurant/bookings',
          icon: Calendar,
          label: 'Bookings',
          moduleFlag: 'module_restaurant'
        },
        {
          type: 'item',
          path: '/admin/restaurant/settings',
          icon: Settings,
          label: 'Settings',
          moduleFlag: 'module_restaurant'
        },
        {
          type: 'item',
          path: '/admin/restaurant/menu',
          icon: FileText,
          label: 'Menu Management',
          moduleFlag: 'module_restaurant'
        }
      ]
    },
    {
      type: 'item',
      path: '/admin/purchase-orders',
      icon: Truck,
      label: 'Purchase Orders',
      moduleFlag: 'module_purchase_orders'
    },
    {
      type: 'item',
      path: '/admin/work-orders',
      icon: ClipboardList,
      label: 'Work Orders',
      moduleFlag: 'module_work_orders'
    },
    // {
    //   type: 'item',
    //   path: '/admin/inventory',
    //   icon: BoxSeam,
    //   label: 'Inventory',
    //   moduleFlag: 'module_inventories'
    // },
    {
      type: 'group',
      id: 'inventory-group',
      icon: BoxSeam, // Keep this - good for inventory group
      label: 'Inventory',
      children: [
        {
          type: 'item',
          path: '/admin/inventory',
          icon: BarChart3, // Dashboard/overview icon
          label: 'Main',
          moduleFlag: 'module_inventories'
        },
        {
          type: 'item',
          path: '/admin/inventory/products',
          icon: Package, // Perfect for stock/products
          label: 'Stock',
          moduleFlag: 'module_inventories'
        },
        {
          type: 'item',
          path: '/admin/inventory/receive',
          icon: PackageOpen, // Represents receiving/unpacking goods
          label: 'Receiving',
          moduleFlag: 'module_inventories'
        },
        {
          type: 'item',
          path: '/admin/inventory/transactions',
          icon: ArrowUpDown, // Shows movement/transactions
          label: 'Transaction',
          moduleFlag: 'module_inventories'
        },
        {
          type: 'item',
          path: '/admin/inventory/locations',
          icon: Warehouse, // Perfect for storage locations
          label: 'Location',
          moduleFlag: 'module_inventories'
        }
      ]
    },
    {
      type: 'item',
      path: '/admin/reports',
      icon: BarChart2,
      label: 'Reports',
      moduleFlag: 'module_reports'
    },
    {
      type: 'item',
      path: '/admin/sales-assistant',
      icon: Zap,
      label: 'Sales Assistant',
      moduleFlag: 'module_sales_assistant'
    },
    {
      type: 'item',
      path: '/admin/products',
      icon: Package,
      label: 'Products',
      moduleFlag: 'module_products'
    },

    // Special case for Custom Flows which doesn't seem to have a module flag
    {
      type: 'item',
      path: '/admin/customflow',
      icon: Package,
      label: 'Custom Flows',
      alwaysShow: true
    },

    // User management items
    {
      type: 'item',
      path: '/admin/users',
      icon: UserPlus,
      label: 'User Management',
      moduleFlag: 'module_user_management'
    },
    {
      type: 'item',
      path: '/admin/user-organizations',
      icon: UserCog,
      label: 'User & Org Management',
      moduleFlag: 'module_org_management'
    },
    {
      type: 'item',
      path: '/admin/org-setting',
      icon: UserCog,
      label: 'Org Management',
      moduleFlag: 'module_org_management'
    },
    

    // Web group (Blog Posts and Portfolio) - placed at the end
    {
      type: 'group',
      id: 'web-group',
      icon: Globe,
      label: 'Web',
      children: [
        {
          type: 'item',
          path: '/admin/posts',
          icon: FileText,
          label: 'Blog Posts',
          moduleFlag: 'module_blog'
        },
        {
          type: 'item',
          path: '/admin/portfolio',
          icon: Image,
          label: 'Portfolio',
          moduleFlag: 'module_portfolio'
        }
      ]
    }
  ];

  // Filter menu items based on module access
  const getFilteredMenuItems = () => {
    return allMenuItems.filter(item => {
      // Handle regular menu items
      if (item.type === 'item') {
        if (item.alwaysShow) return true;
        if (item.moduleFlag && moduleFlags && moduleFlags[item.moduleFlag]) {
          return true;
        }
        return false;
      }

      // Handle group items - show if at least one child has module access
      if (item.type === 'group' && item.children) {
        const hasVisibleChildren = item.children.some(child =>
          child.alwaysShow || (child.moduleFlag && moduleFlags && moduleFlags[child.moduleFlag])
        );
        return hasVisibleChildren;
      }

      return false;
    });
  };

  const filteredMenuItems = getFilteredMenuItems();

  // Find the active menu item (including in groups)
  const findActiveMenuItem = () => {
    // Check top-level items first
    const topLevelItem = filteredMenuItems.find(item =>
      item.type === 'item' && isActive(item.path)
    );

    if (topLevelItem) return topLevelItem;

    // Check group items
    for (const group of filteredMenuItems) {
      if (group.type === 'group' && group.children) {
        const childItem = group.children.find(child => isActive(child.path));
        if (childItem) return childItem;
      }
    }

    return null;
  };

  const activeMenuItem = findActiveMenuItem();
  const currentBgColor = activeMenuItem ? getMenuBgColor(activeMenuItem.label) : "bg-white";

  // Render a regular menu item
  const renderMenuItem = (item) => (
    <Link
      key={item.path}
      to={item.path}
      className={cn(
        "flex items-center py-3 mb-1 text-sm font-medium transition-colors",
        sidebarCollapsed ? "justify-center mx-2" : "px-4",
        isActive(item.path)
          ? getMenuHighlightColors(item.label) + " font-semibold"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      <item.icon className={cn("flex-shrink-0", sidebarCollapsed ? "w-6 h-6" : "w-5 h-5 mr-3")} />
      {!sidebarCollapsed && <span>{item.label}</span>}
    </Link>
  );

  // Render a group item and its children
  const renderGroupItem = (group) => {
    const isExpanded = expandedGroups[group.id];
    const hasActiveChild = group.children && group.children.some(child => isActive(child.path));

    // Filter children based on module access
    const filteredChildren = group.children.filter(child =>
      child.alwaysShow || (child.moduleFlag && moduleFlags && moduleFlags[child.moduleFlag])
    );

    return (
      <div key={group.id} className="mb-1">
        {/* Group header */}
        <button
          onClick={() => toggleGroup(group.id)}
          className={cn(
            "w-full flex items-center py-3 text-sm font-medium transition-colors",
            sidebarCollapsed ? "justify-center mx-2" : "px-4",
            hasActiveChild
              ? getMenuHighlightColors(group.label) + " font-semibold"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          )}
        >
          <group.icon className={cn("flex-shrink-0", sidebarCollapsed ? "w-6 h-6" : "w-5 h-5 mr-3")} />
          {!sidebarCollapsed && (
            <>
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isExpanded ? "transform rotate-180" : ""
                )}
              />
            </>
          )}
        </button>

        {/* Group children */}
        {!sidebarCollapsed && isExpanded && (
          <div className="pl-6">
            {filteredChildren.map(child => (
              <Link
                key={child.path}
                to={child.path}
                className={cn(
                  "flex items-center py-2 px-4 mb-1 text-sm font-medium transition-colors",
                  isActive(child.path)
                    ? getMenuHighlightColors(child.label) + " font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <child.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                <span>{child.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading || moduleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <aside
        className={cn(
          "fixed h-screen bg-white shadow-md transition-all duration-300 z-30",
          "rounded-tr-3xl rounded-br-3xl", // Curved edges
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Organization Info Panel */}
        <div className="p-4 border-b border-gray-200 mb-2">
          {sidebarCollapsed ? (
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                {selectedOrganization?.name?.charAt(0) || 'O'}
              </div>
            </div>
          ) : (
            <OrganizationSwitcher />
          )}
        </div>

        {/* Sidebar Collapse Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 bg-white rounded-full p-1 shadow-md border border-gray-200"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {/* Navigation Menu Items */}
        <div className={cn(
          "py-2 flex flex-col h-[calc(100%-10rem)]", // Increase the subtracted height to leave more room for Settings
          sidebarCollapsed ? "items-center" : ""
        )}>
          <div className="flex-grow overflow-y-auto hide-scrollbar pr-1">
            {filteredMenuItems.map(item =>
              item.type === 'group'
                ? renderGroupItem(item)
                : renderMenuItem(item)
            )}
          </div>
        </div>

        {/* Settings Bottom Section with white background and shadow separation */}
        <div className="absolute bottom-0 w-full border-t border-gray-200 bg-white py-3 px-4 shadow-inner">
          <Link
            to="/admin/settings"
            className={cn(
              "flex items-center text-gray-700 hover:text-gray-900 py-2",
              sidebarCollapsed ? "justify-center" : ""
            )}
          >
            <Settings className="w-5 h-5" />
            {!sidebarCollapsed && <span className="ml-3 font-medium">Settings</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 transition-all duration-300",
        sidebarCollapsed ? "ml-20" : "ml-64"
      )}>
        {/* Top Header Bar */}
        <header className={cn(
          "fixed top-0 right-0 z-20 transition-all duration-300 border-b border-gray-200 shadow-sm",
          sidebarCollapsed ? "left-20" : "left-64",
          scrolled ? "py-2" : "py-3",
          currentBgColor
        )}>
          <div className="px-6 flex items-center justify-between">
            {/* Global Search Bar - Updated to use new SearchBar component */}
            <div className="w-2/5">
              <SearchBar />
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <NotificationPanel />

              {/* User Profile Dropdown */}
              <div ref={settingsMenuRef} className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                    {userData?.profile?.avatar_url ? (
                      <img
                        src={userData.profile.avatar_url}
                        alt="User avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-blue-700" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {userData?.profile?.name || "Loading..."}
                  </span>
                </button>

                <AnimatePresence>
                  {showSettingsMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 max-w-xs bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                    >
                      <Link to="/admin/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">
                        <User className="w-4 h-4 mr-3 text-blue-500" />
                        My Profile
                      </Link>
                      <Link to="/admin/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">
                        <Settings className="w-4 h-4 mr-3 text-blue-500" />
                        Settings
                      </Link>
                      <Link to="/" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">
                        <Home className="w-4 h-4 mr-3 text-blue-500" />
                        Home
                      </Link>
                      <button onClick={handleSignOut} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">
                        <LogOut className="w-4 h-4 mr-3 text-blue-500" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-20 pb-8 px-6 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}