import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Laptop, Package2, PenTool, X, Check, ArrowRight, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePortfolio } from '../hooks/usePortfolio';

const services = [
  {
    id: 'design',
    icon: <Palette className="w-8 h-8" />,
    title: 'Design',
    shortDesc: 'Crafting unique brand identities',
    description: 'Our design service combines creativity with strategic thinking to create memorable brand marks that stand the test of time.',
    benefits: [
      'Custom-tailored designs that reflect your brand values',
      'Multiple concept variations to choose from',
      'Comprehensive brand guidelines',
      'File formats for all use cases'
    ],
    portfolioCategory: 'Design',
    relatedServices: ['branding', 'package-design']
  },
  {
    id: 'website-design',
    icon: <Laptop className="w-8 h-8" />,
    title: 'Website Design',
    shortDesc: 'Building stunning digital experiences',
    description: 'We create beautiful, responsive websites that engage your audience and drive results through thoughtful UX design and modern development practices.',
    benefits: [
      'Responsive design for all devices',
      'SEO-optimized structure',
      'Fast loading speeds',
      'Interactive elements'
    ],
    portfolioCategory: 'Application Development',
    relatedServices: ['branding', 'design']
  },
  {
    id: 'package-design',
    icon: <Package2 className="w-8 h-8" />,
    title: 'Package Design',
    shortDesc: 'Creating memorable unboxing moments',
    description: 'Our package design service helps your product stand out on shelves and creates an unforgettable unboxing experience for your customers.',
    benefits: [
      'Eye-catching designs that sell',
      'Sustainable material options',
      'Print-ready files',
      'Mockup presentations'
    ],
    portfolioCategory: 'Package Design',
    relatedServices: ['design', 'branding']
  },
  {
    id: 'branding',
    icon: <PenTool className="w-8 h-8" />,
    title: 'Branding',
    shortDesc: 'Developing cohesive brand strategies',
    description: 'We help businesses build strong, cohesive brand identities that resonate with their target audience and stand out in the market.',
    benefits: [
      'Comprehensive brand strategy',
      'Visual identity system',
      'Brand voice & messaging',
      'Style guidelines'
    ],
    portfolioCategory: 'Branding',
    relatedServices: ['design', 'website-design']
  }
];

function ServiceCard({ service, isExpanded, onClick, onClose }: any) {
  const { items: portfolioItems } = usePortfolio(service.portfolioCategory);

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
                <h4 className="text-lg font-semibold mb-4">About This Service</h4>
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
                <h4 className="text-lg font-semibold mb-4">Portfolio Examples</h4>
                <div className="grid grid-cols-1 gap-4 mb-6">
                  {portfolioItems.slice(0, 2).map((item) => (
                    <div key={item.id} className="relative rounded-lg overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h5 className="text-white font-medium mb-1">{item.title}</h5>
                          <p className="text-white/80 text-sm line-clamp-2">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <h4 className="text-lg font-semibold mb-4">Related Services</h4>
                <div className="space-y-3">
                  {service.relatedServices.map((id: string) => {
                    const relatedService = services.find(s => s.id === id);
                    if (!relatedService) return null;
                    return (
                      <button
                        key={id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onClick(relatedService.id);
                        }}
                        className="w-full flex items-center justify-between p-4 rounded-lg border hover:border-primary-500 hover:bg-primary-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-primary-500">{relatedService.icon}</div>
                          <span className="font-medium">{relatedService.title}</span>
                        </div>
                        <ArrowRight className="w-5 h-5 text-primary-500" />
                      </button>
                    );
                  })}
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
    <section className="py-20 px-4" id="services">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-bold text-center mb-16"
        >
          Our Services
        </motion.h2>

        <motion.div 
          layout 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr"
        >
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              isExpanded={expandedId === service.id}
              onClick={(id: string) => setExpandedId(id || service.id)}
              onClose={() => setExpandedId(null)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}