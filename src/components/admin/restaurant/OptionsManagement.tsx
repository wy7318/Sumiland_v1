import React, { useState, useEffect } from 'react';
import {
    Settings, Plus, Edit2, Trash2, GripVertical, X, Save, ChevronDown, ChevronRight,
    DollarSign, AlertCircle, Loader2, List, CheckSquare, Square, Hash, Move
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../contexts/OrganizationContext';

// Types
interface OptionItem {
    option_item_id: string;
    option_id: string;
    name: string;
    additional_price: number;
    is_default: boolean;
    sort_order: number;
}

interface MenuOption {
    option_id: string;
    restaurant_id: string;
    name: string;
    type: 'single' | 'multiple';
    is_required: boolean;
    sort_order: number;
    items: OptionItem[];
    usage_count?: number;
}

// Predefined option presets
const OPTION_PRESETS = [
    {
        name: 'Size',
        type: 'single' as const,
        is_required: true,
        items: [
            { name: 'Small', additional_price: 0, is_default: true },
            { name: 'Medium', additional_price: 2.00, is_default: false },
            { name: 'Large', additional_price: 4.00, is_default: false },
        ]
    },
    {
        name: 'Spice Level',
        type: 'single' as const,
        is_required: false,
        items: [
            { name: 'Mild', additional_price: 0, is_default: true },
            { name: 'Medium', additional_price: 0, is_default: false },
            { name: 'Hot', additional_price: 0, is_default: false },
            { name: 'Extra Hot', additional_price: 0.50, is_default: false },
        ]
    },
    {
        name: 'Toppings',
        type: 'multiple' as const,
        is_required: false,
        items: [
            { name: 'Extra Cheese', additional_price: 1.50, is_default: false },
            { name: 'Bacon', additional_price: 2.00, is_default: false },
            { name: 'Mushrooms', additional_price: 1.00, is_default: false },
            { name: 'Pepperoni', additional_price: 1.75, is_default: false },
            { name: 'Onions', additional_price: 0.75, is_default: false },
        ]
    },
    {
        name: 'Cooking Preference',
        type: 'single' as const,
        is_required: false,
        items: [
            { name: 'Rare', additional_price: 0, is_default: false },
            { name: 'Medium Rare', additional_price: 0, is_default: true },
            { name: 'Medium', additional_price: 0, is_default: false },
            { name: 'Medium Well', additional_price: 0, is_default: false },
            { name: 'Well Done', additional_price: 0, is_default: false },
        ]
    },
    {
        name: 'Sides',
        type: 'multiple' as const,
        is_required: false,
        items: [
            { name: 'French Fries', additional_price: 3.50, is_default: false },
            { name: 'Onion Rings', additional_price: 4.00, is_default: false },
            { name: 'Coleslaw', additional_price: 2.50, is_default: false },
            { name: 'Side Salad', additional_price: 3.00, is_default: false },
        ]
    }
];

export default function OptionsManagement() {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();

    // State
    const [options, setOptions] = useState<MenuOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    // UI State
    const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());
    const [showNewOptionForm, setShowNewOptionForm] = useState(false);
    const [showPresets, setShowPresets] = useState(false);
    const [editingOption, setEditingOption] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<string | null>(null);

    // Drag state
    const [draggedOption, setDraggedOption] = useState<MenuOption | null>(null);
    const [draggedItem, setDraggedItem] = useState<OptionItem | null>(null);

    useEffect(() => {
        if (selectedOrganization?.id) {
            fetchOptionsData();
        }
    }, [selectedOrganization]);

    const fetchOptionsData = async () => {
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

            // Fetch options with their items and usage count
            const { data: optionsData, error: optionsError } = await supabase
                .from('menu_options')
                .select(`
                    *,
                    usage_count:menu_item_options(count)
                `)
                .eq('restaurant_id', restaurant.restaurant_id)
                .order('sort_order');

            if (optionsError) throw optionsError;

            // Fetch option items
            const { data: itemsData, error: itemsError } = await supabase
                .from('menu_option_items')
                .select('*')
                .order('sort_order');

            if (itemsError) throw itemsError;

            // Group items by option
            const itemsByOption: Record<string, OptionItem[]> = {};
            itemsData?.forEach(item => {
                if (!itemsByOption[item.option_id]) {
                    itemsByOption[item.option_id] = [];
                }
                itemsByOption[item.option_id].push(item);
            });

            // Combine options with their items and usage count
            const processedOptions = (optionsData || []).map(option => ({
                ...option,
                items: itemsByOption[option.option_id] || [],
                usage_count: Array.isArray(option.usage_count) ? option.usage_count.length : 0
            }));

            setOptions(processedOptions);
            setExpandedOptions(new Set(processedOptions.map(o => o.option_id)));
        } catch (err) {
            console.error('Error fetching options:', err);
            setError(err instanceof Error ? err.message : 'Failed to load options');
        } finally {
            setLoading(false);
        }
    };

    const createOption = async (optionData: Partial<MenuOption>) => {
        try {
            const { data, error } = await supabase
                .from('menu_options')
                .insert({
                    restaurant_id: restaurantId,
                    name: optionData.name,
                    type: optionData.type,
                    is_required: optionData.is_required,
                    sort_order: options.length,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Optimistic update
            setOptions([...options, { ...data, items: [], usage_count: 0 }]);
            setExpandedOptions(new Set([...expandedOptions, data.option_id]));
            return data;
        } catch (err) {
            console.error('Error creating option:', err);
            setError('Failed to create option');
            throw err;
        }
    };

    const updateOption = async (optionId: string, updates: Partial<MenuOption>) => {
        try {
            const { error } = await supabase
                .from('menu_options')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('option_id', optionId);

            if (error) throw error;

            // Optimistic update
            setOptions(options.map(option =>
                option.option_id === optionId ? { ...option, ...updates } : option
            ));
        } catch (err) {
            console.error('Error updating option:', err);
            setError('Failed to update option');
            throw err;
        }
    };

    const deleteOption = async (optionId: string) => {
        const option = options.find(o => o.option_id === optionId);
        if (option && option.usage_count && option.usage_count > 0) {
            if (!confirm(`This option is used by ${option.usage_count} menu items. Deleting it will remove it from all items. Continue?`)) {
                return;
            }
        } else {
            if (!confirm('Are you sure you want to delete this option and all its choices?')) {
                return;
            }
        }

        try {
            const { error } = await supabase
                .from('menu_options')
                .delete()
                .eq('option_id', optionId);

            if (error) throw error;

            // Optimistic update
            setOptions(options.filter(option => option.option_id !== optionId));
        } catch (err) {
            console.error('Error deleting option:', err);
            setError('Failed to delete option');
        }
    };

    const createOptionItem = async (optionId: string, itemData: Partial<OptionItem>) => {
        try {
            const option = options.find(o => o.option_id === optionId);
            const { data, error } = await supabase
                .from('menu_option_items')
                .insert({
                    option_id: optionId,
                    name: itemData.name,
                    additional_price: itemData.additional_price || 0,
                    is_default: itemData.is_default || false,
                    sort_order: option?.items.length || 0,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Optimistic update
            setOptions(options.map(option =>
                option.option_id === optionId
                    ? { ...option, items: [...option.items, data] }
                    : option
            ));
            return data;
        } catch (err) {
            console.error('Error creating option item:', err);
            setError('Failed to create option item');
            throw err;
        }
    };

    const updateOptionItem = async (itemId: string, updates: Partial<OptionItem>) => {
        try {
            const { error } = await supabase
                .from('menu_option_items')
                .update(updates)
                .eq('option_item_id', itemId);

            if (error) throw error;

            // Optimistic update
            setOptions(options.map(option => ({
                ...option,
                items: option.items.map(item =>
                    item.option_item_id === itemId ? { ...item, ...updates } : item
                )
            })));
        } catch (err) {
            console.error('Error updating option item:', err);
            setError('Failed to update option item');
            throw err;
        }
    };

    const deleteOptionItem = async (itemId: string) => {
        if (!confirm('Are you sure you want to delete this option choice?')) return;

        try {
            const { error } = await supabase
                .from('menu_option_items')
                .delete()
                .eq('option_item_id', itemId);

            if (error) throw error;

            // Optimistic update
            setOptions(options.map(option => ({
                ...option,
                items: option.items.filter(item => item.option_item_id !== itemId)
            })));
        } catch (err) {
            console.error('Error deleting option item:', err);
            setError('Failed to delete option item');
        }
    };

    const toggleExpanded = (optionId: string) => {
        const newExpanded = new Set(expandedOptions);
        if (newExpanded.has(optionId)) {
            newExpanded.delete(optionId);
        } else {
            newExpanded.add(optionId);
        }
        setExpandedOptions(newExpanded);
    };

    const handleOptionDragStart = (e: React.DragEvent, option: MenuOption) => {
        setDraggedOption(option);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleOptionDrop = async (e: React.DragEvent, targetOption: MenuOption) => {
        e.preventDefault();
        if (!draggedOption || draggedOption.option_id === targetOption.option_id) return;

        const newOptions = [...options];
        const draggedIndex = newOptions.findIndex(o => o.option_id === draggedOption.option_id);
        const targetIndex = newOptions.findIndex(o => o.option_id === targetOption.option_id);

        // Optimistic update
        newOptions.splice(draggedIndex, 1);
        newOptions.splice(targetIndex, 0, draggedOption);
        setOptions(newOptions);

        // Update sort orders
        try {
            const updates = newOptions.map((option, index) => ({
                option_id: option.option_id,
                sort_order: index
            }));

            for (const update of updates) {
                await supabase
                    .from('menu_options')
                    .update({ sort_order: update.sort_order })
                    .eq('option_id', update.option_id);
            }
        } catch (err) {
            console.error('Error updating option order:', err);
            fetchOptionsData(); // Revert on error
        }

        setDraggedOption(null);
    };

    if (!selectedOrganization) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
                        Please select an organization to manage options.
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
                    <p className="text-gray-600">Loading options...</p>
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
                        <h1 className="text-3xl font-bold text-gray-900">Menu Options & Add-ons</h1>
                        <p className="text-gray-600 mt-2">Manage customizable options like Size, Toppings, Spice Level, etc.</p>
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
                            onClick={() => setShowNewOptionForm(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Add Option Group
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                {/* New Option Form */}
                {showNewOptionForm && (
                    <div className="mb-6">
                        <NewOptionForm
                            onSave={async (optionData) => {
                                await createOption(optionData);
                                setShowNewOptionForm(false);
                            }}
                            onCancel={() => setShowNewOptionForm(false)}
                        />
                    </div>
                )}

                {/* Option Presets Modal */}
                {showPresets && (
                    <OptionPresetsModal
                        presets={OPTION_PRESETS}
                        existingOptions={options}
                        onSelect={async (preset) => {
                            const option = await createOption(preset);
                            // Add preset items
                            for (const item of preset.items) {
                                await createOptionItem(option.option_id, item);
                            }
                        }}
                        onClose={() => setShowPresets(false)}
                    />
                )}

                {/* Options List */}
                <div className="space-y-4">
                    {options.map((option) => (
                        <OptionCard
                            key={option.option_id}
                            option={option}
                            expanded={expandedOptions.has(option.option_id)}
                            onToggle={() => toggleExpanded(option.option_id)}
                            onUpdate={updateOption}
                            onDelete={deleteOption}
                            onCreateItem={createOptionItem}
                            onUpdateItem={updateOptionItem}
                            onDeleteItem={deleteOptionItem}
                            onDragStart={handleOptionDragStart}
                            onDrop={handleOptionDrop}
                            editingOption={editingOption}
                            setEditingOption={setEditingOption}
                            editingItem={editingItem}
                            setEditingItem={setEditingItem}
                        />
                    ))}
                </div>

                {options.length === 0 && !showNewOptionForm && (
                    <EmptyState
                        onAddOption={() => setShowNewOptionForm(true)}
                        onShowPresets={() => setShowPresets(true)}
                    />
                )}
            </div>
        </div>
    );
}

// Sub-components
const OptionCard = ({
    option, expanded, onToggle, onUpdate, onDelete, onCreateItem, onUpdateItem, onDeleteItem,
    onDragStart, onDrop, editingOption, setEditingOption, editingItem, setEditingItem
}: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedOption, setEditedOption] = useState(option);
    const [saving, setSaving] = useState(false);
    const [showNewItemForm, setShowNewItemForm] = useState(false);

    const handleSave = async () => {
        try {
            setSaving(true);
            await onUpdate(option.option_id, editedOption);
            setIsEditing(false);
        } catch (err) {
            // Error handled by parent
        } finally {
            setSaving(false);
        }
    };

    const getTypeIcon = (type: string) => {
        return type === 'single' ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />;
    };

    const getTypeLabel = (type: string) => {
        return type === 'single' ? 'Single Choice' : 'Multiple Choice';
    };

    if (isEditing) {
        return (
            <div className="bg-white p-6 rounded-lg border-2 border-blue-500 shadow-lg">
                <OptionEditForm
                    option={editedOption}
                    onChange={setEditedOption}
                    onSave={handleSave}
                    onCancel={() => setIsEditing(false)}
                    saving={saving}
                />
            </div>
        );
    }

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, option)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, option)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all"
        >
            <div className="p-6">
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-4 flex-1">
                        <GripVertical className="w-5 h-5 text-gray-400 cursor-move opacity-0 group-hover:opacity-100 transition-opacity" />

                        <button
                            onClick={onToggle}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                            {expanded ? (
                                <ChevronDown className="w-5 h-5 text-gray-600" />
                            ) : (
                                <ChevronRight className="w-5 h-5 text-gray-600" />
                            )}
                        </button>

                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{option.name}</h3>
                                <div className="flex items-center gap-2 text-sm">
                                    {getTypeIcon(option.type)}
                                    <span className="text-gray-600">{getTypeLabel(option.type)}</span>
                                </div>
                                {option.is_required && (
                                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                                        Required
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>{option.items.length} choices</span>
                                <span>Used in {option.usage_count || 0} items</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setShowNewItemForm(true)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            title="Add Choice"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onDelete(option.option_id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {expanded && (
                <div className="px-6 pb-6">
                    {showNewItemForm && (
                        <div className="mb-4">
                            <NewOptionItemForm
                                onSave={async (itemData) => {
                                    await onCreateItem(option.option_id, itemData);
                                    setShowNewItemForm(false);
                                }}
                                onCancel={() => setShowNewItemForm(false)}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        {option.items.map((item: OptionItem) => (
                            <OptionItemCard
                                key={item.option_item_id}
                                item={item}
                                optionType={option.type}
                                isEditing={editingItem === item.option_item_id}
                                onEdit={() => setEditingItem(item.option_item_id)}
                                onSave={async (updates) => {
                                    await onUpdateItem(item.option_item_id, updates);
                                    setEditingItem(null);
                                }}
                                onCancel={() => setEditingItem(null)}
                                onDelete={() => onDeleteItem(item.option_item_id)}
                            />
                        ))}

                        {option.items.length === 0 && !showNewItemForm && (
                            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                                <List className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 mb-2">No choices added yet</p>
                                <button
                                    onClick={() => setShowNewItemForm(true)}
                                    className="text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Add first choice
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const OptionItemCard = ({ item, optionType, isEditing, onEdit, onSave, onCancel, onDelete }: any) => {
    const [editedItem, setEditedItem] = useState(item);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        try {
            setSaving(true);
            await onSave(editedItem);
        } catch (err) {
            // Error handled by parent
        } finally {
            setSaving(false);
        }
    };

    if (isEditing) {
        return (
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <div className="space-y-3">
                    <input
                        type="text"
                        value={editedItem.name}
                        onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Choice name"
                    />
                    <div className="flex gap-3">
                        <input
                            type="number"
                            value={editedItem.additional_price}
                            onChange={(e) => setEditedItem({ ...editedItem, additional_price: parseFloat(e.target.value) || 0 })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Additional price"
                            step="0.01"
                        />
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={editedItem.is_default}
                                onChange={(e) => setEditedItem({ ...editedItem, is_default: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Default</span>
                        </label>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={onCancel}
                            className="px-3 py-1 text-gray-600 hover:text-gray-800"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
                        >
                            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                            Save
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border group hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                    {optionType === 'single' ? (
                        <Square className="w-4 h-4 text-gray-400" />
                    ) : (
                        <CheckSquare className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-900">{item.name}</span>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-600">
                    {item.additional_price > 0 && (
                        <div className="flex items-center gap-1 text-green-600">
                            <DollarSign className="w-3 h-3" />
                            <span>+{item.additional_price.toFixed(2)}</span>
                        </div>
                    )}
                    {item.is_default && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            Default
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onEdit}
                    className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                    <Edit2 className="w-3 h-3" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};

const NewOptionForm = ({ onSave, onCancel }: any) => {
    const [option, setOption] = useState({
        name: '',
        type: 'single' as 'single' | 'multiple',
        is_required: false
    });
    const [creating, setCreating] = useState(false);

    const handleSubmit = async () => {
        if (!option.name) {
            alert('Please enter an option name');
            return;
        }

        try {
            setCreating(true);
            await onSave(option);
        } catch (err) {
            // Error handled by parent
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border-2 border-blue-500 p-6">
            <h3 className="font-medium text-gray-900 mb-4">Create New Option Group</h3>
            <OptionEditForm
                option={option}
                onChange={setOption}
                onSave={handleSubmit}
                onCancel={onCancel}
                saving={creating}
                submitText="Create Option"
            />
        </div>
    );
};

const OptionEditForm = ({ option, onChange, onSave, onCancel, saving, submitText = "Save Changes" }: any) => {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Option Name</label>
                <input
                    type="text"
                    value={option.name}
                    onChange={(e) => onChange({ ...option, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Size, Toppings, Spice Level"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Selection Type</label>
                <div className="space-y-2">
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="type"
                            value="single"
                            checked={option.type === 'single'}
                            onChange={(e) => onChange({ ...option, type: e.target.value as 'single' | 'multiple' })}
                            className="text-blue-600 focus:ring-blue-500"
                        />
                        <Square className="w-4 h-4 text-gray-400" />
                        <span>Single Choice (customers pick one)</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="type"
                            value="multiple"
                            checked={option.type === 'multiple'}
                            onChange={(e) => onChange({ ...option, type: e.target.value as 'single' | 'multiple' })}
                            className="text-blue-600 focus:ring-blue-500"
                        />
                        <CheckSquare className="w-4 h-4 text-gray-400" />
                        <span>Multiple Choice (customers can pick several)</span>
                    </label>
                </div>
            </div>

            <div>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={option.is_required}
                        onChange={(e) => onChange({ ...option, is_required: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Required (customers must make a selection)</span>
                </label>
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
                    disabled={saving || !option.name}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitText}
                </button>
            </div>
        </div>
    );
};

const NewOptionItemForm = ({ onSave, onCancel }: any) => {
    const [item, setItem] = useState({
        name: '',
        additional_price: 0,
        is_default: false
    });
    const [creating, setCreating] = useState(false);

    const handleSubmit = async () => {
        if (!item.name) {
            alert('Please enter a choice name');
            return;
        }

        try {
            setCreating(true);
            await onSave(item);
        } catch (err) {
            // Error handled by parent
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
            <h4 className="font-medium text-gray-900 mb-3">Add New Choice</h4>
            <div className="space-y-3">
                <input
                    type="text"
                    value={item.name}
                    onChange={(e) => setItem({ ...item, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Choice name (e.g., Small, Medium, Large)"
                />
                <div className="flex gap-3">
                    <input
                        type="number"
                        value={item.additional_price}
                        onChange={(e) => setItem({ ...item, additional_price: parseFloat(e.target.value) || 0 })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Additional price (0 for no extra cost)"
                        step="0.01"
                    />
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={item.is_default}
                            onChange={(e) => setItem({ ...item, is_default: e.target.checked })}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">Default choice</span>
                    </label>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1 text-gray-600 hover:text-gray-800"
                        disabled={creating}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={creating}
                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
                    >
                        {creating && <Loader2 className="w-3 h-3 animate-spin" />}
                        Add Choice
                    </button>
                </div>
            </div>
        </div>
    );
};

const OptionPresetsModal = ({ presets, existingOptions, onSelect, onClose }: any) => {
    const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
    const [adding, setAdding] = useState(false);

    const existingOptionNames = new Set(existingOptions.map((option: MenuOption) => option.name.toLowerCase()));
    const availablePresets = presets.filter((preset: any) => !existingOptionNames.has(preset.name.toLowerCase()));

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
            <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
                {/* Fixed Header */}
                <div className="p-6 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Quick Add Common Options</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Select from commonly used restaurant options</p>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {availablePresets.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {availablePresets.map((preset: any) => (
                                <div key={preset.name} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            id={preset.name}
                                            checked={selectedPresets.has(preset.name)}
                                            onChange={() => togglePreset(preset.name)}
                                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                            <label htmlFor={preset.name} className="cursor-pointer">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="font-medium text-gray-900">{preset.name}</h4>
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        {preset.type === 'single' ? <Square className="w-3 h-3" /> : <CheckSquare className="w-3 h-3" />}
                                                        <span>{preset.type === 'single' ? 'Single' : 'Multiple'}</span>
                                                    </div>
                                                    {preset.is_required && (
                                                        <span className="px-1 py-0.5 bg-orange-100 text-orange-800 text-xs rounded">Required</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-600 space-y-1">
                                                    {preset.items.slice(0, 4).map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between">
                                                            <span>{item.name}</span>
                                                            {item.additional_price > 0 && (
                                                                <span className="text-green-600 font-medium">+${item.additional_price.toFixed(2)}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {preset.items.length > 4 && (
                                                        <span className="text-gray-400 text-xs">+{preset.items.length - 4} more choices</span>
                                                    )}
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <Settings className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <h4 className="text-lg font-medium text-gray-900 mb-2">All Set!</h4>
                            <p>All common options have already been added to your menu.</p>
                        </div>
                    )}
                </div>

                {/* Fixed Footer */}
                <div className="p-6 border-t bg-gray-50 flex justify-between items-center flex-shrink-0">
                    <div className="text-sm text-gray-600">
                        {selectedPresets.size > 0 && (
                            <span>{selectedPresets.size} option{selectedPresets.size !== 1 ? 's' : ''} selected</span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                            disabled={adding}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddSelected}
                            disabled={selectedPresets.size === 0 || adding}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {adding ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Add {selectedPresets.size || ''} Option{selectedPresets.size !== 1 ? 's' : ''}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ onAddOption, onShowPresets }: any) => (
    <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No option groups yet</h3>
        <p className="text-gray-600 mb-6">Create customizable options like Size, Toppings, or Spice Level for your menu items</p>
        <div className="flex justify-center gap-4">
            <button
                onClick={onShowPresets}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
                <Hash className="w-4 h-4" />
                Quick Add Common Options
            </button>
            <button
                onClick={onAddOption}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Create Custom Option
            </button>
        </div>
    </div>
);