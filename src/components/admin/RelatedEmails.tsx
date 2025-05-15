// import { useEffect, useState } from 'react';
// import { supabase } from '../../lib/supabase';
// import { motion } from 'framer-motion';
// import { X, ChevronRight, Mail, Clock, User, List, ChevronDown, ChevronUp } from 'lucide-react';
// import { useLocation } from 'react-router-dom';

// type EmailMessage = {
//     id: string;
//     created_at: string;
//     subject: string;
//     user_id: string;
//     body_html?: string;
//     profile?: {
//         name: string;
//     };
// };

// type Props = {
//     recordId: string;
//     organizationId: string;
//     title?: string;
//     refreshKey?: number;
//     customerEmail?: string; // Optional prop for customer email
//     defaultExpanded?: boolean;
// };

// export function RelatedEmails({ recordId, organizationId, title = 'Emails', refreshKey, customerEmail,
//     defaultExpanded = false }: Props) {
//     const [emails, setEmails] = useState<EmailMessage[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
//     const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false);
//     const location = useLocation();
//     const [isExpanded, setIsExpanded] = useState(defaultExpanded);

//     // Check if we're in the customer view
//     const isCustomerView = location.pathname.includes('/admin/customers');

//     const fetchEmails = async () => {
//         if (!organizationId) return;

//         setLoading(true);

//         let query = supabase
//             .from('email_messages')
//             .select('id, created_at, subject, user_id, body_html, profile:profiles(name)')
//             .eq('organization_id', organizationId)
//             .in('status', ['sent', 'Received'])
//             .order('created_at', { ascending: false });

//         // Different query approach based on context
//         if (isCustomerView && customerEmail) {
//             // For customer view - check if customer email is in to_addresses array
//             query = query.contains('to_addresses', [customerEmail]);
//         } else {
//             // Standard approach for other views - filter by record_id
//             query = query.eq('record_id', recordId);
//         }

//         const { data, error } = await query;

//         if (error) {
//             console.error('Failed to fetch email messages:', error);
//         } else {
//             setEmails(data || []);
//         }
//         setLoading(false);
//     };

//     useEffect(() => {
//         if (organizationId && (recordId || customerEmail)) {
//             fetchEmails();
//         }
//     }, [recordId, organizationId, refreshKey, customerEmail]);

//     // Function to render an email item - reused in both views
//     const renderEmailItem = (email: EmailMessage) => (
//         <div
//             key={email.id}
//             className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150"
//             onClick={() => {
//                 setSelectedEmail(email);
//                 setIsViewAllModalOpen(false);
//             }}
//         >
//             <div className="flex items-start">
//                 <div className="flex-shrink-0 bg-blue-100 rounded-full p-1.5 mt-0.5">
//                     <Mail className="w-4 h-4 text-blue-600" />
//                 </div>
//                 <div className="ml-3 flex-1 min-w-0">
//                     <p className="text-sm font-medium text-gray-900 truncate">
//                         {email.subject || '(No subject)'}
//                     </p>
//                     <div className="flex items-center mt-1 text-xs text-gray-500 space-x-3">
//                         <span className="flex items-center">
//                             <User className="w-3 h-3 mr-1" />
//                             {email.profile?.name || 'Unknown'}
//                         </span>
//                         <span className="flex items-center">
//                             <Clock className="w-3 h-3 mr-1" />
//                             {new Date(email.created_at).toLocaleDateString()}
//                         </span>
//                     </div>
//                 </div>
//                 <ChevronRight className="w-5 h-5 text-gray-400" />
//             </div>
//         </div>
//     );

//     const toggleExpanded = () => {
//         setIsExpanded(!isExpanded);
//     };

//     return (
//         <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
//             <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
//                 <Mail className="w-4 h-4 text-gray-500 mr-2" />
//                 <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</h3>
//                 <span className="ml-auto bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
//                     {emails.length}
//                 </span>
//                 <button
//                     onClick={toggleExpanded}
//                     className="text-gray-500 hover:text-gray-700 focus:outline-none"
//                 >
//                     {isExpanded ? (
//                         <ChevronUp className="w-4 h-4" />
//                     ) : (
//                         <ChevronDown className="w-4 h-4" />
//                     )}
//                 </button>
//             </div>

//             {isExpanded && (
//                 <>

//                     {loading ? (
//                         <div className="p-4 flex items-center justify-center">
//                             <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
//                         </div>
//                     ) : emails.length === 0 ? (
//                         <div className="p-4 text-center text-sm text-gray-500">
//                             No emails found for this record.
//                         </div>
//                     ) : (
//                         <>
//                             <div className="divide-y divide-gray-200">
//                                 {/* Only show the first 5 emails */}
//                                 {emails.slice(0, 5).map(renderEmailItem)}
//                             </div>

//                             {/* "View All" button - only show if there are more than 5 emails */}
//                             {emails.length > 5 && (
//                                 <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
//                                     <button
//                                         onClick={() => setIsViewAllModalOpen(true)}
//                                         className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center"
//                                     >
//                                         <List className="w-4 h-4 mr-1" />
//                                         View All Emails ({emails.length})
//                                     </button>
//                                 </div>
//                             )}
//                         </>
//                     )}
//                 </>
//             )}

