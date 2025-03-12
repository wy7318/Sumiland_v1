import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart2, Users, LineChart, Zap, 
  ArrowRight, X, Check, Database, 
  MessageSquare, Gauge
} from 'lucide-react';
import { cn } from '../lib/utils';

const services = [
  {
    id: 'analytics',
    icon: <BarChart2 className="w-8 h-8" />,
    title: 'Advanced Analytics',
    shortDesc: 'Data-driven insights for growth',
    description: 'Turn your customer data into actionable insights with our powerful analytics tools.',
    benefits: [
      'Real-time data visualization',
      'Custom report generation',
      'Predictive analytics',
      'Performance tracking'
    ],
    features: ['Dashboards', 'Reports', 'Forecasting']
  },
  {
    id: 'customer-management',
    icon: <Users className="w-8 h-8" />,
    title: 'Customer Management',
    shortDesc: 'Centralized customer information',
    description: 'Keep all your customer information organized and accessible in one place.',
    benefits: [
      'Contact management',
      'Interaction history',
      'Customer segmentation',
      'Communication tracking'
    ],
    features: ['Profiles', 'History', 'Notes']
  },
  {
    id: 'automation',
    icon: <Zap className="w-8 h-8" />,
    title: 'Sales Automation',
    shortDesc: 'Streamline your sales process',
    description: 'Automate repetitive tasks and focus on what matters - closing deals.',
    benefits: [
      'Workflow automation',
      'Lead scoring',
      'Email sequences',
      'Task management'
    ],
    features: ['Workflows', 'Triggers', 'Actions']
  },
  {
    id: 'reporting',
    icon: <LineChart className="w-8 h-8" />,
    title: 'Performance Reporting',
    shortDesc: 'Comprehensive business insights',
    description: 'Get detailed reports and insights about your business performance.',
    benefits: [
      'Custom report builder',
      'KPI tracking',
      'Goal monitoring',
      'Export capabilities'
    ],
    features: ['Reports', 'Analytics', 'Exports']
  }
];

type ServiceCardProps = {
  service: typeof services[0];
  isExpanded: boolean;
  onClick: (id?: string) => void;
  onClose: () => void;
};

function ServiceCard({ service, isExpanded, onClick, onClose }: ServiceCardProps) {
  return (
    <motion.div
      layout
      className={cn(
        "relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-500",
        isExpanded ? "col-span-full row-span-2" : "hover:shadow-xl cursor-pointer"
      )}
      onClick={() => !isExpanded && onClick()}
      initial={false}
      animate={{
        height: isExpanded ? 'auto' : '100%',
        transition: { duration: 0.5, ease: 'easeInOut' }
      }}
    >
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-8 h-full flex flex-col"
          >
            <div className="text-primary-500 mb-4">{service.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
            <p className="text-gray-600">{service.shortDesc}</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-8"
          >
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center space-x-4">
                <div className="text-primary-500">{service.icon}</div>
                <h3 className="text-2xl font-bold">{service.title}</h3>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold mb-4">About This Feature</h4>
                <p className="text-gray-600 mb-6">{service.description}</p>

                <h4 className="text-lg font-semibold mb-4">Key Benefits</h4>
                <ul className="space-y-3 mb-6">
                  {service.benefits.map((benefit: string, index: number) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Check className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-4">Core Features</h4>
                <div className="grid grid-cols-1 gap-4">
                  {service.features.map((feature: string, index: number) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-gray-200 hover:border-primary-500 hover:shadow-md transition-all duration-300"
                    >
                      <h5 className="font-medium text-gray-900">{feature}</h5>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <h4 className="text-lg font-semibold mb-4">Get Started</h4>
                  <a
                    href="#contact"
                    className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Try It Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ServicesSection() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <section className="py-20 px-4" id="features">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
          <p className="text-xl text-gray-600">
            Everything you need to manage and grow your business
          </p>
        </motion.div>

        <motion.div 
          layout 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr"
        >
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              isExpanded={expandedId === service.id}
              onClick={(id) => setExpandedId(id || service.id)}
              onClose={() => setExpandedId(null)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}