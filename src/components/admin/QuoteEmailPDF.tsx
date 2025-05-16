// src/components/admin/quotes/QuoteEmailPDF.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Mail, X, Send, AlertCircle, CheckCircle, Paperclip } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import QuotePDF from './QuotePDF';
import { FoldableEmailModal } from './FoldableEmailModal';

export function QuoteEmailPDF({
    quote,
    organizationName,
    organizationLogo,
    orgId
}) {
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [pdfBlob, setPdfBlob] = useState(null);
    const [error, setError] = useState(null);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [isEmailMinimized, setIsEmailMinimized] = useState(false);

    const generatePdf = async () => {
        try {
            setGeneratingPdf(true);
            setError(null);

            // Create the PDF document
            const pdfDoc = (
                <QuotePDF
                    quote={quote}
                    organizationName={organizationName || 'Your Company'}
                    organizationLogo={organizationLogo}
                />
            );

            // Generate PDF as blob
            const blob = await pdf(pdfDoc).toBlob();

            // Trigger download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Quote_${quote.quote_number}_${quote.customer?.first_name || 'Customer'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Store the blob for potential email attachment
            setPdfBlob(blob);

            return blob;
        } catch (err) {
            console.error('Error generating PDF:', err);
            setError('Failed to generate PDF. Please try again.');
            return null;
        } finally {
            setGeneratingPdf(false);
        }
    };

    const handleEmailClick = async () => {
        // Generate PDF if not already generated
        if (!pdfBlob) {
            const blob = await generatePdf();
            if (!blob) return; // Exit if PDF generation failed
        }

        // Open email modal
        setShowEmailModal(true);
        setIsEmailMinimized(false);
    };

    const handleEmailSuccess = () => {
        setShowEmailModal(false);
        // Additional success handling if needed
    };

    return (
        <div>
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            <div className="flex space-x-3">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={generatePdf}
                    disabled={generatingPdf}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg flex items-center hover:bg-teal-700 disabled:opacity-70"
                >
                    <Download className="w-5 h-5 mr-2" />
                    {generatingPdf ? 'Generating...' : 'Export PDF'}
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleEmailClick}
                    disabled={generatingPdf}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center hover:bg-blue-600 disabled:opacity-70"
                >
                    <Mail className="w-5 h-5 mr-2" />
                    Email Quote
                </motion.button>
            </div>

            {/* Email Modal */}
            {showEmailModal && (
                <FoldableEmailModal
                    to={quote.customer?.email || ''}
                    onClose={() => setShowEmailModal(false)}
                    onSuccess={handleEmailSuccess}
                    isVisible={!isEmailMinimized}
                    onMinimize={() => setIsEmailMinimized(true)}
                    onMaximize={() => setIsEmailMinimized(false)}
                    orgId={orgId}
                    caseId={quote.quote_id}
                    caseTitle={quote.quote_number}
                    // Pass necessary data for the PDF
                    quote={quote}
                    organizationName={organizationName}
                    organizationLogo={organizationLogo}
                    // Use pregenerated PDF blob
                    existingPdfAttachment={pdfBlob}
                    attachmentName={`Quote_${quote.quote_number}.pdf`}
                />
            )}
        </div>
    );
}