import { useState, useEffect, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LocationSearchProps {
    organizationId: string;
    selectedLocationId: string;
    onSelect: (locationId: string, locationData: any) => void;
}

export function LocationSearch({
    organizationId,
    selectedLocationId,
    onSelect
}: LocationSearchProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Fetch the selected location on mount if there is one
    useEffect(() => {
        if (selectedLocationId) {
            fetchSelectedLocation();
        }
    }, [selectedLocationId]);

    // Close the search results when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch the currently selected location
    const fetchSelectedLocation = async () => {
        try {
            const { data, error } = await supabase
                .from('locations')
                .select('id, name, type, address')
                .eq('id', selectedLocationId)
                .single();

            if (error) throw error;
            setSelectedLocation(data);
        } catch (err) {
            console.error('Error fetching selected location:', err);
        }
    };

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length >= 2) {
            searchLocations(query);
            setIsSearchOpen(true);
        } else {
            setSearchResults([]);
            setIsSearchOpen(false);
        }
    };

    // Search for locations
    const searchLocations = async (query: string) => {
        try {
            setIsLoading(true);

            const { data, error } = await supabase
                .from('locations')
                .select('id, name, type, address')
                .eq('organization_id', organizationId)
                .eq('is_active', true)
                .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
                .order('name', { ascending: true })
                .limit(10);

            if (error) throw error;

            setSearchResults(data || []);
        } catch (err) {
            console.error('Error searching locations:', err);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle location selection
    const handleLocationSelect = (location: any) => {
        setSelectedLocation(location);
        setSearchQuery('');
        setSearchResults([]);
        setIsSearchOpen(false);
        onSelect(location.id, location);
    };

    return (
        <div className="relative" ref={searchRef}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    placeholder={selectedLocation ? `${selectedLocation.name}` : "Search for a location..."}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-colors"
                    onFocus={() => {
                        if (searchQuery.length >= 2) {
                            setIsSearchOpen(true);
                        }
                    }}
                />
                {isLoading && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                    </div>
                )}
            </div>

            {isSearchOpen && searchResults.length > 0 && (
                <div className="fixed z-50 bg-white shadow-lg rounded-lg border border-gray-200 max-h-60 overflow-y-auto" style={{
                    width: searchRef.current?.offsetWidth + 'px',
                    top: (searchRef.current?.getBoundingClientRect().bottom || 0) + 5 + 'px',
                    left: (searchRef.current?.getBoundingClientRect().left || 0) + 'px'
                }}>
                    <ul className="py-1">
                        {searchResults.map((location) => (
                            <li
                                key={location.id}
                                onClick={() => handleLocationSelect(location)}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                                <div className="flex items-start">
                                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                                    <div>
                                        <div className="font-medium text-gray-900">{location.name}</div>
                                        {location.address && (
                                            <div className="text-sm text-gray-500">{location.address}</div>
                                        )}
                                        {location.type && (
                                            <div className="text-xs text-gray-400">Type: {location.type}</div>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isSearchOpen && searchQuery.length >= 2 && searchResults.length === 0 && !isLoading && (
                <div className="fixed z-50 bg-white shadow-lg rounded-lg border border-gray-200 p-4" style={{
                    width: searchRef.current?.offsetWidth + 'px',
                    top: (searchRef.current?.getBoundingClientRect().bottom || 0) + 5 + 'px',
                    left: (searchRef.current?.getBoundingClientRect().left || 0) + 'px'
                }}>
                    <p className="text-gray-500 text-center">No locations found</p>
                </div>
            )}
        </div>
    );
}