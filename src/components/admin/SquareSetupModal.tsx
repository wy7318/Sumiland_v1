// components/SquareSetupModal.jsx
import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrganization } from '../../contexts/OrganizationContext';

export function SquareSetupModal({ onClose, onSuccess }) {
    const { selectedOrganization } = useOrganization();
    const [accessToken, setAccessToken] = useState('');
    const [locationId, setLocationId] = useState('');
    const [environment, setEnvironment] = useState('sandbox');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [existingCredentials, setExistingCredentials] = useState(null);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    useEffect(() => {
        if (selectedOrganization?.id) {
            fetchExistingCredentials();
        }
    }, [selectedOrganization?.id]);

    const fetchExistingCredentials = async () => {
        try {
            const { data, error } = await supabase
                .from('square_credentials')
                .select('*')
                .eq('organization_id', selectedOrganization.id)
                .eq('is_active', true)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                setExistingCredentials(data);
                setAccessToken(data.access_token || '');
                setLocationId(data.location_id || '');
                setEnvironment(data.environment || 'sandbox');
            }
        } catch (err) {
            console.error('Error fetching Square credentials:', err);
            setError('Failed to load existing Square credentials');
        }
    };

    const testConnection = async () => {
        if (!accessToken || !locationId) {
            setError('Access token and location ID are required');
            return;
        }

        setTesting(true);
        setTestResult(null);
        setError(null);

        try {
            // Call the Supabase Edge Function to test Square credentials
            const response = await fetch(`${process.env.SUPABASE_FUNCTIONS_URL}/test-square-connection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    accessToken,
                    locationId,
                    environment
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to test Square connection');
            }

            setTestResult({
                success: true,
                message: 'Successfully connected to Square!',
                data: result
            });
        } catch (err) {
            console.error('Error testing Square connection:', err);
            setTestResult({
                success: false,
                message: err.message || 'Failed to connect to Square'
            });
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!accessToken || !locationId) {
            setError('Access token and location ID are required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Save credentials to Supabase
            const { error: upsertError } = await supabase
                .from('square_credentials')
                .upsert({
                    organization_id: selectedOrganization.id,
                    access_token: accessToken,
                    location_id: locationId,
                    environment,
                    is_active: true,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'organization_id',
                    ignoreDuplicates: false
                });

            if (upsertError) throw upsertError;

            // Call onSuccess callback
            onSuccess && onSuccess();

            // Close modal
            onClose();
        } catch (err) {
            console.error('Error saving Square credentials:', err);
            setError(err.message || 'Failed to save Square credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                        {existingCredentials ? 'Update Square Integration' : 'Set Up Square Integration'}
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

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Environment
                        </label>
                        <select
                            value={environment}
                            onChange={(e) => setEnvironment(e.target.value)}
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
                            Find this in your Square Developer Dashboard under OAuth settings.
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
                            Find this in your Square Dashboard under Business Settings {'>'} Locations.
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
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={loading || !accessToken || !locationId}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </form>

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