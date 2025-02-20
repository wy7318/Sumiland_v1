import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogIn, UserPlus, LogOut, LayoutDashboard, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../lib/auth';

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        profileButtonRef.current &&
        !profileMenuRef.current.contains(event.target as Node) &&
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close profile menu when route changes
  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      setIsProfileMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const scrollToSection = (sectionId: string) => {
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
  };

  // Hide main navigation on admin pages
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Home', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { href: '/#services', label: 'Services', action: () => scrollToSection('services') },
    { href: '/#portfolio', label: 'Portfolio', action: () => scrollToSection('portfolio') },
    { href: '/blog', label: 'Blog' },
    { href: '/#contact', label: 'Contact', action: () => scrollToSection('contact') },
  ];

  const handleNavClick = (item: typeof navItems[0], e: React.MouseEvent) => {
    e.preventDefault(); // Always prevent default
    if (location.pathname !== '/' && item.href.startsWith('/#')) {
      // If we're not on the home page and trying to scroll to a section,
      // navigate to home first
      navigate('/', { state: { scrollTo: item.href.substring(2) } });
    } else if (item.action) {
      item.action();
    } else {
      navigate(item.href);
    }
  };

  const handleAuthClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const toggleProfileMenu = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    setIsProfileMenuOpen(prev => !prev);
  };

  return (
    <motion.header
      className={cn(
        'fixed top-0 left-0 right-0 transition-all duration-300',
        isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm' : 'bg-white/50 backdrop-blur-sm',
        'z-40'
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-2xl font-bold text-primary-600">
            SUMILAND & SUB STUDIO
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(item, e)}
                className={cn(
                  'text-gray-600 hover:text-primary-500 transition-colors',
                  location.pathname === item.href && 'text-primary-500'
                )}
              >
                {item.label}
              </a>
            ))}

            {/* Auth Buttons */}
            <div className="relative">
              {loading ? (
                <div className="w-8 h-8 animate-pulse bg-gray-200 rounded-full" />
              ) : user ? (
                <button
                  ref={profileButtonRef}
                  onClick={toggleProfileMenu}
                  className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center hover:bg-primary-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  <User className="w-5 h-5 text-primary-600" />
                </button>
              ) : (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleAuthClick('/signup')}
                    className="inline-flex items-center px-4 py-2 border border-primary-600 text-sm font-medium rounded-md text-primary-600 hover:bg-primary-50"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Sign Up
                  </button>
                  <button
                    onClick={() => handleAuthClick('/login')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </button>
                </div>
              )}

              <AnimatePresence>
                {isProfileMenuOpen && user && (
                  <motion.div
                    ref={profileMenuRef}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="fixed right-4 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-[100]"
                    style={{ top: "4rem" }}
                  >
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4 inline-block mr-2" />
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 inline-block mr-2" />
                      Sign Out
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
              <div className="flex flex-col space-y-4">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavClick(item, e)}
                    className={cn(
                      'text-gray-600 hover:text-primary-500 transition-colors px-4 py-2',
                      location.pathname === item.href && 'text-primary-500 bg-primary-50'
                    )}
                  >
                    {item.label}
                  </a>
                ))}

                {/* Mobile Auth Buttons */}
                {loading ? (
                  <div className="w-full h-12 animate-pulse bg-gray-200 rounded-md" />
                ) : user ? (
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
                      className="flex items-center px-4 py-2 text-gray-600 hover:text-primary-500"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <a
                      href="/signup"
                      onClick={(e) => handleAuthClick(e, '/signup')}
                      className="flex items-center px-4 py-2 text-gray-600 hover:text-primary-500"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Sign Up
                    </a>
                    <a
                      href="/login"
                      onClick={(e) => handleAuthClick(e, '/login')}
                      className="flex items-center px-4 py-2 text-gray-600 hover:text-primary-500"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </a>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}