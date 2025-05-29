// import React, { useState, useEffect } from 'react';
// import { Plus, Edit2, Trash2, GripVertical, X, Save, ChevronDown, ChevronRight, Image, DollarSign, Clock, Tag, AlertCircle, Loader2, Layers, FileText } from 'lucide-react';
// import { supabase } from '../../../lib/supabase';
// import { useAuth } from '../../../contexts/AuthContext';
// import { useOrganization } from '../../../contexts/OrganizationContext';
// import { useNavigate } from 'react-router-dom';

// interface Tag {
//     tag_id: string;
//     name: string;
//     color?: string;
//     icon?: string;
// }

// interface MenuItem {
//     item_id: string;
//     name: string;
//     display_name?: string;
//     price: number;
//     description?: string;
//     is_active: boolean;
//     is_available: boolean;
//     tags?: string[];
//     preparation_time_minutes?: number;
//     sort_order?: number;
//     subcategory_id?: string;
// }

// interface Subcategory {
//     subcategory_id: string;
//     category_id: string;
//     name: string;
//     display_name?: string;
//     sort_order: number;
//     is_active: boolean;
//     items: MenuItem[];
// }

// interface Category {
//     category_id: string;
//     name: string;
//     display_name?: string;
//     sort_order: number;
//     is_active: boolean;
//     items: MenuItem[];
//     subcategories?: Subcategory[];
// }

// export default function MenuManagement() {
//     const navigate = useNavigate();
//     const { user } = useAuth();
//     const { selectedOrganization } = useOrganization();

//     const [categories, setCategories] = useState<Category[]>([]);
//     const [tags, setTags] = useState<Tag[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [saving, setSaving] = useState(false);

//     const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
//     const [editingCategory, setEditingCategory] = useState<string | null>(null);
//     const [editingItem, setEditingItem] = useState<string | null>(null);
//     const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
//     const [showNewItemForm, setShowNewItemForm] = useState<string | null>(null);
//     const [showNewSubcategoryForm, setShowNewSubcategoryForm] = useState<string | null>(null);
//     const [draggedItem, setDraggedItem] = useState<any>(null);
//     const [draggedCategory, setDraggedCategory] = useState<any>(null);
//     const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
//     const [dragOverSubcategory, setDragOverSubcategory] = useState<string | null>(null);

//     // Get restaurant ID for the current organization
//     const [restaurantId, setRestaurantId] = useState<string | null>(null);

//     useEffect(() => {
//         if (selectedOrganization?.id) {
//             fetchRestaurantData();
//         }
//     }, [selectedOrganization]);

//     const fetchRestaurantData = async () => {
//         try {
//             setLoading(true);
//             setError(null);

//             // First, get or create restaurant for this organization
//             let { data: restaurant, error: restaurantError } = await supabase
//                 .from('restaurants')
//                 .select('restaurant_id')
//                 .eq('organization_id', selectedOrganization!.id)
//                 .single();

//             if (restaurantError && restaurantError.code === 'PGRST116') {
//                 // Restaurant doesn't exist, create one
//                 const { data: newRestaurant, error: createError } = await supabase
//                     .from('restaurants')
//                     .insert({
//                         organization_id: selectedOrganization!.id,
//                         name: selectedOrganization!.name,
//                         slug: selectedOrganization!.name.toLowerCase().replace(/\s+/g, '-'),
//                         created_by: user?.id
//                     })
//                     .select()
//                     .single();

//                 if (createError) throw createError;
//                 restaurant = newRestaurant;
//             } else if (restaurantError) {
//                 throw restaurantError;
//             }

//             if (!restaurant) throw new Error('No restaurant found');

//             setRestaurantId(restaurant.restaurant_id);

//             // Fetch categories with their items
//             const { data: categoriesData, error: categoriesError } = await supabase
//                 .from('menu_categories')
//                 .select(`
//           category_id,
//           name,
//           display_name,
//           sort_order,
//           is_active
//         `)
//                 .eq('restaurant_id', restaurant.restaurant_id)
//                 .order('sort_order');

//             if (categoriesError) throw categoriesError;

//             // Fetch subcategories
//             const { data: subcategoriesData, error: subcategoriesError } = await supabase
//                 .from('menu_subcategories')
//                 .select(`
//           subcategory_id,
//           category_id,
//           name,
//           display_name,
//           sort_order,
//           is_active
//         `)
//                 .eq('restaurant_id', restaurant.restaurant_id)
//                 .order('sort_order');

//             if (subcategoriesError) throw subcategoriesError;

//             // Fetch all menu items for this restaurant
//             const { data: itemsData, error: itemsError } = await supabase
//                 .from('menu_items')
//                 .select(`
//           item_id,
//           category_id,
//           subcategory_id,
//           name,
//           display_name,
//           price,
//           description,
//           is_active,
//           is_available,
//           preparation_time_minutes,
//           sort_order
//         `)
//                 .eq('restaurant_id', restaurant.restaurant_id)
//                 .order('sort_order');

//             if (itemsError) throw itemsError;

//             // Fetch tags
//             const { data: tagsData, error: tagsError } = await supabase
//                 .from('tags')
//                 .select('*')
//                 .eq('restaurant_id', restaurant.restaurant_id);

//             if (tagsError) throw tagsError;
//             setTags(tagsData || []);

//             // Fetch item tags
//             const { data: itemTagsData, error: itemTagsError } = await supabase
//                 .from('menu_item_tags')
//                 .select(`
//           item_id,
//           tag:tags(name)
//         `)
//                 .in('item_id', itemsData?.map(item => item.item_id) || []);

//             if (itemTagsError) throw itemTagsError;

//             // Group items by category and add tags
//             const itemsByCategory: Record<string, MenuItem[]> = {};
//             const itemsBySubcategory: Record<string, MenuItem[]> = {};
//             const subcategoriesByCategory: Record<string, Subcategory[]> = {};
//             const itemTagsMap: Record<string, string[]> = {};

//             // Build tags map
//             itemTagsData?.forEach(({ item_id, tag }) => {
//                 if (!itemTagsMap[item_id]) itemTagsMap[item_id] = [];
//                 if (tag?.name) itemTagsMap[item_id].push(tag.name);
//             });

//             // Group subcategories by category
//             subcategoriesData?.forEach(subcategory => {
//                 if (!subcategoriesByCategory[subcategory.category_id]) {
//                     subcategoriesByCategory[subcategory.category_id] = [];
//                 }
//                 subcategoriesByCategory[subcategory.category_id].push({
//                     ...subcategory,
//                     items: []
//                 });
//             });

//             // Group items by category and subcategory
//             itemsData?.forEach(item => {
//                 const itemWithTags = {
//                     ...item,
//                     tags: itemTagsMap[item.item_id] || []
//                 };

//                 if (item.subcategory_id) {
//                     // Item belongs to a subcategory
//                     if (!itemsBySubcategory[item.subcategory_id]) {
//                         itemsBySubcategory[item.subcategory_id] = [];
//                     }
//                     itemsBySubcategory[item.subcategory_id].push(itemWithTags);
//                 } else {
//                     // Item belongs directly to a category
//                     if (!itemsByCategory[item.category_id]) {
//                         itemsByCategory[item.category_id] = [];
//                     }
//                     itemsByCategory[item.category_id].push(itemWithTags);
//                 }
//             });

//             // Add items to subcategories
//             Object.keys(subcategoriesByCategory).forEach(categoryId => {
//                 subcategoriesByCategory[categoryId].forEach(subcategory => {
//                     subcategory.items = itemsBySubcategory[subcategory.subcategory_id] || [];
//                 });
//             });

//             // Combine categories with their items and subcategories
//             const categoriesWithItems = (categoriesData || []).map(category => ({
//                 ...category,
//                 items: itemsByCategory[category.category_id] || [],
//                 subcategories: subcategoriesByCategory[category.category_id] || []
//             }));

//             setCategories(categoriesWithItems);

//             // Expand all categories by default
//             setExpandedCategories(new Set(categoriesWithItems.map(c => c.category_id)));
//         } catch (err) {
//             console.error('Error fetching menu data:', err);
//             setError(err instanceof Error ? err.message : 'Failed to load menu data');
//         } finally {
//             setLoading(false);
//         }
//     };

//     // Toggle category expansion
//     const toggleCategory = (categoryId: string) => {
//         const newExpanded = new Set(expandedCategories);
//         if (newExpanded.has(categoryId)) {
//             newExpanded.delete(categoryId);
//         } else {
//             newExpanded.add(categoryId);
//         }
//         setExpandedCategories(newExpanded);
//     };

//     // Handle category drag and drop
//     const handleCategoryDragStart = (e: React.DragEvent, category: Category) => {
//         setDraggedCategory(category);
//         e.dataTransfer.effectAllowed = 'move';
//     };

//     const handleCategoryDragOver = (e: React.DragEvent, category: Category) => {
//         e.preventDefault();
//         e.dataTransfer.dropEffect = 'move';
//         if (draggedCategory && draggedCategory.category_id !== category.category_id) {
//             setDragOverCategory(category.category_id);
//         }
//     };

//     const handleCategoryDrop = async (e: React.DragEvent, targetCategory: Category) => {
//         e.preventDefault();
//         if (!draggedCategory || draggedCategory.category_id === targetCategory.category_id) return;

//         const newCategories = [...categories];
//         const draggedIndex = newCategories.findIndex(c => c.category_id === draggedCategory.category_id);
//         const targetIndex = newCategories.findIndex(c => c.category_id === targetCategory.category_id);

//         newCategories.splice(draggedIndex, 1);
//         newCategories.splice(targetIndex, 0, draggedCategory);

//         // Update sort orders
//         const updates = newCategories.map((cat, index) => ({
//             category_id: cat.category_id,
//             sort_order: index + 1,
//             updated_at: new Date().toISOString()
//         }));

//         setCategories(newCategories);

//         // Update in database
//         try {
//             for (const update of updates) {
//                 await supabase
//                     .from('menu_categories')
//                     .update({ sort_order: update.sort_order, updated_at: update.updated_at })
//                     .eq('category_id', update.category_id);
//             }
//         } catch (err) {
//             console.error('Error updating category order:', err);
//             fetchRestaurantData(); // Reload on error
//         }

//         setDraggedCategory(null);
//         setDragOverCategory(null);
//     };

//     // Handle item drag and drop
//     const handleItemDragStart = (e: React.DragEvent, item: MenuItem, categoryId: string, subcategoryId?: string) => {
//         setDraggedItem({ item, categoryId, subcategoryId });
//         e.dataTransfer.effectAllowed = 'move';
//     };

//     const handleItemDragEnd = () => {
//         setDraggedItem(null);
//         setDragOverCategory(null);
//         setDragOverSubcategory(null);
//     };

//     const handleItemDragOver = (e: React.DragEvent) => {
//         e.preventDefault();
//         e.dataTransfer.dropEffect = 'move';
//     };

//     const handleItemDrop = async (e: React.DragEvent, targetCategoryId: string, targetSubcategoryId?: string, targetIndex: number | null = null) => {
//         e.preventDefault();
//         if (!draggedItem) return;

//         const { item, categoryId: sourceCategoryId, subcategoryId: sourceSubcategoryId } = draggedItem;

