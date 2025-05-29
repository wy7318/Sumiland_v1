import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, X, Save, Search, Palette, AlertCircle, Loader2, Hash } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../contexts/OrganizationContext';

// Types
interface TagData {
    tag_id: string;
    name: string;
    color?: string;
    description?: string;
    is_active: boolean;
    usage_count?: number;
    restaurant_id: string;
    created_at?: string;
}

// Predefined color palette
const TAG_COLORS = [
    { name: 'Blue', value: '#3B82F6', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    { name: 'Green', value: '#10B981', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    { name: 'Red', value: '#EF4444', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    { name: 'Yellow', value: '#F59E0B', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    { name: 'Purple', value: '#8B5CF6', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    { name: 'Pink', value: '#EC4899', bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
    { name: 'Indigo', value: '#6366F1', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
    { name: 'Orange', value: '#F97316', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    { name: 'Teal', value: '#14B8A6', bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
    { name: 'Gray', value: '#6B7280', bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
];

// Popular tag presets
const TAG_PRESETS = [
    { name: 'Vegetarian', color: '#10B981', description: 'Plant-based dishes' },
    { name: 'Vegan', color: '#059669', description: 'No animal products' },
    { name: 'Gluten-Free', color: '#F59E0B', description: 'No gluten ingredients' },
    { name: 'Spicy', color: '#EF4444', description: 'Hot and spicy food' },
    { name: 'Popular', color: '#3B82F6', description: 'Customer favorites' },
    { name: 'New', color: '#8B5CF6', description: 'Recently added items' },
    { name: 'Healthy', color: '#10B981', description: 'Nutritious options' },
    { name: 'Raw', color: '#EC4899', description: 'Uncooked ingredients' },
    { name: 'Organic', color: '#059669', description: 'Organic ingredients' },
    { name: 'Keto', color: '#6366F1', description: 'Ketogenic diet friendly' }
];

export default function TagsManagement() {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();

    // State
    const [tags, setTags] = useState<TagData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // UI State
    const [showNewTagForm, setShowNewTagForm] = useState(false);
    const [showPresets, setShowPresets] = useState(false);
    const [editingTag, setEditingTag] = useState<string | null>(null);

    useEffect(() => {
        if (selectedOrganization?.id) {
            fetchTagsData();
        }
    }, [selectedOrganization]);

    const fetchTagsData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get or create restaurant
            let { data: restaurant, error: restaurantError } = await supabase
                .from('restaurants')
                .select('restaurant_id')
                .eq('organization_id', selectedOrganization!.id)
                .single();

            if (restaurantError && restaurantError.code === 'PGRST116') {
                const { data: newRestaurant, error: createError } = await supabase
                    .from('restaurants')
                    .insert({
                        organization_id: selectedOrganization!.id,
                        name: selectedOrganization!.name,
                        slug: selectedOrganization!.name.toLowerCase().replace(/\s+/g, '-'),
                        created_by: user?.id
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                restaurant = newRestaurant;
            } else if (restaurantError) {
                throw restaurantError;
            }

            if (!restaurant) throw new Error('No restaurant found');
            setRestaurantId(restaurant.restaurant_id);

            // Fetch tags with usage count
            const { data: tagsData, error: tagsError } = await supabase
                .from('tags')
                .select(`
                    *,
                    usage_count:menu_item_tags(count)
                `)
                .eq('restaurant_id', restaurant.restaurant_id)
                .order('created_at');

            if (tagsError) throw tagsError;

            // Process usage count
            const processedTags = (tagsData || []).map(tag => ({
                ...tag,
                usage_count: Array.isArray(tag.usage_count) ? tag.usage_count.length : 0
            }));

            setTags(processedTags);
        } catch (err) {
            console.error('Error fetching tags:', err);
            setError(err instanceof Error ? err.message : 'Failed to load tags');
        } finally {
            setLoading(false);
        }
    };

    const getColorClasses = (color?: string) => {
        const colorObj = TAG_COLORS.find(c => c.value === color);
        return colorObj || TAG_COLORS[9]; // Default to gray
    };

    const createTag = async (tagData: Partial<TagData>) => {
        try {
            const { data, error } = await supabase
                .from('tags')
                .insert({
                    restaurant_id: restaurantId,
                    name: tagData.name,
                    color: tagData.color,
                    description: tagData.description,
                    is_active: true,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Optimistic update
            setTags([...tags, { ...data, usage_count: 0 }]);
            return data;
        } catch (err) {
            console.error('Error creating tag:', err);
            setError('Failed to create tag');
            throw err;
        }
    };

    const updateTag = async (tagId: string, updates: Partial<TagData>) => {
        try {
            const { error } = await supabase
                .from('tags')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('tag_id', tagId);

            if (error) throw error;

            // Optimistic update
            setTags(tags.map(tag =>
                tag.tag_id === tagId ? { ...tag, ...updates } : tag
            ));
        } catch (err) {
            console.error('Error updating tag:', err);
            setError('Failed to update tag');
            throw err;
        }
    };

    const deleteTag = async (tagId: string) => {
        const tag = tags.find(t => t.tag_id === tagId);
        if (tag && tag.usage_count && tag.usage_count > 0) {
            if (!confirm(`This tag is used by ${tag.usage_count} menu items. Deleting it will remove it from all items. Continue?`)) {
                return;
            }
        } else {
            if (!confirm('Are you sure you want to delete this tag?')) {
                return;
            }
        }

        try {
            const { error } = await supabase
                .from('tags')
                .delete()
                .eq('tag_id', tagId);

            if (error) throw error;

            // Optimistic update
            setTags(tags.filter(tag => tag.tag_id !== tagId));
        } catch (err) {
            console.error('Error deleting tag:', err);
            setError('Failed to delete tag');
        }
    };

    const filteredTags = tags.filter(tag =>
        tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tag.description && tag.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (!selectedOrganization) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
                        Please select an organization to manage tags.
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading tags...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Menu Tags</h1>
                        <p className="text-gray-600 mt-2">Organize your menu items with custom tags like Vegetarian, Spicy, Popular, etc.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowPresets(true)}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Hash className="w-4 h-4" />
                            Quick Add
                        </button>
                        <button
                            onClick={() => setShowNewTagForm(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Add Tag
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                {/* Search */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search tags..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* New Tag Form */}
                {showNewTagForm && (
                    <div className="mb-6">
                        <NewTagForm
                            onSave={async (tagData) => {
                                await createTag(tagData);
                                setShowNewTagForm(false);
                            }}
                            onCancel={() => setShowNewTagForm(false)}
                        />
                    </div>
                )}

                {/* Tag Presets Modal */}
                {showPresets && (
                    <TagPresetsModal
                        presets={TAG_PRESETS}
                        existingTags={tags}
                        onSelect={async (preset) => {
                            await createTag(preset);
                        }}
                        onClose={() => setShowPresets(false)}
                    />
                )}

                {/* Tags Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTags.map((tag) => (
                        <TagCard
                            key={tag.tag_id}
                            tag={tag}
                            isEditing={editingTag === tag.tag_id}
                            onEdit={() => setEditingTag(tag.tag_id)}
                            onSave={async (updates) => {
                                await updateTag(tag.tag_id, updates);
                                setEditingTag(null);
                            }}
                            onCancel={() => setEditingTag(null)}
                            onDelete={() => deleteTag(tag.tag_id)}
                        />
                    ))}
                </div>

                {filteredTags.length === 0 && tags.length > 0 && (
                    <div className="text-center py-16">
                        <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No tags found matching "{searchTerm}"</p>
                    </div>
                )}

                {tags.length === 0 && !showNewTagForm && (
                    <EmptyState
                        onAddTag={() => setShowNewTagForm(true)}
                        onShowPresets={() => setShowPresets(true)}
                    />
                )}
            </div>
        </div>
    );
}

// Sub-components
const TagCard = ({ tag, isEditing, onEdit, onSave, onCancel, onDelete }: any) => {
    const [editedTag, setEditedTag] = useState(tag);
    const [saving, setSaving] = useState(false);
    const colorClasses = getColorClasses(tag.color);

    const handleSave = async () => {
        try {
            setSaving(true);
            await onSave(editedTag);
        } catch (err) {
            // Error handled by parent
        } finally {
            setSaving(false);
        }
    };

    if (isEditing) {
        return (
            <div className="bg-white p-6 rounded-lg border-2 border-blue-500 shadow-lg">
                <TagEditForm
                    tag={editedTag}
                    onChange={setEditedTag}
                    onSave={handleSave}
                    onCancel={onCancel}
                    saving={saving}
                />
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} border`}>
                            <Tag className="w-4 h-4 inline mr-1" />
                            {tag.name}
                        </div>
                    </div>

                    {tag.description && (
                        <p className="text-sm text-gray-600 mb-3">{tag.description}</p>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Used in {tag.usage_count || 0} items</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={onEdit}
                                className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={onDelete}
                                className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NewTagForm = ({ onSave, onCancel }: any) => {
    const [tag, setTag] = useState({
        name: '',
        color: TAG_COLORS[0].value,
        description: ''
    });
    const [creating, setCreating] = useState(false);

    const handleSubmit = async () => {
        if (!tag.name) {
            alert('Please enter a tag name');
            return;
        }

        try {
            setCreating(true);
            await onSave(tag);
        } catch (err) {
            // Error handled by parent
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border-2 border-blue-500 p-6">
            <h3 className="font-medium text-gray-900 mb-4">Create New Tag</h3>
            <TagEditForm
                tag={tag}
                onChange={setTag}
                onSave={handleSubmit}
                onCancel={onCancel}
                saving={creating}
                submitText="Create Tag"
            />
        </div>
    );
};

const TagEditForm = ({ tag, onChange, onSave, onCancel, saving, submitText = "Save Changes" }: any) => {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tag Name</label>
                <input
                    type="text"
                    value={tag.name}
                    onChange={(e) => onChange({ ...tag, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Vegetarian, Spicy, Popular"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="grid grid-cols-5 gap-2">
                    {TAG_COLORS.map((color) => (
                        <button
                            key={color.value}
                            type="button"
                            onClick={() => onChange({ ...tag, color: color.value })}
                            className={`w-10 h-10 rounded-lg border-2 transition-all ${tag.color === color.value ? 'border-gray-800 scale-110' : 'border-gray-300 hover:border-gray-400'
                                }`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                        />
                    ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getColorClasses(tag.color).bg} ${getColorClasses(tag.color).text} ${getColorClasses(tag.color).border} border`}>
                        <Tag className="w-4 h-4 inline mr-1" />
                        {tag.name || 'Preview'}
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                    value={tag.description}
                    onChange={(e) => onChange({ ...tag, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of this tag"
                    rows={2}
                />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    disabled={saving}
                >
                    Cancel
                </button>
                <button
                    onClick={onSave}
                    disabled={saving || !tag.name}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitText}
                </button>
            </div>
        </div>
    );
};

const TagPresetsModal = ({ presets, existingTags, onSelect, onClose }: any) => {
    const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
    const [adding, setAdding] = useState(false);

    const existingTagNames = new Set(existingTags.map((tag: TagData) => tag.name.toLowerCase()));
    const availablePresets = presets.filter((preset: any) => !existingTagNames.has(preset.name.toLowerCase()));

    const handleAddSelected = async () => {
        try {
            setAdding(true);
            const presetsToAdd = availablePresets.filter((preset: any) => selectedPresets.has(preset.name));

            for (const preset of presetsToAdd) {
                await onSelect(preset);
            }

            onClose();
        } catch (err) {
            // Error handled by parent
        } finally {
            setAdding(false);
        }
    };

    const togglePreset = (presetName: string) => {
        const newSelected = new Set(selectedPresets);
        if (newSelected.has(presetName)) {
            newSelected.delete(presetName);
        } else {
            newSelected.add(presetName);
        }
        setSelectedPresets(newSelected);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-hidden">
                <div className="p-6 border-b">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Quick Add Popular Tags</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Select from commonly used restaurant tags</p>
                </div>

                <div className="p-6 max-h-80 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availablePresets.map((preset: any) => (
                            <div key={preset.name} className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    id={preset.name}
                                    checked={selectedPresets.has(preset.name)}
                                    onChange={() => togglePreset(preset.name)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor={preset.name} className="flex-1 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="px-2 py-1 rounded-full text-xs font-medium text-white"
                                            style={{ backgroundColor: preset.color }}
                                        >
                                            {preset.name}
                                        </div>
                                        <span className="text-sm text-gray-600">{preset.description}</span>
                                    </div>
                                </label>
                            </div>
                        ))}
                    </div>

                    {availablePresets.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <Hash className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>All popular tags have already been added!</p>
                        </div>
                    )}
                </div>

                {availablePresets.length > 0 && (
                    <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            disabled={adding}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddSelected}
                            disabled={selectedPresets.size === 0 || adding}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                        >
                            {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                            Add {selectedPresets.size} Tag{selectedPresets.size !== 1 ? 's' : ''}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const EmptyState = ({ onAddTag, onShowPresets }: any) => (
    <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No tags yet</h3>
        <p className="text-gray-600 mb-6">Create tags to help organize and categorize your menu items</p>
        <div className="flex justify-center gap-4">
            <button
                onClick={onShowPresets}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
                <Hash className="w-4 h-4" />
                Quick Add Popular Tags
            </button>
            <button
                onClick={onAddTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Create Custom Tag
            </button>
        </div>
    </div>
);

// Helper function
function getColorClasses(color?: string) {
    const colorObj = TAG_COLORS.find(c => c.value === color);
    return colorObj || TAG_COLORS[9]; // Default to gray
}