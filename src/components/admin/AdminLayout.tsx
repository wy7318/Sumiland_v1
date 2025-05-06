import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Image, LogOut, Users, Package, Quote, MessageSquare,
  LayoutDashboard, Settings, ShoppingBag, Building2, Truck, ClipboardList,
  BoxSelect as BoxSeam, UserCog, Home, UserPlus, UserCheck, Target,
  Search, MoreHorizontal, Zap, BarChart2, CheckSquare, ChevronLeft, ChevronRight,
  Bell, User
} from 'lucide-react';
import { getCurrentUser, signOut } from '../../lib/auth';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { OrganizationSwitcher } from '../OrganizationSwitcher';
import { NotificationPanel } from './NotificationPanel';
import { SearchBar } from './search/SearchBar';

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userData, setUserData] = useState(null);
  const { organizations } = useAuth();

  const settingsMenuRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

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
    setIsSuperAdmin(!!userData.profile?.is_super_admin);
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

  // Add this function before your return statement
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
      // Add more cases for other menu items
      default:
        return "bg-primary-100 text-primary-700 border-l-4 border-primary-500";
    }
  };

  const getMenuBgColor = (label) => {
    const colorClass = getMenuHighlightColors(label).split(' ')[0]; // get bg-xxx-50
    return colorClass;
  };

  const hasAdminAccess = organizations.some(org => org.role === 'admin' || org.role === 'owner');

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/vendors', icon: Building2, label: 'Accounts' },
    { path: '/admin/customers', icon: Users, label: 'Contacts' },
    { path: '/admin/leads', icon: UserCheck, label: 'Leads' },
    { path: '/admin/cases', icon: MessageSquare, label: 'Cases' },
    { path: '/admin/opportunities', icon: Target, label: 'Opportunities' },
    { path: '/admin/quotes', icon: Quote, label: 'Quotes' },
    { path: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/admin/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/admin/purchase-orders', icon: Truck, label: 'Purchase Orders' },
    { path: '/admin/work-orders', icon: ClipboardList, label: 'Work Orders' },
    { path: '/admin/inventory', icon: BoxSeam, label: 'Inventory' },
    { path: '/admin/posts', icon: FileText, label: 'Blog Posts' },
    { path: '/admin/portfolio', icon: Image, label: 'Portfolio' },
    { path: '/admin/reports', icon: BarChart2, label: 'Reports' },
    { path: '/admin/sales-assistant', icon: Zap, label: 'Sales Assistant' },
    
    ...(hasAdminAccess ? [
      { path: '/admin/products', icon: Package, label: 'Products' },
      { path: '/admin/customflow', icon: Package, label: 'Custom Flows' },
      { path: '/admin/users', icon: UserPlus, label: 'User Management' }
    ] : []),
    ...(isSuperAdmin ? [
      { path: '/admin/user-organizations', icon: UserCog, label: 'User & Org Management' }
      
    ] : [])
  ];

  const currentMenuItem = menuItems.find(item => isActive(item.path));
  const currentBgColor = currentMenuItem ? getMenuBgColor(currentMenuItem.label) : "bg-white";

  if (loading) {
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
                {organizations[0]?.name?.charAt(0) || 'O'}
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
            {menuItems.map((item) => (
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
            ))}
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