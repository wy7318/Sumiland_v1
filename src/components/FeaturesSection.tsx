import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Shield, Users, FileText, CreditCard } from 'lucide-react';

export function FeaturesSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });

    return (
        <section id="features" ref={ref} className="py-24 relative bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
                    {/* Left Column - Heading and CTA */}
                    <div className="md:col-span-5">
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={isInView ? { opacity: 1 } : {}}
                            transition={{ duration: 0.6 }}
                            className="text-sm uppercase font-medium text-primary-400 mb-3 block"
                        >
                            Features
                        </motion.span>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-4xl md:text-5xl font-bold text-white mb-6"
                        >
                            The blocks of a powerful platform
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-lg text-gray-300 mb-8"
                        >
                            Our sales team will get in touch to better understand your needs, and either help you with the sign-up process.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        >
                            <a
                                href="#contact"
                                className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                            >
                                Start for free
                            </a>
                        </motion.div>
                    </div>

                    {/* Right Column - Feature Blocks */}
                    <div className="md:col-span-7 relative">
                        {/* Background Elements */}
                        <div className="absolute inset-0 -z-10">
                            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-primary-500/5 to-transparent rounded-3xl"></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Feature Block 1 */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="bg-gray-800/50 p-6 rounded-xl border border-gray-700"
                            >
                                <div className="p-3 bg-primary-900/50 w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                                    <FileText className="text-primary-400 w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">Accounts</h3>
                                <p className="text-gray-400 text-sm">
                                    Manage an unlimited number of accounts in 150 currencies
                                </p>
                            </motion.div>

                            {/* Feature Block 2 */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.5, delay: 0.5 }}
                                className="bg-gray-800/50 p-6 rounded-xl border border-gray-700"
                            >
                                <div className="p-3 bg-primary-900/50 w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                                    <Shield className="text-primary-400 w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">Roles & Permissions</h3>
                                <p className="text-gray-400 text-sm">
                                    Full control over team member access, permissions and actions
                                </p>
                            </motion.div>

                            {/* Feature Block 3 */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.5, delay: 0.6 }}
                                className="bg-gray-800/50 p-6 rounded-xl border border-gray-700"
                            >
                                <div className="p-3 bg-primary-900/50 w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                                    <CreditCard className="text-primary-400 w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">Company cards</h3>
                                <p className="text-gray-400 text-sm">
                                    Issue physical or virtual company cards with spending restrictions
                                </p>
                            </motion.div>

                            {/* Feature Block 4 */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.5, delay: 0.7 }}
                                className="bg-gray-800/50 p-6 rounded-xl border border-gray-700"
                            >
                                <div className="p-3 bg-primary-900/50 w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                                    <Shield className="text-primary-400 w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">Security</h3>
                                <p className="text-gray-400 text-sm">
                                    Two-factor authentication and advanced security protocol
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Features/Benefits List */}
                <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* AI Capabilities */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        <div className="bg-primary-900/20 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mb-6">
                            <svg className="w-8 h-8 text-primary-400" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-4">Future-Ready AI Capabilities</h3>
                        <p className="text-gray-400">
                            Ongoing development of AI-powered tools that transform how you understand and engage with customers. Our development pipeline includes predictive analytics, automated insights, and intelligent lead scoring.
                        </p>
                    </motion.div>

                    {/* Analytics Engine */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        <div className="bg-primary-900/20 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mb-6">
                            <svg className="w-8 h-8 text-primary-400" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-4">Powerful Analytics Engine</h3>
                        <p className="text-gray-400">
                            Transform raw customer data into strategic business intelligence with 42% better forecasting accuracy and 37% faster identification of market opportunities compared to standard CRM reporting tools.
                        </p>
                    </motion.div>

                    {/* User Experience */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.5 }}
                    >
                        <div className="bg-primary-900/20 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mb-6">
                            <svg className="w-8 h-8 text-primary-400" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-4">Intuitive User Experience</h3>
                        <p className="text-gray-400">
                            Get your entire team up and running in hours, not weeks. Our simplified workflow reduces onboarding costs by an average of 60% compared to enterprise CRM systems.
                        </p>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="mt-16 text-center"
                >
                    <a
                        href="#services"
                        className="px-8 py-4 bg-primary-500 text-white rounded-lg text-lg font-medium hover:bg-primary-600 transition-colors inline-flex items-center gap-2"
                    >
                        Explore All Features
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                        </svg>
                    </a>
                </motion.div>
            </div>
        </section>
    );
}