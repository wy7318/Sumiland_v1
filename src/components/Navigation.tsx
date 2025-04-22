// import { useState, useEffect, useRef, useCallback } from 'react';
// import { Link, useLocation, useNavigate } from 'react-router-dom';
// import { motion, AnimatePresence } from 'framer-motion';
// import { Menu, X, LogIn, UserPlus, LogOut, LayoutDashboard, User } from 'lucide-react';
// import { cn } from '../lib/utils';
// import { useAuth } from '../contexts/AuthContext';
// import { signOut } from '../lib/auth';

// export function Navigation() {
//   const [isScrolled, setIsScrolled] = useState(false);
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//   const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
//   const [isSigningOut, setIsSigningOut] = useState(false);
//   const profileMenuRef = useRef<HTMLDivElement>(null);
//   const profileButtonRef = useRef<HTMLButtonElement>(null);

//   const { user, loading } = useAuth();
//   const location = useLocation();
//   const navigate = useNavigate();

//   // Track if we've already logged the user state to reduce console spam
//   const userRef = useRef<User | null | undefined>(undefined);
//   const loadingRef = useRef<boolean | undefined>(undefined);
//   const logMountRef = useRef(false);

//   // Log component mounting only once
//   useEffect(() => {
//     if (!logMountRef.current) {
//       console.log('[Navigation] Component mounted');
//       logMountRef.current = true;
//     }
//     return () => {
//       console.log('[Navigation] Component unmounted');
//     };
//   }, []);

//   // Track user changes with minimal logging
//   useEffect(() => {
//     if (userRef.current !== user) {
//       console.log('[Navigation] user changed:', user ? 'authenticated' : 'null');
//       userRef.current = user;
//     }
//   }, [user]);

//   // Track loading state changes with minimal logging
//   useEffect(() => {
//     if (loadingRef.current !== loading) {
//       console.log('[Navigation] loading changed:', loading);
//       loadingRef.current = loading;
//     }
//   }, [loading]);

//   // Handle scroll events
//   useEffect(() => {
//     const handleScroll = () => {
//       setIsScrolled(window.scrollY > 50);
//     };

//     window.addEventListener('scroll', handleScroll);
//     return () => window.removeEventListener('scroll', handleScroll);
//   }, []);

