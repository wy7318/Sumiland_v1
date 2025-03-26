// components/RelatedTasks.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useRouter } from 'next/router';
import { CheckCircle, Circle, Calendar, ChevronRight, X } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    due_date: string;
    is_done: boolean;
    is_personal?: boolean;
    created_by?: string;
    assigned_to?: string;
    description?: string;
}

type Props = {
    recordId: string;
    organizationId: string;
    title?: string;
    refreshKey?: number;
};

export function RelatedTasks({ recordId, organizationId, title = 'Tasks', refreshKey }: Props) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

    const fetchTasks = async () => {
        if (!user?.id || !recordId || !organizationId) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('record_id', recordId)
            .eq('organization_id', organizationId)
            .order('due_date', { ascending: true });

        if (error) throw error;

        const filteredTasks = (data || []).filter(task => {
            const isCreatedByUser = task.created_by === user.id;
            const isAssignedToUser = task.assigned_to === user.id;
            return !task.is_personal || isCreatedByUser || isAssignedToUser;
        });

        setTasks(filteredTasks);
        setLoading(false);
    };

    const toggleTaskDone = async (task: Task) => {
        setUpdatingTaskId(task.id);
        const { error } = await supabase
            .from('tasks')
            .update({ is_done: !task.is_done })
            .eq('id', task.id);

        if (!error) {
            fetchTasks();
            setSelectedTask({ ...task, is_done: !task.is_done });
        }
        setUpdatingTaskId(null);
    };

    useEffect(() => {
        fetchTasks();
    }, [recordId, organizationId, user?.id, refreshKey]);

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
                <svg className="w-4 h-4 text-gray-500 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                </svg>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</h3>
                <span className="ml-auto bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {tasks.length}
                </span>
            </div>

            {loading ? (
                <div className="p-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
            ) : tasks.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                    No tasks found for this record.
                </div>
            ) : (
                <div className="divide-y divide-gray-200">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150"
                        >
                            <div className="flex items-start">
                                <div className="flex-shrink-0 mt-0.5">
                                    {task.is_done ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Circle className="w-4 h-4 text-gray-300" />
                                    )}
                                </div>
                                <div className="ml-3 flex-1 min-w-0">
                                    <p className={cn(
                                        "text-sm truncate",
                                        task.is_done ? "text-gray-500 line-through" : "text-gray-900"
                                    )}>
                                        {task.title}
                                    </p>
                                    <div className="flex items-center mt-1 text-xs text-gray-500">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {new Date(task.due_date).toLocaleDateString()}
                                        {task.is_personal && (
                                            <span className="ml-2 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xxs">
                                                Personal
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tasks.length > 0 && (
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-right">
                    <button 
                        onClick={() => (navigate(`/admin/tasks`))}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                        View All Tasks
                    </button>
                </div>

            )}

            {/* Task Detail Modal */}
            {selectedTask && (
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSelectedTask(null)}
                >
                    <motion.div
                        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center">
                                {selectedTask.is_done ? (
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                                ) : (
                                    <Circle className="w-5 h-5 text-gray-300 mr-2" />
                                )}
                                <h2 className="text-lg font-semibold text-gray-900">Task Details</h2>
                            </div>
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-1">{selectedTask.title}</h3>
                                {selectedTask.is_personal && (
                                    <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded mb-3">
                                        Personal Task
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
                                    <p className="text-sm text-gray-900 mt-1">
                                        {selectedTask.is_done ? 'Completed' : 'Open'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</p>
                                    <p className="text-sm text-gray-900 mt-1">
                                        {new Date(selectedTask.due_date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            {selectedTask.description && (
                                <div className="border-t border-gray-200 pt-4">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Description</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {selectedTask.description}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                            <div className="text-xs text-gray-500">
                                {selectedTask.is_done ? (
                                    `Completed on ${new Date().toLocaleDateString()}`
                                ) : (
                                    `Created on ${new Date(selectedTask.due_date).toLocaleDateString()}`
                                )}
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setSelectedTask(null)}
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Close
                                </button>
                                <button
                                    disabled={updatingTaskId === selectedTask.id}
                                    onClick={() => toggleTaskDone(selectedTask)}
                                    className={cn(
                                        'px-4 py-2 text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                                        selectedTask.is_done
                                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                                            : 'bg-green-600 text-white hover:bg-green-700'
                                    )}
                                >
                                    {updatingTaskId === selectedTask.id ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {selectedTask.is_done ? 'Reopening...' : 'Completing...'}
                                        </span>
                                    ) : (
                                        selectedTask.is_done ? 'Reopen Task' : 'Complete Task'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}