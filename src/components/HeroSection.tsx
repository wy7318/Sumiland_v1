import { motion } from 'framer-motion';
import { ChevronDown, ArrowRight } from 'lucide-react';

export function HeroSection() {
  // Function to scroll to ContactSection
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

  return (
    <section className="relative min-h-screen bg-white overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTU2LDE2MywxNzUsMC4xKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Top Section - Hero Content */}
        <div className="pt-32 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Left - Text Content */}
            <div className="lg:col-span-2">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold text-black mb-6 leading-tight"
              >
                CRM Simplified,
                <br />
                AI Amplified.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg md:text-xl text-gray-600 max-w-lg font-light leading-relaxed"
              >
                Harness AI-powered automation to streamline your customer relationships,
                boost productivity, and grow your business with intelligent insights.
              </motion.p>
            </div>

            {/* Right - CTA Buttons */}
            <div className="lg:col-span-1 flex flex-col items-end space-y-4">
              <motion.button
                onClick={scrollToContact}  // ADD THIS LINE
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 w-64"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              <motion.button
                onClick={scrollToContact}  // ADD THIS LINE
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-4 rounded-lg font-medium transition-all duration-200 w-64"
              >
                Watch Demo
              </motion.button>
            </div>
          </div>

          {/* Trust Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-center mt-8 text-sm text-gray-500"
          >
            Trusted by 500+ businesses worldwide
          </motion.div>
        </div>

        {/* Dashboard Mockup Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mb-16"
        >
          <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-3xl p-8 shadow-2xl">
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
              {/* Browser Header */}
              <div className="bg-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-gray-600 text-sm">https://app.simplidone.com/dashboard</div>
                <div className="w-16"></div>
              </div>

              {/* Application Header */}
              <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gray-600 rounded"></div>
                    <span className="font-medium text-gray-700">Sumiland</span>
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search accounts, contacts, leads..."
                      className="w-80 px-4 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                      readOnly
                    />
                    <div className="absolute left-3 top-2.5 w-4 h-4 text-gray-400">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-6 h-6 text-gray-400">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">ML</span>
                    </div>
                    <span className="text-gray-700 text-sm">Matt Lee</span>
                  </div>
                  <span className="text-gray-500 text-sm">2025</span>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex h-96">
                {/* Sidebar */}
                <div className="w-48 bg-gray-50 border-r">
                  <div className="p-4 space-y-1">
                    <div className="flex items-center space-x-3 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span className="text-sm font-medium">Dashboard</span>
                    </div>
                    <div className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                      <div className="w-4 h-4 bg-gray-400 rounded"></div>
                      <span className="text-sm">Accounts</span>
                    </div>
                    <div className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                      <div className="w-4 h-4 bg-gray-400 rounded"></div>
                      <span className="text-sm">Contacts</span>
                    </div>
                    <div className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                      <div className="w-4 h-4 bg-gray-400 rounded"></div>
                      <span className="text-sm">Leads</span>
                    </div>
                    <div className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                      <div className="w-4 h-4 bg-gray-400 rounded"></div>
                      <span className="text-sm">Cases</span>
                    </div>
                    <div className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                      <div className="w-4 h-4 bg-gray-400 rounded"></div>
                      <span className="text-sm">Opportunities</span>
                    </div>
                    <div className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                      <div className="w-4 h-4 bg-gray-400 rounded"></div>
                      <span className="text-sm">Quotes</span>
                    </div>
                    <div className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                      <div className="w-4 h-4 bg-gray-400 rounded"></div>
                      <span className="text-sm">Orders</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Content */}
                <div className="flex-1 p-6 bg-gray-50">
                  {/* Top Row - Charts */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {/* Chart 1 */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-gray-800 mb-1">41</div>
                      <div className="text-xs text-gray-500 mb-3">Group by: status</div>
                      <div className="relative w-16 h-16 mx-auto">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none" stroke="#e5e7eb" strokeWidth="2" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                            fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="40, 100" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                            fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="25, 100" strokeDashoffset="-40" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                            fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="20, 100" strokeDashoffset="-65" />
                        </svg>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        <div>Closed: 23</div>
                        <div>New: 12</div>
                        <div>Assigned: 6</div>
                      </div>
                    </div>

                    {/* Chart 2 */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-gray-800 mb-1">16</div>
                      <div className="text-xs text-gray-500 mb-3">Group by: status</div>
                      <div className="relative w-16 h-16 mx-auto">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none" stroke="#e5e7eb" strokeWidth="2" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                            fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="35, 100" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                            fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="30, 100" strokeDashoffset="-35" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                            fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="20, 100" strokeDashoffset="-65" />
                        </svg>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        <div>New: 5</div>
                        <div>Qualified: 6</div>
                        <div>In Progress: 3</div>
                        <div>Lost: 2</div>
                      </div>
                    </div>

                    {/* Chart 3 */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-gray-800 mb-1">6</div>
                      <div className="text-xs text-gray-500 mb-3">Group by: status</div>
                      <div className="relative w-16 h-16 mx-auto">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none" stroke="#e5e7eb" strokeWidth="2" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                            fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="100, 100" />
                        </svg>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        <div>active: 6</div>
                      </div>
                    </div>

                    {/* Calendar Widget */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-2xl font-bold text-gray-800 mb-1">25</div>
                      <div className="text-xs text-gray-500 mb-3">2025</div>
                      <div className="text-xs">
                        <div className="grid grid-cols-7 gap-1 text-center">
                          <div className="text-gray-400">M</div>
                          <div className="text-gray-400">T</div>
                          <div className="text-gray-400">W</div>
                          <div className="text-gray-400">T</div>
                          <div className="text-gray-400">F</div>
                          <div className="text-gray-400">S</div>
                          <div className="text-gray-400">S</div>
                          <div className="text-gray-300">30</div>
                          <div className="text-gray-300">31</div>
                          <div>1</div>
                          <div>2</div>
                          <div>3</div>
                          <div className="bg-blue-500 text-white rounded">4</div>
                          <div>5</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row - Statistics */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Opportunities */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                            <div className="w-3 h-3 bg-purple-500 rounded"></div>
                          </div>
                          <span className="font-medium">Opportunities</span>
                        </div>
                        <button className="text-blue-500 text-xs">View All</button>
                      </div>
                      <div className="text-2xl font-bold text-gray-800">15</div>
                      <div className="text-sm text-purple-600 font-medium">Total: $52,645.06</div>
                      <div className="mt-3 h-8">
                        <svg className="w-full h-full" viewBox="0 0 100 30">
                          <path d="M5,25 L20,20 L35,15 L50,10 L65,12 L80,8 L95,5"
                            stroke="#8b5cf6" strokeWidth="2" fill="none" />
                          <circle cx="95" cy="5" r="2" fill="#8b5cf6" />
                        </svg>
                      </div>
                    </div>

                    {/* Quotes */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-pink-100 rounded flex items-center justify-center">
                            <div className="w-3 h-3 bg-pink-500 rounded"></div>
                          </div>
                          <span className="font-medium">Quotes</span>
                        </div>
                        <button className="text-blue-500 text-xs">View All</button>
                      </div>
                      <div className="text-2xl font-bold text-gray-800">76</div>
                      <div className="text-sm text-pink-600 font-medium">Total: $37,865.31</div>
                      <div className="mt-3 h-8">
                        <svg className="w-full h-full" viewBox="0 0 100 30">
                          <path d="M5,20 L20,15 L35,8 L50,5 L65,10 L80,18 L95,22"
                            stroke="#ec4899" strokeWidth="2" fill="none" />
                          <circle cx="50" cy="5" r="2" fill="#ec4899" />
                        </svg>
                      </div>
                    </div>

                    {/* Orders */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center">
                            <div className="w-3 h-3 bg-orange-500 rounded"></div>
                          </div>
                          <span className="font-medium">Orders</span>
                        </div>
                        <button className="text-blue-500 text-xs">View All</button>
                      </div>
                      <div className="text-2xl font-bold text-gray-800">37</div>
                      <div className="text-sm text-orange-600 font-medium">Total: $13,254.9</div>
                      <div className="mt-3 h-8">
                        <svg className="w-full h-full" viewBox="0 0 100 30">
                          <path d="M5,25 L20,22 L35,18 L50,12 L65,8 L80,6 L95,4"
                            stroke="#f97316" strokeWidth="2" fill="none" />
                          <circle cx="95" cy="4" r="2" fill="#f97316" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Cards Row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
        >
          {/* Customer Hub Card */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100 hover:shadow-xl transition-all duration-300 group">
            <div className="relative mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">Customer Hub</h3>
            <p className="text-gray-600 text-sm leading-relaxed">Centralize all customer data, interactions, and history in one intelligent dashboard that grows with your business.</p>
          </div>

          {/* Workflow Engine Card */}
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-2xl border border-emerald-100 hover:shadow-xl transition-all duration-300 group">
            <div className="relative mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                <div className="relative">
                  <div className="w-2 h-2 bg-white rounded-full absolute top-1 left-1"></div>
                  <div className="w-2 h-2 bg-white rounded-full absolute top-1 right-1"></div>
                  <div className="w-6 h-0.5 bg-white rounded-full absolute bottom-1 left-0"></div>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                <div className="w-2 h-0.5 bg-white rounded-full"></div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">Workflow Engine</h3>
            <p className="text-gray-600 text-sm leading-relaxed">Automate follow-ups, task assignments, and notifications to keep your team focused on high-value activities.</p>
          </div>

          {/* AI Intelligence Card */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-100 hover:shadow-xl transition-all duration-300 group">
            <div className="relative mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <div className="relative">
                  <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-1 left-2"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-2 left-3"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-3 left-1"></div>
                  <div className="w-4 h-0.5 bg-white rounded-full absolute bottom-1 left-0"></div>
                </div>
              </div>
              <div className="absolute -top-1 -left-1 w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">AI Intelligence</h3>
            <p className="text-gray-600 text-sm leading-relaxed">Get predictive analytics, smart recommendations, and data-driven insights to accelerate business growth.</p>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="w-6 h-6 text-gray-400 animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
}