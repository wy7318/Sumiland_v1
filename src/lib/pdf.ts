import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './utils';

export const generateQuotePDF = (quote: any) => {
  // Create PDF with slightly larger page size for better margins
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width;
  const margin = 20; // Left margin in mm

  // Add logo
  doc.addImage(
    'https://jaytpfztifhtzcruxguj.supabase.co/storage/v1/object/public/Sumiland%20Design//logo_webclip.png',
    'PNG',
    margin,
    15,
    40,
    40
  );
  
  // Company Info - Right aligned
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Sumiland & Sub Studio', pageWidth - margin, 20, { align: 'right' });
  doc.text('600 E Curry Rd, Tempe, AZ 85288', pageWidth - margin, 25, { align: 'right' });
  doc.text('www.sumisubi.com', pageWidth - margin, 30, { align: 'right' });
  doc.text('(480) 274-5767', pageWidth - margin, 35, { align: 'right' });

  // Quote Title and Number
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  // doc.text('QUOTE', margin, 50);
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`${quote.quote_number}`, margin + 110, 50);

  // Quote Details
  const detailsY = 65;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);

  // Left column
  doc.text('DATE', margin, detailsY);
  doc.text('VALID FOR', margin, detailsY + 7);
  
  doc.setTextColor(0, 0, 0);
  doc.text(new Date(quote.quote_date).toLocaleDateString(), margin + 25, detailsY);
  doc.text('30 days', margin + 25, detailsY + 7);

  // Right column
  doc.setTextColor(100, 100, 100);
  doc.text('BILL TO', pageWidth - margin - 60, detailsY);
  
  doc.setTextColor(0, 0, 0);
  doc.text([
    `${quote.customer.first_name} ${quote.customer.last_name}`,
    quote.customer.address_line1,
    quote.customer.address_line2 || '',
    `${quote.customer.city}, ${quote.customer.state} ${quote.customer.zip_code}`,
    quote.customer.country
  ].filter(Boolean), pageWidth - margin - 60, detailsY + 7);

  // Items Table
  const tableBody = [];
  for (const item of quote.items) {
    // Add item name row
    tableBody.push([
      {
        content: item.item_name,
        styles: { fontStyle: 'bold' }
      },
      item.quantity,
      formatCurrency(item.unit_price),
      formatCurrency(item.quantity * item.unit_price)
    ]);

    // Add description row if it exists
    if (item.item_desc) {
      tableBody.push([
        {
          content: item.item_desc,
          styles: { 
            textColor: [100, 100, 100],
            fontSize: 9
          },
          colSpan: 4
        }
      ]);
    }
  }

  autoTable(doc, {
    startY: 100,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: tableBody,
    foot: [[
      { content: 'Subtotal', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(quote.total_amount), styles: { fontStyle: 'bold' } }
    ]],
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
      lineColor: [230, 230, 230],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [250, 250, 250],
      textColor: [100, 100, 100],
      fontStyle: 'bold',
      lineWidth: 0,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    },
    didDrawPage: (data) => {
      // Add page numbers
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${data.pageNumber} of ${data.pageCount}`,
        pageWidth - margin,
        doc.internal.pageSize.height - 10,
        { align: 'right' }
      );
    }
  });

  // Terms & Conditions
  const termsY = doc.lastAutoTable.finalY + 20;
  
  // Terms Header
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Terms & Conditions', margin, termsY);

  // Payment Terms Section
  doc.setFontSize(10);
  doc.setTextColor(70, 70, 70);
  
  const terms = [
    { 
      title: 'Payment Terms',
      content: [
        '• 70% of the total quoted amount is required to initiate work.',
        '• Remaining 30% is due upon completion and approval of final deliverables.'
      ]
    },
    {
      title: 'Revisions',
      content: [
        '• Three revisions are included in this quote.',
        '• Additional revisions may incur extra charges unless specified in a subscription or higher package.'
      ]
    },
    {
      title: 'Cancellation',
      content: [
        '• Please notify us promptly of any cancellation.',
        '• A portion of the initial payment may be retained for work completed.'
      ]
    },
    {
      title: 'Copyright',
      content: [
        '• We retain copyright to all designs.',
        '• Unauthorized use will result in a minimum charge of 30 times the service fee.',
        '• Source files are not included unless specifically paid for or agreed upon.'
      ]
    },
    {
      title: 'Deliverables',
      content: [
        '• One final solution will be provided unless additional options have been discussed and paid for.'
      ]
    }
  ];

  let currentY = termsY + 10;
  const sectionSpacing = 8;
  const lineSpacing = 5;

  terms.forEach(section => {
    // Section Title
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(section.title, margin, currentY);
    currentY += lineSpacing + 2;

    // Section Content
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    section.content.forEach(line => {
      if (currentY > doc.internal.pageSize.height - 20) {
        doc.addPage();
        currentY = margin;
      }
      doc.text(line, margin, currentY);
      currentY += lineSpacing;
    });
    currentY += sectionSpacing;
  });

  // Footer
  const footerY = doc.internal.pageSize.height - 25;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  
  return doc;
};