// components/SquarePaymentLinkButton.tsx
import { useState, useEffect } from 'react';
import { DollarSign, Link as LinkIcon, Copy, ExternalLink, Check, AlertTriangle, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { SquareSetupModal } from './SquareSetupModal';
import {
    generatePaymentLink,
    getExistingInvoice,
    getSquareCredentials,
    PaymentLinkResponse
} from '../../services/squareService';

interface SquarePaymentLinkButtonProps {
    order: any; // Use your actual Order type here
    className?: string;
}

export function SquarePaymentLinkButton({ order, className }: SquarePaymentLinkButtonProps) {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentLink, setPaymentLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [hasSquareCredentials, setHasSquareCredentials] = useState(false);
    const [forceEditMode, setForceEditMode] = useState(false);

    useEffect(() => {
        if (order?.order_id && selectedOrganization?.id) {
            checkExistingInvoice();
            checkSquareCredentials();
        }
    }, [order?.order_id, selectedOrganization?.id]);

    const checkExistingInvoice = async () => {
        try {
            if (!order?.order_id || !selectedOrganization?.id) return;

            const invoiceData = await getExistingInvoice(order.order_id, selectedOrganization.id);

            if (invoiceData && invoiceData.payment_link) {
                setPaymentLink(invoiceData.payment_link);
            }
        } catch (err) {
            console.error('Error checking for existing invoice:', err);
        }
    };

    const checkSquareCredentials = async () => {
        try {
            if (!selectedOrganization?.id) return;

            const credentials = await getSquareCredentials(selectedOrganization.id);
            setHasSquareCredentials(!!credentials);
        } catch (err) {
            console.error('Error checking Square credentials:', err);
        }
    };

    const handleGeneratePaymentLink = async () => {
        if (!selectedOrganization?.id) {
            setError('Organization not selected');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // First check if Square is set up for this organization
            const credentials = await getSquareCredentials(selectedOrganization.id);

            if (!credentials) {
                // If Square is not set up, show the setup modal
                setShowSetupModal(true);
                setLoading(false);
                return;
            }

            // If we have credentials, generate the payment link
            const result = await generatePaymentLink({
                order,
                organizationId: selectedOrganization.id,
                userId: user?.id
            });

            if (!result.success) {
                if (result.setupRequired) {
                    setShowSetupModal(true);
                    return;
                }
                throw new Error(result.error || 'Failed to generate payment link');
            }

            // Set the payment link if successful
            if (result.paymentLink) {
                setPaymentLink(result.paymentLink);
            } else {
                throw new Error('No payment link received from server');
            }
        } catch (err) {
            console.error('Error generating payment link:', err);
            setError(err instanceof Error ? err.message : 'An error occurred while generating the payment link');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!paymentLink) return;

        navigator.clipboard.writeText(paymentLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleOpenSettings = () => {
        setForceEditMode(true);
        setShowSetupModal(true);
    };

    return (
        <div className={className}>
            {!paymentLink ? (
                <div className="flex flex-col space-y-2">
                    <div className="flex space-x-2">
                        <button
                            onClick={handleGeneratePaymentLink}
                            disabled={loading}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                        >
                            <DollarSign className="w-4 h-4 mr-2" />
                            {loading ? 'Generating...' : 'Generate Square Payment Link'}
                        </button>

                        {hasSquareCredentials && (
                            <button
                                onClick={handleOpenSettings}
                                title="Update Square Settings"
                                className="inline-flex items-center p-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        )}
                    </div>

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

                        <button
                            onClick={handleOpenSettings}
                            title="Update Square Settings"
                            className="inline-flex items-center p-1 border border-gray-300 text-xs rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                        >
                            <Settings className="w-3 h-3" />
                        </button>
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
                    onClose={() => {
                        setShowSetupModal(false);
                        setForceEditMode(false);
                        // Refresh credentials check when modal closes
                        checkSquareCredentials();
                    }}
                    onSuccess={() => {
                        setShowSetupModal(false);
                        setForceEditMode(false);
                        checkSquareCredentials();
                        // Only auto-generate a payment link if we weren't in forced edit mode
                        if (!forceEditMode) {
                            handleGeneratePaymentLink();
                        }
                    }}
                    forceEdit={forceEditMode}
                />
            )}
        </div>
    );
}