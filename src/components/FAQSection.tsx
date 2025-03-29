import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItemProps {
    question: string;
    answer: string;
    isOpen: boolean;
    toggleOpen: () => void;
    category: string;
}

const FAQItem = ({ question, answer, isOpen, toggleOpen, category }: FAQItemProps) => {
    return (
        <div className="border-b border-gray-200 last:border-0">
            <button
                onClick={toggleOpen}
                className="flex justify-between items-center w-full py-5 px-4 text-left focus:outline-none group"
                aria-expanded={isOpen}
            >
                <div>
                    <span className="text-xs font-medium text-primary-500 block mb-1">{category}</span>
                    <h3 className="text-lg font-medium text-gray-800 group-hover:text-primary-600 transition-colors">{question}</h3>
                </div>
                <div className="flex-shrink-0 ml-2">
                    {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-primary-500" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                    )}
                </div>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-5 text-gray-600 prose prose-sm max-w-none">
                            {answer.split('\n').map((paragraph, index) => (
                                <p key={index} className="mb-3">{paragraph}</p>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export function FAQSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });
    const [activeCategory, setActiveCategory] = useState('all');
    const [openItems, setOpenItems] = useState<string[]>([]);

    const toggleItem = (id: string) => {
        setOpenItems(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    const faqData = [
        {
            category: "General Questions",
            questions: [
                {
                    id: "ai-features",
                    question: "I've heard Xelytics is developing AI features. What can we expect?",
                    answer: "Yes, AI-powered capabilities are a key focus of our development roadmap. While we can't share specific release dates, our AI innovation plans include predictive analytics to forecast customer behavior, automated insight generation to surface hidden opportunities, intelligent lead scoring to prioritize your most promising prospects, and AI-assisted communication tools to help your team respond more effectively. These features will be rolled out incrementally as they reach our quality standards, with existing customers gaining access at no additional cost as part of our commitment to continuous improvement."
                },
                {
                    id: "integrations-offer",
                    question: "What integrations does Xelytics currently offer?",
                    answer: "Xelytics is actively expanding our integration ecosystem, with a current focus on payment processors like Square and other essential business tools. Our development roadmap prioritizes connections with email platforms, calendar systems, document management tools, marketing automation platforms, communication tools, accounting software, e-commerce platforms, and support ticket systems. We welcome customer input on which integrations to prioritize next, as our goal is to create a seamless ecosystem that addresses your specific workflow needs."
                },
                {
                    id: "industry-specialization",
                    question: "Does Xelytics specialize in any particular industries?",
                    answer: "Xelytics is designed to serve businesses across all industries. Our flexible platform adapts to the specific needs of diverse sectors including professional services, manufacturing, retail, healthcare, non-profit, education, and more. The core CRM functionality - managing customer relationships, tracking sales, analyzing data - is universal, while our customization options allow you to tailor the system to your industry's unique requirements."
                },
                {
                    id: "pricing-comparison",
                    question: "How does your pricing compare to Salesforce and other competitors?",
                    answer: "Unlike Salesforce's complex tiered pricing that can cost hundreds of dollars per user per month for full functionality, Xelytics offers a simple, all-inclusive price of $150/month for up to 20 users. This includes all features with no hidden costs or add-ons, making our solution typically 80-90% more cost-effective for small to medium businesses. Our customers save an average of $15,000 annually compared to equivalent Salesforce implementations. We also offer a 20% discount for annual subscriptions, bringing the effective monthly cost down to just $120."
                },
                {
                    id: "business-size",
                    question: "What size business is your CRM best suited for?",
                    answer: "Our platform is specifically designed for small to medium businesses with up to 20 team members who need comprehensive CRM functionality without enterprise-level complexity. We're particularly well-suited for growing businesses that want powerful tools but can't justify the cost of traditional enterprise CRM systems. Our typical customers include professional service firms, e-commerce businesses, manufacturing companies, and non-profits with 5-20 employees."
                },
                {
                    id: "technical-expertise",
                    question: "Do I need technical expertise to implement your CRM?",
                    answer: "No. Our system is designed to be set up and customized without technical expertise. Most clients complete their initial setup within a day, and our step-by-step guided implementation process walks you through each stage. Of course, our support team is always available to help. We've designed every aspect of the user experience to be intuitive for team members of all technical skill levels."
                },
                {
                    id: "differentiation",
                    question: "What makes Xelytics different from other affordable CRMs?",
                    answer: "Unlike other budget-friendly options that limit features or charge per user, Xelytics provides enterprise-grade functionality and technical resources at a flat monthly rate. Our solution is built on Supabase technology, providing exceptional performance and security. We differentiate ourselves through our commitment to powerful analytics and actionable insights – a core strength that helps our customers make data-driven decisions. We also believe in simplicity without sacrificing power - you get all the capabilities of complex systems with none of the implementation headaches."
                },
                {
                    id: "implementation-time",
                    question: "How long does implementation typically take?",
                    answer: "Most customers are up and running within 1-3 days, depending on the complexity of their data and processes. Our guided implementation process includes data migration, user setup, and customization of key elements like sales stages and custom fields. Unlike enterprise CRMs that can take months to implement, our solution is designed for rapid deployment and immediate value."
                }
            ]
        },
        {
            category: "Features & Functionality",
            questions: [
                {
                    id: "import-data",
                    question: "Can I import my existing customer data?",
                    answer: "Absolutely. Our platform supports imports from CSV files, Excel spreadsheets, and direct migration from popular CRMs including Salesforce, HubSpot, and Zoho. Our data mapping tools help ensure your information transfers correctly, and our team can provide assistance with complex migrations. We've successfully migrated customer databases with over 200,000 contacts and their complete interaction histories."
                },
                {
                    id: "customization",
                    question: "How customizable is your CRM?",
                    answer: "Very. You can customize contact fields, sales stages, automation rules, email templates, reports, and dashboards without any coding knowledge. If you need more advanced customizations, our API allows for deeper integrations and modifications. We've designed the system to adapt to your business processes rather than forcing you to change how you work to fit our software."
                },
                {
                    id: "integrations",
                    question: "What integrations do you offer?",
                    answer: "We provide native integrations with popular business tools including Gmail, Outlook, Mailchimp, QuickBooks, Slack, Zoom, and major social media platforms. Our open API allows for custom integrations with virtually any system. Unlike competitors who charge extra for premium integrations, all of ours are included in the standard price. We add new integrations quarterly based on customer requests."
                },
                {
                    id: "offline-access",
                    question: "Can I use the system offline?",
                    answer: "Yes. Our mobile apps for iOS and Android include offline functionality that automatically syncs when connectivity is restored. This is particularly valuable for field sales teams or those working in areas with unreliable internet access. You can continue to access contact information, take notes, and even create new records while offline."
                },
                {
                    id: "email-marketing",
                    question: "How does your platform handle email marketing?",
                    answer: "Our system includes comprehensive email marketing tools that allow you to create, send, and track campaigns directly from within the CRM. You can segment your contacts based on any criteria in your database, use our template builder to create professional emails, and track performance with detailed analytics. For users with existing email marketing tools, we offer seamless integrations with popular platforms."
                }
            ]
        },
        {
            category: "Technical Questions",
            questions: [
                {
                    id: "technical-limitations",
                    question: "What are the technical limitations of your platform?",
                    answer: "Xelytics' $150/month plan supports up to 20 team members, 250,000 customer profiles, 200GB file storage, 10GB database storage, and 500GB monthly bandwidth. These generous allocations are designed to accommodate the needs of growing businesses. We offer flexible scaling options for all resources - additional user capacity, storage, and bandwidth can be purchased as your business grows. Our platform is designed to scale with your needs, from small teams to enterprise-level organizations."
                },
                {
                    id: "large-data",
                    question: "How does your platform handle large volumes of data?",
                    answer: "We've built our CRM on enterprise-grade infrastructure powered by Supabase technology. This gives you exceptional performance and reliability even with hundreds of thousands of customer records. Our system automatically optimizes database queries and file storage to maintain speed regardless of your data volume."
                },
                {
                    id: "security-measures",
                    question: "What security measures do you have in place?",
                    answer: "We implement enterprise-grade security including data encryption at rest and in transit, role-based access controls, two-factor authentication, IP restrictions, and regular security audits. All data is stored in SOC 2 compliant data centers with daily backups and 7-day retention. We're fully GDPR and CCPA compliant, and we conduct regular penetration testing to identify and address potential vulnerabilities."
                },
                {
                    id: "api-access",
                    question: "Do you offer an API for custom integrations?",
                    answer: "Yes. We provide a comprehensive RESTful API that allows for custom integrations with your existing systems. Our API documentation includes examples for common use cases, and our support team can assist with integration questions. Unlike many competitors, we don't charge extra for API access or limit the number of API calls."
                },
                {
                    id: "exceeding-allocations",
                    question: "What happens if we exceed our storage or bandwidth allocations?",
                    answer: "If you approach your allocation limits, Xelytics will notify you proactively. Additional resources can be added at competitive rates: $0.025/GB for additional file storage, $0.15/GB for additional database capacity, and $0.10/GB for additional bandwidth. We don't automatically charge for overages without your approval. Our flexible scaling approach means you only pay for the additional resources you need while maintaining the base plan's cost-effectiveness."
                }
            ]
        },
        {
            category: "Support & Onboarding",
            questions: [
                {
                    id: "support-provided",
                    question: "What kind of support do you provide?",
                    answer: "All clients receive unlimited access to our support team via chat, email, and phone during business hours. We also provide comprehensive documentation, video tutorials, and monthly live training webinars at no additional cost. Unlike competitors who reserve priority support for enterprise clients, all our customers receive the same high level of service."
                },
                {
                    id: "feature-requests",
                    question: "How do you handle feature requests and product improvements?",
                    answer: "We maintain a transparent product roadmap informed directly by customer feedback. Clients can submit feature requests through our portal, where other users can vote on and discuss ideas. We release updates monthly, with major feature releases quarterly. Many of our most popular features originated from customer suggestions."
                },
                {
                    id: "training",
                    question: "Do you offer training for new users?",
                    answer: "Yes. Initial onboarding includes training sessions for administrators and end users. We also provide role-specific video tutorials, step-by-step guides, and monthly live webinars covering both basic and advanced functionality. Custom training sessions are available upon request at no additional charge."
                },
                {
                    id: "trial-offer",
                    question: "Can I try Xelytics before I buy?",
                    answer: "Yes, we offer a fully-featured 14-day free trial with no credit card required. You'll have access to all features during the trial period and can import your own data to test the system with your actual business scenarios. We also offer a 30-day money-back guarantee after purchase, applicable to both monthly and annual subscriptions."
                },
                {
                    id: "data-cancellation",
                    question: "What happens to our data if we decide to cancel?",
                    answer: "We believe your data belongs to you. If you decide to cancel, we provide export tools that allow you to download all your information in standard formats compatible with most other systems. We retain your data for 30 days after cancellation to allow for potential reactivation before permanently deleting it from our servers."
                }
            ]
        }
    ];

    const filteredQuestions = activeCategory === 'all'
        ? faqData.flatMap(category => category.questions)
        : faqData.find(cat => cat.category === activeCategory)?.questions || [];

    return (
        <section ref={ref} id="faq" className="py-24 relative bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="text-center mb-12">
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.6 }}
                        className="inline-block px-3 py-1 text-sm font-medium bg-primary-100 text-primary-800 rounded-full mb-4"
                    >
                        Got Questions?
                    </motion.span>

                    <motion.h2
                        initial={{ opacity: 0, y: -20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
                    >
                        Frequently Asked <span className="text-primary-600">Questions</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="text-xl text-gray-600 max-w-3xl mx-auto mb-12"
                    >
                        Find answers to common questions about Xelytic CRM and how it can transform your business
                    </motion.p>
                </div>

                {/* Category Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="flex flex-wrap justify-center gap-2 mb-10"
                >
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === 'all'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        All Questions
                    </button>
                    {faqData.map((category) => (
                        <button
                            key={category.category}
                            onClick={() => setActiveCategory(category.category)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === category.category
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            {category.category}
                        </button>
                    ))}
                </motion.div>

                {/* FAQ Items */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden"
                >
                    <div className="divide-y divide-gray-200">
                        {filteredQuestions.map((item) => {
                            const category = faqData.find(cat =>
                                cat.questions.some(q => q.id === item.id)
                            )?.category || '';

                            return (
                                <FAQItem
                                    key={item.id}
                                    question={item.question}
                                    answer={item.answer}
                                    isOpen={openItems.includes(item.id)}
                                    toggleOpen={() => toggleItem(item.id)}
                                    category={category}
                                />
                            );
                        })}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.7 }}
                    className="mt-12 text-center"
                >
                    <p className="text-gray-600 mb-4">Don't see your question answered here?</p>
                    <a
                        href="#contact"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Contact Our Support Team
                    </a>
                </motion.div>
            </div>
        </section>
    );
}