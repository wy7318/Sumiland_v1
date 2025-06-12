import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Users, Database, ArrowRight, Calculator } from 'lucide-react';

export function PricingSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [annual, setAnnual] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [teamSize, setTeamSize] = useState(10);

  // Core features list - simplified
  const coreFeatures = [
    "Up to 20 team members included",
    "All CRM features (Sales, Service, Inventory)",
    "250,000 customer profiles",
    "200GB file storage",
    "Email integration (Gmail/Outlook)",
    "AI-powered analytics",
    "Workflow automation",
    "24/7 email support",
    "Data migration assistance"
  ];

  // Calculate savings
  const calculateSavings = (size) => {
    const ourPrice = annual ? 1500 : 2040; // Annual vs monthly total ($125*12 vs $170*12)
    const competitorPrice = size * 200 * (annual ? 12 : 1); // $150 per user
    const savings = competitorPrice - ourPrice;
    return {
      ourPrice,
      competitorPrice,
      savings,
      monthlyOurs: annual ? 125 : 170
    };
  };

  const scrollToContact = () => {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      const offset = 100;
      const elementPosition = contactSection.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section ref={ref} id="pricing" className="py-24 relative overflow-hidden bg-white">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTU2LDE2MywxNzUsMC4xKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold text-black mb-6"
          >
            Simple Pricing,
            <br />
            Maximum Value.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto font-light"
          >
            One flat rate. All features included. No surprises.
          </motion.p>
        </div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center justify-center mb-16"
        >
          <div className="flex items-center p-1 bg-gray-100 rounded-full">
            <button
              onClick={() => setAnnual(false)}
              className={`px-8 py-3 rounded-full font-medium transition-all duration-200 ${!annual ? "bg-black text-white" : "text-gray-600 hover:text-black"
                }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`relative px-8 py-3 rounded-full font-medium transition-all duration-200 ${annual ? "bg-black text-white" : "text-gray-600 hover:text-black"
                }`}
            >
              Annual
              {annual && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                  Save 27%
                </span>
              )}
            </button>
          </div>
        </motion.div>

        {/* Main Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <div className="bg-white rounded-3xl border-2 border-gray-200 overflow-hidden shadow-xl">
            <div className="grid lg:grid-cols-2">
              {/* Left - Pricing */}
              <div className="p-12 bg-black text-white">
                <h3 className="text-3xl font-bold mb-4">Essential Plan</h3>
                <p className="text-gray-300 mb-8">Complete business management solution</p>

                <div className="mb-8">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-6xl font-bold">${annual ? '125' : '170'}</span>
                    <span className="text-gray-300">/ month</span>
                  </div>
                  {annual && (
                    <p className="text-gray-300">
                      $1,500 billed annually <span className="text-green-400">(Save $540)</span>
                    </p>
                  )}
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center text-gray-100">
                    <Check className="w-5 h-5 mr-3 text-green-400" />
                    <span>Up to 20 users included</span>
                  </div>
                  <div className="flex items-center text-gray-100">
                    <Check className="w-5 h-5 mr-3 text-green-400" />
                    <span>All features & modules</span>
                  </div>
                  <div className="flex items-center text-gray-100">
                    <Check className="w-5 h-5 mr-3 text-green-400" />
                    <span>No hidden fees ever</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={scrollToContact}
                    className="w-full bg-white text-black px-8 py-4 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                  >
                    Start Free Trial
                  </button>
                  <button
                    onClick={scrollToContact}
                    className="w-full border border-gray-600 text-white px-8 py-4 rounded-lg font-medium hover:border-gray-400 transition-colors"
                  >
                    Schedule Demo
                  </button>
                </div>
              </div>

              {/* Right - Features */}
              <div className="p-12">
                <h4 className="text-2xl font-bold text-black mb-6">What's Included</h4>

                <div className="space-y-3 mb-8">
                  {coreFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="rounded-full bg-green-100 p-1 mt-0.5">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <Database className="w-4 h-4 mr-2" />
                    <span>14-day free trial • No credit card required</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="w-4 h-4 mr-2" />
                    <span>30-day money-back guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Savings Calculator */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-2xl mx-auto mb-16"
        >
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
            <div
              className="p-6 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
              onClick={() => setShowCalculator(!showCalculator)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center mr-4">
                    <Calculator className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-black">Savings Calculator</h3>
                    <p className="text-gray-600">See how much your team saves</p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform ${showCalculator ? 'rotate-180' : ''
                    }`}
                />
              </div>
            </div>

            <AnimatePresence>
              {showCalculator && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6">
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Team Size: {teamSize} users
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={teamSize}
                        onChange={(e) => setTeamSize(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1</span>
                        <span>10</span>
                        <span>20</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">SimpliDone</p>
                        <p className="text-2xl font-bold text-black">
                          ${calculateSavings(teamSize).monthlyOurs}/mo
                        </p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">Typical CRM</p>
                        <p className="text-2xl font-bold text-gray-700">
                          ${teamSize * 200}/mo
                        </p>
                      </div>
                    </div>

                    <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700 mb-1">Your Monthly Savings</p>
                      <p className="text-4xl font-bold text-green-600">
                        ${(teamSize * 200) - calculateSavings(teamSize).monthlyOurs}
                      </p>
                      <p className="text-xs text-green-600 mt-2">
                        That's ${((teamSize * 200) - calculateSavings(teamSize).monthlyOurs) * 12} saved annually!
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Simple FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-black mb-4">Common Questions</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h4 className="text-lg font-bold text-black mb-2">Any hidden costs?</h4>
              <p className="text-gray-600">
                Never. $170/month includes everything - all features, all users (up to 20),
                all storage, and all support.
              </p>
            </div>

            <div className="text-center">
              <h4 className="text-lg font-bold text-black mb-2">Need more than 20 users?</h4>
              <p className="text-gray-600">
                Additional users are just $8/month each, or upgrade to our 50-user plan
                for $340/month total.
              </p>
            </div>

            <div className="text-center">
              <h4 className="text-lg font-bold text-black mb-2">Long-term contract required?</h4>
              <p className="text-gray-600">
                No contracts ever. Cancel anytime. We offer 27% off for annual
                commitments, but it's optional.
              </p>
            </div>

            <div className="text-center">
              <h4 className="text-lg font-bold text-black mb-2">What about data migration?</h4>
              <p className="text-gray-600">
                Included! Our team helps migrate your data from any existing CRM
                or spreadsheets at no extra cost.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center"
        >
          <div className="bg-black rounded-2xl p-12 shadow-xl">
            <h3 className="text-3xl font-bold text-white mb-4">
              Ready to simplify your business?
            </h3>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of businesses that have streamlined their operations with SimpliDone.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={scrollToContact}
                className="group bg-white text-black px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={scrollToContact}
                className="border border-gray-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:border-gray-400 transition-colors"
              >
                Schedule Demo
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-4">
              14-day free trial • No credit card required • Cancel anytime
            </p>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </section>
  );
}