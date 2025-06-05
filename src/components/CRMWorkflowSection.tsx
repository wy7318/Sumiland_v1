import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { ArrowRight, MousePointer2, Plus, FileText, CreditCard, CheckCircle, TrendingUp } from 'lucide-react';

export function CRMWorkflowSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, threshold: 0.3 });
    const [currentStep, setCurrentStep] = useState(0);

    const scrollToContact = () => {
        console.log('Button clicked!'); // Debug log

        const contactSection = document.getElementById('contact');
        console.log('Found contact section:', contactSection); // Debug log

        if (contactSection) {
            const offset = 100; // Increased offset for better positioning
            const elementPosition = contactSection.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            console.log('Scrolling to position:', offsetPosition); // Debug log

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        } else {
            console.log('Contact section not found!'); // Debug log
            // Fallback - scroll to bottom of page
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });
        }
      };

    const steps = [
        {
            id: 1,
            title: "Navigate CRM Dashboard",
            description: "User logs in and sees comprehensive overview",
            icon: MousePointer2,
            color: "from-blue-500 to-indigo-600",
            delay: 0
        },
        {
            id: 2,
            title: "Create New Opportunity",
            description: "Add prospect details and potential value",
            icon: Plus,
            color: "from-green-500 to-emerald-600",
            delay: 1.5
        },
        {
            id: 3,
            title: "Convert to Quote",
            description: "Transform opportunity into professional quote",
            icon: FileText,
            color: "from-purple-500 to-violet-600",
            delay: 3
        },
        {
            id: 4,
            title: "Process Order",
            description: "Quote accepted, order automatically generated",
            icon: CreditCard,
            color: "from-orange-500 to-red-600",
            delay: 4.5
        },
        {
            id: 5,
            title: "Deal Completed!",
            description: "Revenue tracked, customer success confirmed",
            icon: CheckCircle,
            color: "from-emerald-500 to-green-600",
            delay: 6
        }
    ];

    useEffect(() => {
        if (isInView) {
            const timer = setInterval(() => {
                setCurrentStep((prev) => (prev + 1) % steps.length);
            }, 1500);
            return () => clearInterval(timer);
        }
    }, [isInView, steps.length]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.3,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.6 }
        }
    };

    return (
        <section ref={ref} className="relative py-24 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100 rounded-full opacity-20 blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-100 rounded-full opacity-20 blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                {/* Section Header */}
                <motion.div
                    className="text-center mb-16"
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                >
                    <motion.h2
                        variants={itemVariants}
                        className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
                    >
                        From Lead to Revenue in
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Minutes</span>
                    </motion.h2>
                    <motion.p
                        variants={itemVariants}
                        className="text-xl text-gray-600 max-w-3xl mx-auto"
                    >
                        Watch how SimpliDone transforms your sales process with intelligent automation
                    </motion.p>
                </motion.div>

                {/* Main Animation Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left Side - Animated Workflow */}
                    <motion.div
                        className="relative"
                        initial={{ opacity: 0, x: -50 }}
                        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                    >
                        {/* Central Device Mockup */}
                        <div className="relative mx-auto w-80 h-96 bg-gray-900 rounded-3xl p-6 shadow-2xl">
                            {/* Device Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex space-x-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                </div>
                                <div className="text-gray-400 text-xs">SimpliDone CRM</div>
                            </div>

                            {/* Animated Content */}
                            <div className="relative h-80 overflow-hidden">
                                {/* Step 1: Dashboard View */}
                                <motion.div
                                    className="absolute inset-0 bg-white rounded-xl p-4"
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: currentStep === 0 ? 1 : 0,
                                        scale: currentStep === 0 ? 1 : 0.95
                                    }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-gray-800 font-medium text-sm">Dashboard</div>
                                            <motion.div
                                                animate={{ scale: [1, 1.1, 1] }}
                                                transition={{ repeat: Infinity, duration: 2 }}
                                                className="w-6 h-6 bg-blue-500 rounded-full"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-blue-100 rounded-lg p-3">
                                                <div className="text-xs text-gray-600">Leads</div>
                                                <div className="text-lg font-bold text-gray-800">156</div>
                                            </div>
                                            <div className="bg-green-100 rounded-lg p-3">
                                                <div className="text-xs text-gray-600">Revenue</div>
                                                <div className="text-lg font-bold text-gray-800">$847K</div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {[1, 2, 3].map((i) => (
                                                <motion.div
                                                    key={i}
                                                    className="bg-gray-100 rounded p-2"
                                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                                                >
                                                    <div className="h-2 bg-gray-300 rounded w-3/4"></div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Step 2: Create Opportunity */}
                                <motion.div
                                    className="absolute inset-0 bg-white rounded-xl p-4"
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: currentStep === 1 ? 1 : 0,
                                        scale: currentStep === 1 ? 1 : 0.95
                                    }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-2">
                                            <motion.div
                                                animate={{ rotate: currentStep === 1 ? 90 : 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="w-6 h-6 bg-green-500 rounded flex items-center justify-center"
                                            >
                                                <Plus className="w-4 h-4 text-white" />
                                            </motion.div>
                                            <span className="text-gray-800 font-medium text-sm">New Opportunity</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="space-y-1">
                                                <div className="text-xs text-gray-600">Company Name</div>
                                                <motion.div
                                                    className="bg-gray-100 rounded p-2"
                                                    animate={{ width: currentStep === 1 ? '100%' : '0%' }}
                                                    transition={{ duration: 1 }}
                                                >
                                                    <span className="text-sm text-gray-800">Acme Corporation</span>
                                                </motion.div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs text-gray-600">Deal Value</div>
                                                <motion.div
                                                    className="bg-gray-100 rounded p-2"
                                                    animate={{ width: currentStep === 1 ? '100%' : '0%' }}
                                                    transition={{ duration: 1, delay: 0.3 }}
                                                >
                                                    <span className="text-sm text-gray-800">$45,000</span>
                                                </motion.div>
                                            </div>
                                            <motion.button
                                                className="w-full bg-green-500 text-white rounded p-2 text-sm font-medium"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                Create Opportunity
                                            </motion.button>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Step 3: Convert to Quote */}
                                <motion.div
                                    className="absolute inset-0 bg-white rounded-xl p-4"
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: currentStep === 2 ? 1 : 0,
                                        scale: currentStep === 2 ? 1 : 0.95
                                    }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-2">
                                            <motion.div
                                                animate={{
                                                    rotateY: currentStep === 2 ? 360 : 0,
                                                    backgroundColor: currentStep === 2 ? '#8b5cf6' : '#6b7280'
                                                }}
                                                transition={{ duration: 0.8 }}
                                                className="w-6 h-6 rounded flex items-center justify-center"
                                            >
                                                <FileText className="w-4 h-4 text-white" />
                                            </motion.div>
                                            <span className="text-gray-800 font-medium text-sm">Generate Quote</span>
                                        </div>
                                        <div className="bg-purple-50 rounded-lg p-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium text-gray-800">Quote #QT-001</span>
                                                <motion.span
                                                    className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded"
                                                    animate={{ scale: [1, 1.1, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                                >
                                                    Generated
                                                </motion.span>
                                            </div>
                                            <div className="text-xs text-gray-600 mb-1">Acme Corporation</div>
                                            <div className="text-lg font-bold text-purple-700">$45,000</div>
                                        </div>
                                        <motion.div
                                            className="flex items-center text-sm text-purple-600"
                                            animate={{ x: [0, 5, 0] }}
                                            transition={{ repeat: Infinity, duration: 1 }}
                                        >
                                            <span>Ready to Send</span>
                                            <ArrowRight className="w-4 h-4 ml-1" />
                                        </motion.div>
                                    </div>
                                </motion.div>

                                {/* Step 4: Process Order */}
                                <motion.div
                                    className="absolute inset-0 bg-white rounded-xl p-4"
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: currentStep === 3 ? 1 : 0,
                                        scale: currentStep === 3 ? 1 : 0.95
                                    }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-2">
                                            <motion.div
                                                animate={{
                                                    scale: currentStep === 3 ? [1, 1.2, 1] : 1,
                                                    backgroundColor: currentStep === 3 ? '#f97316' : '#6b7280'
                                                }}
                                                transition={{ duration: 0.6, repeat: currentStep === 3 ? Infinity : 0 }}
                                                className="w-6 h-6 rounded flex items-center justify-center"
                                            >
                                                <CreditCard className="w-4 h-4 text-white" />
                                            </motion.div>
                                            <span className="text-gray-800 font-medium text-sm">Processing Order</span>
                                        </div>
                                        <div className="bg-orange-50 rounded-lg p-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium text-gray-800">Order #ORD-001</span>
                                                <motion.div
                                                    className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full"
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                />
                                            </div>
                                            <div className="text-xs text-gray-600 mb-1">Quote Accepted</div>
                                            <div className="text-lg font-bold text-orange-700">$45,000</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-xs text-gray-600">Progress</div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <motion.div
                                                    className="bg-orange-500 h-2 rounded-full"
                                                    animate={{ width: currentStep === 3 ? '75%' : '0%' }}
                                                    transition={{ duration: 1.5 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Step 5: Deal Completed */}
                                <motion.div
                                    className="absolute inset-0 bg-white rounded-xl p-4"
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: currentStep === 4 ? 1 : 0,
                                        scale: currentStep === 4 ? 1 : 0.95
                                    }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-2">
                                            <motion.div
                                                animate={{
                                                    scale: currentStep === 4 ? [1, 1.3, 1] : 1,
                                                    backgroundColor: currentStep === 4 ? '#10b981' : '#6b7280'
                                                }}
                                                transition={{ duration: 0.8 }}
                                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                            >
                                                <CheckCircle className="w-4 h-4 text-white" />
                                            </motion.div>
                                            <span className="text-gray-800 font-medium text-sm">Deal Completed!</span>
                                        </div>
                                        <motion.div
                                            className="bg-green-50 rounded-lg p-3 border-2 border-green-200"
                                            animate={{
                                                borderColor: currentStep === 4 ? ['#10b981', '#34d399', '#10b981'] : '#d1d5db'
                                            }}
                                            transition={{ duration: 1, repeat: currentStep === 4 ? Infinity : 0 }}
                                        >
                                            <div className="text-center">
                                                <motion.div
                                                    animate={{ scale: currentStep === 4 ? [1, 1.2, 1] : 1 }}
                                                    transition={{ duration: 0.8, delay: 0.3 }}
                                                >
                                                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                                                </motion.div>
                                                <div className="text-lg font-bold text-green-700 mb-1">$45,000</div>
                                                <div className="text-xs text-green-600">Revenue Added</div>
                                            </div>
                                        </motion.div>
                                        <div className="flex items-center justify-center space-x-2 text-sm text-green-600">
                                            <TrendingUp className="w-4 h-4" />
                                            <span>Customer Success Confirmed</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Floating Elements */}
                        <motion.div
                            className="absolute -top-6 -right-6 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
                            animate={{
                                y: [0, -10, 0],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                        >
                            <MousePointer2 className="w-6 h-6 text-white" />
                        </motion.div>

                        <motion.div
                            className="absolute -bottom-6 -left-6 w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg"
                            animate={{
                                scale: [1, 1.1, 1],
                                rotate: [0, -5, 5, 0]
                            }}
                            transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
                        >
                            <span className="text-white font-bold text-xl">$</span>
                        </motion.div>
                    </motion.div>

                    {/* Right Side - Step Indicators */}
                    <motion.div
                        className="space-y-8"
                        initial={{ opacity: 0, x: 50 }}
                        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                    >
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = currentStep === index;

                            return (
                                <motion.div
                                    key={step.id}
                                    className={`flex items-start space-x-4 p-4 rounded-xl transition-all duration-500 ${isActive
                                            ? 'bg-white shadow-lg border-l-4 border-blue-500'
                                            : 'bg-gray-50 border-l-4 border-transparent'
                                        }`}
                                    animate={{
                                        scale: isActive ? 1.05 : 1,
                                        x: isActive ? 10 : 0
                                    }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <motion.div
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r ${step.color} shadow-lg`}
                                        animate={{
                                            scale: isActive ? [1, 1.2, 1] : 1,
                                            rotate: isActive ? [0, 5, -5, 0] : 0
                                        }}
                                        transition={{ duration: 0.6 }}
                                    >
                                        <Icon className="w-6 h-6 text-white" />
                                    </motion.div>
                                    <div className="flex-1">
                                        <motion.h3
                                            className={`font-semibold transition-colors duration-300 ${isActive ? 'text-gray-900' : 'text-gray-700'
                                                }`}
                                            animate={{ color: isActive ? '#111827' : '#374151' }}
                                        >
                                            {step.title}
                                        </motion.h3>
                                        <motion.p
                                            className={`text-sm transition-colors duration-300 ${isActive ? 'text-gray-600' : 'text-gray-500'
                                                }`}
                                        >
                                            {step.description}
                                        </motion.p>
                                        {isActive && (
                                            <motion.div
                                                className="mt-2 w-full bg-blue-100 rounded-full h-1"
                                                initial={{ width: 0 }}
                                                animate={{ width: '100%' }}
                                                transition={{ duration: 1.4 }}
                                            >
                                                <motion.div
                                                    className="bg-blue-500 h-1 rounded-full"
                                                    initial={{ width: '0%' }}
                                                    animate={{ width: '100%' }}
                                                    transition={{ duration: 1.4 }}
                                                />
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>

                {/* Bottom CTA */}
                <motion.div
                    className="text-center mt-16"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.8, delay: 1 }}
                >
                    <motion.button
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={scrollToContact}  // ADD THIS LINE
                    >
                        Start Your Success Story
                        <ArrowRight className="w-5 h-5 ml-2 inline" />
                    </motion.button>
                    <p className="text-gray-600 mt-4">No credit card required • 14-day free trial</p>
                </motion.div>
            </div>
        </section>
    );
}