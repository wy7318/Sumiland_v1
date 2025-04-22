import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export function FeaturesHubSection() {
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [activePage, setActivePage] = useState(0); // 0 = first set, 1 = second set
    const ref = useRef(null);

    // Features data from your PDF
    const featureSets = [
        // First Set (Page 0)
        [
            {
                id: 'ai-capabilities',
                title: 'Future-Ready AI Capabilities',
                shortDesc: 'AI-powered tools and intelligent automation',
                description: 'Ongoing development of AI-powered tools and intelligent automation',
                benefits: 'As SimpliDones continues to expand our capabilities, customers will benefit from cutting-edge AI features that transform how you understand and engage with your customers. Our development pipeline includes predictive analytics that forecast customer behavior, automated insight generation that surfaces hidden opportunities, intelligent lead scoring that prioritizes your most promising prospects, and AI-assisted communication tools.'
            },
            {
                id: 'analytics-engine',
                title: 'Powerful Analytics Engine',
                shortDesc: 'Advanced data analysis with predictive capabilities',
                description: 'Advanced data analysis tools with predictive capabilities and actionable insights',
                benefits: 'SimpliDones\' core strength lies in our powerful analytics that transform raw customer data into strategic business intelligence. Make confident decisions based on comprehensive data analysis, trend identification, and predictive modeling. Our customers report 42% better forecasting accuracy and 37% faster identification of market opportunities compared to standard CRM reporting tools.'
            },
            {
                id: 'user-experience',
                title: 'Intuitive User Experience',
                shortDesc: 'Clean, modern interface with minimal learning curve',
                description: 'Clean, modern interface with minimal learning curve',
                benefits: 'Get your entire team up and running in hours, not weeks, with minimal training required. Our intuitive design means staff spend less time navigating software and more time engaging with customers. The simplified workflow reduces onboarding costs by an average of 60% compared to enterprise CRM systems, while increasing adoption rates across team members of all technical skill levels.'
            },
            {
                id: 'inclusive-pricing',
                title: 'All-Inclusive Pricing',
                shortDesc: 'Flat monthly rate with all features included',
                description: 'Flat $150/month for up to 20 users with all features included, with 20% discount on annual subscriptions',
                benefits: 'Predictable budgeting without the tiered pricing complexity of competitors. No need to pay per user or for premium features, allowing you to maximize your CRM investment. While competitors charge $65-125 per user monthly for comparable functionality, SimpliDones saves the average company over $15,000 annually while providing access to every feature regardless of team size.'
            },
            {
                id: 'infrastructure',
                title: 'Enterprise-Grade Infrastructure',
                shortDesc: 'Built on Supabase with generous resource allocations',
                description: 'Built on Supabase technology with generous resource allocations and flexible scaling',
                benefits: 'Access the reliability and performance typically reserved for enterprise customers at a fraction of the cost. Our platform supports up to 250,000 customer profiles, includes 200GB file storage, 10GB database capacity, and 500GB monthly bandwidth—resources that would cost thousands with traditional providers but are included in your flat monthly rate.'
            },
            {
                id: 'customizable',
                title: 'Customizable Without Coding',
                shortDesc: 'Drag-and-drop customization tools',
                description: 'Drag-and-drop customization tools for fields, forms, and workflows',
                benefits: 'Adapt the system to your specific business processes without expensive consultants or developers. Make changes on the fly as your business evolves. Teams report saving an average of $8,000 in custom development costs annually while maintaining a CRM that perfectly mirrors their unique business requirements and terminology.'
            }
        ],
        // Second Set (Page 1)
        [
            {
                id: 'mobile',
                title: 'Mobile Optimization',
                shortDesc: 'Full mobile apps for iOS and Android',
                description: 'Fully-featured mobile apps for iOS and Android',
                benefits: 'Access complete CRM functionality from anywhere, keeping your team productive whether in the office, working remotely, or meeting clients in the field. Field sales teams report 35% higher data entry compliance and 28% faster deal progression when using our mobile tools compared to desktop-only solutions.'
            },
            {
                id: 'integration',
                title: 'Integration Ecosystem',
                shortDesc: 'Connect with essential business tools',
                description: 'Growing network of integrations with focus on payment services and essential business tools',
                benefits: 'SimpliDones is actively developing connections with payment processors like Square and other critical business tools, allowing you to create a seamless workflow between your CRM and the other platforms you rely on. Eliminate data silos and manual data entry while maintaining a single source of truth for all customer information.'
            },
            {
                id: 'workflows',
                title: 'Automated Workflows',
                shortDesc: 'Visual workflow builder for repetitive tasks',
                description: 'Visual workflow builder to automate repetitive tasks',
                benefits: 'Increase efficiency and consistency while reducing human error. Free your team from mundane administrative work to focus on high-value customer interactions. Teams using our automation tools report handling 40% more customer inquiries without adding staff and reducing response times by an average of 72%.'
            },
            {
                id: 'security',
                title: 'Data Security & Compliance',
                shortDesc: 'Enterprise-grade security with daily backups',
                description: 'Enterprise-grade security protocols with daily backups',
                benefits: 'Protect sensitive customer information with confidence while maintaining compliance with data protection regulations. Our daily backups with 7-day retention provide peace of mind that your valuable customer data is protected against loss or corruption. Our security measures meet or exceed requirements for GDPR, CCPA, HIPAA, and other regulatory frameworks.'
            },
            {
                id: 'customer-view',
                title: 'Unified Customer View',
                shortDesc: '360-degree customer profiles across departments',
                description: '360-degree customer profiles with cross-department visibility',
                benefits: 'Eliminate communication gaps between sales, marketing, and customer service teams. Every team member sees the complete customer journey, ensuring consistent messaging and personalized experiences across all touchpoints. Companies implementing our unified view approach report 47% higher customer satisfaction scores and 29% increase in cross-selling success.'
            },
            {
                id: 'email',
                title: 'Email Integration',
                shortDesc: 'Seamless email tracking and analytics',
                description: 'Seamless email synchronization with engagement analytics',
                benefits: 'Never lose track of important customer communications. Automatically log all emails in customer records, track opens and clicks, and receive notifications when prospects engage with your content. Sales teams using our email tracking feature report 36% shorter sales cycles and 52% improvement in follow-up consistency.'
            }
        ]
    ];

    // Get current features to display
    const currentFeatures = featureSets[activePage];

    // Handle feature click
    const toggleFeature = (id) => {
        if (selectedFeature === id) {
            setSelectedFeature(null);
        } else {
            setSelectedFeature(id);
        }
    };

    // Pagination handlers
    const goToNextPage = () => {
        setActivePage(1);
    };

    const goToPrevPage = () => {
        setActivePage(0);
    };

    return (
        <section id="features" className="py-24 relative overflow-hidden bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-primary-600 mb-2">
                        Features of <span className="text-gray-900">SimpliDone CRM</span>
                    </h2>
                    <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
                        Explore our powerful features designed to transform your customer relationships and business operations
                    </p>
                </div>

                <div className="relative" style={{ height: '680px' }}>
                    {/* Central Circle - MADE LARGER */}
                    <div
                        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
                        style={{ width: '270px', height: '270px' }}
                    >
                        <div className="w-full h-full rounded-full bg-blue-50 border-4 border-primary-600 flex items-center justify-center shadow-lg">
                            <div className="text-center p-4">
                                <h3 className="text-4xl font-bold text-primary-800">Features of<br />SimpliDone CRM</h3>
                            </div>
                        </div>
                    </div>

                    {/* Feature Cards */}
                    <div className="absolute inset-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activePage}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="relative h-full w-full"
                            >
                                {currentFeatures.map((feature, index) => {
                                    // Calculate position in a circle (6 items)
                                    const angle = (index * (360 / 6)) * (Math.PI / 180);
                                    const radius = 220; // Adjusted for larger center circle

                                    // Calculate coordinates
                                    const top = 50 + 38 * Math.sin(angle);
                                    const left = 50 + 38 * Math.cos(angle);

                                    return (
                                        <div
                                            key={feature.id}
                                            className="absolute z-10"
                                            style={{
                                                top: `${top}%`,
                                                left: `${left}%`,
                                                transform: 'translate(-50%, -50%)',
                                            }}
                                        >
                                            {/* Feature Card - MADE LARGER */}
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{
                                                    duration: 0.5,
                                                    delay: index * 0.1,
                                                    type: "spring",
                                                    stiffness: 100
                                                }}
                                                whileHover={{
                                                    scale: 1.05,
                                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                                                }}
                                                onClick={() => toggleFeature(feature.id)}
                                                className="w-64 bg-white rounded-xl p-5 shadow-md border border-gray-200 hover:border-primary-500 transition-all cursor-pointer relative z-20"
                                            >
                                                <h4 className="text-xl font-bold text-primary-700 text-center mb-3">{feature.title}</h4>
                                                <p className="text-md text-gray-600 text-center">{feature.shortDesc}</p>
                                            </motion.div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Pagination Controls - MADE SMALLER */}
                    <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 flex items-center space-x-4 z-30">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={goToPrevPage}
                            disabled={activePage === 0}
                            className={`p-2 rounded-full ${activePage === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-primary-500 text-white shadow-md hover:bg-primary-600'
                                }`}
                            aria-label="Previous features"
                        >
                            <ChevronLeft size={18} />
                        </motion.button>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setActivePage(0)}
                                className={`w-3 h-3 rounded-full transition-colors ${activePage === 0 ? 'bg-primary-600' : 'bg-gray-300'}`}
                                aria-label="Page 1"
                            ></button>
                            <button
                                onClick={() => setActivePage(1)}
                                className={`w-3 h-3 rounded-full transition-colors ${activePage === 1 ? 'bg-primary-600' : 'bg-gray-300'}`}
                                aria-label="Page 2"
                            ></button>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={goToNextPage}
                            disabled={activePage === 1}
                            className={`p-2 rounded-full ${activePage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-primary-500 text-white shadow-md hover:bg-primary-600'
                                }`}
                            aria-label="Next features"
                        >
                            <ChevronRight size={18} />
                        </motion.button>
                    </div>
                </div>

                {/* Feature Detail Modal */}
                <AnimatePresence>
                    {selectedFeature && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                            onClick={() => setSelectedFeature(null)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className="bg-white rounded-xl max-w-lg w-full mx-4 p-6 shadow-2xl border-2 border-primary-500"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => setSelectedFeature(null)}
                                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                                >
                                    <X size={24} />
                                </button>

                                {featureSets.flat().filter(f => f.id === selectedFeature).map(feature => (
                                    <div key={feature.id}>
                                        <h3 className="text-2xl font-bold text-primary-700 mb-4">{feature.title}</h3>

                                        <div className="mb-5">
                                            <div className="inline-block bg-primary-100 text-primary-800 text-sm font-medium px-2.5 py-1 rounded mb-2">
                                                Feature
                                            </div>
                                            <p className="text-gray-700 mt-2">{feature.description}</p>
                                        </div>

                                        <div>
                                            <div className="inline-block bg-green-100 text-green-800 text-sm font-medium px-2.5 py-1 rounded mb-2">
                                                Benefit
                                            </div>
                                            <p className="text-gray-700 mt-2">{feature.benefits}</p>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}