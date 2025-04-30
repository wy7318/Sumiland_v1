import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, ShieldCheck, Clock, Users, Database, BarChart, HelpCircle, Server, Plus, ArrowRight, RefreshCw } from 'lucide-react';

export function PricingSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [annual, setAnnual] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [showComparison, setShowComparison] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [teamSize, setTeamSize] = useState(10);

  // Feature categories
  const featureCategories = [
    { id: "all", name: "All Features" },
    { id: "team", name: "Team Capacity", icon: <Users className="w-4 h-4" /> },
    { id: "technical", name: "Technical", icon: <Server className="w-4 h-4" /> },
    { id: "core", name: "Core Features", icon: <BarChart className="w-4 h-4" /> },
    { id: "support", name: "Support", icon: <Database className="w-4 h-4" /> }
  ];

  // Feature list data
  const allFeatures = {
    team: [
      { title: "Up to 20 team members included", included: true },
      { title: "No per-user charges", included: true },
      { title: "Unlimited admin accounts", included: true },
      { title: "Customizable user permissions", included: true },
      { title: "Team performance analytics", included: true }
    ],
    technical: [
      { title: "Support for 250,000 customer profiles", included: true },
      { title: "200GB file storage for documents and media", included: true },
      { title: "10GB database storage capacity", included: true },
      { title: "500GB monthly bandwidth", included: true },
      { title: "Daily backups with 7-day retention", included: true },
      { title: "Flexible scaling options available", included: true }
    ],
    core: [
      { title: "Contact Management", included: true },
      { title: "Sales Pipeline", included: true },
      { title: "Marketing Tools", included: true },
      { title: "Customer Service Module", included: true },
      { title: "Comprehensive Analytics", included: true },
      { title: "Mobile Apps (iOS & Android)", included: true },
      { title: "Email Integration", included: true },
      { title: "Inventory Management", included: true },
      { title: "CRM & Inventory Integration", included: true }
    ],
    support: [
      { title: "Guided implementation process", included: true },
      { title: "Data migration assistance", included: true },
      { title: "Personalized onboarding sessions", included: true },
      { title: "Email support with 24-hour response time", included: true },
      { title: "Access to knowledge base and tutorials", included: true },
      { title: "Monthly feature update webinars", included: true }
    ]
  };

  // Comparison data
  const comparisonData = [
    { feature: "Monthly Base Fee", ourSolution: "$150 flat rate", typical: "$25-300 per user" },
    { feature: "Additional User Fees", ourSolution: "None (up to 20 users)", typical: "$15-150 per user/month" },
    { feature: "Premium Features", ourSolution: "All included", typical: "$20-100 per feature/month" },
    { feature: "Implementation Fees", ourSolution: "Included", typical: "$1,500-5,000 one-time" },
    { feature: "Storage Limits", ourSolution: "200GB included", typical: "$15-25 per additional GB" },
    { feature: "Support Access", ourSolution: "Included for all users", typical: "Premium tiers only" },
    { feature: "Contract Length", ourSolution: "Month-to-month available", typical: "Annual commitment required" },
    { feature: "Inventory Management", ourSolution: "Included", typical: "Additional module ($50-100/mo)" },
    { feature: "CRM + Inventory Integration", ourSolution: "Seamless built-in", typical: "Complex custom integration" }
  ];

  // Calculate savings based on team size
  const calculateSavings = (size) => {
    const monthlyCost = 150;
    const annualCost = annual ? 1440 : 120; // $150 * 12 = $1800, with annual 20% off = $1440
    const typicalCost = annual ? size * 150 * 12 : size * 150; // $150 per user per month * 12 months (average enterprise CRM cost)
    const savings = typicalCost - annualCost;
    return {
      monthlyCost,
      annualCost,
      typicalCost,
      savings
    };
  };

  // Get current features to display
  const getVisibleFeatures = () => {
    if (activeTab === "all") {
      return [
        ...allFeatures.team.slice(0, 2),
        ...allFeatures.technical.slice(0, 2),
        ...allFeatures.core.slice(0, 3),
        ...allFeatures.support.slice(0, 2)
      ];
    }
    return allFeatures[activeTab];
  };

  return (
    <section ref={ref} id="pricing" className="py-24 relative overflow-hidden bg-white">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white z-0"></div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500 to-transparent"></div>
      <div className="absolute -right-64 top-1/3 w-96 h-96 rounded-full bg-primary-50 blur-3xl opacity-30 z-0"></div>
      <div className="absolute -left-64 bottom-1/3 w-96 h-96 rounded-full bg-blue-50 blur-3xl opacity-30 z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block"
          >
            <span className="bg-primary-50 text-primary-800 text-sm font-medium px-3 py-1 rounded-full">
              Simple Pricing
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-bold mt-4 mb-4"
          >
            <span className="text-gray-900">Transparent </span>
            <span className="bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
              All-Inclusive Pricing
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            One simple price for everything you need. No per-user fees,
            no feature limitations, no surprises.
          </motion.p>
        </div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center justify-center mb-10"
        >
          <div className="flex items-center p-1 bg-gray-100 rounded-full">
            <button
              onClick={() => setAnnual(false)}
              className={`relative px-6 py-2 rounded-full transition-all duration-200 ${!annual
                  ? "text-primary-900 font-medium"
                  : "text-gray-600 hover:text-gray-900"
                }`}
            >
              {!annual && (
                <motion.div
                  layoutId="billingPill"
                  className="absolute inset-0 bg-primary-100 rounded-full -z-10"
                />
              )}
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`relative px-6 py-2 rounded-full transition-all duration-200 ${annual
                  ? "text-primary-900 font-medium"
                  : "text-gray-600 hover:text-gray-900"
                }`}
            >
              {annual && (
                <motion.div
                  layoutId="billingPill"
                  className="absolute inset-0 bg-primary-100 rounded-full -z-10"
                />
              )}
              Annual
              {annual && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">-20%</span>
              )}
            </button>
          </div>
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100">
            <div className="grid md:grid-cols-5">
              {/* Left Section (2/5) */}
              <div className="md:col-span-2 bg-gradient-to-br from-primary-600 to-blue-700 text-white p-8 md:p-10 flex flex-col justify-between">
                <div>
                  <h3 className="text-3xl font-bold mb-2">Essential Plan</h3>
                  <p className="text-white/80 mb-6">Complete CRM & Inventory Solution</p>

                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-5xl font-bold">${annual ? '120' : '150'}</span>
                    <span className="text-white/80">per month</span>
                  </div>

                  {annual && (
                    <div className="bg-white/20 rounded-lg p-3 mb-6">
                      <p className="text-white font-medium">
                        ${annual ? '1,440' : '1,800'} billed annually
                        {annual && <span className="ml-2 text-green-300">(Save $360)</span>}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 mb-8">
                    <div className="flex items-center text-white/90">
                      <Check className="w-5 h-5 mr-2 text-green-300" />
                      <span>Up to 20 users included</span>
                    </div>
                    <div className="flex items-center text-white/90">
                      <Check className="w-5 h-5 mr-2 text-green-300" />
                      <span>All features included</span>
                    </div>
                    <div className="flex items-center text-white/90">
                      <Check className="w-5 h-5 mr-2 text-green-300" />
                      <span>No hidden fees</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-white/80 text-sm">
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    <span>30-day money-back guarantee</span>
                  </div>
                  <div className="flex items-center text-white/80 text-sm">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>14-day free trial (no credit card required)</span>
                  </div>
                </div>
              </div>

              {/* Right Section (3/5) */}
              <div className="md:col-span-3 p-8 md:p-10">
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-gray-900 mb-3">Included Features</h4>
                  <p className="text-gray-600">
                    All features are included in one simple price - no tiered packages or premium add-ons.
                  </p>
                </div>

                {/* Feature category tabs */}
                <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
                  {featureCategories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setActiveTab(category.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${activeTab === category.id
                          ? "bg-primary-100 text-primary-800"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                      {category.icon && <span>{category.icon}</span>}
                      {category.name}
                    </button>
                  ))}
                </div>

                {/* Feature list */}
                <div className="space-y-2 mb-8">
                  {getVisibleFeatures().map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="rounded-full bg-green-100 p-1 mt-0.5">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-gray-700">{feature.title}</span>
                    </div>
                  ))}

                  {/* Show all link when on a specific tab */}
                  {activeTab !== "all" && (
                    <button
                      onClick={() => setActiveTab("all")}
                      className="text-primary-600 font-medium text-sm hover:text-primary-700 flex items-center mt-2"
                    >
                      View feature summary
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="#contact"
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors text-center"
                  >
                    Start Free Trial
                  </a>
                  <a
                    href="#contact"
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors text-center"
                  >
                    Schedule Demo
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Interactive Analysis Tools Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Pricing Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
          >
            <div
              className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setShowComparison(!showComparison)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-4">
                    <RefreshCw className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Pricing Comparison</h3>
                    <p className="text-gray-600">See how we compare to other providers</p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform ${showComparison ? 'rotate-180' : ''}`}
                />
              </div>
            </div>

            <AnimatePresence>
              {showComparison && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden border-t border-gray-100"
                >
                  <div className="overflow-x-auto px-6 pb-6">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-3 text-left text-sm font-semibold text-gray-900 w-1/3">Feature</th>
                          <th className="py-3 text-left text-sm font-semibold text-primary-600 w-1/3">SimpliDone</th>
                          <th className="py-3 text-left text-sm font-semibold text-gray-900 w-1/3">Typical CRM Providers</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonData.map((row, index) => (
                          <tr key={index} className="border-b border-gray-100 last:border-b-0">
                            <td className="py-3 text-sm text-gray-700 font-medium">{row.feature}</td>
                            <td className="py-3 text-sm text-primary-700 font-medium">{row.ourSolution}</td>
                            <td className="py-3 text-sm text-gray-600">{row.typical}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Savings Calculator */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
          >
            <div
              className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setShowCalculator(!showCalculator)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Savings Calculator</h3>
                    <p className="text-gray-600">See how much your team can save</p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform ${showCalculator ? 'rotate-180' : ''}`}
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
                  className="overflow-hidden border-t border-gray-100"
                >
                  <div className="p-6">
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Number of Users</label>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={teamSize}
                          onChange={(e) => setTeamSize(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="ml-3 w-10 text-center">
                          <span className="inline-block px-2.5 py-1 bg-primary-100 text-primary-800 text-sm font-medium rounded-md">
                            {teamSize}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1</span>
                        <span>5</span>
                        <span>10</span>
                        <span>15</span>
                        <span>20</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500 mb-1">SimpliDone {annual ? 'Annual' : 'Monthly'}</p>
                        <p className="text-2xl font-bold text-primary-700">
                          ${annual ? calculateSavings(teamSize).annualCost : calculateSavings(teamSize).monthlyCost}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500 mb-1">Typical CRM {annual ? 'Annual' : 'Monthly'}</p>
                        <p className="text-2xl font-bold text-gray-700">
                          ${calculateSavings(teamSize).typicalCost}
                        </p>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
                      <p className="text-sm text-green-700 mb-1">Your {annual ? 'Annual' : 'Monthly'} Savings</p>
                      <p className="text-3xl font-bold text-green-600">
                        ${calculateSavings(teamSize).savings}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Based on industry average of $150 per user/month for enterprise CRMs
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* FAQ Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mb-16"
        >
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold">Frequently Asked Questions</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 bg-primary-50 rounded-lg p-2 mr-4">
                  <HelpCircle className="w-5 h-5 text-primary-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Are there any hidden costs?</h4>
              </div>
              <p className="text-gray-600">
                No. SimpliDone's $150/month price includes everything - all features, all users (up to 20), all storage allocations, and all support. You'll never be surprised by hidden charges or unexpected fees.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 bg-primary-50 rounded-lg p-2 mr-4">
                  <HelpCircle className="w-5 h-5 text-primary-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">What if we need more than 20 users?</h4>
              </div>
              <p className="text-gray-600 mb-2">
                For teams larger than 20 members, we offer flexible and affordable scaling options:
              </p>
              <ul className="text-gray-600 space-y-1">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>$7/user for additional users beyond the initial 20</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>$300/month for 50 users (saving over individual pricing)</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 bg-primary-50 rounded-lg p-2 mr-4">
                  <HelpCircle className="w-5 h-5 text-primary-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Do we need a long-term contract?</h4>
              </div>
              <p className="text-gray-600">
                No. While we offer a 20% discount for annual commitments, all plans are available on a month-to-month basis with no long-term obligation. You can cancel at any time.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 bg-primary-50 rounded-lg p-2 mr-4">
                  <HelpCircle className="w-5 h-5 text-primary-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Can we upgrade our storage limits?</h4>
              </div>
              <p className="text-gray-600 mb-2">
                Yes. Additional storage can be purchased if you exceed the generous allocations included in your plan:
              </p>
              <ul className="text-gray-600 space-y-1">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Additional file storage: $0.025 per GB/month</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Additional database capacity: $0.15 per GB/month</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl p-10 shadow-lg">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to transform your business?</h3>
            <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
              Start your 14-day free trial today. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#contact"
                className="px-8 py-4 bg-white text-primary-700 rounded-lg text-lg font-medium hover:bg-white/90 transition-colors shadow-lg w-full sm:w-auto"
              >
                Start Free Trial
              </a>
              <a
                href="#contact"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-lg text-lg font-medium hover:bg-white/20 transition-colors w-full sm:w-auto"
              >
                Schedule Demo
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}