import React, { useState } from 'react';
import { Bot, Sparkles, X, CheckCheck, Copy, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { generateContent } from '../../services/aiService';

interface AIContentGeneratorProps {
    onContentGenerated: (content: string) => void;
    existingContent?: string;
    existingTitle?: string;
}

export const AIContentGenerator: React.FC<AIContentGeneratorProps> = ({
    onContentGenerated,
    existingContent = '',
    existingTitle = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [generatedContent, setGeneratedContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [tone, setTone] = useState('professional');
    const [contentLength, setContentLength] = useState('medium');
    const [contentType, setContentType] = useState('blog');

    // Predefined prompts for quick selection
    const predefinedPrompts = [
        { name: 'Introduction', prompt: 'Write an engaging introduction for this blog post.' },
        { name: 'Expand', prompt: 'Expand on the existing content with more details and examples.' },
        { name: 'Conclusion', prompt: 'Write a conclusion that summarizes the key points.' },
        { name: 'SEO Friendly', prompt: 'Rewrite to be more SEO friendly while maintaining the message.' },
        { name: 'Convert to List', prompt: 'Convert this content into a bulleted list format.' },
    ];

    const generateContentFromAI = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }

        setIsGenerating(true);
        setError('');

        try {
            // Call our AI service that integrates with Supabase Edge Functions
            const response = await generateContent({
                prompt,
                title: existingTitle,
                existingContent: existingContent,
                tone,
                contentLength,
                contentType
            });

            if (response.error) {
                setError(response.error);
            } else {
                setGeneratedContent(response.content);
            }
        } catch (err) {
            setError('Failed to generate content. Please try again.');
            console.error('AI generation error:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUseContent = () => {
        onContentGenerated(generatedContent);
        setIsOpen(false);
        setGeneratedContent('');
        setPrompt('');
    };

    const handlePredefinedPrompt = (promptText: string) => {
        setPrompt(promptText);
    };

    const toggleAdvancedOptions = () => {
        setShowAdvancedOptions(!showAdvancedOptions);
    };

    return (
        <div className="relative mb-4">
            {!isOpen ? (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
                >
                    <Sparkles className="w-4 h-4 mr-2 text-blue-500" />
                    AI Content Assistant
                </button>
            ) : (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold flex items-center">
                                <Bot className="w-5 h-5 mr-2 text-blue-500" />
                                AI Content Generator
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                What kind of content would you like to generate?
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="E.g., Write an introduction about artificial intelligence trends in 2025"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                rows={3}
                            />
                        </div>

                        <div className="mb-4">
                            <div className="flex flex-wrap gap-2">
                                {predefinedPrompts.map((item, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handlePredefinedPrompt(item.prompt)}
                                        className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200"
                                    >
                                        {item.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <button
                                type="button"
                                onClick={toggleAdvancedOptions}
                                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                            >
                                {showAdvancedOptions ? (
                                    <ChevronUp className="w-4 h-4 mr-1" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 mr-1" />
                                )}
                                Advanced Options
                            </button>

                            {showAdvancedOptions && (
                                <div className="mt-2 p-3 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">
                                            Tone
                                        </label>
                                        <select
                                            value={tone}
                                            onChange={(e) => setTone(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            <option value="professional">Professional</option>
                                            <option value="casual">Casual</option>
                                            <option value="friendly">Friendly</option>
                                            <option value="authoritative">Authoritative</option>
                                            <option value="educational">Educational</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">
                                            Length
                                        </label>
                                        <select
                                            value={contentLength}
                                            onChange={(e) => setContentLength(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            <option value="short">Short (150 words)</option>
                                            <option value="medium">Medium (300 words)</option>
                                            <option value="long">Long (500+ words)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700">
                                            Content Type
                                        </label>
                                        <select
                                            value={contentType}
                                            onChange={(e) => setContentType(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            <option value="blog">Blog Post</option>
                                            <option value="article">Article</option>
                                            <option value="tutorial">Tutorial</option>
                                            <option value="review">Review</option>
                                            <option value="howto">How-To Guide</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg flex items-start">
                                <AlertCircle className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex justify-between mb-4">
                            <button
                                type="button"
                                onClick={generateContentFromAI}
                                disabled={isGenerating || !prompt.trim()}
                                className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                {isGenerating ? 'Generating...' : 'Generate Content'}
                            </button>
                        </div>

                        {generatedContent && (
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium text-gray-700">Generated Content</h4>
                                    <button
                                        type="button"
                                        onClick={() => navigator.clipboard.writeText(generatedContent)}
                                        className="flex items-center p-1 text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        <Copy className="w-3 h-3 mr-1" />
                                        Copy
                                    </button>
                                </div>
                                <div className="p-3 max-h-60 overflow-y-auto bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-800 whitespace-pre-wrap">
                                        {generatedContent}
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleUseContent}
                                        className="flex items-center px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none"
                                    >
                                        <CheckCheck className="w-4 h-4 mr-2" />
                                        Use This Content
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};