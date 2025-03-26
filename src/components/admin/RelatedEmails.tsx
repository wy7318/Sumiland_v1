import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { X, ChevronRight, Mail, Clock, User } from 'lucide-react';

type EmailMessage = {
    id: string;
    created_at: string;
    subject: string;
    user_id: string;
    body_html?: string;
    profile?: {
        name: string;
    };
};

type Props = {
    recordId: string;
    organizationId: string;
    title?: string;
    refreshKey?: number;
};

export function RelatedEmails({ recordId, organizationId, title = 'Emails', refreshKey }: Props) {
    const [emails, setEmails] = useState<EmailMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);

    const fetchEmails = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('email_messages')
            .select('id, created_at, subject, user_id, body_html, profile:profiles(name)')
            .eq('record_id', recordId)
            .eq('organization_id', organizationId)
            .eq('status', 'sent')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch email messages:', error);
        } else {
            setEmails(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (recordId && organizationId) {
            fetchEmails();
        }
    }, [recordId, organizationId, refreshKey]);

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
                <Mail className="w-4 h-4 text-gray-500 mr-2" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</h3>
                <span className="ml-auto bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {emails.length}
                </span>
            </div>

            {loading ? (
                <div className="p-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
            ) : emails.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                    No emails found for this record.
                </div>
            ) : (
                <div className="divide-y divide-gray-200">
                    {emails.map(email => (
                        <div
                            key={email.id}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150"
                            onClick={() => setSelectedEmail(email)}
                        >
                            <div className="flex items-start">
                                <div className="flex-shrink-0 bg-blue-100 rounded-full p-1.5 mt-0.5">
                                    <Mail className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="ml-3 flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {email.subject || '(No subject)'}
                                    </p>
                                    <div className="flex items-center mt-1 text-xs text-gray-500 space-x-3">
                                        <span className="flex items-center">
                                            <User className="w-3 h-3 mr-1" />
                                            {email.profile?.name || 'Unknown'}
                                        </span>
                                        <span className="flex items-center">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {new Date(email.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for selected email */}
            {selectedEmail && (
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSelectedEmail(null)}
                >
                    <motion.div
                        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900">Email Details</h4>
                                <p className="text-sm text-gray-500 mt-1">{selectedEmail.subject}</p>
                            </div>
                            <button
                                onClick={() => setSelectedEmail(null)}
                                className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sent By</p>
                                    <p className="text-sm text-gray-900 mt-1">
                                        {selectedEmail.profile?.name || 'Unknown'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sent At</p>
                                    <p className="text-sm text-gray-900 mt-1">
                                        {new Date(selectedEmail.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Message</p>
                                <div
                                    className="prose prose-sm max-w-none text-sm text-gray-800"
                                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html || '<p>No message content</p>' }}
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setSelectedEmail(null)}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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