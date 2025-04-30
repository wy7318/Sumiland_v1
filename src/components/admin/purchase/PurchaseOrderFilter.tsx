import { useState } from 'react';
import { motion } from 'framer-motion';
import { Filter, X, Check } from 'lucide-react';

export const PurchaseOrderFilter = ({ onApplyFilters }) => {
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        status: [],
        dateRange: {
            start: '',
            end: ''
        },
        vendorId: '',
        minAmount: '',
        maxAmount: ''
    });

    const statusOptions = [
        { value: 'draft', label: 'Draft' },
        { value: 'submitted', label: 'Submitted' },
        { value: 'approved', label: 'Approved' },
        { value: 'partially_received', label: 'Partially Received' },
        { value: 'fully_received', label: 'Fully Received' },
        { value: 'cancelled', label: 'Cancelled' }
    ];

    const toggleStatus = (status) => {
        if (filters.status.includes(status)) {
            setFilters({
                ...filters,
                status: filters.status.filter(s => s !== status)
            });
        } else {
            setFilters({
                ...filters,
                status: [...filters.status, status]
            });
        }
    };

    const handleDateChange = (field, value) => {
        setFilters({
            ...filters,
            dateRange: {
                ...filters.dateRange,
                [field]: value
            }
        });
    };

    const handleInputChange = (field, value) => {
        setFilters({
            ...filters,
            [field]: value
        });
    };

    const applyFilters = () => {
        onApplyFilters(filters);
        setShowFilters(false);
    };

    const clearFilters = () => {
        setFilters({
            status: [],
            dateRange: {
                start: '',
                end: ''
            },
            vendorId: '',
            minAmount: '',
            maxAmount: ''
        });
        onApplyFilters({});
    };

    return (
        <div className="relative mb-4">
            <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
                <Filter className="w-4 h-4 mr-2" />
                Advanced Filters
                {(filters.status.length > 0 || filters.dateRange.start || filters.dateRange.end ||
                    filters.vendorId || filters.minAmount || filters.maxAmount) && (
                        <span className="ml-2 w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                            {filters.status.length +
                                (filters.dateRange.start ? 1 : 0) +
                                (filters.vendorId ? 1 : 0) +
                                (filters.minAmount || filters.maxAmount ? 1 : 0)}
                        </span>
                    )}
            </button>

            {showFilters && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-10 mt-2 w-80 bg-white rounded-lg shadow-lg p-4 border border-gray-200"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                        <button
                            onClick={() => setShowFilters(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Status Filter */}
                    <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                        <div className="space-y-2">
                            {statusOptions.map(option => (
                                <label key={option.value} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={filters.status.includes(option.value)}
                                        onChange={() => toggleStatus(option.value)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Order Date</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-gray-500">From</label>
                                <input
                                    type="date"
                                    value={filters.dateRange.start}
                                    onChange={(e) => handleDateChange('start', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md p-1 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">To</label>
                                <input
                                    type="date"
                                    value={filters.dateRange.end}
                                    onChange={(e) => handleDateChange('end', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md p-1 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Amount Range */}
                    <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Amount Range</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-gray-500">Min</label>
                                <input
                                    type="number"
                                    value={filters.minAmount}
                                    onChange={(e) => handleInputChange('minAmount', e.target.value)}
                                    placeholder="0.00"
                                    className="w-full border border-gray-300 rounded-md p-1 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Max</label>
                                <input
                                    type="number"
                                    value={filters.maxAmount}
                                    onChange={(e) => handleInputChange('maxAmount', e.target.value)}
                                    placeholder="0.00"
                                    className="w-full border border-gray-300 rounded-md p-1 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between">
                        <button
                            onClick={clearFilters}
                            className="text-sm text-gray-600 hover:text-gray-900"
                        >
                            Clear filters
                        </button>

                        <button
                            onClick={applyFilters}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
                        >
                            <Check className="w-4 h-4 mr-1" />
                            Apply
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
};