//         // Update in database
//         try {
//             await supabase
//                 .from('menu_items')
//                 .update({
//                     category_id: targetCategoryId,
//                     subcategory_id: targetSubcategoryId || null,
//                     updated_at: new Date().toISOString()
//                 })
//                 .eq('item_id', item.item_id);

//             // Refresh data
//             await fetchRestaurantData();
//         } catch (err) {
//             console.error('Error moving item:', err);
//             setError('Failed to move item');
//         }

//         setDraggedItem(null);
//     };

//     // Delete category
//     const deleteCategory = async (categoryId: string) => {
//         if (!confirm('Are you sure you want to delete this category and all its items?')) return;

//         try {
//             setSaving(true);
//             const { error } = await supabase
//                 .from('menu_categories')
//                 .delete()
//                 .eq('category_id', categoryId);

//             if (error) throw error;

//             setCategories(categories.filter(c => c.category_id !== categoryId));
//         } catch (err) {
//             console.error('Error deleting category:', err);
//             setError('Failed to delete category');
//         } finally {
//             setSaving(false);
//         }
//     };

//     // Delete item
//     const deleteItem = async (itemId: string, categoryId: string) => {
//         if (!confirm('Are you sure you want to delete this item?')) return;

//         try {
//             setSaving(true);
//             const { error } = await supabase
//                 .from('menu_items')
//                 .delete()
//                 .eq('item_id', itemId);

//             if (error) throw error;

//             // Refresh data to update all subcategories and categories
//             await fetchRestaurantData();
//         } catch (err) {
//             console.error('Error deleting item:', err);
//             setError('Failed to delete item');
//         } finally {
//             setSaving(false);
//         }
//     };

//     const tagColors: Record<string, string> = {
//         'Popular': 'bg-blue-100 text-blue-800',
//         'Vegetarian': 'bg-green-100 text-green-800',
//         'Spicy': 'bg-red-100 text-red-800',
//         'Gluten-Free': 'bg-yellow-100 text-yellow-800',
//         'Raw': 'bg-purple-100 text-purple-800'
//     };

//     const MenuItemCard = ({ item, categoryId, subcategoryId, index }: { item: MenuItem; categoryId: string; subcategoryId?: string; index: number }) => {
//         const [isEditing, setIsEditing] = useState(false);
//         const [editedItem, setEditedItem] = useState(item);
//         const [itemSaving, setItemSaving] = useState(false);

//         const handleSave = async () => {
//             try {
//                 setItemSaving(true);
//                 const { error } = await supabase
//                     .from('menu_items')
//                     .update({
//                         name: editedItem.name,
//                         display_name: editedItem.display_name || editedItem.name,
//                         price: editedItem.price,
//                         description: editedItem.description,
//                         preparation_time_minutes: editedItem.preparation_time_minutes,
//                         updated_at: new Date().toISOString()
//                     })
//                     .eq('item_id', item.item_id);

//                 if (error) throw error;

//                 // Update local state
//                 const newCategories = [...categories];
//                 const category = newCategories.find(c => c.category_id === categoryId);
//                 if (category) {
//                     const itemIndex = category.items.findIndex(i => i.item_id === item.item_id);
//                     category.items[itemIndex] = editedItem;
//                     setCategories(newCategories);
//                 }

//                 setIsEditing(false);
//             } catch (err) {
//                 console.error('Error updating item:', err);
//                 setError('Failed to update item');
//             } finally {
//                 setItemSaving(false);
//             }
//         };

//         const toggleAvailability = async () => {
//             try {
//                 const newAvailability = !item.is_available;
//                 await supabase
//                     .from('menu_items')
//                     .update({
//                         is_available: newAvailability,
//                         updated_at: new Date().toISOString()
//                     })
//                     .eq('item_id', item.item_id);

//                 // Update local state
//                 const newCategories = [...categories];
//                 const category = newCategories.find(c => c.category_id === categoryId);
//                 if (category) {
//                     const itemToUpdate = category.items.find(i => i.item_id === item.item_id);
//                     if (itemToUpdate) itemToUpdate.is_available = newAvailability;
//                     setCategories(newCategories);
//                 }
//             } catch (err) {
//                 console.error('Error updating availability:', err);
//             }
//         };

//         if (isEditing) {
//             return (
//                 <div className="bg-white p-4 rounded-lg border-2 border-blue-500 shadow-lg">
//                     <div className="space-y-3">
//                         <input
//                             type="text"
//                             value={editedItem.name}
//                             onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="Item Name"
//                         />
//                         <input
//                             type="text"
//                             value={editedItem.display_name || ''}
//                             onChange={(e) => setEditedItem({ ...editedItem, display_name: e.target.value })}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="Display Name (optional)"
//                         />
//                         <div className="flex gap-2">
//                             <input
//                                 type="number"
//                                 value={editedItem.price}
//                                 onChange={(e) => setEditedItem({ ...editedItem, price: parseFloat(e.target.value) || 0 })}
//                                 className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 placeholder="Price"
//                                 step="0.01"
//                             />
//                             <input
//                                 type="number"
//                                 value={editedItem.preparation_time_minutes || ''}
//                                 onChange={(e) => setEditedItem({ ...editedItem, preparation_time_minutes: parseInt(e.target.value) || undefined })}
//                                 className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 placeholder="Prep Time (min)"
//                             />
//                         </div>
//                         <textarea
//                             value={editedItem.description || ''}
//                             onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="Description"
//                             rows={3}
//                         />
//                         <div className="flex justify-end gap-2">
//                             <button
//                                 onClick={() => setIsEditing(false)}
//                                 className="px-4 py-2 text-gray-600 hover:text-gray-800"
//                                 disabled={itemSaving}
//                             >
//                                 Cancel
//                             </button>
//                             <button
//                                 onClick={handleSave}
//                                 disabled={itemSaving}
//                                 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
//                             >
//                                 {itemSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
//                                 Save
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             );
//         }

//         return (
//             <div
//                 draggable
//                 onDragStart={(e) => handleItemDragStart(e, item, categoryId, subcategoryId)}
//                 onDragEnd={handleItemDragEnd}
//                 onDragOver={handleItemDragOver}
//                 onDrop={(e) => handleItemDrop(e, categoryId, subcategoryId, index)}
//                 className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-move group"
//             >
//                 <div className="flex items-start gap-3">
//                     <GripVertical className="w-5 h-5 text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />

//                     <div className="flex-1">
//                         <div className="flex items-start justify-between">
//                             <div className="flex-1">
//                                 <h4 className="font-medium text-gray-900">
//                                     {item.display_name || item.name}
//                                     {item.display_name && item.display_name !== item.name && (
//                                         <span className="text-sm text-gray-500 ml-2">({item.name})</span>
//                                     )}
//                                 </h4>
//                                 <p className="text-sm text-gray-600 mt-1">{item.description}</p>

//                                 <div className="flex items-center gap-4 mt-2">
//                                     <span className="flex items-center text-green-600 font-medium">
//                                         <DollarSign className="w-4 h-4" />
//                                         {item.price.toFixed(2)}
//                                     </span>

//                                     {item.preparation_time_minutes && (
//                                         <span className="flex items-center text-sm text-gray-500">
//                                             <Clock className="w-4 h-4 mr-1" />
//                                             {item.preparation_time_minutes} min
//                                         </span>
//                                     )}

//                                     <div className="flex gap-1">
//                                         {item.tags?.map((tag) => (
//                                             <span
//                                                 key={tag}
//                                                 className={`text-xs px-2 py-1 rounded-full ${tagColors[tag] || 'bg-gray-100 text-gray-800'}`}
//                                             >
//                                                 {tag}
//                                             </span>
//                                         ))}
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
//                                 <button
//                                     onClick={() => setIsEditing(true)}
//                                     className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
//                                 >
//                                     <Edit2 className="w-4 h-4" />
//                                 </button>
//                                 <button
//                                     onClick={() => deleteItem(item.item_id, categoryId)}
//                                     className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
//                                 >
//                                     <Trash2 className="w-4 h-4" />
//                                 </button>
//                             </div>
//                         </div>

//                         <div className="flex items-center gap-4 mt-3">
//                             <label className="flex items-center gap-2 text-sm">
//                                 <input
//                                     type="checkbox"
//                                     checked={item.is_available}
//                                     onChange={toggleAvailability}
//                                     className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
//                                 />
//                                 Available
//                             </label>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         );
//     };

//     const CategoryCard = ({ category }: { category: Category }) => {
//         const [isEditing, setIsEditing] = useState(false);
//         const [editedName, setEditedName] = useState(category.name);
//         const [editedDisplayName, setEditedDisplayName] = useState(category.display_name || '');
//         const [categorySaving, setCategorySaving] = useState(false);

//         const handleSave = async () => {
//             try {
//                 setCategorySaving(true);
//                 const { error } = await supabase
//                     .from('menu_categories')
//                     .update({
//                         name: editedName,
//                         display_name: editedDisplayName || editedName,
//                         updated_at: new Date().toISOString()
//                     })
//                     .eq('category_id', category.category_id);

//                 if (error) throw error;

//                 // Update local state
//                 const newCategories = [...categories];
//                 const catIndex = newCategories.findIndex(c => c.category_id === category.category_id);
//                 newCategories[catIndex] = {
//                     ...newCategories[catIndex],
//                     name: editedName,
//                     display_name: editedDisplayName || editedName
//                 };
//                 setCategories(newCategories);
//                 setIsEditing(false);
//             } catch (err) {
//                 console.error('Error updating category:', err);
//                 setError('Failed to update category');
//             } finally {
//                 setCategorySaving(false);
//             }
//         };

//         return (
//             <div
//                 draggable
//                 onDragStart={(e) => handleCategoryDragStart(e, category)}
//                 onDragEnd={() => {
//                     setDraggedCategory(null);
//                     setDragOverCategory(null);
//                 }}
//                 onDragOver={(e) => handleCategoryDragOver(e, category)}
//                 onDrop={(e) => handleCategoryDrop(e, category)}
//                 onDragLeave={() => setDragOverCategory(null)}
//                 className={`bg-white rounded-lg shadow-sm border-2 transition-all ${dragOverCategory === category.category_id ? 'border-blue-500 shadow-lg' : 'border-gray-200'
//                     }`}
//             >
//                 <div className="p-4">
//                     <div className="flex items-center justify-between group">
//                         <div className="flex items-center gap-3 flex-1">
//                             <GripVertical className="w-5 h-5 text-gray-400 cursor-move opacity-0 group-hover:opacity-100 transition-opacity" />

//                             <button
//                                 onClick={() => toggleCategory(category.category_id)}
//                                 className="p-1 hover:bg-gray-100 rounded transition-colors"
//                             >
//                                 {expandedCategories.has(category.category_id) ? (
//                                     <ChevronDown className="w-5 h-5 text-gray-600" />
//                                 ) : (
//                                     <ChevronRight className="w-5 h-5 text-gray-600" />
//                                 )}
//                             </button>

