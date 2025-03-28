// sampleDataService.ts
// Service for fetching real sample data from Supabase for formula testing

import { supabase } from '../../../lib/supabase';

/**
 * Fetches a sample record from the specified object for formula testing
 * This uses actual data from Supabase instead of mock data
 * 
 * @param objectName The name of the object to fetch data from (e.g., 'leads', 'opportunities')
 * @returns A promise that resolves to a sample record with all fields
 */


export async function fetchSampleData(objectName: string): Promise<any> {
    try {
        // Your existing code to fetch data from Supabase...
        const tableName = getTableNameFromObjectType(objectName);

        // Get the actual data record from Supabase (your existing code)
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching sample data:', error);
            throw new Error(`Failed to fetch sample data: ${error.message}`);
        }

        // If no data is found, return a fallback object
        if (!data) {
            return generateFallbackData(objectName);
        }

        // CRITICAL PART: Enhance the data with commonly expected fields
        const enhancedData = enhanceDataWithExpectedFields(data, objectName);

        console.log('Enhanced sample data:', enhancedData);
        return enhancedData;
    } catch (error) {
        console.error('Error in fetchSampleData:', error);
        // Return fallback data
        return generateFallbackData(objectName);
    }
}



// export async function fetchSampleData(objectName: string): Promise<any> {
//     try {
//         console.log(`Fetching sample data for ${objectName}...`);

//         // Get the actual table name based on the object type
//         const tableName = getTableNameFromObjectType(objectName);

//         // First get all available fields for this object
//         const { data: fields, error: fieldsError } = await supabase
//             .rpc('get_object_fields', { object_name: tableName });

//         if (fieldsError) {
//             console.error('Error fetching fields:', fieldsError);
//             throw new Error(`Failed to get fields for ${objectName}: ${fieldsError.message}`);
//         }

//         // If there are no fields, throw an error
//         if (!fields || fields.length === 0) {
//             throw new Error(`No fields found for ${objectName}`);
//         }

//         // Get column names to select
//         const columnNames = fields.map((field: any) => field.column_name);

//         // Query for a sample record with all fields
//         const { data, error } = await supabase
//             .from(tableName)
//             .select(columnNames.join(','))
//             .limit(1)
//             .maybeSingle();

//         if (error) {
//             console.error('Error fetching sample data:', error);
//             throw new Error(`Failed to fetch sample data: ${error.message}`);
//         }

//         if (!data) {
//             // No actual records found, create a synthetic one with correct field schema
//             console.log(`No records found in ${tableName}, creating synthetic record with correct schema`);
//             const syntheticRecord: Record<string, any> = {};

//             // Add all fields from schema with appropriate default values
//             fields.forEach((field: any) => {
//                 const fieldName = field.column_name;
//                 const dataType = field.data_type;

//                 // Set appropriate default values based on data type
//                 if (dataType.includes('timestamp') || dataType.includes('date')) {
//                     syntheticRecord[fieldName] = new Date().toISOString();
//                 } else if (dataType.includes('int') || dataType.includes('numeric') || dataType.includes('decimal')) {
//                     syntheticRecord[fieldName] = 0;
//                 } else if (dataType.includes('bool')) {
//                     syntheticRecord[fieldName] = false;
//                 } else {
//                     syntheticRecord[fieldName] = `Sample ${fieldName}`;
//                 }
//             });

//             console.log('Created synthetic record:', syntheticRecord);
//             return syntheticRecord;
//         }

//         // Add any missing fields that might be expected by the UI but aren't in the data
//         // (This typically happens with dynamic fields or when column names differ from UI expectations)
//         const enhancedData = enhanceDataWithCommonFields(data, objectName);

//         console.log(`Sample data fetched for ${objectName}:`, enhancedData);
//         return enhancedData;
//     } catch (error) {
//         console.error('Error in fetchSampleData:', error);

//         // If we fail to get real data, return a placeholder with expected fields
//         return generateFallbackData(objectName);
//     }
// }


/**
 * Enhances data with expected fields that might be missing but needed for formulas
 */
