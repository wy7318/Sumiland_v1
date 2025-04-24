import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    Plus,
    Search,
    Edit,
    Trash2,
    Check,
    X,
    MapPin,
    FileText,
    Eye,
    CheckCircle,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useOrganization } from '../../../contexts/OrganizationContext';

interface Location {
    id: string;
    name: string;
    type: string;
    address: string;
    description: string;
    is_active: boolean;
    created_at: string;
    item_count?: number;
}

export const LocationManagement = () => {
    const navigate = useNavigate();
    const { selectedOrganization } = useOrganization();
    const [locations, setLocations] = useState<Location[]>([]);
    const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

    // Form state for add/edit
    const [formName, setFormName] = useState('');
    const [formType, setFormType] = useState('warehouse');
    const [formAddress, setFormAddress] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formIsActive, setFormIsActive] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

    // Load locations
    useEffect(() => {
        if (!selectedOrganization?.id) return;

        const fetchLocations = async () => {
            setIsLoading(true);
            try {
                // Fetch locations
                const { data, error } = await supabase
                    .from('locations')
                    .select('*')
                    .eq('organization_id', selectedOrganization.id)
                    .order('name');

                if (error) throw error;

                let locationsWithCounts: Location[] = [];

                if (data) {
                    // For each location, get count of inventory items
                    for (const location of data) {
                        const { count } = await supabase
                            .from('inventories')
                            .select('id', { count: 'exact' })
                            .eq('location_id', location.id)
                            .eq('organization_id', selectedOrganization.id);

                        locationsWithCounts.push({
                            ...location,
                            item_count: count || 0
                        });
                    }

                    setLocations(locationsWithCounts);
                    setFilteredLocations(locationsWithCounts);
                }
            } catch (error) {
                console.error('Error fetching locations:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLocations();
    }, [selectedOrganization?.id]);

    // Filter locations based on search term
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredLocations(locations);
            return;
        }

        const lowerSearch = searchTerm.toLowerCase();
        const filtered = locations.filter(
            location =>
                location.name.toLowerCase().includes(lowerSearch) ||
                location.type.toLowerCase().includes(lowerSearch) ||
                location.address?.toLowerCase().includes(lowerSearch) ||
                location.description?.toLowerCase().includes(lowerSearch)
        );

        setFilteredLocations(filtered);
    }, [searchTerm, locations]);

    // Open add location modal
    const handleAdd = () => {
        setFormName('');
        setFormType('warehouse');
        setFormAddress('');
        setFormDescription('');
        setFormIsActive(true);
        setFormErrors({});
        setIsEditing(false);
        setShowAddModal(true);
    };

    // Open edit location modal
    const handleEdit = (location: Location) => {
        setSelectedLocation(location);
        setFormName(location.name);
        setFormType(location.type || 'warehouse');
        setFormAddress(location.address || '');
        setFormDescription(location.description || '');
        setFormIsActive(location.is_active);
        setFormErrors({});
        setIsEditing(true);
        setShowAddModal(true);
    };

    // Open delete confirmation modal
    const handleDeleteClick = (location: Location) => {
        setSelectedLocation(location);
        setShowDeleteModal(true);
    };

    // Validate form
    const validateForm = () => {
        const errors: { [key: string]: string } = {};

        if (!formName.trim()) {
            errors.name = 'Name is required';
        }

        if (!formType) {
            errors.type = 'Type is required';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Save location (add or update)
    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            if (isEditing && selectedLocation) {
                // Update existing location
                const { error } = await supabase
                    .from('locations')
                    .update({
                        name: formName,
                        type: formType,
                        address: formAddress,
                        description: formDescription,
                        is_active: formIsActive,
                        updated_by: selectedOrganization?.id
                    })
                    .eq('id', selectedLocation.id)
                    .eq('organization_id', selectedOrganization?.id);

                if (error) throw error;

                // Update in state
                setLocations(prevLocations =>
                    prevLocations.map(loc =>
                        loc.id === selectedLocation.id
                            ? {
                                ...loc,
                                name: formName,
                                type: formType,
                                address: formAddress,
                                description: formDescription,
                                is_active: formIsActive
                            }
                            : loc
                    )
                );
            } else {
                // Add new location
                const { data: userData } = await supabase.auth.getUser();
                if (!userData.user) throw new Error('Not authenticated');
                const { data, error } = await supabase
                    .from('locations')
                    .insert({
                        name: formName,
                        type: formType,
                        address: formAddress,
                        description: formDescription,
                        is_active: formIsActive,
                        organization_id: selectedOrganization?.id,
                        created_by: userData.user.id
                    })
                    .select();

                if (error) throw error;

                if (data && data[0]) {
                    // Add to state
                    setLocations(prevLocations => [
                        ...prevLocations,
                        { ...data[0], item_count: 0 }
                    ]);
                }
            }

            setShowAddModal(false);
        } catch (error) {
            console.error('Error saving location:', error);
            alert('Error saving location. Please try again.');
        }
    };

    // Delete location
    const handleDelete = async () => {
        if (!selectedLocation) return;

        try {
            // Check if location has inventory
            if ((selectedLocation.item_count || 0) > 0) {
                alert('Cannot delete location with associated inventory. Please transfer all items first.');
                setShowDeleteModal(false);
                return;
            }

            const { error } = await supabase
                .from('locations')
                .delete()
                .eq('id', selectedLocation.id)
                .eq('organization_id', selectedOrganization?.id);

            if (error) throw error;

            // Remove from state
            setLocations(prevLocations =>
                prevLocations.filter(loc => loc.id !== selectedLocation.id)
            );

            setShowDeleteModal(false);
        } catch (error) {
            console.error('Error deleting location:', error);
            alert('Error deleting location. Please try again.');
        }
    };

    // Get type icon and color
    const getTypeDetails = (type: string) => {
        switch (type.toLowerCase()) {
            case 'warehouse':
                return {
                    icon: <Building2 className="h-4 w-4" />,
                    color: 'text-blue-600 bg-blue-100'
                };
            case 'store':
                return {
                    icon: <ShoppingCart className="h-4 w-4" />,
                    color: 'text-green-600 bg-green-100'
                };
            case 'supplier':
                return {
                    icon: <Truck className="h-4 w-4" />,
                    color: 'text-purple-600 bg-purple-100'
                };
            case 'customer':
                return {
                    icon: <Users className="h-4 w-4" />,
                    color: 'text-orange-600 bg-orange-100'
                };
            default:
                return {
                    icon: <Building2 className="h-4 w-4" />,
                    color: 'text-gray-600 bg-gray-100'
                };
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Locations</h1>
                <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={handleAdd}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Location
                </button>
            </div>

            {/* Search and filters */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search locations..."
                        className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Locations list */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    {filteredLocations.length === 0 ? (
                        <div className="text-center py-16">
                            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No locations found</h3>
                            <p className="text-gray-500 mb-4">
                                {locations.length > 0
                                    ? 'Try adjusting your search'
                                    : 'Create your first location to start managing inventory'}
                            </p>
                            {locations.length === 0 && (
                                <button
                                    type="button"
                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    onClick={handleAdd}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Location
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Location
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Address
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Items
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredLocations.map((location) => {
                                        const { icon, color } = getTypeDetails(location.type);

                                        return (
                                            <tr key={location.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {location.name}
                                                    </div>
                                                    {location.description && (
                                                        <div className="text-sm text-gray-500">
                                                            {location.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
                                                        {icon}
                                                        <span className="ml-1 capitalize">{location.type || 'Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {location.address ? (
                                                        <div className="flex items-start">
                                                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 mr-1 flex-shrink-0" />
                                                            <span className="text-sm text-gray-500">
                                                                {location.address}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">No address</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {location.item_count || 0} items
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {location.is_active ? (
                                                        <div className="flex items-center text-green-600">
                                                            <CheckCircle className="h-4 w-4 mr-1" />
                                                            <span className="text-sm">Active</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center text-red-600">
                                                            <XCircle className="h-4 w-4 mr-1" />
                                                            <span className="text-sm">Inactive</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        type="button"
                                                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                                                        onClick={() => navigate(`/admin/inventory/locations/${location.id}`)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="text-blue-600 hover:text-blue-900 mr-3"
                                                        onClick={() => handleEdit(location)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="text-red-600 hover:text-red-900"
                                                        onClick={() => handleDeleteClick(location)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit Location Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
                        <div className="p-4 border-b">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">
                                    {isEditing ? 'Edit Location' : 'Add New Location'}
                                </h3>
                                <button
                                    type="button"
                                    className="text-gray-400 hover:text-gray-500"
                                    onClick={() => setShowAddModal(false)}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        className={`w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 ${formErrors.name ? 'border-red-500' : ''
                                            }`}
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        placeholder="Location name"
                                    />
                                    {formErrors.name && (
                                        <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Type *
                                    </label>
                                    <select
                                        className={`w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 ${formErrors.type ? 'border-red-500' : ''
                                            }`}
                                        value={formType}
                                        onChange={(e) => setFormType(e.target.value)}
                                    >
                                        <option value="warehouse">Warehouse</option>
                                        <option value="store">Store</option>
                                        <option value="supplier">Supplier</option>
                                        <option value="customer">Customer</option>
                                        <option value="transit">Transit</option>
                                        <option value="other">Other</option>
                                    </select>
                                    {formErrors.type && (
                                        <p className="mt-1 text-sm text-red-600">{formErrors.type}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Address
                                    </label>
                                    <textarea
                                        className="w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                        value={formAddress}
                                        onChange={(e) => setFormAddress(e.target.value)}
                                        placeholder="Location address"
                                        rows={2}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        className="w-full border rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        placeholder="Location description"
                                        rows={2}
                                    />
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        checked={formIsActive}
                                        onChange={(e) => setFormIsActive(e.target.checked)}
                                    />
                                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                                        Active
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50">
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    onClick={handleSave}
                                >
                                    {isEditing ? 'Update Location' : 'Add Location'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedLocation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
                        <div className="p-4 border-b">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-red-600">Delete Location</h3>
                                <button
                                    type="button"
                                    className="text-gray-400 hover:text-gray-500"
                                    onClick={() => setShowDeleteModal(false)}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="flex items-center mb-4">
                                <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
                                <div>
                                    <h4 className="text-lg font-medium">
                                        Are you sure you want to delete "{selectedLocation.name}"?
                                    </h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                        This action cannot be undone.
                                    </p>
                                </div>
                            </div>

                            {(selectedLocation.item_count || 0) > 0 && (
                                <div className="bg-yellow-50 p-3 rounded border border-yellow-300 mt-2 mb-4">
                                    <div className="flex">
                                        <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                                        <p className="text-sm text-yellow-700">
                                            This location has {selectedLocation.item_count} inventory items.
                                            Delete or transfer these items before deleting the location.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50">
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                    onClick={() => setShowDeleteModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    onClick={handleDelete}
                                    disabled={(selectedLocation.item_count || 0) > 0}
                                >
                                    Delete Location
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationManagement;