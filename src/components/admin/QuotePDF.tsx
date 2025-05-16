// src/components/admin/quotes/QuotePDF.js
import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    PDFDownloadLink,
    Font,
    Image
} from '@react-pdf/renderer';
import { formatCurrency, formatDate } from '../../lib/utils';

// Register fonts (optional, but helps with styling)
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 'normal' },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' },
    ]
});

// Create styles
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Roboto'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    companyHeader: {
        flexDirection: 'column',
    },
    companyLogo: {
        width: 120,
        marginBottom: 10,
    },
    companyName: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    companyDetails: {
        fontSize: 10,
        color: '#555',
    },
    quoteDetails: {
        textAlign: 'right',
    },
    quoteTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#057D6B', // Green-teal color
    },
    quoteNumber: {
        fontSize: 12,
        marginBottom: 3,
    },
    quoteDate: {
        fontSize: 12,
        marginBottom: 3,
    },
    quoteExpiry: {
        fontSize: 12,
        marginBottom: 3,
        color: '#D97706', // Amber color for expiration
    },
    approvalStatus: {
        fontSize: 10,
        marginTop: 5,
        padding: 4,
        borderRadius: 4,
        backgroundColor: '#D1FAE5', // Light green
        color: '#047857', // Dark green
        textAlign: 'center',
    },
    pendingStatus: {
        backgroundColor: '#FEF3C7', // Light amber
        color: '#B45309', // Dark amber
    },
    rejectedStatus: {
        backgroundColor: '#FEE2E2', // Light red
        color: '#B91C1C', // Dark red
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        padding: 5,
        backgroundColor: '#f0f0f0',
        color: '#057D6B',
    },
    twoColumnSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    column: {
        width: '45%',
    },
    label: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 3,
    },
    value: {
        fontSize: 10,
        marginBottom: 5,
    },
    table: {
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        fontSize: 10,
        fontWeight: 'bold',
        padding: 5,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        padding: 5,
        fontSize: 10,
    },
    tableAltRow: {
        backgroundColor: '#f9f9f9',
    },
    tableCol1: {
        width: '50%',
    },
    tableCol2: {
        width: '15%',
        textAlign: 'center',
    },
    tableCol3: {
        width: '15%',
        textAlign: 'right',
    },
    tableCol4: {
        width: '20%',
        textAlign: 'right',
    },
    subtotal: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    subtotalLabel: {
        width: '25%',
        textAlign: 'right',
        fontSize: 10,
        fontWeight: 'bold',
        paddingRight: 10,
    },
    subtotalValue: {
        width: '20%',
        textAlign: 'right',
        fontSize: 10,
    },
    total: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    totalLabel: {
        width: '25%',
        textAlign: 'right',
        fontSize: 12,
        fontWeight: 'bold',
        paddingRight: 10,
    },
    totalValue: {
        width: '20%',
        textAlign: 'right',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#057D6B',
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 10,
        color: '#555',
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        paddingTop: 10,
    },
    terms: {
        marginTop: 30,
        fontSize: 10,
        paddingBottom: 60, // Make room for footer
    },
    termsTitle: {
        fontWeight: 'bold',
        marginBottom: 5,
    },
    signature: {
        marginTop: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    signatureBox: {
        width: '45%',
    },
    signatureLine: {
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        marginTop: 40,
        marginBottom: 5,
        width: '100%',
    },
    signatureLabel: {
        fontSize: 10,
    },
    validityNotice: {
        fontSize: 10,
        marginTop: 30,
        padding: 10,
        backgroundColor: '#FEF3C7', // Light amber
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#F59E0B', // Amber
    }
});