function enhanceDataWithExpectedFields(data: any, objectType: string): any {
    // Create a copy to avoid modifying the original
    const enhancedData = { ...data };

    // For leads, ensure converted_at exists if is_converted exists
    if (objectType === 'leads') {
        // If is_converted exists but converted_at doesn't, add it
        if ('is_converted' in enhancedData && !('converted_at' in enhancedData)) {
            console.log('Adding synthetic converted_at field based on is_converted');
            enhancedData.converted_at = enhancedData.is_converted
                ? new Date().toISOString()
                : null;
        }

        // Handle camelCase/snake_case variations
        if ('created_at' in enhancedData && !('createdAt' in enhancedData)) {
            enhancedData.createdAt = enhancedData.created_at;
        }

        if ('converted_at' in enhancedData && !('convertedAt' in enhancedData)) {
            enhancedData.convertedAt = enhancedData.converted_at;
        }
    }

    return enhancedData;
}

/**
 * Add commonly expected fields that might be missing from the actual data
 * This is crucial for testing formulas with fields that may not exist in every record
 */
function enhanceDataWithCommonFields(data: any, objectType: string): any {
    // Create a copy to avoid modifying the original
    const enhancedData = { ...data };

    // Special handling for specific object types
    if (objectType === 'leads') {
        // Common lead fields that might be referenced in formulas
        if (!('converted_at' in enhancedData) && ('is_converted' in enhancedData)) {
            // If is_converted exists but converted_at doesn't, add it with an appropriate value
            enhancedData.converted_at = enhancedData.is_converted
                ? new Date().toISOString()
                : null;
        }

        // Add first_interaction_date if it doesn't exist
        if (!('first_interaction_date' in enhancedData) && ('created_at' in enhancedData)) {
            enhancedData.first_interaction_date = enhancedData.created_at;
        }

        // Handle potential camelCase vs snake_case differences
        if (!('convertedAt' in enhancedData) && ('converted_at' in enhancedData)) {
            enhancedData.convertedAt = enhancedData.converted_at;
        }

        if (!('createdAt' in enhancedData) && ('created_at' in enhancedData)) {
            enhancedData.createdAt = enhancedData.created_at;
        }
    }

    if (objectType === 'opportunities') {
        // Common opportunity fields
        if (!('closed_at' in enhancedData)) {
            enhancedData.closed_at = enhancedData.status === 'Closed'
                ? new Date().toISOString()
                : null;
        }
    }

    return enhancedData;
}

/**
 * Get the table name from an object type
 * Maps object types like 'leads' to their actual table names
 */
function getTableNameFromObjectType(objectType: string): string {
    // Map of object types to their table names
    const objectToTableMap: Record<string, string> = {
        'leads': 'leads',
        'opportunities': 'opportunities',
        'customers': 'customers',
        'vendors': 'vendors',
        'cases': 'cases',
        'quotes': 'quote_hdr',
        'orders': 'order_hdr',
        'products': 'products'
    };

    // Default to pluralizing the object type if not in the map
    return objectToTableMap[objectType] || `${objectType}s`;
}

/**
 * If we can't get real data, generate a fallback with the most common fields
 * This is useful during development or when the table exists but has no records
 */
