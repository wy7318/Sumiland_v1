import { useState, useEffect } from 'react';
import { CalendarCheck, Search, UserCheck, CheckCircle, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Link, useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../../styles/CustomCalendar.css';
import { DateTime } from 'luxon';

export function TasksPage() {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [orgTimezone, setOrgTimezone] = useState('UTC');
    const [filters, setFilters] = useState({
        isDone: null,
        isPersonal: null
    });

    useEffect(() => {
        const fetchTimezone = async () => {
            if (!selectedOrganization?.id) return;
            const { data, error } = await supabase
                .from('organizations')
                .select('timezone')
                .eq('id', selectedOrganization.id)
                .single();
            if (error) {
                console.error('Failed to fetch org timezone:', error);
                return;
            }
            if (data?.timezone) setOrgTimezone(data.timezone);
            console.log('data?.timezone : ' + data?.timezone);
        };
        fetchTimezone();
    }, [selectedOrganization]);

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

            const filteredTasks = (data || []).filter(task => {
                const isCreatedByUser = task.created_by === user.id;
                const isAssignedToUser = task.assigned_to === user.id;
                return task.is_personal ? (isCreatedByUser || isAssignedToUser) : true;
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

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filters.isDone === null || task.is_done === filters.isDone;
        const matchesPersonal = filters.isPersonal === null || task.is_personal === filters.isPersonal;
        const isCreatedByUser = task.created_by === user.id;
        const isAssignedToUser = task.assigned_to === user.id;
        const matchesVisibility = task.is_personal ? (isCreatedByUser || isAssignedToUser) : true;
        return matchesSearch && matchesStatus && matchesPersonal && matchesVisibility;
    });

    const tasksOnSelectedDate = selectedDate
        ? tasks.filter(task => {
            const due = DateTime.fromISO(task.due_date, { zone: orgTimezone });
            // console.log('due.year ; ' + due.year);
            // console.log('due.month  ; ' + due.month);
            console.log('selectedDate.getDate() ; ' + selectedDate.getDate());
            return (
                due.year === selectedDate.getFullYear() &&
                due.month === selectedDate.getMonth() + 1 &&
                due.day === selectedDate.getDate()
            );
        })
        : [];

    const formatDueDate = (dateStr: string) => {
        const dt = DateTime.fromISO(dateStr, { zone: orgTimezone });
        return dt.toFormat('MMM dd, yyyy, h:mm a');
    };

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
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="bg-white shadow rounded-lg p-4 lg:w-1/4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Calendar View</h2>
                        <Link to="/admin/tasks/calendar" className="text-blue-600 text-sm hover:underline">
                            Full Calendar View
                        </Link>
                    </div>

                    <Calendar
                        onChange={(date) => setSelectedDate(date as Date)}
                        value={selectedDate}
                        tileContent={({ date }) => {
                            const hasTask = tasks.some(task => {
                                const due = DateTime.fromISO(task.due_date, { zone: orgTimezone });
                                return (
                                    due.year === date.getFullYear() &&
                                    due.month === date.getMonth() + 1 &&
                                    due.day === date.getDate()
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

                <div className="bg-white shadow rounded-lg lg:w-3/4">
                    <div className="p-4 border-b border-gray-200">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300"
                            />
                        </div>

                        <div className="flex flex-wrap gap-4">
                            {/* Status Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={filters.isDone === null ? 'all' : filters.isDone ? 'done' : 'pending'}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFilters(prev => ({
                                            ...prev,
                                            isDone: value === 'all' ? null : value === 'done'
                                        }));
                                    }}
                                    className="rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                                >
                                    <option value="all">All Tasks</option>
                                    <option value="done">Completed</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>

                            {/* Personal/Team Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                                <select
                                    value={filters.isPersonal === null ? 'all' : filters.isPersonal ? 'personal' : 'team'}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFilters(prev => ({
                                            ...prev,
                                            isPersonal: value === 'all' ? null : value === 'personal'
                                        }));
                                    }}
                                    className="rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                                >
                                    <option value="all">All Tasks</option>
                                    <option value="personal">Personal</option>
                                    <option value="team">Team</option>
                                </select>
                            </div>
                            {filters.isDone !== null || filters.isPersonal !== null ? (
                                <button
                                    onClick={() => setFilters({ isDone: null, isPersonal: null })}
                                    className="text-sm text-primary-600 hover:text-primary-800"
                                >
                                    Clear Filters
                                </button>
                            ) : null}
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
                                    <div className="text-sm text-gray-500">Due: {formatDueDate(task.due_date)}</div>
                                    {task.assigned_to && (
                                        <div className="text-sm text-gray-500 flex items-center">
                                            <UserCheck className="w-4 h-4 mr-1" />Assigned
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Link to={`/admin/tasks/${task.id}/edit`} className="text-blue-600 hover:text-blue-900">
                                        <Edit className="w-5 h-5" />
                                    </Link>
                                    <button onClick={() => handleDelete(task.id)} className="text-red-600 hover:text-red-900">
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
