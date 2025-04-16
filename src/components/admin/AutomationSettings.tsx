import { useState, useEffect } from 'react';
import { Info, AlertCircle, Mail, Settings, Save } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Switch } from '../ui/Switch'; // Assuming you have a Switch component
import { Tooltip } from '../ui/Tooltip'; // Assuming you have a Tooltip component

// Rich text editor modules configuration
const quillModules = {
    toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link', 'image'],
        ['clean'],
    ],
};

const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link', 'image',
];

// Available template variables for the dropdown
const templateVariables = [
    { label: "Lead First Name", value: "{{lead.first_name}}" },
    { label: "Lead Last Name", value: "{{lead.last_name}}" },
    { label: "Lead Email", value: "{{lead.email}}" },
    { label: "Lead Phone", value: "{{lead.phone}}" },
    { label: "Lead Company", value: "{{lead.company}}" },
    { label: "Lead Title", value: "{{lead.title}}" },
    { label: "Lead Source", value: "{{lead.source}}" },
    { label: "Case Number", value: "{{case.number}}" },
    { label: "Case Title", value: "{{case.title}}" },
    { label: "Case Status", value: "{{case.status}}" },
    { label: "Case Priority", value: "{{case.priority}}" },
    { label: "Organization Name", value: "{{organization.name}}" },
    { label: "User Name", value: "{{user.name}}" },
    { label: "User Email", value: "{{user.email}}" },
];

