// FormulaFieldStatus.tsx
// Enhanced component to display available fields and loading states

import React, { useState } from 'react';
import { Loader, AlertCircle, Check, ChevronDown, ChevronUp, Info } from 'lucide-react';

type FormulaFieldStatusProps = {
    sampleData: any | null;
    isLoading: boolean;
    error: string | null;
    objectName: string;
};

export function FormulaFieldStatus({
    sampleData,
    isLoading,
    error,
    objectName
}: FormulaFieldStatusProps) {
    const [expanded, setExpanded] = useState(false);

    if (isLoading) {
        return (
            <div className="flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-md mb-4">
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                <span className="text-sm">Loading fields from {objectName}...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-3 py-2 bg-red-50 text-red-600 rounded-md mb-4">
                <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm font-medium">Error loading data</span>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="ml-auto p-1"
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {expanded && (
                    <div className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-32">
                        {error}
                    </div>
                )}
            </div>
        );
    }

    if (sampleData) {
        const fieldCount = Object.keys(sampleData).length;
        const dateFields = Object.entries(sampleData)
            .filter(([_, value]) =>
                value instanceof Date ||
                (typeof value === 'string' && !isNaN(Date.parse(value as string)))
            )
            .map(([key]) => key);

        return (
            <div className="px-3 py-2 bg-green-50 text-green-700 rounded-md mb-4">
                <div className="flex items-center">
                    <Check className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">
                        <span className="font-medium">{fieldCount} fields</span> loaded from {objectName} for testing
                    </span>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="ml-auto p-1"
                        title="View field details"
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {expanded && (
                    <div className="mt-2 text-xs">
                        <div className="mb-1 font-medium">Available Fields:</div>
                        <div className="bg-white p-2 rounded overflow-auto max-h-32 border border-green-200">
                            {Object.keys(sampleData).sort().map(field => {
                                const value = sampleData[field];
                                const isDate = value instanceof Date ||
                                    (typeof value === 'string' && !isNaN(Date.parse(value as string)));
                                const isNumber = typeof value === 'number' ||
                                    (typeof value === 'string' && !isNaN(Number(value)));

                                let displayValue = '';
                                if (value === null) {
                                    displayValue = 'null';
                                } else if (isDate) {
                                    displayValue = 'Date';
                                } else if (isNumber) {
                                    displayValue = 'Number';
                                } else if (typeof value === 'boolean') {
                                    displayValue = 'Boolean';
                                } else if (typeof value === 'string') {
                                    displayValue = 'Text';
                                } else {
                                    displayValue = typeof value;
                                }

                                return (
                                    <div key={field} className="mb-1 flex items-center">
                                        <span className="font-mono">{field}</span>
                                        <span className="ml-2 px-1.5 py-0.5 rounded text-gray-600 bg-gray-100 text-[10px]">
                                            {displayValue}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {dateFields.length > 0 && (
                            <div className="mt-2 flex items-start text-green-800">
                                <Info className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                <div>
                                    <span className="font-medium">Tip:</span> For date calculations, use these date fields: {dateFields.join(', ')}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center px-3 py-2 bg-yellow-50 text-yellow-700 rounded-md mb-4">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span className="text-sm">No sample data available from {objectName}. Formula testing may not work correctly.</span>
        </div>
    );
}