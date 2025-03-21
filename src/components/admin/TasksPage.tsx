import { useState, useEffect } from 'react';
import { CalendarCheck, Search, UserCheck, CheckCircle, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Link, useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Base styles

import '../../styles/CustomCalendar.css'; // Custom styles you'll define below

export function TasksPage() {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    useEffect(() => {
        fetchTasks();
    }, [selectedOrganization, user]);

    const fetchTasks = async () => {
        try {
            setLoading(true);

            if (!user || !selectedOrganization?.id) return;

            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('organization_id', selectedOrganization.id)
                .order('due_date', { ascending: true });

            if (error) throw error;

            // Filter tasks based on is_personal visibility rules
            const filteredTasks = (data || []).filter(task => {
                const isCreatedByUser = task.created_by === user.id;
                const isAssignedToUser = task.assigned_to === user.id;

                if (task.is_personal) {
                    // Personal task: only visible to creator or assignee
                    return isCreatedByUser || isAssignedToUser;
                } else {
                    // Not personal: visible to all users in org
                    return true;
                }
            });

            setTasks(filteredTasks);
        } catch (err) {
            console.error('Error fetching tasks:', err);
            setError('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };


    const handleDelete = async (taskId) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;

        try {
            const { error } = await supabase.from('tasks').delete().eq('id', taskId);
            if (error) throw error;

            setTasks(prev => prev.filter(task => task.id !== taskId));
        } catch (err) {
            console.error('Error deleting task:', err);
            setError('Failed to delete task');
        }
    };

    const filteredTasks = tasks.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const tasksOnSelectedDate = selectedDate
        ? tasks.filter(task => {
            const taskDate = new Date(task.due_date);
            return (
                taskDate.getFullYear() === selectedDate.getFullYear() &&
                taskDate.getMonth() === selectedDate.getMonth() &&
                taskDate.getDate() === selectedDate.getDate()
            );
        })
        : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Tasks</h1>
                <Link
                    to="/admin/tasks/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Task
                </Link>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                    {error}
                </div>
            )}

            {/* Calendar + Task List Horizontal Layout */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Calendar Panel */}
                {/* Calendar Panel */}
                <div className="bg-white shadow rounded-lg p-4 lg:w-1/4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Calendar View</h2>
                        <Link
                            to="/admin/tasks/calendar"
                            className="text-blue-600 text-sm hover:underline"
                        >
                            Full Calendar View
                        </Link>
                    </div>

                    <Calendar
                        onChange={(date) => setSelectedDate(date as Date)}
                        value={selectedDate}
                        tileContent={({ date }) => {
                            const hasTask = tasks.some(task => {
                                const taskDate = new Date(task.due_date);
                                return (
                                    taskDate.getFullYear() === date.getFullYear() &&
                                    taskDate.getMonth() === date.getMonth() &&
                                    taskDate.getDate() === date.getDate()
                                );
                            });
                            return hasTask ? <div className="task-dot mt-1" /> : null;
                        }}
                        className="custom-calendar"
                    />

                    {selectedDate && (
                        <div className="mt-4">
                            <h3 className="text-md font-semibold mb-2">
                                Tasks on {selectedDate.toDateString()}
                            </h3>
                            {tasksOnSelectedDate.length ? (
                                <ul className="space-y-2">
                                    {tasksOnSelectedDate.map(task => (
                                        <li
                                            key={task.id}
                                            onClick={() => navigate(`/admin/tasks/${task.id}/edit`)}
                                            className="p-2 rounded hover:bg-gray-100 cursor-pointer text-sm border border-gray-200"
                                        >
                                            {task.title}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 text-sm">No tasks for this date.</p>
                            )}
                        </div>
                    )}
                </div>


                {/* Task List Panel */}
                <div className="bg-white shadow rounded-lg lg:w-3/4">
                    <div className="p-4 border-b border-gray-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                            />
                        </div>
                    </div>

                    <div className="divide-y divide-gray-200">
                        {filteredTasks.map(task => (
                            <div key={task.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                <div className="space-y-1">
                                    <h4 className="text-lg font-medium">
                                        {task.is_done ? (
                                            <CheckCircle className="inline w-5 h-5 text-green-500 mr-1" />
                                        ) : (
                                            <CalendarCheck className="inline w-5 h-5 text-yellow-500 mr-1" />
                                        )}
                                        {task.title}
                                    </h4>
                                    <div className="text-sm text-gray-500">Due: {new Date(task.due_date).toLocaleDateString()}</div>
                                    {task.assigned_to && (
                                        <div className="text-sm text-gray-500 flex items-center">
                                            <UserCheck className="w-4 h-4 mr-1" />Assigned
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Link
                                        to={`/admin/tasks/${task.id}/edit`}
                                        className="text-blue-600 hover:text-blue-900"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(task.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {!filteredTasks.length && (
                            <div className="p-4 text-gray-500">No tasks found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
