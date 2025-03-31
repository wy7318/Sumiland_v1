import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, X, BarChart, Database, Users, Shield, Clock, Server } from 'lucide-react';

export function PricingSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [annual, setAnnual] = useState(true);

  // Feature list data
  const teamFeatures = [
    { title: "Up to 20 team members included", included: true },
    { title: "No per-user charges", included: true },
    { title: "Unlimited admin accounts", included: true },
    { title: "Customizable user permissions", included: true },
    { title: "Team performance analytics", included: true }
  ];

  const technicalFeatures = [
    { title: "Support for 250,000 customer profiles", included: true },
    { title: "200GB file storage for documents and media", included: true },
    { title: "10GB database storage capacity", included: true },
    { title: "500GB monthly bandwidth", included: true },
    { title: "Daily backups with 7-day retention", included: true },
    { title: "Flexible scaling options available", included: true }
  ];

  const coreFeatures = [
    { title: "Contact Management", included: true },
    { title: "Sales Pipeline", included: true },
    { title: "Marketing Tools", included: true },
    { title: "Customer Service Module", included: true },
    { title: "Comprehensive Analytics", included: true },
    { title: "Mobile Apps (iOS & Android)", included: true },
    { title: "Email Integration", included: true }
  ];

  const supportFeatures = [
    { title: "Guided implementation process", included: true },
    { title: "Data migration assistance", included: true },
    { title: "Personalized onboarding sessions", included: true },
    { title: "Email support with 24-hour response time", included: true },
    { title: "Access to knowledge base and tutorials", included: true },
    { title: "Monthly feature update webinars", included: true }
  ];

  // Comparison data
  const comparisonData = [
    { feature: "Monthly Base Fee", ourSolution: "$150 flat rate", typical: "$25-75 per user" },
    { feature: "Additional User Fees", ourSolution: "None (up to 20 users)", typical: "$15-45 per user/month" },
    { feature: "Premium Features", ourSolution: "All included", typical: "$20-50 per feature/month" },
    { feature: "Implementation Fees", ourSolution: "Included", typical: "$1,500-5,000 one-time" },
    { feature: "Storage Limits", ourSolution: "200GB included", typical: "$15-25 per additional GB" },
    { feature: "Support Access", ourSolution: "Included for all users", typical: "Premium tiers only" },
    { feature: "Contract Length", ourSolution: "Month-to-month available", typical: "Annual commitment required" }
  ];

  // Savings calculator data
  const savingsData = [
    { size: "5 Users", monthlyCost: 150, annualCost: 1440, typicalCost: 5400, savings: 3960 },
    { size: "10 Users", monthlyCost: 150, annualCost: 1440, typicalCost: 10800, savings: 9360 },
    { size: "15 Users", monthlyCost: 150, annualCost: 1440, typicalCost: 16200, savings: 14760 },
    { size: "20 Users", monthlyCost: 150, annualCost: 1440, typicalCost: 21600, savings: 20160 }
  ];

  return (
    <section ref={ref} id="pricing" className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-gray-900/50"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCA2MCBNIDEyMCAtNjAgTCAtNjAgMTIwIiBzdHJva2U9InJnYmEoMTAyLDEyNiwyMzQsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-5"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-block px-3 py-1 text-sm font-medium bg-primary-900/50 rounded-full text-primary-400 mb-4"
          >
            Pricing Plans
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            Simple, Transparent <span className="text-primary-400">Pricing</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-xl text-gray-300 max-w-3xl mx-auto mb-12"
          >
            One simple price for everything you need. No per-user fees, no feature limitations, no surprises.
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center mb-12"
          >
            <div className="flex items-center justify-center bg-gray-800/70 rounded-full p-2 shadow-inner">
              <button
                onClick={() => setAnnual(false)}
                className={`px-4 py-2 rounded-full transition-colors ${!annual
                  ? 'bg-primary-500 text-white font-medium'
                  : 'text-gray-400 hover:text-gray-300'}`}
              >
                Monthly
              </button>

              <button
                onClick={() => setAnnual(true)}
                className={`px-4 py-2 rounded-full transition-colors ${annual
                  ? 'bg-primary-500 text-white font-medium'
                  : 'text-gray-400 hover:text-gray-300'}`}
              >
                Annual <span className="text-xs ml-1">{annual ? 'Save 20%' : ''}</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Essential Plan Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto mb-20"
        >
          <div className="bg-gradient-to-br from-primary-900/70 to-gray-800/70 rounded-2xl overflow-hidden border-2 border-primary-500 shadow-lg shadow-primary-500/20 p-8 md:p-10">
            <h3 className="text-3xl font-bold mb-2">Essential Plan</h3>
            <p className="text-gray-300 mb-6">One simple price for everything you need.</p>

            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-5xl font-bold">${annual ? '1,440' : '150'}</span>
              <span className="text-gray-300">/{annual ? 'year' : 'month'}</span>
              {annual && <span className="bg-primary-500/20 text-primary-400 px-2 py-1 rounded text-sm font-medium ml-2">Save 20%</span>}
            </div>

            <p className="text-gray-300 text-lg mb-8">
              {annual
                ? "$6 per user/month. Enjoy 12 months for the price of 10 with annual billing. No hidden fees, no per-user restrictions, and no feature limitations — just simple, transparent pricing."
                : "Only $7.50 per user — more affordable than any other CRM solution, while delivering all the essentials your business needs to operate efficiently."}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <a
                href="#contact"
                className="py-4 px-6 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors text-center"
              >
                Start Free Trial
              </a>
              <a
                href="#contact"
                className="py-4 px-6 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors text-center"
              >
                Schedule Demo
              </a>
            </div>

            <div className="flex items-center text-gray-300 mb-4">
              <Clock className="w-5 h-5 mr-2 text-primary-400" />
              <span>30-day money-back guarantee</span>
            </div>
            <div className="flex items-center text-gray-300">
              <Shield className="w-5 h-5 mr-2 text-primary-400" />
              <span>14-day free trial (no credit card required)</span>
            </div>
          </div>
        </motion.div>

        {/* Feature Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-20">
          {/* Team Capacity */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
          >
            <div className="flex items-center mb-6">
              <Users className="w-10 h-10 text-primary-400 mr-4" />
              <h3 className="text-2xl font-bold">Team Capacity</h3>
            </div>
            <div className="space-y-3">
              {teamFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 rounded-full bg-green-500/20 p-1 text-green-500">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-gray-200">{feature.title}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Technical Resources */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
          >
            <div className="flex items-center mb-6">
              <Server className="w-10 h-10 text-primary-400 mr-4" />
              <h3 className="text-2xl font-bold">Technical Resources</h3>
            </div>
            <div className="space-y-3">
              {technicalFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 rounded-full bg-green-500/20 p-1 text-green-500">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-gray-200">{feature.title}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Core Features */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
          >
            <div className="flex items-center mb-6">
              <BarChart className="w-10 h-10 text-primary-400 mr-4" />
              <h3 className="text-2xl font-bold">Core Features</h3>
            </div>
            <div className="space-y-3">
              {coreFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 rounded-full bg-green-500/20 p-1 text-green-500">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-gray-200">{feature.title}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Support & Onboarding */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
          >
            <div className="flex items-center mb-6">
              <Database className="w-10 h-10 text-primary-400 mr-4" />
              <h3 className="text-2xl font-bold">Support & Onboarding</h3>
            </div>
            <div className="space-y-3">
              {supportFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 rounded-full bg-green-500/20 p-1 text-green-500">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-gray-200">{feature.title}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Transparent Pricing Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-20"
        >
          <h3 className="text-3xl font-bold text-center mb-10">Transparent Pricing Comparison</h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-6 py-4 bg-gray-800 text-left text-white font-semibold rounded-tl-lg">Feature</th>
                  <th className="px-6 py-4 bg-primary-900/70 text-left text-white font-semibold">Our Solution</th>
                  <th className="px-6 py-4 bg-gray-800 text-left text-white font-semibold rounded-tr-lg">Typical CRM Providers</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/50'}>
                    <td className="px-6 py-4 text-gray-300 font-medium">{row.feature}</td>
                    <td className="px-6 py-4 text-primary-400 font-medium">{row.ourSolution}</td>
                    <td className="px-6 py-4 text-gray-400">{row.typical}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Cost Comparison Calculator */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mb-20"
        >
          <h3 className="text-3xl font-bold text-center mb-4">Cost Comparison Calculator</h3>
          <p className="text-xl text-gray-300 text-center max-w-3xl mx-auto mb-10">
            See how much you can save compared to traditional CRM solutions:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-6 py-4 bg-gray-800 text-left text-white font-semibold rounded-tl-lg">Team Size</th>
                  <th className="px-6 py-4 bg-gray-800 text-left text-white font-semibold">Xelytic Monthly Cost</th>
                  <th className="px-6 py-4 bg-primary-900/70 text-left text-white font-semibold">Xelytic Annual Cost (20% off)</th>
                  <th className="px-6 py-4 bg-gray-800 text-left text-white font-semibold">Typical CRM Annual Cost</th>
                  <th className="px-6 py-4 bg-gray-800 text-left text-white font-semibold rounded-tr-lg">Your Annual Savings</th>
                </tr>
              </thead>
              <tbody>
                {savingsData.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/50'}>
                    <td className="px-6 py-4 text-gray-300 font-medium">{row.size}</td>
                    <td className="px-6 py-4 text-gray-300">${row.monthlyCost}</td>
                    <td className="px-6 py-4 text-primary-400 font-medium">${row.annualCost}</td>
                    <td className="px-6 py-4 text-gray-300">${row.typicalCost}</td>
                    <td className="px-6 py-4 text-green-400 font-medium">${row.savings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-400 mt-4 text-center">Based on industry average pricing of $90 per user/month for comparable functionality</p>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          <h3 className="text-3xl font-bold text-center mb-10">Frequently Asked Pricing Questions</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h4 className="text-xl font-bold mb-4">Are there any hidden costs or fees?</h4>
              <p className="text-gray-300">
                No. Xelytic's $150/month price includes everything - all features, all users (up to 20), all storage allocations, and all support. You'll never be surprised by hidden charges or unexpected fees.
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h4 className="text-xl font-bold mb-4">What happens if we need more than 20 users?</h4>
              <p className="text-gray-300 mb-4">
                For teams larger than 20 members, Xelytic offers flexible and affordable scaling options:
              </p>
              <ul className="text-gray-300 list-disc list-inside space-y-2">
                <li>$7/user for additional users beyond the initial 20</li>
                <li>$300/month for 50 users (saving over individual user pricing)</li>
                <li>Custom pricing available for larger teams - contact our sales team to discuss your specific needs</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h4 className="text-xl font-bold mb-4">Do we need to commit to a long-term contract?</h4>
              <p className="text-gray-300">
                No. While we offer a 20% discount for annual commitments, all plans are available on a month-to-month basis with no long-term obligation. You can cancel at any time.
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h4 className="text-xl font-bold mb-4">Can we upgrade our storage limits?</h4>
              <p className="text-gray-300 mb-4">
                Yes. Additional storage can be purchased if you exceed the generous allocations included in your plan:
              </p>
              <ul className="text-gray-300 list-disc list-inside space-y-2">
                <li>Additional file storage: $0.025 per GB/month</li>
                <li>Additional database capacity: $0.15 per GB/month</li>
                <li>Additional bandwidth: $0.10 per GB/month</li>
                <li>Custom storage packages available for high-volume needs</li>
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="mt-16 text-center"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <a
              href="#contact"
              className="px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-lg font-medium transition-colors"
            >
              Start Free Trial
            </a>
            <a
              href="#contact"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-lg text-lg font-medium hover:bg-white/20 transition-colors flex items-center"
            >
              <Shield className="w-5 h-5 mr-2" />
              30-Day Money-Back Guarantee
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}