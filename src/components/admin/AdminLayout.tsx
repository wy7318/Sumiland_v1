import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Image, LogOut, Users, Package, Quote, MessageSquare,
  LayoutDashboard, Settings, ShoppingBag, Building2, Truck, ClipboardList,
  BoxSelect as BoxSeam, UserCog, Home, UserPlus, UserCheck, Target,
  Search, MoreHorizontal, BarChart2, CheckSquare
} from 'lucide-react';
import { getCurrentUser, signOut } from '../../lib/auth';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { OrganizationSwitcher } from '../OrganizationSwitcher';
import { NotificationPanel } from './NotificationPanel';

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

  const searchButtonRef = useRef<HTMLDivElement>(null); // For positioning
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [scrolled, setScrolled] = useState(false);
  const [searchPosition, setSearchPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    checkAuth();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchButtonRef.current &&
        !searchButtonRef.current.contains(event.target as Node)
      ) {
        setShowSearch(false);
      }

      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node))
        setShowMoreMenu(false);

      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node))
        setShowSettingsMenu(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showSearch && searchButtonRef.current) {
      const rect = searchButtonRef.current.getBoundingClientRect();
      setSearchPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, [showSearch]);

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

  const isActive = (path: string) => location.pathname.startsWith(path);

  const hasAdminAccess = organizations.some(org => org.role === 'admin' || org.role === 'owner');

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/ReportFolderList', icon: BarChart2, label: 'Reports' },
    { path: '/admin/vendors', icon: Building2, label: 'Accounts' },
    { path: '/admin/customers', icon: Users, label: 'Customers' },
    { path: '/admin/leads', icon: UserCheck, label: 'Leads' },
    { path: '/admin/opportunities', icon: Target, label: 'Opportunities' },
    { path: '/admin/cases', icon: MessageSquare, label: 'Cases' },
    { path: '/admin/quotes', icon: Quote, label: 'Quotes' },
    { path: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/admin/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/admin/purchase-orders', icon: Truck, label: 'Purchase Orders' },
    { path: '/admin/work-orders', icon: ClipboardList, label: 'Work Orders' },
    { path: '/admin/inventory', icon: BoxSeam, label: 'Inventory' },
    { path: '/admin/posts', icon: FileText, label: 'Blog Posts' },
    { path: '/admin/portfolio', icon: Image, label: 'Portfolio' },
    ...(hasAdminAccess ? [
      { path: '/admin/products', icon: Package, label: 'Products' },
      { path: '/admin/customflows', icon: Package, label: 'Custom Flows' }
    ] : []),
    ...(isSuperAdmin ? [
      { path: '/admin/user-organizations', icon: UserCog, label: 'User & Org Management' },
      { path: '/admin/users', icon: UserPlus, label: 'User Management' }
    ] : [])
  ];

  const getVisibleMenuCount = () => {
    if (screenWidth > 1400) return 12;
    if (screenWidth > 1024) return 7;
    if (screenWidth > 768) return 5;
    return 3;
  };

  const visibleCount = getVisibleMenuCount();
  const visibleMenuItems = menuItems.slice(0, visibleCount);
  const moreMenuItems = menuItems.slice(visibleCount);
  const filteredMenuItems = menuItems.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={cn(
        "fixed top-0 left-0 w-full z-50 transition-colors duration-300",
        scrolled ? "bg-white shadow border-b border-gray-200" : ""
      )}>
        <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 py-2">

          {/* LEFT: Organization Switcher */}
          <div className="flex-shrink-0">
            <OrganizationSwitcher />
          </div>

          {/* CENTER: Module Nav (Blue Box) */}
          <div className="relative flex-grow min-w-[250px] max-w-full">
            <div className="bg-blue-50 border border-blue-200 rounded-xl shadow px-2 py-2 flex items-center overflow-x-auto space-x-2 scrollbar-hide">
              {/* Go Button */}
              <div ref={searchButtonRef} className="relative flex-shrink-0">
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full flex items-center whitespace-nowrap"
                >
                  <Search className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Go</span>
                </button>
              </div>

              {/* Visible Module Buttons */}
              {visibleMenuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "p-2 text-sm font-medium rounded-full transition-colors flex items-center whitespace-nowrap",
                    isActive(item.path)
                      ? "bg-primary-100 text-primary-900"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon className="w-5 h-5 mr-1" />
                  {item.label}
                </Link>
              ))}

              {/* More Button */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={cn(
                    "p-2 text-sm font-medium rounded-full transition-colors flex items-center",
                    showMoreMenu ? "bg-primary-100 text-primary-900" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <MoreHorizontal className="w-5 h-5 mr-1" />
                  More
                </button>
              </div>
            </div>

            {/* More Menu */}
            {showMoreMenu && (
              <motion.div
                ref={moreMenuRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
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
          </div>

          {/* RIGHT SIDE */}
          <div className="flex-shrink-0 flex items-center space-x-2">
            <NotificationPanel />
            <div ref={settingsMenuRef} className="relative">
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className={cn(
                  "p-2 text-sm font-medium rounded-full transition-colors flex items-center",
                  showSettingsMenu
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Settings className="w-5 h-5 mr-1" />
                Menu
              </button>
              <AnimatePresence>
                {showSettingsMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 max-w-xs bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                  >
                    <Link to="/admin/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </Link>
                    <Link to="/" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <Home className="w-4 h-4 mr-3" />
                      Home
                    </Link>
                    <button onClick={handleSignOut} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
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

      {/* Search Dropdown FLOATING OUTSIDE */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute',
              top: searchPosition.top,
              left: searchPosition.left,
              zIndex: 9999
            }}
            className="w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-3 space-y-2"
          >
            <input
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
            <div className="max-h-60 overflow-y-auto">
              {filteredMenuItems.length ? (
                filteredMenuItems.map(item => (
                  <button
                    key={item.path}
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearch(false);
                      navigate(item.path);
                    }}
                    className="w-full text-left flex items-center px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    <item.icon className="w-4 h-4 mr-2 text-gray-400" />
                    {item.label}
                  </button>
                ))
              ) : (
                <p className="text-sm text-gray-400 px-2">No matching modules</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-28 pb-8 px-6 w-full">
        <Outlet />
      </main>
    </div>
  );
}