export function AutomationSettings({
    organization,
    emailConfigs,
    isLoading,
    onUpdate
}) {
    // State for automation settings
    const [leadAutoResponse, setLeadAutoResponse] = useState(organization?.lead_auto_response || false);
    const [leadResponseTemplate, setLeadResponseTemplate] = useState(organization?.lead_response_template || '');
    const [caseAutoResponse, setCaseAutoResponse] = useState(organization?.case_auto_response || false);
    const [caseResponseTemplate, setCaseResponseTemplate] = useState(organization?.case_response_template || '');
    const [selectedVariable, setSelectedVariable] = useState('');
    const [activeEditor, setActiveEditor] = useState(null);

    // Check if organization has email configured
    const hasEmailConfigured = emailConfigs && emailConfigs.length > 0;

    // Update local state when organization data changes
    useEffect(() => {
        if (organization) {
            setLeadAutoResponse(organization.lead_auto_response || false);
            setLeadResponseTemplate(organization.lead_response_template || '');
            setCaseAutoResponse(organization.case_auto_response || false);
            setCaseResponseTemplate(organization.case_response_template || '');
        }
    }, [organization]);

    // Handle toggle changes
    const handleLeadAutoResponseChange = (checked) => {
        if (!hasEmailConfigured) return;
        setLeadAutoResponse(checked);
    };

    const handleCaseAutoResponseChange = (checked) => {
        if (!hasEmailConfigured) return;
        setCaseAutoResponse(checked);
    };

    // Handle template variable selection
    const handleVariableSelect = (e) => {
        const value = e.target.value;
        if (!value) return;

        setSelectedVariable('');

        // Insert the variable at the current cursor position
        if (activeEditor && activeEditor.getEditor) {
            const editor = activeEditor.getEditor();
            const range = editor.getSelection();
            if (range) {
                editor.insertText(range.index, value);
            }
        }
    };

    // Handle saving automation settings
    const handleSaveAutomationSettings = () => {
        const updatedSettings = {
            lead_auto_response: leadAutoResponse,
            lead_response_template: leadResponseTemplate,
            case_auto_response: caseAutoResponse,
            case_response_template: caseResponseTemplate
        };

        onUpdate(updatedSettings);
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Automation Settings
            </h3>

            {/* Warning when no email configured */}
            {!hasEmailConfigured && (
                <div className="mb-6 p-4 bg-amber-50 text-amber-600 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Email not configured</p>
                        <p className="text-sm">
                            Automation features require an organization email to be configured.
                            Please set up an email in the Email Configuration section above.
                        </p>
                    </div>
                </div>
            )}

            {/* Template Variables Dropdown */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Insert Template Variable
                </label>
                <select
                    value={selectedVariable}
                    onChange={handleVariableSelect}
                    disabled={!hasEmailConfigured}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
                >
                    <option value="">Select a variable...</option>
                    {templateVariables.map((variable) => (
                        <option key={variable.value} value={variable.value}>
                            {variable.label} - {variable.value}
                        </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                    Variables will be replaced with actual values when the email is sent.
                </p>
            </div>

            {/* Lead Auto Response Settings */}
            <div className="mb-8 border-b border-gray-200 pb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <h4 className="font-medium">Lead Auto Response</h4>
                        <Tooltip content="When enabled, an automatic email will be sent to new leads when they're created.">
                            <button type="button" className="ml-2 text-gray-400 hover:text-gray-500">
                                <Info className="w-4 h-4" />
                            </button>
                        </Tooltip>
                    </div>

                    <div className="flex items-center">
                        {!hasEmailConfigured && (
                            <span className="text-xs text-amber-500 mr-3 hidden sm:inline">
                                <Mail className="w-3 h-3 inline mr-1" />
                                Email required
                            </span>
                        )}
                        <Switch
                            checked={leadAutoResponse}
                            onCheckedChange={handleLeadAutoResponseChange}
                            disabled={!hasEmailConfigured}
                            className={!hasEmailConfigured ? "opacity-50" : ""}
                        />
                    </div>
                </div>

                <div className={`${!hasEmailConfigured || !leadAutoResponse ? "opacity-50 pointer-events-none" : ""}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lead Response Email Template
                    </label>
                    <ReactQuill
                        theme="snow"
                        value={leadResponseTemplate}
                        onChange={setLeadResponseTemplate}
                        modules={quillModules}
                        formats={quillFormats}
                        className="h-56 mb-2"
                        ref={(el) => activeEditor === 'lead' && el}
                        onFocus={() => setActiveEditor('lead')}
                    />

                    <div className="text-right mt-2">
                        <button
                            type="button"
                            onClick={() => setActiveEditor('lead')}
                            className="text-xs text-primary-600 hover:text-primary-700"
                        >
                            Set as active editor
                        </button>
                    </div>
                </div>
            </div>

            {/* Case Auto Response Settings */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <h4 className="font-medium">Case Auto Response</h4>
                        <Tooltip content="When enabled, an automatic email will be sent when new cases are created.">
                            <button type="button" className="ml-2 text-gray-400 hover:text-gray-500">
                                <Info className="w-4 h-4" />
                            </button>
                        </Tooltip>
                    </div>

                    <div className="flex items-center">
                        {!hasEmailConfigured && (
                            <span className="text-xs text-amber-500 mr-3 hidden sm:inline">
                                <Mail className="w-3 h-3 inline mr-1" />
                                Email required
                            </span>
                        )}
                        <Switch
                            checked={caseAutoResponse}
                            onCheckedChange={handleCaseAutoResponseChange}
                            disabled={!hasEmailConfigured}
                            className={!hasEmailConfigured ? "opacity-50" : ""}
                        />
                    </div>
                </div>

                <div className={`${!hasEmailConfigured || !caseAutoResponse ? "opacity-50 pointer-events-none" : ""}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Case Response Email Template
                    </label>
                    <ReactQuill
                        theme="snow"
                        value={caseResponseTemplate}
                        onChange={setCaseResponseTemplate}
                        modules={quillModules}
                        formats={quillFormats}
                        className="h-56 mb-2"
                        ref={(el) => activeEditor === 'case' && el}
                        onFocus={() => setActiveEditor('case')}
                    />

                    <div className="text-right mt-2">
                        <button
                            type="button"
                            onClick={() => setActiveEditor('case')}
                            className="text-xs text-primary-600 hover:text-primary-700"
                        >
                            Set as active editor
                        </button>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSaveAutomationSettings}
                    disabled={isLoading || !hasEmailConfigured}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 flex items-center"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Automation Settings'}
                </button>
            </div>
        </div>
    );
}