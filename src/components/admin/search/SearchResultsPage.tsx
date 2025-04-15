// SearchResultsPage.jsx - Dedicated page for full search results
import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Search, Filter, ChevronDown, ChevronRight, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { performGlobalSearch } from './searchUtils';

export function SearchResultsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const searchParams = new URLSearchParams(location.search);
    const query = searchParams.get('q') || '';
    const typeFilter = searchParams.get('type') || 'all';

    const [searchQuery, setSearchQuery] = useState(query);
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [selectedType, setSelectedType] = useState(typeFilter);
    const [statusFilters, setStatusFilters] = useState({});
    const [sortOption, setSortOption] = useState('relevance');

    // Run search when query or type filter changes
    useEffect(() => {
        if (query) {
            performSearch(query);
            setSearchQuery(query);
        } else {
            setSearchResults([]);
            setIsLoading(false);
        }

        if (typeFilter) {
            setSelectedType(typeFilter);
        }
    }, [query, typeFilter]);

    const performSearch = async (searchQuery) => {
        setIsLoading(true);

        try {
            // Use Supabase search function instead of mock data
            const results = await performGlobalSearch(searchQuery);
            setSearchResults(results);

            // Initialize expanded state for each group
            const expandedState = {};
            const typesInResults = [...new Set(results.map(item => item.type))];
            typesInResults.forEach(type => {
                expandedState[type] = true; // Start with all expanded
            });
            setExpandedGroups(expandedState);

            // Initialize status filters for each type
            const statusState = {};
            typesInResults.forEach(type => {
                const typeResults = results.filter(item => item.type === type);
                const statusesInType = [...new Set(typeResults
                    .filter(item => item.status || item.stage || item.is_done !== undefined)
                    .map(item => item.status || item.stage || (item.is_done ? 'completed' : 'open')))];

                if (statusesInType.length > 0) {
                    statusState[type] = 'all';
                }
            });
            setStatusFilters(statusState);

        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        navigate(`/admin/search?q=${encodeURIComponent(searchQuery)}${selectedType !== 'all' ? `&type=${encodeURIComponent(selectedType)}` : ''}`);
    };

    const toggleGroup = (type) => {
        setExpandedGroups(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    const handleTypeChange = (type) => {
        setSelectedType(type);
        navigate(`/admin/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`);
    };

    const handleStatusChange = (type, status) => {
        setStatusFilters(prev => ({
            ...prev,
            [type]: status
        }));
    };

    const handleSortChange = (option) => {
        setSortOption(option);
    };

    // Group results by type
    const groupedResults = {};
    searchResults.forEach(result => {
        if (!groupedResults[result.type]) {
            groupedResults[result.type] = [];
        }
        groupedResults[result.type].push(result);
    });

    // Apply type filter
    let displayResults = searchResults;
    if (selectedType !== 'all') {
        displayResults = searchResults.filter(item => item.type === selectedType);
    }

    // Apply status filters
    Object.entries(statusFilters).forEach(([type, status]) => {
        if (status !== 'all') {
            displayResults = displayResults.filter(item =>
                item.type !== type ||
                item.status === status ||
                item.stage === status ||
                (status === 'completed' && item.is_done) ||
                (status === 'open' && !item.is_done)
            );
        }
    });

    // Apply sorting
    if (sortOption === 'name-asc') {
        displayResults.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'name-desc') {
        displayResults.sort((a, b) => b.name.localeCompare(a.name));
    }
    // For 'relevance', we assume the original order is by relevance

    // Re-group after filtering and sorting
    const filteredGroupedResults = {};
    displayResults.forEach(result => {
        if (!filteredGroupedResults[result.type]) {
            filteredGroupedResults[result.type] = [];
        }
        filteredGroupedResults[result.type].push(result);
    });

    // Get available types from results for the sidebar
    const availableTypes = ['all', ...Object.keys(groupedResults)];

    // Get status options for each type
    const statusOptions = {};
    Object.entries(groupedResults).forEach(([type, results]) => {
        const statusesInType = [...new Set(results
            .filter(item => item.status || item.stage || item.is_done !== undefined)
            .map(item => item.status || item.stage || (item.is_done ? 'completed' : 'open')))];

        if (statusesInType.length > 0) {
            statusOptions[type] = statusesInType;
        }
    });

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{isLoading ? 'Searching...' : `Search Results for "${query}"`}</h1>
                <p className="text-gray-500 mt-1">
                    {!isLoading && (
                        displayResults.length > 0
                            ? `Found ${displayResults.length} results`
                            : `No results found`
                    )}
                </p>
            </div>

            <div className="flex gap-6">
                {/* Sidebar filters */}
                <aside className="w-64 flex-shrink-0">
                    <div className="bg-white rounded-lg shadow p-4 sticky top-24">
                        <h2 className="font-medium text-gray-900 mb-4 flex items-center">
                            <Filter className="w-4 h-4 mr-2" /> Filters
                        </h2>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Result Type</label>
                            <div className="space-y-2">
                                {availableTypes.map(type => (
                                    <label key={type} className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="type"
                                            value={type}
                                            checked={selectedType === type}
                                            onChange={() => handleTypeChange(type)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                            {type === 'all' ? 'All Types' : type}
                                            <span className="ml-1 text-gray-500">
                                                ({type === 'all' ? searchResults.length : groupedResults[type]?.length || 0})
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Status filters - show relevant ones based on selected type */}
                        {(selectedType === 'all' ? Object.entries(statusOptions) :
                            selectedType !== 'all' && statusOptions[selectedType] ? [[selectedType, statusOptions[selectedType]]] : []
                        ).map(([type, statuses]) => (
                            <div key={type} className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">{type} Status</label>
                                <div className="space-y-2">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`status-${type}`}
                                            value="all"
                                            checked={statusFilters[type] === 'all'}
                                            onChange={() => handleStatusChange(type, 'all')}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">All Statuses</span>
                                    </label>

                                    {statuses.map(status => (
                                        <label key={status} className="flex items-center cursor-pointer">
                                            <input
                                                type="radio"
                                                name={`status-${type}`}
                                                value={status}
                                                checked={statusFilters[type] === status}
                                                onChange={() => handleStatusChange(type, status)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700 capitalize">
                                                {status}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Sort options */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                            <select
                                value={sortOption}
                                onChange={(e) => handleSortChange(e.target.value)}
                                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="relevance">Relevance</option>
                                <option value="name-asc">Name (A-Z)</option>
                                <option value="name-desc">Name (Z-A)</option>
                            </select>
                        </div>
                    </div>
                </aside>

                {/* Main content */}
                <div className="flex-1">
                    {/* Search bar */}
                    <div className="mb-6">
                        <form onSubmit={handleSearchSubmit}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <input
                                    type="text"
                                    placeholder="Refine your search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-20 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    Search
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Active filters summary */}
                    {(selectedType !== 'all' || Object.values(statusFilters).some(status => status !== 'all')) && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6 flex flex-wrap items-center gap-2">
                            <span className="text-sm text-blue-700 font-medium">Active Filters:</span>

                            {selectedType !== 'all' && (
                                <span className="bg-white border border-blue-200 rounded-full px-3 py-1 text-sm text-blue-700 flex items-center">
                                    Type: {selectedType}
                                    <button
                                        onClick={() => handleTypeChange('all')}
                                        className="ml-1 text-blue-400 hover:text-blue-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}

                            {Object.entries(statusFilters).map(([type, status]) =>
                                status !== 'all' && (
                                    <span key={`${type}-${status}`} className="bg-white border border-blue-200 rounded-full px-3 py-1 text-sm text-blue-700 flex items-center">
                                        {type} Status: <span className="capitalize ml-1">{status}</span>
                                        <button
                                            onClick={() => handleStatusChange(type, 'all')}
                                            className="ml-1 text-blue-400 hover:text-blue-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                )
                            )}

                            <button
                                onClick={() => {
                                    setSelectedType('all');
                                    const resetStatusFilters = {};
                                    Object.keys(statusFilters).forEach(key => {
                                        resetStatusFilters[key] = 'all';
                                    });
                                    setStatusFilters(resetStatusFilters);
                                    navigate(`/admin/search?q=${encodeURIComponent(query)}`);
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium ml-auto"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="bg-white rounded-lg shadow p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <p className="text-gray-500">Searching for results...</p>
                        </div>
                    ) : (
                        <>
                            {displayResults.length === 0 ? (
                                <div className="bg-white rounded-lg shadow p-8 text-center">
                                    <div className="text-gray-400 mb-4">
                                        <Search className="w-12 h-12 mx-auto" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                                    <p className="text-gray-500">
                                        We couldn't find any results matching "{query}"{selectedType !== 'all' && ` with type "${selectedType}"`}.
                                        {(selectedType !== 'all' || Object.values(statusFilters).some(status => status !== 'all')) && (
                                            <span> Try adjusting your search terms or filters.</span>
                                        )}
                                    </p>
                                </div>
                            ) : (
                                selectedType === 'all' ? (
                                    // Grouped view by type
                                    <div className="space-y-6">
                                        {Object.entries(filteredGroupedResults).map(([type, items]) => (
                                            <div key={type} className="bg-white rounded-lg shadow overflow-hidden">
                                                <button
                                                    onClick={() => toggleGroup(type)}
                                                    className={`w-full flex items-center justify-between px-6 py-4 text-left ${getTypeHeaderColor(type)}`}
                                                >
                                                    <div className="flex items-center">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${getTypeColor(type)}`}>
                                                            {getTypeIcon(type)}
                                                        </div>
                                                        <h2 className="font-semibold text-lg text-white">
                                                            {type} <span className="font-normal">({items.length})</span>
                                                        </h2>
                                                    </div>
                                                    {expandedGroups[type] ? (
                                                        <ChevronDown className="w-5 h-5 text-white" />
                                                    ) : (
                                                        <ChevronRight className="w-5 h-5 text-white" />
                                                    )}
                                                </button>

                                                {expandedGroups[type] && (
                                                    <div className="divide-y divide-gray-200">
                                                        {items.map(item => (
                                                            <Link
                                                                key={`${item.type}-${item.id}`}
                                                                to={item.url}
                                                                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(item.type)}`}>
                                                                        {getTypeIcon(item.type)}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-blue-600">{item.name}</div>
                                                                        <div className="text-sm text-gray-500">{item.subtitle}</div>
                                                                    </div>
                                                                    {(item.status || item.stage || item.is_done !== undefined) && (
                                                                        <div className="ml-auto">
                                                                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status || item.stage || (item.is_done ? 'completed' : 'open'))}`}>
                                                                                {item.status || item.stage || (item.is_done ? 'Completed' : 'Open')}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    // Detailed list view for specific type
                                    <div className="bg-white rounded-lg shadow">
                                        <div className={`px-6 py-4 ${getTypeHeaderColor(selectedType)}`}>
                                            <div className="flex items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${getTypeColor(selectedType)}`}>
                                                    {getTypeIcon(selectedType)}
                                                </div>
                                                <h2 className="font-semibold text-lg text-white">
                                                    {selectedType} <span className="font-normal">({displayResults.length})</span>
                                                </h2>
                                            </div>
                                        </div>

                                        <div className="divide-y divide-gray-200">
                                            {displayResults.map(item => (
                                                <Link
                                                    key={`${item.type}-${item.id}`}
                                                    to={item.url}
                                                    className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(item.type)}`}>
                                                            {getTypeIcon(item.type)}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="font-medium text-blue-600">{item.name}</div>
                                                            <div className="text-sm text-gray-500">{item.subtitle}</div>
                                                        </div>
                                                        {(item.status || item.stage || item.is_done !== undefined) && (
                                                            <div>
                                                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status || item.stage || (item.is_done ? 'completed' : 'open'))}`}>
                                                                    {item.status || item.stage || (item.is_done ? 'Completed' : 'Open')}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Utility functions 
function getTypeIcon(type) {
    // Same as in SearchBar
    const firstLetter = type.charAt(0);
    return (
        <span className="text-white text-sm font-semibold">{firstLetter}</span>
    );
}

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

function getTypeHeaderColor(type) {
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

function getStatusColor(status) {
    // Standardize status to lowercase
    const normalizedStatus = status?.toLowerCase() || '';

    // Generic status colors
    if (normalizedStatus.includes('active') || normalizedStatus === 'open' || normalizedStatus === 'new') {
        return 'bg-green-100 text-green-800';
    } else if (normalizedStatus === 'inactive' || normalizedStatus === 'closed' || normalizedStatus === 'completed') {
        return 'bg-gray-100 text-gray-800';
    } else if (normalizedStatus.includes('progress') || normalizedStatus === 'in-progress' || normalizedStatus === 'proposal' || normalizedStatus === 'qualified') {
        return 'bg-blue-100 text-blue-800';
    } else if (normalizedStatus === 'draft') {
        return 'bg-yellow-100 text-yellow-800';
    } else if (normalizedStatus === 'sent' || normalizedStatus === 'processing') {
        return 'bg-purple-100 text-purple-800';
    } else if (normalizedStatus === 'accepted' || normalizedStatus === 'shipped' || normalizedStatus === 'delivered' || normalizedStatus === 'closed-won') {
        return 'bg-green-100 text-green-800';
    } else if (normalizedStatus === 'rejected' || normalizedStatus === 'closed-lost') {
        return 'bg-red-100 text-red-800';
    } else if (normalizedStatus === 'pending' || normalizedStatus === 'negotiation') {
        return 'bg-orange-100 text-orange-800';
    }

    // Default
    return 'bg-gray-100 text-gray-800';
}