//             {/* View All Emails Modal */}
//             {isViewAllModalOpen && (
//                 <motion.div
//                     className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
//                     initial={{ opacity: 0 }}
//                     animate={{ opacity: 1 }}
//                     onClick={() => setIsViewAllModalOpen(false)}
//                 >
//                     <motion.div
//                         className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
//                         initial={{ scale: 0.95, opacity: 0 }}
//                         animate={{ scale: 1, opacity: 1 }}
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
//                             <div>
//                                 <h4 className="text-lg font-semibold text-gray-900">All Emails</h4>
//                                 <p className="text-sm text-gray-500 mt-1">
//                                     Showing all {emails.length} emails
//                                 </p>
//                             </div>
//                             <button
//                                 onClick={() => setIsViewAllModalOpen(false)}
//                                 className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
//                             >
//                                 <X className="w-5 h-5" />
//                             </button>
//                         </div>

//                         <div className="overflow-y-auto flex-1">
//                             <div className="divide-y divide-gray-200">
//                                 {emails.map(renderEmailItem)}
//                             </div>
//                         </div>

//                         <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
//                             <button
//                                 onClick={() => setIsViewAllModalOpen(false)}
//                                 className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
//                             >
//                                 Close
//                             </button>
//                         </div>
//                     </motion.div>
//                 </motion.div>
//             )}

//             {/* Modal for selected email */}
//             {selectedEmail && (
//                 <motion.div
//                     className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
//                     initial={{ opacity: 0 }}
//                     animate={{ opacity: 1 }}
//                     onClick={() => setSelectedEmail(null)}
//                 >
//                     <motion.div
//                         className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
//                         initial={{ scale: 0.95, opacity: 0 }}
//                         animate={{ scale: 1, opacity: 1 }}
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
//                             <div>
//                                 <h4 className="text-lg font-semibold text-gray-900">Email Details</h4>
//                                 <p className="text-sm text-gray-500 mt-1">{selectedEmail.subject}</p>
//                             </div>
//                             <button
//                                 onClick={() => setSelectedEmail(null)}
//                                 className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
//                             >
//                                 <X className="w-5 h-5" />
//                             </button>
//                         </div>

//                         <div className="p-6 overflow-y-auto flex-1">
//                             <div className="grid grid-cols-2 gap-4 mb-6">
//                                 <div>
//                                     <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sent By</p>
//                                     <p className="text-sm text-gray-900 mt-1">
//                                         {selectedEmail.profile?.name || 'Unknown'}
//                                     </p>
//                                 </div>
//                                 <div>
//                                     <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sent At</p>
//                                     <p className="text-sm text-gray-900 mt-1">
//                                         {new Date(selectedEmail.created_at).toLocaleString()}
//                                     </p>
//                                 </div>
//                             </div>

//                             <div className="border-t border-gray-200 pt-4">
//                                 <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Message</p>
//                                 <div
//                                     className="prose prose-sm max-w-none text-sm text-gray-800"
//                                     dangerouslySetInnerHTML={{ __html: selectedEmail.body_html || '<p>No message content</p>' }}
//                                 />
//                             </div>
//                         </div>

//                         <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
//                             <button
//                                 onClick={() => setSelectedEmail(null)}
//                                 className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
//                             >
//                                 Close
//                             </button>
//                         </div>
//                     </motion.div>
//                 </motion.div>
//             )}
//         </div>
//     );
// }



