import { useState, useRef } from 'react';
import { FileDown, ChevronDown } from 'lucide-react';
import { exportWorkOrderReports } from './exportWorkOrderReports';
import { exportWorkOrderReportsExcel } from './exportWorkOrderReportsExcel';

// This component replaces the current export button in the filter section
export function ExportReportsButton({ reportData, organizationName, dateRange }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Map date range value to human-readable text
    const getDateRangeText = (range) => {
        switch (range) {
            case 'last7days': return 'Last 7 Days';
            case 'last30days': return 'Last 30 Days';
            case 'last90days': return 'Last 90 Days';
            case 'thisYear': return 'This Year';
            case 'lastYear': return 'Last Year';
            default: return 'Last 30 Days';
        }
    };

    const handleExportPDF = async () => {
        setIsOpen(false);
        await exportWorkOrderReports(
            reportData,
            organizationName,
            getDateRangeText(dateRange)
        );
    };

    const handleExportExcel = () => {
        setIsOpen(false);
        exportWorkOrderReportsExcel(
            reportData,
            organizationName,
            getDateRangeText(dateRange)
        );
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownRef]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 transition-all duration-200"
            >
                <FileDown className="w-4 h-4" />
                <span>Export Reports</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10 border border-gray-200 overflow-hidden">
                    <ul>
                        <li>
                            <button
                                onClick={handleExportPDF}
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
                                onClick={handleExportExcel}
                                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                                Export as Excel
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
}