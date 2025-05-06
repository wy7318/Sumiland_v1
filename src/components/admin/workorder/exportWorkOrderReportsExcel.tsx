import * as XLSX from 'xlsx';
import _ from 'lodash';

/**
 * Exports the work order reports as an Excel file
 * @param reportData The current report data state
 * @param organizationName The name of the organization
 * @param dateRangeText Text representation of the selected date range
 */
export function exportWorkOrderReportsExcel(
    reportData,
    organizationName,
    dateRangeText = 'Last 30 Days'
) {
    try {
        // Create workbook
        const workbook = XLSX.utils.book_new();

        // Add summary sheet
        const summaryData = [
            ['Work Order Report'],
            [`Organization: ${organizationName}`],
            [`Date Range: ${dateRangeText}`],
            [`Generated: ${new Date().toLocaleString()}`],
            [],
            ['Key Performance Indicators'],
            ['Metric', 'Value'],
            ['Total Work Orders', reportData.kpis.totalWorkOrders],
            ['Open Work Orders', reportData.kpis.openWorkOrders],
            ['Completed Last Month', reportData.kpis.completedLastMonth],
            ['Avg. Completion Time (days)', reportData.kpis.avgCompletionTime],
            ['Total Costs', reportData.kpis.totalCost],
            ['Avg. Task Completion (%)', reportData.kpis.avgTaskCompletion],
        ];

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

        // Set column widths
        const summaryColWidths = [
            { wch: 30 }, // A
            { wch: 20 }, // B
        ];
        summarySheet['!cols'] = summaryColWidths;

        // Add status sheet
        const statusHeaders = [['Status', 'Count', 'Percentage']];
        const totalStatus = _.sumBy(reportData.statusCounts, 'value');

        const statusData = reportData.statusCounts.map(item => [
            item.name,
            item.value,
            `${((item.value / totalStatus) * 100).toFixed(1)}%`
        ]);

        const statusSheet = XLSX.utils.aoa_to_sheet([...statusHeaders, ...statusData]);

        // Set column widths
        const statusColWidths = [
            { wch: 20 }, // A
            { wch: 15 }, // B
            { wch: 15 }, // C
        ];
        statusSheet['!cols'] = statusColWidths;

        // Add priority sheet
        const priorityHeaders = [['Priority', 'Count', 'Percentage']];
        const totalPriority = _.sumBy(reportData.priorityCounts, 'value');

        const priorityData = reportData.priorityCounts.map(item => [
            item.name,
            item.value,
            `${((item.value / totalPriority) * 100).toFixed(1)}%`
        ]);

        const prioritySheet = XLSX.utils.aoa_to_sheet([...priorityHeaders, ...priorityData]);

        // Set column widths
        const priorityColWidths = [
            { wch: 20 }, // A
            { wch: 15 }, // B
            { wch: 15 }, // C
        ];
        prioritySheet['!cols'] = priorityColWidths;

        // Add cost breakdown sheet
        const costHeaders = [['Category', 'Amount']];

        const costData = reportData.costBreakdown.map(item => [
            item.name,
            item.value
        ]);

        const costSheet = XLSX.utils.aoa_to_sheet([...costHeaders, ...costData]);

        // Set column widths
        const costColWidths = [
            { wch: 20 }, // A
            { wch: 15 }, // B
        ];
        costSheet['!cols'] = costColWidths;

        // Add inventory consumption sheet
        const inventoryHeaders = [['Product', 'Cost']];

        const inventoryData = reportData.itemConsumption.map(item => [
            item.name,
            item.value
        ]);

        const inventorySheet = XLSX.utils.aoa_to_sheet([...inventoryHeaders, ...inventoryData]);

        // Set column widths
        const inventoryColWidths = [
            { wch: 40 }, // A
            { wch: 15 }, // B
        ];
        inventorySheet['!cols'] = inventoryColWidths;

        // Add all sheets to workbook
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
        XLSX.utils.book_append_sheet(workbook, statusSheet, 'Status Distribution');
        XLSX.utils.book_append_sheet(workbook, prioritySheet, 'Priority Distribution');
        XLSX.utils.book_append_sheet(workbook, costSheet, 'Cost Breakdown');
        XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory Consumption');

        // Write and download workbook
        XLSX.writeFile(workbook, `WorkOrderReport_${organizationName.replace(/\s+/g, '_')}.xlsx`);

        return true;
    } catch (error) {
        console.error('Error exporting Excel report:', error);
        alert(`Failed to export Excel report: ${error.message || 'Unknown error'}`);
        return false;
    }
}