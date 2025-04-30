import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ChevronRight, BarChart3, Box, Layers, Users, PieChart, ArrowRight, Play, Zap } from 'lucide-react';

export function ServicesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const services = [
    {
      title: "Unified Customer & Inventory Management",
      description: "Seamlessly connect your customer relationships with inventory operations for unmatched business visibility and control.",
      imageSrc: "https://jaytpfztifhtzcruxguj.supabase.co/storage/v1/object/public/Sumiland%20Design/Simplidone/customer%20management.jpg",
      icon: <Layers className="w-full h-full p-2 text-white" />,
      iconBg: "from-blue-500 to-indigo-600",
      features: [
        "360° customer view integrated with inventory data",
        "Real-time stock levels visible within customer records",
        "Purchase history with inventory analytics",
        "Automated reorder notifications based on customer demand",
        "Inventory forecasting tied to customer buying patterns"
      ],
      benefits: "By connecting your inventory directly to your customer data, businesses reduce stockouts by 73% while improving order accuracy by 94%. This integration creates a seamless experience for both customers and staff while optimizing your supply chain."
    },
    {
      title: "Intelligent Analytics Dashboard",
      description: "Uncover actionable insights across both customer relations and inventory with our comprehensive analytics platform.",
      imageSrc: "https://jaytpfztifhtzcruxguj.supabase.co/storage/v1/object/public/Sumiland%20Design/Simplidone/reporting.jpg",
      icon: <BarChart3 className="w-full h-full p-2 text-white" />,
      iconBg: "from-violet-500 to-purple-600",
      features: [
        "Combined CRM and inventory performance metrics",
        "Product popularity analysis by customer segment",
        "Sales velocity monitoring and prediction",
        "Multi-dimensional reporting across all business areas",
        "Custom KPI tracking and visualization"
      ],
      benefits: "Our unified analytics provide 42% better forecasting accuracy and 37% faster identification of market opportunities. Clients report making strategic inventory decisions 2.5x faster with our complete business visibility dashboard."
    },
    {
      title: "AI-Powered Business Automation",
      description: "Harness cutting-edge AI to streamline operations across customer management and inventory control systems.",
      imageSrc: "https://jaytpfztifhtzcruxguj.supabase.co/storage/v1/object/public/Sumiland%20Design/Simplidone/aipowered.jpg",
      icon: <Zap className="w-full h-full p-2 text-white" />,
      iconBg: "from-amber-500 to-orange-600",
      features: [
        "Automated inventory adjustments based on customer behavior",
        "Smart reordering tied to sales forecasts",
        "AI-driven customer segmentation by purchase patterns",
        "Intelligent product recommendations based on inventory",
        "Automated workflow optimization across departments"
      ],
      benefits: "Teams using our automation tools handle 40% more customer inquiries while reducing stockouts by 65%. The AI-powered integration between CRM and inventory means your staff focuses on growth rather than maintenance."
    },
    {
      title: "Inventory Lifecycle Management",
      description: "Track products from procurement to sale with complete visibility and control throughout the entire inventory lifecycle.",
      imageSrc: "https://jaytpfztifhtzcruxguj.supabase.co/storage/v1/object/public/Sumiland%20Design/Simplidone/inventory.jpg",
      icon: <Box className="w-full h-full p-2 text-white" />,
      iconBg: "from-emerald-500 to-teal-600",
      features: [
        "End-to-end product tracking and management",
        "Supplier relationship management integration",
        "Multi-location inventory synchronization",
        "Serial and batch number tracking",
        "Expiration date monitoring and alerts"
      ],
      benefits: "Our clients report 82% improvement in inventory accuracy and 47% reduction in carrying costs. By integrating inventory lifecycle with customer management, you'll eliminate data silos while creating a more responsive business operation."
    }
  ];

  return (
    <section id="services" ref={ref} className="py-24 relative overflow-hidden bg-gray-50">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-white to-gray-100 z-0"></div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500 to-transparent"></div>
      <div className="absolute -right-64 top-1/4 w-96 h-96 rounded-full bg-blue-100 blur-3xl opacity-30 z-0"></div>
      <div className="absolute -left-64 bottom-1/4 w-96 h-96 rounded-full bg-primary-100 blur-3xl opacity-30 z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block"
          >
            <span className="bg-primary-50 text-primary-800 text-sm font-medium px-3 py-1 rounded-full">
              Integrated Solutions
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-bold mt-4 mb-4"
          >
            <span className="text-gray-900">Powerful Services for </span>
            <span className="bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
              Modern Businesses
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Our comprehensive solutions unify customer relationship and inventory management,
            providing unparalleled visibility and control across your entire business.
          </motion.p>
        </div>

        <div className="space-y-16">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              className="bg-white rounded-2xl shadow-xl overflow-hidden group"
            >
              <div className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-stretch`}>
                {/* Video Section */}
                <div className="w-full lg:w-1/2 relative overflow-hidden">
                  {/* Service Icon - Absolute positioned over video */}
                  <div className={`absolute top-6 left-6 z-30 w-16 h-16 rounded-2xl bg-gradient-to-br ${service.iconBg} p-1 shadow-lg transform transition-transform group-hover:scale-110`}>
                    {service.icon}
                  </div>

                  <div className="relative h-full min-h-[300px]">
                    {/* Image */}
                    <img
                      src={service.imageSrc}
                      alt={service.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${service.iconBg} opacity-50 mix-blend-overlay`}></div>

                    {/* Hover overlay */}
                    {/* <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="transform scale-0 group-hover:scale-100 transition-transform rounded-lg bg-white/10 backdrop-blur-sm p-3 border border-white/20">
                        <span className="text-white font-medium">View Details</span>
                      </div>
                    </div> */}
                  </div>
                </div>

                {/* Content Section */}
                <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
                  <h3 className="text-2xl lg:text-3xl font-bold mb-4 text-gray-900">{service.title}</h3>
                  <p className="text-lg text-gray-600 mb-6">{service.description}</p>

                  <div className="space-y-3 mb-6">
                    {service.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className={`flex-shrink-0 mt-1 rounded-full bg-gradient-to-br ${service.iconBg} p-1`}>
                          <ChevronRight className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 mb-6 border-l-4 border-primary-500">
                    <p className="text-gray-700 italic">
                      {service.benefits}
                    </p>
                  </div>

                  <motion.a
                    href="#contact"
                    whileHover={{ x: 5 }}
                    className="inline-flex items-center text-primary-600 font-semibold group mt-auto"
                  >
                    Learn more about this service
                    <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </motion.a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl p-10 shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to transform your business operations?</h3>
            <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
              Experience the power of unified customer and inventory management with SimpliDone's comprehensive platform.
            </p>
            <a
              href="#contact"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-700 rounded-lg text-lg font-medium hover:bg-white/90 transition-colors shadow-lg"
            >
              Schedule a Demo
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}