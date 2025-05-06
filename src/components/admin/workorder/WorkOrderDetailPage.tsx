import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Mail, Phone, Calendar,
    Edit, AlertCircle, Send, Reply, X, User,
    Clock, CheckCircle, Package, Tag,
    Clipboard, MessageSquare, FileText, UserCheck,
    MapPin, ChevronDown, ChevronUp, BarChart2,
    ListChecks, PlusCircle, Trash2, CheckSquare,
    Layers, ShoppingBag, Users
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { UserSearch } from '../UserSearch';
import type { Database } from '../../../lib/database.types';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { useAuth } from '../../../contexts/AuthContext';
import { WorkOrderItemForm } from './WorkOrderItemForm';
import { WorkOrderTaskForm } from './WorkOrderTaskForm';
import { WorkOrderChecklistForm } from './WorkOrderChecklistForm';
import { showNotification } from '../../../lib/notifications';

type WorkOrder = {
    id: string;
    work_order_number: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    scheduled_start_date: string | null;
    scheduled_end_date: string | null;
    actual_start_date: string | null;
    actual_end_date: string | null;
    location_id: string | null;
    assigned_to: string | null;
    notes: string | null;
    order_id: string | null;
    organization_id: string;
    created_by: string;
    created_at: string;
    updated_by: string | null;
    updated_at: string;
    assignee: {
        name: string;
    } | null;
    location: {
        name: string;
        address: string | null;
    } | null;
    order: {
        order_id: string;
        order_number: string;
        customer_id: string | null;
    } | null;
};

type WorkOrderItem = {
    id: string;
    work_order_id: string;
    type: string;
    product_id: string | null;
    name: string;
    description: string | null;
    quantity_required: number;
    quantity_consumed: number;
    unit_cost: number | null;
    total_cost: number | null;
    status: string;
    organization_id: string;
    product: {
        name: string;
        sku: string;
    } | null;
};

type WorkOrderTask = {
    id: string;
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
    organization_id: string;
    assignee: {
        name: string;
    } | null;
};

type WorkOrderChecklist = {
    id: string;
    work_order_id: string;
    task_id: string | null;
    item_number: number;
    description: string;
    is_completed: boolean;
    completed_by: string | null;
    completed_at: string | null;
    organization_id: string;
    completer: {
        name: string;
    } | null;
};

type Feed = {
    id: string;
    content: string;
    parent_id: string | null;
    parent_type: 'WorkOrder';
    reference_id: string;
    created_by: string;
    created_at: string;
    updated_by: string | null;
    updated_at: string | null;
    status: 'Active' | 'Deleted';
    profile: {
        name: string;
    };
};

type PicklistValue = {
    id: string;
    value: string;
    label: string;
    is_default: boolean;
    is_active: boolean;
    color: string | null;
    text_color: string | null;
};

