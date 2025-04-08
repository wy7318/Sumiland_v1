import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { X, ChevronRight, FileText, Clock, List, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../lib/utils';
import { useLocation } from 'react-router-dom';

type Quote = {
    quote_id: string;
    quote_number: string;
    status: string;
    total_amount: number;
    created_at: string;
};

type Props = {
    recordId: string;
    organizationId: string;
    title?: string;
    refreshKey?: number;
    vendorId?: string;
    defaultExpanded?: boolean;
};

export function RelatedQuotes({
    recordId,
    organizationId,
    title = 'Quotes',
    refreshKey,
    vendorId,
    defaultExpanded = false
}: Props) {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false);
    const location = useLocation();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const isVendorView = location.pathname.includes('/admin/vendors');

    const fetchQuotes = async () => {
        if (!organizationId || !recordId) return;

        setLoading(true);

        let query = supabase
            .from('quote_hdr')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        // Different query approach based on context
        if (isVendorView && vendorId) {
            console.log('Yes Account');
            query = query.eq('vendor_id', vendorId)
        } else {
            console.log('No Account');
            query = query.eq('customer_id', recordId)
        }

        const { data, error } = await query;

        if (error) {
            console.error('Failed to fetch quotes:', error);
        } else {
            setQuotes(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (organizationId && (recordId || vendorId)) {
            fetchQuotes();
        }
    }, [recordId, organizationId, refreshKey, vendorId]);

    // Function to render a quote item - reused in both views
    const renderQuoteItem = (quote: Quote) => (
        <Link
            key={quote.quote_id}
            to={`/admin/quotes/${quote.quote_id}`}
            className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150 flex items-start"
        >
            <div className="flex-shrink-0 bg-blue-100 rounded-full p-1.5 mt-0.5 mr-3">
                <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                    {quote.quote_number}
                </p>
                <div className="flex items-center mt-1 text-xs text-gray-500 space-x-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {quote.status}
                    </span>
                    <span className="text-xs text-gray-500">
                        {formatCurrency(quote.total_amount)}
                    </span>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(quote.created_at).toLocaleDateString()}
                </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 ml-2" />
        </Link>
    );

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
                <FileText className="w-4 h-4 text-gray-500 mr-2" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</h3>
                <span className="ml-auto bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full mr-2">
                    {quotes.length}
                </span>
                <button
                    onClick={toggleExpanded}
                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </button>
            </div>

            {isExpanded && (
                <>
                    {loading ? (
                        <div className="p-4 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        </div>
                    ) : quotes.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                            No quotes found for this record.
                        </div>
                    ) : (
                        <>
                            <div className="divide-y divide-gray-200">
                                {/* Only show the first 5 quotes */}
                                {quotes.slice(0, 5).map(renderQuoteItem)}
                            </div>

                            {/* "View All" button - only show if there are more than 5 quotes */}
                            {quotes.length > 5 && (
                                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-center">
                                    <button
                                        onClick={() => setIsViewAllModalOpen(true)}
                                        className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center"
                                    >
                                        <List className="w-4 h-4 mr-1" />
                                        View All Quotes ({quotes.length})
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* View All Quotes Modal */}
            {isViewAllModalOpen && (
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setIsViewAllModalOpen(false)}
                >
                    <motion.div
                        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900">All Quotes</h4>
                                <p className="text-sm text-gray-500 mt-1">
                                    Showing all {quotes.length} quotes
                                </p>
                            </div>
                            <button
                                onClick={() => setIsViewAllModalOpen(false)}
                                className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            <div className="divide-y divide-gray-200">
                                {quotes.map(renderQuoteItem)}
                            </div>
                        </div>

                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setIsViewAllModalOpen(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}