import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { X, ChevronRight, MessageSquare, Clock, List, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

type Case = {
    id: string;
    title: string;
    type: string;
    sub_type: string | null;
    status: string;
    description: string;
    created_at: string;
};

type Props = {
    recordId: string;
    organizationId: string;
    title?: string;
    refreshKey?: number;
    defaultExpanded?: boolean;
};

export function RelatedCases({
    recordId,
    organizationId,
    title = 'Cases',
    refreshKey,
    defaultExpanded = false
}: Props) {
    const [cases, setCases] = useState<Case[]>([]);
    const [loading, setLoading] = useState(true);
    const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const fetchCases = async () => {
        if (!organizationId || !recordId) return;

        setLoading(true);

        const { data, error } = await supabase
            .from('cases')
            .select('*')
            .eq('contact_id', recordId)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch cases:', error);
        } else {
            setCases(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (organizationId && recordId) {
            fetchCases();
        }
    }, [recordId, organizationId, refreshKey]);

    // Function to render a case item - reused in both views
    const renderCaseItem = (case_: Case) => (
        <Link
            key={case_.id}
            to={`/admin/cases/${case_.id}`}
            className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150 flex items-start"
        >
            <div className="flex-shrink-0 bg-blue-100 rounded-full p-1.5 mt-0.5 mr-3">
                <MessageSquare className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                    {case_.title}
                </p>
                <div className="flex items-center mt-1 text-xs text-gray-500 space-x-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {case_.status}
                    </span>
                    <span className="text-xs text-gray-500">
                        {case_.type}
                    </span>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(case_.created_at).toLocaleDateString()}
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
                <MessageSquare className="w-4 h-4 text-gray-500 mr-2" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</h3>
                <span className="ml-auto bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full mr-2">
                    {cases.length}
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
                    ) : cases.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                            No cases found for this record.
                        </div>
                    ) : (
                        <>
                            <div className="divide-y divide-gray-200">
                                {/* Only show the first 5 cases */}
                                {cases.slice(0, 5).map(renderCaseItem)}
                            </div>

                            {/* "View All" button - only show if there are more than 5 cases */}
                            {cases.length > 5 && (
                                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-center">
                                    <button
                                        onClick={() => setIsViewAllModalOpen(true)}
                                        className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center"
                                    >
                                        <List className="w-4 h-4 mr-1" />
                                        View All Cases ({cases.length})
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* View All Cases Modal */}
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
                                <h4 className="text-lg font-semibold text-gray-900">All Cases</h4>
                                <p className="text-sm text-gray-500 mt-1">
                                    Showing all {cases.length} cases
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
                                {cases.map(renderCaseItem)}
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