// Create this as a separate file (e.g., ExportDropdown.js)

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, ChevronDown } from 'lucide-react';

/**
 * A reusable dropdown component that uses React Portal to ensure proper rendering
 * regardless of parent container overflow or z-index issues
 */
export function ExportDropdown({ onExportPDF, onExportExcel, isLoading }) {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);

    // Handle outside clicks
    useEffect(() => {
        function handleClickOutside(event) {
            if (isOpen &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Position the dropdown
    const [dropdownStyles, setDropdownStyles] = useState({});

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();

            setDropdownStyles({
                position: 'fixed',
                top: `${rect.bottom + window.scrollY}px`,
                right: `${window.innerWidth - rect.right}px`,
                zIndex: 9999,
            });
        }
    }, [isOpen]);

    // Create the dropdown portal
    const renderDropdown = () => {
        if (!isOpen) return null;

        return createPortal(
            <div
                ref={dropdownRef}
                className="w-48 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
                style={dropdownStyles}
            >
                <ul>
                    <li>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onExportPDF();
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            Export as PDF
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onExportExcel();
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            Export as Excel
                        </button>
                    </li>
                </ul>
            </div>,
            document.body
        );
    };

    return (
        <div>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 transition-all duration-200 disabled:opacity-70"
                disabled={isLoading}
            >
                {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-700"></div>
                ) : (
                    <FileDown className="w-4 h-4" />
                )}
                <span>Export Reports</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {renderDropdown()}
        </div>
    );
}