export function WorkOrderDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
    const [workOrderItems, setWorkOrderItems] = useState<WorkOrderItem[]>([]);
    const [workOrderTasks, setWorkOrderTasks] = useState<WorkOrderTask[]>([]);
    const [workOrderChecklists, setWorkOrderChecklists] = useState<WorkOrderChecklist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feeds, setFeeds] = useState<Feed[]>([]);
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState<Feed | null>(null);
    const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
    const [workOrderStatuses, setWorkOrderStatuses] = useState<PicklistValue[]>([]);
    const [staff, setStaff] = useState<any[]>([]);

    // New state for tasks, checklist and inventory modals
    const [showItemForm, setShowItemForm] = useState(false);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [showChecklistForm, setShowChecklistForm] = useState(false);
    const [editingItem, setEditingItem] = useState<WorkOrderItem | null>(null);
    const [editingTask, setEditingTask] = useState<WorkOrderTask | null>(null);
    const [editingChecklist, setEditingChecklist] = useState<WorkOrderChecklist | null>(null);

    const [itemErrors, setItemErrors] = useState<{ [itemId: string]: string }>({});

    // New state for expanding sections
    const [expandedSections, setExpandedSections] = useState({
        materials: true,
        tasks: true,
        checklists: true
    });

    // New state for tabs
    const [activeTab, setActiveTab] = useState('details');

    useEffect(() => {
        fetchPicklists();
        fetchStaff();
        if (id) {
            fetchWorkOrder();
            fetchWorkOrderItems();
            fetchWorkOrderTasks();
            fetchWorkOrderChecklists();
        }
    }, [id]);

    useEffect(() => {
        if (workOrder) {
            fetchFeeds();
        }
    }, [workOrder]);

    const fetchPicklists = async () => {
        try {
            // For demo, using hardcoded statuses. In production, this would come from your picklist_values table
            setWorkOrderStatuses([
                { id: '1', value: 'draft', label: 'Draft', is_default: true, is_active: true, color: '#E5E7EB', text_color: '#374151' },
                { id: '2', value: 'scheduled', label: 'Scheduled', is_default: false, is_active: true, color: '#DBEAFE', text_color: '#1E40AF' },
                { id: '3', value: 'in_progress', label: 'In Progress', is_default: false, is_active: true, color: '#FEF3C7', text_color: '#92400E' },
                { id: '4', value: 'completed', label: 'Completed', is_default: false, is_active: true, color: '#D1FAE5', text_color: '#065F46' },
                { id: '5', value: 'cancelled', label: 'Cancelled', is_default: false, is_active: true, color: '#FEE2E2', text_color: '#B91C1C' }
            ]);

            // In real implementation, fetch from Supabase:
            /*
            const { data: statusData, error: statusError } = await supabase
              .from('picklist_values')
              .select('id, value, label, is_default, is_active, color, text_color')
              .eq('type', 'work_order_status')
              .eq('is_active', true)
              .eq('organization_id', selectedOrganization?.id)
              .order('display_order', { ascending: true });
      
            if (statusError) throw statusError;
            setWorkOrderStatuses(statusData || []);
            */
        } catch (err) {
            console.error('Error fetching picklists:', err);
            setError('Failed to load picklist values');
        }
    };

    const fetchStaff = async () => {
        try {
            // Get all users from the same organization
            const { data: orgUsers, error: orgUsersError } = await supabase
                .from('user_organizations')
                .select('user_id')
                .eq('organization_id', selectedOrganization?.id);

            if (orgUsersError) throw orgUsersError;

            // Get profiles for these users
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .in('id', orgUsers?.map(uo => uo.user_id) || []);

            if (profilesError) throw profilesError;
            setStaff(profiles || []);
        } catch (err) {
            console.error('Error fetching staff:', err);
        }
    };

    const fetchWorkOrder = async () => {
        try {
            if (!id) return;
            setLoading(true);

            // Fetch work order without the problematic profiles join
            const { data: workOrder, error } = await supabase
                .from('work_orders')
                .select(`
                *,
                location:locations(name, address),
                order:order_hdr(order_id, order_number, customer_id)
            `)
                .eq('id', id)
                .single();

            if (error) throw error;

            // If work order has an assignee, fetch their profile in a separate query
            if (workOrder && workOrder.assigned_to) {
                const { data: assigneeData, error: assigneeError } = await supabase
                    .from('profiles')
                    .select('id, name')
                    .eq('id', workOrder.assigned_to)
                    .single();

                if (!assigneeError && assigneeData) {
                    // Add assignee data to the work order
                    workOrder.assignee = assigneeData;
                } else {
                    // If we couldn't get the assignee, set it to null
                    workOrder.assignee = null;
                }
            } else if (workOrder) {
                workOrder.assignee = null;
            }

            setWorkOrder(workOrder);
        } catch (err) {
            console.error('Error fetching work order:', err);
            setError(err instanceof Error ? err.message : 'Failed to load work order');
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkOrderItems = async () => {
        try {
            if (!id) return;

            const { data, error } = await supabase
                .from('work_order_items')
                .select(`
          *,
          product:products(name, sku)
        `)
                .eq('work_order_id', id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setWorkOrderItems(data || []);
        } catch (err) {
            console.error('Error fetching work order items:', err);
            setError(err instanceof Error ? err.message : 'Failed to load work order items');
        }
    };

    // Flattened Work Order Tasks query
    const fetchWorkOrderTasks = async () => {
        try {
            if (!id) return;

            // Fetch tasks without the problematic join
            const { data: tasks, error } = await supabase
                .from('work_order_tasks')
                .select('*')
                .eq('work_order_id', id)
                .order('task_number', { ascending: true });

            if (error) throw error;

            // Get all unique assigned_to IDs
            const assigneeIds = tasks
                ?.filter(task => task.assigned_to)
                .map(task => task.assigned_to) || [];

            // Remove duplicates
            const uniqueAssigneeIds = [...new Set(assigneeIds)];

            // If there are assignees, fetch their profiles
            let profilesMap = {};
            if (uniqueAssigneeIds.length > 0) {
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, name')
                    .in('id', uniqueAssigneeIds);

                if (profilesError) throw profilesError;

                // Create a map of profile ID to profile data for quick lookup
                profilesMap = (profilesData || []).reduce((map, profile) => {
                    map[profile.id] = profile;
                    return map;
                }, {});
            }

            // Add assignee data to each task
            const tasksWithAssignees = (tasks || []).map(task => {
                return {
                    ...task,
                    assignee: task.assigned_to ? { name: profilesMap[task.assigned_to]?.name } : null
                };
            });

            setWorkOrderTasks(tasksWithAssignees);
        } catch (err) {
            console.error('Error fetching work order tasks:', err);
            setError(err instanceof Error ? err.message : 'Failed to load work order tasks');
        }
    };

    // Flattened Work Order Checklists query
    const fetchWorkOrderChecklists = async () => {
        try {
            if (!id) return;

            // Fetch checklists without the problematic join
            const { data: checklists, error } = await supabase
                .from('work_order_checklists')
                .select('*')
                .eq('work_order_id', id)
                .order('item_number', { ascending: true });

            if (error) throw error;

            // Get all unique completed_by IDs
            const completerIds = checklists
                ?.filter(item => item.completed_by)
                .map(item => item.completed_by) || [];

            // Remove duplicates
            const uniqueCompleterIds = [...new Set(completerIds)];

            // If there are completers, fetch their profiles
            let profilesMap = {};
            if (uniqueCompleterIds.length > 0) {
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, name')
                    .in('id', uniqueCompleterIds);

                if (profilesError) throw profilesError;

                // Create a map of profile ID to profile data for quick lookup
                profilesMap = (profilesData || []).reduce((map, profile) => {
                    map[profile.id] = profile;
                    return map;
                }, {});
            }

            // Add completer data to each checklist item
            const checklistsWithCompleters = (checklists || []).map(item => {
                return {
                    ...item,
                    completer: item.completed_by ? { name: profilesMap[item.completed_by]?.name } : null
                };
            });

            setWorkOrderChecklists(checklistsWithCompleters);
        } catch (err) {
            console.error('Error fetching work order checklists:', err);
            setError(err instanceof Error ? err.message : 'Failed to load work order checklists');
        }
    };

    const fetchFeeds = async () => {
        if (!id || !workOrder) return;

        try {
            const { data, error } = await supabase
                .from('feeds')
                .select(`
          *,
          profile:profiles!feeds_created_by_fkey(name)
        `)
                .eq('reference_id', id)
                .eq('parent_type', 'WorkOrder')
                .eq('status', 'Active')
                .eq('organization_id', selectedOrganization?.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setFeeds(data || []);
        } catch (err) {
            console.error('Error fetching feeds:', err);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            if (!id || !workOrder) return;

            // Update status in the database
            const { error } = await supabase
                .from('work_orders')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                    updated_by: user?.id || null,
                    actual_start_date: newStatus === 'in_progress' && !workOrder.actual_start_date ?
                        new Date().toISOString() : workOrder.actual_start_date,
                    actual_end_date: newStatus === 'completed' && !workOrder.actual_end_date ?
                        new Date().toISOString() : workOrder.actual_end_date
                })
                .eq('id', id);

            if (error) throw error;
            await fetchWorkOrder();
        } catch (err) {
            console.error('Error updating status:', err);
            setError(err instanceof Error ? err.message : 'Failed to update status');
        }
    };

    const handleAssign = async (userId: string | null) => {
        try {
            if (!id || !workOrder) return;

            const { error } = await supabase
                .from('work_orders')
                .update({
                    assigned_to: userId,
                    updated_at: new Date().toISOString(),
                    updated_by: user?.id || null
                })
                .eq('id', id);

            if (error) throw error;
            await fetchWorkOrder();
        } catch (err) {
            console.error('Error assigning work order:', err);
            setError(err instanceof Error ? err.message : 'Failed to assign work order');
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !workOrder) return;

        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('feeds')
                .insert([{
                    content: newComment.trim(),
                    parent_id: replyTo?.id || null,
                    parent_type: 'WorkOrder',
                    reference_id: id,
                    organization_id: workOrder.organization_id,
                    created_by: userData.user.id,
                    created_at: new Date().toISOString(),
                    status: 'Active'
                }]);

            if (error) throw error;
            setNewComment('');
            setReplyTo(null);
            await fetchFeeds();
        } catch (err) {
            console.error('Error adding comment:', err);
        }
    };

    const handleUpdateComment = async (feedId: string, content: string) => {
        try {
            if (!workOrder) return;

            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('feeds')
                .update({
                    content: content.trim(),
                    updated_by: userData.user.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', feedId)
                .eq('created_by', userData.user.id)
                .eq('organization_id', selectedOrganization?.id);

            if (error) throw error;
            setEditingFeed(null);
            await fetchFeeds();
        } catch (err) {
            console.error('Error updating comment:', err);
        }
    };

    const handleDeleteComment = async (feedId: string) => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error('Not authenticated');

            const { error } = await supabase.rpc('soft_delete_feed', {
                feed_id: feedId,
                user_id: userData.user.id
            });

            if (error) throw error;
            await fetchFeeds();
        } catch (err) {
            console.error('Error deleting comment:', err);
        }
    };

    const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('work_order_tasks')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                    updated_by: user?.id || null,
                    start_time: newStatus === 'in_progress' ? new Date().toISOString() : null,
                    end_time: newStatus === 'completed' ? new Date().toISOString() : null
                })
                .eq('id', taskId);

            if (error) throw error;
            await fetchWorkOrderTasks();
        } catch (err) {
            console.error('Error updating task status:', err);
        }
    };

    const handleChecklistToggle = async (checklistId: string, isCompleted: boolean) => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('work_order_checklists')
                .update({
                    is_completed: isCompleted,
                    completed_by: isCompleted ? userData.user.id : null,
                    completed_at: isCompleted ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString(),
                    updated_by: userData.user.id
                })
                .eq('id', checklistId);

            if (error) throw error;
            await fetchWorkOrderChecklists();
        } catch (err) {
            console.error('Error updating checklist item:', err);
        }
    };

    const handleQuantityChange = async (itemId: string, newQuantity: number) => {
        try {
            // Clear any previous errors for this item
            setItemErrors(prev => ({ ...prev, [itemId]: '' }));

            const { error } = await supabase
                .from('work_order_items')
                .update({
                    quantity_consumed: newQuantity,
                    updated_at: new Date().toISOString(),
                    updated_by: user?.id || null
                })
                .eq('id', itemId);

            if (error) throw error;
            await fetchWorkOrderItems();
        } catch (err) {
            console.error('Error updating quantity consumed:', err);

            // Extract the error message
            let errorMessage = 'Failed to update quantity';

            if (err instanceof Error) {
                // For inventory errors, the backend returns a specific message format
                if (err.message.includes('Not enough inventory available')) {
                    errorMessage = err.message;

                    // Show notification using our utility
                    showNotification(errorMessage, 'error');
                }
            }

            // Set the error for the specific item
            setItemErrors(prev => ({ ...prev, [itemId]: errorMessage }));

            // Use a timeout to clear the error after 5 seconds
            setTimeout(() => {
                setItemErrors(prev => ({ ...prev, [itemId]: '' }));
            }, 5000);

            // Reset UI to match database state
            await fetchWorkOrderItems();
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;

        try {
            const { error } = await supabase
                .from('work_order_items')
                .delete()
                .eq('id', itemId);

            if (error) throw error;
            await fetchWorkOrderItems();
        } catch (err) {
            console.error('Error deleting item:', err);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;

        try {
            const { error } = await supabase
                .from('work_order_tasks')
                .delete()
                .eq('id', taskId);

            if (error) throw error;
            await fetchWorkOrderTasks();
        } catch (err) {
            console.error('Error deleting task:', err);
        }
    };

    const handleDeleteChecklist = async (checklistId: string) => {
        if (!window.confirm('Are you sure you want to delete this checklist item?')) return;

        try {
            const { error } = await supabase
                .from('work_order_checklists')
                .delete()
                .eq('id', checklistId);

            if (error) throw error;
            await fetchWorkOrderChecklists();
        } catch (err) {
            console.error('Error deleting checklist item:', err);
        }
    };

    // Get style for status badge
    const getStatusStyle = (status: string) => {
        const statusValue = workOrderStatuses.find(s => s.value === status);
        if (!statusValue?.color) return {};
        return {
            backgroundColor: statusValue.color,
            color: statusValue.text_color || '#FFFFFF'
        };
    };

    // Get priority style
    const getPriorityStyle = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'low':
                return { backgroundColor: '#E8F5E9', color: '#2E7D32' };
            case 'medium':
                return { backgroundColor: '#FFF8E1', color: '#F57F17' };
            case 'high':
                return { backgroundColor: '#FFEBEE', color: '#C62828' };
            case 'urgent':
                return { backgroundColor: '#B71C1C', color: '#FFFFFF' };
            default:
                return { backgroundColor: '#E3F2FD', color: '#1565C0' };
        }
    };

    // Get item type style
    const getItemTypeStyle = (type: string) => {
        switch (type.toLowerCase()) {
            case 'material':
                return { backgroundColor: '#E3F2FD', color: '#1565C0' };
            case 'labor':
                return { backgroundColor: '#E8F5E9', color: '#2E7D32' };
            case 'equipment':
                return { backgroundColor: '#FFF8E1', color: '#F57F17' };
            case 'service':
                return { backgroundColor: '#F3E8FF', color: '#7E22CE' };
            default:
                return { backgroundColor: '#F3F4F6', color: '#374151' };
        }
    };

    // Get current status index for the progress bar
    const getCurrentStatusIndex = () => {
        if (!workOrder || !workOrderStatuses.length) return -1;
        return workOrderStatuses.findIndex(status =>
            status.value.toLowerCase() === workOrder.status.toLowerCase()
        );
    };

    // Calculate task completion percentage
    const calculateTaskCompletion = () => {
        if (!workOrderTasks.length) return 0;
        const completedTasks = workOrderTasks.filter(task => task.status === 'completed').length;
        return (completedTasks / workOrderTasks.length) * 100;
    };

    // Calculate checklist completion percentage
    const calculateChecklistCompletion = () => {
        if (!workOrderChecklists.length) return 0;
        const completedItems = workOrderChecklists.filter(item => item.is_completed).length;
        return (completedItems / workOrderChecklists.length) * 100;
    };

    const renderFeedItem = (feed: Feed, isReply = false) => {
        const isEditing = editingFeed?.id === feed.id;
        const replies = feeds.filter(f => f.parent_id === feed.id);

        return (
            <motion.div
                key={feed.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "bg-white rounded-lg shadow-sm p-4 space-y-2",
                    isReply && "ml-8"
                )}
            >
                <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-700 font-medium">
                                {feed.profile.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <div className="font-medium">{feed.profile.name}</div>
                            <div className="text-sm text-gray-500">
                                {new Date(feed.created_at).toLocaleString()}
                                {feed.updated_at && (
                                    <span className="ml-2 text-xs">(edited)</span>
                                )}
                            </div>
                        </div>
                    </div>
                    {feed.created_by === user?.id && !isEditing && (
                        <div className="relative group">
                            <button className="p-1 rounded-full hover:bg-gray-100">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                            <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 py-1 hidden group-hover:block">
                                <button
                                    onClick={() => setEditingFeed(feed)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteComment(feed.id)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {isEditing ? (
                    <div className="mt-2">
                        <textarea
                            value={editingFeed.content}
                            onChange={(e) => setEditingFeed({ ...editingFeed, content: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                            rows={3}
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                            <button
                                onClick={() => setEditingFeed(null)}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleUpdateComment(feed.id, editingFeed.content)}
                                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-gray-700 whitespace-pre-wrap">{feed.content}</p>
                        <div className="flex items-center space-x-4 text-sm">
                            <button
                                onClick={() => setReplyTo(feed)}
                                className="text-gray-500 hover:text-gray-700 flex items-center"
                            >
                                <Reply className="w-4 h-4 mr-1" />
                                Reply
                            </button>
                        </div>
                    </>
                )}

                {replies.length > 0 && (
                    <div className="space-y-4 mt-4">
                        {replies.map(reply => renderFeedItem(reply, true))}
                    </div>
                )}
            </motion.div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (error || !workOrder) {
        return (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error || 'Work order not found'}
            </div>
        );
    }

    return (
        <div className="px-4 py-6 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => navigate('/admin/work-orders')}
                        className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        <span>Back to Work Orders</span>
                    </button>

                    {/* Right buttons group */}
                    <div className="flex space-x-3">
                        <Link
                            to={`/admin/tasks/new?module=work_orders&recordId=${id}`}
                            className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Add Task
                        </Link>
                        <Link
                            to={`/admin/work-orders/${id}/edit`}
                            className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Work Order
                        </Link>
                    </div>
                </div>

                {/* Card Header with Title and Status */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
                    <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                                <div className="bg-indigo-100 rounded-full p-2.5">
                                    <Layers className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <div className="flex items-center">
                                        <h1 className="text-2xl font-bold text-gray-900 mr-3">
                                            {workOrder.work_order_number}
                                        </h1>
                                        <span
                                            className="px-3 py-1 text-xs font-medium rounded-full"
                                            style={getStatusStyle(workOrder.status)}
                                        >
                                            {workOrderStatuses.find(s => s.value === workOrder.status)?.label || workOrder.status}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-medium text-gray-800 mt-1">
                                        {workOrder.title}
                                    </h2>
                                    <div className="flex items-center mt-1.5 space-x-3">
                                        <span
                                            className="px-3 py-1 text-xs font-medium rounded-full"
                                            style={getPriorityStyle(workOrder.priority)}
                                        >
                                            {workOrder.priority} Priority
                                        </span>
                                        {workOrder.order && (
                                            <span className="text-gray-600 text-sm flex items-center">
                                                <ShoppingBag className="w-4 h-4 mr-1 text-gray-500" />
                                                Order: {workOrder.order.order_number}
                                            </span>
                                        )}
                                        <span className="text-gray-500 text-sm">
                                            Created on {new Date(workOrder.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status Bar using picklist values */}
                        <div className="mb-8 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                            {workOrderStatuses.length > 0 && (
                                <div className="relative pt-2">
                                    {/* Progress bar track */}
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        {/* Progress bar fill - width based on current status */}
                                        <div
                                            className="absolute top-2 left-0 h-2 bg-indigo-500 rounded-full"
                                            style={{
                                                width: `${(getCurrentStatusIndex() + 1) * 100 / workOrderStatuses.length}%`,
                                                transition: 'width 0.3s ease-in-out'
                                            }}
                                        ></div>
                                    </div>

                                    {/* Status indicators with dots */}
                                    <div className="flex justify-between mt-1">
                                        {workOrderStatuses.map((status, index) => {
                                            // Determine if this status is active (current or passed)
                                            const isActive = index <= getCurrentStatusIndex();
                                            // Position dots evenly
                                            const position = index / (workOrderStatuses.length - 1) * 100;

                                            return (
                                                <div
                                                    key={status.id}
                                                    className="flex flex-col items-center"
                                                    style={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)' }}
                                                >
                                                    {/* Status dot */}
                                                    <div
                                                        className={`w-4 h-4 rounded-full border-2 border-white ${isActive ? 'bg-indigo-500' : 'bg-gray-300'}`}
                                                        style={{
                                                            marginTop: '-10px',
                                                            boxShadow: '0 0 0 2px white'
                                                        }}
                                                    ></div>

                                                    {/* Status label */}
                                                    <button
                                                        onClick={() => handleStatusChange(status.value)}
                                                        className={`text-sm font-medium mt-2 px-3 py-1 rounded-full transition-colors ${isActive ? 'text-indigo-700' : 'text-gray-500 hover:text-gray-700'
                                                            }`}
                                                    >
                                                        {status.label}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tabs Navigation */}
                        <div className="border-b border-gray-200 mb-6">
                            <nav className="-mb-px flex space-x-8">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'details'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Details
                                </button>
                                <button
                                    onClick={() => setActiveTab('worklog')}
                                    className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'worklog'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <Clipboard className="w-4 h-4 mr-2" />
                                    Work Log
                                </button>
                                <button
                                    onClick={() => setActiveTab('comments')}
                                    className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'comments'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Comments
                                </button>
                            </nav>
                        </div>

                        {/* Details Tab Content */}
                        {activeTab === 'details' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Column */}
                                <div className="space-y-8">
                                    {/* Work Order Information */}
                                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                                            <FileText className="w-5 h-5 text-indigo-500 mr-2" />
                                            Work Order Information
                                        </h2>
                                        <div className="space-y-4">
                                            {workOrder.description && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 mb-1">Description</div>
                                                    <p className="text-gray-700 whitespace-pre-wrap">{workOrder.description}</p>
                                                </div>
                                            )}

                                            {workOrder.notes && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 mb-1">Notes</div>
                                                    <p className="text-gray-700 whitespace-pre-wrap">{workOrder.notes}</p>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 mb-1">Status</div>
                                                    <span
                                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                                                        style={getStatusStyle(workOrder.status)}
                                                    >
                                                        {workOrderStatuses.find(s => s.value === workOrder.status)?.label || workOrder.status}
                                                    </span>
                                                </div>

                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 mb-1">Priority</div>
                                                    <span
                                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                                                        style={getPriorityStyle(workOrder.priority)}
                                                    >
                                                        {workOrder.priority}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Schedule & Timing */}
                                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                                            <Calendar className="w-5 h-5 text-indigo-500 mr-2" />
                                            Schedule & Timing
                                        </h2>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 mb-1">Scheduled Start</div>
                                                    <p className="text-gray-700">
                                                        {workOrder.scheduled_start_date
                                                            ? new Date(workOrder.scheduled_start_date).toLocaleDateString()
                                                            : 'Not scheduled'}
                                                    </p>
                                                </div>

                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 mb-1">Scheduled End</div>
                                                    <p className="text-gray-700">
                                                        {workOrder.scheduled_end_date
                                                            ? new Date(workOrder.scheduled_end_date).toLocaleDateString()
                                                            : 'Not scheduled'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 mb-1">Actual Start</div>
                                                    <p className="text-gray-700 flex items-center">
                                                        {workOrder.actual_start_date
                                                            ? (
                                                                <>
                                                                    <Clock className="w-4 h-4 text-green-500 mr-1" />
                                                                    {new Date(workOrder.actual_start_date).toLocaleDateString()}
                                                                </>
                                                            )
                                                            : 'Not started yet'}
                                                    </p>
                                                </div>

                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 mb-1">Actual End</div>
                                                    <p className="text-gray-700 flex items-center">
                                                        {workOrder.actual_end_date
                                                            ? (
                                                                <>
                                                                    <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                                                                    {new Date(workOrder.actual_end_date).toLocaleDateString()}
                                                                </>
                                                            )
                                                            : 'Not completed yet'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-sm font-medium text-gray-500 mb-1">Progress</div>
                                                <div className="flex items-center space-x-4">
                                                    <div className="flex-1">
                                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                            <div
                                                                className="bg-indigo-600 h-2.5 rounded-full"
                                                                style={{ width: `${calculateTaskCompletion()}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-medium">
                                                        {Math.round(calculateTaskCompletion())}% Complete
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-8">
                                    {/* Location Information */}
                                    {workOrder.location && (
                                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                            <h2 className="text-lg font-semibold mb-4 flex items-center">
                                                <MapPin className="w-5 h-5 text-indigo-500 mr-2" />
                                                Location
                                            </h2>
                                            <div className="space-y-3">
                                                <div className="flex items-center">
                                                    <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                                                    <span className="text-gray-800 font-medium">{workOrder.location.name}</span>
                                                </div>

                                                {workOrder.location.address && (
                                                    <div className="ml-8 text-gray-600">
                                                        {workOrder.location.address}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Assignment */}
                                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                                            <UserCheck className="w-5 h-5 text-indigo-500 mr-2" />
                                            Assignment
                                        </h2>
                                        <div className="space-y-4">
                                            <UserSearch
                                                organizationId={workOrder.organization_id}
                                                selectedUserId={workOrder.assigned_to}
                                                onSelect={handleAssign}
                                            />

                                            {workOrder.assignee && (
                                                <div className="flex items-center mt-4">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                                                        <span className="text-indigo-700 font-medium">
                                                            {workOrder.assignee.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="text-gray-700">
                                                        Currently assigned to <span className="font-medium">{workOrder.assignee.name}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Related Order Information */}
                                    {workOrder.order && (
                                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                            <h2 className="text-lg font-semibold mb-4 flex items-center">
                                                <ShoppingBag className="w-5 h-5 text-indigo-500 mr-2" />
                                                Related Order
                                            </h2>
                                            <div className="space-y-3">
                                                <div className="flex items-center">
                                                    <Link
                                                        to={`/admin/orders/${workOrder.order.order_id}`}
                                                        className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                                                    >
                                                        <ShoppingBag className="w-5 h-5 mr-2" />
                                                        Order #{workOrder.order.order_number}
                                                    </Link>
                                                </div>

                                                {workOrder.order.customer_id && (
                                                    <div className="flex items-center">
                                                        <User className="w-5 h-5 text-gray-400 mr-3" />
                                                        <Link
                                                            to={`/admin/customers/${workOrder.order.customer_id}`}
                                                            className="text-indigo-600 hover:text-indigo-800"
                                                        >
                                                            View Customer
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Work Log Tab Content */}
                        {activeTab === 'worklog' && (
                            <div className="space-y-8">
                                {/* Materials & Inventory */}
                                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                    <div
                                        className="flex justify-between items-center mb-4 cursor-pointer"
                                        onClick={() => setExpandedSections({ ...expandedSections, materials: !expandedSections.materials })}
                                    >
                                        <h2 className="text-lg font-semibold flex items-center">
                                            <Package className="w-5 h-5 text-indigo-500 mr-2" />
                                            Materials & Inventory
                                        </h2>
                                        <button className="text-gray-500 hover:text-gray-700">
                                            {expandedSections.materials ? (
                                                <ChevronUp className="w-5 h-5" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>

                                    {expandedSections.materials && (
                                        <>
                                            <div className="flex justify-end mb-4">
                                                <button
                                                    onClick={() => setShowItemForm(true)}
                                                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
                                                >
                                                    <PlusCircle className="w-4 h-4 mr-1" />
                                                    Add Item
                                                </button>
                                            </div>

                                            {workOrderItems.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                                    <p className="font-medium">No materials added yet</p>
                                                    <p className="text-sm">Click "Add Item" to add materials or equipment</p>
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead>
                                                            <tr className="bg-gray-50">
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Type
                                                                </th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Item
                                                                </th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Quantity
                                                                </th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Consumed
                                                                </th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Cost
                                                                </th>
                                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Actions
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-100">
                                                            {workOrderItems.map((item) => (
                                                                <tr key={item.id} className="hover:bg-gray-50">
                                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                                        <span
                                                                            className="px-2.5 py-1 rounded-full text-xs font-medium"
                                                                            style={getItemTypeStyle(item.type)}
                                                                        >
                                                                            {item.type}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="text-sm font-medium text-gray-900">
                                                                            {item.name}
                                                                        </div>
                                                                        {item.product && (
                                                                            <div className="text-xs text-gray-500">
                                                                                SKU: {item.product.sku}
                                                                            </div>
                                                                        )}
                                                                        {item.description && (
                                                                            <div className="text-xs text-gray-500 truncate max-w-md">
                                                                                {item.description}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                                        {item.quantity_required}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                                        <div className="flex flex-col">
                                                                            <div className="flex items-center">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max={item.quantity_required}
                                                                                    value={item.quantity_consumed}
                                                                                    onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                                                                                    className={`w-16 py-1 px-2 border rounded text-sm ${itemErrors[item.id] ? 'border-red-500' : 'border-gray-300'
                                                                                        }`}
                                                                                />
                                                                            </div>
                                                                            {itemErrors[item.id] && (
                                                                                <div className="text-red-500 text-xs mt-1 max-w-xs">
                                                                                    {itemErrors[item.id]}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                                        {item.unit_cost ? (
                                                                            <div>
                                                                                <div>${item.unit_cost.toFixed(2)} each</div>
                                                                                <div className="text-xs text-gray-500">
                                                                                    Total: ${(item.quantity_consumed * item.unit_cost).toFixed(2)}
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-gray-500">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                                        <div className="flex justify-end items-center space-x-2">
                                                                            <button
                                                                                onClick={() => setEditingItem(item)}
                                                                                className="text-blue-600 hover:text-blue-900"
                                                                            >
                                                                                <Edit className="w-4 h-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteItem(item.id)}
                                                                                className="text-red-600 hover:text-red-900"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Tasks */}
                                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                    <div
                                        className="flex justify-between items-center mb-4 cursor-pointer"
                                        onClick={() => setExpandedSections({ ...expandedSections, tasks: !expandedSections.tasks })}
                                    >
                                        <h2 className="text-lg font-semibold flex items-center">
                                            <ListChecks className="w-5 h-5 text-indigo-500 mr-2" />
                                            Tasks & Procedures
                                        </h2>
                                        <button className="text-gray-500 hover:text-gray-700">
                                            {expandedSections.tasks ? (
                                                <ChevronUp className="w-5 h-5" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>

                                    {expandedSections.tasks && (
                                        <>
                                            <div className="flex justify-end mb-4">
                                                <button
                                                    onClick={() => setShowTaskForm(true)}
                                                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
                                                >
                                                    <PlusCircle className="w-4 h-4 mr-1" />
                                                    Add Task
                                                </button>
                                            </div>

                                            {workOrderTasks.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                    <ListChecks className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                                    <p className="font-medium">No tasks added yet</p>
                                                    <p className="text-sm">Click "Add Task" to create work order tasks</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {workOrderTasks.map((task) => (
                                                        <div key={task.id} className="p-4 border rounded-lg hover:bg-gray-50">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center">
                                                                    <div className="flex-shrink-0 mr-3">
                                                                        <Tag className="w-8 h-8 text-indigo-500" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center">
                                                                            <div className="font-medium text-gray-900 mr-2">
                                                                                {task.task_number}. {task.title}
                                                                            </div>
                                                                            <span
                                                                                className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                                                                                style={task.status === 'completed' ?
                                                                                    { backgroundColor: '#D1FAE5', color: '#065F46' } :
                                                                                    task.status === 'in_progress' ?
                                                                                        { backgroundColor: '#FEF3C7', color: '#92400E' } :
                                                                                        { backgroundColor: '#E5E7EB', color: '#374151' }}
                                                                            >
                                                                                {task.status}
                                                                            </span>
                                                                        </div>
                                                                        {task.description && (
                                                                            <div className="text-sm text-gray-500 mt-1">
                                                                                {task.description}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <select
                                                                        value={task.status}
                                                                        onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                                                                        className="text-sm border-gray-200 rounded-lg mr-2"
                                                                    >
                                                                        <option value="pending">Pending</option>
                                                                        <option value="in_progress">In Progress</option>
                                                                        <option value="completed">Completed</option>
                                                                        <option value="skipped">Skipped</option>
                                                                    </select>
                                                                    <button
                                                                        onClick={() => setEditingTask(task)}
                                                                        className="p-1 text-blue-600 hover:text-blue-900"
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteTask(task.id)}
                                                                        className="p-1 text-red-600 hover:text-red-900"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="mt-3 pt-3 border-t border-gray-100 text-sm grid grid-cols-3 gap-4">
                                                                <div className="flex items-center text-gray-500">
                                                                    <Clock className="w-4 h-4 mr-1 text-gray-400" />
                                                                    {task.estimated_duration ? `${task.estimated_duration} hours` : 'No estimate'}
                                                                </div>
                                                                <div className="flex items-center text-gray-500">
                                                                    <User className="w-4 h-4 mr-1 text-gray-400" />
                                                                    {task.assignee ? task.assignee.name : 'Unassigned'}
                                                                </div>
                                                                <div className="flex items-center text-gray-500">
                                                                    <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                                                                    {task.start_time ? new Date(task.start_time).toLocaleDateString() : 'Not started'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Checklists */}
                                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                    <div
                                        className="flex justify-between items-center mb-4 cursor-pointer"
                                        onClick={() => setExpandedSections({ ...expandedSections, checklists: !expandedSections.checklists })}
                                    >
                                        <h2 className="text-lg font-semibold flex items-center">
                                            <CheckSquare className="w-5 h-5 text-indigo-500 mr-2" />
                                            Quality Checklist
                                        </h2>
                                        <button className="text-gray-500 hover:text-gray-700">
                                            {expandedSections.checklists ? (
                                                <ChevronUp className="w-5 h-5" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>

                                    {expandedSections.checklists && (
                                        <>
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center">
                                                    <div className="w-48 bg-gray-200 rounded-full h-2.5 mr-2">
                                                        <div
                                                            className="bg-green-600 h-2.5 rounded-full"
                                                            style={{ width: `${calculateChecklistCompletion()}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm text-gray-500 font-medium">
                                                        {Math.round(calculateChecklistCompletion())}% Complete
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => setShowChecklistForm(true)}
                                                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
                                                >
                                                    <PlusCircle className="w-4 h-4 mr-1" />
                                                    Add Checklist Item
                                                </button>
                                            </div>

                                            {workOrderChecklists.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                    <CheckSquare className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                                    <p className="font-medium">No checklist items added yet</p>
                                                    <p className="text-sm">Add quality control checklist items to verify work</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {workOrderChecklists.map((item) => (
                                                        <div key={item.id} className="p-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between">
                                                            <div className="flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.is_completed}
                                                                    onChange={() => handleChecklistToggle(item.id, !item.is_completed)}
                                                                    className="h-5 w-5 text-indigo-600 border-gray-300 rounded mr-3"
                                                                />
                                                                <span className={`font-medium ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                                                    {item.item_number}. {item.description}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center">
                                                                {item.is_completed && item.completer && (
                                                                    <div className="text-xs text-gray-500 mr-3">
                                                                        Completed by {item.completer.name} on {new Date(item.completed_at!).toLocaleDateString()}
                                                                    </div>
                                                                )}
                                                                <div className="flex space-x-1">
                                                                    <button
                                                                        onClick={() => setEditingChecklist(item)}
                                                                        className="p-1 text-blue-600 hover:text-blue-900"
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteChecklist(item.id)}
                                                                        className="p-1 text-red-600 hover:text-red-900"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Comments Tab Content */}
                        {activeTab === 'comments' && (
                            <div className="space-y-6">
                                {/* Comment Form */}
                                <form onSubmit={handleSubmitComment} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                                        <MessageSquare className="w-5 h-5 text-indigo-500 mr-2" />
                                        Add Comment
                                    </h2>

                                    {replyTo && (
                                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mb-4">
                                            <span className="text-sm text-gray-600">
                                                Replying to {replyTo.profile.name}'s comment
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setReplyTo(null)}
                                                className="p-1 hover:bg-gray-200 rounded-full"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-start space-x-4">
                                        <div className="flex-1">
                                            <textarea
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                placeholder="Add a comment..."
                                                rows={3}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!newComment.trim()}
                                            className="px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
                                        >
                                            <Send className="w-4 h-4 mr-2" />
                                            Send
                                        </button>
                                    </div>
                                </form>

                                {/* Comment List */}
                                <div className="space-y-4">
                                    {feeds
                                        .filter(feed => !feed.parent_id)
                                        .map(feed => renderFeedItem(feed))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* Modal Forms */}
            {showItemForm && (
                <WorkOrderItemForm
                    workOrderId={id!}
                    isOpen={showItemForm}
                    onClose={() => setShowItemForm(false)}
                    onSave={() => {
                        fetchWorkOrderItems();
                        setShowItemForm(false);
                    }}
                />
            )}

            {editingItem && (
                <WorkOrderItemForm
                    workOrderId={id!}
                    item={editingItem}
                    isOpen={!!editingItem}
                    onClose={() => setEditingItem(null)}
                    onSave={() => {
                        fetchWorkOrderItems();
                        setEditingItem(null);
                    }}
                />
            )}

            {showTaskForm && (
                <WorkOrderTaskForm
                    workOrderId={id!}
                    taskCount={workOrderTasks.length}
                    isOpen={showTaskForm}
                    onClose={() => setShowTaskForm(false)}
                    onSave={() => {
                        fetchWorkOrderTasks();
                        setShowTaskForm(false);
                    }}
                />
            )}

            {editingTask && (
                <WorkOrderTaskForm
                    workOrderId={id!}
                    task={editingTask}
                    isOpen={!!editingTask}
                    onClose={() => setEditingTask(null)}
                    onSave={() => {
                        fetchWorkOrderTasks();
                        setEditingTask(null);
                    }}
                />
            )}

            {showChecklistForm && (
                <WorkOrderChecklistForm
                    workOrderId={id!}
                    itemCount={workOrderChecklists.length}
                    isOpen={showChecklistForm}
                    onClose={() => setShowChecklistForm(false)}
                    onSave={() => {
                        fetchWorkOrderChecklists();
                        setShowChecklistForm(false);
                    }}
                />
            )}

            {editingChecklist && (
                <WorkOrderChecklistForm
                    workOrderId={id!}
                    item={editingChecklist}
                    isOpen={!!editingChecklist}
                    onClose={() => setEditingChecklist(null)}
                    onSave={() => {
                        fetchWorkOrderChecklists();
                        setEditingChecklist(null);
                    }}
                />
            )}
        </div>
    );
}