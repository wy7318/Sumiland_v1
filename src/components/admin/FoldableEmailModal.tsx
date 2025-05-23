import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertCircle, Sparkles, Bot, Copy, Minimize2, Maximize2, Mail, AtSign, CheckCircle, Info, Paperclip } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import 'react-quill/dist/quill.snow.css';
import ReactQuill from 'react-quill';
import { useGoogleLogin } from '@react-oauth/google';
import {
    getEmailConfig,
    getEmailConfigs,
    connectGmail,
    connectOutlook,
    saveEmailConfig,
    sendEmail,
    EmailConfig
} from '../../lib/email';
import { generateContent } from '../../services/aiService';
import { pdf } from '@react-pdf/renderer';
import PurchaseOrderPDF from '../admin/purchase/PurchaseOrderPDF';

// Define fallback models in case OPENAI_MODELS is not available
const AI_MODELS = {
    GPT_3_5_TURBO: 'gpt-3.5-turbo',
    GPT_4: 'gpt-4'
};

// Try to import OPENAI_MODELS, but use fallback if not available
let OPENAI_MODELS;
try {
    // Dynamic import to avoid build errors
    OPENAI_MODELS = require('../../services/aiService').OPENAI_MODELS;
} catch (error) {
    console.warn('OPENAI_MODELS not found in aiService, using fallback models');
    OPENAI_MODELS = AI_MODELS;
}

type Props = {
    to: string;
    onClose: () => void;
    onSuccess: () => void;
    caseTitle?: string;
    orgId?: string;
    caseId?: string;
    isVisible: boolean;
    onMinimize: () => void;
    onMaximize: () => void;
    // Add purchase order and organization properties
    purchaseOrder?: any; // Purchase order object for attachment
    organizationName?: string; // Organization name for PDF
    organizationLogo?: string; // Organization logo for PDF
    existingPdfAttachment?: Blob | null;
    attachmentName?: string;
    quote?: any; // Quote object
    order?: any; // Order object - Add this new prop
};
const modules = {
    toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link', 'image'],
        ['clean'],
    ],
};

const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align',
    'link', 'image',
];

// Email templates for AI suggestions
const emailTemplates = [
    {
        name: 'Follow Up',
        prompt: 'Write a professional follow-up email that asks for status updates and offers assistance.'
    },
    {
        name: 'Status Update',
        prompt: 'Write a concise status update email that outlines current progress and next steps.'
    },
    {
        name: 'Thank You',
        prompt: 'Write a warm thank you email expressing appreciation for the recipient\'s time and help.'
    },
    {
        name: 'Introduction',
        prompt: 'Write a professional introduction email that clearly explains who I am and why I\'m reaching out.'
    },
    {
        name: 'Request',
        prompt: 'Write a polite email requesting information or assistance with a clear call to action.'
    }
];

