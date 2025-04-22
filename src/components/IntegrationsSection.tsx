import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export function IntegrationsSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });

    const integrationCategories = [
        {
            name: "Productivity Tools",
            logos: [
                { name: "Google Workspace", image: "/api/placeholder/100/40" },
                { name: "Microsoft 365", image: "/api/placeholder/100/40" },
                { name: "Slack", image: "/api/placeholder/100/40" },
                { name: "Asana", image: "/api/placeholder/100/40" },
                { name: "Notion", image: "/api/placeholder/100/40" },
                { name: "Trello", image: "/api/placeholder/100/40" }
            ]
        },
        {
            name: "Marketing Platforms",
            logos: [
                { name: "Mailchimp", image: "/api/placeholder/100/40" },
                { name: "HubSpot", image: "/api/placeholder/100/40" },
                { name: "Marketo", image: "/api/placeholder/100/40" },
                { name: "Salesforce Marketing Cloud", image: "/api/placeholder/100/40" },
                { name: "Klaviyo", image: "/api/placeholder/100/40" },
                { name: "Constant Contact", image: "/api/placeholder/100/40" }
            ]
        },
        {
            name: "Finance & Accounting",
            logos: [
                { name: "QuickBooks", image: "/api/placeholder/100/40" },
                { name: "Xero", image: "/api/placeholder/100/40" },
                { name: "FreshBooks", image: "/api/placeholder/100/40" },
                { name: "Stripe", image: "/api/placeholder/100/40" },
                { name: "PayPal", image: "/api/placeholder/100/40" },
                { name: "Square", image: "/api/placeholder/100/40" }
            ]
        }
    ];

    return (
        <section ref={ref} id="integrations" className="py-24 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-primary-950/50"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.6 }}
                        className="inline-block px-3 py-1 text-sm font-medium bg-primary-900/50 rounded-full text-primary-400 mb-4"
                    >
                        Seamless Connections
                    </motion.span>

                    <motion.h2
                        initial={{ opacity: 0, y: -20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-4xl md:text-5xl font-bold mb-6"
                    >
                        Powerful <span className="text-primary-400">Integrations</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="text-xl text-gray-300 max-w-3xl mx-auto"
                    >
                        Connect SimpliDone CRM with your favorite tools and platforms for a seamless workflow.
                    </motion.p>
                </div>

                <div className="space-y-16">
                    {integrationCategories.map((category, categoryIndex) => (
                        <div key={categoryIndex}>
                            <motion.h3
                                initial={{ opacity: 0 }}
                                animate={isInView ? { opacity: 1 } : {}}
                                transition={{ duration: 0.6, delay: 0.3 + categoryIndex * 0.1 }}
                                className="text-2xl font-bold mb-8 text-center"
                            >
                                {category.name}
                            </motion.h3>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.6, delay: 0.4 + categoryIndex * 0.1 }}
                                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6"
                            >
                                {category.logos.map((logo, logoIndex) => (
                                    <div
                                        key={logoIndex}
                                        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 flex items-center justify-center border border-gray-700/50 hover:border-primary-500/50 transition-all hover:shadow-lg hover:shadow-primary-500/10"
                                    >
                                        <img
                                            src={logo.image}
                                            alt={`${logo.name} logo`}
                                            className="max-h-10 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
                                        />
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="mt-16 text-center"
                >
                    <p className="text-gray-300 mb-6">
                        Don't see the integration you need? Our API makes it easy to connect to virtually any service.
                    </p>
                    <a
                        href="#contact"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
                    >
                        Request Custom Integration
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                        </svg>
                    </a>
                </motion.div>
            </div>
        </section>
    );
}