import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ChevronRight, BarChart3, Users, PieChart, Mail, Shield, Database, Smartphone, Code, Workflow } from 'lucide-react';

export function ServicesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const services = [
    {
      title: "Customer Relationship Management",
      description: "Our core CRM platform unifies all your customer data into one powerful, easy-to-use solution.",
      image: "/api/placeholder/600/400",
      features: [
        "360° customer view across departments",
        "Intuitive interface with minimal learning curve",
        "Customizable without coding",
        "Automation of repetitive tasks",
        "Real-time collaboration tools"
      ],
      benefits: "Get your entire team up and running in hours, not weeks. Our simplified workflow reduces onboarding costs by 60% compared to enterprise CRM systems, while increasing adoption rates across all team members."
    },
    {
      title: "Advanced Analytics & Insights",
      description: "Transform your customer data into actionable business intelligence with our comprehensive analytics tools.",
      image: "/api/placeholder/600/400",
      features: [
        "Predictive analytics with 42% better accuracy",
        "Custom reporting and dashboard builder",
        "Sales forecasting and trend identification",
        "Marketing campaign performance metrics",
        "Customer behavior analysis"
      ],
      benefits: "Make confident decisions based on data-driven insights. Our customers report 37% faster identification of market opportunities and 31% improvement in customer retention by surfacing trends that would otherwise remain hidden."
    },
    {
      title: "AI-Powered Automation",
      description: "Leverage cutting-edge artificial intelligence to streamline operations and enhance customer interactions.",
      image: "/api/placeholder/600/400",
      features: [
        "Visual workflow builder for process automation",
        "Intelligent lead scoring and prioritization",
        "Automated insight generation",
        "AI-assisted communication tools",
        "Time-saving task automation"
      ],
      benefits: "Free your team from mundane administrative work to focus on high-value customer interactions. Teams using our automation tools report handling 40% more customer inquiries without adding staff and reducing response times by 72%."
    },
    {
      title: "Mobile & Remote Workspace",
      description: "Keep your team productive anywhere with our fully-featured mobile solutions.",
      image: "/api/placeholder/600/400",
      features: [
        "Complete functionality on iOS and Android",
        "Real-time data synchronization",
        "Offline access to critical information",
        "Location-based tools for field sales",
        "Mobile document management"
      ],
      benefits: "Access your CRM from anywhere, ensuring your team stays productive whether in the office, working remotely, or meeting clients in the field. Field sales teams report 35% higher data entry compliance and 28% faster deal progression with our mobile tools."
    }
  ];

  return (
    <section id="services" ref={ref} className="py-24 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-primary-900/30 to-gray-900"></div>

      {/* Animated Dots Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-block px-3 py-1 text-sm font-medium bg-primary-900/50 rounded-full text-primary-400 mb-4"
          >
            Our Solutions
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            Comprehensive <span className="text-primary-400">Services</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-xl text-gray-300 max-w-3xl mx-auto"
          >
            Tailored solutions designed to streamline your operations, enhance customer relationships, and drive growth.
          </motion.p>
        </div>

        <div className="space-y-24">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 + index * 0.2 }}
              className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}
            >
              <div className="w-full lg:w-1/2">
                <div className="relative rounded-2xl overflow-hidden border border-gray-700/50 shadow-xl shadow-primary-900/20">
                  <div className="aspect-[4/3] relative">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="absolute inset-0 w-full h-full object-cover z-10"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary-900 to-transparent opacity-60 z-20"></div>

                    {/* Service Icon */}
                    <div className="absolute top-6 left-6 z-30 bg-primary-900/70 backdrop-blur-sm rounded-full p-3 border border-primary-500/50">
                      {index === 0 ? <Users className="w-8 h-8 text-primary-400" /> :
                        index === 1 ? <BarChart3 className="w-8 h-8 text-primary-400" /> :
                          index === 2 ? <Workflow className="w-8 h-8 text-primary-400" /> :
                            <Smartphone className="w-8 h-8 text-primary-400" />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-1/2">
                <h3 className="text-3xl font-bold mb-4 text-white">{service.title}</h3>
                <p className="text-xl text-gray-300 mb-6">{service.description}</p>

                <div className="space-y-4 mb-6">
                  {service.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-shrink-0 rounded-full bg-primary-900/40 p-1">
                        <ChevronRight className="w-5 h-5 text-primary-400" />
                      </div>
                      <span className="text-lg text-gray-200">{feature}</span>
                    </div>
                  ))}
                </div>

                <p className="text-gray-400 italic border-l-4 border-primary-500/50 pl-4 py-2 mb-8">
                  {service.benefits}
                </p>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
                >
                  Learn More
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Services Overview Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-24"
        >
          <h3 className="text-3xl font-bold text-center mb-12">Additional Services</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-primary-500/50 transition-all duration-300 group">
              <Mail className="w-12 h-12 text-primary-400 mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-bold mb-3">Email Integration</h4>
              <p className="text-gray-300">Seamless email synchronization with engagement analytics. Never lose track of important communications.</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-primary-500/50 transition-all duration-300 group">
              <Shield className="w-12 h-12 text-primary-400 mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-bold mb-3">Data Security</h4>
              <p className="text-gray-300">Enterprise-grade security protocols with daily backups and compliance with GDPR, CCPA, and HIPAA.</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-primary-500/50 transition-all duration-300 group">
              <Code className="w-12 h-12 text-primary-400 mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-bold mb-3">Custom Development</h4>
              <p className="text-gray-300">Need something unique? Our team can build custom solutions that perfectly align with your business requirements.</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-primary-500/50 transition-all duration-300 group">
              <Database className="w-12 h-12 text-primary-400 mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-bold mb-3">Data Migration</h4>
              <p className="text-gray-300">Seamless transition from your existing CRM with our guided data migration assistance and data cleaning services.</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-primary-500/50 transition-all duration-300 group">
              <Users className="w-12 h-12 text-primary-400 mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-bold mb-3">Training & Onboarding</h4>
              <p className="text-gray-300">Personalized onboarding sessions and ongoing training to ensure your team gets the most out of SimpliDone CRM.</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-primary-500/50 transition-all duration-300 group">
              <PieChart className="w-12 h-12 text-primary-400 mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-bold mb-3">Business Intelligence</h4>
              <p className="text-gray-300">Advanced reporting and analytics that go beyond basic CRM data to provide strategic business insights.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}