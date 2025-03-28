// fieldValidator.ts
// Helper functions to validate and correct field references in formulas

/**
 * Validates a formula by checking if all referenced fields exist in the data
 * and suggests corrections for common field naming issues
 * 
 * @param formula The formula to validate
 * @param availableFields Object containing the available fields
 * @returns An object with validation result and suggestions
 */
export function validateFormula(formula: string, availableFields: Record<string, any>) {
    if (!formula) return { isValid: false, message: 'Formula is empty' };

    // Extract field references from the formula
    const fieldReferences = extractFieldReferences(formula);

    // Check if all referenced fields exist
    const missingFields: string[] = [];
    const suggestions: Record<string, string> = {};

    fieldReferences.forEach(field => {
        if (!(field in availableFields)) {
            missingFields.push(field);

            // Try to find a matching field with a different case or format
            const suggestion = findSimilarField(field, Object.keys(availableFields));
            if (suggestion) {
                suggestions[field] = suggestion;
            }
        }
    });

    if (missingFields.length === 0) {
        return { isValid: true };
    }

    // Create helpful message with suggestions
    let message = `The following fields are not found in the data: ${missingFields.join(', ')}`;

    if (Object.keys(suggestions).length > 0) {
        message += '\n\nSuggested corrections:';
        Object.entries(suggestions).forEach(([original, suggested]) => {
            message += `\n• Replace "${original}" with "${suggested}"`;
        });
    }

    return {
        isValid: false,
        message,
        missingFields,
        suggestions
    };
}

/**
 * Extract field references from a formula
 */
function extractFieldReferences(formula: string): string[] {
    // Match valid identifier patterns - this is a simple approach
    // A more robust solution would use a proper formula parser
    const fieldPattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
    const matches = formula.match(fieldPattern) || [];

    // Filter out JavaScript keywords and common functions
    const jsKeywords = [
        'if', 'else', 'return', 'true', 'false', 'null', 'undefined',
        'var', 'let', 'const', 'function', 'typeof'
    ];
    const commonFunctions = [
        'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'ABS', 'COUNT',
        'Math'
    ];

    return matches.filter(match =>
        !jsKeywords.includes(match) &&
        !commonFunctions.includes(match)
    );
}

/**
 * Find a field name that is similar to the provided field
 * Handles common variations like camelCase vs snake_case
 * 
 * @param field The field to find a match for
 * @param availableFields Array of available field names
 * @returns The matched field name or null if no match found
 */
function findSimilarField(field: string, availableFields: string[]): string | null {
    // Check for exact match (should never happen as this is already checked)
    if (availableFields.includes(field)) return field;

    // Check for case-insensitive match
    const lowerField = field.toLowerCase();
    const caseInsensitiveMatch = availableFields.find(f =>
        f.toLowerCase() === lowerField
    );
    if (caseInsensitiveMatch) return caseInsensitiveMatch;

    // Check for camelCase to snake_case conversion
    if (field.includes('_')) {
        // Convert snake_case to camelCase
        const camelCase = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        const camelMatch = availableFields.find(f => f === camelCase);
        if (camelMatch) return camelMatch;
    } else {
        // Convert camelCase to snake_case
        const snakeCase = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        const snakeMatch = availableFields.find(f => f === snakeCase);
        if (snakeMatch) return snakeMatch;
    }

    // Check for fields with similar names (e.g., "converted" vs "converted_at")
    const similarFields = availableFields.filter(f =>
        f.includes(field) || field.includes(f)
    );

    if (similarFields.length > 0) {
        // Return the closest match by length difference
        return similarFields.reduce((best, current) => {
            const bestDiff = Math.abs(best.length - field.length);
            const currentDiff = Math.abs(current.length - field.length);
            return currentDiff < bestDiff ? current : best;
        });
    }

    return null;
}

/**
 * Automatically fix common formula field references to match available fields
 * 
 * @param formula The formula to correct
 * @param availableFields Object containing the available fields
 * @returns The corrected formula
 */
export function correctFormula(formula: string, availableFields: Record<string, any>): string {
    if (!formula) return formula;

    const { isValid, suggestions } = validateFormula(formula, availableFields);

    // If valid or no suggestions, return as is
    if (isValid || !suggestions || Object.keys(suggestions).length === 0) {
        return formula;
    }

    // Apply corrections
    let correctedFormula = formula;

    Object.entries(suggestions).forEach(([original, suggestion]) => {
        // Create a regex that matches whole words only
        const regex = new RegExp(`\\b${original}\\b`, 'g');
        correctedFormula = correctedFormula.replace(regex, suggestion);
    });

    return correctedFormula;
}