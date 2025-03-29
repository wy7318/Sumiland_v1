import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown, BarChart2, Users, LineChart, Zap } from 'lucide-react';

export function HeroSection() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  return (
    <motion.section
      style={{ opacity, scale }}
      className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-primary-900 text-white overflow-hidden"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDYwIEwgNjAgMCBNIC0xNSA3NSBMIDc1IC0xNSBNIC0zMCA5MCBMIDkwIC0zMCBNIC00NSAxMDUgTCAxMDUgLTQ1IiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center mb-10"
          >
            <img
              src="https://jaytpfztifhtzcruxguj.supabase.co/storage/v1/object/public/organization-logos/logos/white_logoOnly.png"
              alt="Xelytic CRM Logo"
              className="h-20 md:h-24 mb-4"
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold mb-6"
          >
            Transform Your Business
            <br />
            <span className="text-primary-400">with Smart Analytics</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto"
          >
            Harness the power of data-driven insights with our comprehensive CRM solution.
            Make smarter decisions, grow your business, and delight your customers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="#contact"
              className="px-8 py-4 bg-primary-500 text-white rounded-lg text-lg font-medium hover:bg-primary-600 transition-colors w-full sm:w-auto"
            >
              Get Started Free
            </a>
            <a
              href="#features"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-lg text-lg font-medium hover:bg-white/20 transition-colors w-full sm:w-auto"
            >
              See Features
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20"
          >
            <div>
              <div className="flex items-center justify-center mb-2">
                <Users className="w-6 h-6 text-primary-400" />
              </div>
              <div className="text-4xl font-bold mb-1">10k+</div>
              <div className="text-gray-400">Active Users</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <BarChart2 className="w-6 h-6 text-primary-400" />
              </div>
              <div className="text-4xl font-bold mb-1">85%</div>
              <div className="text-gray-400">Growth Rate</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <LineChart className="w-6 h-6 text-primary-400" />
              </div>
              <div className="text-4xl font-bold mb-1">95%</div>
              <div className="text-gray-400">Satisfaction</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <Zap className="w-6 h-6 text-primary-400" />
              </div>
              <div className="text-4xl font-bold mb-1">24/7</div>
              <div className="text-gray-400">Support</div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="w-8 h-8 text-primary-400 animate-bounce" />
        </motion.div>
      </div>
    </motion.section>
  );
}