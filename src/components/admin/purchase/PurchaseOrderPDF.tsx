// src/components/admin/purchase-orders/PurchaseOrderPDF.js
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
import { formatCurrency, formatDate } from '../../../lib/utils';

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
    poDetails: {
        textAlign: 'right',
    },
    poTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    poNumber: {
        fontSize: 12,
        marginBottom: 3,
    },
    poDate: {
        fontSize: 12,
        marginBottom: 3,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        padding: 5,
        backgroundColor: '#f0f0f0',
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
        width: '40%',
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
        width: '15%',
        textAlign: 'right',
    },
    tableCol5: {
        width: '15%',
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
        width: '15%',
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
        width: '15%',
        textAlign: 'right',
        fontSize: 12,
        fontWeight: 'bold',
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
});

// Create Document Component
const PurchaseOrderPDF = ({ purchaseOrder, organizationName, organizationLogo }) => {
    // Helper function to calculate subtotal
    const calculateSubtotal = () => {
        if (!purchaseOrder?.purchase_order_items) return 0;
        return purchaseOrder.purchase_order_items.reduce((sum, item) =>
            sum + (parseFloat(item.line_total) || parseFloat(item.quantity) * parseFloat(item.unit_price)),
            0);
    };

    // Helper function to calculate tax total
    const calculateTaxTotal = () => {
        if (!purchaseOrder?.purchase_order_items) return 0;
        return purchaseOrder.purchase_order_items.reduce((sum, item) => {
            const lineAmount = parseFloat(item.line_total) ||
                (parseFloat(item.quantity) * parseFloat(item.unit_price));
            const taxRate = parseFloat(item.tax_rate) || 0;
            return sum + (lineAmount * (taxRate / 100));
        }, 0);
    };

    // Helper function to calculate total
    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const taxTotal = calculateTaxTotal();
        const shipping = parseFloat(purchaseOrder.shipping_amount) || 0;
        const discount = parseFloat(purchaseOrder.discount_amount) || 0;
        return subtotal + taxTotal + shipping - discount;
    };

    // Format address for PDF
    const formatAddress = (address) => {
        const lines = [];
        if (address.line1) lines.push(address.line1);
        if (address.line2) lines.push(address.line2);

        let cityStateZip = '';
        if (address.city) cityStateZip += address.city;
        if (address.state) cityStateZip += cityStateZip ? `, ${address.state}` : address.state;
        if (address.postal_code) cityStateZip += cityStateZip ? ` ${address.postal_code}` : address.postal_code;
        if (cityStateZip) lines.push(cityStateZip);

        if (address.country) lines.push(address.country);
        return lines;
    };

    // Prepare shipping address
    const shippingAddress = formatAddress({
        line1: purchaseOrder.shipping_address_line1,
        line2: purchaseOrder.shipping_address_line2,
        city: purchaseOrder.shipping_city,
        state: purchaseOrder.shipping_state,
        postal_code: purchaseOrder.shipping_postal_code,
        country: purchaseOrder.shipping_country
    });

    // Prepare billing address
    const billingAddress = formatAddress({
        line1: purchaseOrder.billing_address_line1,
        line2: purchaseOrder.billing_address_line2,
        city: purchaseOrder.billing_city,
        state: purchaseOrder.billing_state,
        postal_code: purchaseOrder.billing_postal_code,
        country: purchaseOrder.billing_country
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
                            {purchaseOrder.billing_address_line1}
                            {purchaseOrder.billing_address_line2 ? `, ${purchaseOrder.billing_address_line2}` : ''}
                        </Text>
                    </View>
                    <View style={styles.poDetails}>
                        <Text style={styles.poTitle}>PURCHASE ORDER</Text>
                        <Text style={styles.poNumber}>PO #: {purchaseOrder.order_number}</Text>
                        <Text style={styles.poDate}>Date: {formatDate(purchaseOrder.order_date)}</Text>
                        {purchaseOrder.expected_delivery_date && (
                            <Text style={styles.poDate}>
                                Expected Delivery: {formatDate(purchaseOrder.expected_delivery_date)}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Vendor & Shipping Information */}
                <View style={styles.twoColumnSection}>
                    <View style={styles.column}>
                        <Text style={styles.sectionTitle}>Vendor Information</Text>
                        <Text style={styles.label}>Vendor:</Text>
                        <Text style={styles.value}>{purchaseOrder.vendors?.name || 'N/A'}</Text>

                        {purchaseOrder.vendors?.contact_person && (
                            <>
                                <Text style={styles.label}>Contact Person:</Text>
                                <Text style={styles.value}>{purchaseOrder.vendors.contact_person}</Text>
                            </>
                        )}

                        {purchaseOrder.vendors?.email && (
                            <>
                                <Text style={styles.label}>Email:</Text>
                                <Text style={styles.value}>{purchaseOrder.vendors.email}</Text>
                            </>
                        )}

                        {purchaseOrder.vendors?.phone && (
                            <>
                                <Text style={styles.label}>Phone:</Text>
                                <Text style={styles.value}>{purchaseOrder.vendors.phone}</Text>
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

                {/* Order Items */}
                <Text style={styles.sectionTitle}>Order Items</Text>
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.tableCol1}>Item</Text>
                        <Text style={styles.tableCol2}>Quantity</Text>
                        <Text style={styles.tableCol3}>Unit Price</Text>
                        <Text style={styles.tableCol4}>Tax Rate</Text>
                        <Text style={styles.tableCol5}>Total</Text>
                    </View>

                    {purchaseOrder.purchase_order_items.map((item, i) => (
                        <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableAltRow]}>
                            <View style={styles.tableCol1}>
                                <Text>{item.products.name}</Text>
                                <Text style={{ fontSize: 8, color: '#666' }}>{item.products.sku}</Text>
                            </View>
                            <Text style={styles.tableCol2}>
                                {item.quantity} {item.products.stock_unit}
                            </Text>
                            <Text style={styles.tableCol3}>{formatCurrency(item.unit_price)}</Text>
                            <Text style={styles.tableCol4}>{parseFloat(item.tax_rate).toFixed(2)}%</Text>
                            <Text style={styles.tableCol5}>{formatCurrency(item.line_total)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.subtotal}>
                    <Text style={styles.subtotalLabel}>Subtotal:</Text>
                    <Text style={styles.subtotalValue}>{formatCurrency(calculateSubtotal())}</Text>
                </View>

                <View style={styles.subtotal}>
                    <Text style={styles.subtotalLabel}>Tax:</Text>
                    <Text style={styles.subtotalValue}>{formatCurrency(calculateTaxTotal())}</Text>
                </View>

                {purchaseOrder.shipping_amount > 0 && (
                    <View style={styles.subtotal}>
                        <Text style={styles.subtotalLabel}>Shipping:</Text>
                        <Text style={styles.subtotalValue}>{formatCurrency(purchaseOrder.shipping_amount)}</Text>
                    </View>
                )}

                {purchaseOrder.discount_amount > 0 && (
                    <View style={styles.subtotal}>
                        <Text style={styles.subtotalLabel}>Discount:</Text>
                        <Text style={styles.subtotalValue}>-{formatCurrency(purchaseOrder.discount_amount)}</Text>
                    </View>
                )}

                <View style={styles.total}>
                    <Text style={styles.totalLabel}>TOTAL:</Text>
                    <Text style={styles.totalValue}>{formatCurrency(calculateTotal())}</Text>
                </View>

                {/* Notes */}
                {purchaseOrder.notes && (
                    <View style={styles.terms}>
                        <Text style={styles.termsTitle}>Notes:</Text>
                        <Text>{purchaseOrder.notes}</Text>
                    </View>
                )}

                {/* Payment Terms */}
                <View style={styles.terms}>
                    <Text style={styles.termsTitle}>Payment Terms:</Text>
                    <Text>{purchaseOrder.payment_terms || 'Not specified'}</Text>
                </View>

                {/* Signature */}
                <View style={styles.signature}>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Authorized Signature</Text>
                    </View>

                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Date</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Purchase Order #{purchaseOrder.order_number} | {organizationName}</Text>
                    <Text>Generated on {formatDate(new Date().toISOString())}</Text>
                </View>
            </Page>
        </Document>
    );
};

// Export a component that renders the PDF
export const PurchaseOrderPDFDownloadLink = ({
    purchaseOrder,
    organizationName = "Your Company Name",
    organizationLogo = null,
    fileName = null
}) => {
    // Generate file name if not provided
    const documentFileName = fileName ||
        `PO_${purchaseOrder.order_number}_${purchaseOrder.vendors?.name || 'Vendor'}.pdf`;

    return (
        <PDFDownloadLink
            document={
                <PurchaseOrderPDF
                    purchaseOrder={purchaseOrder}
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
                backgroundColor: '#1a202c',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                fontWeight: 'medium'
            }}
        >
            {({ loading }) => (loading ? 'Generating PDF...' : 'Download PDF')}
        </PDFDownloadLink>
    );
};

export default PurchaseOrderPDF;