import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Link, useNavigate } from 'react-router-dom';

export function FormTemplateList() {
    const { selectedOrganization } = useOrganization();
    const [templates, setTemplates] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (selectedOrganization?.id) fetchTemplates();
    }, [selectedOrganization]);

    const fetchTemplates = async () => {
        const { data, error } = await supabase
            .from('form_templates')
            .select('*')
            .eq('organization_id', selectedOrganization.id)
            .order('created_at', { ascending: false });

        if (!error) setTemplates(data);
        else console.error('Error fetching templates:', error);
    };

    const deleteTemplate = async (id: string) => {
        if (confirm('Delete this template?')) {
            await supabase.from('form_templates').delete().eq('id', id);
            fetchTemplates();
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Form Templates</h2>
                <Link to="/admin/form-templates/create" className="bg-blue-600 text-white px-4 py-2 rounded">
                    Create New
                </Link>
            </div>
            <table className="w-full border">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border p-2 text-left">Name</th>
                        <th className="border p-2 text-left">Description</th>
                        <th className="border p-2 text-left">Created At</th>
                        <th className="border p-2 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {templates.map((t) => (
                        <tr key={t.id}>
                            <td className="border p-2">{t.name}</td>
                            <td className="border p-2">{t.description}</td>
                            <td className="border p-2">{new Date(t.created_at).toLocaleDateString()}</td>
                            <td className="border p-2">
                                <Link to={`/admin/form-templates/edit/${t.id}`} className="text-blue-500 mr-2">
                                    Edit
                                </Link>
                                <button onClick={() => deleteTemplate(t.id)} className="text-red-500">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                    {!templates.length && (
                        <tr>
                            <td colSpan={4} className="border p-4 text-center text-gray-500">
                                No templates found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}