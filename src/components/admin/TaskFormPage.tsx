// UPDATED: TaskFormPage with Org Timezone support

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { X, Save, AlertCircle, Calendar, Search } from 'lucide-react';
import { UserSearch } from './UserSearch';
import { DateTime } from 'luxon';

const moduleOptions = [
    { name: 'Opportunities', table: 'opportunities', idField: 'id', nameField: 'name' },
    { name: 'Quotes', table: 'quote_hdr', idField: 'quote_id', nameField: 'quote_number' },
    { name: 'Orders', table: 'order_hdr', idField: 'order_id', nameField: 'order_number' },
    { name: 'Cases', table: 'cases', idField: 'id', nameField: 'title' },
    { name: 'Leads', table: 'leads', idField: 'id', nameField: 'company' },
    { name: 'Accounts', table: 'vendors', idField: 'id', nameField: 'name' },
    { name: 'Customers', table: 'customers', idField: 'customer_id', nameField: 'company' }
];

export function TaskFormPage() {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [assignedTo, setAssignedTo] = useState<string>('');
    const [isPersonal, setIsPersonal] = useState(true);
    const [selectedModule, setSelectedModule] = useState<any | null>(null);
    const [recordId, setRecordId] = useState('');
    const [moduleRecords, setModuleRecords] = useState<any[]>([]);
    const [recordSearch, setRecordSearch] = useState('');
    const [isDone, setIsDone] = useState(false);
    const [orgTimezone, setOrgTimezone] = useState('UTC');

    useEffect(() => {
        if (!id) {
            const moduleParam = searchParams.get('module');
            const recordParam = searchParams.get('recordId');
            if (moduleParam) {
                const mod = moduleOptions.find(m => m.table === moduleParam);
                if (mod) setSelectedModule(mod);
            }
            if (recordParam) setRecordId(recordParam);
        }
    }, [id, searchParams]);

    useEffect(() => {
        if (selectedOrganization?.id) {
            supabase.from('organizations')
                .select('timezone')
                .eq('id', selectedOrganization.id)
                .single()
                .then(({ data, error }) => {
                    if (!error && data?.timezone) setOrgTimezone(data.timezone);
                });
        }
    }, [selectedOrganization]);

    useEffect(() => {
        if (id) fetchTask();
    }, [id]);

    useEffect(() => {
        if (selectedModule) fetchModuleRecords();
    }, [selectedModule, recordSearch]);

    const fetchTask = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single();
            if (error) throw error;
            if (data) {
                setTitle(data.title);
                setDescription(data.description || '');
                setDueDate(DateTime.fromISO(data.due_date, { zone: 'utc' }).setZone(orgTimezone).toISODate());
                setAssignedTo(data.assigned_to || '');
                setIsPersonal(data.is_personal);
                setIsDone(data.is_done);
                const moduleInfo = moduleOptions.find(mod => mod.table === data.module_name);
                setSelectedModule(moduleInfo || null);
                setRecordId(data.record_id || '');
            }
        } catch (err) {
            console.error('Error fetching task:', err);
            setError('Failed to load task');
        } finally {
            setLoading(false);
        }
    };

    const fetchModuleRecords = async () => {
        if (!selectedModule || !selectedOrganization?.id) return;

        try {
            let query = supabase
                .from(selectedModule.table)
                .select(`${selectedModule.idField}, ${selectedModule.nameField}`)
                .eq('organization_id', selectedOrganization.id);

            if (recordSearch.trim()) {
                query = query.ilike(selectedModule.nameField, `%${recordSearch.trim()}%`);
            }

            const { data, error } = await query.limit(20);
            if (error) throw error;
            setModuleRecords(data || []);
        } catch (err) {
            console.error('Error fetching module records:', err);
            setError('Failed to load module records');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const dueDateUtc = DateTime.fromISO(dueDate, { zone: orgTimezone }).toUTC().toISO();

            const payload = {
                title,
                description,
                due_date: dueDateUtc,
                assigned_to: assignedTo || null,
                is_personal: isPersonal,
                is_done: isDone,
                organization_id: selectedOrganization?.id || null,
                created_by: user?.id,
                module_name: selectedModule?.table || null,
                record_id: recordId || null
            };

            if (id) {
                const { error } = await supabase.from('tasks').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('tasks').insert(payload);
                if (error) throw error;
            }

            const moduleParam = searchParams.get('module');
            const recordParam = searchParams.get('recordId');
            if (moduleParam && recordParam) {
                const moduleOption = moduleOptions.find(m => m.table === moduleParam);
                if (moduleOption) {
                    let basePath = moduleOption.table;
                    if (moduleOption.table === 'order_hdr') basePath = 'orders';
                    if (moduleOption.table === 'quote_hdr') basePath = 'quotes';
                    if (moduleOption.table === 'customers') basePath = 'customers';
                    if (moduleOption.table === 'opportunities') basePath = 'opportunities';
                    if (moduleOption.table === 'leads') basePath = 'leads';
                    if (moduleOption.table === 'vendors') basePath = 'vendors';
                    if (moduleOption.table === 'cases') basePath = 'cases';
                    navigate(`/admin/${basePath}/${recordParam}`);
                    return;
                }
            }
            navigate('/admin/tasks');
        } catch (err) {
            console.error('Error saving task:', err);
            setError('Failed to save task');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto mt-8 p-6 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{id ? 'Edit Task' : 'New Task'}</h1>
                <button onClick={() => navigate('/admin/tasks')} className="text-gray-500 hover:text-gray-700">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {error && (
                <div className="mb-4 text-red-600 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" /> {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mark as Completed</label>
                    <label className="inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={isDone}
                            onChange={(e) => setIsDone(e.target.checked)}
                        />
                        <div className="relative">
                            <div className="block bg-gray-300 w-10 h-6 rounded-full"></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${isDone ? 'transform translate-x-4 bg-green-500' : ''
                                }`}></div>
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-900">
                            {isDone ? 'Yes' : 'No'}
                        </span>
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            required
                            className="w-full pl-10 py-2 rounded-lg border border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                    <UserSearch
                        organizationId={selectedOrganization?.id || ''}
                        selectedUserId={assignedTo}
                        onSelect={(userId) => setAssignedTo(userId || '')}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Related Module (optional)</label>
                    <select
                        value={selectedModule?.table || ''}
                        onChange={(e) => {
                            const mod = moduleOptions.find(m => m.table === e.target.value);
                            setSelectedModule(mod || null);
                            setRecordId('');
                        }}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                    >
                        <option value="">Select Module</option>
                        {moduleOptions.map(mod => (
                            <option key={mod.table} value={mod.table}>{mod.name}</option>
                        ))}
                    </select>
                </div>

                {selectedModule && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search Record</label>
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder={`Search ${selectedModule.name}...`}
                                value={recordSearch}
                                onChange={(e) => setRecordSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                            />
                        </div>

                        <select
                            value={recordId}
                            onChange={(e) => setRecordId(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                        >
                            <option value="">Select Record</option>
                            {moduleRecords.map(record => (
                                <option key={record[selectedModule.idField]} value={record[selectedModule.idField]}>
                                    {record[selectedModule.nameField] || record[selectedModule.idField]}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        checked={isPersonal}
                        onChange={(e) => setIsPersonal(e.target.checked)}
                        className="mr-2"
                    />
                    <label className="text-sm text-gray-700">Personal Task</label>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 flex items-center disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Save Task'}
                    </button>
                </div>
            </form>
        </div>
    );
}
