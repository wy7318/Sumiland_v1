import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FAQPage() {
    const [faqs, setFaqs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [openItems, setOpenItems] = useState<string[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchFaqs = async () => {
            const { data, error } = await supabase
                .from('faq')
                .select('*')
                .eq('is_active', true)
                .order('sort_order');

            if (!error) setFaqs(data);
        };
        fetchFaqs();
    }, []);

    const toggleItem = (id: string) => {
        setOpenItems(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    const filteredFaqs = faqs.filter(faq =>
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped = filteredFaqs.reduce((acc, faq) => {
        acc[faq.category] = acc[faq.category] || [];
        acc[faq.category].push(faq);
        return acc;
    }, {} as Record<string, typeof faqs>);

    const handleContactClick = () => {
        navigate('/', { state: { scrollTo: 'contact' } });
    };

    return (
        <section className="py-24 px-4 max-w-4xl mx-auto">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold mb-2 text-gray-900">All Frequently Asked Questions</h1>
                <p className="text-gray-600">Browse all questions or use the search below.</p>
            </div>

            <div className="mb-8">
                <input
                    type="text"
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
            </div>

            {Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="mb-12">
                    <h2 className="text-xl font-semibold mb-4 text-primary-600">{category}</h2>

                    <div className="bg-white rounded-xl shadow overflow-hidden divide-y divide-gray-200">
                        {items.map(item => (
                            <div key={item.id} className="">
                                <button
                                    onClick={() => toggleItem(item.id)}
                                    className="w-full text-left px-4 py-4 flex justify-between items-center focus:outline-none group"
                                >
                                    <h3 className="text-gray-800 font-medium group-hover:text-primary-600">{item.question}</h3>
                                    <div className="ml-2 text-primary-500">
                                        {openItems.includes(item.id) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </div>
                                </button>
                                {openItems.includes(item.id) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="px-4 pb-5 text-gray-600 prose prose-sm max-w-none"
                                    >
                                        {item.answer.split('\n').map((p: string, idx: number) => (
                                            <p key={idx}>{p}</p>
                                        ))}
                                    </motion.div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <div className="mt-12 text-center">
                <p className="text-gray-600 mb-4">Don't see your question answered here?</p>
                <button
                    onClick={handleContactClick}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                >
                    Contact Our Support Team
                </button>
            </div>
        </section>
    );
}
