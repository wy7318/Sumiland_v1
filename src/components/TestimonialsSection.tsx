import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';

export function TestimonialsSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });
    const [activeIndex, setActiveIndex] = useState(0);

    const testimonials = [
        {
            name: "Sarah Johnson",
            position: "Marketing Director, TechFlow Inc.",
            image: "/api/placeholder/80/80",
            content: "Xelytic CRM has transformed how we interact with customers. The analytics capabilities have given us insights we never had before, allowing us to create more targeted campaigns that have increased our conversion rates by 45%.",
            rating: 5
        },
        {
            name: "Michael Rodriguez",
            position: "Sales Manager, Innovate Solutions",
            image: "/api/placeholder/80/80",
            content: "Since implementing Xelytic, our sales team has exceeded targets consistently. The pipeline visualization and forecasting tools have made planning so much easier, and the mobile app keeps our team connected no matter where they are.",
            rating: 5
        },
        {
            name: "Emily Chen",
            position: "CEO, GrowthFirst Startups",
            image: "/api/placeholder/80/80",
            content: "As a startup founder, finding a CRM that scales with our growth was crucial. Xelytic offers enterprise-level features at a price point that worked for us, and their support team has been there every step of the way.",
            rating: 5
        }
    ];

    const nextTestimonial = () => {
        setActiveIndex((prev) => (prev + 1) % testimonials.length);
    };

    const prevTestimonial = () => {
        setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    };

    return (
        <section ref={ref} id="testimonials" className="py-24 relative overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-primary-950 opacity-80"></div>

            {/* Decorative Elements */}
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.6 }}
                        className="inline-block px-3 py-1 text-sm font-medium bg-primary-900/50 rounded-full text-primary-400 mb-4"
                    >
                        Testimonials
                    </motion.span>

                    <motion.h2
                        initial={{ opacity: 0, y: -20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-4xl md:text-5xl font-bold mb-6"
                    >
                        What Our <span className="text-primary-400">Clients Say</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="text-xl text-gray-300 max-w-3xl mx-auto"
                    >
                        Don't just take our word for it — hear from the businesses that have transformed their operations with Xelytic CRM.
                    </motion.p>
                </div>

                <div className="relative max-w-4xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeIndex}
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{ duration: 0.5 }}
                            className="bg-gray-800/50 backdrop-blur-md rounded-2xl p-8 md:p-12 border border-gray-700/50 shadow-xl relative"
                        >
                            {/* Quote Icon */}
                            <div className="absolute -top-6 -left-6 bg-primary-500 rounded-full p-4">
                                <Quote className="w-6 h-6 text-white" />
                            </div>

                            <div className="flex flex-col items-center text-center">
                                <div className="flex mb-6">
                                    {[...Array(testimonials[activeIndex].rating)].map((_, i) => (
                                        <Star key={i} className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                                    ))}
                                </div>

                                <p className="text-xl md:text-2xl text-gray-200 italic mb-8">
                                    "{testimonials[activeIndex].content}"
                                </p>

                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-500">
                                        <img
                                            src={testimonials[activeIndex].image}
                                            alt={testimonials[activeIndex].name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    <div className="text-left">
                                        <div className="font-bold text-xl">{testimonials[activeIndex].name}</div>
                                        <div className="text-gray-400">{testimonials[activeIndex].position}</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between absolute -left-4 -right-4 top-1/2 -translate-y-1/2">
                        <button
                            onClick={prevTestimonial}
                            className="bg-gray-800/80 hover:bg-primary-500 text-white rounded-full p-3 transform -translate-y-1/2 transition-colors"
                            aria-label="Previous testimonial"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                            onClick={nextTestimonial}
                            className="bg-gray-800/80 hover:bg-primary-500 text-white rounded-full p-3 transform -translate-y-1/2 transition-colors"
                            aria-label="Next testimonial"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Testimonial Indicators */}
                <div className="flex justify-center mt-8 space-x-2">
                    {testimonials.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveIndex(index)}
                            className={`w-3 h-3 rounded-full transition-colors ${index === activeIndex ? 'bg-primary-500' : 'bg-gray-600'
                                }`}
                            aria-label={`Go to testimonial ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}