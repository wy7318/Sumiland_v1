import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { cn } from '../lib/utils';

export function OrganizationSwitcher() {
  const { selectedOrganization, organizations, setSelectedOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!selectedOrganization) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-2 px-3 py-2 rounded-lg",
          "text-gray-700 hover:bg-gray-100 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        )}
      >
        <Building2 className="w-5 h-5 text-gray-500" />
        <span className="font-medium">{selectedOrganization.name}</span>
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-500 transition-transform",
          isOpen && "transform rotate-180"
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          >
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  setSelectedOrganization(org);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-2 text-left flex items-center space-x-3",
                  "hover:bg-gray-50 transition-colors",
                  selectedOrganization.id === org.id && "bg-primary-50 text-primary-600"
                )}
              >
                <Building2 className="w-5 h-5" />
                <div>
                  <div className="font-medium">{org.name}</div>
                  <div className="text-sm text-gray-500 capitalize">{org.role}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}