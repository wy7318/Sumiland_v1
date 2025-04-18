// LogicFlowBuilder.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useOrganization } from '../../contexts/OrganizationContext';

// Define types for our component state
interface Column {
    column_name: string;
    data_type: string;
    is_nullable: boolean;
    supported_operators: string[];
    column_description?: string;
}

interface Condition {
    id: string;
    column: string;
    operator: string;
    value: string;
    dataType: string;
    objectPath?: string[];
    referenced_field?: string;
}

interface Action {
    id: string;
    field: string;
    value: string;
    dataType: string;
    target_object_path?: string[];
    source_field_path?: string[];
    source_field?: string;
}

interface ConditionGroup {
    id: string;
    rowOrder: number;
    conditions: Condition[];
    actions: Action[];
}

const LogicFlowBuilder: React.FC = () => {
    const [flowName, setFlowName] = useState<string>('');
    const [flowDescription, setFlowDescription] = useState<string>('');
    const [selectedObject, setSelectedObject] = useState<string>('');
    const [availableObjects, setAvailableObjects] = useState<string[]>([]);
    const [columns, setColumns] = useState<Column[]>([]);
    const { selectedOrganization } = useOrganization();
    const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([
        {
            id: 'new-group-1',
            rowOrder: 1,
            conditions: [{ id: 'new-condition-1', column: '', operator: '', value: '', dataType: '' }],
            actions: [{ id: 'new-action-1', field: '', value: '', dataType: '' }]
        }
    ]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Load available objects (tables)
    useEffect(() => {
        const loadObjects = async (): Promise<void> => {
            try {
                // In a real implementation, this would be a call to your backend that queries
                // information_schema.tables to get the list of CRM tables
                setAvailableObjects([
                    'tasks', 'vendors', 'leads', 'cases', 'opportunities',
                    'quote_hdr', 'quote_dtl', 'order_hdr', 'order_dtl',
                    'products', 'customers'
                ]);
            } catch (error) {
                console.error('Error loading objects:', error);
                setError('Failed to load objects');
            }
        };

        loadObjects();
    }, []);

    // Load columns for selected object
    useEffect(() => {
        const loadColumns = async (): Promise<void> => {
            if (!selectedObject) return;

            setIsLoading(true);
            try {
                const { data, error } = await supabase.rpc('get_table_schema', {
                    p_table_name: selectedObject,
                    p_org_id: '00000000-0000-0000-0000-000000000000' // Replace with actual org ID
                });

                if (error) throw error;
                setColumns(data || []);
            } catch (error) {
                console.error('Error loading columns:', error);
                setError('Failed to load columns');
            } finally {
                setIsLoading(false);
            }
        };

        loadColumns();
    }, [selectedObject]);

    // Add a new condition group (IF/ELSE IF row)
    const addConditionGroup = (): void => {
        const newGroupId = `new-group-${Date.now()}`;
        const newConditionId = `new-condition-${Date.now()}`;
        const newActionId = `new-action-${Date.now()}`;

        setConditionGroups([
            ...conditionGroups,
            {
                id: newGroupId,
                rowOrder: conditionGroups.length + 1,
                conditions: [{ id: newConditionId, column: '', operator: '', value: '', dataType: '' }],
                actions: [{ id: newActionId, field: '', value: '', dataType: '' }]
            }
        ]);
    };

    // Add a new condition within a group (AND condition)
    const addCondition = (groupIndex: number): void => {
        const newConditionId = `new-condition-${Date.now()}`;
        const updatedGroups = [...conditionGroups];

        updatedGroups[groupIndex].conditions.push({
            id: newConditionId,
            column: '',
            operator: '',
            value: '',
            dataType: ''
        });

        setConditionGroups(updatedGroups);
    };

    // Add a new action to a condition group
    const addAction = (groupIndex: number): void => {
        const newActionId = `new-action-${Date.now()}`;
        const updatedGroups = [...conditionGroups];

        updatedGroups[groupIndex].actions.push({
            id: newActionId,
            field: '',
            value: '',
            dataType: ''
        });

        setConditionGroups(updatedGroups);
    };

    // Remove a condition from a group
    const removeCondition = (groupIndex: number, conditionIndex: number): void => {
        const updatedGroups = [...conditionGroups];

        if (updatedGroups[groupIndex].conditions.length > 1) {
            updatedGroups[groupIndex].conditions.splice(conditionIndex, 1);
            setConditionGroups(updatedGroups);
        }
    };

    // Remove an action from a group
    const removeAction = (groupIndex: number, actionIndex: number): void => {
        const updatedGroups = [...conditionGroups];

        if (updatedGroups[groupIndex].actions.length > 1) {
            updatedGroups[groupIndex].actions.splice(actionIndex, 1);
            setConditionGroups(updatedGroups);
        }
    };

    // Remove a condition group
    const removeConditionGroup = (groupIndex: number): void => {
        if (conditionGroups.length > 1) {
            const updatedGroups = conditionGroups.filter((_, index) => index !== groupIndex);
            // Update row order for remaining groups
            updatedGroups.forEach((group, index) => {
                group.rowOrder = index + 1;
            });
            setConditionGroups(updatedGroups);
        }
    };

    // Handle condition change
    const handleConditionChange = (groupIndex: number, conditionIndex: number, field: string, value: string): void => {
        const updatedGroups = [...conditionGroups];
        updatedGroups[groupIndex].conditions[conditionIndex][field as keyof Condition] = value as any;

        // If column changed, update dataType
        if (field === 'column') {
            const selectedColumn = columns.find(col => col.column_name === value);
            if (selectedColumn) {
                updatedGroups[groupIndex].conditions[conditionIndex].dataType = selectedColumn.data_type;
            }
        }

        setConditionGroups(updatedGroups);
    };

    // Handle action change
    const handleActionChange = (groupIndex: number, actionIndex: number, field: string, value: string): void => {
        const updatedGroups = [...conditionGroups];
        updatedGroups[groupIndex].actions[actionIndex][field as keyof Action] = value as any;

        // If field changed, update dataType
        if (field === 'field') {
            const selectedColumn = columns.find(col => col.column_name === value);
            if (selectedColumn) {
                updatedGroups[groupIndex].actions[actionIndex].dataType = selectedColumn.data_type;
            }
        }

        setConditionGroups(updatedGroups);
    };

    // Get supported operators for a column
    const getSupportedOperators = (columnName: string): string[] => {
        if (!columnName) return [];
        const column = columns.find(col => col.column_name === columnName);
        return column ? column.supported_operators : [];
    };

    // Save the flow
    const saveFlow = async (): Promise<void> => {
        if (!flowName || !selectedObject || conditionGroups.length === 0) {
            setError('Please fill in all required fields');
            return;
        }

        // Make sure we have a valid organization ID
        if (!selectedOrganization?.id) {
            setError('No organization selected or organization ID is missing');
            return;
        }

        setIsLoading(true);
        try {
            // Step 1: Save the main flow record with the correct organization_id
            const { data: flowData, error: flowError } = await supabase
                .from('logic_flows')
                .insert({
                    name: flowName,
                    description: flowDescription,
                    object_type: selectedObject,
                    status: true,
                    organization_id: selectedOrganization.id // Use the actual organization ID from context
                })
                .select('id')
                .single();

            if (flowError) throw flowError;
            const flowId = flowData.id;

            // Step 2: Save condition groups, conditions, and actions
            for (const group of conditionGroups) {
                // Save condition group
                const { data: groupData, error: groupError } = await supabase
                    .from('logic_flow_condition_groups')
                    .insert({
                        flow_id: flowId,
                        row_order: group.rowOrder,
                        description: `Row ${group.rowOrder}`
                    })
                    .select('id')
                    .single();

                if (groupError) throw groupError;
                const groupId = groupData.id;

                // Save conditions
                for (let i = 0; i < group.conditions.length; i++) {
                    const condition = group.conditions[i];
                    const { error: condError } = await supabase
                        .from('logic_flow_conditions')
                        .insert({
                            condition_group_id: groupId,
                            column_name: condition.column,
                            data_type: condition.dataType,
                            operator: condition.operator,
                            value: JSON.stringify({ value: condition.value }),
                            condition_order: i + 1,
                            object_path: condition.objectPath || null,
                            referenced_field: condition.referenced_field || null
                        });

                    if (condError) throw condError;
                }

                // Save actions
                for (const action of group.actions) {
                    const { error: actionError } = await supabase
                        .from('logic_flow_actions')
                        .insert({
                            condition_group_id: groupId,
                            field_to_update: action.field,
                            data_type: action.dataType,
                            update_value: JSON.stringify({ value: action.value }),
                            is_formula: false,
                            target_object_path: action.target_object_path || null,
                            source_field_path: action.source_field_path || null,
                            source_field: action.source_field || null
                        });

                    if (actionError) throw actionError;
                }
            }

            alert('Flow saved successfully!');
            // Reset form or redirect to flow list
        } catch (error: any) {
            console.error('Error saving flow:', error);
            setError('Failed to save flow: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="logic-flow-builder p-4">
            <h1 className="text-2xl font-bold mb-4">Logic Flow Builder</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block mb-2">Flow Name</label>
                    <input
                        type="text"
                        value={flowName}
                        onChange={(e) => setFlowName(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Enter flow name"
                    />
                </div>

                <div>
                    <label className="block mb-2">Object Type</label>
                    <select
                        value={selectedObject}
                        onChange={(e) => setSelectedObject(e.target.value)}
                        className="w-full p-2 border rounded"
                    >
                        <option value="">Select an object</option>
                        {availableObjects.map((obj) => (
                            <option key={obj} value={obj}>
                                {obj.charAt(0).toUpperCase() + obj.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mb-6">
                <label className="block mb-2">Description</label>
                <textarea
                    value={flowDescription}
                    onChange={(e) => setFlowDescription(e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Enter flow description"
                    rows={2}
                />
            </div>

            <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Logic Rules</h2>
                <p className="text-gray-600 mb-4">
                    Define your conditions and actions below. Each row represents an IF/ELSE IF statement.
                    Conditions within a row are combined with AND logic. Rows are evaluated top to bottom.
                </p>
            </div>

            {isLoading && <div className="text-center p-4">Loading...</div>}

            {!isLoading && selectedObject && (
                <div className="border rounded overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-2 bg-gray-100 p-3 border-b">
                        <div className="font-semibold">IF (Conditions)</div>
                        <div className="font-semibold">THEN (Actions)</div>
                    </div>

                    {/* Condition Groups */}
                    {conditionGroups.map((group, groupIndex) => (
                        <div key={group.id} className="border-b last:border-b-0">
                            <div className="grid grid-cols-2 p-4 items-start gap-4">
                                {/* Conditions (IF) */}
                                <div className="space-y-4">
                                    <div className="font-medium mb-2">
                                        {groupIndex === 0 ? 'IF' : 'ELSE IF'}
                                    </div>

                                    {group.conditions.map((condition, conditionIndex) => (
                                        <div key={condition.id} className="flex items-start space-x-2">
                                            {conditionIndex > 0 && (
                                                <div className="mt-2 text-sm text-gray-500">AND</div>
                                            )}

                                            <div className="flex-1 grid grid-cols-3 gap-2">
                                                {/* Column selection */}
                                                <select
                                                    value={condition.column}
                                                    onChange={(e) => handleConditionChange(groupIndex, conditionIndex, 'column', e.target.value)}
                                                    className="p-2 border rounded"
                                                >
                                                    <option value="">Select Field</option>
                                                    {columns.map((col) => (
                                                        <option key={col.column_name} value={col.column_name}>
                                                            {col.column_name}
                                                        </option>
                                                    ))}
                                                </select>

                                                {/* Operator selection */}
                                                <select
                                                    value={condition.operator}
                                                    onChange={(e) => handleConditionChange(groupIndex, conditionIndex, 'operator', e.target.value)}
                                                    className="p-2 border rounded"
                                                    disabled={!condition.column}
                                                >
                                                    <option value="">Select Operator</option>
                                                    {getSupportedOperators(condition.column).map((op) => (
                                                        <option key={op} value={op}>
                                                            {op}
                                                        </option>
                                                    ))}
                                                </select>

                                                {/* Value input */}
                                                <div className="flex">
                                                    <input
                                                        type="text"
                                                        value={condition.value}
                                                        onChange={(e) => handleConditionChange(groupIndex, conditionIndex, 'value', e.target.value)}
                                                        className="flex-1 p-2 border rounded"
                                                        placeholder="Value"
                                                        disabled={!condition.operator || ['IS NULL', 'IS NOT NULL', 'IS TRUE', 'IS FALSE'].includes(condition.operator)}
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={() => removeCondition(groupIndex, conditionIndex)}
                                                        className="ml-2 p-2 text-red-500"
                                                        title="Remove condition"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => addCondition(groupIndex)}
                                        className="text-blue-500 text-sm"
                                    >
                                        + Add AND Condition
                                    </button>
                                </div>

                                {/* Actions (THEN) */}
                                <div className="space-y-4">
                                    <div className="font-medium mb-2">THEN</div>

                                    {group.actions.map((action, actionIndex) => (
                                        <div key={action.id} className="grid grid-cols-2 gap-2">
                                            {/* Field selection */}
                                            <select
                                                value={action.field}
                                                onChange={(e) => handleActionChange(groupIndex, actionIndex, 'field', e.target.value)}
                                                className="p-2 border rounded"
                                            >
                                                <option value="">Select Field</option>
                                                {columns.map((col) => (
                                                    <option key={col.column_name} value={col.column_name}>
                                                        {col.column_name}
                                                    </option>
                                                ))}
                                            </select>

                                            {/* Value input */}
                                            <div className="flex">
                                                <input
                                                    type="text"
                                                    value={action.value}
                                                    onChange={(e) => handleActionChange(groupIndex, actionIndex, 'value', e.target.value)}
                                                    className="flex-1 p-2 border rounded"
                                                    placeholder="New Value"
                                                    disabled={!action.field}
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() => removeAction(groupIndex, actionIndex)}
                                                    className="ml-2 p-2 text-red-500"
                                                    title="Remove action"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => addAction(groupIndex)}
                                        className="text-blue-500 text-sm"
                                    >
                                        + Add Action
                                    </button>
                                </div>
                            </div>

                            {/* Group controls */}
                            <div className="bg-gray-50 px-4 py-2 flex justify-between">
                                <button
                                    type="button"
                                    onClick={() => removeConditionGroup(groupIndex)}
                                    className="text-red-500 text-sm"
                                    disabled={conditionGroups.length <= 1}
                                >
                                    Remove Row
                                </button>
                                <div className="text-gray-500 text-sm">
                                    Row {group.rowOrder}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add Row Button */}
                    <div className="p-4">
                        <button
                            type="button"
                            onClick={addConditionGroup}
                            className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                        >
                            + Add ELSE IF Row
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-6 flex justify-end">
                <button
                    type="button"
                    onClick={saveFlow}
                    disabled={isLoading || !selectedObject}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {isLoading ? 'Saving...' : 'Save Flow'}
                </button>
            </div>
        </div>
    );
};

export default LogicFlowBuilder;