//                             {isEditing ? (
//                                 <div className="flex items-center gap-2 flex-1">
//                                     <input
//                                         type="text"
//                                         value={editedName}
//                                         onChange={(e) => setEditedName(e.target.value)}
//                                         className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                         placeholder="Category Name"
//                                     />
//                                     <input
//                                         type="text"
//                                         value={editedDisplayName}
//                                         onChange={(e) => setEditedDisplayName(e.target.value)}
//                                         className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                         placeholder="Display Name (optional)"
//                                     />
//                                     <button
//                                         onClick={handleSave}
//                                         disabled={categorySaving}
//                                         className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
//                                     >
//                                         {categorySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
//                                     </button>
//                                     <button
//                                         onClick={() => setIsEditing(false)}
//                                         className="p-1 text-gray-600 hover:bg-gray-50 rounded"
//                                     >
//                                         <X className="w-4 h-4" />
//                                     </button>
//                                 </div>
//                             ) : (
//                                 <>
//                                     <h3 className="text-lg font-semibold text-gray-900">
//                                         {category.display_name || category.name}
//                                         {category.display_name && category.display_name !== category.name && (
//                                             <span className="text-sm font-normal text-gray-500 ml-2">({category.name})</span>
//                                         )}
//                                     </h3>
//                                     <span className="text-sm text-gray-500 ml-auto mr-4">
//                                         {category.subcategories && category.subcategories.length > 0 && (
//                                             <span>{category.subcategories.length} subcategories, </span>
//                                         )}
//                                         {category.items.length + (category.subcategories?.reduce((sum, sub) => sum + sub.items.length, 0) || 0)} items
//                                     </span>
//                                 </>
//                             )}
//                         </div>

//                         {!isEditing && (
//                             <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
//                                 <button
//                                     onClick={() => setShowNewSubcategoryForm(category.category_id)}
//                                     className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors group relative"
//                                     title="Add Subcategory"
//                                 >
//                                     <Layers className="w-4 h-4" />
//                                     <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
//                                         Add Subcategory
//                                     </span>
//                                 </button>
//                                 <button
//                                     onClick={() => setShowNewItemForm(category.category_id)}
//                                     className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors group relative"
//                                     title="Add Item"
//                                 >
//                                     <Plus className="w-4 h-4" />
//                                     <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
//                                         Add Item
//                                     </span>
//                                 </button>
//                                 <button
//                                     onClick={() => setIsEditing(true)}
//                                     className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
//                                 >
//                                     <Edit2 className="w-4 h-4" />
//                                 </button>
//                                 <button
//                                     onClick={() => deleteCategory(category.category_id)}
//                                     className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
//                                 >
//                                     <Trash2 className="w-4 h-4" />
//                                 </button>
//                             </div>
//                         )}
//                     </div>
//                 </div>

//                 {expandedCategories.has(category.category_id) && (
//                     <div className="px-4 pb-4">
//                         <div className="space-y-3">
//                             {showNewSubcategoryForm === category.category_id && (
//                                 <NewSubcategoryForm
//                                     categoryId={category.category_id}
//                                     onSave={async (newSubcategory) => {
//                                         try {
//                                             const { data, error } = await supabase
//                                                 .from('menu_subcategories')
//                                                 .insert({
//                                                     restaurant_id: restaurantId,
//                                                     category_id: category.category_id,
//                                                     name: newSubcategory.name,
//                                                     display_name: newSubcategory.display_name || newSubcategory.name,
//                                                     sort_order: category.subcategories?.length || 0,
//                                                     is_active: true,
//                                                     created_at: new Date().toISOString()
//                                                 })
//                                                 .select()
//                                                 .single();

//                                             if (error) throw error;

//                                             // Update local state
//                                             const newCategories = [...categories];
//                                             const cat = newCategories.find(c => c.category_id === category.category_id);
//                                             if (cat && data) {
//                                                 if (!cat.subcategories) cat.subcategories = [];
//                                                 cat.subcategories.push({
//                                                     ...data,
//                                                     items: []
//                                                 });
//                                                 setCategories(newCategories);
//                                             }
//                                             setShowNewSubcategoryForm(null);
//                                         } catch (err) {
//                                             console.error('Error creating subcategory:', err);
//                                             setError('Failed to create subcategory');
//                                         }
//                                     }}
//                                     onCancel={() => setShowNewSubcategoryForm(null)}
//                                 />
//                             )}

//                             {showNewItemForm === category.category_id && (
//                                 <NewItemForm
//                                     categoryId={category.category_id}
//                                     subcategoryId={null}
//                                     onSave={async (newItem) => {
//                                         try {
//                                             const { data, error } = await supabase
//                                                 .from('menu_items')
//                                                 .insert({
//                                                     restaurant_id: restaurantId,
//                                                     category_id: category.category_id,
//                                                     subcategory_id: null,
//                                                     name: newItem.name,
//                                                     display_name: newItem.display_name || newItem.name,
//                                                     price: newItem.price,
//                                                     description: newItem.description,
//                                                     preparation_time_minutes: newItem.preparation_time_minutes,
//                                                     is_active: true,
//                                                     is_available: true,
//                                                     sort_order: category.items.length,
//                                                     created_at: new Date().toISOString()
//                                                 })
//                                                 .select()
//                                                 .single();

//                                             if (error) throw error;

//                                             // Update local state
//                                             const newCategories = [...categories];
//                                             const cat = newCategories.find(c => c.category_id === category.category_id);
//                                             if (cat && data) {
//                                                 cat.items.push({
//                                                     ...data,
//                                                     tags: []
//                                                 });
//                                                 setCategories(newCategories);
//                                             }
//                                             setShowNewItemForm(null);
//                                         } catch (err) {
//                                             console.error('Error creating item:', err);
//                                             setError('Failed to create item');
//                                         }
//                                     }}
//                                     onCancel={() => setShowNewItemForm(null)}
//                                 />
//                             )}

//                             {/* Display subcategories */}
//                             {category.subcategories && category.subcategories.length > 0 && (
//                                 <div className="space-y-3">
//                                     <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
//                                         <Layers className="w-4 h-4" />
//                                         <span>Subcategories</span>
//                                     </div>
//                                     <div className="ml-4 space-y-3">
//                                         {category.subcategories
//                                             .sort((a, b) => a.sort_order - b.sort_order)
//                                             .map((subcategory) => (
//                                                 <SubcategoryCard
//                                                     key={subcategory.subcategory_id}
//                                                     subcategory={subcategory}
//                                                     categoryId={category.category_id}
//                                                     onUpdate={() => fetchRestaurantData()}
//                                                 />
//                                             ))}
//                                     </div>
//                                 </div>
//                             )}

//                             {/* Display items directly under category (not in subcategory) */}
//                             {(category.items.length > 0 || (category.subcategories && category.subcategories.length > 0)) && (
//                                 <div className="space-y-3">
//                                     {category.subcategories && category.subcategories.length > 0 && (
//                                         <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
//                                             <FileText className="w-4 h-4" />
//                                             <span>Direct Items (not in subcategory)</span>
//                                         </div>
//                                     )}
//                                     <div className={category.subcategories && category.subcategories.length > 0 ? "ml-4 space-y-3" : "space-y-3"}>
//                                         {category.items.map((item, index) => (
//                                             <MenuItemCard
//                                                 key={item.item_id}
//                                                 item={item}
//                                                 categoryId={category.category_id}
//                                                 subcategoryId={undefined}
//                                                 index={index}
//                                             />
//                                         ))}
//                                         {/* Drop zone for adding items to category when there are subcategories */}
//                                         {category.subcategories && category.subcategories.length > 0 && category.items.length === 0 && (
//                                             <div
//                                                 className={`border-2 border-dashed rounded-lg p-4 text-center text-sm transition-all ${draggedItem ? 'border-gray-400 bg-gray-50' : 'border-gray-300'
//                                                     }`}
//                                                 onDragOver={handleItemDragOver}
//                                                 onDrop={(e) => handleItemDrop(e, category.category_id)}
//                                             >
//                                                 <span className={draggedItem ? 'text-gray-700 font-medium' : 'text-gray-500'}>
//                                                     Drop items here to add directly to category
//                                                 </span>
//                                             </div>
//                                         )}
//                                     </div>
//                                 </div>
//                             )}

//                             {category.items.length === 0 && (!category.subcategories || category.subcategories.length === 0) && showNewItemForm !== category.category_id && showNewSubcategoryForm !== category.category_id && (
//                                 <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
//                                     <p>No items or subcategories in this category</p>
//                                     <div className="mt-2 flex justify-center gap-4">
//                                         <button
//                                             onClick={() => setShowNewSubcategoryForm(category.category_id)}
//                                             className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
//                                         >
//                                             <Layers className="w-4 h-4" />
//                                             Add subcategory
//                                         </button>
//                                         <span className="text-gray-400">or</span>
//                                         <button
//                                             onClick={() => setShowNewItemForm(category.category_id)}
//                                             className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
//                                         >
//                                             <Plus className="w-4 h-4" />
//                                             Add item
//                                         </button>
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 )}
//             </div>
//         );
//     };

//     const SubcategoryCard = ({ subcategory, categoryId, onUpdate }: any) => {
//         const [isEditing, setIsEditing] = useState(false);
//         const [editedName, setEditedName] = useState(subcategory.name);
//         const [editedDisplayName, setEditedDisplayName] = useState(subcategory.display_name || '');
//         const [subcategorySaving, setSubcategorySaving] = useState(false);
//         const [showNewItemForm, setShowNewItemForm] = useState(false);

//         const handleSave = async () => {
//             try {
//                 setSubcategorySaving(true);
//                 const { error } = await supabase
//                     .from('menu_subcategories')
//                     .update({
//                         name: editedName,
//                         display_name: editedDisplayName || editedName,
//                         updated_at: new Date().toISOString()
//                     })
//                     .eq('subcategory_id', subcategory.subcategory_id);

//                 if (error) throw error;

//                 onUpdate();
//                 setIsEditing(false);
//             } catch (err) {
//                 console.error('Error updating subcategory:', err);
//                 setError('Failed to update subcategory');
//             } finally {
//                 setSubcategorySaving(false);
//             }
//         };

//         const deleteSubcategory = async () => {
//             if (!confirm('Are you sure you want to delete this subcategory and all its items?')) return;

//             try {
//                 const { error } = await supabase
//                     .from('menu_subcategories')
//                     .delete()
//                     .eq('subcategory_id', subcategory.subcategory_id);

//                 if (error) throw error;
//                 onUpdate();
//             } catch (err) {
//                 console.error('Error deleting subcategory:', err);
//                 setError('Failed to delete subcategory');
//             }
//         };

//         return (
//             <div className={`bg-gray-50 rounded-lg p-4 border transition-all ${dragOverSubcategory === subcategory.subcategory_id ? 'border-purple-500 border-2 shadow-lg' : 'border-gray-200'
//                 }`}>
//                 <div className="flex items-center justify-between group mb-3">
//                     {isEditing ? (
//                         <div className="flex items-center gap-2 flex-1">
//                             <input
//                                 type="text"
//                                 value={editedName}
//                                 onChange={(e) => setEditedName(e.target.value)}
//                                 className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 placeholder="Subcategory Name"
//                             />
//                             <input
//                                 type="text"
//                                 value={editedDisplayName}
//                                 onChange={(e) => setEditedDisplayName(e.target.value)}
//                                 className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 placeholder="Display Name (optional)"
//                             />
//                             <button
//                                 onClick={handleSave}
//                                 disabled={subcategorySaving}
//                                 className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
//                             >
//                                 {subcategorySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
//                             </button>
//                             <button
//                                 onClick={() => setIsEditing(false)}
//                                 className="p-1 text-gray-600 hover:bg-gray-50 rounded"
//                             >
//                                 <X className="w-4 h-4" />
//                             </button>
//                         </div>
//                     ) : (
//                         <>
//                             <div className="flex items-center gap-2">
//                                 <Layers className="w-4 h-4 text-purple-500" />
//                                 <h4 className="font-medium text-gray-800">
//                                     {subcategory.display_name || subcategory.name}
//                                     {subcategory.display_name && subcategory.display_name !== subcategory.name && (
//                                         <span className="text-sm font-normal text-gray-500 ml-2">({subcategory.name})</span>
//                                     )}
//                                 </h4>
//                                 <span className="text-sm text-gray-500 ml-2">
//                                     {subcategory.items.length} items
//                                 </span>
//                             </div>

