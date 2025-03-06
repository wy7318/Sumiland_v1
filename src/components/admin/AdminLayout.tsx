import { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FileText, Image, LogOut, Users, Package, Tag, Quote, MessageSquare, 
  LayoutDashboard, ChevronLeft, ChevronRight, Settings, ShoppingBag, 
  Building2, Truck, ClipboardList, BoxSelect as BoxSeam, UserCog, Home,
  UserPlus, UserCheck, Target
} from 'lucide-react';
import { getCurrentUser, signOut } from '../../lib/auth';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { OrganizationSwitcher } from '../OrganizationSwitcher';

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const { organizations } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const userData = await getCurrentUser();
    if (!userData?.user) {
      navigate('/login');
      return;
    }

    setIsSuperAdmin(!!userData.profile?.is_super_admin);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  // Check if user has admin or owner role in any organization
  const hasAdminAccess = organizations.some(org => 
    org.role === 'admin' || org.role === 'owner'
  );

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/posts', icon: FileText, label: 'Blog Posts' },
    { path: '/admin/portfolio', icon: Image, label: 'Portfolio' },
    { path: '/admin/cases', icon: MessageSquare, label: 'Cases' },
    { path: '/admin/leads', icon: UserCheck, label: 'Leads' },
    { path: '/admin/opportunities', icon: Target, label: 'Opportunities' },
    { path: '/admin/quotes', icon: Quote, label: 'Quotes' },
    { path: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/admin/purchase-orders', icon: Truck, label: 'Purchase Orders' },
    { path: '/admin/work-orders', icon: ClipboardList, label: 'Work Orders' },
    { path: '/admin/inventory', icon: BoxSeam, label: 'Inventory' },
    // Show Products, Customers, Categories and Accounts menus for admin/owner roles
    ...(hasAdminAccess ? [
      { path: '/admin/products', icon: Package, label: 'Products' },
      { path: '/admin/customers', icon: Users, label: 'Customers' },
      { path: '/admin/categories', icon: Tag, label: 'Categories' },
      { path: '/admin/vendors', icon: Building2, label: 'Accounts' }
    ] : []),
    // Show additional menus for super admin
    ...(isSuperAdmin ? [
      { path: '/admin/user-organizations', icon: UserCog, label: 'User & Org Management' },
      { path: '/admin/users', icon: UserPlus, label: 'User Management' }
    ] : [])
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: isExpanded ? 240 : 80 }}
        className={cn(
          "fixed left-0 top-0 h-full bg-primary-600 text-white z-50",
          "flex flex-col transition-all duration-300"
        )}
      >
        {/* Logo and Organization Switcher */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-primary-500">
          {isExpanded ? (
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <span className="text-xl font-bold truncate">Admin Panel</span>
              <OrganizationSwitcher />
            </div>
          ) : (
            <span className="text-xl font-bold mx-auto">AP</span>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-primary-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
          >
            {isExpanded ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Menu Items - Scrollable Area */}
        <div className="flex-1 flex flex-col h-[calc(100vh-8rem)] overflow-hidden">
          <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-700 scrollbar-track-transparent py-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-4 py-3 transition-colors",
                  isActive(item.path)
                    ? "bg-primary-700 text-white"
                    : "text-primary-100 hover:bg-primary-700 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {isExpanded && (
                  <span className="ml-3 transition-opacity duration-200">
                    {item.label}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Settings, Home and Sign Out - Fixed Bottom */}
        <div className="border-t border-primary-500 mt-auto">
          <Link
            to="/admin/settings"
            className={cn(
              "flex items-center px-4 py-3 text-primary-100",
              "hover:bg-primary-700 hover:text-white transition-colors",
              isActive('/admin/settings') && "bg-primary-700 text-white"
            )}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            {isExpanded && (
              <span className="ml-3 transition-opacity duration-200">
                Settings
              </span>
            )}
          </Link>
          <Link
            to="/"
            className={cn(
              "flex items-center px-4 py-3 text-primary-100",
              "hover:bg-primary-700 hover:text-white transition-colors"
            )}
          >
            <Home className="w-4 h-4 flex-shrink-0" />
            {isExpanded && (
              <span className="ml-3 transition-opacity duration-200">
                Home
              </span>
            )}
          </Link>
          <button
            onClick={handleSignOut}
            className={cn(
              "flex items-center w-full px-4 py-3 text-primary-100",
              "hover:bg-primary-700 hover:text-white transition-colors"
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {isExpanded && (
              <span className="ml-3 transition-opacity duration-200">
                Sign Out
              </span>
            )}
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 transition-all duration-300",
          isExpanded ? "ml-60" : "ml-20"
        )}
      >
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}