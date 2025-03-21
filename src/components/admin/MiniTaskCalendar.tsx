import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useNavigate } from 'react-router-dom';


export function MiniTaskCalendar() {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const [tasks, setTasks] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();


    useEffect(() => {
        fetchTasks();
    }, [selectedOrganization, user]);

    const fetchTasks = async () => {
        try {
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
            setTasks(filteredTasks || []);
        } catch (err) {
            console.error('Error fetching tasks:', err);
        }
    };

    const handleToggleDone = async () => {
        if (!selectedTask) return;

        const updatedValue = !selectedTask.is_done;

        // Optimistically update UI
        setSelectedTask({ ...selectedTask, is_done: updatedValue });

        // Update Supabase
        const { error } = await supabase
            .from('tasks')
            .update({ is_done: updatedValue })
            .eq('id', selectedTask.id);

        if (error) {
            console.error('Error updating task status:', error);
            // Revert on error
            setSelectedTask({ ...selectedTask, is_done: !updatedValue });
            return;
        }

        // Dynamically update tasks state so list reflects change
        setTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === selectedTask.id ? { ...task, is_done: updatedValue } : task
            )
        );
    };


    const tasksOnSelectedDate = tasks.filter(task => {
        const taskDate = new Date(task.due_date);
        return (
            taskDate.getFullYear() === selectedDate.getFullYear() &&
            taskDate.getMonth() === selectedDate.getMonth() &&
            taskDate.getDate() === selectedDate.getDate()
        );
    });

    const handleTaskClick = (task) => {
        setSelectedTask(task);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedTask(null);
    };

    return (
        <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Task Calendar</h2>
            <Calendar
                onChange={setSelectedDate}
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
            <div className="mt-4">
                <h3 className="text-md font-semibold mb-2">
                    Tasks on {selectedDate.toDateString()}
                </h3>
                {tasksOnSelectedDate.length ? (
                    <ul className="space-y-2">
                        {tasksOnSelectedDate.map(task => (
                            <li
                            key={task.id}
                            onClick={() => handleTaskClick(task)}
                            className={`p-2 rounded cursor-pointer text-sm border 
                                ${task.is_done 
                                ? 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100' 
                                : 'hover:bg-gray-100 border-gray-200 text-gray-800'}`}
                            >
                            {task.title}
                            </li>
                        ))}
                    </ul>

                ) : (
                    <p className="text-gray-500 text-sm">No tasks for this date.</p>
                )}
            </div>

            {/* Task Detail Modal */}
            {showModal && selectedTask && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{selectedTask.title}</h2>
                            <button
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Due Date</h3>
                                <p className="text-gray-900">{new Date(selectedTask.due_date).toLocaleDateString()}</p>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-1">Completed</h3>
                                <label className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={selectedTask.is_done}
                                        onChange={handleToggleDone}
                                    />
                                    <div className="relative">
                                        <div className="block bg-gray-300 w-10 h-6 rounded-full"></div>
                                        <div
                                            className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${selectedTask.is_done ? 'transform translate-x-4 bg-green-500' : ''
                                                }`}
                                        ></div>
                                    </div>
                                    <span className="ml-3 text-sm font-medium text-gray-900">
                                        {selectedTask.is_done ? 'Yes' : 'No'}
                                    </span>
                                </label>
                            </div>


                            {selectedTask.description && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Description</h3>
                                    <p className="text-gray-900 whitespace-pre-line">{selectedTask.description}</p>
                                </div>
                            )}

                            <div className="pt-4 flex space-x-3">
                                <button
                                    onClick={closeModal}
                                    className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Close
                                </button>

                                <button
                                    onClick={() => {
                                        closeModal();
                                        navigate(`/admin/tasks/${selectedTask.id}/edit`);
                                    }}

                                    className="flex-1 bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Edit Task
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}