import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { X, ChevronRight, Mail, Clock, User, List, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';

type EmailMessage = {
    id: string;
    created_at: string;
    subject: string;
    user_id: string;
    body_html?: string;
    body_text?: string; // Added support for body_text field
    from_address?: string; // Added for sender info
    profile?: {
        name: string;
    };
};

type Props = {
    recordId: string;
    organizationId: string;
    title?: string;
    refreshKey?: number;
    customerEmail?: string; // Optional prop for customer email
    defaultExpanded?: boolean;
};

/**
 * Clean and format email content for display in the UI
 */
function formatEmailContent(content: string): string {
    if (!content) return '<p>No content available</p>';

    // Step 1: Remove email quote formatting
    let cleaned = content.replace(/^(&gt;|\s*>)+\s*/gm, '');

    // Step 2: Remove HTML styling attributes
    cleaned = cleaned.replace(/style="[^"]*"/g, '');
    cleaned = cleaned.replace(/class="[^"]*"/g, '');

    // Step 3: Remove email signature styling noise
    cleaned = cleaned.replace(/(\w+)="[^"]*"/g, '$1');
    cleaned = cleaned.replace(/(\w+)='[^']*'/g, '$1');

    // Step 4: Remove "Please keep subject line intact" boilerplate
    cleaned = cleaned.replace(/Please keep the subject line intact.*tracked\..*$/gm, '');
    cleaned = cleaned.replace(/Case Reference:.*$/gm, '');

    // Step 5: Remove yellow highlighting that might be in the content
    cleaned = cleaned.replace(/<span\s+style="background-color:.*?>(.*?)<\/span>/gi, '$1');

    // Step 6: Clean any remaining quoted-printable encoding artifacts
    cleaned = cleaned.replace(/=([0-9A-F]{2})/g, (match, p1) => {
        try {
            return String.fromCharCode(parseInt(p1, 16));
        } catch (e) {
            return match;
        }
    });

    // Step 7: Convert plain text email addresses to actual links
    cleaned = cleaned.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1">$1</a>');

    // Step 8: Add paragraph breaks for readability if content is plain text
    if (!cleaned.includes('<div') && !cleaned.includes('<p')) {
        cleaned = cleaned.split(/\n{2,}/).map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`).join('');
    }

    // Step 9: Add CSS to improve email display
    return `
    <div class="email-content">
      <style>
        .email-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
          line-height: 1.5;
          color: #333;
        }
        .email-content p {
          margin-bottom: 1em;
        }
        .email-content blockquote {
          border-left: 3px solid #e0e0e0;
          padding-left: 10px;
          margin-left: 10px;
          color: #555;
        }
        .email-content a {
          color: #3182ce;
          text-decoration: none;
        }
        .email-content a:hover {
          text-decoration: underline;
        }
      </style>
      ${cleaned}
    </div>
  `;
}

export function RelatedEmails({ recordId, organizationId, title = 'Emails', refreshKey, customerEmail,
    defaultExpanded = false }: Props) {
    const [emails, setEmails] = useState<EmailMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
    const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false);
    const location = useLocation();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    // Check if we're in the customer view
    const isCustomerView = location.pathname.includes('/admin/customers');

    const fetchEmails = async () => {
        if (!organizationId) return;

        setLoading(true);

        let query = supabase
            .from('email_messages')
            .select('id, created_at, subject, user_id, body_html, body_text, from_address, profile:profiles(name)')
            .eq('organization_id', organizationId)
            .in('status', ['sent', 'Received'])
            .order('created_at', { ascending: false });

        // Different query approach based on context
        if (isCustomerView && customerEmail) {
            // For customer view - check if customer email is in to_addresses array
            query = query.contains('to_addresses', [customerEmail]);
        } else {
            // Standard approach for other views - filter by record_id
            query = query.eq('record_id', recordId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Failed to fetch email messages:', error);
        } else {
            setEmails(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (organizationId && (recordId || customerEmail)) {
            fetchEmails();
        }
    }, [recordId, organizationId, refreshKey, customerEmail]);

    // Helper to extract sender name from email address
    const getSenderName = (emailAddress?: string): string => {
        if (!emailAddress) return 'Unknown';

        // Check if format is "Name <email>"
        const match = emailAddress.match(/^"?([^"<]+)"?\s+<.*>/);
        if (match) {
            return match[1].trim();
        }

        // Otherwise just return the email address
        return emailAddress;
    };

    // Function to render an email item - reused in both views
    const renderEmailItem = (email: EmailMessage) => (
        <div
            key={email.id}
            className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150"
            onClick={() => {
                setSelectedEmail(email);
                setIsViewAllModalOpen(false);
            }}
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
                            {email.profile?.name || getSenderName(email.from_address) || 'Unknown'}
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
    );

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    // Function to determine the best content to display
    const getBestEmailContent = (email: EmailMessage): string => {
        // First try using body_text if available, as it might be cleaner
        if (email.body_text && email.body_text.trim().length > 0) {
            return formatEmailContent(email.body_text);
        }

        // Fallback to body_html
        return formatEmailContent(email.body_html || '');
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
                <Mail className="w-4 h-4 text-gray-500 mr-2" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</h3>
                <span className="ml-auto bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {emails.length}
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
                    ) : emails.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                            No emails found for this record.
                        </div>
                    ) : (
                        <>
                            <div className="divide-y divide-gray-200">
                                {/* Only show the first 5 emails */}
                                {emails.slice(0, 5).map(renderEmailItem)}
                            </div>

                            {/* "View All" button - only show if there are more than 5 emails */}
                            {emails.length > 5 && (
                                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                                    <button
                                        onClick={() => setIsViewAllModalOpen(true)}
                                        className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center"
                                    >
                                        <List className="w-4 h-4 mr-1" />
                                        View All Emails ({emails.length})
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* View All Emails Modal */}
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
                                <h4 className="text-lg font-semibold text-gray-900">All Emails</h4>
                                <p className="text-sm text-gray-500 mt-1">
                                    Showing all {emails.length} emails
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
                                {emails.map(renderEmailItem)}
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
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">From</p>
                                    <p className="text-sm text-gray-900 mt-1">
                                        {getSenderName(selectedEmail.from_address) || selectedEmail.profile?.name || 'Unknown'}
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
                                    className="prose prose-sm max-w-none text-sm text-gray-800 email-viewer"
                                    dangerouslySetInnerHTML={{
                                        __html: getBestEmailContent(selectedEmail)
                                    }}
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