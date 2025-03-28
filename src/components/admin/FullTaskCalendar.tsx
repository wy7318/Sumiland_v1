import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import '../../styles/CalendarModern.css';
import { DateTime } from 'luxon';

const colorPalette = [
    { bg: '#fef9c3', text: '#92400e' },  // Light Yellow
    { bg: '#d1fae5', text: '#065f46' },  // Light Green
    { bg: '#e0f2fe', text: '#0369a1' },  // Light Blue
    { bg: '#fae8ff', text: '#9333ea' },  // Light Purple
    { bg: '#fee2e2', text: '#b91c1c' },  // Light Red
    { bg: '#fef3c7', text: '#b45309' },  // Light Orange
];

export function FullTaskCalendar() {
    const [currentMonthDt, setCurrentMonthDt] = useState(DateTime.now());
    const [calendarDays, setCalendarDays] = useState<DateTime[]>([]);
    const [tasks, setTasks] = useState([]);
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
    const [draggedTask, setDraggedTask] = useState(null);
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const navigate = useNavigate();
    const [orgTimezone, setOrgTimezone] = useState('UTC');

    // Get organization timezone
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

            if (data?.timezone) {
                setOrgTimezone(data.timezone);
                console.log('Using timezone:', data.timezone);
            }
        };

        fetchTimezone();
    }, [selectedOrganization]);

    // Generate calendar days using Luxon
    useEffect(() => {
        if (!orgTimezone) return;

        // Start of the month in org timezone
        const startOfMonth = currentMonthDt.setZone(orgTimezone).startOf('month');
        const endOfMonth = currentMonthDt.setZone(orgTimezone).endOf('month');

        // Start of week for first day of month
        let startDate = startOfMonth.startOf('week');
        // End of week for last day of month
        let endDate = endOfMonth.endOf('week');

        const days: DateTime[] = [];
        let currentDay = startDate;

        while (currentDay <= endDate) {
            days.push(currentDay);
            currentDay = currentDay.plus({ days: 1 });
        }

        setCalendarDays(days);
    }, [currentMonthDt, orgTimezone]);

    // Fetch tasks when month or organization changes
    useEffect(() => {
        if (orgTimezone) {
            fetchTasks();
        }
    }, [user, selectedOrganization, currentMonthDt, orgTimezone]);

    const fetchTasks = async () => {
        if (!user || !selectedOrganization?.id) return;

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('organization_id', selectedOrganization.id)
            .order('due_date', { ascending: true });

        if (error) {
            console.error('Error fetching tasks:', error);
            return;
        }

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

        setTasks(filteredTasks || []);
    };

    // Format dates properly using Luxon in org timezone
    const formatDateString = (dateStr) => {
        return DateTime.fromISO(dateStr, { zone: orgTimezone }).toFormat('LLL dd');
    };

    // Check if two dates are the same day in org timezone
    const isSameDay = (dateStr, day) => {
        const taskDate = DateTime.fromISO(dateStr, { zone: orgTimezone });
        return (
            taskDate.year === day.year &&
            taskDate.month === day.month &&
            taskDate.day === day.day
        );
    };

    // Get tasks for a specific date
    const tasksForDate = (day) => {
        return tasks.filter(task => isSameDay(task.due_date, day));
    };

    // Toggle expanded state for a day
    const toggleExpandDay = (dayKey) => {
        setExpandedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dayKey)) {
                newSet.delete(dayKey);
            } else {
                newSet.add(dayKey);
            }
            return newSet;
        });
    };

    // Handle drag start
    const handleDragStart = (e, task) => {
        setDraggedTask(task);
        // Required for Firefox compatibility
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    // Handle drag over
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // Handle drop - update task due date
    const handleDrop = async (e, day) => {
        e.preventDefault();
        if (!draggedTask) return;

        // Format the new date in the organization's timezone
        const newDueDate = day.toFormat('yyyy-MM-dd');

        // Preserve the original time (5:00 PM or whatever was set)
        const originalTime = DateTime.fromISO(draggedTask.due_date, { zone: orgTimezone })
            .toFormat('HH:mm:ss');

        const newDateTimeStr = `${newDueDate}T${originalTime}`;

        try {
            const { error } = await supabase
                .from('tasks')
                .update({ due_date: newDateTimeStr })
                .eq('id', draggedTask.id);

            if (error) throw error;

            // Refresh tasks
            fetchTasks();

            console.log(`Moved task ${draggedTask.title} to ${newDateTimeStr}`);
        } catch (err) {
            console.error('Error updating task date:', err);
        }

        setDraggedTask(null);
    };

    // Navigate to previous month
    const prevMonth = () => {
        setCurrentMonthDt(prev => prev.minus({ months: 1 }));
    };

    // Navigate to next month  
    const nextMonth = () => {
        setCurrentMonthDt(prev => prev.plus({ months: 1 }));
    };

    const getColorByTaskId = (taskId) => {
        const hash = Array.from(taskId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const index = hash % colorPalette.length;
        return colorPalette[index];
    };

    return (
        <div className="max-w-6xl mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <button
                    onClick={prevMonth}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                    &lt; Prev
                </button>
                <h2 className="text-xl font-bold">
                    {currentMonthDt.setZone(orgTimezone).toFormat('MMMM yyyy')}
                </h2>
                <button
                    onClick={nextMonth}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                    Next &gt;
                </button>
            </div>

            {/* Weekday Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-700 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2">{day}</div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="calendar-grid">
                {calendarDays.map(day => {
                    const dayTasks = tasksForDate(day);
                    const isToday = day.hasSame(DateTime.now().setZone(orgTimezone), 'day');
                    const isCurrentMonth = day.hasSame(currentMonthDt.setZone(orgTimezone), 'month');
                    const dayKey = day.toFormat('yyyy-MM-dd');
                    const isExpanded = expandedDays.has(dayKey);

                    // Determine how many tasks to show
                    const tasksToShow = isExpanded ? dayTasks : dayTasks.slice(0, 2);
                    const hasMoreTasks = dayTasks.length > 2 && !isExpanded;

                    return (
                        <div
                            key={dayKey}
                            className={`calendar-day ${isToday ? 'today-border' : ''} 
                                      ${!isCurrentMonth ? 'text-gray-400' : ''}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, day)}
                        >
                            <div className="date-label">{day.toFormat('d')}</div>
                            <div className="mt-5 space-y-1">
                                {tasksToShow.map(task => {
                                    const colors = getColorByTaskId(task.id);
                                    return (
                                        <div
                                            key={task.id}
                                            className="task-pill cursor-move"
                                            style={{
                                                backgroundColor: colors.bg,
                                                color: colors.text,
                                            }}
                                            draggable="true"
                                            onDragStart={(e) => handleDragStart(e, task)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/admin/tasks/${task.id}/edit`);
                                            }}
                                        >
                                            {task.title}
                                        </div>
                                    );
                                })}

                                {hasMoreTasks && (
                                    <div
                                        className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                                        onClick={() => toggleExpandDay(dayKey)}
                                    >
                                        +{dayTasks.length - 2} more
                                    </div>
                                )}

                                {isExpanded && (
                                    <div
                                        className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                                        onClick={() => toggleExpandDay(dayKey)}
                                    >
                                        Show less
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                /* Add some styles for dragging */
                .task-pill {
                    transition: transform 0.2s;
                }
                .task-pill:active {
                    cursor: grabbing;
                    transform: scale(0.98);
                }
                .calendar-day {
                    min-height: 120px;
                    transition: background-color 0.2s;
                }
                .calendar-day:hover {
                    background-color: rgba(0,0,0,0.02);
                }
                /* Style changes for expanded days */
                .calendar-day.expanded {
                    z-index: 10;
                    overflow-y: auto;
                    max-height: none;
                }
            `}</style>
        </div>
    );
}