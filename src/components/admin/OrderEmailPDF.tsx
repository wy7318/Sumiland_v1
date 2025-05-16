// Fix for OrderEmailPDF component

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Mail, AlertCircle } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import OrderPDF from './OrderPDF';
import { FoldableEmailModal } from './FoldableEmailModal';

export function OrderEmailPDF({
    order,
    organizationName,
    organizationLogo,
    orgId,
    onEmailSuccess
}) {
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [pdfBlob, setPdfBlob] = useState(null);
    const [error, setError] = useState(null);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [isEmailMinimized, setIsEmailMinimized] = useState(false);

    // Added this useEffect to automatically generate PDF when component mounts
    useEffect(() => {
        // Pre-generate PDF for better user experience
        if (order && !pdfBlob) {
            generatePdf(false); // false means don't trigger download
        }
    }, [order]);

    const generatePdf = async (downloadAfter = true) => {
        try {
            setGeneratingPdf(true);
            setError(null);
            console.log("Starting PDF generation for order:", order.order_number);

            // Create the PDF document
            const pdfDoc = (
                <OrderPDF
                    order={order}
                    organizationName={organizationName || 'Your Company'}
                    organizationLogo={organizationLogo}
                />
            );

            // Generate PDF as blob
            const blob = await pdf(pdfDoc).toBlob();
            console.log("PDF blob generated successfully:", blob);

            // Store the blob for potential email attachment
            setPdfBlob(blob);

            // Only trigger download if requested
            if (downloadAfter) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Order_${order.order_number}_${order.customer?.first_name || 'Customer'}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

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
            console.log("No PDF blob found, generating one now...");
            const blob = await generatePdf(false); // Don't download, just generate
            if (!blob) {
                console.error("Failed to generate PDF blob");
                return; // Exit if PDF generation failed
            }
        } else {
            console.log("Using existing PDF blob for email");
        }

        // Open email modal
        setShowEmailModal(true);
        setIsEmailMinimized(false);
    };

    const handleEmailSuccess = () => {
        setShowEmailModal(false);
        if (onEmailSuccess) {
            onEmailSuccess();
        }
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
                    onClick={() => generatePdf(true)}
                    disabled={generatingPdf}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg flex items-center hover:bg-orange-700 disabled:opacity-70"
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
                    Email Order
                </motion.button>
            </div>

            {/* Email Modal with debugging console log */}
            {showEmailModal && (
                <>
                    {console.log("Opening email modal with PDF blob:", pdfBlob)}
                    {console.log("Attachment name:", `Order_${order.order_number}.pdf`)}
                    <FoldableEmailModal
                        to={order.customer?.email || ''}
                        onClose={() => setShowEmailModal(false)}
                        onSuccess={handleEmailSuccess}
                        isVisible={!isEmailMinimized}
                        onMinimize={() => setIsEmailMinimized(true)}
                        onMaximize={() => setIsEmailMinimized(false)}
                        orgId={orgId}
                        caseId={order.order_id}
                        caseTitle={order.order_number}
                        // Pass necessary data for the PDF
                        order={order}
                        organizationName={organizationName}
                        organizationLogo={organizationLogo}
                        // Use pregenerated PDF blob
                        existingPdfAttachment={pdfBlob}
                        attachmentName={`Order_${order.order_number}.pdf`}
                    />
                </>
            )}
        </div>
    );
}