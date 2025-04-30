import { useState, useRef, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MessageCircle, FileQuestion, Settings, CreditCard, HelpCircle, Users, Server, Shield, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

// Map category names to icons
const categoryIcons = {
    "General": <HelpCircle className="w-4 h-4" />,
    "Account": <Users className="w-4 h-4" />,
    "Billing": <CreditCard className="w-4 h-4" />,
    "Technical": <Server className="w-4 h-4" />,
    "Security": <Shield className="w-4 h-4" />,
    "Support": <MessageCircle className="w-4 h-4" />,
    "Features": <Settings className="w-4 h-4" />,
    "Getting Started": <Clock className="w-4 h-4" />
};

// Default icon if category doesn't match
const defaultIcon = <FileQuestion className="w-4 h-4" />;

const FAQItem = ({ question, answer, isOpen, toggleOpen, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`border-b border-gray-100 last:border-0 overflow-hidden ${isOpen ? 'bg-gray-50/50' : 'hover:bg-gray-50/30'} transition-colors duration-200`}
        >
            <button
                onClick={toggleOpen}
                className="flex justify-between items-center w-full py-5 px-6 text-left focus:outline-none group"
                aria-expanded={isOpen}
            >
                <h3 className="text-lg font-medium text-gray-800 group-hover:text-primary-600 transition-colors pr-8">{question}</h3>
                <div className={`flex-shrink-0 rounded-full p-2 transition-all duration-200 ${isOpen ? 'bg-primary-100 text-primary-600' : 'text-gray-400 group-hover:text-primary-500'}`}>
                    {isOpen ? (
                        <ChevronUp className="w-5 h-5" />
                    ) : (
                        <ChevronDown className="w-5 h-5" />
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
                        <div className="px-6 pb-6 text-gray-600 prose prose-sm max-w-none">
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
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('');
    const [openItems, setOpenItems] = useState([]);
    const navigate = useNavigate();

    const toggleItem = (id) => {
        setOpenItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    useEffect(() => {
        const fetchFAQs = async () => {
            const { data, error } = await supabase
                .from('faq')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) {
                console.error('Error fetching FAQs:', error);
                return;
            }

            setFaqs(data);
            const cats = [...new Set(data.map(f => f.category))];
            setCategories(cats);
            setActiveCategory(cats[0] || '');
        };

        fetchFAQs();
    }, []);

    const displayedFaqs = faqs.filter(f => f.category === activeCategory).slice(0, 5);

    return (
        <section ref={ref} id="faq" className="py-24 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-gradient-to-b from-white to-gray-50 z-0"></div>

            {/* Decorative elements */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500 to-transparent"></div>
            <div className="absolute -right-64 top-1/3 w-96 h-96 rounded-full bg-blue-50 blur-3xl opacity-30 z-0"></div>
            <div className="absolute -left-64 bottom-1/3 w-96 h-96 rounded-full bg-primary-50 blur-3xl opacity-30 z-0"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.5 }}
                        className="inline-block"
                    >
                        <span className="bg-primary-50 text-primary-800 text-sm font-medium px-3 py-1 rounded-full">
                            Knowledge Base
                        </span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-4xl font-bold mt-4 mb-4"
                    >
                        <span className="text-gray-900">Frequently Asked </span>
                        <span className="bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
                            Questions
                        </span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-xl text-gray-600 max-w-3xl mx-auto"
                    >
                        Find answers to common questions about SimpliDone's comprehensive CRM and inventory management solution
                    </motion.p>
                </div>

                {/* Category Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-wrap justify-center gap-3 mb-10 px-4"
                >
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeCategory === cat
                                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <span className={activeCategory === cat ? 'text-white' : 'text-primary-500'}>
                                {categoryIcons[cat] || defaultIcon}
                            </span>
                            {cat}
                        </button>
                    ))}
                </motion.div>

                {/* FAQ List */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="max-w-4xl mx-auto"
                >
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="divide-y divide-gray-100">
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
                        </div>

                        {faqs.filter(f => f.category === activeCategory).length > 5 && (
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                                <button
                                    onClick={() => navigate('/faq')}
                                    className="w-full text-center text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center gap-2 group"
                                >
                                    <span>View more questions</span>
                                    <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.7 }}
                    className="mt-16 text-center"
                >
                    <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl p-8 shadow-xl max-w-3xl mx-auto">
                        <h3 className="text-2xl font-bold text-white mb-3">Still have questions?</h3>
                        <p className="text-white/90 mb-6 max-w-2xl mx-auto">
                            Our support team is ready to help you with any questions about our platform
                        </p>

                        <a
                            href="#contact"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-primary-700 rounded-lg font-medium hover:bg-white/90 transition-colors shadow-lg"
                        >
                            <MessageCircle className="w-5 h-5" />
                            Contact Support
                        </a>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}