export function FoldableEmailModal({
    to,
    onClose,
    onSuccess,
    caseTitle,
    orgId,
    caseId,
    isVisible,
    onMinimize,
    onMaximize,
    purchaseOrder,
    organizationName,
    organizationLogo,
    existingPdfAttachment = null,        // Add default value here
    quote,
    order
}: Props) {
    const { user } = useAuth();
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Update default subject to include PO number if available
    const [subject, setSubject] = useState(
        purchaseOrder
            ? `Purchase Order #${purchaseOrder.order_number} from ${organizationName || 'our company'}`
            : (caseTitle ? `[${caseTitle}]` : '')
    );
    const [toAddress, setToAddress] = useState(to || (purchaseOrder?.vendors?.email || ''));
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [showCcBcc, setShowCcBcc] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Email configuration state
    const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([]);
    const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
    const [loadingConfigs, setLoadingConfigs] = useState(false);

    // AI assistance state
    const [showAiAssistant, setShowAiAssistant] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');
    const [aiTarget, setAiTarget] = useState<'subject' | 'body'>('body');
    const [aiTone, setAiTone] = useState('professional');

    // Add states for PDF attachment
    const [pdfAttachment, setPdfAttachment] = useState<Blob | null>(null);
    const [attachmentName, setAttachmentName] = useState<string>('');
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [pdfReady, setPdfReady] = useState(false);

    // Always use GPT-3.5 Turbo by default and don't allow changing it
    const aiModel = OPENAI_MODELS.GPT_3_5_TURBO;
    const quillRef = useRef<any>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const [isAddingEmailAccount, setIsAddingEmailAccount] = useState(false);
    const [temporaryMessage, setTemporaryMessage] = useState<string | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    // If using an existing PDF attachment
    useEffect(() => {
        // Safe access with optional chaining and default parameters
        const pdfAttachment = existingPdfAttachment || null;
        const name = attachmentName || '';

        if (pdfAttachment && name) {
            setPdfAttachment(pdfAttachment);
            setAttachmentName(name);
            setPdfReady(true);
        }
    }, [existingPdfAttachment, attachmentName]);

    // Additionally, make sure your component unmounts cleanly by adding this useEffect
    useEffect(() => {
        // Cleanup function for unmounting
        return () => {
            // Clear all PDF-related state when component unmounts
            setPdfAttachment(null);
            setAttachmentName('');
            setPdfReady(false);
        };
    }, []);



    // Add this useEffect to handle order emails - add it after the Quote useEffect
    useEffect(() => {
        if (order && !body) {
            const defaultBody =
                `<p>Dear ${order.customer?.first_name || 'Customer'},</p>
            <p>Please find attached your Order #${order.order_number}.</p>
            <p>Order Details:</p>
            <ul>
              <li>Order Number: #${order.order_number}</li>
              <li>Order Date: ${new Date(order.created_at).toLocaleDateString()}</li>
              <li>Total Amount: ${new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(order.total_amount)}</li>
              ${order.payment_status !== 'Fully Received' ?
                    `<li>Amount Due: ${new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                    }).format(order.total_amount - order.payment_amount)}</li>` :
                    `<li>Payment Status: Paid in Full</li>`}
            </ul>
            <p>Please review the attached order document and let us know if you have any questions or concerns.</p>
            <p>Thank you for your business,<br>${organizationName || 'Our Company'}</p>`;

            setBody(defaultBody);

            // Set default subject to include order number
            if (!subject || subject === (caseTitle ? `[${caseTitle}]` : '')) {
                setSubject(`Order #${order.order_number} from ${organizationName || 'our company'}`);
            }
        }
    }, [order, organizationName]);

    // Update default subject and body if quote is provided
    useEffect(() => {
        if (quote && !body) {
            const defaultBody =
                `<p>Dear ${quote.customer?.first_name || 'Customer'},</p>
        <p>Please find attached our quotation #${quote.quote_number}.</p>
        <p>Quote Details:</p>
        <ul>
          <li>Quote Number: #${quote.quote_number}</li>
          <li>Quote Date: ${new Date(quote.quote_date).toLocaleDateString()}</li>
          <li>Total Amount: ${new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(quote.total_amount)}</li>
          ${quote.expire_at ?
                    `<li>Valid Until: ${new Date(quote.expire_at).toLocaleDateString()}</li>` : ''}
        </ul>
        <p>Please review the attached quotation and let us know if you have any questions or would like to proceed.</p>
        <p>Thank you for your business,<br>${organizationName || 'Our Company'}</p>`;

            setBody(defaultBody);

            // Set default subject to include quote number
            if (!subject || subject === (caseTitle ? `[${caseTitle}]` : '')) {
                setSubject(`Quotation #${quote.quote_number} from ${organizationName || 'our company'}`);
            }
        }
    }, [quote, organizationName]);


    // Update default body text if purchase order exists
    useEffect(() => {
        if (purchaseOrder && !body) {
            const defaultBody =
                `<p>Dear ${purchaseOrder.vendors?.contact_person || purchaseOrder.vendors?.name || 'Vendor'},</p>
                <p>Please find attached our Purchase Order #${purchaseOrder.order_number}.</p>
                <p>Order Details:</p>
                <ul>
                <li>Purchase Order: #${purchaseOrder.order_number}</li>
                <li>Order Date: ${new Date(purchaseOrder.order_date).toLocaleDateString()}</li>
                <li>Total Amount: ${new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(purchaseOrder.total_amount)}</li>
                ${purchaseOrder.expected_delivery_date ?
                    `<li>Expected Delivery: ${new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()}</li>` : ''}
                </ul>
                <p>Please confirm receipt of this order and the expected delivery date.</p>
                <p>Thank you,<br>${organizationName || 'Our Company'}</p>`;

            setBody(defaultBody);
        }
    }, [purchaseOrder, organizationName]);

    // Generate PDF on component mount if purchase order exists
    useEffect(() => {
        if (purchaseOrder && !pdfAttachment) {
            generatePdfAttachment();
        }
        // Only generate PDF if we don't already have one and the entity exists
        if (quote && !pdfAttachment && !pdfReady) {
            console.log("Triggering quote PDF generation from effect");
            generateQuotePdf();
        }
        if (order && !pdfAttachment && !pdfReady) {
            console.log("Triggering order PDF generation from effect");
            generateOrderPdf();
        }
    }, [purchaseOrder, quote, order]);

    useEffect(() => {
        if (temporaryMessage) {
            const timer = setTimeout(() => {
                setTemporaryMessage(null);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [temporaryMessage]);

    // Set dirty state when content changes
    useEffect(() => {
        if (body || subject !== (caseTitle ? `[${caseTitle}]` : '') || toAddress !== to || cc || bcc) {
            setIsDirty(true);
        }
    }, [body, subject, toAddress, cc, bcc, caseTitle, to]);

    // Fetch email configurations on mount
    useEffect(() => {
        if (user && orgId) {
            fetchEmailConfigurations();
        }
    }, [user, orgId]);

    useEffect(() => {
        console.log("Selected config ID changed:", selectedConfigId);
        console.log("Selected config:", getSelectedConfig());
    }, [selectedConfigId, emailConfigs]);

    // Handle click outside for minimizing instead of closing
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(event.target as Node) && isVisible) {
                // Instead of closing, we minimize
                onMinimize();
            }
        }

        // Only add the listener if the modal is visible and maximized
        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVisible, onMinimize]);

    // First, add this function inside the component
    const removeAttachment = () => {
        try {
            // Set removing flag to true to prevent re-generation
            setIsRemoving(true);
            console.log("Starting attachment removal");

            // First set PDF ready to false
            setPdfReady(false);

            // Then clear attachmentName
            setAttachmentName('');

            // Clear PDF attachment immediately
            setPdfAttachment(null);

            console.log("Attachment successfully removed");

            // Keep the removing flag on for a short while to prevent accidental regeneration
            setTimeout(() => {
                setIsRemoving(false);
            }, 500);
        } catch (error) {
            console.error("Error removing attachment:", error);
            setError("Failed to remove attachment. Please try again.");
            setIsRemoving(false);
        }
    };

    // Generate PDF attachment
    const generatePdfAttachment = async () => {
        if (!purchaseOrder) return;

        try {
            setGeneratingPdf(true);

            // Create the PDF document using the PurchaseOrderPDF component
            const pdfDoc = (
                <PurchaseOrderPDF
                    purchaseOrder={purchaseOrder}
                    organizationName={organizationName || 'Your Company'}
                    organizationLogo={organizationLogo}
                />
            );

            // Generate PDF blob
            const pdfBlob = await pdf(pdfDoc).toBlob();

            // Set the attachment
            setPdfAttachment(pdfBlob);
            setAttachmentName(`PO_${purchaseOrder.order_number}_${purchaseOrder.vendors?.name || 'Vendor'}.pdf`);
            setPdfReady(true);

        } catch (error) {
            console.error("Error generating PDF attachment:", error);
            setError("Failed to generate PDF attachment. Please try again.");
        } finally {
            setGeneratingPdf(false);
        }
    };

    // Add this generateOrderPdf function with proper error handling
    const generateOrderPdf = async () => {
        if (!order) return;

        try {
            setGeneratingPdf(true);
            console.log("Generating order PDF...");

            // Create a reference to hold the OrderPDF module
            let OrderPDF;

            try {
                // Try to import it from the most likely location first
                const module = await import('../admin/OrderPDF');
                OrderPDF = module.default;
                console.log("Successfully imported OrderPDF from admin/orders");
            } catch (importError) {
                console.warn("Failed to import from admin/orders/OrderPDF, trying alternate path...", importError);

                try {
                    // Try an alternate path
                    const module = await import('../admin/OrderPDF');
                    OrderPDF = module.default;
                    console.log("Successfully imported OrderPDF from admin");
                } catch (secondImportError) {
                    console.error("Failed to import OrderPDF from alternate path", secondImportError);
                    // Try one more path
                    const module = await import('./OrderPDF');
                    OrderPDF = module.default;
                    console.log("Successfully imported OrderPDF from current directory");
                }
            }

            if (!OrderPDF) {
                throw new Error("Could not import OrderPDF component");
            }

            // Create the PDF document using the OrderPDF component
            const pdfDoc = (
                <OrderPDF
                    order={order}
                    organizationName={organizationName || 'Your Company'}
                    organizationLogo={organizationLogo}
                />
            );

            // Generate PDF blob
            const pdfBlob = await pdf(pdfDoc).toBlob();
            console.log("PDF blob generated successfully", pdfBlob);

            // Set the attachment
            setPdfAttachment(pdfBlob);
            setAttachmentName(`Order_${order.order_number}_${order.customer?.first_name || 'Customer'}.pdf`);
            setPdfReady(true);

        } catch (error) {
            console.error("Error generating PDF attachment:", error);
            setError(`Failed to generate PDF: ${error.message}`);
        } finally {
            setGeneratingPdf(false);
        }
    };

    // Add this function below the generatePdfAttachment function in your component
    const generateQuotePdf = async () => {
        if (!quote) return;

        try {
            setGeneratingPdf(true);
            console.log("Generating quote PDF...");

            // Create a reference to hold the QuotePDF module
            let QuotePDF;

            try {
                // Try to import it from the most likely location first
                const module = await import('../admin/QuotePDF');
                QuotePDF = module.default;
                console.log("Successfully imported QuotePDF from admin/quotes");
            } catch (importError) {
                console.warn("Failed to import from admin/quotes/QuotePDF, trying alternate path...", importError);

                try {
                    // Try an alternate path
                    const module = await import('../admin/QuotePDF');
                    QuotePDF = module.default;
                    console.log("Successfully imported QuotePDF from admin");
                } catch (secondImportError) {
                    console.error("Failed to import QuotePDF from alternate path", secondImportError);
                    // Try one more path
                    const module = await import('./QuotePDF');
                    QuotePDF = module.default;
                    console.log("Successfully imported QuotePDF from current directory");
                }
            }

            if (!QuotePDF) {
                throw new Error("Could not import QuotePDF component");
            }

            // Create the PDF document using the QuotePDF component
            const pdfDoc = (
                <QuotePDF
                    quote={quote}
                    organizationName={organizationName || 'Your Company'}
                    organizationLogo={organizationLogo}
                />
            );

            // Generate PDF blob
            const pdfBlob = await pdf(pdfDoc).toBlob();
            console.log("PDF blob generated successfully", pdfBlob);

            // Set the attachment
            setPdfAttachment(pdfBlob);
            setAttachmentName(`Quote_${quote.quote_number}_${quote.customer?.first_name || 'Customer'}.pdf`);
            setPdfReady(true);

        } catch (error) {
            console.error("Error generating PDF attachment:", error);
            setError(`Failed to generate PDF: ${error.message}`);
        } finally {
            setGeneratingPdf(false);
        }
    };

    const fetchEmailConfigurations = async () => {
        if (!user) return;

        try {
            console.log("Starting to fetch email configurations...");
            console.log("User ID:", user.id);
            console.log("Organization ID:", orgId);

            setLoadingConfigs(true);
            const configs = await getEmailConfigs(user.id, orgId);

            console.log("Raw configs returned:", configs);

            // Filter out any configs that don't have an ID
            const validConfigs = configs.filter(config => config.id !== undefined && config.id !== null);

            console.log("Valid configs after filtering:", validConfigs);

            setEmailConfigs(validConfigs);

            // Select the first config by default if available
            if (validConfigs.length > 0) {
                console.log("Setting default config ID:", validConfigs[0].id);
                setSelectedConfigId(validConfigs[0].id);
            } else {
                console.log("No valid configs found, setting selectedConfigId to null");
                setSelectedConfigId(null);
            }
        } catch (err) {
            console.error('Failed to fetch email configurations:', err);
            setError('Failed to load email accounts');
        } finally {
            setLoadingConfigs(false);
            console.log("Finished loading configs");
        }
    };

    // Get the selected email configuration
    const getSelectedConfig = (): EmailConfig | null => {
        if (selectedConfigId === null) return null;

        // Log the actual values to debug
        console.log("Finding config with ID:", selectedConfigId, typeof selectedConfigId);
        console.log("Available config IDs:", emailConfigs.map(c => ({ id: c.id, type: typeof c.id })));

        // Direct string comparison of IDs
        return emailConfigs.find(config =>
            String(config.id) === String(selectedConfigId)
        ) || null;
    };
    

    const googleLogin = useGoogleLogin({
        scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
        onSuccess: async (tokenResponse) => {
            if (!user) return;

            try {
                setLoading(true);
                const config = await connectGmail(tokenResponse.code);
                console.log("Config from connectGmail:", config);

                const { data, error: saveError } = await saveEmailConfig(user.id, config, orgId);

                console.log('[Auth] Saving config result:', { data, saveError });

                if (saveError) {
                    console.error('[Auth] Failed to save config:', saveError);
                    setError('Failed to authenticate Gmail');
                    setLoading(false);
                    return;
                }

                // Refresh the configs list
                await fetchEmailConfigurations();

                // Only try to send email if we're not just adding an account
                if (isAddingEmailAccount) {
                    setError(null);
                    setLoading(false);
                    // Show success message
                    setTemporaryMessage('Gmail account successfully connected!');
                } else {
                    // If this was triggered by a send attempt, continue with sending
                    await handleSendEmail();
                }
            } catch (retryErr: any) {
                setError('Failed during authentication: ' + retryErr.message);
                setLoading(false);
            }
        },
        onError: (errorResponse) => {
            console.error('Google login error:', errorResponse);
            setError('Gmail login failed');
            setLoading(false);
        },
        flow: 'auth-code',
        access_type: 'offline',
        prompt: 'consent'
    });

    

    const handleOutlookAuth = async (isAddingAccount = false) => {
        if (!user) return;

        try {
            setLoading(true);
            // Use the email address if provided in the form
            const config = await connectOutlook(toAddress);
            console.log("Config from connectOutlook:", config);

            const { data, error: saveError } = await saveEmailConfig(
                user.id,
                config,
                orgId
            );

            console.log('[Auth] Outlook save result:', { data, saveError });

            if (saveError) {
                console.error('[Auth] Failed to save Outlook config:', saveError);
                setError('Failed to authenticate Outlook');
                return;
            }

            // Refresh the configs list
            await fetchEmailConfigurations();

            // Only try to send email if we're not just adding an account
            if (isAddingAccount) {
                setError(null);
                setLoading(false);
                // Show success message
                setTemporaryMessage('Outlook account successfully connected!');
            } else {
                // If this was triggered by a send attempt, continue with sending
                await handleSendEmail();
            }
        } catch (err: any) {
            console.error('Error connecting Outlook:', err);
            setError(err instanceof Error ? err.message : 'Failed to connect Outlook');
        } finally {
            setLoading(false);
        }
    };


    const handleAuth = async (provider: 'gmail' | 'outlook', isAddingAccount = false) => {
        // Use the setter function instead of direct assignment
        setIsAddingEmailAccount(isAddingAccount);

        if (provider === 'gmail') {
            googleLogin();
        } else {
            await handleOutlookAuth(isAddingAccount);
        }
    };

    const resetForm = () => {
        setBody('');
        setSubject(caseTitle ? `[${caseTitle}]` : '');
        setToAddress(to);
        setCc('');
        setBcc('');
        setShowCcBcc(false);
        setIsDirty(false);
        setShowAiAssistant(false);
        setAiPrompt('');
        setGeneratedContent('');
    };

    const handleCloseWithConfirmation = () => {
        if (isDirty) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close this email?')) {
                resetForm();
                onClose();
            }
        } else {
            onClose();
        }
    };

    // Send email with the selected configuration
    const handleSendEmail = async () => {
        if (!user) return;

        try {
            const selectedConfig = getSelectedConfig();

            if (!selectedConfig) {
                setError('Please select an email account to send from');
                return;
            }

            // Prepare attachments if we have a PDF
            const attachments = [];

            // Add the PO PDF if available
            if (pdfAttachment && attachmentName && pdfReady) {
                attachments.push({
                    filename: attachmentName,
                    content: pdfAttachment,
                    contentType: 'application/pdf'
                });
            }



            // Token is valid, send the email
            await sendEmail(
                user.id,
                toAddress,
                subject,
                body,
                cc,
                bcc,
                orgId,
                caseId,
                selectedConfigId !== null ? selectedConfigId : undefined,
                attachments.length > 0 ? attachments : undefined
            );
            onSuccess();
            resetForm();
        } catch (err: any) {
            console.error('Error sending email:', err);
            setError(err instanceof Error ? err.message : 'Failed to send email');

            // If the error is about authentication, trigger re-auth
            if (err.message && (
                err.message.includes('Failed to fetch Gmail profile') ||
                err.message.includes('Sender email address not found') ||
                err.message.includes('token expired') ||
                err.message.includes('authentication')
            )) {
                const selectedConfig = getSelectedConfig();
                if (selectedConfig) {
                    setError(`Authentication issue with ${selectedConfig.email}. Please reconnect.`);
                    await handleAuth(selectedConfig.provider);
                }
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await handleSendEmail();
        } catch (err) {
            // Error handling is done in handleSendEmail
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateSelect = (prompt: string) => {
        setAiPrompt(prompt);
    };

    // Function to copy content to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            // Optional: Show a temporary "copied" message
            const tempError = error;
            setError('Copied to clipboard!');
            setTimeout(() => {
                setError(tempError);
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };

    // Helper function to clean AI-generated content
    const cleanAiContent = (content: string): string => {
        // Remove common AI response patterns like "Certainly!" or "Here's an..."
        let cleaned = content.replace(/^(Certainly!|Sure!|Here's|Here is|I'd be happy to|I would be happy to|I've created|I have created).*?(:|\.)\s*/i, '');

        // Remove any HTML doctype, html, head tags
        cleaned = cleaned.replace(/<\!DOCTYPE.*?>|<html.*?>|<\/html>|<head>.*?<\/head>|<body.*?>|<\/body>/gi, '');

        // Remove any meta tags
        cleaned = cleaned.replace(/<meta.*?>/gi, '');

        // Remove any script tags and their content
        cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        // For subject lines, remove any HTML completely
        if (aiTarget === 'subject') {
            cleaned = cleaned.replace(/<[^>]*>/g, '').replace(/^["'\s]+|["'\s]+$/g, '');
        }

        return cleaned.trim();
    };

    // Extract subject line from body content if present
    const extractSubjectFromBody = (bodyContent: string): { subject: string | null, cleanedBody: string } => {
        // Check for common subject line patterns in the body
        const subjectPattern = /^(?:Subject:?|re:?)\s*(.+?)(?:\n|\r\n?|$)/i;
        const match = bodyContent.match(subjectPattern);

        if (match) {
            // Found a subject line, extract it and clean the body
            const subject = match[1].trim();
            const cleanedBody = bodyContent.replace(subjectPattern, '').trim();
            return { subject, cleanedBody };
        }

        return { subject: null, cleanedBody: bodyContent };
    };

    const generateEmailContent = async () => {
        if (!aiPrompt.trim()) {
            setError('Please enter a prompt or select a template');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setAiGenerating(true);
        setError(null);

        try {
            // Create context-aware prompt
            let contextPrompt = aiPrompt;

            // Add context about the case if available
            if (caseTitle) {
                contextPrompt = `${contextPrompt}\n\nThis email is regarding: ${caseTitle}`;
            }

            // Add context about purchase order if available
            if (purchaseOrder) {
                contextPrompt = `${contextPrompt}\n\nThis email is regarding Purchase Order #${purchaseOrder.order_number} with total amount ${purchaseOrder.total_amount} for vendor ${purchaseOrder.vendors?.name || 'unknown'}.`;
            }

            // Different instruction based on target (subject or body)
            if (aiTarget === 'subject') {
                contextPrompt = `${contextPrompt}\n\nGenerate ONLY a concise and effective email subject line. Do not include any introductory phrases or explanations. Just output the subject line directly. Do not use any HTML.`;
            } else {
                contextPrompt = `${contextPrompt}\n\nGenerate the email body directly without any introductory phrases like "Here's" or "Certainly!". Do not include any HTML doctype, html, head, or meta tags. Only include the actual formatted content that would go in an email body using simple formatting like <p>, <strong>, <em>, <ul>, <li> tags.`;
            }

            const response = await generateContent({
                prompt: contextPrompt,
                tone: aiTone,
                contentLength: aiTarget === 'subject' ? 'short' : 'medium',
                contentType: 'email',
                model: aiModel
            });

            if (response.error) {
                setError(response.error);
            } else {
                // Clean the response
                const cleanedContent = cleanAiContent(response.content);
                setGeneratedContent(cleanedContent);
            }
        } catch (err) {
            setError('Failed to generate content. Please try again.');
            console.error('AI generation error:', err);
        } finally {
            setAiGenerating(false);
        }
    };

    const useGeneratedContent = () => {
        if (aiTarget === 'subject') {
            // For subject, use the cleaned content
            setSubject(generatedContent);
        } else {
            // For body content, check if there's a subject line to extract
            const { subject, cleanedBody } = extractSubjectFromBody(generatedContent);

            // If a subject was found in the body, use it (unless subject is already set)
            if (subject && (!subject || subject === (caseTitle ? `[${caseTitle}]` : ''))) {
                setSubject(subject);
            }

            // Use the body content (with subject line removed if there was one)
            setBody(cleanedBody);
        }

        // Close the AI assistant
        setShowAiAssistant(false);
        setGeneratedContent('');
        setAiPrompt('');
    };

    const suggestImprovement = async () => {
        if (!body.trim()) {
            setError('Please write some content first before requesting improvements');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setAiGenerating(true);
        setError(null);
        setAiTarget('body');

        try {
            const response = await generateContent({
                prompt: `Improve this email to make it more engaging, professional, and effective. Respond with ONLY the improved email, no introductory phrases or explanations:\n\n${body}`,
                tone: aiTone,
                contentLength: 'medium',
                contentType: 'email',
                model: aiModel
            });

            if (response.error) {
                setError(response.error);
            } else {
                // Clean the response
                const cleanedContent = cleanAiContent(response.content);
                setGeneratedContent(cleanedContent);
                setShowAiAssistant(true);
            }
        } catch (err) {
            setError('Failed to improve content. Please try again.');
            console.error('AI improvement error:', err);
        } finally {
            setAiGenerating(false);
        }
    };

    const generateSubjectFromBody = async () => {
        if (!body.trim()) {
            setError('Please write some email content first');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setAiGenerating(true);
        setError(null);
        setAiTarget('subject');

        try {
            const response = await generateContent({
                prompt: `Generate a concise, effective subject line for this email. Respond with ONLY the subject line text, no introductory phrases or explanatory text:\n\n${body}`,
                tone: aiTone,
                contentLength: 'short',
                contentType: 'email',
                model: aiModel
            });

            if (response.error) {
                setError(response.error);
            } else {
                // Clean up the subject line - already handled by cleanAiContent
                const cleanSubject = cleanAiContent(response.content);

                setSubject(cleanSubject);
                setAiGenerating(false);
                // Don't show the assistant for subject generation
                setShowAiAssistant(false);
            }
        } catch (err) {
            setError('Failed to generate subject. Please try again.');
            console.error('AI subject generation error:', err);
            setAiGenerating(false);
        }
    };

    // Fix for FoldableEmailModal component

    // 1. Update the attachment section condition to include 'order'
    {
        (quote || purchaseOrder || order) && (
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attachments
                </label>

                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    {generatingPdf ? (
                        <div className="flex items-center text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-600 mr-2"></div>
                            Generating PDF attachment...
                        </div>
                    ) : pdfReady ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Paperclip className="w-4 h-4 text-gray-500 mr-2" />
                                <span className="text-sm font-medium">{attachmentName}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                    Ready to send
                                </div>
                                <button
                                    type="button"
                                    onClick={removeAttachment}
                                    className="text-red-500 hover:text-red-700"
                                    title="Remove attachment"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                if (purchaseOrder) {
                                    generatePdfAttachment();
                                } else if (quote) {
                                    generateQuotePdf();
                                } else if (order) {
                                    generateOrderPdf();
                                }
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                        >
                            <Paperclip className="w-4 h-4 mr-1" />
                            {purchaseOrder
                                ? "Generate Purchase Order PDF"
                                : quote
                                    ? "Generate Quote PDF"
                                    : order
                                        ? "Generate Order PDF"
                                        : "Add Attachment"
                            }
                        </button>
                    )}
                </div>
            </div>
        )
    }

    



    const handleAddEmailAccount = async (provider: 'gmail' | 'outlook') => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            // Pass true to indicate we're adding an account, not sending an email
            await handleAuth(provider, true);

            // Don't auto-send email after adding an account
        } catch (err: any) {
            console.error(`Error adding ${provider} account:`, err);
            setError(err instanceof Error ? err.message : `Failed to add ${provider} account`);
            setLoading(false);
        }
    };

    // Minimized view at the bottom of screen
    const renderMinimizedView = () => (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 z-40 w-72"
        >
            <div className="p-3 cursor-pointer hover:bg-gray-50" onClick={onMaximize}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center">
                        <Mail className="w-5 h-5 text-primary-600 mr-2" />
                        <div className="truncate font-medium">
                            {subject || "New Email"}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMaximize();
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCloseWithConfirmation();
                            }}
                            className="text-gray-400 hover:text-red-600 p-1 ml-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="text-xs text-gray-500 truncate mt-1">
                    To: {toAddress}
                </div>
                {getSelectedConfig()?.email && (
                    <div className="text-xs text-gray-500 truncate mt-1">
                        From: {getSelectedConfig()?.email}
                    </div>
                )}
                {pdfReady && (
                    <div className="text-xs text-green-600 truncate mt-1 flex items-center">
                        <Paperclip className="w-3 h-3 mr-1" />
                        {attachmentName || "PO Attachment"}
                    </div>
                )}
            </div>
        </motion.div>
    );

    // Maximized view (full email modal)
    const renderMaximizedView = () => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => e.stopPropagation()} // Prevent clicks from propagating to document
        >
            <motion.div
                ref={modalRef}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Send Email</h2>
                    <div className="flex space-x-2">
                        <button
                            onClick={onMinimize}
                            className="text-gray-400 hover:text-gray-500"
                            type="button"
                            title="Minimize"
                        >
                            <Minimize2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleCloseWithConfirmation}
                            className="text-gray-400 hover:text-gray-500"
                            type="button"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                {temporaryMessage && (
                    <div className="mb-6 bg-green-50 text-green-600 p-4 rounded-lg flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        {temporaryMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* FROM (Email configuration selector) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                        <div className="flex space-x-2">
                            <div className="flex-grow">
                                {emailConfigs.length > 0 ? (
                                    <div className="relative">
                                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <select
                                            value={selectedConfigId || ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value) {
                                                    setSelectedConfigId(value);
                                                    console.log("Selected config ID:", value, typeof value);
                                                } else {
                                                    setSelectedConfigId(null);
                                                    console.log("Cleared config ID selection");
                                                }
                                            }}
                                            className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border border-gray-300 appearance-none"
                                            disabled={loading || loadingConfigs}
                                        >
                                            {emailConfigs.map((config) => (
                                                <option key={config.id} value={String(config.id)}>
                                                    {config.email || 'Unknown email'} ({config.provider === 'gmail' ? 'Gmail' : 'Outlook'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="flex items-center text-gray-500 pl-3 py-2">
                                        {loadingConfigs ? "Loading email accounts..." : "No email accounts connected"}
                                    </div>
                                )}
                            </div>

                            {/* Add new email account buttons */}
                            <div className="flex items-center">
                                <a
                                    href="/admin/settings"
                                    className="flex items-center gap-1 px-3 py-2 text-xs text-blue-700 hover:text-blue-800 group"
                                    title="Configure email accounts"
                                >
                                    <Info className="w-4 h-4 text-blue-500" />
                                    <span className="hidden md:inline">Configure email in Organization Settings</span>
                                    <span className="inline md:hidden">Configure emails</span>
                                </a>
                            </div>
                        </div>
                        {emailConfigs.length === 0 && !loadingConfigs && (
                            <div className="text-sm text-yellow-600 mt-1">
                                No email accounts connected. Please configure your email accounts in
                                <a href="/admin/settings" className="text-blue-600 hover:underline font-medium mx-1">
                                    Organization Settings
                                </a>
                                to send emails.
                            </div>
                        )}
                    </div>

                    {/* TO */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                        <input
                            type="email"
                            value={toAddress}
                            onChange={(e) => setToAddress(e.target.value)}
                            className="w-full px-4 py-2 bg-white rounded-lg border border-gray-300"
                            required
                        />
                    </div>

                    {/* Show/hide CC/BCC */}
                    <div className="text-sm text-primary-600 hover:underline cursor-pointer mb-2" onClick={() => setShowCcBcc(!showCcBcc)}>
                        {showCcBcc ? 'Hide CC/BCC' : 'Add CC/BCC'}
                    </div>

                    {showCcBcc && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CC</label>
                                <input
                                    type="email"
                                    value={cc}
                                    onChange={(e) => setCc(e.target.value)}
                                    className="w-full px-4 py-2 bg-white rounded-lg border border-gray-300"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">BCC</label>
                                <input
                                    type="email"
                                    value={bcc}
                                    onChange={(e) => setBcc(e.target.value)}
                                    className="w-full px-4 py-2 bg-white rounded-lg border border-gray-300"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subject
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                            required
                        />
                    </div>

                    {/* Attachment section */}
                    {/* Attachment section */}
                    {(quote || purchaseOrder || order) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Attachments
                            </label>

                            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                                {generatingPdf ? (
                                    <div className="flex items-center text-gray-500">
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-600 mr-2"></div>
                                        Generating PDF attachment...
                                    </div>
                                ) : pdfReady && pdfAttachment ? (
                                    // Added pdfAttachment check to ensure it exists
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <Paperclip className="w-4 h-4 text-gray-500 mr-2" />
                                            <span className="text-sm font-medium">{attachmentName}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                Ready to send
                                            </div>
                                            <button
                                                type="button"
                                                onClick={removeAttachment}
                                                className="text-red-500 hover:text-red-700"
                                                title="Remove attachment"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            try {
                                                // Clear any previous errors
                                                setError(null);

                                                if (purchaseOrder) {
                                                    generatePdfAttachment();
                                                } else if (quote) {
                                                    generateQuotePdf();
                                                } else if (order) {
                                                    generateOrderPdf();
                                                }
                                            } catch (error) {
                                                console.error("Error initiating PDF generation:", error);
                                                setError("Failed to generate PDF. Please try again.");
                                            }
                                        }}
                                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                    >
                                        <Paperclip className="w-4 h-4 mr-1" />
                                        {purchaseOrder
                                            ? "Generate Purchase Order PDF"
                                            : quote
                                                ? "Generate Quote PDF"
                                                : order
                                                    ? "Generate Order PDF"
                                                    : "Add Attachment"
                                        }
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Message
                            </label>

                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    onClick={suggestImprovement}
                                    disabled={aiGenerating || !body.trim()}
                                    className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center disabled:opacity-50"
                                >
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Improve
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowAiAssistant(true)}
                                    className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center"
                                >
                                    <Bot className="h-3 w-3 mr-1" />
                                    AI Assistant
                                </button>
                            </div>
                        </div>

                        <div className="rounded-lg overflow-hidden border border-gray-300">
                            <ReactQuill
                                theme="snow"
                                value={body}
                                onChange={setBody}
                                modules={modules}
                                formats={formats}
                                className="h-[200px] overflow-y-auto"
                                ref={quillRef}
                            />
                        </div>
                    </div>

                    {/* AI Email Assistant */}
                    {showAiAssistant && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold text-blue-800 flex items-center">
                                    <Bot className="w-4 h-4 mr-1 text-blue-600" />
                                    AI Email Assistant
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowAiAssistant(false)}
                                    className="text-blue-500 hover:text-blue-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="mb-3">
                                <label className="block text-xs font-medium text-blue-700 mb-1">
                                    What would you like to generate?
                                </label>
                                <div className="flex space-x-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setAiTarget('subject')}
                                        className={`px-2 py-1 text-xs rounded-full ${aiTarget === 'subject'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-blue-600 border border-blue-300'
                                            }`}
                                    >
                                        Subject Line
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAiTarget('body')}
                                        className={`px-2 py-1 text-xs rounded-full ${aiTarget === 'body'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-blue-600 border border-blue-300'
                                            }`}
                                    >
                                        Email Body
                                    </button>
                                </div>

                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder={`Describe what you want in your ${aiTarget === 'subject' ? 'subject line' : 'email'}`}
                                    className="w-full p-2 text-sm border border-blue-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-2"
                                    rows={2}
                                />

                                <div className="flex flex-wrap gap-1 mb-2">
                                    {emailTemplates.map((template, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => handleTemplateSelect(template.prompt)}
                                            className="px-2 py-1 text-xs bg-white border border-blue-300 rounded-full text-blue-700 hover:bg-blue-50"
                                        >
                                            {template.name}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center mb-2">
                                    <span className="text-xs text-blue-700 mr-2">Tone:</span>
                                    <select
                                        value={aiTone}
                                        onChange={(e) => setAiTone(e.target.value)}
                                        className="text-xs p-1 border border-blue-300 rounded bg-white text-blue-700"
                                    >
                                        <option value="professional">Professional</option>
                                        <option value="friendly">Friendly</option>
                                        <option value="formal">Formal</option>
                                        <option value="casual">Casual</option>
                                        <option value="persuasive">Persuasive</option>
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={generateEmailContent}
                                    disabled={aiGenerating || !aiPrompt.trim()}
                                    className="w-full flex justify-center items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Sparkles className="w-3 h-3 mr-2" />
                                    {aiGenerating ? 'Generating...' : 'Generate'}
                                </button>
                            </div>

                            {generatedContent && (
                                <div className="mt-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium text-blue-700">Generated {aiTarget === 'subject' ? 'Subject' : 'Email'}</span>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(generatedContent)}
                                            className="text-xs text-blue-600 flex items-center"
                                        >
                                            <Copy className="w-3 h-3 mr-1" />
                                            Copy
                                        </button>
                                    </div>

                                    <div className="p-2 bg-white rounded border border-blue-200 text-sm text-gray-800 max-h-40 overflow-y-auto">
                                        {aiTarget === 'subject' ? (
                                            <p>{generatedContent}</p>
                                        ) : (
                                            <div dangerouslySetInnerHTML={{ __html: generatedContent }} />
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={useGeneratedContent}
                                        className="mt-2 w-full flex justify-center items-center px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        Use This {aiTarget === 'subject' ? 'Subject' : 'Content'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={handleCloseWithConfirmation}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || emailConfigs.length === 0}
                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {loading ? 'Sending...' : 'Send Email'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );

    return (
        <AnimatePresence mode="wait">
            {isVisible && (
                <>
                    {renderMaximizedView()}
                </>
            )}
            {!isVisible && isDirty && (
                <>
                    {renderMinimizedView()}
                </>
            )}
        </AnimatePresence>
    );
}