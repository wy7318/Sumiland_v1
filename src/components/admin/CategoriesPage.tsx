import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tag, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

type Category = {
  id: string;
  name: string;
  category_type: 'Design' | 'Web' | 'Logo' | 'Branding' | 'Software' | 'Consulting';
  description: string | null;
  created_at: string;
  organization_id: string;
};

const CATEGORY_TYPES = ['Design', 'Web', 'Logo', 'Branding', 'Software', 'Consulting'] as const;

export function CategoriesPage() {
  const { organizations } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<Category['category_type']>('Design');
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<Category['category_type']>('Design');
  const [editDescription, setEditDescription] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    fetchCategories();
  }, [organizations]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .in('organization_id', organizations.map(org => org.id))
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    try {
      // Use the first organization if creating new category
      const organizationId = organizations[0]?.id;
      if (!organizationId) {
        throw new Error('No organization available');
      }

      const { error } = await supabase
        .from('product_categories')
        .insert([{
          name: newCategory.trim(),
          category_type: newCategoryType,
          description: newDescription.trim() || null,
          organization_id: organizationId,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      setNewCategory('');
      setNewDescription('');
      await fetchCategories();
    } catch (err) {
      console.error('Error adding category:', err);
      setError(err instanceof Error ? err.message : 'Failed to add category');
    }
  };

  const handleEditCategory = async (id: string) => {
    if (!editName.trim()) return;

    try {
      const categoryToEdit = categories.find(c => c.id === id);
      if (!categoryToEdit) return;

      // Verify organization access
      if (!organizations.some(org => org.id === categoryToEdit.organization_id)) {
        throw new Error('You do not have permission to edit this category');
      }

      const { error } = await supabase
        .from('product_categories')
        .update({ 
          name: editName.trim(),
          category_type: editType,
          description: editDescription.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('organization_id', categoryToEdit.organization_id);

      if (error) throw error;
      setEditingId(null);
      await fetchCategories();
    } catch (err) {
      console.error('Error updating category:', err);
      setError(err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      const categoryToDelete = categories.find(c => c.id === id);
      if (!categoryToDelete) return;

      // Verify organization access
      if (!organizations.some(org => org.id === categoryToDelete.organization_id)) {
        throw new Error('You do not have permission to delete this category');
      }

      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id)
        .eq('organization_id', categoryToDelete.organization_id);

      if (error) throw error;
      await fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center">
        Error loading categories: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Product Categories</h1>
        <Tag className="w-6 h-6 text-primary-500" />
      </div>

      <form onSubmit={handleAddCategory} className="mb-8 bg-white p-6 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="newCategory" className="block text-sm font-medium text-gray-700 mb-1">
              Category Name
            </label>
            <input
              id="newCategory"
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Enter category name"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>
          <div>
            <label htmlFor="newCategoryType" className="block text-sm font-medium text-gray-700 mb-1">
              Category Type
            </label>
            <select
              id="newCategoryType"
              value={newCategoryType}
              onChange={(e) => setNewCategoryType(e.target.value as Category['category_type'])}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              {CATEGORY_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="newDescription" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="newDescription"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Enter category description"
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newCategory.trim()}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            Add Category
          </button>
        </div>
      </form>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {categories.map((category) => (
            <motion.li
              key={category.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="hover:bg-gray-50"
            >
              <div className="px-4 py-4 sm:px-6">
                {editingId === category.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      />
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as Category['category_type'])}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      >
                        {CATEGORY_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEditCategory(category.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-full"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {category.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                          {category.category_type}
                        </span>
                        <span className="text-sm text-gray-500">
                          Created {new Date(category.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {category.description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingId(category.id);
                          setEditName(category.name);
                          setEditType(category.category_type);
                          setEditDescription(category.description || '');
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}