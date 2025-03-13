import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Image, LogOut, Users, Package, Tag, Quote, MessageSquare, 
  LayoutDashboard, Settings, ShoppingBag, Building2, Truck, ClipboardList, 
  BoxSelect as BoxSeam, UserCog, Home, UserPlus, UserCheck, Target,
  Search, MoreHorizontal, ChevronRight
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
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const { organizations } = useAuth();
  
  const searchRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();

    // Click outside handlers
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
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
    { path: '/admin/vendors', icon: Building2, label: 'Accounts' },
    { path: '/admin/customers', icon: Users, label: 'Customers' },
    { path: '/admin/leads', icon: UserCheck, label: 'Leads' },
    { path: '/admin/opportunities', icon: Target, label: 'Opportunities' },
    { path: '/admin/cases', icon: MessageSquare, label: 'Cases' },
    { path: '/admin/quotes', icon: Quote, label: 'Quotes' },
    { path: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/admin/purchase-orders', icon: Truck, label: 'Purchase Orders' },
    { path: '/admin/work-orders', icon: ClipboardList, label: 'Work Orders' },
    { path: '/admin/inventory', icon: BoxSeam, label: 'Inventory' },
    { path: '/admin/posts', icon: FileText, label: 'Blog Posts' },
    { path: '/admin/portfolio', icon: Image, label: 'Portfolio' },
    // Show Products menu for admin/owner roles
    ...(hasAdminAccess ? [
      { path: '/admin/products', icon: Package, label: 'Products' }
    ] : []),
    // Show additional menus for super admin
    ...(isSuperAdmin ? [
      { path: '/admin/user-organizations', icon: UserCog, label: 'User & Org Management' },
      { path: '/admin/users', icon: UserPlus, label: 'User Management' }
    ] : [])
  ];

  const visibleMenuItems = menuItems.slice(0, 7); // Show first 7 items
  const moreMenuItems = menuItems.slice(7); // Remaining items go to More menu

  const filteredMenuItems = menuItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Floating Top Navigation */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
        <div className="bg-white rounded-full shadow-lg p-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Go Button & Search */}
            <div ref={searchRef} className="relative">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full flex items-center"
              >
                <Search className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">Go</span>
              </button>

              <AnimatePresence>
                {showSearch && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full mt-2 left-0 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search modules..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        autoFocus
                      />
                    </div>
                    {searchQuery && (
                      <ul className="mt-2 max-h-64 overflow-auto">
                        {filteredMenuItems.map((item) => (
                          <li key={item.path}>
                            <Link
                              to={item.path}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                              onClick={() => setShowSearch(false)}
                            >
                              <item.icon className="w-5 h-5 mr-3 text-gray-400" />
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Main Navigation */}
            {visibleMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "p-3 text-sm font-medium rounded-full transition-colors flex items-center",
                  isActive(item.path)
                    ? "bg-primary-100 text-primary-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="w-5 h-5 mr-2" />
                {item.label}
              </Link>
            ))}

            {/* More Menu */}
            {moreMenuItems.length > 0 && (
              <div ref={moreMenuRef} className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={cn(
                    "p-3 text-sm font-medium rounded-full transition-colors flex items-center",
                    showMoreMenu
                      ? "bg-primary-100 text-primary-900"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <MoreHorizontal className="w-5 h-5 mr-2" />
                  More
                </button>

                <AnimatePresence>
                  {showMoreMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                    >
                      {moreMenuItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100",
                            isActive(item.path) && "bg-gray-50"
                          )}
                          onClick={() => setShowMoreMenu(false)}
                        >
                          <item.icon className="w-5 h-5 mr-3 text-gray-400" />
                          {item.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Organization Switcher */}
            <OrganizationSwitcher />

            {/* Settings Menu */}
            <div ref={settingsMenuRef} className="relative">
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className={cn(
                  "p-3 text-sm font-medium rounded-full transition-colors flex items-center",
                  showSettingsMenu
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Settings className="w-5 h-5 mr-2" />
                Menu
              </button>

              <AnimatePresence>
                {showSettingsMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                  >
                    <Link
                      to="/admin/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowSettingsMenu(false)}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </Link>
                    <Link
                      to="/"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowSettingsMenu(false)}
                    >
                      <Home className="w-4 h-4 mr-3" />
                      Home
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-24 pb-8 px-4 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}