// components/SquarePaymentLinkButton.jsx
import { useState, useEffect } from 'react';
import { DollarSign, Link as LinkIcon, Copy, ExternalLink, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { SquareSetupModal } from './SquareSetupModal';

export function SquarePaymentLinkButton({ order, className }) {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [paymentLink, setPaymentLink] = useState(null);
    const [copied, setCopied] = useState(false);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [existingInvoice, setExistingInvoice] = useState(null);

    useEffect(() => {
        if (order?.order_id && selectedOrganization?.id) {
            checkExistingInvoice();
        }
    }, [order?.order_id, selectedOrganization?.id]);

    const checkExistingInvoice = async () => {
        try {
            const { data, error } = await supabase
                .from('square_invoices')
                .select('*')
                .eq('order_id', order.order_id)
                .eq('organization_id', selectedOrganization.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data && data.payment_link) {
                setExistingInvoice(data);
                setPaymentLink(data.payment_link);
            }
        } catch (err) {
            console.error('Error checking for existing invoice:', err);
        }
    };

    const handleGeneratePaymentLink = async () => {
        setLoading(true);
        setError(null);

        try {
            // Check if Square is set up for this organization
            const { data: credentials, error: credentialsError } = await supabase
                .from('square_credentials')
                .select('*')
                .eq('organization_id', selectedOrganization.id)
                .eq('is_active', true)
                .single();

            if (credentialsError || !credentials) {
                // If Square is not set up, show the setup modal
                setShowSetupModal(true);
                return;
            }

            // Call the Supabase Edge Function
            const response = await fetch(`${process.env.SUPABASE_FUNCTIONS_URL}/square-payment-link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    order,
                    organizationId: selectedOrganization.id,
                    userId: user.id
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.setup_required) {
                    setShowSetupModal(true);
                    return;
                }
                throw new Error(data.message || 'Failed to generate payment link');
            }

            // Store the invoice data in Supabase
            if (!existingInvoice) {
                await supabase.from('square_invoices').insert({
                    organization_id: selectedOrganization.id,
                    order_id: order.order_id,
                    square_invoice_id: data.invoiceId,
                    payment_link: data.paymentLink,
                    status: 'PUBLISHED',
                    total_amount: Math.round(order.total_amount * 100), // Store in cents
                    currency: 'USD'
                });
            }

            setPaymentLink(data.paymentLink);
        } catch (err) {
            console.error('Error generating payment link:', err);
            setError(err.message || 'An error occurred while generating the payment link');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(paymentLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className={className}>
            {!paymentLink ? (
                <div>
                    <button
                        onClick={handleGeneratePaymentLink}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                    >
                        <DollarSign className="w-4 h-4 mr-2" />
                        {loading ? 'Generating...' : 'Generate Square Payment Link'}
                    </button>

                    {error && (
                        <div className="mt-2 text-sm text-red-600 flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            {error}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                        <LinkIcon className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-medium">Payment link generated</span>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="text"
                            value={paymentLink}
                            readOnly
                            className="flex-1 p-2 text-sm border rounded-l-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <button
                            onClick={copyToClipboard}
                            className="p-2 text-white bg-gray-600 hover:bg-gray-700 rounded-tr-md rounded-br-md focus:outline-none"
                            title="Copy to clipboard"
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <a
                            href={paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-tr-md rounded-br-md ml-1 focus:outline-none"
                            title="Open payment link"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>

                    <button
                        onClick={() => setPaymentLink(null)}
                        className="text-sm text-gray-600 hover:text-gray-900"
                    >
                        Generate a new link
                    </button>
                </div>
            )}

            {showSetupModal && (
                <SquareSetupModal
                    onClose={() => setShowSetupModal(false)}
                    onSuccess={() => {
                        setShowSetupModal(false);
                        handleGeneratePaymentLink();
                    }}
                />
            )}
        </div>
    );
}