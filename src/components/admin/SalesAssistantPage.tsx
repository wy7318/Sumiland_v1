import React from 'react';
import { Zap, Sparkles, MessageSquare, CheckCircle, UserCheck, Store, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useOrganization } from '../../contexts/OrganizationContext';
import SalesAssistant from './SalesAssistant';

export function SalesAssistantPage() {
    const { selectedOrganization } = useOrganization();

    return (
        <div className="space-y-8 bg-gray-50 font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-700 to-violet-500 bg-clip-text text-transparent">
                        Sales Assistant
                    </h1>
                    <p className="text-gray-500 mt-1">AI-powered assistant to help you process sales interactions efficiently</p>
                </div>

                <div className="flex gap-3 items-center">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-yellow-600 to-violet-600 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:from-yellow-700 hover:to-violet-700"
                    >
                        <Zap className="w-4 h-4" />
                        <span>AI Features</span>
                    </motion.div>
                </div>
            </div>

            {/* Features Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-lg">Voice Notes</h3>
                    </div>
                    <p className="text-gray-600 text-sm">Record voice notes from customer interactions and let AI transcribe them.</p>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-lg">Data Extraction</h3>
                    </div>
                    <p className="text-gray-600 text-sm">Automatically extract orders, products, pricing and customer data from your notes.</p>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-3">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-lg">Smart Matching</h3>
                    </div>
                    <p className="text-gray-600 text-sm">Matches mentioned products and customers with your existing database records.</p>
                </div>
            </div>

            {/* Main Assistant Component */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 mr-3">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800">AI Sales Assistant</h2>
                </div>

                <div className="p-6">
                    {/* Render the SalesAssistant component */}
                    <SalesAssistant />
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">
                    <div className="flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
                        Note: AI suggestions are intended to assist but should be reviewed for accuracy before finalizing.
                    </div>
                </div>
            </div>
        </div>
    );
}