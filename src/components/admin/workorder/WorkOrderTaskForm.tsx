import { useState, useEffect } from 'react';
import { X, ListChecks, Save, Clock, User } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { UserSearch } from '../UserSearch';

type WorkOrderTask = {
    id?: string;
    work_order_id: string;
    task_number: number;
    title: string;
    description: string | null;
    status: string;
    assigned_to: string | null;
    estimated_duration: number | null;
    actual_duration: number | null;
    start_time: string | null;
    end_time: string | null;
    dependencies: string[] | null;
};

interface WorkOrderTaskFormProps {
    workOrderId: string;
    task?: WorkOrderTask;
    taskCount?: number;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export function WorkOrderTaskForm({
    workOrderId,
    task,
    taskCount = 0,
    isOpen,
    onClose,
    onSave
}: WorkOrderTaskFormProps) {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const isEditMode = !!task?.id;

    // Form state
    const [formData, setFormData] = useState<WorkOrderTask>({
        work_order_id: workOrderId,
        task_number: taskCount + 1,
        title: '',
        description: null,
        status: 'pending',
        assigned_to: null,
        estimated_duration: null,
        actual_duration: null,
        start_time: null,
        end_time: null,
        dependencies: null
    });

    // Assignee state
    const [assignee, setAssignee] = useState<any>(null);

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableTasks, setAvailableTasks] = useState<WorkOrderTask[]>([]);
    const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);

    // Load task data if in edit mode
    useEffect(() => {
        if (isEditMode && task) {
            setFormData(task);
            setSelectedDependencies(task.dependencies || []);
            if (task.assigned_to) {
                fetchAssignee(task.assigned_to);
            }
        }
    }, [task, isEditMode]);

    // Fetch available tasks for dependencies
    useEffect(() => {
        if (isOpen) {
            fetchAvailableTasks();
        }
    }, [isOpen, workOrderId]);

    // Fetch assignee details
    const fetchAssignee = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name')
                .eq('id', userId)
                .single();

            if (error) throw error;

            if (data) {
                setAssignee(data);
            }
        } catch (err) {
            console.error('Error fetching assignee:', err);
        }
    };

    // Fetch available tasks for dependencies
    const fetchAvailableTasks = async () => {
        try {
            const { data, error } = await supabase
                .from('work_order_tasks')
                .select('id, task_number, title, status')
                .eq('work_order_id', workOrderId)
                .order('task_number', { ascending: true });

            if (error) throw error;

            // Filter out current task if editing
            const filteredTasks = isEditMode
                ? (data || []).filter(t => t.id !== task?.id)
                : (data || []);

            setAvailableTasks(filteredTasks);
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

    // Handle numeric input changes
    const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value === '' ? null : parseFloat(value)
        }));
    };

    // Handle assignee selection
    const handleAssigneeSelect = (userId: string, userData: any) => {
        setFormData(prev => ({
            ...prev,
            assigned_to: userId
        }));
        setAssignee(userData);
    };

    // Handle dependency selection
    const handleDependencyChange = (taskId: string) => {
        setSelectedDependencies(prev => {
            if (prev.includes(taskId)) {
                return prev.filter(id => id !== taskId);
            } else {
                return [...prev, taskId];
            }
        });
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
            const taskData = {
                ...formData,
                dependencies: selectedDependencies.length > 0 ? selectedDependencies : null,
                organization_id: selectedOrganization?.id,
                updated_at: new Date().toISOString(),
                updated_by: userData.user.id
            };

            let result;

            if (isEditMode) {
                // Update existing task
                result = await supabase
                    .from('work_order_tasks')
                    .update(taskData)
                    .eq('id', task!.id);
            } else {
                // Create new task
                result = await supabase
                    .from('work_order_tasks')
                    .insert([{
                        ...taskData,
                        created_at: new Date().toISOString(),
                        created_by: userData.user.id
                    }]);
            }

            if (result.error) throw result.error;

            onSave();
            onClose();
        } catch (err) {
            console.error('Error saving task:', err);
            setError(err instanceof Error ? err.message : 'Failed to save task');
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
                        <ListChecks className="w-6 h-6 text-indigo-500 mr-2" />
                        {isEditMode ? 'Edit Task' : 'Add Task'}
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
                        {/* Task Number */}
                        <div>
                            <label htmlFor="task_number" className="block text-sm font-medium text-gray-700 mb-1">
                                Task Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="task_number"
                                name="task_number"
                                type="number"
                                min="1"
                                value={formData.task_number}
                                onChange={handleNumericChange}
                                required
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                            />
                        </div>

                        {/* Task Title */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                Task Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="title"
                                name="title"
                                type="text"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                placeholder="Enter task title"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description || ''}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                placeholder="Enter task description"
                            />
                        </div>

                        {/* Status */}
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                Status <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="skipped">Skipped</option>
                            </select>
                        </div>

                        {/* Assignment */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Assign To
                            </label>
                            <div className="flex items-center">
                                <User className="w-5 h-5 text-gray-400 mr-2" />
                                <UserSearch
                                    organizationId={selectedOrganization?.id || ''}
                                    selectedUserId={formData.assigned_to || ''}
                                    onSelect={handleAssigneeSelect}
                                />
                            </div>
                        </div>

                        {/* Estimated Duration */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="estimated_duration" className="block text-sm font-medium text-gray-700 mb-1">
                                    Estimated Duration (hours)
                                </label>
                                <div className="flex items-center">
                                    <Clock className="w-5 h-5 text-gray-400 mr-2" />
                                    <input
                                        id="estimated_duration"
                                        name="estimated_duration"
                                        type="number"
                                        min="0"
                                        step="0.25"
                                        value={formData.estimated_duration || ''}
                                        onChange={handleNumericChange}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            {isEditMode && formData.status === 'completed' && (
                                <div>
                                    <label htmlFor="actual_duration" className="block text-sm font-medium text-gray-700 mb-1">
                                        Actual Duration (hours)
                                    </label>
                                    <input
                                        id="actual_duration"
                                        name="actual_duration"
                                        type="number"
                                        min="0"
                                        step="0.25"
                                        value={formData.actual_duration || ''}
                                        onChange={handleNumericChange}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-indigo-200 outline-none transition-colors"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Dependencies */}
                        {availableTasks.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Dependencies (tasks that must be completed first)
                                </label>
                                <div className="mt-2 border rounded-lg overflow-hidden">
                                    <div className="max-h-60 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                                        Select
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                                        #
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Task
                                                    </th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {availableTasks.map(t => (
                                                    <tr key={t.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedDependencies.includes(t.id!)}
                                                                onChange={() => handleDependencyChange(t.id!)}
                                                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">{t.task_number}</div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">{t.title}</div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${t.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                    t.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                                                        t.status === 'skipped' ? 'bg-gray-100 text-gray-800' :
                                                                            'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                {t.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
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
                                    Save Task
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}