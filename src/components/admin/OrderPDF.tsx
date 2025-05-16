// src/components/admin/orders/OrderPDF.jsx
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
    orderDetails: {
        textAlign: 'right',
    },
    orderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#057D6B', // Green-teal color
    },
    orderNumber: {
        fontSize: 12,
        marginBottom: 3,
    },
    orderDate: {
        fontSize: 12,
        marginBottom: 3,
    },
    statusBadge: {
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
    cancelledStatus: {
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
    paymentInfo: {
        fontSize: 10,
        marginTop: 30,
        padding: 10,
        backgroundColor: '#F3F4F6', // Light gray
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#E5E7EB', // Gray
    },
    paymentStatus: {
        fontSize: 10,
        marginTop: 10,
        padding: 6,
        borderRadius: 4,
        textAlign: 'center',
        width: '100%',
    },
    paidStatus: {
        backgroundColor: '#D1FAE5', // Light green
        color: '#047857', // Dark green
    },
    pendingPaymentStatus: {
        backgroundColor: '#FEF3C7', // Light amber
        color: '#B45309', // Dark amber
    },
    partialPaymentStatus: {
        backgroundColor: '#E0F2FE', // Light blue
        color: '#0369A1', // Dark blue
    },
    trackingInfo: {
        fontSize: 10,
        marginTop: 10,
        padding: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    }
});

// Create Document Component
const OrderPDF = ({ order, organizationName, organizationLogo }) => {
    const getStatusStyle = (status) => {
        if (!status || status === 'Pending' || status === 'New') return styles.pendingStatus;
        if (status === 'Cancelled' || status === 'Rejected') return styles.cancelledStatus;
        return styles.statusBadge; // Default for other statuses
    };

    const getPaymentStatusStyle = (status) => {
        if (status === 'Fully Received') return styles.paidStatus;
        if (status === 'Partial Received') return styles.partialPaymentStatus;
        return styles.pendingPaymentStatus; // Default for Pending
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
        line1: order.shipping_address_line1,
        line2: order.shipping_address_line2,
        city: order.shipping_city,
        state: order.shipping_state,
        country: order.shipping_country
    });

    // Prepare billing address
    const billingAddress = formatAddress({
        line1: order.billing_address_line1,
        line2: order.billing_address_line2,
        city: order.billing_city,
        state: order.billing_state,
        country: order.billing_country
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
                            {order.billing_address_line1}
                            {order.billing_address_line2 ? `, ${order.billing_address_line2}` : ''}
                        </Text>
                    </View>
                    <View style={styles.orderDetails}>
                        <Text style={styles.orderTitle}>ORDER</Text>
                        <Text style={styles.orderNumber}>Order #: {order.order_number}</Text>
                        <Text style={styles.orderDate}>Date: {formatDate(order.created_at)}</Text>
                        {order.status && (
                            <Text style={[styles.statusBadge, getStatusStyle(order.status)]}>
                                {order.status}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Customer & Shipping Information */}
                <View style={styles.twoColumnSection}>
                    <View style={styles.column}>
                        <Text style={styles.sectionTitle}>Customer Information</Text>
                        <Text style={styles.label}>Customer:</Text>
                        <Text style={styles.value}>
                            {order.customer.first_name} {order.customer.last_name}
                        </Text>

                        {order.customer.company && (
                            <Text style={styles.value}>{order.customer.company}</Text>
                        )}

                        {order.customer.email && (
                            <>
                                <Text style={styles.label}>Email:</Text>
                                <Text style={styles.value}>{order.customer.email}</Text>
                            </>
                        )}

                        {order.customer.phone && (
                            <>
                                <Text style={styles.label}>Phone:</Text>
                                <Text style={styles.value}>{order.customer.phone}</Text>
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
                        <Text style={styles.tableCol4}>Total</Text>
                    </View>

                    {order.items.map((item, i) => (
                        <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableAltRow]}>
                            <View style={styles.tableCol1}>
                                <Text>{item.product?.name || item.item_name || 'Custom Item'}</Text>
                                {(item.product?.description || item.description) && (
                                    <Text style={{ fontSize: 8, color: '#666' }}>
                                        {item.product?.description || item.description}
                                    </Text>
                                )}
                            </View>
                            <Text style={styles.tableCol2}>{item.quantity}</Text>
                            <Text style={styles.tableCol3}>{formatCurrency(item.unit_price)}</Text>
                            <Text style={styles.tableCol4}>{formatCurrency(item.quantity * item.unit_price)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.subtotal}>
                    <Text style={styles.subtotalLabel}>Subtotal:</Text>
                    <Text style={styles.subtotalValue}>{formatCurrency(order.subtotal)}</Text>
                </View>

                {order.tax_amount > 0 && (
                    <View style={styles.subtotal}>
                        <Text style={styles.subtotalLabel}>Tax ({order.tax_percent}%):</Text>
                        <Text style={styles.subtotalValue}>{formatCurrency(order.tax_amount)}</Text>
                    </View>
                )}

                {order.discount_amount > 0 && (
                    <View style={styles.subtotal}>
                        <Text style={styles.subtotalLabel}>Discount:</Text>
                        <Text style={styles.subtotalValue}>-{formatCurrency(order.discount_amount)}</Text>
                    </View>
                )}

                <View style={styles.total}>
                    <Text style={styles.totalLabel}>TOTAL:</Text>
                    <Text style={styles.totalValue}>{formatCurrency(order.total_amount)}</Text>
                </View>

                {/* Payment Information */}
                <View style={styles.paymentInfo}>
                    <Text style={styles.termsTitle}>Payment Information</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                        <Text>Amount Paid:</Text>
                        <Text>{formatCurrency(order.payment_amount)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                        <Text>Balance Due:</Text>
                        <Text>{formatCurrency(order.total_amount - order.payment_amount)}</Text>
                    </View>
                    <View style={{ alignItems: 'center', marginTop: 8 }}>
                        <Text style={[styles.paymentStatus, getPaymentStatusStyle(order.payment_status)]}>
                            {order.payment_status}
                        </Text>
                    </View>
                </View>

                {/* Tracking Information */}
                {(order.tracking_number || order.tracking_carrier) && (
                    <View style={styles.trackingInfo}>
                        <Text style={styles.termsTitle}>Tracking Information</Text>
                        {order.tracking_carrier && (
                            <View style={{ flexDirection: 'row', marginBottom: 5 }}>
                                <Text style={{ width: '30%' }}>Carrier:</Text>
                                <Text style={{ width: '70%' }}>{order.tracking_carrier}</Text>
                            </View>
                        )}
                        {order.tracking_number && (
                            <View style={{ flexDirection: 'row' }}>
                                <Text style={{ width: '30%' }}>Tracking Number:</Text>
                                <Text style={{ width: '70%' }}>{order.tracking_number}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Notes */}
                {order.notes && (
                    <View style={styles.terms}>
                        <Text style={styles.termsTitle}>Notes:</Text>
                        <Text>{order.notes}</Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Order #{order.order_number} | {organizationName}</Text>
                    <Text>Generated on {formatDate(new Date().toISOString())}</Text>
                </View>
            </Page>
        </Document>
    );
};

// Export a component that renders the PDF
export const OrderPDFDownloadLink = ({
    order,
    organizationName = "Your Company Name",
    organizationLogo = null,
    fileName = null
}) => {
    // Generate file name if not provided
    const documentFileName = fileName ||
        `Order_${order.order_number}_${order.customer?.first_name || 'Customer'}.pdf`;

    return (
        <PDFDownloadLink
            document={
                <OrderPDF
                    order={order}
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

export default OrderPDF;