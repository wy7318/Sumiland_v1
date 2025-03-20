import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, format, addMonths, subMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import '../../styles/CalendarModern.css';

const colorPalette = [
    { bg: '#fef9c3', text: '#92400e' },  // Light Yellow
    { bg: '#d1fae5', text: '#065f46' },  // Light Green
    { bg: '#e0f2fe', text: '#0369a1' },  // Light Blue
    { bg: '#fae8ff', text: '#9333ea' },  // Light Purple
    { bg: '#fee2e2', text: '#b91c1c' },  // Light Red
    { bg: '#fef3c7', text: '#b45309' },  // Light Orange
];


export function FullTaskCalendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [calendarDays, setCalendarDays] = useState<Date[]>([]);
    const [tasks, setTasks] = useState([]);
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const navigate = useNavigate();

    const getColorByTaskId = (taskId: string) => {
        const hash = Array.from(taskId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const index = hash % colorPalette.length;
        return colorPalette[index];
    };


    useEffect(() => {
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        setCalendarDays(eachDayOfInterval({ start, end }));
    }, [currentMonth]);

    useEffect(() => {
        fetchTasks();
    }, [user, selectedOrganization, currentMonth]);

    const fetchTasks = async () => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .or(
                `created_by.eq.${user?.id},assigned_to.eq.${user?.id}` +
                (selectedOrganization?.id ? `,organization_id.eq.${selectedOrganization.id}` : '')
            );

        if (!error) setTasks(data || []);
    };

    const tasksForDate = (date: Date) => {
        return tasks.filter(task =>
            isSameDay(new Date(task.due_date), date)
        );
    };

    return (
        <div className="max-w-6xl mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-sm font-medium text-gray-600 hover:text-gray-900">&lt; Prev</button>
                <h2 className="text-xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-sm font-medium text-gray-600 hover:text-gray-900">Next &gt;</button>
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
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={day.toString()}
                            className={`calendar-day ${isToday ? 'today-border' : ''}`}
                        >
                            <div className="date-label">{format(day, 'd')}</div>
                            <div className="mt-5 space-y-1">
                                {dayTasks.slice(0, 2).map(task => {
                                    const colors = getColorByTaskId(task.id);
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => navigate(`/admin/tasks/${task.id}/edit`)}
                                            className="task-pill"
                                            style={{
                                                backgroundColor: colors.bg,
                                                color: colors.text,
                                            }}
                                        >
                                            {task.title}
                                        </div>
                                    );
                                })}

                                {dayTasks.length > 2 && (
                                    <div className="text-xs text-gray-400">+{dayTasks.length - 2} more</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

    );
}
