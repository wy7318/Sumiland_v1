import { useState, useRef, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const FAQItem = ({ question, answer, isOpen, toggleOpen }) => {
    return (
        <div className="border-b border-gray-200 last:border-0">
            <button
                onClick={toggleOpen}
                className="flex justify-between items-center w-full py-5 px-4 text-left focus:outline-none group"
                aria-expanded={isOpen}
            >
                <h3 className="text-lg font-medium text-gray-800 group-hover:text-primary-600 transition-colors">{question}</h3>
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
                        Find answers to common questions about SimpliDone CRM and how it can transform your business
                    </motion.p>
                </div>

                {/* Category Tabs */}
                <div className="flex flex-wrap justify-center gap-3 mb-10">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* FAQ List */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden"
                >
                    <div className="divide-y divide-gray-200">
                        {displayedFaqs.map((item) => (
                            <FAQItem
                                key={item.id}
                                question={item.question}
                                answer={item.answer}
                                isOpen={openItems.includes(item.id)}
                                toggleOpen={() => toggleItem(item.id)}
                            />
                        ))}
                    </div>
                    {faqs.filter(f => f.category === activeCategory).length > 5 && (
                        <div className="text-right px-4 pb-4 pt-2">
                            <button
                                onClick={() => navigate('/faq')}
                                className="text-sm text-primary-600 hover:underline"
                            >
                                View more
                            </button>
                        </div>
                    )}
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