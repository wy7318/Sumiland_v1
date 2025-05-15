import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useOrganization } from '../../contexts/OrganizationContext';
import {
    Mail, AlertCircle, CheckCircle,
    Copy, ExternalLink, Info
} from 'lucide-react';

export function EmailToCaseSettings() {
    const { selectedOrganization } = useOrganization();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [registeredEmail, setRegisteredEmail] = useState('');
    const [forwardingAddress, setForwardingAddress] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);
    const [autoResponseEnabled, setAutoResponseEnabled] = useState(false);
    const [responseTemplate, setResponseTemplate] = useState('');

    useEffect(() => {
        if (selectedOrganization?.id) {
            fetchEmailToCaseSettings();
        }
    }, [selectedOrganization]);

    const fetchEmailToCaseSettings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('email_to_case_configs')
                .select('*')
                .eq('organization_id', selectedOrganization.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setRegisteredEmail(data.support_email || '');
                setForwardingAddress(data.forwarding_address || '');
                setIsConfigured(true);
            } else {
                setIsConfigured(false);
            }

            // Also fetch auto-response settings
            const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('case_auto_response, case_response_template')
                .eq('id', selectedOrganization.id)
                .single();

            if (orgError) throw orgError;

            setAutoResponseEnabled(orgData.case_auto_response || false);
            setResponseTemplate(orgData.case_response_template || getDefaultTemplate());
        } catch (err) {
            console.error('Error fetching email-to-case settings:', err);
            setError('Failed to load email-to-case settings');
        } finally {
            setLoading(false);
        }
    };

    const getDefaultTemplate = () => {
        return `<p>Thank you for contacting our support team.</p>
<p>Your case has been received and assigned case number: <strong>{{case_number}}</strong></p>
<p>Case Title: {{case_title}}</p>
<p>Current Status: {{case_status}}</p>
<p>We'll review your case and get back to you as soon as possible. You can reply directly to this email to add more information to your case.</p>
<p>Best regards,<br/>{{org_name}} Support Team</p>`;
    };

    const handleRegisterEmail = async (e) => {
        e.preventDefault();
        setSuccess(false);
        setError('');

        // Simple email validation
        if (!registeredEmail.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        try {
            setLoading(true);

            // Generate a unique forwarding address if not already configured
            let forwardingAddr = forwardingAddress;
            if (!forwardingAddr) {
                // Create a unique identifier using org ID and a timestamp
                const orgIdShort = selectedOrganization.id.substring(0, 8);
                const timestamp = Date.now().toString(36);
                forwardingAddr = `org${orgIdShort}case@inbound.simplidone.com`;
            }

            // Check if config already exists
            if (isConfigured) {
                // Update existing config
                const { error } = await supabase
                    .from('email_to_case_configs')
                    .update({
                        support_email: registeredEmail,
                        updated_at: new Date().toISOString()
                    })
                    .eq('organization_id', selectedOrganization.id);

                if (error) throw error;
            } else {
                // Create new config
                const { error } = await supabase
                    .from('email_to_case_configs')
                    .insert({
                        organization_id: selectedOrganization.id,
                        support_email: registeredEmail,
                        forwarding_address: forwardingAddr,
                        is_enabled: true,
                        created_at: new Date().toISOString()
                    });

                if (error) throw error;
                setForwardingAddress(forwardingAddr);
                setIsConfigured(true);
            }

            setSuccess(true);
        } catch (err) {
            console.error('Error saving email-to-case settings:', err);
            setError('Failed to save email-to-case settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAutoResponse = async (e) => {
        e.preventDefault();
        setSuccess(false);
        setError('');

        try {
            setLoading(true);

            const { error } = await supabase
                .from('organizations')
                .update({
                    case_auto_response: autoResponseEnabled,
                    case_response_template: responseTemplate,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedOrganization.id);

            if (error) throw error;

            setSuccess(true);
        } catch (err) {
            console.error('Error saving auto-response settings:', err);
            setError('Failed to save auto-response settings');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Show temporary success message
        const originalError = error;
        setError('');
        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            setError(originalError);
        }, 2000);
    };

    return (
        <div className="space-y-8 bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Mail className="w-5 h-5 text-blue-500 mr-2" />
                Email-to-Case Configuration
            </h2>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {success === true ? "Settings saved successfully" : success}
                </div>
            )}

            <div className="mb-6 bg-blue-50 rounded-lg p-4 text-sm text-blue-700 flex items-start">
                <Info className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                    <p>Email-to-Case allows your customers to create and update cases by sending emails to your support address.</p>
                    <p className="mt-2">Register your support email below, then set up email forwarding to the provided address.</p>
                </div>
            </div>

            <form onSubmit={handleRegisterEmail} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Support Email Address
                    </label>
                    <div className="flex">
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                value={registeredEmail}
                                onChange={(e) => setRegisteredEmail(e.target.value)}
                                className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="support@yourcompany.com"
                            />
                        </div>
                        <button
                            type="submit"
                            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : (isConfigured ? 'Update' : 'Register')}
                        </button>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                        This is the email address your customers use to contact your support team.
                    </p>
                </div>
            </form>

            {isConfigured && forwardingAddress && (
                <div className="mt-6 border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-medium mb-3">Email Forwarding Setup</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Set up email forwarding from {registeredEmail} to the address below:
                    </p>

                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center">
                            <code className="text-sm font-mono">{forwardingAddress}</code>
                            <button
                                onClick={() => copyToClipboard(forwardingAddress)}
                                className="text-blue-500 hover:text-blue-700"
                                title="Copy to clipboard"
                            >
                                <Copy className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        <h4 className="font-medium text-sm">How to set up forwarding:</h4>
                        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2 pl-2">
                            <li>Log in to your email service provider (Gmail, Outlook, etc.)</li>
                            <li>Find the forwarding or rules settings</li>
                            <li>Create a rule to forward all incoming emails to the address above</li>
                            <li>Make sure to keep a copy of the original emails in your inbox if needed</li>
                        </ol>

                        <div className="mt-4">
                            <h4 className="font-medium text-sm">Provider-specific instructions:</h4>
                            <div className="mt-2 space-y-2">
                                <a
                                    href="https://support.google.com/mail/answer/10957?hl=en"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                                >
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    How to forward emails in Gmail
                                </a>
                                <div className="block">
                                    <a
                                        href="https://support.microsoft.com/en-us/office/forward-email-from-outlook-to-another-email-account-1ed4ee1e-74f8-4f53-a174-86b748ff6a0e"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                        <ExternalLink className="h-4 w-4 mr-1" />
                                        How to forward emails in Outlook
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Auto-Response Section */}
            <div className="mt-8 border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium mb-3">Case Auto-Response</h3>

                <form onSubmit={handleSaveAutoResponse} className="space-y-6">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="autoResponse"
                            checked={autoResponseEnabled}
                            onChange={() => setAutoResponseEnabled(!autoResponseEnabled)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <label htmlFor="autoResponse" className="ml-2 block text-sm text-gray-700">
                            Enable automatic responses for new cases created by email
                        </label>
                    </div>

                    {autoResponseEnabled && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Response Template
                            </label>
                            <textarea
                                value={responseTemplate}
                                onChange={(e) => setResponseTemplate(e.target.value)}
                                rows={10}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />

                            <div className="mt-2 text-sm text-gray-500">
                                <p>You can use these variables in your template:</p>
                                <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                                    <li><code className="bg-gray-100 px-1 rounded">&#123;&#123;case_number&#125;&#125;</code> - The unique case ID</li>
                                    <li><code className="bg-gray-100 px-1 rounded">&#123;&#123;case_title&#125;&#125;</code> - The subject of the case</li>
                                    <li><code className="bg-gray-100 px-1 rounded">&#123;&#123;case_status&#125;&#125;</code> - The current status</li>
                                    <li><code className="bg-gray-100 px-1 rounded">&#123;&#123;org_name&#125;&#125;</code> - Your organization name</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}