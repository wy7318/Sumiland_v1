// SearchBar.jsx - Main search component for AdminLayout
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { performGlobalSearch } from './searchUtils';

export function SearchBar({ className }) {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState({ grouped: {}, totalCount: 0, fullResults: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchInputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Debounced search handler
    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                performSearch(searchQuery);
            } else {
                setResults({ grouped: {}, totalCount: 0, fullResults: [] });
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                searchInputRef.current &&
                !searchInputRef.current.contains(event.target)
            ) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // We'll directly use performGlobalSearch instead of a separate performQuickSearch function
    const performSearch = async (query) => {
        setIsSearching(true);

        try {
            // Use the main search function
            const allResults = await performGlobalSearch(query);

            // Process the results for the dropdown
            const groupedResults = {};
            let totalCount = 0;

            allResults.forEach(result => {
                if (!groupedResults[result.type]) {
                    groupedResults[result.type] = [];
                }

                if (groupedResults[result.type].length < 3) { // Show max 3 per category
                    groupedResults[result.type].push(result);
                    totalCount++;
                }
            });

            setResults({
                grouped: groupedResults,
                totalCount,
                fullResults: allResults
            });

        } catch (error) {
            console.error('Search error:', error);
            // Optional: show error state to user
        } finally {
            setIsSearching(false);
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        setShowDropdown(value.trim().length >= 2);
    };

    const handleInputFocus = () => {
        if (searchQuery.trim().length >= 2) {
            setShowDropdown(true);
        }
    };

    const handleResultClick = (result) => {
        setShowDropdown(false);
        navigate(result.url);
    };

    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        if (searchQuery.trim().length >= 2) {
            setShowDropdown(false);
            navigate(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearchSubmit();
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    const handleViewAllClick = (type) => {
        setShowDropdown(false);
        navigate(`/admin/search?q=${encodeURIComponent(searchQuery)}&type=${encodeURIComponent(type)}`);
    };

    return (
        <div className={cn("relative", className)} ref={dropdownRef}>
            <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search accounts, contacts, leads..."
                        value={searchQuery}
                        onChange={handleInputChange}
                        onFocus={handleInputFocus}
                        onKeyDown={handleKeyDown}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {searchQuery.trim() !== '' && (
                        <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={() => {
                                setSearchQuery('');
                                setShowDropdown(false);
                            }}
                        >
                            <span className="sr-only">Clear</span>
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </form>

            {showDropdown && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[70vh] overflow-y-auto">
                    {isSearching ? (
                        <div className="p-4 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="mt-2 text-sm text-gray-500">Searching...</p>
                        </div>
                    ) : results.totalCount > 0 ? (
                        <>
                            <div className="p-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                                Found {results.fullResults.length} matching items
                            </div>

                            {Object.entries(results.grouped).map(([type, items]) => (
                                <div key={type} className="border-b border-gray-200 last:border-b-0">
                                    <div className="px-4 py-2 bg-gray-50 flex justify-between items-center">
                                        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{type}</h3>
                                        <span className="text-xs text-gray-500">
                                            {items.length} of {results.fullResults.filter(r => r.type === type).length}
                                        </span>
                                    </div>

                                    <div>
                                        {items.map(item => (
                                            <button
                                                key={`${item.type}-${item.id}`}
                                                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                                                onClick={() => handleResultClick(item)}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(item.type)}`}>
                                                    {getTypeIcon(item.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                                                    <div className="text-xs text-gray-500 truncate">{item.subtitle}</div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            </button>
                                        ))}
                                    </div>

                                    {results.fullResults.filter(r => r.type === type).length > items.length && (
                                        <button
                                            className="w-full text-left px-4 py-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-medium"
                                            onClick={() => handleViewAllClick(type)}
                                        >
                                            View all {results.fullResults.filter(r => r.type === type).length} {type} results
                                        </button>
                                    )}
                                </div>
                            ))}

                            <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
                                <button
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                                    onClick={handleSearchSubmit}
                                >
                                    View all search results
                                </button>
                            </div>
                        </>
                    ) : searchQuery.trim().length >= 2 ? (
                        <div className="p-4 text-center">
                            <p className="text-sm text-gray-500">No results found for "{searchQuery}"</p>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}

// Utility function to get icon for each type
function getTypeIcon(type) {
    // Simple letter-based icon
    const firstLetter = type.charAt(0);
    return (
        <span className="text-white text-sm font-semibold">{firstLetter}</span>
    );
}

// Utility function to get background color for each type
function getTypeColor(type) {
    switch (type) {
        case 'Account': return 'bg-rose-600';
        case 'Contact': return 'bg-cyan-600';
        case 'Lead': return 'bg-indigo-600';
        case 'Case': return 'bg-blue-600';
        case 'Opportunity': return 'bg-purple-600';
        case 'Quote': return 'bg-teal-600';
        case 'Order': return 'bg-amber-600';
        case 'Task': return 'bg-yellow-600';
        case 'Product': return 'bg-fuchsia-600';
        default: return 'bg-gray-600';
    }
}