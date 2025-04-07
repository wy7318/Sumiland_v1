import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertCircle, Sparkles, Bot, Copy, ChevronDown, ChevronUp, Minimize2, Maximize2, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import 'react-quill/dist/quill.snow.css';
import ReactQuill from 'react-quill';
import { useGoogleLogin } from '@react-oauth/google';
import { getEmailConfig, connectGmail, saveEmailConfig, sendEmail } from '../../lib/email';
import { generateContent } from '../../services/aiService';

// Define fallback models in case OPENAI_MODELS is not available
const AI_MODELS = {
    GPT_3_5_TURBO: 'gpt-3.5-turbo',
    GPT_4: 'gpt-4'
};

// Try to import OPENAI_MODELS, but use fallback if not available
let OPENAI_MODELS;
try {
    // Dynamic import to avoid build errors
    OPENAI_MODELS = require('../../services/aiService').OPENAI_MODELS;
} catch (error) {
    console.warn('OPENAI_MODELS not found in aiService, using fallback models');
    OPENAI_MODELS = AI_MODELS;
}

type Props = {
    to: string;
    onClose: () => void;
    onSuccess: () => void;
    caseTitle?: string;
    orgId?: string;
    caseId?: string;
    isVisible: boolean; // New prop to control visibility
    onMinimize: () => void; // New prop for minimizing
    onMaximize: () => void; // New prop for maximizing
};

const modules = {
    toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link', 'image'],
        ['clean'],
    ],
};

const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align',
    'link', 'image',
];

// Email templates for AI suggestions
const emailTemplates = [
    {
        name: 'Follow Up',
        prompt: 'Write a professional follow-up email that asks for status updates and offers assistance.'
    },
    {
        name: 'Status Update',
        prompt: 'Write a concise status update email that outlines current progress and next steps.'
    },
    {
        name: 'Thank You',
        prompt: 'Write a warm thank you email expressing appreciation for the recipient\'s time and help.'
    },
    {
        name: 'Introduction',
        prompt: 'Write a professional introduction email that clearly explains who I am and why I\'m reaching out.'
    },
    {
        name: 'Request',
        prompt: 'Write a polite email requesting information or assistance with a clear call to action.'
    }
];

