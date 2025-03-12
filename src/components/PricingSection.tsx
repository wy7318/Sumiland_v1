import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '../lib/utils';

const plans = [
  {
    name: 'Starter',
    price: 49,
    description: 'Perfect for small businesses just getting started',
    features: [
      'Up to 1,000 contacts',
      'Basic analytics',
      'Email integration',
      'Task management',
      'Mobile app access'
    ],
    limitations: [
      'Advanced reporting',
      'API access',
      'Custom fields',
      'Workflow automation'
    ]
  },
  {
    name: 'Professional',
    price: 99,
    description: 'Ideal for growing businesses with advanced needs',
    features: [
      'Up to 10,000 contacts',
      'Advanced analytics',
      'Email & calendar integration',
      'Task & project management',
      'Mobile app access',
      'API access',
      'Custom fields',
      'Basic workflow automation'
    ],
    limitations: [
      'AI-powered insights',
      'White-label options'
    ],
    popular: true
  },
  {
    name: 'Enterprise',
    price: 199,
    description: 'For large organizations requiring maximum capability',
    features: [
      'Unlimited contacts',
      'AI-powered analytics',
      'Full suite integration',
      'Advanced project management',
      'Priority mobile access',
      'Complete API access',
      'Unlimited custom fields',
      'Advanced workflow automation',
      'AI-powered insights',
      'White-label options'
    ],
    limitations: []
  }
];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section className="py-20 px-4 bg-gray-50" id="pricing">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-gray-600">
            Choose the plan that best fits your needs
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <span className={cn(
              "text-sm font-medium",
              !isAnnual && "text-gray-900"
            )}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                isAnnual ? "bg-primary-600" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  isAnnual ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
            <span className={cn(
              "text-sm font-medium",
              isAnnual && "text-gray-900"
            )}>Annual</span>
            <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Save 20%
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className={cn(
                "bg-white rounded-2xl shadow-lg overflow-hidden",
                plan.popular && "ring-2 ring-primary-500"
              )}
            >
              {plan.popular && (
                <div className="bg-primary-500 text-white text-center text-sm font-medium py-1">
                  Most Popular
                </div>
              )}
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                <div className="flex items-baseline mb-8">
                  <span className="text-4xl font-bold">${isAnnual ? plan.price * 0.8 : plan.price}</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <a
                  href="#contact"
                  className={cn(
                    "block text-center py-3 px-6 rounded-lg font-medium transition-colors",
                    plan.popular
                      ? "bg-primary-600 text-white hover:bg-primary-700"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  )}
                >
                  Get Started
                </a>
              </div>
              <div className="p-8 bg-gray-50">
                <h4 className="font-medium mb-4">Features included:</h4>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation) => (
                    <li key={limitation} className="flex items-start text-gray-400">
                      <X className="w-5 h-5 mr-2 flex-shrink-0" />
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}