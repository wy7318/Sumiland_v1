import { useState, useEffect } from 'react';
import { X, CheckSquare, Save } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../contexts/OrganizationContext';

type WorkOrderChecklist = {
    id?: string;
    work_order_id: string;
    task_id: string | null;
    item_number: number;
    description: string;
    is_completed: boolean;
    completed_by: string | null;
    completed_at: string | null;
};

type WorkOrderTask = {
    id: string;
    task_number: number;
    title: string;
};

interface WorkOrderChecklistFormProps {
    workOrderId: string;
    item?: WorkOrderChecklist;
    itemCount?: number;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export function WorkOrderChecklistForm({
    workOrderId,
    item,
    itemCount = 0,
    isOpen,
    onClose,
    onSave
}: WorkOrderChecklistFormProps) {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const isEditMode = !!item?.id;

    // Form state
    const [formData, setFormData] = useState<WorkOrderChecklist>({
        work_order_id: workOrderId,
        task_id: null,
        item_number: itemCount + 1,
        description: '',
        is_completed: false,
        completed_by: null,
        completed_at: null
    });

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableTasks, setAvailableTasks] = useState<WorkOrderTask[]>([]);

    // Load item data if in edit mode
    useEffect(() => {
        if (isEditMode && item) {
            setFormData(item);
        }
    }, [item, isEditMode]);

    // Fetch available tasks for association
    useEffect(() => {
        if (isOpen) {
            fetchAvailableTasks();
        }
    }, [isOpen, workOrderId]);

    // Fetch available tasks
    const fetchAvailableTasks = async () => {
        try {
            const { data, error } = await supabase
                .from('work_order_tasks')
                .select('id, task_number, title')
                .eq('work_order_id', workOrderId)
                .order('task_number', { ascending: true });

            if (error) throw error;
            setAvailableTasks(data || []);
        } catch (err) {
            console.error('Error fetching available tasks:', err);
        }
    };

    // Handle form field changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle checkbox changes
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;

        if (name === 'is_completed') {
            // If being marked as completed, set the completion metadata
            if (checked) {
                setFormData(prev => ({
                    ...prev,
                    is_completed: checked,
                    completed_by: user?.id || null,
                    completed_at: new Date().toISOString()
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    is_completed: checked,
                    completed_by: null,
                    completed_at: null
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: checked
            }));
        }
    };

    // Handle numeric input changes
    const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: parseInt(value)
        }));
    };

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error('Not authenticated');

            // Prepare data for saving
            const checklistData = {
                ...formData,
                task_id: formData.task_id || null, // Ensure null if empty string
                organization_id: selectedOrganization?.id,
                updated_at: new Date().toISOString(),
                updated_by: userData.user.id
            };

            let result;

            if (isEditMode) {
                // Update existing checklist item
                result = await supabase
                    .from('work_order_checklists')
                    .update(checklistData)
                    .eq('id', item!.id);
            } else {
                // Create new checklist item
                result = await supabase
                    .from('work_order_checklists')
                    .insert([{
                        ...checklistData,
                        created_at: new Date().toISOString(),
                        created_by: userData.user.id
                    }]);
            }

            if (result.error) throw result.error;

            onSave();
            onClose();
        } catch (err) {
            console.error('Error saving checklist item:', err);
            setError(err instanceof Error ? err.message : 'Failed to save checklist item');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <CheckSquare className="w-6 h-6 text-indigo-500 mr-2" />
                        {isEditMode ? 'Edit Checklist Item' : 'Add Checklist Item'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Item Number */}
                        <div>
                            <label htmlFor="item_number" className="block text-sm font-medium text-gray-700 mb-1">
                                Item Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="item_number"
                                name="item_number"
                                type="number"
                                min="1"
                                value={formData.item_number}
                                onChange={handleNumericChange}
                                required
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                required
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                placeholder="Enter checklist item description"
                            />
                        </div>

                        {/* Associated Task */}
                        {availableTasks.length > 0 && (
                            <div>
                                <label htmlFor="task_id" className="block text-sm font-medium text-gray-700 mb-1">
                                    Associated Task
                                </label>
                                <select
                                    id="task_id"
                                    name="task_id"
                                    value={formData.task_id || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                >
                                    <option value="">Not associated with a specific task</option>
                                    {availableTasks.map(task => (
                                        <option key={task.id} value={task.id}>
                                            {task.task_number}. {task.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Completion Status */}
                        <div className="flex items-center">
                            <input
                                id="is_completed"
                                name="is_completed"
                                type="checkbox"
                                checked={formData.is_completed}
                                onChange={handleCheckboxChange}
                                className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="is_completed" className="ml-2 block text-sm text-gray-900">
                                Mark as completed
                            </label>
                        </div>

                        {/* Completion Information (read-only if completed) */}
                        {formData.is_completed && formData.completed_at && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="text-sm text-gray-500">
                                    Completed on {new Date(formData.completed_at).toLocaleString()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Form Actions */}
                    <div className="mt-8 flex items-center justify-end space-x-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Item
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}