export function FoldableEmailModal({
    to,
    onClose,
    onSuccess,
    caseTitle,
    orgId,
    caseId,
    isVisible,
    onMinimize,
    onMaximize
}: Props) {
    const { user } = useAuth();
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [subject, setSubject] = useState(caseTitle ? `[${caseTitle}]` : '');
    const [toAddress, setToAddress] = useState(to);
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [showCcBcc, setShowCcBcc] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // AI assistance state
    const [showAiAssistant, setShowAiAssistant] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');
    const [aiTarget, setAiTarget] = useState<'subject' | 'body'>('body');
    const [aiTone, setAiTone] = useState('professional');
    // Always use GPT-3.5 Turbo by default and don't allow changing it
    const aiModel = OPENAI_MODELS.GPT_3_5_TURBO;
    const quillRef = useRef<any>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Set dirty state when content changes
    useEffect(() => {
        if (body || subject !== (caseTitle ? `[${caseTitle}]` : '') || toAddress !== to || cc || bcc) {
            setIsDirty(true);
        }
    }, [body, subject, toAddress, cc, bcc, caseTitle, to]);

    // Handle click outside for minimizing instead of closing
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(event.target as Node) && isVisible) {
                // Instead of closing, we minimize
                onMinimize();
            }
        }

        // Only add the listener if the modal is visible and maximized
        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVisible, onMinimize]);

    const googleLogin = useGoogleLogin({
        scope: 'https://www.googleapis.com/auth/gmail.send',
        onSuccess: async (tokenResponse) => {
            if (!user) return;
            const config = await connectGmail(tokenResponse);
            const { error: saveError } = await saveEmailConfig(user.id, config);

            console.log('[Reauth] Saving config:', config);

            if (saveError) {
                console.error('[Reauth] Failed to save config:', saveError);
                setError('Failed to re-authenticate Gmail');
                setLoading(false);
                return;
            } else {
                // Try sending email again
                console.log('caseId : ' + caseId);
                try {
                    await sendEmail(user.id, toAddress, subject, body, cc, bcc, orgId, caseId);
                    onSuccess();
                    resetForm();
                } catch (retryErr) {
                    setError('Still failed after re-auth: ' + retryErr.message);
                }
            }
            setLoading(false);
        },
        onError: () => {
            setError('Gmail login failed');
            setLoading(false);
        },
    });

    const resetForm = () => {
        setBody('');
        setSubject(caseTitle ? `[${caseTitle}]` : '');
        setToAddress(to);
        setCc('');
        setBcc('');
        setShowCcBcc(false);
        setIsDirty(false);
        setShowAiAssistant(false);
        setAiPrompt('');
        setGeneratedContent('');
    };

    const handleCloseWithConfirmation = () => {
        if (isDirty) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close this email?')) {
                resetForm();
                onClose();
            }
        } else {
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            const config = await getEmailConfig(user.id);

            console.log('config : ' + config);

            if (!config || Date.now() >= config.expiresAt) {
                // Token expired or not available — reauthenticate
                alert('Email token expired. Re-authenticating Gmail...');
                googleLogin(); // this will handle reconnect and retry
                return;
            }

            // Token is good — send email
            await sendEmail(user.id, toAddress, subject, body, cc, bcc, orgId, caseId);

            onSuccess();
            resetForm();
        } catch (err) {
            console.error('Error sending email:', err);
            setError(err instanceof Error ? err.message : 'Failed to send email');
            setLoading(false);
        }
    };

    const handleTemplateSelect = (prompt: string) => {
        setAiPrompt(prompt);
    };

    // Function to copy content to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            // Optional: Show a temporary "copied" message
            const tempError = error;
            setError('Copied to clipboard!');
            setTimeout(() => {
                setError(tempError);
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };

    // Helper function to clean AI-generated content
    const cleanAiContent = (content: string): string => {
        // Remove common AI response patterns like "Certainly!" or "Here's an..."
        let cleaned = content.replace(/^(Certainly!|Sure!|Here's|Here is|I'd be happy to|I would be happy to|I've created|I have created).*?(:|\.)\s*/i, '');

        // Remove any HTML doctype, html, head tags
        cleaned = cleaned.replace(/<\!DOCTYPE.*?>|<html.*?>|<\/html>|<head>.*?<\/head>|<body.*?>|<\/body>/gi, '');

        // Remove any meta tags
        cleaned = cleaned.replace(/<meta.*?>/gi, '');

        // Remove any script tags and their content
        cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        // For subject lines, remove any HTML completely
        if (aiTarget === 'subject') {
            cleaned = cleaned.replace(/<[^>]*>/g, '').replace(/^["'\s]+|["'\s]+$/g, '');
        }

        return cleaned.trim();
    };

    // Extract subject line from body content if present
    const extractSubjectFromBody = (bodyContent: string): { subject: string | null, cleanedBody: string } => {
        // Check for common subject line patterns in the body
        const subjectPattern = /^(?:Subject:?|re:?)\s*(.+?)(?:\n|\r\n?|$)/i;
        const match = bodyContent.match(subjectPattern);

        if (match) {
            // Found a subject line, extract it and clean the body
            const subject = match[1].trim();
            const cleanedBody = bodyContent.replace(subjectPattern, '').trim();
            return { subject, cleanedBody };
        }

        return { subject: null, cleanedBody: bodyContent };
    };

    const generateEmailContent = async () => {
        if (!aiPrompt.trim()) {
            setError('Please enter a prompt or select a template');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setAiGenerating(true);
        setError(null);

        try {
            // Create context-aware prompt
            let contextPrompt = aiPrompt;

            // Add context about the case if available
            if (caseTitle) {
                contextPrompt = `${contextPrompt}\n\nThis email is regarding: ${caseTitle}`;
            }

            // Different instruction based on target (subject or body)
            if (aiTarget === 'subject') {
                contextPrompt = `${contextPrompt}\n\nGenerate ONLY a concise and effective email subject line. Do not include any introductory phrases or explanations. Just output the subject line directly. Do not use any HTML.`;
            } else {
                contextPrompt = `${contextPrompt}\n\nGenerate the email body directly without any introductory phrases like "Here's" or "Certainly!". Do not include any HTML doctype, html, head, or meta tags. Only include the actual formatted content that would go in an email body using simple formatting like <p>, <strong>, <em>, <ul>, <li> tags.`;
            }

            const response = await generateContent({
                prompt: contextPrompt,
                tone: aiTone,
                contentLength: aiTarget === 'subject' ? 'short' : 'medium',
                contentType: 'email',
                model: aiModel
            });

            if (response.error) {
                setError(response.error);
            } else {
                // Clean the response
                const cleanedContent = cleanAiContent(response.content);
                setGeneratedContent(cleanedContent);
            }
        } catch (err) {
            setError('Failed to generate content. Please try again.');
            console.error('AI generation error:', err);
        } finally {
            setAiGenerating(false);
        }
    };

    const useGeneratedContent = () => {
        if (aiTarget === 'subject') {
            // For subject, use the cleaned content
            setSubject(generatedContent);
        } else {
            // For body content, check if there's a subject line to extract
            const { subject, cleanedBody } = extractSubjectFromBody(generatedContent);

            // If a subject was found in the body, use it (unless subject is already set)
            if (subject && (!subject || subject === (caseTitle ? `[${caseTitle}]` : ''))) {
                setSubject(subject);
            }

            // Use the body content (with subject line removed if there was one)
            setBody(cleanedBody);
        }

        // Close the AI assistant
        setShowAiAssistant(false);
        setGeneratedContent('');
        setAiPrompt('');
    };

    const suggestImprovement = async () => {
        if (!body.trim()) {
            setError('Please write some content first before requesting improvements');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setAiGenerating(true);
        setError(null);
        setAiTarget('body');

        try {
            const response = await generateContent({
                prompt: `Improve this email to make it more engaging, professional, and effective. Respond with ONLY the improved email, no introductory phrases or explanations:\n\n${body}`,
                tone: aiTone,
                contentLength: 'medium',
                contentType: 'email',
                model: aiModel
            });

            if (response.error) {
                setError(response.error);
            } else {
                // Clean the response
                const cleanedContent = cleanAiContent(response.content);
                setGeneratedContent(cleanedContent);
                setShowAiAssistant(true);
            }
        } catch (err) {
            setError('Failed to improve content. Please try again.');
            console.error('AI improvement error:', err);
        } finally {
            setAiGenerating(false);
        }
    };

    const generateSubjectFromBody = async () => {
        if (!body.trim()) {
            setError('Please write some email content first');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setAiGenerating(true);
        setError(null);
        setAiTarget('subject');

        try {
            const response = await generateContent({
                prompt: `Generate a concise, effective subject line for this email. Respond with ONLY the subject line text, no introductory phrases or explanatory text:\n\n${body}`,
                tone: aiTone,
                contentLength: 'short',
                contentType: 'email',
                model: aiModel
            });

            if (response.error) {
                setError(response.error);
            } else {
                // Clean up the subject line - already handled by cleanAiContent
                const cleanSubject = cleanAiContent(response.content);

                setSubject(cleanSubject);
                setAiGenerating(false);
                // Don't show the assistant for subject generation
                setShowAiAssistant(false);
            }
        } catch (err) {
            setError('Failed to generate subject. Please try again.');
            console.error('AI subject generation error:', err);
            setAiGenerating(false);
        }
    };

    // Minimized view at the bottom of screen
    const renderMinimizedView = () => (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 z-40 w-72"
        >
            <div className="p-3 cursor-pointer hover:bg-gray-50" onClick={onMaximize}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center">
                        <Mail className="w-5 h-5 text-primary-600 mr-2" />
                        <div className="truncate font-medium">
                            {subject || "New Email"}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMaximize();
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCloseWithConfirmation();
                            }}
                            className="text-gray-400 hover:text-red-600 p-1 ml-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="text-xs text-gray-500 truncate mt-1">
                    To: {toAddress}
                </div>
            </div>
        </motion.div>
    );

    // Maximized view (full email modal)
    const renderMaximizedView = () => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => e.stopPropagation()} // Prevent clicks from propagating to document
        >
            <motion.div
                ref={modalRef}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Send Email</h2>
                    <div className="flex space-x-2">
                        <button
                            onClick={onMinimize}
                            className="text-gray-400 hover:text-gray-500"
                            type="button"
                            title="Minimize"
                        >
                            <Minimize2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleCloseWithConfirmation}
                            className="text-gray-400 hover:text-gray-500"
                            type="button"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* TO */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                        <input
                            type="email"
                            value={toAddress}
                            onChange={(e) => setToAddress(e.target.value)}
                            className="w-full px-4 py-2 bg-white rounded-lg border border-gray-300"
                            required
                        />
                    </div>

                    {/* Show/hide CC/BCC */}
                    <div className="text-sm text-primary-600 hover:underline cursor-pointer mb-2" onClick={() => setShowCcBcc(!showCcBcc)}>
                        {showCcBcc ? 'Hide CC/BCC' : 'Add CC/BCC'}
                    </div>

                    {showCcBcc && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CC</label>
                                <input
                                    type="email"
                                    value={cc}
                                    onChange={(e) => setCc(e.target.value)}
                                    className="w-full px-4 py-2 bg-white rounded-lg border border-gray-300"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">BCC</label>
                                <input
                                    type="email"
                                    value={bcc}
                                    onChange={(e) => setBcc(e.target.value)}
                                    className="w-full px-4 py-2 bg-white rounded-lg border border-gray-300"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subject
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                            required
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Message
                            </label>

                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    onClick={suggestImprovement}
                                    disabled={aiGenerating || !body.trim()}
                                    className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center disabled:opacity-50"
                                >
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Improve
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowAiAssistant(true)}
                                    className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center"
                                >
                                    <Bot className="h-3 w-3 mr-1" />
                                    AI Assistant
                                </button>
                            </div>
                        </div>

                        <div className="rounded-lg overflow-hidden border border-gray-300">
                            <ReactQuill
                                theme="snow"
                                value={body}
                                onChange={setBody}
                                modules={modules}
                                formats={formats}
                                className="h-[200px] overflow-y-auto"
                                ref={quillRef}
                            />
                        </div>
                    </div>

                    {/* AI Email Assistant */}
                    {showAiAssistant && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold text-blue-800 flex items-center">
                                    <Bot className="w-4 h-4 mr-1 text-blue-600" />
                                    AI Email Assistant
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowAiAssistant(false)}
                                    className="text-blue-500 hover:text-blue-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="mb-3">
                                <label className="block text-xs font-medium text-blue-700 mb-1">
                                    What would you like to generate?
                                </label>
                                <div className="flex space-x-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setAiTarget('subject')}
                                        className={`px-2 py-1 text-xs rounded-full ${aiTarget === 'subject'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-blue-600 border border-blue-300'
                                            }`}
                                    >
                                        Subject Line
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAiTarget('body')}
                                        className={`px-2 py-1 text-xs rounded-full ${aiTarget === 'body'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-blue-600 border border-blue-300'
                                            }`}
                                    >
                                        Email Body
                                    </button>
                                </div>

                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder={`Describe what you want in your ${aiTarget === 'subject' ? 'subject line' : 'email'}`}
                                    className="w-full p-2 text-sm border border-blue-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-2"
                                    rows={2}
                                />

                                <div className="flex flex-wrap gap-1 mb-2">
                                    {emailTemplates.map((template, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => handleTemplateSelect(template.prompt)}
                                            className="px-2 py-1 text-xs bg-white border border-blue-300 rounded-full text-blue-700 hover:bg-blue-50"
                                        >
                                            {template.name}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center mb-2">
                                    <span className="text-xs text-blue-700 mr-2">Tone:</span>
                                    <select
                                        value={aiTone}
                                        onChange={(e) => setAiTone(e.target.value)}
                                        className="text-xs p-1 border border-blue-300 rounded bg-white text-blue-700"
                                    >
                                        <option value="professional">Professional</option>
                                        <option value="friendly">Friendly</option>
                                        <option value="formal">Formal</option>
                                        <option value="casual">Casual</option>
                                        <option value="persuasive">Persuasive</option>
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={generateEmailContent}
                                    disabled={aiGenerating || !aiPrompt.trim()}
                                    className="w-full flex justify-center items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Sparkles className="w-3 h-3 mr-2" />
                                    {aiGenerating ? 'Generating...' : 'Generate'}
                                </button>
                            </div>

                            {generatedContent && (
                                <div className="mt-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium text-blue-700">Generated {aiTarget === 'subject' ? 'Subject' : 'Email'}</span>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(generatedContent)}
                                            className="text-xs text-blue-600 flex items-center"
                                        >
                                            <Copy className="w-3 h-3 mr-1" />
                                            Copy
                                        </button>
                                    </div>

                                    <div className="p-2 bg-white rounded border border-blue-200 text-sm text-gray-800 max-h-40 overflow-y-auto">
                                        {aiTarget === 'subject' ? (
                                            <p>{generatedContent}</p>
                                        ) : (
                                            <div dangerouslySetInnerHTML={{ __html: generatedContent }} />
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={useGeneratedContent}
                                        className="mt-2 w-full flex justify-center items-center px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        Use This {aiTarget === 'subject' ? 'Subject' : 'Content'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={handleCloseWithConfirmation}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {loading ? 'Sending...' : 'Send Email'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );

    return (
        <AnimatePresence mode="wait">
            {isVisible && (
                <>
                    {renderMaximizedView()}
                </>
            )}
            {!isVisible && isDirty && (
                <>
                    {renderMinimizedView()}
                </>
            )}
        </AnimatePresence>
    );
}