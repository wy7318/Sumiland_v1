// components/TestSquareWebhookButton.tsx
import { useState } from 'react';
import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TestSquareWebhookButtonProps {
    squareInvoiceId: string;
    orderId: string;
    organizationId: string;
    onSuccess?: () => void;
    className?: string;
}

export function TestSquareWebhookButton({
    squareInvoiceId,
    orderId,
    organizationId,
    onSuccess,
    className = ''
}: TestSquareWebhookButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleTestWebhook = async () => {
        if (!squareInvoiceId || !orderId || !organizationId) {
            setError('Missing required data for webhook test');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Call our test webhook function
            const { data, error } = await supabase.functions.invoke('test-webhook', {
                body: {
                    invoiceId: squareInvoiceId,
                    orderId,
                    organizationId
                }
            });

            if (error) throw error;

            console.log('Webhook test response:', data);

            setSuccess(true);

            // Call the success callback if provided
            if (onSuccess) {
                setTimeout(() => {
                    onSuccess();
                }, 1000);
            }

            // Clear success message after a few seconds
            setTimeout(() => {
                setSuccess(false);
            }, 5000);

        } catch (err) {
            console.error('Error testing webhook:', err);
            setError(err instanceof Error ? err.message : 'Failed to test webhook');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={className}>
            <div className="flex items-center space-x-2">
                <button
                    onClick={handleTestWebhook}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300"
                    title="This is for testing only. Simulates a payment webhook from Square."
                >
                    {loading ? (
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                        <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Update Payment Information
                </button>

                {success && (
                    <span className="text-xs text-green-600 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Updated
                    </span>
                )}

                {error && (
                    <span className="text-xs text-red-600 flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {error}
                    </span>
                )}
            </div>
        </div>
    );
}