function generateFallbackData(objectType: string): any {
    // Common fields for all objects
    const commonFields = {
        id: `sample-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        createdAt: new Date().toISOString(), // Include camelCase versions
        updatedAt: new Date().toISOString()
    };

    // Add object-specific fields
    switch (objectType) {
        case 'leads':
            return {
                ...commonFields,
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com',
                is_converted: true,
                converted_at: new Date().toISOString(), // Important: Add this synthetic field
                convertedAt: new Date().toISOString(),  // Add camelCase version too
                status: 'Qualified',
                lead_source: 'Website'
            };

        default:
            return commonFields;
    }
}

/**
 * Fetches the available fields for a given object type from Supabase
 * This is used to populate the field selector in the formula builder
 * 
 * @param objectType The object type to fetch fields for
 * @returns A promise that resolves to an array of fields
 */
export async function fetchObjectFields(objectType: string): Promise<any[]> {
    try {
        const tableName = getTableNameFromObjectType(objectType);

        // Get fields from Supabase
        const { data, error } = await supabase
            .rpc('get_object_fields', { object_name: tableName });

        if (error) {
            console.error('Error fetching fields:', error);
            throw error;
        }

        // Transform the fields to the expected format
        const fields = data.map((field: any) => ({
            column_name: field.column_name,
            data_type: field.data_type,
            is_nullable: field.is_nullable,
            column_default: field.column_default,
            display_name: field.column_name
                .split('_')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
        }));

        // Add common expected fields that might not be in the schema
        // This ensures that UI-expected fields are always available for formulas
        const enhancedFields = addCommonExpectedFields(fields, objectType);

        return enhancedFields;
    } catch (error) {
        console.error('Error in fetchObjectFields:', error);
        // Return fallback fields
        return getFallbackFields(objectType);
    }
}

/**
 * Add common expected fields that might not be in the database schema
 * but are frequently used in formulas
 */
function addCommonExpectedFields(fields: any[], objectType: string): any[] {
    // Create a copy to avoid modifying the original
    const enhancedFields = [...fields];

    // Check if specific fields exist
    const fieldExists = (name: string) => enhancedFields.some(f => f.column_name === name);

    // For leads, ensure converted_at exists if is_converted exists
    if (objectType === 'leads') {
        if (fieldExists('is_converted') && !fieldExists('converted_at')) {
            enhancedFields.push({
                column_name: 'converted_at',
                data_type: 'timestamp with time zone',
                is_nullable: true,
                column_default: null,
                display_name: 'Converted At'
            });
        }

        // Add camelCase alternatives for common fields
        if (fieldExists('converted_at') && !fieldExists('convertedAt')) {
            enhancedFields.push({
                column_name: 'convertedAt',
                data_type: 'timestamp with time zone',
                is_nullable: true,
                column_default: null,
                display_name: 'Converted At'
            });
        }

        if (fieldExists('created_at') && !fieldExists('createdAt')) {
            enhancedFields.push({
                column_name: 'createdAt',
                data_type: 'timestamp with time zone',
                is_nullable: true,
                column_default: null,
                display_name: 'Created At'
            });
        }
    }

    return enhancedFields;
}

/**
 * Get fallback fields when we can't fetch from database
 */
function getFallbackFields(objectType: string): any[] {
    // Common fields for all objects
    const commonFields = [
        {
            column_name: 'id',
            data_type: 'varchar',
            is_nullable: false,
            column_default: null,
            display_name: 'ID'
        },
        {
            column_name: 'created_at',
            data_type: 'timestamp with time zone',
            is_nullable: false,
            column_default: null,
            display_name: 'Created At'
        },
        {
            column_name: 'updated_at',
            data_type: 'timestamp with time zone',
            is_nullable: false,
            column_default: null,
            display_name: 'Updated At'
        }
    ];

    // Add object-specific fields
    switch (objectType) {
        case 'leads':
            return [
                ...commonFields,
                {
                    column_name: 'first_name',
                    data_type: 'varchar',
                    is_nullable: true,
                    column_default: null,
                    display_name: 'First Name'
                },
                {
                    column_name: 'last_name',
                    data_type: 'varchar',
                    is_nullable: true,
                    column_default: null,
                    display_name: 'Last Name'
                },
                {
                    column_name: 'email',
                    data_type: 'varchar',
                    is_nullable: true,
                    column_default: null,
                    display_name: 'Email'
                },
                {
                    column_name: 'is_converted',
                    data_type: 'boolean',
                    is_nullable: true,
                    column_default: 'false',
                    display_name: 'Is Converted'
                },
                {
                    column_name: 'converted_at',
                    data_type: 'timestamp with time zone',
                    is_nullable: true,
                    column_default: null,
                    display_name: 'Converted At'
                },
                {
                    column_name: 'convertedAt', // camelCase version for compatibility
                    data_type: 'timestamp with time zone',
                    is_nullable: true,
                    column_default: null,
                    display_name: 'Converted At'
                }
            ];

        case 'opportunities':
            return [
                ...commonFields,
                {
                    column_name: 'name',
                    data_type: 'varchar',
                    is_nullable: false,
                    column_default: null,
                    display_name: 'Name'
                },
                {
                    column_name: 'amount',
                    data_type: 'numeric',
                    is_nullable: true,
                    column_default: null,
                    display_name: 'Amount'
                },
                {
                    column_name: 'stage',
                    data_type: 'varchar',
                    is_nullable: true,
                    column_default: null,
                    display_name: 'Stage'
                },
                {
                    column_name: 'closed_at',
                    data_type: 'timestamp with time zone',
                    is_nullable: true,
                    column_default: null,
                    display_name: 'Closed At'
                }
            ];

        default:
            return commonFields;
    }
}