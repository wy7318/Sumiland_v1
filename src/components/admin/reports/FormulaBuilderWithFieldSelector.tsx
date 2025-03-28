// Import existing utilities
import { FormulaField, evaluateFormula, formatTimeDifference } from './formulaUtils';
import { validateFormula, correctFormula } from './fieldValidator';
import { useState, useRef, useEffect } from 'react';
import { X, ArrowRight, Search, HelpCircle, AlertCircle, Loader, RefreshCw, Check } from 'lucide-react';
import { FormulaFieldStatus } from './FormulaFieldStatus';

type ObjectField = {
    column_name: string;
    data_type: string;
    is_nullable: boolean;
    column_default: string | null;
    display_name?: string;
    is_selected?: boolean;
};

type FormulaBuilderProps = {
    formData: any; // Replace with your Report type
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    fields: ObjectField[];
    objectName: string; // The current object type
    fetchSampleData: (objectName: string) => Promise<any>; // Function to fetch sample data
};

export function FormulaBuilderWithFieldSelector({
    formData,
    setFormData,
    fields,
    objectName,
    fetchSampleData
}: FormulaBuilderProps) {
    const [newFormula, setNewFormula] = useState<Partial<FormulaField>>({
        id: '',
        name: '',
        formula: '',
        result_type: 'number'
    });
    const [formulaError, setFormulaError] = useState<string | null>(null);
    const [showFieldSelector, setShowFieldSelector] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const formulaInputRef = useRef<HTMLTextAreaElement>(null);
    const [cursorPosition, setCursorPosition] = useState(0);

    // Add state for sample data
    const [sampleData, setSampleData] = useState<any>(null);
    const [isLoadingSample, setIsLoadingSample] = useState(false);
    const [sampleDataError, setSampleDataError] = useState<string | null>(null);
    const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

    // Add state for formula suggestions
    const [formulaSuggestions, setFormulaSuggestions] = useState<{
        original: string;
        suggested: string;
        message: string;
    } | null>(null);

    // For testing formulas
    const [previewResult, setPreviewResult] = useState<{ value: any; error: string | null }>({
        value: null,
        error: null
    });

    // Fetch sample data when objectName changes
    useEffect(() => {
        if (!objectName) return;

        const loadSampleData = async () => {
            setIsLoadingSample(true);
            setSampleDataError(null);
            setFormulaSuggestions(null);

            try {
                const data = await fetchSampleData(objectName);
                setSampleData(data);
                console.log('Sample data loaded for', objectName, ':', data);
                // Log available fields for debugging
                console.log('Available fields:', Object.keys(data));
            } catch (error) {
                console.error('Error fetching sample data:', error);
                setSampleDataError(error instanceof Error ? error.message : 'Failed to load sample data');
            } finally {
                setIsLoadingSample(false);
                setHasAttemptedFetch(true);
            }
        };

        loadSampleData();
    }, [objectName, fetchSampleData]);

    // Test formula function with real data
    const testFormula = () => {
        if (!newFormula.formula) {
            setPreviewResult({ value: null, error: null });
            setFormulaSuggestions(null);
            return;
        }

        // Clear previous suggestions
        setFormulaSuggestions(null);

        // If we don't have sample data yet and haven't tried to fetch it
        if (!sampleData && !hasAttemptedFetch) {
            setIsLoadingSample(true);
            fetchSampleData(objectName)
                .then(data => {
                    setSampleData(data);
                    evaluateWithSampleData(data, newFormula.formula);
                })
                .catch(error => {
                    setSampleDataError(error instanceof Error ? error.message : 'Failed to load sample data');
                    setPreviewResult({
                        value: null,
                        error: 'Could not test formula: No sample data available'
                    });
                })
                .finally(() => {
                    setIsLoadingSample(false);
                    setHasAttemptedFetch(true);
                });
            return;
        }

        // If we're still loading, show a loading state
        if (isLoadingSample) {
            setPreviewResult({
                value: null,
                error: 'Loading sample data for testing...'
            });
            return;
        }

        // If we have sample data, use it
        if (sampleData) {
            evaluateWithSampleData(sampleData, newFormula.formula);
        } else {
            // No sample data available after attempt
            setPreviewResult({
                value: null,
                error: 'Could not test formula: No sample data available. Try refreshing the data.'
            });
        }
    };

    const refreshSampleData = async () => {
        setIsLoadingSample(true);
        setSampleDataError(null);
        setFormulaSuggestions(null);

        try {
            const data = await fetchSampleData(objectName);
            setSampleData(data);
            console.log('Sample data refreshed:', data);
        } catch (error) {
            console.error('Error refreshing sample data:', error);
            setSampleDataError(error instanceof Error ? error.message : 'Failed to refresh sample data');
        } finally {
            setIsLoadingSample(false);
        }
    };

    const evaluateWithSampleData = (data: any, formula: string) => {
        try {
            // First validate if all fields in the formula exist in the data
            const validation = validateFormula(formula, data);

            if (!validation.isValid && validation.suggestions) {
                // Provide suggestions to fix the formula
                const correctedFormula = correctFormula(formula, data);

                if (correctedFormula !== formula) {
                    setFormulaSuggestions({
                        original: formula,
                        suggested: correctedFormula,
                        message: validation.message || 'Your formula contains field names that don\'t match the database.'
                    });

                    // Don't evaluate further until the user accepts or rejects suggestions
                    setPreviewResult({
                        value: null,
                        error: 'Formula contains invalid field names. See suggestions below.'
                    });
                    return;
                }
            }

            // Create a copy of sample data to avoid modifying the original
            const recordWithFormulas = { ...data };

            // Add existing formula fields to the record for testing
            // This allows formulas to reference other formula fields
            formData.formula_fields?.forEach((field: FormulaField) => {
                if (field.id !== newFormula.id) { // Skip the current formula being tested
                    try {
                        recordWithFormulas[field.id] = evaluateFormula(
                            field.formula,
                            data,
                            formData.formula_fields
                        );
                    } catch (err) {
                        console.warn(`Failed to evaluate formula ${field.name}:`, err);
                        // Don't fail the whole operation, just skip this formula
                    }
                }
            });

            // Log available fields for debugging
            console.log('Testing formula with available fields:', Object.keys(recordWithFormulas));

            const result = evaluateFormula(
                formula,
                recordWithFormulas,
                formData.formula_fields || []
            );

            setPreviewResult({
                value: result,
                error: null
            });
        } catch (error) {
            console.error('Formula evaluation error:', error);
            setPreviewResult({
                value: null,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    };

    // Apply suggested formula correction
    const applyFormulaSuggestion = () => {
        if (!formulaSuggestions) return;

        setNewFormula(prev => ({
            ...prev,
            formula: formulaSuggestions.suggested
        }));

        // Clear suggestions
        setFormulaSuggestions(null);

        // Re-test with the corrected formula
        if (sampleData) {
            evaluateWithSampleData(sampleData, formulaSuggestions.suggested);
        }
    };

    // Handle field selection
    const handleFieldSelect = (fieldName: string) => {
        if (formulaInputRef.current) {
            const formula = newFormula.formula || '';
            const beforeCursor = formula.substring(0, cursorPosition);
            const afterCursor = formula.substring(cursorPosition);

            // Insert the field name at the cursor position
            const newFormulaText = `${beforeCursor}${fieldName}${afterCursor}`;
            setNewFormula({ ...newFormula, formula: newFormulaText });

            // Update cursor position to after the inserted field
            setCursorPosition(cursorPosition + fieldName.length);

            // Hide the field selector
            setShowFieldSelector(false);

            // Focus back on the formula input
            setTimeout(() => {
                if (formulaInputRef.current) {
                    formulaInputRef.current.focus();
                    formulaInputRef.current.setSelectionRange(
                        cursorPosition + fieldName.length,
                        cursorPosition + fieldName.length
                    );
                }
            }, 0);
        }
    };

    // Track cursor position in formula textarea
    const handleFormulaInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewFormula({ ...newFormula, formula: e.target.value });
        // Clear any previous suggestions when the formula changes
        setFormulaSuggestions(null);
    };

    const handleFormulaInputClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
        if (formulaInputRef.current) {
            setCursorPosition(formulaInputRef.current.selectionStart || 0);
        }
    };

    const handleFormulaInputKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (formulaInputRef.current) {
            setCursorPosition(formulaInputRef.current.selectionStart || 0);
        }
    };

    // Filtered fields based on search term
    const filteredFields = fields.filter(field =>
        field.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.column_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group fields by data type for better organization
    const groupedFields = {
        date: filteredFields.filter(field =>
            field.data_type.includes('timestamp') || field.data_type.includes('date')
        ),
        number: filteredFields.filter(field =>
            field.data_type.includes('int') || field.data_type.includes('decimal') ||
            field.data_type.includes('numeric') || field.data_type.includes('float')
        ),
        text: filteredFields.filter(field =>
            field.data_type.includes('varchar') || field.data_type.includes('text') ||
            field.data_type.includes('char')
        ),
        boolean: filteredFields.filter(field =>
            field.data_type.includes('bool')
        ),
        other: filteredFields.filter(field =>
            !field.data_type.includes('timestamp') && !field.data_type.includes('date') &&
            !field.data_type.includes('int') && !field.data_type.includes('decimal') &&
            !field.data_type.includes('numeric') && !field.data_type.includes('float') &&
            !field.data_type.includes('varchar') && !field.data_type.includes('text') &&
            !field.data_type.includes('char') && !field.data_type.includes('bool')
        )
    };

    // Formula validation
    const validateFormula = (formula: string): boolean => {
        if (!formula.trim()) {
            setFormulaError('Formula cannot be empty');
            return false;
        }

        // Check for basic syntax errors
        try {
            // Check for mismatched parentheses
            let openParens = 0;
            for (const char of formula) {
                if (char === '(') openParens++;
                if (char === ')') openParens--;
                if (openParens < 0) {
                    setFormulaError('Mismatched parentheses in formula');
                    return false;
                }
            }
            if (openParens > 0) {
                setFormulaError('Missing closing parentheses in formula');
                return false;
            }

            // Basic validation successful
            setFormulaError(null);
            return true;
        } catch (error) {
            setFormulaError('Invalid formula syntax');
            return false;
        }
    };

    const handleAddFormula = () => {
        if (!newFormula.name || !newFormula.formula) {
            setFormulaError('Name and formula are required');
            return;
        }

        if (!validateFormula(newFormula.formula)) {
            return;
        }

        const formulaId = `formula_${Date.now()}`;
        const updatedFormula = {
            ...newFormula,
            id: formulaId
        } as FormulaField;

        setFormData(prev => ({
            ...prev,
            formula_fields: [...(prev.formula_fields || []), updatedFormula]
        }));

        // Reset the form
        setNewFormula({
            id: '',
            name: '',
            formula: '',
            result_type: 'number'
        });

        // Clear preview result
        setPreviewResult({ value: null, error: null });
        setFormulaSuggestions(null);
    };

    const handleRemoveFormula = (id: string) => {
        setFormData(prev => ({
            ...prev,
            formula_fields: prev.formula_fields?.filter(f => f.id !== id) || []
        }));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Formula Fields</h3>
                <div className="flex items-center space-x-2">
                    <button
                        type="button"
                        onClick={refreshSampleData}
                        disabled={isLoadingSample}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 flex items-center"
                        title="Refresh sample data"
                    >
                        <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingSample ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            const showHelp = document.getElementById('formula-help');
                            if (showHelp) {
                                showHelp.classList.toggle('hidden');
                            }
                        }}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <HelpCircle className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Field Status Indicator */}
            <FormulaFieldStatus
                sampleData={sampleData}
                isLoading={isLoadingSample}
                error={sampleDataError}
                objectName={objectName}
            />

            <div id="formula-help" className="hidden bg-blue-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-blue-900 mb-2">Formula Field Help</h4>
                <p className="text-sm text-gray-700 mb-2">
                    Formula fields allow you to perform calculations on your data. Use field names exactly as they appear in your data.
                </p>
                <h5 className="font-medium text-blue-800 mt-3 mb-1">Common Formula Examples:</h5>
                <ul className="list-disc list-inside ml-2 text-sm text-gray-700">
                    <li><strong>Date Difference:</strong> converted_at - created_at (returns time in seconds)</li>
                    <li><strong>Percentage:</strong> (converted_leads / total_leads) * 100</li>
                    <li><strong>Conditional:</strong> status === 'Won' ? amount : 0</li>
                </ul>
                <p className="mt-2 text-sm text-blue-700">
                    Click "Show Available Fields" to see and insert fields from your selected object.
                </p>
            </div>

            {/* Formula List */}
            {formData.formula_fields && formData.formula_fields.length > 0 && (
                <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Defined Formulas</h4>
                    <div className="space-y-2">
                        {formData.formula_fields.map((formula: FormulaField) => (
                            <div key={formula.id} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{formula.name}</div>
                                    <div className="text-sm text-gray-500">{formula.formula}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveFormula(formula.id)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* New Formula Form */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Formula Name
                        </label>
                        <input
                            type="text"
                            value={newFormula.name}
                            onChange={(e) => setNewFormula(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Time to Conversion"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Result Type
                        </label>
                        <select
                            value={newFormula.result_type}
                            onChange={(e) => setNewFormula(prev => ({ ...prev, result_type: e.target.value as 'number' | 'string' | 'date' | 'boolean' | 'duration' }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                        >
                            <option value="number">Number</option>
                            <option value="string">Text</option>
                            <option value="date">Date</option>
                            <option value="duration">Duration</option>
                            <option value="boolean">Yes/No</option>
                        </select>
                    </div>
                </div>

                <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                            Formula
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowFieldSelector(!showFieldSelector)}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 flex items-center"
                        >
                            {showFieldSelector ? 'Hide' : 'Show'} Available Fields
                            <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                    </div>
                    <textarea
                        ref={formulaInputRef}
                        value={newFormula.formula}
                        onChange={handleFormulaInputChange}
                        onClick={handleFormulaInputClick}
                        onKeyUp={handleFormulaInputKeyUp}
                        rows={3}
                        placeholder="e.g., converted_at - created_at"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                        Use field names exactly as they appear in your data.
                    </div>

                    {/* Formula Suggestions */}
                    {formulaSuggestions && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <div className="flex items-start">
                                <AlertCircle className="w-4 h-4 mr-2 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 text-sm">
                                    <div className="font-medium text-yellow-800 mb-1">Formula Field Name Issue</div>
                                    <p className="text-yellow-700 text-xs mb-2">
                                        Your formula contains field names that don't match the database. Would you like to update it?
                                    </p>
                                    <div className="bg-white p-2 rounded border border-yellow-200 mb-2 font-mono text-xs overflow-x-auto">
                                        <div className="text-red-500 line-through">{formulaSuggestions.original}</div>
                                        <div className="text-green-600 mt-1">{formulaSuggestions.suggested}</div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={applyFormulaSuggestion}
                                            className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 flex items-center"
                                        >
                                            <Check className="w-3 h-3 mr-1" />
                                            Apply Fix
                                        </button>
                                        <button
                                            onClick={() => setFormulaSuggestions(null)}
                                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                                        >
                                            Keep As Is
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Formula Test UI */}
                    {newFormula.formula && (
                        <div className="mt-2">
                            <button
                                type="button"
                                onClick={testFormula}
                                disabled={isLoadingSample}
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 flex items-center"
                            >
                                {isLoadingSample && <Loader className="w-3 h-3 mr-1 animate-spin" />}
                                Test Formula with Real Data
                            </button>

                            {previewResult.error ? (
                                <div className="mt-2 text-xs text-red-500 p-2 bg-red-50 rounded-md">
                                    {previewResult.error}
                                </div>
                            ) : previewResult.value !== null ? (
                                <div className="mt-2 text-xs text-green-600 p-2 bg-green-50 rounded-md">
                                    Formula result: <span className="font-medium">{
                                        newFormula.result_type === 'duration'
                                            ? formatTimeDifference(previewResult.value)
                                            : previewResult.value
                                    }</span>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Field Selector Popup */}
                    {showFieldSelector && (
                        <div className="overflow-y-auto max-h-72 mt-2 border border-gray-200 rounded-lg">
                            <div className="bg-gray-50 p-2 border-b text-sm font-medium flex justify-between items-center">
                                <span>Available Fields in {objectName}</span>
                                <span className="text-xs text-blue-600">Click to add to formula</span>
                            </div>

                            <div className="p-2">
                                {/* Search box */}
                                <div className="mb-3 flex items-center border border-gray-200 rounded-md bg-white">
                                    <Search className="w-4 h-4 text-gray-400 ml-2 mr-1" />
                                    <input
                                        type="text"
                                        placeholder="Search fields..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0 text-sm py-1.5"
                                    />
                                </div>

                                {/* If sample data is loaded, show the actual available fields */}
                                {sampleData && (
                                    <div className="mb-3">
                                        <div className="text-xs font-semibold text-green-600 mb-1">
                                            Available Fields in Sample Data:
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {Object.keys(sampleData).map((fieldName) => (
                                                <button
                                                    key={fieldName}
                                                    onClick={() => handleFieldSelect(fieldName)}
                                                    className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded hover:bg-green-100"
                                                >
                                                    {fieldName}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Existing formula fields - can be referenced in new formulas */}
                                {formData.formula_fields && formData.formula_fields.length > 0 && (
                                    <div className="mb-3">
                                        <div className="text-xs font-semibold text-purple-600 mb-1">
                                            Existing Formula Fields:
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {formData.formula_fields.map((formula: FormulaField) => (
                                                <button
                                                    key={formula.id}
                                                    onClick={() => handleFieldSelect(formula.id)}
                                                    className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded hover:bg-purple-100"
                                                >
                                                    {formula.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Date fields first since they're commonly used in formulas */}
                                {groupedFields.date.length > 0 && (
                                    <div className="mb-3">
                                        <div className="text-xs font-semibold text-gray-500 mb-1">Date Fields:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {groupedFields.date.map((field) => (
                                                <button
                                                    key={field.column_name}
                                                    onClick={() => handleFieldSelect(field.column_name)}
                                                    className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100"
                                                >
                                                    {field.column_name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Numeric fields */}
                                {groupedFields.number.length > 0 && (
                                    <div className="mb-3">
                                        <div className="text-xs font-semibold text-gray-500 mb-1">Numeric Fields:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {groupedFields.number.map((field) => (
                                                <button
                                                    key={field.column_name}
                                                    onClick={() => handleFieldSelect(field.column_name)}
                                                    className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded hover:bg-green-100"
                                                >
                                                    {field.column_name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Text Fields */}
                                {groupedFields.text.length > 0 && (
                                    <div className="mb-3">
                                        <div className="text-xs font-semibold text-gray-500 mb-1">Text Fields:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {groupedFields.text.map((field) => (
                                                <button
                                                    key={field.column_name}
                                                    onClick={() => handleFieldSelect(field.column_name)}
                                                    className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded hover:bg-yellow-100"
                                                >
                                                    {field.column_name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Boolean Fields */}
                                {groupedFields.boolean.length > 0 && (
                                    <div className="mb-3">
                                        <div className="text-xs font-semibold text-gray-500 mb-1">Boolean Fields:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {groupedFields.boolean.map((field) => (
                                                <button
                                                    key={field.column_name}
                                                    onClick={() => handleFieldSelect(field.column_name)}
                                                    className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded hover:bg-purple-100"
                                                >
                                                    {field.column_name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Other fields */}
                                {groupedFields.other.length > 0 && (
                                    <div>
                                        <div className="text-xs font-semibold text-gray-500 mb-1">Other Fields:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {groupedFields.other.map((field) => (
                                                <button
                                                    key={field.column_name}
                                                    onClick={() => handleFieldSelect(field.column_name)}
                                                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                                                >
                                                    {field.column_name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {filteredFields.length === 0 && !sampleData && (
                                    <div className="p-3 text-sm text-gray-500 text-center">
                                        No matching fields found.
                                    </div>
                                )}
                            </div>

                            <div className="border-t p-2 bg-gray-50 flex justify-end">
                                <button
                                    onClick={() => setShowFieldSelector(false)}
                                    className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {formulaError && (
                    <div className="mb-4 text-red-500 text-sm flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {formulaError}
                    </div>
                )}

                <div>
                    <button
                        type="button"
                        onClick={handleAddFormula}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
                    >
                        Add Formula Field
                    </button>
                </div>
            </div>
        </div>
    );
}