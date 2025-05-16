// src/components/utils/GeneratePDF.js
import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Download } from 'lucide-react';
import PurchaseOrderPDF from '../admin/purchase/PurchaseOrderPDF';

/**
 * A utility component that handles PDF generation with loading state
 */
const GeneratePDF = ({
    document,
    fileName,
    buttonText = "Export PDF",
    className = "bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center"
}) => {
    const [isClient, setIsClient] = useState(false);

    // useEffect is needed because PDFDownloadLink uses browser APIs
    // and can only render on the client side
    React.useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <button className={className} disabled>
                <Download className="w-5 h-5 mr-2" />
                {buttonText}
            </button>
        );
    }

    return (
        <PDFDownloadLink
            document={document}
            fileName={fileName}
            className={className}
        >
            {({ loading, error }) => (
                <>
                    <Download className="w-5 h-5 mr-2" />
                    {loading ? 'Generating...' : buttonText}
                </>
            )}
        </PDFDownloadLink>
    );
};

export default GeneratePDF;