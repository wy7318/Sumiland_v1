import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';

export function FeaturesHubSection() {
    const [activeTab, setActiveTab] = useState(0);
    const [expandedFeature, setExpandedFeature] = useState(null);

    // Features data
    const featureSets = [
        // First Set (Tab 0)
        [
            {
                id: 'ai-capabilities',
                icon: '✨',
                title: 'Future-Ready AI Capabilities',
                shortDesc: 'AI-powered tools and intelligent automation',
                description: 'Ongoing development of AI-powered tools and intelligent automation',
                benefits: 'As SimpliDone continues to expand our capabilities, customers will benefit from cutting-edge AI features that transform how you understand and engage with your customers. Our development pipeline includes predictive analytics that forecast customer behavior, automated insight generation that surfaces hidden opportunities, intelligent lead scoring that prioritizes your most promising prospects, and AI-assisted communication tools.'
            },
            {
                id: 'analytics-engine',
                icon: '📊',
                title: 'Powerful Analytics Engine',
                shortDesc: 'Advanced data analysis with predictive capabilities',
                description: 'Advanced data analysis tools with predictive capabilities and actionable insights',
                benefits: 'SimpliDone\'s core strength lies in our powerful analytics that transform raw customer data into strategic business intelligence. Make confident decisions based on comprehensive data analysis, trend identification, and predictive modeling. Our customers report 42% better forecasting accuracy and 37% faster identification of market opportunities compared to standard CRM reporting tools.'
            },
            {
                id: 'user-experience',
                icon: '👥',
                title: 'Intuitive User Experience',
                shortDesc: 'Clean, modern interface with minimal learning curve',
                description: 'Clean, modern interface with minimal learning curve',
                benefits: 'Get your entire team up and running in hours, not weeks, with minimal training required. Our intuitive design means staff spend less time navigating software and more time engaging with customers. The simplified workflow reduces onboarding costs by an average of 60% compared to enterprise CRM systems, while increasing adoption rates across team members of all technical skill levels.'
            },
            {
                id: 'inclusive-pricing',
                icon: '💰',
                title: 'All-Inclusive Pricing',
                shortDesc: 'Flat monthly rate with all features included',
                description: 'Flat $150/month for up to 20 users with all features included, with 20% discount on annual subscriptions',
                benefits: 'Predictable budgeting without the tiered pricing complexity of competitors. No need to pay per user or for premium features, allowing you to maximize your CRM investment. While competitors charge $65-125 per user monthly for comparable functionality, SimpliDone saves the average company over $15,000 annually while providing access to every feature regardless of team size.'
            },
            {
                id: 'infrastructure',
                icon: '🏗️',
                title: 'Enterprise-Grade Infrastructure',
                shortDesc: 'Built on Supabase with generous resource allocations',
                description: 'Built on Supabase technology with generous resource allocations and flexible scaling',
                benefits: 'Access the reliability and performance typically reserved for enterprise customers at a fraction of the cost. Our platform supports up to 250,000 customer profiles, includes 200GB file storage, 10GB database capacity, and 500GB monthly bandwidth—resources that would cost thousands with traditional providers but are included in your flat monthly rate.'
            },
            {
                id: 'customizable',
                icon: '🔧',
                title: 'Customizable Without Coding',
                shortDesc: 'Drag-and-drop customization tools',
                description: 'Drag-and-drop customization tools for fields, forms, and workflows',
                benefits: 'Adapt the system to your specific business processes without expensive consultants or developers. Make changes on the fly as your business evolves. Teams report saving an average of $8,000 in custom development costs annually while maintaining a CRM that perfectly mirrors their unique business requirements and terminology.'
            }
        ],
        // Second Set (Tab 1)
        [
            {
                id: 'mobile',
                icon: '📱',
                title: 'Mobile Optimization',
                shortDesc: 'Full mobile apps for iOS and Android',
                description: 'Fully-featured mobile apps for iOS and Android',
                benefits: 'Access complete CRM functionality from anywhere, keeping your team productive whether in the office, working remotely, or meeting clients in the field. Field sales teams report 35% higher data entry compliance and 28% faster deal progression when using our mobile tools compared to desktop-only solutions.'
            },
            {
                id: 'integration',
                icon: '🔄',
                title: 'Integration Ecosystem',
                shortDesc: 'Connect with essential business tools',
                description: 'Growing network of integrations with focus on payment services and essential business tools',
                benefits: 'SimpliDone is actively developing connections with payment processors like Square and other critical business tools, allowing you to create a seamless workflow between your CRM and the other platforms you rely on. Eliminate data silos and manual data entry while maintaining a single source of truth for all customer information.'
            },
            {
                id: 'workflows',
                icon: '⚙️',
                title: 'Automated Workflows',
                shortDesc: 'Visual workflow builder for repetitive tasks',
                description: 'Visual workflow builder to automate repetitive tasks',
                benefits: 'Increase efficiency and consistency while reducing human error. Free your team from mundane administrative work to focus on high-value customer interactions. Teams using our automation tools report handling 40% more customer inquiries without adding staff and reducing response times by an average of 72%.'
            },
            {
                id: 'security',
                icon: '🔒',
                title: 'Data Security & Compliance',
                shortDesc: 'Enterprise-grade security with daily backups',
                description: 'Enterprise-grade security protocols with daily backups',
                benefits: 'Protect sensitive customer information with confidence while maintaining compliance with data protection regulations. Our daily backups with 7-day retention provide peace of mind that your valuable customer data is protected against loss or corruption. Our security measures meet or exceed requirements for GDPR, CCPA, HIPAA, and other regulatory frameworks.'
            },
            {
                id: 'customer-view',
                icon: '👁️',
                title: 'Unified Customer View',
                shortDesc: '360-degree customer profiles across departments',
                description: '360-degree customer profiles with cross-department visibility',
                benefits: 'Eliminate communication gaps between sales, marketing, and customer service teams. Every team member sees the complete customer journey, ensuring consistent messaging and personalized experiences across all touchpoints. Companies implementing our unified view approach report 47% higher customer satisfaction scores and 29% increase in cross-selling success.'
            },
            {
                id: 'email',
                icon: '✉️',
                title: 'Email Integration',
                shortDesc: 'Seamless email tracking and analytics',
                description: 'Seamless email synchronization with engagement analytics',
                benefits: 'Never lose track of important customer communications. Automatically log all emails in customer records, track opens and clicks, and receive notifications when prospects engage with your content. Sales teams using our email tracking feature report 36% shorter sales cycles and 52% improvement in follow-up consistency.'
            }
        ]
    ];

    // Tab labels
    const tabLabels = ["Core Features", "Integration & Automation"];

    // Toggle expanded feature
    const toggleFeature = (id) => {
        setExpandedFeature(expandedFeature === id ? null : id);
    };

    return (
        <section id="features" className="py-20 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-gradient-to-b from-white to-gray-50 z-0"></div>
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary-50 to-transparent z-0"></div>

            {/* Decorative elements */}
            <div className="absolute -right-64 top-20 w-96 h-96 rounded-full bg-primary-100 blur-3xl opacity-30 z-0"></div>
            <div className="absolute -left-64 bottom-20 w-96 h-96 rounded-full bg-blue-100 blur-3xl opacity-30 z-0"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="inline-block"
                    >
                        <span className="bg-primary-100 text-primary-800 text-sm font-medium px-3 py-1 rounded-full">
                            Powerful Features
                        </span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-4xl font-bold mt-4 mb-4"
                    >
                        <span className="bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
                            SimpliDone CRM
                        </span>{" "}
                        <span className="text-gray-900">Features</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-xl text-gray-600 max-w-3xl mx-auto"
                    >
                        Explore our powerful tools designed to transform your customer relationships
                        and streamline business operations
                    </motion.p>
                </div>

                {/* Tab Navigation */}
                <div className="mb-12">
                    <div className="flex justify-center space-x-2 mb-8 overflow-x-auto pb-2">
                        {tabLabels.map((label, index) => (
                            <motion.button
                                key={index}
                                whileHover={{ y: -2 }}
                                whileTap={{ y: 0 }}
                                onClick={() => setActiveTab(index)}
                                className={`px-6 py-3 rounded-full font-medium text-sm transition-all duration-200 flex items-center ${activeTab === index
                                        ? "bg-primary-600 text-white shadow-lg shadow-primary-500/30"
                                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                                    }`}
                            >
                                {label}
                                {activeTab === index && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="ml-2 bg-white rounded-full w-2 h-2"
                                    />
                                )}
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Features Grid Layout */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        {featureSets[activeTab].map((feature, index) => (
                            <div key={feature.id}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className="h-full"
                                >
                                    <div
                                        className={`h-full bg-white rounded-xl overflow-hidden border transition-all duration-300 ${expandedFeature === feature.id
                                                ? "border-primary-500 shadow-xl shadow-primary-500/10"
                                                : "border-gray-200 shadow-md hover:shadow-lg hover:border-primary-300"
                                            }`}
                                    >
                                        {/* Feature Card Header */}
                                        <div
                                            onClick={() => toggleFeature(feature.id)}
                                            className="p-6 cursor-pointer flex justify-between items-start h-36"
                                        >
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary-50 rounded-lg text-2xl mr-4">{feature.icon}</div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                                                        {feature.title}
                                                    </h3>
                                                    <p className="text-gray-600 line-clamp-2">{feature.shortDesc}</p>
                                                </div>
                                            </div>
                                            <button className="flex-shrink-0 mt-1 text-primary-500 hover:text-primary-700 transition-colors">
                                                {expandedFeature === feature.id ? (
                                                    <ChevronDown size={20} />
                                                ) : (
                                                    <Plus size={20} />
                                                )}
                                            </button>
                                        </div>

                                        {/* Expandable Content */}
                                        <AnimatePresence>
                                            {expandedFeature === feature.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                                                        <div className="mb-4">
                                                            <div className="inline-block bg-primary-50 text-primary-800 text-xs font-semibold px-2.5 py-1 rounded-md mb-2">
                                                                FEATURE DETAILS
                                                            </div>
                                                            <p className="text-gray-700">{feature.description}</p>
                                                        </div>

                                                        <div>
                                                            <div className="inline-block bg-green-50 text-green-800 text-xs font-semibold px-2.5 py-1 rounded-md mb-2">
                                                                KEY BENEFITS
                                                            </div>
                                                            <p className="text-gray-700">{feature.benefits}</p>
                                                        </div>

                                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                                            <button className="group text-primary-600 text-sm font-medium flex items-center hover:text-primary-800 transition-colors">
                                                                Learn more
                                                                <ChevronRight size={16} className="ml-1 group-hover:ml-2 transition-all" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            </div>
                        ))}
                    </motion.div>
                </AnimatePresence>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="mt-16 text-center"
                >
                    <a
                        href="#contact"
                        className="inline-flex items-center justify-center px-8 py-4 rounded-lg text-white text-lg font-medium bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 shadow-lg shadow-primary-500/20 transition-all hover:shadow-xl hover:shadow-primary-500/30"
                    >
                        Explore All Features
                    </a>
                </motion.div>
            </div>
        </section>
    );
}