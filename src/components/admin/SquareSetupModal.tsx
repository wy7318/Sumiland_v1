// components/SquareSetupModal.tsx
import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useOrganization } from '../../contexts/OrganizationContext';
import {
    testSquareConnection,
    setupSquareIntegration,
    getSquareCredentials
} from '../../services/squareService';

interface SquareSetupModalProps {
    onClose: () => void;
    onSuccess?: () => void;
    forceEdit?: boolean; // New prop to force edit mode
}

export function SquareSetupModal({ onClose, onSuccess, forceEdit = false }: SquareSetupModalProps) {
    const { selectedOrganization } = useOrganization();
    const [accessToken, setAccessToken] = useState('');
    const [locationId, setLocationId] = useState('');
    const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingCredentials, setExistingCredentials] = useState<any | null>(null);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<any | null>(null);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [editMode, setEditMode] = useState(forceEdit); // Start in edit mode if forceEdit is true

    // Add function to append logs
    const addLog = (message: string) => {
        console.log(message); // Still log to console
        setDebugLogs(prev => [...prev, `${new Date().toISOString().slice(11, 19)} - ${message}`]);
    };

    useEffect(() => {
        if (selectedOrganization?.id) {
            fetchExistingCredentials();
        }
    }, [selectedOrganization?.id]);

    const fetchExistingCredentials = async () => {
        try {
            if (!selectedOrganization?.id) return;

            addLog(`Fetching existing credentials for org ID: ${selectedOrganization.id}`);
            const credentials = await getSquareCredentials(selectedOrganization.id);

            if (credentials) {
                addLog(`Found existing credentials with locationId: ${credentials.locationId}`);
                setExistingCredentials(credentials);
                setAccessToken(credentials.accessToken || '');
                setLocationId(credentials.locationId || '');
                setEnvironment(credentials.environment || 'sandbox');

                // If forceEdit is true, we stay in edit mode, otherwise default to view mode
                if (!forceEdit) {
                    setEditMode(false);
                }
            } else {
                addLog(`No existing credentials found`);
                setEditMode(true); // Always in edit mode if no credentials exist
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            addLog(`Error fetching credentials: ${errorMsg}`);
            console.error('Error fetching Square credentials:', err);
            setError('Failed to load existing Square credentials');
        }
    };

    const testConnection = async () => {
        if (!accessToken || !locationId) {
            setError('Access token and location ID are required');
            return;
        }

        // Clear previous logs
        setDebugLogs([]);
        setTesting(true);
        setTestResult(null);
        setError(null);

        try {
            // Sanitize access token for logging (show only first/last 4 chars)
            const sanitizedToken = accessToken.length > 10
                ? `${accessToken.substring(0, 4)}...${accessToken.substring(accessToken.length - 4)}`
                : '****';

            addLog(`Testing Square connection with locationId: ${locationId}`);
            addLog(`Using token: ${sanitizedToken} in ${environment} environment`);

            // Log the supabase functions URL from environment if available
            if (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL) {
                addLog(`Supabase Functions URL: ${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}`);
            }

            // Capture start time for performance logging
            const startTime = Date.now();

            // Use our service to test the connection
            const result = await testSquareConnection({
                accessToken,
                locationId,
                environment
            });

            const duration = Date.now() - startTime;
            addLog(`Request completed in ${duration}ms`);

            if (result.success) {
                addLog(`Successfully connected to Square location: ${result.location?.name || 'Unknown'}`);
                addLog(`Location details: ${JSON.stringify(result.location)}`);
            } else {
                addLog(`Connection failed: ${result.message}`);
            }

            setTestResult({
                success: result.success,
                message: result.message,
                data: result.location
            });
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            addLog(`Exception caught: ${errorMsg}`);

            // Try to extract any additional details
            if (err instanceof Error && 'cause' in err) {
                addLog(`Error cause: ${JSON.stringify(err.cause)}`);
            }

            console.error('Error testing Square connection:', err);
            setTestResult({
                success: false,
                message: errorMsg
            });
        } finally {
            setTesting(false);
            addLog('Test connection operation completed');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!accessToken || !locationId || !selectedOrganization?.id) {
            setError('Access token, location ID, and organization are required');
            return;
        }

        setLoading(true);
        setError(null);
        // Clear previous logs
        setDebugLogs([]);

        try {
            addLog(`Setting up Square integration for org ID: ${selectedOrganization.id}`);
            addLog(`Using location ID: ${locationId} in ${environment} environment`);

            // Use our service to set up Square integration
            const result = await setupSquareIntegration({
                organizationId: selectedOrganization.id,
                accessToken,
                locationId,
                environment
            });

            if (!result.success) {
                addLog(`Setup failed: ${result.error}`);
                throw new Error(result.error || 'Failed to save Square credentials');
            }

            addLog('Square integration setup successful');

            // Call onSuccess callback
            onSuccess && onSuccess();

            // Close modal
            onClose();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            addLog(`Exception caught: ${errorMsg}`);
            console.error('Error saving Square credentials:', err);
            setError(errorMsg);
        } finally {
            setLoading(false);
            addLog('Setup operation completed');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                        {existingCredentials && !editMode
                            ? 'Square Integration'
                            : (existingCredentials ? 'Update Square Integration' : 'Set Up Square Integration')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-start">
                        <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {testResult && (
                    <div className={`mb-4 p-3 rounded-md flex items-start ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                        {testResult.success ? (
                            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                        )}
                        <span>{testResult.message}</span>
                    </div>
                )}

                {/* View mode - shown when credentials exist and not in edit mode */}
                {existingCredentials && !editMode ? (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                            <div>
                                <div className="text-sm text-gray-500">Environment</div>
                                <div className="font-medium">{existingCredentials.environment === 'production' ? 'Production' : 'Sandbox (Testing)'}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500">Location ID</div>
                                <div className="font-medium">{existingCredentials.locationId}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500">Access Token</div>
                                <div className="font-medium">••••••••••••••••{existingCredentials.accessToken.slice(-4)}</div>
                            </div>
                        </div>

                        <div className="flex space-x-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setEditMode(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Update Credentials
                            </button>

                            <button
                                type="button"
                                onClick={testConnection}
                                disabled={testing}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                                {testing ? 'Testing...' : 'Test Connection'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Edit mode - for new connections or when editing existing ones */
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Environment
                            </label>
                            <select
                                value={environment}
                                onChange={(e) => setEnvironment(e.target.value as 'sandbox' | 'production')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="sandbox">Sandbox (Testing)</option>
                                <option value="production">Production</option>
                            </select>
                            <p className="mt-1 text-sm text-gray-500">
                                Use Sandbox for testing. Switch to Production when ready to process real payments.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Square Access Token
                            </label>
                            <input
                                type="password"
                                value={accessToken}
                                onChange={(e) => setAccessToken(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                placeholder="Enter your Square access token"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Find this in your Square Developer Dashboard under 'Credentials' tab.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Square Location ID
                            </label>
                            <input
                                type="text"
                                value={locationId}
                                onChange={(e) => setLocationId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                placeholder="Enter your Square location ID"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Find this in your Square Dashboard under Business Settings &gt; Locations.
                            </p>
                        </div>

                        <div className="flex justify-between pt-2">
                            <button
                                type="button"
                                onClick={testConnection}
                                disabled={testing || loading || !accessToken || !locationId}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                {testing ? 'Testing...' : 'Test Connection'}
                            </button>

                            <div className="space-x-3">
                                {existingCredentials && (
                                    <button
                                        type="button"
                                        onClick={() => setEditMode(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                    >
                                        Cancel
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !accessToken || !locationId}
                                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                >
                                    {loading ? 'Saving...' : (existingCredentials ? 'Update' : 'Save')}
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* Debug logs section */}
                {debugLogs.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-700">Debug Logs</h3>
                            <button
                                className="text-xs text-gray-500 hover:text-gray-700"
                                onClick={() => setDebugLogs([])}
                            >
                                Clear logs
                            </button>
                        </div>
                        <div className="mt-2 bg-gray-50 p-3 rounded-md text-xs font-mono h-48 overflow-y-auto">
                            {debugLogs.map((log, index) => (
                                <div key={index} className="pb-1">{log}</div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Where to find these credentials?</h3>
                    <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-2">
                        <li>Go to the <a href="https://developer.squareup.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Square Developer Dashboard</a></li>
                        <li>Create a new application or select an existing one</li>
                        <li>For Access Token: Go to the 'Credentials' tab and generate or copy your access token</li>
                        <li>For Location ID: Go to your <a href="https://squareup.com/dashboard/locations" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Square Dashboard &gt; Locations</a> and copy your location ID</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}