//                             <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
//                                 <button
//                                     onClick={() => setShowNewItemForm(true)}
//                                     className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
//                                     title="Add Item"
//                                 >
//                                     <Plus className="w-4 h-4" />
//                                 </button>
//                                 <button
//                                     onClick={() => setIsEditing(true)}
//                                     className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
//                                 >
//                                     <Edit2 className="w-4 h-4" />
//                                 </button>
//                                 <button
//                                     onClick={deleteSubcategory}
//                                     className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
//                                 >
//                                     <Trash2 className="w-4 h-4" />
//                                 </button>
//                             </div>
//                         </>
//                     )}
//                 </div>

//                 {showNewItemForm && (
//                     <div className="mb-3">
//                         <NewItemForm
//                             categoryId={categoryId}
//                             subcategoryId={subcategory.subcategory_id}
//                             onSave={async (newItem) => {
//                                 try {
//                                     const { data, error } = await supabase
//                                         .from('menu_items')
//                                         .insert({
//                                             restaurant_id: restaurantId,
//                                             category_id: categoryId,
//                                             subcategory_id: subcategory.subcategory_id,
//                                             name: newItem.name,
//                                             display_name: newItem.display_name || newItem.name,
//                                             price: newItem.price,
//                                             description: newItem.description,
//                                             preparation_time_minutes: newItem.preparation_time_minutes,
//                                             is_active: true,
//                                             is_available: true,
//                                             sort_order: subcategory.items.length,
//                                             created_at: new Date().toISOString()
//                                         })
//                                         .select()
//                                         .single();

//                                     if (error) throw error;

//                                     onUpdate();
//                                     setShowNewItemForm(false);
//                                 } catch (err) {
//                                     console.error('Error creating item:', err);
//                                     setError('Failed to create item');
//                                 }
//                             }}
//                             onCancel={() => setShowNewItemForm(false)}
//                         />
//                     </div>
//                 )}

//                 <div
//                     className="space-y-2"
//                     onDragOver={(e) => {
//                         handleItemDragOver(e);
//                         setDragOverSubcategory(subcategory.subcategory_id);
//                     }}
//                     onDragLeave={() => setDragOverSubcategory(null)}
//                     onDrop={(e) => {
//                         handleItemDrop(e, categoryId, subcategory.subcategory_id);
//                         setDragOverSubcategory(null);
//                     }}
//                 >
//                     {subcategory.items.map((item: MenuItem, index: number) => (
//                         <MenuItemCard
//                             key={item.item_id}
//                             item={item}
//                             categoryId={categoryId}
//                             subcategoryId={subcategory.subcategory_id}
//                             index={index}
//                         />
//                     ))}

//                     {subcategory.items.length === 0 && !showNewItemForm && (
//                         <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded">
//                             <p className="text-sm">No items in this subcategory</p>
//                             <button
//                                 onClick={() => setShowNewItemForm(true)}
//                                 className="mt-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
//                             >
//                                 Add first item
//                             </button>
//                         </div>
//                     )}
//                 </div>
//             </div>
//         );
//     };

//     const NewSubcategoryForm = ({ categoryId, onSave, onCancel }: any) => {
//         const [newSubcategory, setNewSubcategory] = useState({
//             name: '',
//             display_name: ''
//         });

//         const handleSubmit = () => {
//             if (!newSubcategory.name) {
//                 alert('Please enter a subcategory name');
//                 return;
//             }

//             onSave(newSubcategory);
//         };

//         return (
//             <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
//                 <h4 className="font-medium text-gray-900 mb-3">New Subcategory</h4>
//                 <div className="space-y-3">
//                     <input
//                         type="text"
//                         value={newSubcategory.name}
//                         onChange={(e) => setNewSubcategory({ ...newSubcategory, name: e.target.value })}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
//                         placeholder="Subcategory Name *"
//                     />
//                     <input
//                         type="text"
//                         value={newSubcategory.display_name}
//                         onChange={(e) => setNewSubcategory({ ...newSubcategory, display_name: e.target.value })}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
//                         placeholder="Display Name (optional)"
//                     />
//                     <div className="flex justify-end gap-2">
//                         <button
//                             onClick={onCancel}
//                             className="px-4 py-2 text-gray-600 hover:text-gray-800"
//                         >
//                             Cancel
//                         </button>
//                         <button
//                             onClick={handleSubmit}
//                             className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
//                         >
//                             Add Subcategory
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         );
//     };

//     const NewItemForm = ({ categoryId, subcategoryId, onSave, onCancel }: any) => {
//         const [newItem, setNewItem] = useState({
//             name: '',
//             display_name: '',
//             price: '',
//             description: '',
//             preparation_time_minutes: ''
//         });

//         const handleSubmit = () => {
//             if (!newItem.name || !newItem.price) {
//                 alert('Please fill in required fields');
//                 return;
//             }

//             onSave({
//                 ...newItem,
//                 price: parseFloat(newItem.price),
//                 preparation_time_minutes: newItem.preparation_time_minutes ? parseInt(newItem.preparation_time_minutes) : null
//             });
//         };

//         return (
//             <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
//                 <h4 className="font-medium text-gray-900 mb-3">New Menu Item</h4>
//                 <div className="space-y-3">
//                     <input
//                         type="text"
//                         value={newItem.name}
//                         onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                         placeholder="Item Name *"
//                     />
//                     <input
//                         type="text"
//                         value={newItem.display_name}
//                         onChange={(e) => setNewItem({ ...newItem, display_name: e.target.value })}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                         placeholder="Display Name (optional)"
//                     />
//                     <div className="flex gap-2">
//                         <input
//                             type="number"
//                             value={newItem.price}
//                             onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
//                             className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="Price *"
//                             step="0.01"
//                         />
//                         <input
//                             type="number"
//                             value={newItem.preparation_time_minutes}
//                             onChange={(e) => setNewItem({ ...newItem, preparation_time_minutes: e.target.value })}
//                             className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="Prep Time (min)"
//                         />
//                     </div>
//                     <textarea
//                         value={newItem.description}
//                         onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                         placeholder="Description"
//                         rows={2}
//                     />
//                     <div className="flex justify-end gap-2">
//                         <button
//                             onClick={onCancel}
//                             className="px-4 py-2 text-gray-600 hover:text-gray-800"
//                         >
//                             Cancel
//                         </button>
//                         <button
//                             onClick={handleSubmit}
//                             className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//                         >
//                             Add Item
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         );
//     };

//     const NewCategoryForm = () => {
//         const [name, setName] = useState('');
//         const [displayName, setDisplayName] = useState('');
//         const [creating, setCreating] = useState(false);

//         const handleSubmit = async () => {
//             if (!name) {
//                 alert('Please enter a category name');
//                 return;
//             }

//             try {
//                 setCreating(true);
//                 const { data, error } = await supabase
//                     .from('menu_categories')
//                     .insert({
//                         restaurant_id: restaurantId,
//                         name,
//                         display_name: displayName || name,
//                         sort_order: categories.length + 1,
//                         is_active: true,
//                         created_at: new Date().toISOString()
//                     })
//                     .select()
//                     .single();

//                 if (error) throw error;

//                 if (data) {
//                     const newCategory = {
//                         ...data,
//                         items: []
//                     };

//                     setCategories([...categories, newCategory]);
//                     setExpandedCategories(new Set([...expandedCategories, newCategory.category_id]));
//                     setShowNewCategoryForm(false);
//                     setName('');
//                     setDisplayName('');
//                 }
//             } catch (err) {
//                 console.error('Error creating category:', err);
//                 setError('Failed to create category');
//             } finally {
//                 setCreating(false);
//             }
//         };

//         return (
//             <div className="bg-white rounded-lg shadow-sm border-2 border-blue-500 p-4">
//                 <h3 className="font-medium text-gray-900 mb-3">New Category</h3>
//                 <div className="space-y-3">
//                     <input
//                         type="text"
//                         value={name}
//                         onChange={(e) => setName(e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                         placeholder="Category Name *"
//                     />
//                     <input
//                         type="text"
//                         value={displayName}
//                         onChange={(e) => setDisplayName(e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                         placeholder="Display Name (optional)"
//                     />
//                     <div className="flex justify-end gap-2">
//                         <button
//                             onClick={() => setShowNewCategoryForm(false)}
//                             className="px-4 py-2 text-gray-600 hover:text-gray-800"
//                             disabled={creating}
//                         >
//                             Cancel
//                         </button>
//                         <button
//                             onClick={handleSubmit}
//                             disabled={creating}
//                             className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
//                         >
//                             {creating && <Loader2 className="w-4 h-4 animate-spin" />}
//                             Add Category
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         );
//     };