// Create Document Component
const QuotePDF = ({ quote, organizationName, organizationLogo }) => {
    const getApprovalStatusStyle = (status) => {
        if (!status || status === 'Pending') return styles.pendingStatus;
        if (status === 'Rejected') return styles.rejectedStatus;
        return styles.approvalStatus; // Default for Approved
    };

    // Format address for PDF
    const formatAddress = (address) => {
        const lines = [];
        if (address.line1) lines.push(address.line1);
        if (address.line2) lines.push(address.line2);

        let cityStateCountry = '';
        if (address.city) cityStateCountry += address.city;
        if (address.state) cityStateCountry += cityStateCountry ? `, ${address.state}` : address.state;
        if (cityStateCountry) lines.push(cityStateCountry);

        if (address.country) lines.push(address.country);
        return lines;
    };

    // Prepare shipping address
    const shippingAddress = formatAddress({
        line1: quote.shipping_address_line1,
        line2: quote.shipping_address_line2,
        city: quote.shipping_city,
        state: quote.shipping_state,
        country: quote.shipping_country
    });

    // Prepare billing address
    const billingAddress = formatAddress({
        line1: quote.billing_address_line1,
        line2: quote.billing_address_line2,
        city: quote.billing_city,
        state: quote.billing_state,
        country: quote.billing_country
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.companyHeader}>
                        {organizationLogo && (
                            <Image style={styles.companyLogo} src={organizationLogo} />
                        )}
                        <Text style={styles.companyName}>{organizationName}</Text>
                        <Text style={styles.companyDetails}>
                            {quote.billing_address_line1}
                            {quote.billing_address_line2 ? `, ${quote.billing_address_line2}` : ''}
                        </Text>
                    </View>
                    <View style={styles.quoteDetails}>
                        <Text style={styles.quoteTitle}>QUOTATION</Text>
                        <Text style={styles.quoteNumber}>Quote #: {quote.quote_number}</Text>
                        <Text style={styles.quoteDate}>Date: {formatDate(quote.quote_date)}</Text>
                        {quote.expire_at && (
                            <Text style={styles.quoteExpiry}>
                                Valid Until: {formatDate(quote.expire_at)}
                            </Text>
                        )}
                        {quote.approval_status && (
                            <Text style={[styles.approvalStatus, getApprovalStatusStyle(quote.approval_status)]}>
                                {quote.approval_status}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Customer & Shipping Information */}
                <View style={styles.twoColumnSection}>
                    <View style={styles.column}>
                        <Text style={styles.sectionTitle}>For</Text>
                        <Text style={styles.label}>Customer:</Text>
                        <Text style={styles.value}>
                            {quote.customer.first_name} {quote.customer.last_name}
                        </Text>

                        {quote.customer.company && (
                            <Text style={styles.value}>{quote.customer.company}</Text>
                        )}

                        {quote.customer.email && (
                            <>
                                <Text style={styles.label}>Email:</Text>
                                <Text style={styles.value}>{quote.customer.email}</Text>
                            </>
                        )}
                    </View>

                    <View style={styles.column}>
                        <Text style={styles.sectionTitle}>Ship To</Text>
                        {shippingAddress.map((line, i) => (
                            <Text key={i} style={styles.value}>{line}</Text>
                        ))}

                        <Text style={styles.sectionTitle}>Bill To</Text>
                        {billingAddress.map((line, i) => (
                            <Text key={i} style={styles.value}>{line}</Text>
                        ))}
                    </View>
                </View>

                {/* Quote Items */}
                <Text style={styles.sectionTitle}>Quote Items</Text>
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.tableCol1}>Item</Text>
                        <Text style={styles.tableCol2}>Quantity</Text>
                        <Text style={styles.tableCol3}>Unit Price</Text>
                        <Text style={styles.tableCol4}>Total</Text>
                    </View>

                    {quote.items.map((item, i) => (
                        <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableAltRow]}>
                            <View style={styles.tableCol1}>
                                <Text>{item.item_name}</Text>
                                {item.item_desc && (
                                    <Text style={{ fontSize: 8, color: '#666' }}>{item.item_desc}</Text>
                                )}
                            </View>
                            <Text style={styles.tableCol2}>{item.quantity}</Text>
                            <Text style={styles.tableCol3}>{formatCurrency(item.unit_price)}</Text>
                            <Text style={styles.tableCol4}>{formatCurrency(item.line_total)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.subtotal}>
                    <Text style={styles.subtotalLabel}>Subtotal:</Text>
                    <Text style={styles.subtotalValue}>{formatCurrency(quote.subtotal)}</Text>
                </View>

                {quote.tax_amount > 0 && (
                    <View style={styles.subtotal}>
                        <Text style={styles.subtotalLabel}>Tax ({quote.tax_percent}%):</Text>
                        <Text style={styles.subtotalValue}>{formatCurrency(quote.tax_amount)}</Text>
                    </View>
                )}

                {quote.discount_amount > 0 && (
                    <View style={styles.subtotal}>
                        <Text style={styles.subtotalLabel}>Discount ({quote.discount_percent.toFixed(2)}%):</Text>
                        <Text style={styles.subtotalValue}>-{formatCurrency(quote.discount_amount)}</Text>
                    </View>
                )}

                <View style={styles.total}>
                    <Text style={styles.totalLabel}>TOTAL:</Text>
                    <Text style={styles.totalValue}>{formatCurrency(quote.total_amount)}</Text>
                </View>

                {/* Notes */}
                {quote.notes && (
                    <View style={styles.terms}>
                        <Text style={styles.termsTitle}>Notes:</Text>
                        <Text>{quote.notes}</Text>
                    </View>
                )}

                {/* Validity statement */}
                {quote.expire_at && (
                    <View style={styles.validityNotice}>
                        <Text>This quote is valid until {formatDate(quote.expire_at)}. After this date, prices and availability may change.</Text>
                    </View>
                )}

                {/* Signature */}
                <View style={styles.signature}>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Customer Signature</Text>
                    </View>

                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Date</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Quote #{quote.quote_number} | {organizationName}</Text>
                    <Text>Generated on {formatDate(new Date().toISOString())}</Text>
                </View>
            </Page>
        </Document>
    );
};

// Export a component that renders the PDF
export const QuotePDFDownloadLink = ({
    quote,
    organizationName = "Your Company Name",
    organizationLogo = null,
    fileName = null
}) => {
    // Generate file name if not provided
    const documentFileName = fileName ||
        `Quote_${quote.quote_number}_${quote.customer?.first_name || 'Customer'}.pdf`;

    return (
        <PDFDownloadLink
            document={
                <QuotePDF
                    quote={quote}
                    organizationName={organizationName}
                    organizationLogo={organizationLogo}
                />
            }
            fileName={documentFileName}
            style={{
                textDecoration: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                fontWeight: 'medium'
            }}
        >
            {({ loading }) => (loading ? 'Generating PDF...' : 'Download PDF')}
        </PDFDownloadLink>
    );
};

export default QuotePDF;