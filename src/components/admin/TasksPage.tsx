import { useState, useEffect } from 'react';
import {
    CalendarCheck, Search, UserCheck, CheckCircle, Plus, Edit, Trash2,
    Filter, ChevronDown, ChevronUp, Calendar as CalendarIcon,
    Clock, X, Check, Zap, AlertCircle, User, ArrowLeft, ArrowRight,
    LayoutGrid, Users
} from 'lucide-react';
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
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

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
            setShowDeleteConfirm(null);
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

    // Pagination
    const indexOfLastTask = currentPage * itemsPerPage;
    const indexOfFirstTask = indexOfLastTask - itemsPerPage;
    const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);
    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6 bg-gray-50 min-h-screen font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-700 to-violet-500 bg-clip-text text-transparent">
                        Task Management
                    </h1>
                    <p className="text-gray-500 mt-1">Create and track your tasks and deadlines</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link
                        to="/admin/tasks/calendar"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:border-indigo-300"
                    >
                        <LayoutGrid className="w-4 h-4" />
                        <span>Full Calendar</span>
                    </Link>
                    <Link
                        to="/admin/tasks/new"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:from-indigo-700 hover:to-violet-700"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Task</span>
                    </Link>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center border border-red-100 shadow-sm mb-6">
                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Search & Filters Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <Filter className="w-5 h-5 text-indigo-500" />
                            Search & Filters
                        </h2>
                        <button
                            onClick={() => setFiltersExpanded(!filtersExpanded)}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            {filtersExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                    </div>

                    {filtersExpanded && (
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search className="text-gray-400 w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search tasks by title..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600 mb-1.5 font-medium">Status</label>
                                    <select
                                        value={filters.isDone === null ? 'all' : filters.isDone ? 'done' : 'pending'}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setFilters(prev => ({
                                                ...prev,
                                                isDone: value === 'all' ? null : value === 'done'
                                            }));
                                        }}
                                        className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200 bg-white"
                                    >
                                        <option value="all">All Tasks</option>
                                        <option value="done">Completed</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600 mb-1.5 font-medium">Visibility</label>
                                    <select
                                        value={filters.isPersonal === null ? 'all' : filters.isPersonal ? 'personal' : 'team'}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setFilters(prev => ({
                                                ...prev,
                                                isPersonal: value === 'all' ? null : value === 'personal'
                                            }));
                                        }}
                                        className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200 bg-white"
                                    >
                                        <option value="all">All Tasks</option>
                                        <option value="personal">Personal</option>
                                        <option value="team">Team</option>
                                    </select>
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600 mb-1.5 font-medium">Tasks per page</label>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200 bg-white"
                                    >
                                        <option value={5}>5 per page</option>
                                        <option value={10}>10 per page</option>
                                        <option value={20}>20 per page</option>
                                        <option value={50}>50 per page</option>
                                    </select>
                                </div>
                            </div>

                            {(filters.isDone !== null || filters.isPersonal !== null) && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setFilters({ isDone: null, isPersonal: null })}
                                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                        Clear Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Calendar Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:w-1/3 xl:w-1/4">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-indigo-500" />
                                Calendar View
                            </h2>
                            <Link
                                to="/admin/tasks/calendar"
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                            >
                                Full View
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        <div className="custom-calendar-container rounded-xl overflow-hidden shadow-sm border border-gray-100">
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
                                    return hasTask ? <div className="task-dot bg-indigo-500" /> : null;
                                }}
                                className="custom-calendar"
                                selectRange={false}
                                showNeighboringMonth={true}
                                onClickDay={(value) => {
                                    // Just set the date, don't allow the calendar to render its own view
                                    setSelectedDate(value);
                                }}
                            />
                        </div>

                        {selectedDate && (
                            <div className="mt-6 bg-indigo-50 p-4 rounded-xl relative z-10 selected-tasks-container">
                                <h3 className="text-md font-semibold mb-3 text-indigo-800 flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4" />
                                    Tasks on {selectedDate.toDateString()}
                                </h3>
                                {tasksOnSelectedDate.length ? (
                                    <ul className="space-y-2 task-list">
                                        {tasksOnSelectedDate.map(task => (
                                            <li
                                                key={task.id}
                                                onClick={() => navigate(`/admin/tasks/${task.id}/edit`)}
                                                className="p-3 rounded-lg bg-white shadow-sm border border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer text-sm flex items-center gap-2"
                                            >
                                                {task.is_done ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                ) : (
                                                    <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                )}
                                                <span className="truncate">{task.title}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-indigo-600 text-sm">No tasks scheduled for this date.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tasks List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:w-2/3 xl:w-3/4">
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <CalendarCheck className="w-5 h-5 text-indigo-500" />
                            {filteredTasks.length} Tasks
                        </h2>

                        <div className="space-y-3">
                            {currentTasks.length === 0 ? (
                                <div className="p-8 text-center">
                                    <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-lg font-medium text-gray-700">No tasks found</p>
                                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or create a new task</p>
                                </div>
                            ) : (
                                currentTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className="p-4 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors shadow-sm hover:shadow"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <h4 className="text-lg font-medium flex items-center gap-2">
                                                    {task.is_done ? (
                                                        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            Completed
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            Pending
                                                        </span>
                                                    )}
                                                    {task.title}
                                                </h4>
                                                <div className="flex items-center text-sm text-gray-500 gap-4">
                                                    <span className="flex items-center gap-1">
                                                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                                                        {formatDueDate(task.due_date)}
                                                    </span>

                                                    {task.is_personal ? (
                                                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                                                            <User className="w-3.5 h-3.5" />
                                                            Personal
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                                                            <Users className="w-3.5 h-3.5" />
                                                            Team
                                                        </span>
                                                    )}

                                                    {task.assigned_to && (
                                                        <span className="flex items-center gap-1">
                                                            <UserCheck className="w-4 h-4 text-gray-400" />
                                                            Assigned
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Link
                                                    to={`/admin/tasks/${task.id}/edit`}
                                                    className="p-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                                                    title="Edit task"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                {showDeleteConfirm === task.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleDelete(task.id)}
                                                            className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                                                            title="Confirm delete"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setShowDeleteConfirm(null)}
                                                            className="p-1.5 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                                                            title="Cancel"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(task.id)}
                                                        className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                                                        title="Delete task"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pagination */}
                        {filteredTasks.length > itemsPerPage && (
                            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-100">
                                <div className="text-sm text-gray-500">
                                    Showing <span className="font-medium text-gray-700">{indexOfFirstTask + 1}</span> to{' '}
                                    <span className="font-medium text-gray-700">
                                        {Math.min(indexOfLastTask, filteredTasks.length)}
                                    </span>{' '}
                                    of <span className="font-medium text-gray-700">{filteredTasks.length}</span> tasks
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 text-sm font-medium rounded-full bg-white border border-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else {
                                            // Logic for when there are more than 5 pages
                                            const middlePage = Math.min(Math.max(currentPage, 3), totalPages - 2);
                                            pageNum = i + middlePage - 2;
                                        }
                                        if (pageNum > 0 && pageNum <= totalPages) {
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => paginate(pageNum)}
                                                    className={`px-4 py-2 text-sm font-medium rounded-full ${currentPage === pageNum
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                                        } transition-colors`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        }
                                        return null;
                                    })}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 text-sm font-medium rounded-full bg-white border border-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}