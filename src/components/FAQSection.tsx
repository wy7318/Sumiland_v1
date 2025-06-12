import { useState, useRef, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MessageCircle, ArrowRight } from 'lucide-react';

const FAQItem = ({ question, answer, isOpen, toggleOpen, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="border-b border-gray-200 last:border-0"
        >
            <button
                onClick={toggleOpen}
                className="flex justify-between items-center w-full py-6 text-left focus:outline-none group hover:bg-gray-50 px-6 transition-colors"
                aria-expanded={isOpen}
            >
                <h3 className="text-lg font-medium text-black group-hover:text-gray-700 transition-colors pr-8">
                    {question}
                </h3>
                <div className="flex-shrink-0 transition-transform duration-200">
                    {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
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
                        <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                            {answer.split('\n').map((paragraph, idx) => (
                                <p key={idx} className="mb-3 last:mb-0">{paragraph}</p>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export function FAQSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });
    const [faqs, setFaqs] = useState([]);
    const [activeCategory, setActiveCategory] = useState('General');
    const [openItems, setOpenItems] = useState([]);

    // Fallback static FAQs in case database isn't available
    const staticFAQs = [
        {
            id: 1,
            category: 'General',
            question: 'What is SimpliDone?',
            answer: 'SimpliDone is a comprehensive business management platform that combines CRM, inventory management, service desk, and restaurant operations into one unified solution.'
        },
        {
            id: 2,
            category: 'General',
            question: 'How much does SimpliDone cost?',
            answer: 'SimpliDone costs $170/month or $125/month when billed annually (27% savings). This includes up to 20 users, all features, and unlimited support.'
        },
        {
            id: 3,
            category: 'General',
            question: 'Is there a free trial?',
            answer: 'Yes! We offer a 14-day free trial with full access to all features. No credit card required to start.'
        },
        {
            id: 4,
            category: 'General',
            question: 'Can I migrate my existing data?',
            answer: 'Absolutely. Our team provides free data migration assistance from any existing CRM, spreadsheets, or business management system.'
        },
        {
            id: 5,
            category: 'Features',
            question: 'What clouds/modules are included?',
            answer: 'All plans include Simply-Sales (CRM), Simply-Service (support desk), Simply-Inventory (warehouse management), and Simply-Restaurant (for restaurant businesses). You get everything in one platform.'
        },
        {
            id: 6,
            category: 'Features',
            question: 'Does SimpliDone integrate with email?',
            answer: 'Yes, we have native integration with Gmail and Outlook. Track all email communications automatically within customer records.'
        },
        {
            id: 7,
            category: 'Features',
            question: 'Is there mobile access?',
            answer: 'Yes, SimpliDone includes full-featured mobile apps for iOS and Android, plus a responsive web interface that works on any device.'
        },
        {
            id: 8,
            category: 'Technical',
            question: 'What are the storage limits?',
            answer: 'Every plan includes 250,000 customer profiles, 200GB file storage, 10GB database capacity, and 500GB monthly bandwidth.'
        },
        {
            id: 9,
            category: 'Technical',
            question: 'How secure is my data?',
            answer: 'We use enterprise-grade security with daily backups, 7-day retention, and compliance with GDPR, CCPA, and other data protection regulations.'
        },
        {
            id: 10,
            category: 'Support',
            question: 'What support do you provide?',
            answer: 'All plans include 24/7 email support, guided implementation, personalized onboarding, and access to our knowledge base and training materials.'
        }
    ];

    const categories = ['General', 'Features', 'Technical', 'Support'];

    const toggleItem = (id) => {
        setOpenItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    useEffect(() => {
        const fetchFAQs = async () => {
            try {
                // If you have supabase integration, uncomment this:
                // const { data, error } = await supabase
                //     .from('faq')
                //     .select('*')
                //     .eq('is_active', true)
                //     .order('sort_order', { ascending: true });

                // if (error) throw error;
                // setFaqs(data || staticFAQs);

                // For now, use static FAQs
                setFaqs(staticFAQs);
            } catch (error) {
                console.error('Error fetching FAQs:', error);
                setFaqs(staticFAQs);
            }
        };

        fetchFAQs();
    }, []);

    const displayedFaqs = faqs.filter(f => f.category === activeCategory);

    const scrollToContact = () => {
        const contactSection = document.getElementById('contact');
        if (contactSection) {
            const offset = 100;
            const elementPosition = contactSection.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    return (
        <section ref={ref} id="faq" className="py-24 relative overflow-hidden bg-white">
            {/* Subtle Background Pattern */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTU2LDE2MywxNzUsMC4xKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />
            </div>

            <div className="max-w-4xl mx-auto px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6 }}
                        className="text-5xl md:text-6xl font-bold text-black mb-6"
                    >
                        Questions?
                        <br />
                        We have answers.
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-xl text-gray-600 max-w-2xl mx-auto font-light"
                    >
                        Find answers to common questions about SimpliDone's business management platform.
                    </motion.p>
                </div>

                {/* Simple Category Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="flex justify-center mb-12"
                >
                    <div className="flex items-center p-1 bg-gray-100 rounded-full">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${activeCategory === cat
                                        ? 'bg-black text-white'
                                        : 'text-gray-600 hover:text-black'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* FAQ List */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="mb-16"
                >
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeCategory}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {displayedFaqs.map((item, index) => (
                                    <FAQItem
                                        key={item.id}
                                        question={item.question}
                                        answer={item.answer}
                                        isOpen={openItems.includes(item.id)}
                                        toggleOpen={() => toggleItem(item.id)}
                                        index={index}
                                    />
                                ))}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Contact CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-center"
                >
                    <div className="bg-black rounded-2xl p-12 shadow-xl">
                        <h3 className="text-3xl font-bold text-white mb-4">
                            Still need help?
                        </h3>
                        <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                            Our support team is ready to answer any questions about SimpliDone.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={scrollToContact}
                                className="group bg-white text-black px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-100 transition-colors flex items-center gap-2"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Contact Support
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={scrollToContact}
                                className="border border-gray-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:border-gray-400 transition-colors"
                            >
                                Schedule Demo
                            </button>
                        </div>
                        <p className="text-gray-400 text-sm mt-4">
                            24/7 email support • Free data migration • Personal onboarding
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}