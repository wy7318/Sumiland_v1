import { useState, useEffect } from 'react';
import { Search, Clock, Star, X } from 'lucide-react';

export const PurchaseOrderSearch = ({ onSearch }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);
    const [savedSearches, setSavedSearches] = useState([]);

    // Load saved and recent searches from localStorage on component mount
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('savedPOSearches') || '[]');
        const recent = JSON.parse(localStorage.getItem('recentPOSearches') || '[]');

        setSavedSearches(saved);
        setRecentSearches(recent);
    }, []);

    const handleSearch = () => {
        if (!searchTerm.trim()) return;

        // Add to recent searches
        const newRecentSearches = [
            searchTerm,
            ...recentSearches.filter(s => s !== searchTerm)
        ].slice(0, 5); // Keep only the last 5 searches

        setRecentSearches(newRecentSearches);
        localStorage.setItem('recentPOSearches', JSON.stringify(newRecentSearches));

        // Call the provided search handler
        onSearch(searchTerm);
        setShowDropdown(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleSearch();
    };

    const handleSelectSearchTerm = (term) => {
        setSearchTerm(term);
        onSearch(term);
        setShowDropdown(false);
    };

    const toggleSavedSearch = (term) => {
        if (savedSearches.includes(term)) {
            // Remove from saved searches
            const newSavedSearches = savedSearches.filter(s => s !== term);
            setSavedSearches(newSavedSearches);
            localStorage.setItem('savedPOSearches', JSON.stringify(newSavedSearches));
        } else {
            // Add to saved searches
            const newSavedSearches = [...savedSearches, term];
            setSavedSearches(newSavedSearches);
            localStorage.setItem('savedPOSearches', JSON.stringify(newSavedSearches));
        }
    };

    const clearRecentSearches = () => {
        setRecentSearches([]);
        localStorage.setItem('recentPOSearches', JSON.stringify([]));
    };

    return (
        <div className="relative">
            <form onSubmit={handleSubmit}>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search orders..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                    />
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />

                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                onSearch('');
                            }}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </form>

            {showDropdown && (recentSearches.length > 0 || savedSearches.length > 0) && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200">
                    {savedSearches.length > 0 && (
                        <div className="p-2">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="text-xs font-medium text-gray-500">Saved Searches</h4>
                            </div>
                            <div className="space-y-1">
                                {savedSearches.map((term, index) => (
                                    <div
                                        key={`saved-${index}`}
                                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                                        onClick={() => handleSelectSearchTerm(term)}
                                    >
                                        <div className="flex items-center">
                                            <Star className="w-4 h-4 text-yellow-500 mr-2" />
                                            <span className="text-sm">{term}</span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSavedSearch(term);
                                            }}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {recentSearches.length > 0 && (
                        <div className="p-2 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="text-xs font-medium text-gray-500">Recent Searches</h4>
                                <button
                                    onClick={clearRecentSearches}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="space-y-1">
                                {recentSearches.map((term, index) => (
                                    <div
                                        key={`recent-${index}`}
                                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                                        onClick={() => handleSelectSearchTerm(term)}
                                    >
                                        <div className="flex items-center">
                                            <Clock className="w-4 h-4 text-gray-400 mr-2" />
                                            <span className="text-sm">{term}</span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSavedSearch(term);
                                            }}
                                            className="text-gray-400 hover:text-yellow-500"
                                        >
                                            <Star className="w-4 h-4" fill={savedSearches.includes(term) ? "currentColor" : "none"} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};