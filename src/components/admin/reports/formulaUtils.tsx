// formulaUtils.tsx
// Contains all formula-related utilities and types

// Type definitions
export type FormulaField = {
    id: string;
    name: string;
    formula: string;
    description?: string;
    result_type: 'number' | 'string' | 'date' | 'boolean' | 'duration';
    format?: string;
};

// Format time difference helper
export const formatTimeDifference = (seconds: number): string => {
    if (isNaN(seconds)) return 'Invalid';

    // For very short times
    if (seconds < 60) return `${seconds} seconds`;

    // For minutes
    if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    // For hours
    if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    // For days
    const days = Math.floor(seconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''}`;
};

// Corrected evaluateFormula function for formulaUtils.tsx
export function evaluateFormula(
    formula: string,
    record: any,
    formulaFields: FormulaField[] = []
): any {
    try {
        // Special handling for CURRENT_TIMESTAMP
        if (formula.includes('CURRENT_TIMESTAMP')) {
            // Replace CURRENT_TIMESTAMP with now() in the formula
            formula = formula.replace(/CURRENT_TIMESTAMP/g, 'now()');
        }

        // Debug available fields
        console.log('Available fields in data:', Object.keys(record));
        

        // First check if this is a date difference formula (common case)
        if (formula.includes('-') && formula.split('-').length === 2) {
            const [field1, field2] = formula.split('-').map(f => f.trim());

            // Check if fields exist in the record
            if (!record[field1]) {
                console.error(`Field "${field1}" not found in data. Available fields:`, Object.keys(record));
                throw new Error(`Field "${field1}" not found in data. Please check field name.`);
            }

            if (!record[field2]) {
                console.error(`Field "${field2}" not found in data. Available fields:`, Object.keys(record));
                throw new Error(`Field "${field2}" not found in data. Please check field name.`);
            }

            // Check if fields are dates
            const date1 = new Date(record[field1]);
            const date2 = new Date(record[field2]);

            if (isNaN(date1.getTime())) {
                throw new Error(`Value in field "${field1}" is not a valid date: ${record[field1]}`);
            }

            if (isNaN(date2.getTime())) {
                throw new Error(`Value in field "${field2}" is not a valid date: ${record[field2]}`);
            }

            // Calculate time difference in seconds
            return Math.abs(date2.getTime() - date1.getTime()) / 1000;
        }

        // For more complex formulas, build a safe evaluation context
        // Create a scope with field values from the record
        const scope: any = {};
        

        // FIXED SECTION: Include ALL fields from record in scope, not just primitive types
        // This was the source of the bug - fields like 'converted_at' were being filtered out
        for (const key in record) {
            // Only exclude functions which can't be safely serialized
            if (typeof record[key] !== 'function') {
                scope[key] = record[key];

                // Debug logging for the specific problem field
                if (key === 'converted_at') {
                    console.log('Added converted_at to scope:', record[key]);
                }
            }
        }

        // Add JavaScript built-ins to the scope
        scope.Math = Math;
        scope.Date = Date;
        scope.parseFloat = parseFloat;
        scope.parseInt = parseInt;
        scope.CURRENT_TIMESTAMP = new Date();

        // Add helper functions for date operations
        scope.now = function () {
            return new Date();
        };
        scope.dateObj = function (dateStr) {
            return new Date(dateStr);
        };
        scope.daysBetween = function (date1, date2) {
            const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
            const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
            return Math.floor(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24));
        };
        // END OF NEW CODE

        // Then add formula fields (calculated on demand)
        for (const field of formulaFields) {
            // Skip the current formula to avoid circular references
            if (field.formula !== formula) {
                Object.defineProperty(scope, field.id, {
                    get: () => evaluateFormula(
                        field.formula,
                        record,
                        formulaFields.filter(f => f.id !== field.id) // prevent circular refs
                    )
                });
            }
        }

        // Add basic math functions
        scope.SUM = (...args: number[]) => args.reduce((sum, val) => sum + val, 0);
        scope.AVG = (...args: number[]) => args.length ? scope.SUM(...args) / args.length : 0;
        scope.MIN = Math.min;
        scope.MAX = Math.max;
        scope.ROUND = Math.round;
        scope.ABS = Math.abs;

        // Safety check: make sure all referenced fields exist
        const fieldPattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
        const matches = formula.match(fieldPattern) || [];

        // Filter out known function names and JavaScript keywords
        const jsKeywords = ['if', 'else', 'true', 'false', 'null', 'undefined'];
        const knownFunctions = [
            'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'ABS',
            'Math', 'Date', 'parseFloat', 'parseInt',
            'CURRENT_TIMESTAMP', 'now', 'dateObj', 'daysBetween'
        ];

        const possibleFields = matches.filter(match =>
            !jsKeywords.includes(match) &&
            !knownFunctions.includes(match)
        );

        // Debug the scope before field check
        console.log('Scope for formula evaluation:', Object.keys(scope));

        // Check if all fields exist in scope
        for (const field of possibleFields) {
            if (!(field in scope)) {
                console.error(`Field "${field}" not found in data. Available fields:`, Object.keys(scope));
                throw new Error(`Field "${field}" not found in your data. Please check field name.`);
            }
        }

        // Use a Function constructor to safely evaluate the formula with the scope
        try {
            const scopeKeys = Object.keys(scope);
            const scopeValues = scopeKeys.map(key => scope[key]);

            // Debug the formula that will be evaluated
            console.log('Evaluating formula:', formula);

            // CHANGE THIS SECTION - Add global functions to the evaluation
            let functionBody = `
        // Add global date functions
        function now() { return new Date(); }
        function daysBetween(date1, date2) {
            const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
            const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
            return Math.floor(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24));
        }
        
        return ${formula};
    `;

            // Create a function that evaluates the formula with the provided scope
            const evalFunction = new Function(...scopeKeys, functionBody);

            // Execute the function with our scope values
            const result = evalFunction(...scopeValues);
            console.log('Formula result:', result);
            return result;
        } catch (evalError) {
            console.error('Error evaluating formula:', evalError);
            throw new Error(`Formula evaluation error: ${evalError instanceof Error ? evalError.message : String(evalError)}`);
        }
    } catch (error) {
        console.error('Formula evaluation error:', error);

        // Format the error message for display
        let errorMessage = 'Error in formula';
        if (error instanceof Error) {
            errorMessage = error.message;
        }

        throw new Error(errorMessage);
    }
}

// Process chart data function
export function processChartData(rawData: any[], charts: any[], formulaFields: FormulaField[] = []) {
    const processedData = charts.map(chart => {
        // Skip incomplete chart configurations
        if (!chart.x_field) {
            return { ...chart, data: [] };
        }

        // For direct values (no aggregation) on formula fields
        if (chart.aggregation === 'direct' && chart.y_field) {
            // Simply map the data directly without grouping
            const chartData = rawData.map(item => {
                return {
                    name: item[chart.x_field] || 'Unknown',
                    value: item[chart.y_field] || 0
                };
            });

            return {
                ...chart,
                data: chartData
            };
        }

        // Process data with formula fields
        const processedRecords = rawData.map(record => {
            const processedRecord = { ...record };

            // Calculate formula fields
            for (const formula of formulaFields) {
                processedRecord[formula.id] = evaluateFormula(formula.formula, record, formulaFields);
            }

            return processedRecord;
        });

        // Group data by x-axis field
        const groupedData = rawData.reduce((acc, item) => {
            // Ensure we get a valid x-axis value or use 'Unknown'
            const xValue = item[chart.x_field] || 'Unknown';

            if (!acc[xValue]) {
                acc[xValue] = {
                    [chart.x_field]: xValue,
                    count: 0,
                    sum: 0,
                    total: 0,
                    records: []
                };
            }

            acc[xValue].count++;

            if (chart.y_field) {
                // Safely extract the y-axis value
                const value = parseFloat(item[chart.y_field]) || 0;
                acc[xValue].sum += value;
                acc[xValue].total += value;
                acc[xValue].records.push(item);
            }

            return acc;
        }, {});

        // Convert grouped data to array format
        const chartData = Object.values(groupedData).map((group: any) => ({
            name: group[chart.x_field],
            value: chart.aggregation === 'count' ? group.count :
                chart.aggregation === 'sum' ? group.sum :
                    chart.aggregation === 'avg' ? (group.total / group.count) : 0
        }));

        return {
            ...chart,
            data: chartData
        };
    });

    return processedData;
}