//   // Handle clicks outside of profile menu
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (
//         profileMenuRef.current &&
//         profileButtonRef.current &&
//         !profileMenuRef.current.contains(event.target as Node) &&
//         !profileButtonRef.current.contains(event.target as Node)
//       ) {
//         setIsProfileMenuOpen(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   // Close profile menu on route change
//   useEffect(() => {
//     setIsProfileMenuOpen(false);
//   }, [location.pathname]);

//   // Handle sign out with error prevention
//   const handleSignOut = useCallback(async () => {
//     try {
//       // Prevent multiple sign-out attempts
//       if (isSigningOut) return;

//       // Update UI state first
//       setIsSigningOut(true);
//       setIsProfileMenuOpen(false);

//       // Handle sign out
//       await signOut();

//       // Navigate home
//       navigate('/', { replace: true });
//     } catch (error) {
//       console.error('[Navigation] Error signing out:', error);
//     }
//   }, [navigate, isSigningOut]);

//   // Scroll to section function
//   const scrollToSection = useCallback((sectionId: string) => {
//     const element = document.getElementById(sectionId);
//     if (element) {
//       const offset = 80;
//       const elementPosition = element.getBoundingClientRect().top;
//       const offsetPosition = elementPosition + window.pageYOffset - offset;

//       window.scrollTo({
//         top: offsetPosition,
//         behavior: 'smooth'
//       });
//     }
//     setIsMobileMenuOpen(false);
//   }, []);

//   // Skip rendering on admin pages
//   if (location.pathname.startsWith('/admin')) {
//     return null;
//   }

//   // Check if signed out
//   const isSignedOut = localStorage.getItem('is_signed_out') === 'true';

//   // Determine if user is authenticated (must be both: has user AND not signed out)
//   const isAuthenticated = !!user && !isSignedOut;

//   const navItems = [
//     { href: '/', label: 'Home', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
//     { href: '/#features', label: 'Features', action: () => scrollToSection('features') },
//     { href: '/#pricing', label: 'Pricing', action: () => scrollToSection('pricing') },
//     { href: '/blog', label: 'Blog' },
//     { href: '/#contact', label: 'Contact', action: () => scrollToSection('contact') },
//   ];

//   const handleNavClick = (item: typeof navItems[0], e: React.MouseEvent) => {
//     e.preventDefault();
//     if (location.pathname !== '/' && item.href.startsWith('/#')) {
//       navigate('/', { state: { scrollTo: item.href.substring(2) } });
//     } else if (item.action) {
//       item.action();
//     } else {
//       navigate(item.href);
//     }
//   };

//   return (
//     <motion.header
//       className={cn(
//         'fixed top-0 left-0 right-0 transition-all duration-300 z-40',
//         isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm' : 'bg-transparent'
//       )}
//       initial={{ y: -100 }}
//       animate={{ y: 0 }}
//       transition={{ duration: 0.5 }}
//     >
//       <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex justify-between items-center h-16">
//           <Link to="/" className="text-2xl font-bold text-primary-600">
//             SimpliDone
//           </Link>

//           {/* Desktop Navigation */}
//           <div className="hidden md:flex items-center space-x-8">
//             {navItems.map((item) => (
//               <a
//                 key={item.href}
//                 href={item.href}
//                 onClick={(e) => handleNavClick(item, e)}
//                 className={cn(
//                   'text-gray-600 hover:text-primary-500 transition-colors',
//                   location.pathname === item.href && 'text-primary-500'
//                 )}
//               >
//                 {item.label}
//               </a>
//             ))}

//             {/* Auth Buttons */}
//             <div className="relative">
//               {loading ? (
//                 <div className="w-8 h-8 animate-pulse bg-gray-200 rounded-full" />
//               ) : isAuthenticated ? (
//                 <button
//                   ref={profileButtonRef}
//                   onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
//                   className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center hover:bg-primary-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
//                   disabled={isSigningOut}
//                 >
//                   <User className="w-5 h-5 text-primary-600" />
//                 </button>
//               ) : (
//                 <div className="flex items-center space-x-4">
//                   <button
//                     onClick={() => navigate('/signup')}
//                     className="px-4 py-2 text-primary-600 hover:text-primary-700"
//                   >
//                     Sign Up
//                   </button>
//                   <button
//                     onClick={() => navigate('/login')}
//                     className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
//                   >
//                     Sign In
//                   </button>
//                 </div>
//               )}

//               <AnimatePresence>
//                 {isProfileMenuOpen && isAuthenticated && (
//                   <motion.div
//                     ref={profileMenuRef}
//                     initial={{ opacity: 0, y: -10 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     exit={{ opacity: 0, y: -10 }}
//                     className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50"
//                   >
//                     <Link
//                       to="/admin"
//                       className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
//                       onClick={() => setIsProfileMenuOpen(false)}
//                     >
//                       <LayoutDashboard className="w-4 h-4 inline-block mr-2" />
//                       Dashboard
//                     </Link>
//                     <button
//                       onClick={handleSignOut}
//                       className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
//                       disabled={isSigningOut}
//                     >
//                       <LogOut className="w-4 h-4 inline-block mr-2" />
//                       {isSigningOut ? 'Signing Out...' : 'Sign Out'}
//                     </button>
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>
//           </div>

//           {/* Mobile Menu Button */}
//           <button
//             className="md:hidden p-2"
//             onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
//             aria-label="Toggle menu"
//           >
//             {isMobileMenuOpen ? (
//               <X className="w-6 h-6 text-gray-600" />
//             ) : (
//               <Menu className="w-6 h-6 text-gray-600" />
//             )}
//           </button>
//         </div>

//         {/* Mobile Navigation */}
//         <AnimatePresence>
//           {isMobileMenuOpen && (
//             <motion.div
//               initial={{ opacity: 0, height: 0 }}
//               animate={{ opacity: 1, height: 'auto' }}
//               exit={{ opacity: 0, height: 0 }}
//               className="md:hidden py-4"
//             >
//               <div className="flex flex-col space-y-4">
//                 {navItems.map((item) => (
//                   <a
//                     key={item.href}
//                     href={item.href}
//                     onClick={(e) => handleNavClick(item, e)}
//                     className={cn(
//                       'text-gray-600 hover:text-primary-500 transition-colors px-4 py-2',
//                       location.pathname === item.href && 'text-primary-500 bg-primary-50'
//                     )}
//                   >
//                     {item.label}
//                   </a>
//                 ))}

//                 {/* Mobile Auth Buttons */}
//                 {loading ? (
//                   <div className="w-full h-12 animate-pulse bg-gray-200 rounded-md" />
//                 ) : isAuthenticated ? (
//                   <>
//                     <Link
//                       to="/admin"
//                       className="flex items-center px-4 py-2 text-gray-600 hover:text-primary-500"
//                       onClick={() => setIsMobileMenuOpen(false)}
//                     >
//                       <LayoutDashboard className="w-4 h-4 mr-2" />
//                       Dashboard
//                     </Link>
//                     <button
//                       onClick={handleSignOut}
//                       className="flex items-center px-4 py-2 text-gray-600 hover:text-primary-500"
//                       disabled={isSigningOut}
//                     >
//                       <LogOut className="w-4 h-4 mr-2" />
//                       {isSigningOut ? 'Signing Out...' : 'Sign Out'}
//                     </button>
//                   </>
//                 ) : (
//                   <>
//                     <Link
//                       to="/signup"
//                       className="flex items-center px-4 py-2 text-gray-600 hover:text-primary-500"
//                     >
//                       <UserPlus className="w-4 h-4 mr-2" />
//                       Sign Up
//                     </Link>
//                     <Link
//                       to="/login"
//                       className="flex items-center px-4 py-2 text-gray-600 hover:text-primary-500"
//                     >
//                       <LogIn className="w-4 h-4 mr-2" />
//                       Sign In
//                     </Link>
//                   </>
//                 )}
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </nav>
//     </motion.header>
//   );
// }


import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogIn, UserPlus, LogOut, LayoutDashboard, User, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../lib/auth';

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Track if we've already logged the user state to reduce console spam
  const userRef = useRef<User | null | undefined>(undefined);
  const loadingRef = useRef<boolean | undefined>(undefined);
  const logMountRef = useRef(false);

  // Log component mounting only once
  useEffect(() => {
    if (!logMountRef.current) {
      console.log('[Navigation] Component mounted');
      logMountRef.current = true;
    }
    return () => {
      console.log('[Navigation] Component unmounted');
    };
  }, []);

  // Track user changes with minimal logging
  useEffect(() => {
    if (userRef.current !== user) {
      console.log('[Navigation] user changed:', user ? 'authenticated' : 'null');
      userRef.current = user;
    }
  }, [user]);

  // Track loading state changes with minimal logging
  useEffect(() => {
    if (loadingRef.current !== loading) {
      console.log('[Navigation] loading changed:', loading);
      loadingRef.current = loading;
    }
  }, [loading]);

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle clicks outside of menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle profile menu
      if (
        profileMenuRef.current &&
        profileButtonRef.current &&
        !profileMenuRef.current.contains(event.target as Node) &&
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }

      // Handle dropdowns
      if (activeDropdown) {
        const activeRef = dropdownRefs.current[activeDropdown];
        const isClickInside = activeRef?.contains(event.target as Node);
        const triggerElement = document.getElementById(`${activeDropdown}-trigger`);
        const isClickOnTrigger = triggerElement?.contains(event.target as Node);

        if (!isClickInside && !isClickOnTrigger) {
          setActiveDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  // Close menus on route change
  useEffect(() => {
    setIsProfileMenuOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  // Handle sign out with error prevention
  const handleSignOut = useCallback(async () => {
    try {
      // Prevent multiple sign-out attempts
      if (isSigningOut) return;

      // Update UI state first
      setIsSigningOut(true);
      setIsProfileMenuOpen(false);

      // Handle sign out
      await signOut();

      // Navigate home
      navigate('/', { replace: true });
    } catch (error) {
      console.error('[Navigation] Error signing out:', error);
    }
  }, [navigate, isSigningOut]);

  // Scroll to section function
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  }, []);

  // Update reference to integration and testimonial section IDs
  useEffect(() => {
    // Check if old navigation links are used
    const urlParams = new URLSearchParams(window.location.hash.slice(1));
    const redirectMap: Record<string, string> = {
      'integrations': 'features',
      'testimonials': 'features'
    };

    const hash = window.location.hash.slice(1);
    if (redirectMap[hash]) {
      // Redirect to appropriate section if old links are used
      setTimeout(() => {
        scrollToSection(redirectMap[hash]);
        // Update URL without redirecting
        window.history.replaceState(
          null,
          document.title,
          window.location.pathname + (redirectMap[hash] ? `#${redirectMap[hash]}` : '')
        );
      }, 100);
    }
  }, [location.pathname, scrollToSection]);

  // Skip rendering on admin pages
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  // Check if signed out
  const isSignedOut = localStorage.getItem('is_signed_out') === 'true';

  // Determine if user is authenticated (must be both: has user AND not signed out)
  const isAuthenticated = !!user && !isSignedOut;

  // Define menu structure with groups
  const menuGroups = {
    product: {
      label: 'Product',
      items: [
        { href: '/#features', label: 'Features', action: () => scrollToSection('features') },
        { href: '/#services', label: 'Services', action: () => scrollToSection('services') }
      ]
    },
    resources: {
      label: 'Resources',
      items: [
        { href: '/#faq', label: 'FAQ', action: () => scrollToSection('faq') },
        { href: '/blog', label: 'Blog' }
      ]
    },
    company: {
      label: 'Company',
      items: [
        { href: '/#contact', label: 'Contact', action: () => scrollToSection('contact') }
      ]
    }
  };

  // Define standalone menu items
  const standaloneItems = [
    { href: '/#pricing', label: 'Pricing', action: () => scrollToSection('pricing') }
  ];

  // Dropdown variants for animation
  const dropdownVariants = {
    hidden: {
      opacity: 0,
      y: -5,
      transition: { duration: 0.2 }
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  const handleDropdownToggle = (key: string) => {
    setActiveDropdown(prev => prev === key ? null : key);
  };

  // Handle all navigation clicks
  const handleNavClick = (item: { href: string; action?: () => void }, e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname !== '/' && item.href.startsWith('/#')) {
      navigate('/', { state: { scrollTo: item.href.substring(2) } });
    } else if (item.action) {
      item.action();
    } else {
      navigate(item.href);
    }
  };

  return (
    <motion.header
      className={cn(
        'fixed top-0 left-0 right-0 transition-all duration-300 z-40',
        isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm' : 'bg-transparent'
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center">
            <img
              src="https://jaytpfztifhtzcruxguj.supabase.co/storage/v1/object/public/organization-logos/logos/SimpliDone%20(1).png"
              alt="SimpliDone CRM Logo"
              className="h-8"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Dropdown Menu Groups */}
            {Object.entries(menuGroups).map(([key, group]) => (
              <div key={key} className="relative">
                <button
                  id={`${key}-trigger`}
                  className={cn(
                    'flex items-center text-sm px-2 py-1 rounded-md transition-colors',
                    activeDropdown === key
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-600 hover:text-primary-500'
                  )}
                  onClick={() => handleDropdownToggle(key)}
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      'ml-1 w-4 h-4 transition-transform duration-200',
                      activeDropdown === key ? 'rotate-180' : ''
                    )}
                  />
                </button>

                <AnimatePresence>
                  {activeDropdown === key && (
                    <motion.div
                      ref={el => dropdownRefs.current[key] = el}
                      className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 overflow-hidden"
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                    >
                      {group.items.map((item) => (
                        <motion.a
                          key={item.href}
                          href={item.href}
                          onClick={(e) => handleNavClick(item, e)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                          variants={itemVariants}
                        >
                          {item.label}
                        </motion.a>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            {/* Standalone Menu Items */}
            {standaloneItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(item, e)}
                className={cn(
                  'text-gray-600 hover:text-primary-500 transition-colors text-sm px-2 py-1',
                  location.pathname === item.href && 'text-primary-500'
                )}
              >
                {item.label}
              </a>
            ))}

            {/* Auth Buttons */}
            <div className="relative ml-4">
              {loading ? (
                <div className="w-8 h-8 animate-pulse bg-gray-200 rounded-full" />
              ) : isAuthenticated ? (
                <button
                  ref={profileButtonRef}
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center hover:bg-primary-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  disabled={isSigningOut}
                >
                  <User className="w-5 h-5 text-primary-600" />
                </button>
              ) : (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => navigate('/signup')}
                    className="px-4 py-2 text-primary-600 hover:text-primary-700"
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Sign In
                  </button>
                </div>
              )}

              <AnimatePresence>
                {isProfileMenuOpen && isAuthenticated && (
                  <motion.div
                    ref={profileMenuRef}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50"
                  >
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4 inline-block mr-2" />
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      disabled={isSigningOut}
                    >
                      <LogOut className="w-4 h-4 inline-block mr-2" />
                      {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden py-4"
            >
              <div className="flex flex-col space-y-1">
                {/* Mobile Dropdown Menu Groups */}
                {Object.entries(menuGroups).map(([key, group]) => (
                  <div key={key} className="border-b border-gray-100 pb-2">
                    <button
                      className={cn(
                        'flex items-center justify-between w-full text-left px-4 py-2',
                        activeDropdown === `mobile-${key}`
                          ? 'text-primary-600 bg-primary-50'
                          : 'text-gray-700'
                      )}
                      onClick={() => handleDropdownToggle(`mobile-${key}`)}
                    >
                      {group.label}
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 transition-transform duration-200',
                          activeDropdown === `mobile-${key}` ? 'rotate-180' : ''
                        )}
                      />
                    </button>

                    <AnimatePresence>
                      {activeDropdown === `mobile-${key}` && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          {group.items.map((item) => (
                            <a
                              key={item.href}
                              href={item.href}
                              onClick={(e) => handleNavClick(item, e)}
                              className="block pl-8 pr-4 py-2 text-sm text-gray-600 hover:text-primary-500"
                            >
                              {item.label}
                            </a>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {/* Mobile Standalone Menu Items */}
                {standaloneItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavClick(item, e)}
                    className="px-4 py-2 text-gray-700 hover:text-primary-500 transition-colors border-b border-gray-100"
                  >
                    {item.label}
                  </a>
                ))}

                {/* Mobile Auth Buttons */}
                <div className="pt-2">
                  {loading ? (
                    <div className="w-full h-12 animate-pulse bg-gray-200 rounded-md" />
                  ) : isAuthenticated ? (
                    <>
                      <Link
                        to="/admin"
                        className="flex items-center px-4 py-2 text-gray-600 hover:text-primary-500"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center px-4 py-2 text-gray-600 hover:text-primary-500 w-full text-left"
                        disabled={isSigningOut}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/signup"
                        className="flex items-center px-4 py-2 text-gray-600 hover:text-primary-500"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Sign Up
                      </Link>
                      <Link
                        to="/login"
                        className="flex items-center px-4 py-2 text-gray-600 hover:text-primary-500"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}