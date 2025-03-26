import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DroppableProps } from 'react-beautiful-dnd';

export const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const animation = requestAnimationFrame(() => setEnabled(true));

        return () => {
            cancelAnimationFrame(animation);
            setEnabled(false);
        };
    }, []);

    if (!enabled) {
        return null;
    }

    return <Droppable {...props}>{children}</Droppable>;
};

export function FormTemplateEditor() {
    const { templateId } = useParams();
    const navigate = useNavigate();
    const { selectedOrganization } = useOrganization();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [fields, setFields] = useState([]);
    const [availableFields, setAvailableFields] = useState([]);
    const [loadingFields, setLoadingFields] = useState(true);

    // Create a stable and unique identifier for draggable items
    const createDraggableId = (field) => {
        // Combine type and name, remove any non-alphanumeric characters, 
        // and ensure a unique identifier
        return `draggable-${field.type}-${field.name}`
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '_')
            .replace(/__+/g, '_')
            .replace(/^_|_$/g, '');
    };

    useEffect(() => {
        if (selectedOrganization?.id) {
            fetchAvailableFields();
            if (templateId) fetchTemplate();
        }
    }, [templateId, selectedOrganization]);

    const fetchAvailableFields = async () => {
        setLoadingFields(true);
        const { data: hdrData } = await supabase
            .from('quote_hdr')
            .select('*')
            .eq('organization_id', selectedOrganization?.id)
            .limit(1);

        const { data: dtlData } = await supabase
            .from('quote_dtl')
            .select('*')
            .eq('organization_id', selectedOrganization?.id)
            .limit(1);

        const { data: customData } = await supabase
            .from('custom_fields')
            .select('*')
            .eq('entity_type', 'quotes')
            .eq('organization_id', selectedOrganization?.id);

        const hdrFields = hdrData && hdrData.length > 0
            ? Object.keys(hdrData[0])
                .filter(f => f !== 'id') // Exclude 'id' field
                .map(f => ({ type: 'quote_hdr', name: f }))
            : [];

        const dtlFields = dtlData && dtlData.length > 0
            ? Object.keys(dtlData[0])
                .filter(f => f !== 'id') // Exclude 'id' field
                .map(f => ({ type: 'quote_dtl', name: f }))
            : [];

        const customFields = customData
            ? customData.map(f => ({ type: 'custom', name: f.field_name }))
            : [];

        setAvailableFields([...hdrFields, ...dtlFields, ...customFields]);
        setLoadingFields(false);
    };

    const onDragEnd = (result) => {
        const { source, destination, draggableId } = result;

        // Early return if no destination
        if (!destination) return;

        if (source.droppableId === 'availableFields' && destination.droppableId === 'templateFields') {
            // Find the dragged field using the draggableId
            const draggedField = availableFields.find(f => {
                const safeId = createDraggableId(f);
                return safeId === draggableId;
            });

            if (!draggedField) {
                console.error('Could not find dragged field', { draggableId, availableFields });
                return;
            }

            const newField = {
                id: uuidv4(),
                field_type: draggedField.type,
                field_name: draggedField.name,
                field_label: draggedField.name,
                constant_value: null,
                position: fields.length
            };

            const updated = Array.from(fields);
            updated.splice(destination.index, 0, newField);
            setFields(updated);
        }

        // Handle reordering within template fields
        if (source.droppableId === 'templateFields' && destination.droppableId === 'templateFields') {
            const updated = Array.from(fields);
            const [moved] = updated.splice(source.index, 1);
            updated.splice(destination.index, 0, moved);
            setFields(updated);
        }
    };

    const removeField = (id) => {
        setFields(fields.filter(f => f.id !== id));
    };

    const saveTemplate = async () => {
        let currentTemplateId = templateId;

        if (!templateId) {
            const { data, error } = await supabase
                .from('form_templates')
                .insert([{ name, description, organization_id: selectedOrganization?.id }])
                .select();
            currentTemplateId = data[0].id;
        } else {
            await supabase
                .from('form_templates')
                .update({ name, description })
                .eq('id', templateId);
            await supabase
                .from('form_template_fields')
                .delete()
                .eq('template_id', templateId);
        }

        const fieldsToInsert = fields.map((f, index) => ({
            template_id: currentTemplateId,
            field_name: f.field_name,
            field_label: f.field_label,
            field_type: f.field_type,
            constant_value: f.constant_value,
            position: index,
            organization_id: selectedOrganization?.id
        }));

        await supabase.from('form_template_fields').insert(fieldsToInsert);
        alert('Template saved successfully!');
        navigate('/admin/form-templates');
    };

    if (loadingFields) {
        return <div className="p-4 text-center">Loading fields...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">{templateId ? 'Edit' : 'Create'} Form Template</h2>
            <input
                className="w-full border p-2 mb-2"
                placeholder="Template Name"
                value={name}
                onChange={e => setName(e.target.value)}
            />
            <textarea
                className="w-full border p-2 mb-4"
                placeholder="Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
            />

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-6">
                    <StrictModeDroppable droppableId="availableFields" isDropDisabled={true}>
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="w-1/2 border p-4 rounded">
                                <h3 className="font-semibold mb-2">Available Fields</h3>
                                {availableFields.map((f, index) => {
                                    const safeId = createDraggableId(f);
                                    return (
                                        <Draggable
                                            key={safeId}
                                            draggableId={safeId}
                                            index={index}
                                        >
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className="p-2 border mb-2 rounded bg-gray-100 cursor-move"
                                                >
                                                    {f.name} ({f.type})
                                                </div>
                                            )}
                                        </Draggable>
                                    );
                                })}
                                {provided.placeholder}
                            </div>
                        )}
                    </StrictModeDroppable>

                    <StrictModeDroppable droppableId="templateFields">
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="w-1/2 border p-4 rounded">
                                <h3 className="font-semibold mb-2">Template Fields</h3>
                                {fields.map((f, index) => (
                                    <Draggable key={f.id} draggableId={f.id} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className="p-2 border mb-2 rounded bg-white flex justify-between items-center"
                                            >
                                                <span>{f.field_label} ({f.field_type})</span>
                                                <button onClick={() => removeField(f.id)} className="text-red-500 ml-2">Remove</button>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </StrictModeDroppable>
                </div>
            </DragDropContext>

            <button onClick={saveTemplate} className="mt-6 bg-green-600 text-white px-6 py-2 rounded">Save Template</button>
        </div>
    );
}