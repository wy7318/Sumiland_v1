import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import _ from 'lodash';

/**
 * Exports the work order reports as a PDF including all charts and KPI data
 * @param reportData The current report data state
 * @param organizationName The name of the organization
 * @param dateRangeText Text representation of the selected date range
 */
export async function exportWorkOrderReports(
    reportData,
    organizationName,
    dateRangeText = 'Last 30 Days'
) {
    try {
        // Create loading indicator
        const loadingEl = document.createElement('div');
        loadingEl.className = 'fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50';
        loadingEl.innerHTML = `
      <div class="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
        <p class="text-gray-700 font-medium">Generating report, please wait...</p>
      </div>
    `;
        document.body.appendChild(loadingEl);

        // Initialize PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);

        // Get all chart elements
        const chartElements = document.querySelectorAll('.recharts-wrapper');
        if (!chartElements.length) {
            throw new Error('No charts found to export');
        }

        // Report header
        pdf.setFontSize(20);
        pdf.setTextColor(30, 30, 30);
        pdf.text(`Work Order Report: ${organizationName}`, margin, margin);

        pdf.setFontSize(12);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`Date Range: ${dateRangeText}`, margin, margin + 8);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 14);

        // Add KPI table
        pdf.setFontSize(16);
        pdf.setTextColor(30, 30, 30);
        pdf.text('Key Performance Indicators', margin, margin + 25);

        const kpiData = [
            ['Total Work Orders', reportData.kpis.totalWorkOrders.toString()],
            ['Open Work Orders', reportData.kpis.openWorkOrders.toString()],
            ['Completed Last Month', reportData.kpis.completedLastMonth.toString()],
            ['Avg. Completion Time', `${reportData.kpis.avgCompletionTime} days`],
            ['Total Costs', `$${(reportData.kpis.totalCost / 1000).toFixed(1)}k`],
            ['Avg. Task Completion', `${reportData.kpis.avgTaskCompletion}%`]
        ];

        // Create KPI table
        pdf.setFontSize(10);
        pdf.setTextColor(50, 50, 50);

        const kpiTableTop = margin + 30;
        const kpiColWidth = contentWidth / 2;
        const kpiRowHeight = 8;

        kpiData.forEach((row, i) => {
            // Draw cells
            pdf.setFillColor(i % 2 === 0 ? 245 : 240, i % 2 === 0 ? 247 : 242, i % 2 === 0 ? 250 : 245);
            pdf.rect(margin, kpiTableTop + (i * kpiRowHeight), kpiColWidth, kpiRowHeight, 'F');
            pdf.rect(margin + kpiColWidth, kpiTableTop + (i * kpiRowHeight), kpiColWidth, kpiRowHeight, 'F');

            // Add text
            pdf.text(row[0], margin + 2, kpiTableTop + (i * kpiRowHeight) + 5);
            pdf.text(row[1], margin + kpiColWidth + 2, kpiTableTop + (i * kpiRowHeight) + 5);
        });

        let yPosition = kpiTableTop + (kpiData.length * kpiRowHeight) + 15;

        // Capture and add charts
        for (let i = 0; i < chartElements.length; i++) {
            const chartEl = chartElements[i];
            const chartTitle = chartEl.closest('.bg-white')?.querySelector('h3')?.textContent || `Chart ${i + 1}`;

            // Check if we need a new page
            if (yPosition > pageHeight - 50) {
                pdf.addPage();
                yPosition = margin;
            }

            // Add chart title
            pdf.setFontSize(14);
            pdf.setTextColor(50, 50, 50);
            pdf.text(chartTitle, margin, yPosition);
            yPosition += 8;

            // Capture chart as image
            const canvas = await html2canvas(chartEl, {
                scale: 2,
                backgroundColor: null,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');

            // Calculate chart dimensions to fit within page width
            const imgWidth = contentWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Add chart image to PDF
            pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 20;
        }

        // Add data tables section if there's space
        if (yPosition < pageHeight - 60) {
            pdf.setFontSize(16);
            pdf.setTextColor(30, 30, 30);
            pdf.text('Data Tables', margin, yPosition);
            yPosition += 10;

            // Status distribution table
            if (reportData.statusCounts.length) {
                pdf.setFontSize(12);
                pdf.text('Status Distribution', margin, yPosition);
                yPosition += 6;

                const statusHeaders = ['Status', 'Count', 'Percentage'];
                const totalStatus = _.sumBy(reportData.statusCounts, 'value');

                // Create status table
                pdf.setFontSize(9);
                pdf.setTextColor(50, 50, 50);

                const colWidth = contentWidth / 3;

                // Draw header
                pdf.setFillColor(79, 70, 229); // Indigo
                pdf.setTextColor(255, 255, 255);
                pdf.rect(margin, yPosition, contentWidth, 7, 'F');

                statusHeaders.forEach((header, i) => {
                    pdf.text(header, margin + (i * colWidth) + 2, yPosition + 5);
                });

                yPosition += 7;
                pdf.setTextColor(50, 50, 50);

                // Draw rows
                reportData.statusCounts.forEach((item, i) => {
                    pdf.setFillColor(i % 2 === 0 ? 245 : 240, i % 2 === 0 ? 247 : 242, i % 2 === 0 ? 250 : 245);
                    pdf.rect(margin, yPosition, contentWidth, 7, 'F');

                    const percentage = ((item.value / totalStatus) * 100).toFixed(1);

                    pdf.text(item.name, margin + 2, yPosition + 5);
                    pdf.text(item.value.toString(), margin + colWidth + 2, yPosition + 5);
                    pdf.text(`${percentage}%`, margin + (colWidth * 2) + 2, yPosition + 5);

                    yPosition += 7;
                });

                yPosition += 10;
            }
        }

        // Add data export page for the remaining tables
        pdf.addPage();
        yPosition = margin;

        pdf.setFontSize(16);
        pdf.setTextColor(30, 30, 30);
        pdf.text('Additional Data Tables', margin, yPosition);
        yPosition += 10;

        // Priority distribution table
        if (reportData.priorityCounts.length) {
            pdf.setFontSize(12);
            pdf.text('Priority Distribution', margin, yPosition);
            yPosition += 6;

            const priorityHeaders = ['Priority', 'Count', 'Percentage'];
            const totalPriority = _.sumBy(reportData.priorityCounts, 'value');

            // Create priority table
            pdf.setFontSize(9);

            const colWidth = contentWidth / 3;

            // Draw header
            pdf.setFillColor(79, 70, 229); // Indigo
            pdf.setTextColor(255, 255, 255);
            pdf.rect(margin, yPosition, contentWidth, 7, 'F');

            priorityHeaders.forEach((header, i) => {
                pdf.text(header, margin + (i * colWidth) + 2, yPosition + 5);
            });

            yPosition += 7;
            pdf.setTextColor(50, 50, 50);

            // Draw rows
            reportData.priorityCounts.forEach((item, i) => {
                pdf.setFillColor(i % 2 === 0 ? 245 : 240, i % 2 === 0 ? 247 : 242, i % 2 === 0 ? 250 : 245);
                pdf.rect(margin, yPosition, contentWidth, 7, 'F');

                const percentage = ((item.value / totalPriority) * 100).toFixed(1);

                pdf.text(item.name, margin + 2, yPosition + 5);
                pdf.text(item.value.toString(), margin + colWidth + 2, yPosition + 5);
                pdf.text(`${percentage}%`, margin + (colWidth * 2) + 2, yPosition + 5);

                yPosition += 7;
            });

            yPosition += 10;
        }

        // Top Inventory Consumption
        if (reportData.itemConsumption.length) {
            pdf.setFontSize(12);
            pdf.text('Top Inventory Consumption', margin, yPosition);
            yPosition += 6;

            const inventoryHeaders = ['Product', 'Cost'];

            // Create inventory table
            pdf.setFontSize(9);

            const colWidth = contentWidth / 2;

            // Draw header
            pdf.setFillColor(79, 70, 229); // Indigo
            pdf.setTextColor(255, 255, 255);
            pdf.rect(margin, yPosition, contentWidth, 7, 'F');

            inventoryHeaders.forEach((header, i) => {
                pdf.text(header, margin + (i * colWidth) + 2, yPosition + 5);
            });

            yPosition += 7;
            pdf.setTextColor(50, 50, 50);

            // Draw rows
            reportData.itemConsumption.forEach((item, i) => {
                pdf.setFillColor(i % 2 === 0 ? 245 : 240, i % 2 === 0 ? 247 : 242, i % 2 === 0 ? 250 : 245);
                pdf.rect(margin, yPosition, contentWidth, 7, 'F');

                pdf.text(item.name, margin + 2, yPosition + 5);
                pdf.text(`$${item.value.toFixed(2)}`, margin + colWidth + 2, yPosition + 5);

                yPosition += 7;
            });
        }

        // Save PDF
        pdf.save(`WorkOrderReport_${organizationName.replace(/\s+/g, '_')}.pdf`);

        // Remove loading indicator
        document.body.removeChild(loadingEl);

        return true;
    } catch (error) {
        console.error('Error exporting report:', error);

        // Remove loading indicator if exists
        const loadingEl = document.querySelector('.fixed.top-0.left-0.w-full.h-full.bg-black');
        if (loadingEl) {
            document.body.removeChild(loadingEl);
        }

        // Show error alert
        alert(`Failed to export report: ${error.message || 'Unknown error'}`);
        return false;
    }
}