//     if (!selectedOrganization) {
//         return (
//             <div className="min-h-screen bg-gray-50 p-6">
//                 <div className="max-w-6xl mx-auto">
//                     <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
//                         Please select an organization to manage menus.
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     if (loading) {
//         return (
//             <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//                 <div className="text-center">
//                     <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
//                     <p className="text-gray-600">Loading menu data...</p>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="min-h-screen bg-gray-50 p-6">
//             <div className="max-w-6xl mx-auto">
//                 <div className="mb-8">
//                     <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
//                     <p className="text-gray-600 mt-2">Organize your menu with drag and drop. Create categories, subcategories, and items.</p>
//                     <div className="mt-3 flex items-center gap-6 text-sm text-gray-600">
//                         <div className="flex items-center gap-2">
//                             <Layers className="w-4 h-4 text-purple-500" />
//                             <span>Subcategory</span>
//                         </div>
//                         <div className="flex items-center gap-2">
//                             <FileText className="w-4 h-4 text-gray-500" />
//                             <span>Menu Item</span>
//                         </div>
//                     </div>
//                 </div>

//                 {error && (
//                     <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
//                         <AlertCircle className="w-5 h-5 mr-2" />
//                         {error}
//                     </div>
//                 )}

//                 <div className="mb-6 flex justify-between items-center">
//                     <div className="flex gap-4">
//                         <button
//                             onClick={() => navigate('/admin/restaurant/tags')}
//                             className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
//                         >
//                             <Tag className="w-4 h-4" />
//                             Manage Tags
//                         </button>
//                         <button
//                             onClick={() => navigate('/admin/restaurant/options')}
//                             className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
//                         >
//                             Options & Add-ons
//                         </button>
//                     </div>

//                     <button
//                         onClick={() => setShowNewCategoryForm(true)}
//                         className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
//                     >
//                         <Plus className="w-5 h-5" />
//                         Add Category
//                     </button>
//                 </div>

//                 <div className="space-y-4">
//                     {showNewCategoryForm && <NewCategoryForm />}

//                     {categories
//                         .sort((a, b) => a.sort_order - b.sort_order)
//                         .map((category) => (
//                             <CategoryCard key={category.category_id} category={category} />
//                         ))}

//                     {categories.length === 0 && !showNewCategoryForm && (
//                         <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
//                             <p className="text-gray-500 mb-4">No menu categories yet</p>
//                             <button
//                                 onClick={() => setShowNewCategoryForm(true)}
//                                 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//                             >
//                                 Create your first category
//                             </button>
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// }




import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical, X, Save, ChevronDown, ChevronRight, DollarSign, Clock, Tag, AlertCircle, Loader2, Layers, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { useNavigate } from 'react-router-dom';

// Types
interface Tag {
    tag_id: string;
    name: string;
    color?: string;
    icon?: string;
}

interface MenuItem {
    item_id: string;
    name: string;
    display_name?: string;
    price: number;
    description?: string;
    is_active: boolean;
    is_available: boolean;
    tags?: string[];
    preparation_time_minutes?: number;
    sort_order?: number;
    subcategory_id?: string;
}

interface Subcategory {
    subcategory_id: string;
    category_id: string;
    name: string;
    display_name?: string;
    sort_order: number;
    is_active: boolean;
    items: MenuItem[];
}

interface Category {
    category_id: string;
    name: string;
    display_name?: string;
    sort_order: number;
    is_active: boolean;
    items: MenuItem[];
    subcategories?: Subcategory[];
}

// Constants
const TAG_COLORS: Record<string, string> = {
    'Popular': 'bg-blue-100 text-blue-800',
    'Vegetarian': 'bg-green-100 text-green-800',
    'Spicy': 'bg-red-100 text-red-800',
    'Gluten-Free': 'bg-yellow-100 text-yellow-800',
    'Raw': 'bg-purple-100 text-purple-800'
};

export default function MenuManagement() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();

    // State
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    // UI State
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
    const [showNewItemForm, setShowNewItemForm] = useState<string | null>(null);
    const [showNewSubcategoryForm, setShowNewSubcategoryForm] = useState<string | null>(null);

    // Drag state
    const [draggedItem, setDraggedItem] = useState<any>(null);
    const [draggedCategory, setDraggedCategory] = useState<any>(null);
    const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
    const [dragOverSubcategory, setDragOverSubcategory] = useState<string | null>(null);

    useEffect(() => {
        if (selectedOrganization?.id) {
            fetchRestaurantData();
        }
    }, [selectedOrganization]);

    const fetchRestaurantData = async () => {
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

            const [categoriesResult, subcategoriesResult, itemsResult, tagsResult] = await Promise.all([
                supabase.from('menu_categories').select('*').eq('restaurant_id', restaurant.restaurant_id).order('sort_order'),
                supabase.from('menu_subcategories').select('*').eq('restaurant_id', restaurant.restaurant_id).order('sort_order'),
                supabase.from('menu_items').select('*').eq('restaurant_id', restaurant.restaurant_id).order('sort_order'),
                supabase.from('tags').select('*').eq('restaurant_id', restaurant.restaurant_id).order('created_at')
            ]);

            if (categoriesResult.error) throw categoriesResult.error;
            if (subcategoriesResult.error) throw subcategoriesResult.error;
            if (itemsResult.error) throw itemsResult.error;
            if (tagsResult.error) throw tagsResult.error;

            setTags(tagsResult.data || []);

            // Fetch item-tag relationships
            let itemTagsResult = { data: [], error: null };
            if (itemsResult.data && itemsResult.data.length > 0) {
                itemTagsResult = await supabase
                    .from('menu_item_tags')
                    .select(`
                        item_id,
                        tag_id,
                        tag:tags(tag_id, name, color)
                    `)
                    .in('item_id', itemsResult.data.map(item => item.item_id));

                if (itemTagsResult.error) throw itemTagsResult.error;
            }

            // Build data structure with tags
            const itemTagsMap: Record<string, string[]> = {};
            const itemTagIdsMap: Record<string, string[]> = {};

            itemTagsResult.data?.forEach(({ item_id, tag_id, tag }) => {
                if (!itemTagsMap[item_id]) itemTagsMap[item_id] = [];
                if (!itemTagIdsMap[item_id]) itemTagIdsMap[item_id] = [];

                if (tag?.name) itemTagsMap[item_id].push(tag.name);
                if (tag_id) itemTagIdsMap[item_id].push(tag_id);
            });

            const itemsByCategory: Record<string, MenuItem[]> = {};
            const itemsBySubcategory: Record<string, MenuItem[]> = {};

            itemsResult.data?.forEach(item => {
                const itemWithTags = {
                    ...item,
                    tags: itemTagsMap[item.item_id] || [],
                    tag_ids: itemTagIdsMap[item.item_id] || []
                };

                if (item.subcategory_id) {
                    if (!itemsBySubcategory[item.subcategory_id]) itemsBySubcategory[item.subcategory_id] = [];
                    itemsBySubcategory[item.subcategory_id].push(itemWithTags);
                } else {
                    if (!itemsByCategory[item.category_id]) itemsByCategory[item.category_id] = [];
                    itemsByCategory[item.category_id].push(itemWithTags);
                }
            });

            const subcategoriesByCategory: Record<string, Subcategory[]> = {};
            subcategoriesResult.data?.forEach(subcategory => {
                if (!subcategoriesByCategory[subcategory.category_id]) {
                    subcategoriesByCategory[subcategory.category_id] = [];
                }
                subcategoriesByCategory[subcategory.category_id].push({
                    ...subcategory,
                    items: itemsBySubcategory[subcategory.subcategory_id] || []
                });
            });

            const processedCategories = (categoriesResult.data || []).map(category => ({
                ...category,
                items: itemsByCategory[category.category_id] || [],
                subcategories: subcategoriesByCategory[category.category_id] || []
            }));

            setCategories(processedCategories);
            setExpandedCategories(new Set(processedCategories.map(c => c.category_id)));
        } catch (err) {
            console.error('Error fetching menu data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load menu data');
        } finally {
            setLoading(false);
        }
    };

    // Utility functions
    const updateItemSortOrders = async (items: MenuItem[], categoryId?: string, subcategoryId?: string) => {
        const updates = items.map((item, index) => ({
            item_id: item.item_id,
            sort_order: index
        }));

        for (const update of updates) {
            await supabase
                .from('menu_items')
                .update({ sort_order: update.sort_order })
                .eq('item_id', update.item_id);
        }
    };

    const findItemInCategories = (itemId: string): { categoryIndex: number; subcategoryIndex?: number; itemIndex: number } | null => {
        for (let catIndex = 0; catIndex < categories.length; catIndex++) {
            const category = categories[catIndex];

            // Check direct items
            const directItemIndex = category.items.findIndex(item => item.item_id === itemId);
            if (directItemIndex !== -1) {
                return { categoryIndex: catIndex, itemIndex: directItemIndex };
            }

            // Check subcategory items
            if (category.subcategories) {
                for (let subIndex = 0; subIndex < category.subcategories.length; subIndex++) {
                    const subcategory = category.subcategories[subIndex];
                    const subItemIndex = subcategory.items.findIndex(item => item.item_id === itemId);
                    if (subItemIndex !== -1) {
                        return { categoryIndex: catIndex, subcategoryIndex: subIndex, itemIndex: subItemIndex };
                    }
                }
            }
        }
        return null;
    };

    // Drag and Drop Handlers
    const handleCategoryDragStart = (e: React.DragEvent, category: Category) => {
        setDraggedCategory(category);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleCategoryDrop = async (e: React.DragEvent, targetCategory: Category) => {
        e.preventDefault();
        if (!draggedCategory || draggedCategory.category_id === targetCategory.category_id) return;

        const newCategories = [...categories];
        const draggedIndex = newCategories.findIndex(c => c.category_id === draggedCategory.category_id);
        const targetIndex = newCategories.findIndex(c => c.category_id === targetCategory.category_id);

        // Optimistic update
        newCategories.splice(draggedIndex, 1);
        newCategories.splice(targetIndex, 0, draggedCategory);
        setCategories(newCategories);

        // Update database
        try {
            const updates = newCategories.map((cat, index) => ({
                category_id: cat.category_id,
                sort_order: index
            }));

            for (const update of updates) {
                await supabase
                    .from('menu_categories')
                    .update({ sort_order: update.sort_order })
                    .eq('category_id', update.category_id);
            }
        } catch (err) {
            console.error('Error updating category order:', err);
            fetchRestaurantData(); // Revert on error
        }

        setDraggedCategory(null);
        setDragOverCategory(null);
    };

    const handleItemDragStart = (e: React.DragEvent, item: MenuItem, categoryId: string, subcategoryId?: string) => {
        setDraggedItem({ item, categoryId, subcategoryId });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleItemDrop = async (e: React.DragEvent, targetCategoryId: string, targetSubcategoryId?: string) => {
        e.preventDefault();
        if (!draggedItem) return;

        const { item, categoryId: sourceCategoryId, subcategoryId: sourceSubcategoryId } = draggedItem;

        // If dropping in the same location, do nothing
        if (sourceCategoryId === targetCategoryId && sourceSubcategoryId === targetSubcategoryId) {
            setDraggedItem(null);
            return;
        }

        // Optimistic update
        const newCategories = [...categories];
        const sourceLocation = findItemInCategories(item.item_id);

        if (!sourceLocation) {
            setDraggedItem(null);
            return;
        }

        // Remove from source
        if (sourceLocation.subcategoryIndex !== undefined) {
            newCategories[sourceLocation.categoryIndex].subcategories![sourceLocation.subcategoryIndex].items.splice(sourceLocation.itemIndex, 1);
        } else {
            newCategories[sourceLocation.categoryIndex].items.splice(sourceLocation.itemIndex, 1);
        }

        // Add to target
        const targetCategoryIndex = newCategories.findIndex(c => c.category_id === targetCategoryId);
        if (targetCategoryIndex !== -1) {
            const updatedItem = { ...item, category_id: targetCategoryId, subcategory_id: targetSubcategoryId || null };

            if (targetSubcategoryId) {
                const targetSubcategoryIndex = newCategories[targetCategoryIndex].subcategories?.findIndex(s => s.subcategory_id === targetSubcategoryId);
                if (targetSubcategoryIndex !== undefined && targetSubcategoryIndex !== -1) {
                    newCategories[targetCategoryIndex].subcategories![targetSubcategoryIndex].items.push(updatedItem);
                }
            } else {
                newCategories[targetCategoryIndex].items.push(updatedItem);
            }
        }

        setCategories(newCategories);

        // Update database
        try {
            await supabase
                .from('menu_items')
                .update({
                    category_id: targetCategoryId,
                    subcategory_id: targetSubcategoryId || null,
                    updated_at: new Date().toISOString()
                })
                .eq('item_id', item.item_id);

            // Update sort orders for both source and target containers
            const sourceCategory = categories.find(c => c.category_id === sourceCategoryId);
            const targetCategory = newCategories.find(c => c.category_id === targetCategoryId);

            if (sourceSubcategoryId && sourceCategory) {
                const sourceSubcategory = sourceCategory.subcategories?.find(s => s.subcategory_id === sourceSubcategoryId);
                if (sourceSubcategory) {
                    await updateItemSortOrders(sourceSubcategory.items, sourceCategoryId, sourceSubcategoryId);
                }
            } else if (sourceCategory) {
                await updateItemSortOrders(sourceCategory.items, sourceCategoryId);
            }

            if (targetSubcategoryId && targetCategory) {
                const targetSubcategory = targetCategory.subcategories?.find(s => s.subcategory_id === targetSubcategoryId);
                if (targetSubcategory) {
                    await updateItemSortOrders(targetSubcategory.items, targetCategoryId, targetSubcategoryId);
                }
            } else if (targetCategory) {
                await updateItemSortOrders(targetCategory.items, targetCategoryId);
            }

        } catch (err) {
            console.error('Error moving item:', err);
            setError('Failed to move item');
            fetchRestaurantData(); // Revert on error
        }

        setDraggedItem(null);
        setDragOverCategory(null);
        setDragOverSubcategory(null);
    };

    // CRUD Operations
    const deleteCategory = async (categoryId: string) => {
        if (!confirm('Are you sure you want to delete this category and all its items?')) return;

        try {
            await supabase.from('menu_categories').delete().eq('category_id', categoryId);
            setCategories(categories.filter(c => c.category_id !== categoryId));
        } catch (err) {
            console.error('Error deleting category:', err);
            setError('Failed to delete category');
        }
    };

    const deleteItem = async (itemId: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            await supabase.from('menu_items').delete().eq('item_id', itemId);

            // Optimistic update
            const newCategories = [...categories];
            const location = findItemInCategories(itemId);
            if (location) {
                if (location.subcategoryIndex !== undefined) {
                    newCategories[location.categoryIndex].subcategories![location.subcategoryIndex].items.splice(location.itemIndex, 1);
                } else {
                    newCategories[location.categoryIndex].items.splice(location.itemIndex, 1);
                }
                setCategories(newCategories);
            }
        } catch (err) {
            console.error('Error deleting item:', err);
            setError('Failed to delete item');
            fetchRestaurantData(); // Revert on error
        }
    };

    const toggleCategory = (categoryId: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    };

    // Loading and error states
    if (!selectedOrganization) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
                        Please select an organization to manage menus.
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
                    <p className="text-gray-600">Loading menu data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                <MenuHeader navigate={navigate} onAddCategory={() => setShowNewCategoryForm(true)} />

                {error && (
                    <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {showNewCategoryForm && (
                        <NewCategoryForm
                            restaurantId={restaurantId}
                            categories={categories}
                            onSave={(newCategory) => {
                                setCategories([...categories, { ...newCategory, items: [], subcategories: [] }]);
                                setExpandedCategories(new Set([...expandedCategories, newCategory.category_id]));
                                setShowNewCategoryForm(false);
                            }}
                            onCancel={() => setShowNewCategoryForm(false)}
                            onError={setError}
                        />
                    )}

                    {categories.map((category) => (
                        <CategoryCard
                            key={category.category_id}
                            category={category}
                            expanded={expandedCategories.has(category.category_id)}
                            restaurantId={restaurantId}
                            tags={tags}  // Add this line
                            dragOverCategory={dragOverCategory}
                            dragOverSubcategory={dragOverSubcategory}
                            draggedItem={draggedItem}
                            showNewItemForm={showNewItemForm}
                            showNewSubcategoryForm={showNewSubcategoryForm}
                            onToggle={() => toggleCategory(category.category_id)}
                            onDelete={() => deleteCategory(category.category_id)}
                            onDeleteItem={deleteItem}
                            onUpdateCategories={setCategories}
                            onShowNewItemForm={setShowNewItemForm}
                            onShowNewSubcategoryForm={setShowNewSubcategoryForm}
                            onCategoryDragStart={handleCategoryDragStart}
                            onCategoryDrop={handleCategoryDrop}
                            onItemDragStart={handleItemDragStart}
                            onItemDrop={handleItemDrop}
                            onSetDragOverCategory={setDragOverCategory}
                            onSetDragOverSubcategory={setDragOverSubcategory}
                            onError={setError}
                        />
                    ))}

                    {categories.length === 0 && !showNewCategoryForm && (
                        <EmptyState onAddCategory={() => setShowNewCategoryForm(true)} />
                    )}
                </div>
            </div>
        </div>
    );
}

// Sub-components
const MenuHeader = ({ navigate, onAddCategory }: { navigate: any, onAddCategory: () => void }) => (
    <>
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
            <p className="text-gray-600 mt-2">Organize your menu with drag and drop. Create categories, subcategories, and items.</p>
            <div className="mt-3 flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-500" />
                    <span>Subcategory</span>
                </div>
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span>Menu Item</span>
                </div>
            </div>
        </div>

        <div className="mb-6 flex justify-between items-center">
            <div className="flex gap-4">
                <button
                    onClick={() => navigate('/admin/restaurant/tags')}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                >
                    <Tag className="w-4 h-4" />
                    Manage Tags
                </button>
                <button
                    onClick={() => navigate('/admin/restaurant/options')}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                >
                    Options & Add-ons
                </button>
            </div>

            <button
                onClick={onAddCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
                <Plus className="w-5 h-5" />
                Add Category
            </button>
        </div>
    </>
);

const EmptyState = ({ onAddCategory }: { onAddCategory: () => void }) => (
    <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500 mb-4">No menu categories yet</p>
        <button
            onClick={onAddCategory}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
            Create your first category
        </button>
    </div>
);

const NewCategoryForm = ({ restaurantId, categories, onSave, onCancel, onError }: any) => {
    const [name, setName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [creating, setCreating] = useState(false);

    const handleSubmit = async () => {
        if (!name) {
            alert('Please enter a category name');
            return;
        }

        try {
            setCreating(true);
            const { data, error } = await supabase
                .from('menu_categories')
                .insert({
                    restaurant_id: restaurantId,
                    name,
                    display_name: displayName || name,
                    sort_order: categories.length,
                    is_active: true,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            onSave(data);
        } catch (err) {
            console.error('Error creating category:', err);
            onError('Failed to create category');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border-2 border-blue-500 p-4">
            <h3 className="font-medium text-gray-900 mb-3">New Category</h3>
            <div className="space-y-3">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Category Name *"
                />
                <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Display Name (optional)"
                />
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        disabled={creating}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={creating}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                        Add Category
                    </button>
                </div>
            </div>
        </div>
    );
};

// Continue with CategoryCard and other components...
const CategoryCard = ({ category, expanded, restaurantId, dragOverCategory, tags, onToggle, onDelete, onCategoryDragStart, onCategoryDrop, onSetDragOverCategory, ...props }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(category.name);
    const [editedDisplayName, setEditedDisplayName] = useState(category.display_name || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        try {
            setSaving(true);
            const { error } = await supabase
                .from('menu_categories')
                .update({
                    name: editedName,
                    display_name: editedDisplayName || editedName,
                    updated_at: new Date().toISOString()
                })
                .eq('category_id', category.category_id);

            if (error) throw error;

            // Optimistic update
            props.onUpdateCategories((prev: Category[]) =>
                prev.map(c => c.category_id === category.category_id
                    ? { ...c, name: editedName, display_name: editedDisplayName || editedName }
                    : c
                )
            );
            setIsEditing(false);
        } catch (err) {
            console.error('Error updating category:', err);
            props.onError('Failed to update category');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            draggable
            onDragStart={(e) => onCategoryDragStart(e, category)}
            onDragEnd={() => onSetDragOverCategory(null)}
            onDragOver={(e) => {
                e.preventDefault();
                onSetDragOverCategory(category.category_id);
            }}
            onDrop={(e) => onCategoryDrop(e, category)}
            onDragLeave={() => onSetDragOverCategory(null)}
            className={`bg-white rounded-lg shadow-sm border-2 transition-all ${dragOverCategory === category.category_id ? 'border-blue-500 shadow-lg' : 'border-gray-200'
                }`}
        >
            <div className="p-4">
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3 flex-1">
                        <GripVertical className="w-5 h-5 text-gray-400 cursor-move opacity-0 group-hover:opacity-100 transition-opacity" />

                        <button onClick={onToggle} className="p-1 hover:bg-gray-100 rounded transition-colors">
                            {expanded ? (
                                <ChevronDown className="w-5 h-5 text-gray-600" />
                            ) : (
                                <ChevronRight className="w-5 h-5 text-gray-600" />
                            )}
                        </button>

                        {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Category Name"
                                />
                                <input
                                    type="text"
                                    value={editedDisplayName}
                                    onChange={(e) => setEditedDisplayName(e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Display Name (optional)"
                                />
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {category.display_name || category.name}
                                    {category.display_name && category.display_name !== category.name && (
                                        <span className="text-sm font-normal text-gray-500 ml-2">({category.name})</span>
                                    )}
                                </h3>
                                <span className="text-sm text-gray-500 ml-auto mr-4">
                                    {category.subcategories && category.subcategories.length > 0 && (
                                        <span>{category.subcategories.length} subcategories, </span>
                                    )}
                                    {category.items.length + (category.subcategories?.reduce((sum: number, sub: Subcategory) => sum + sub.items.length, 0) || 0)} items
                                </span>
                            </>
                        )}
                    </div>

                    {!isEditing && (
                        <CategoryActions
                            category={category}
                            onShowNewSubcategoryForm={props.onShowNewSubcategoryForm}
                            onShowNewItemForm={props.onShowNewItemForm}
                            onEdit={() => setIsEditing(true)}
                            onDelete={onDelete}
                        />
                    )}
                </div>
            </div>

            {expanded && (
                <CategoryContent
                    category={category}
                    restaurantId={restaurantId}
                    tags={tags}  // Pass tags to CategoryContent
                    {...props}
                />
            )}
        </div>
    );
};

const CategoryActions = ({ category, onShowNewSubcategoryForm, onShowNewItemForm, onEdit, onDelete }: any) => (
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
            onClick={() => onShowNewSubcategoryForm(category.category_id)}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
            title="Add Subcategory"
        >
            <Layers className="w-4 h-4" />
        </button>
        <button
            onClick={() => onShowNewItemForm(category.category_id)}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
            title="Add Item"
        >
            <Plus className="w-4 h-4" />
        </button>
        <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
        >
            <Edit2 className="w-4 h-4" />
        </button>
        <button
            onClick={() => onDelete(category.category_id)}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
            <Trash2 className="w-4 h-4" />
        </button>
    </div>
);

const CategoryContent = ({ category, restaurantId, showNewSubcategoryForm, showNewItemForm, onShowNewSubcategoryForm, onShowNewItemForm, onUpdateCategories, onError, tags, ...props }: any) => (
    <div className="px-4 pb-4">
        <div className="space-y-3">
            {showNewSubcategoryForm === category.category_id && (
                <NewSubcategoryForm
                    categoryId={category.category_id}
                    restaurantId={restaurantId}
                    subcategoriesLength={category.subcategories?.length || 0}
                    onSave={(newSubcategory: Subcategory) => {
                        onUpdateCategories((prev: Category[]) =>
                            prev.map(c => c.category_id === category.category_id
                                ? {
                                    ...c,
                                    subcategories: [...(c.subcategories || []), { ...newSubcategory, items: [] }]
                                }
                                : c
                            )
                        );
                        onShowNewSubcategoryForm(null);
                    }}
                    onCancel={() => onShowNewSubcategoryForm(null)}
                    onError={onError}
                />
            )}

            {showNewItemForm === category.category_id && (
                <NewItemForm
                    categoryId={category.category_id}
                    subcategoryId={null}
                    restaurantId={restaurantId}
                    itemsLength={category.items.length}
                    availableTags={tags}  // Use tags prop here
                    onSave={(newItem: MenuItem) => {
                        onUpdateCategories((prev: Category[]) =>
                            prev.map(c => c.category_id === category.category_id
                                ? { ...c, items: [...c.items, { ...newItem, tags: [] }] }
                                : c
                            )
                        );
                        onShowNewItemForm(null);
                    }}
                    onCancel={() => onShowNewItemForm(null)}
                    onError={onError}
                />
            )}

            {/* Render subcategories and items */}
            <SubcategoriesSection
                category={category}
                restaurantId={restaurantId}
                tags={tags}  // Pass tags to SubcategoriesSection
                onUpdateCategories={onUpdateCategories}
                onError={onError}
                {...props}
            />

            <DirectItemsSection
                category={category}
                tags={tags}  // Pass tags to DirectItemsSection
                onDeleteItem={props.onDeleteItem}
                onItemDragStart={props.onItemDragStart}
                onItemDrop={props.onItemDrop}
                draggedItem={props.draggedItem}
                onUpdateCategories={onUpdateCategories}
                onError={onError}
            />

            {category.items.length === 0 && (!category.subcategories || category.subcategories.length === 0) &&
                showNewItemForm !== category.category_id && showNewSubcategoryForm !== category.category_id && (
                    <EmptyCategory
                        onAddSubcategory={() => onShowNewSubcategoryForm(category.category_id)}
                        onAddItem={() => onShowNewItemForm(category.category_id)}
                    />
                )}
        </div>
    </div>
);
// Updated MenuItemCard component with tag functionality
const MenuItemCard = ({ item, categoryId, subcategoryId, onDelete, onDragStart, onUpdateCategories, onError, availableTags }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedItem, setEditedItem] = useState(item);
    const [saving, setSaving] = useState(false);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>(item.tag_ids || []);

    const handleSave = async () => {
        try {
            setSaving(true);

            // Update menu item basic info
            const { error: itemError } = await supabase
                .from('menu_items')
                .update({
                    name: editedItem.name,
                    display_name: editedItem.display_name || editedItem.name,
                    price: editedItem.price,
                    description: editedItem.description,
                    preparation_time_minutes: editedItem.preparation_time_minutes,
                    updated_at: new Date().toISOString()
                })
                .eq('item_id', item.item_id);

            if (itemError) throw itemError;

            // Update tags - first delete existing tags
            const { error: deleteError } = await supabase
                .from('menu_item_tags')
                .delete()
                .eq('item_id', item.item_id);

            if (deleteError) throw deleteError;

            // Insert new tags
            if (selectedTagIds.length > 0) {
                const tagInserts = selectedTagIds.map(tagId => ({
                    item_id: item.item_id,
                    tag_id: tagId
                }));

                const { error: insertError } = await supabase
                    .from('menu_item_tags')
                    .insert(tagInserts);

                if (insertError) throw insertError;
            }

            // Update local state with tags
            const updatedItem = {
                ...editedItem,
                tag_ids: selectedTagIds,
                tags: availableTags.filter((tag: any) => selectedTagIds.includes(tag.tag_id)).map((tag: any) => tag.name)
            };

            // Optimistic update
            onUpdateCategories((prev: Category[]) =>
                prev.map(category => {
                    if (category.category_id === categoryId) {
                        if (subcategoryId) {
                            return {
                                ...category,
                                subcategories: category.subcategories?.map(sub =>
                                    sub.subcategory_id === subcategoryId
                                        ? {
                                            ...sub,
                                            items: sub.items.map(i => i.item_id === item.item_id ? updatedItem : i)
                                        }
                                        : sub
                                ) || []
                            };
                        } else {
                            return {
                                ...category,
                                items: category.items.map(i => i.item_id === item.item_id ? updatedItem : i)
                            };
                        }
                    }
                    return category;
                })
            );

            setIsEditing(false);
        } catch (err) {
            console.error('Error updating item:', err);
            onError('Failed to update item');
        } finally {
            setSaving(false);
        }
    };

    const toggleAvailability = async () => {
        try {
            const newAvailability = !item.is_available;
            await supabase
                .from('menu_items')
                .update({
                    is_available: newAvailability,
                    updated_at: new Date().toISOString()
                })
                .eq('item_id', item.item_id);

            // Optimistic update
            onUpdateCategories((prev: Category[]) =>
                prev.map(category => {
                    if (category.category_id === categoryId) {
                        if (subcategoryId) {
                            return {
                                ...category,
                                subcategories: category.subcategories?.map(sub =>
                                    sub.subcategory_id === subcategoryId
                                        ? {
                                            ...sub,
                                            items: sub.items.map(i => i.item_id === item.item_id ? { ...i, is_available: newAvailability } : i)
                                        }
                                        : sub
                                ) || []
                            };
                        } else {
                            return {
                                ...category,
                                items: category.items.map(i => i.item_id === item.item_id ? { ...i, is_available: newAvailability } : i)
                            };
                        }
                    }
                    return category;
                })
            );
        } catch (err) {
            console.error('Error updating availability:', err);
        }
    };

    if (isEditing) {
        return (
            <div className="bg-white p-4 rounded-lg border-2 border-blue-500 shadow-lg">
                <div className="space-y-3">
                    <input
                        type="text"
                        value={editedItem.name}
                        onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Item Name"
                    />
                    <input
                        type="text"
                        value={editedItem.display_name || ''}
                        onChange={(e) => setEditedItem({ ...editedItem, display_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Display Name (optional)"
                    />
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={editedItem.price}
                            onChange={(e) => setEditedItem({ ...editedItem, price: parseFloat(e.target.value) || 0 })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Price"
                            step="0.01"
                        />
                        <input
                            type="number"
                            value={editedItem.preparation_time_minutes || ''}
                            onChange={(e) => setEditedItem({ ...editedItem, preparation_time_minutes: parseInt(e.target.value) || undefined })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Prep Time (min)"
                        />
                    </div>
                    <textarea
                        value={editedItem.description || ''}
                        onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Description"
                        rows={3}
                    />

                    {/* Tag Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                        <TagSelector
                            selectedTags={selectedTagIds}
                            availableTags={availableTags}
                            onTagsChange={setSelectedTagIds}
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, item, categoryId, subcategoryId)}
            onDragEnd={() => { }}
            className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-move group"
        >
            <div className="flex items-start gap-3">
                <GripVertical className="w-5 h-5 text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex-1">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                                {item.display_name || item.name}
                                {item.display_name && item.display_name !== item.name && (
                                    <span className="text-sm text-gray-500 ml-2">({item.name})</span>
                                )}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>

                            <div className="flex items-center gap-4 mt-2">
                                <span className="flex items-center text-green-600 font-medium">
                                    <DollarSign className="w-4 h-4" />
                                    {item.price.toFixed(2)}
                                </span>

                                {item.preparation_time_minutes && (
                                    <span className="flex items-center text-sm text-gray-500">
                                        <Clock className="w-4 h-4 mr-1" />
                                        {item.preparation_time_minutes} min
                                    </span>
                                )}
                            </div>

                            {/* Display Tags */}
                            {(item.tags && item.tags.length > 0) && (
                                <div className="mt-2">
                                    <TagSelector
                                        selectedTags={item.tag_ids || []}
                                        availableTags={availableTags}
                                        onTagsChange={() => { }}
                                        disabled={true}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => {
                                    setSelectedTagIds(item.tag_ids || []);
                                    setIsEditing(true);
                                }}
                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onDelete(item.item_id)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={item.is_available}
                                onChange={toggleAvailability}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            Available
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Add remaining components (NewSubcategoryForm, NewItemForm, etc.)
const NewSubcategoryForm = ({ categoryId, restaurantId, subcategoriesLength, onSave, onCancel, onError }: any) => {
    const [name, setName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [creating, setCreating] = useState(false);

    const handleSubmit = async () => {
        if (!name) {
            alert('Please enter a subcategory name');
            return;
        }

        try {
            setCreating(true);
            const { data, error } = await supabase
                .from('menu_subcategories')
                .insert({
                    restaurant_id: restaurantId,
                    category_id: categoryId,
                    name,
                    display_name: displayName || name,
                    sort_order: subcategoriesLength,
                    is_active: true,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            onSave(data);
        } catch (err) {
            console.error('Error creating subcategory:', err);
            onError('Failed to create subcategory');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
            <h4 className="font-medium text-gray-900 mb-3">New Subcategory</h4>
            <div className="space-y-3">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Subcategory Name *"
                />
                <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Display Name (optional)"
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={creating}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                        Add Subcategory
                    </button>
                </div>
            </div>
        </div>
    );
};

const NewItemForm = ({ categoryId, subcategoryId, restaurantId, itemsLength, availableTags, onSave, onCancel, onError }: any) => {
    const [name, setName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [preparationTime, setPreparationTime] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [creating, setCreating] = useState(false);

    const handleSubmit = async () => {
        if (!name || !price) {
            alert('Please fill in required fields');
            return;
        }

        try {
            setCreating(true);

            // Create the item first
            const { data, error } = await supabase
                .from('menu_items')
                .insert({
                    restaurant_id: restaurantId,
                    category_id: categoryId,
                    subcategory_id: subcategoryId,
                    name,
                    display_name: displayName || name,
                    price: parseFloat(price),
                    description,
                    preparation_time_minutes: preparationTime ? parseInt(preparationTime) : null,
                    is_active: true,
                    is_available: true,
                    sort_order: itemsLength,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Add tags if selected
            if (selectedTagIds.length > 0) {
                const tagInserts = selectedTagIds.map(tagId => ({
                    item_id: data.item_id,
                    tag_id: tagId
                }));

                const { error: tagError } = await supabase
                    .from('menu_item_tags')
                    .insert(tagInserts);

                if (tagError) throw tagError;
            }

            // Add tag info to the item data for optimistic update
            const itemWithTags = {
                ...data,
                tag_ids: selectedTagIds,
                tags: availableTags.filter((tag: any) => selectedTagIds.includes(tag.tag_id)).map((tag: any) => tag.name)
            };

            onSave(itemWithTags);
        } catch (err) {
            console.error('Error creating item:', err);
            onError('Failed to create item');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
            <h4 className="font-medium text-gray-900 mb-3">New Menu Item</h4>
            <div className="space-y-3">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Item Name *"
                />
                <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Display Name (optional)"
                />
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Price *"
                        step="0.01"
                    />
                    <input
                        type="number"
                        value={preparationTime}
                        onChange={(e) => setPreparationTime(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Prep Time (min)"
                    />
                </div>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Description"
                    rows={2}
                />

                {/* Tag Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    <TagSelector
                        selectedTags={selectedTagIds}
                        availableTags={availableTags}
                        onTagsChange={setSelectedTagIds}
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={creating}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                        Add Item
                    </button>
                </div>
            </div>
        </div>
    );
};

// Placeholder components for the sections (implement these based on your needs)
const SubcategoriesSection = ({ category, tags, ...props }: any) => {
    if (!category.subcategories || category.subcategories.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                <Layers className="w-4 h-4" />
                <span>Subcategories</span>
            </div>
            <div className="ml-4 space-y-3">
                {category.subcategories.map((subcategory: Subcategory) => (
                    <SubcategoryCard
                        key={subcategory.subcategory_id}
                        subcategory={subcategory}
                        categoryId={category.category_id}
                        tags={tags}  // Pass tags to SubcategoryCard
                        {...props}
                    />
                ))}
            </div>
        </div>
    );
};

const SubcategoryCard = ({ subcategory, categoryId, restaurantId, tags, onUpdateCategories, onError, onDeleteItem, onItemDragStart, dragOverSubcategory, onSetDragOverSubcategory, onItemDrop }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(subcategory.name);
    const [editedDisplayName, setEditedDisplayName] = useState(subcategory.display_name || '');
    const [saving, setSaving] = useState(false);
    const [showNewItemForm, setShowNewItemForm] = useState(false);

    const handleSave = async () => {
        try {
            setSaving(true);
            const { error } = await supabase
                .from('menu_subcategories')
                .update({
                    name: editedName,
                    display_name: editedDisplayName || editedName,
                    updated_at: new Date().toISOString()
                })
                .eq('subcategory_id', subcategory.subcategory_id);

            if (error) throw error;

            onUpdateCategories((prev: Category[]) =>
                prev.map(cat =>
                    cat.category_id === categoryId
                        ? {
                            ...cat,
                            subcategories: cat.subcategories?.map(sub =>
                                sub.subcategory_id === subcategory.subcategory_id
                                    ? { ...sub, name: editedName, display_name: editedDisplayName || editedName }
                                    : sub
                            )
                        }
                        : cat
                )
            );
            setIsEditing(false);
        } catch (err) {
            console.error('Error updating subcategory:', err);
            onError('Failed to update subcategory');
        } finally {
            setSaving(false);
        }
    };

    const deleteSubcategory = async () => {
        if (!confirm('Are you sure you want to delete this subcategory and all its items?')) return;

        try {
            const { error } = await supabase
                .from('menu_subcategories')
                .delete()
                .eq('subcategory_id', subcategory.subcategory_id);

            if (error) throw error;

            onUpdateCategories((prev: Category[]) =>
                prev.map(cat =>
                    cat.category_id === categoryId
                        ? {
                            ...cat,
                            subcategories: cat.subcategories?.filter(sub => sub.subcategory_id !== subcategory.subcategory_id)
                        }
                        : cat
                )
            );
        } catch (err) {
            console.error('Error deleting subcategory:', err);
            onError('Failed to delete subcategory');
        }
    };

    return (
        <div className={`bg-gray-50 rounded-lg p-4 border transition-all ${dragOverSubcategory === subcategory.subcategory_id ? 'border-purple-500 border-2 shadow-lg' : 'border-gray-200'
            }`}>
            <div className="flex items-center justify-between group mb-3">
                {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                        <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Subcategory Name"
                        />
                        <input
                            type="text"
                            value={editedDisplayName}
                            onChange={(e) => setEditedDisplayName(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Display Name (optional)"
                        />
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-purple-500" />
                            <h4 className="font-medium text-gray-800">
                                {subcategory.display_name || subcategory.name}
                                {subcategory.display_name && subcategory.display_name !== subcategory.name && (
                                    <span className="text-sm font-normal text-gray-500 ml-2">({subcategory.name})</span>
                                )}
                            </h4>
                            <span className="text-sm text-gray-500 ml-2">
                                {subcategory.items.length} items
                            </span>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => setShowNewItemForm(true)}
                                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                title="Add Item"
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
                                onClick={deleteSubcategory}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {showNewItemForm && (
                <div className="mb-3">
                    <NewItemForm
                        categoryId={categoryId}
                        subcategoryId={subcategory.subcategory_id}
                        restaurantId={restaurantId}
                        itemsLength={subcategory.items.length}
                        availableTags={tags}  // Use tags prop instead of global tags
                        onSave={(newItem: MenuItem) => {
                            onUpdateCategories((prev: Category[]) =>
                                prev.map(cat =>
                                    cat.category_id === categoryId
                                        ? {
                                            ...cat,
                                            subcategories: cat.subcategories?.map(sub =>
                                                sub.subcategory_id === subcategory.subcategory_id
                                                    ? { ...sub, items: [...sub.items, { ...newItem, tags: [] }] }
                                                    : sub
                                            )
                                        }
                                        : cat
                                )
                            );
                            setShowNewItemForm(false);
                        }}
                        onCancel={() => setShowNewItemForm(false)}
                        onError={onError}
                    />
                </div>
            )}

            <div
                className="space-y-2"
                onDragOver={(e) => {
                    e.preventDefault();
                    onSetDragOverSubcategory(subcategory.subcategory_id);
                }}
                onDragLeave={() => onSetDragOverSubcategory(null)}
                onDrop={(e) => {
                    onItemDrop(e, categoryId, subcategory.subcategory_id);
                    onSetDragOverSubcategory(null);
                }}
            >
                {subcategory.items.map((item: MenuItem, index: number) => (
                    <MenuItemCard
                        key={item.item_id}
                        item={item}
                        categoryId={categoryId}
                        subcategoryId={subcategory.subcategory_id}
                        index={index}
                        availableTags={tags}  // Use tags prop instead of global tags
                        onDelete={onDeleteItem}
                        onDragStart={onItemDragStart}
                        onUpdateCategories={onUpdateCategories}
                        onError={onError}
                    />
                ))}

                {subcategory.items.length === 0 && !showNewItemForm && (
                    <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded">
                        <p className="text-sm">No items in this subcategory</p>
                        <button
                            onClick={() => setShowNewItemForm(true)}
                            className="mt-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Add first item
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


const DirectItemsSection = ({ category, tags, onDeleteItem, onItemDragStart, onItemDrop, draggedItem, onUpdateCategories, onError }: any) => {
    if (category.items.length === 0 && (!category.subcategories || category.subcategories.length === 0)) return null;

    return (
        <div className="space-y-3">
            {category.subcategories && category.subcategories.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                    <FileText className="w-4 h-4" />
                    <span>Direct Items (not in subcategory)</span>
                </div>
            )}
            <div className={category.subcategories && category.subcategories.length > 0 ? "ml-4 space-y-3" : "space-y-3"}>
                {category.items.map((item, index) => (
                    <MenuItemCard
                        key={item.item_id}
                        item={item}
                        categoryId={category.category_id}
                        subcategoryId={undefined}
                        index={index}
                        availableTags={tags}  // Use tags prop instead of global tags
                        onDelete={onDeleteItem}
                        onDragStart={onItemDragStart}
                        onUpdateCategories={onUpdateCategories}
                        onError={onError}
                    />
                ))}

                {category.subcategories && category.subcategories.length > 0 && category.items.length === 0 && (
                    <div
                        className={`border-2 border-dashed rounded-lg p-4 text-center text-sm transition-all ${draggedItem ? 'border-gray-400 bg-gray-50' : 'border-gray-300'
                            }`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onItemDrop(e, category.category_id)}
                    >
                        <span className={draggedItem ? 'text-gray-700 font-medium' : 'text-gray-500'}>
                            Drop items here to add directly to category
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};


const EmptyCategory = ({ onAddSubcategory, onAddItem }: { onAddSubcategory: () => void, onAddItem: () => void }) => (
    <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
        <p>No items or subcategories in this category</p>
        <div className="mt-2 flex justify-center gap-4">
            <button
                onClick={onAddSubcategory}
                className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
                <Layers className="w-4 h-4" />
                Add subcategory
            </button>
            <span className="text-gray-400">or</span>
            <button
                onClick={onAddItem}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
                <Plus className="w-4 h-4" />
                Add item
            </button>
        </div>
    </div>
);

// Add this TagSelector component to your MenuManagement file

// Tag Selector Component
const TagSelector = ({ selectedTags, availableTags, onTagsChange, disabled = false }: {
    selectedTags: string[];
    availableTags: any[];
    onTagsChange: (tags: string[]) => void;
    disabled?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const getColorClasses = (color?: string) => {
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

        const colorObj = TAG_COLORS.find(c => c.value === color);
        return colorObj || TAG_COLORS[9]; // Default to gray
    };

    const toggleTag = (tagId: string) => {
        if (selectedTags.includes(tagId)) {
            onTagsChange(selectedTags.filter(id => id !== tagId));
        } else {
            onTagsChange([...selectedTags, tagId]);
        }
    };

    const removeTag = (tagId: string) => {
        onTagsChange(selectedTags.filter(id => id !== tagId));
    };

    const selectedTagObjects = availableTags.filter(tag => selectedTags.includes(tag.tag_id));
    const availableTagObjects = availableTags.filter(tag => !selectedTags.includes(tag.tag_id));

    if (disabled) {
        // Read-only display of tags
        return (
            <div className="flex flex-wrap gap-1">
                {selectedTagObjects.map((tag) => {
                    const colorClasses = getColorClasses(tag.color);
                    return (
                        <span
                            key={tag.tag_id}
                            className={`text-xs px-2 py-1 rounded-full ${colorClasses.bg} ${colorClasses.text}`}
                        >
                            {tag.name}
                        </span>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Selected Tags Display */}
            <div className="flex flex-wrap gap-1 mb-2">
                {selectedTagObjects.map((tag) => {
                    const colorClasses = getColorClasses(tag.color);
                    return (
                        <span
                            key={tag.tag_id}
                            className={`text-xs px-2 py-1 rounded-full ${colorClasses.bg} ${colorClasses.text} flex items-center gap-1`}
                        >
                            {tag.name}
                            <button
                                onClick={() => removeTag(tag.tag_id)}
                                className="hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    );
                })}
            </div>

            {/* Add Tag Button */}
            {availableTagObjects.length > 0 && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-1 text-xs px-2 py-1 border border-dashed border-gray-300 rounded-full text-gray-500 hover:border-gray-400 hover:text-gray-600"
                    >
                        <Plus className="w-3 h-3" />
                        Add Tag
                    </button>

                    {isOpen && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsOpen(false)}
                            />

                            {/* Dropdown */}
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-48 max-h-48 overflow-y-auto">
                                <div className="p-2">
                                    <div className="text-xs text-gray-500 mb-2 font-medium">Select tags:</div>
                                    {availableTagObjects.map((tag) => {
                                        const colorClasses = getColorClasses(tag.color);
                                        return (
                                            <button
                                                key={tag.tag_id}
                                                onClick={() => {
                                                    toggleTag(tag.tag_id);
                                                    setIsOpen(false);
                                                }}
                                                className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm flex items-center gap-2"
                                            >
                                                <span className={`px-2 py-1 rounded-full text-xs ${colorClasses.bg} ${colorClasses.text}`}>
                                                    {tag.name}
                                                </span>
                                                {tag.description && (
                                                    <span className="text-xs text-gray-500">{tag.description}</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
