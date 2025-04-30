import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown, Shield, Sparkles, BarChart2, Clock } from 'lucide-react';

export function HeroSection() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  return (
    <motion.section
      style={{ opacity, scale }}
      className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-primary-900 to-primary-800 text-white overflow-hidden"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDYwIEwgNjAgMCBNIC0xNSA3NSBMIDc1IC0xNSBNIC0zMCA5MCBMIDkwIC0zMCBNIC00NSAxMDUgTCAxMDUgLTQ1IiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />

        {/* Floating Orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary-500/10 blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, -30, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 8,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl"
          animate={{
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 10,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center mb-6"
          >
            <div className="relative">
              <img
                src="https://jaytpfztifhtzcruxguj.supabase.co/storage/v1/object/public/organization-logos/logos/white_logoOnly.png"
                alt="SimpliDone CRM Logo"
                className="h-20 md:h-24 relative z-10"
              />
              <motion.div
                className="absolute -inset-2 bg-primary-500/20 rounded-full blur-lg"
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  ease: "easeInOut"
                }}
              />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold mb-4 tracking-tight"
          >
            <span className="block">Transform Your Business</span>
            <span className="bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">
              with Smart Analytics
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Harness the power of data-driven insights with our comprehensive CRM
            and inventory management solution. Make smarter decisions,
            streamline operations, and delight your customers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5"
          >
            <a
              href="#contact"
              className="group relative px-8 py-4 bg-primary-500 text-white rounded-lg text-lg font-medium transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/30 overflow-hidden w-full sm:w-auto"
            >
              <span className="relative z-10">Start Free Trial</span>
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
            </a>
            <a
              href="#features"
              className="relative px-8 py-4 border border-white/20 bg-white/5 backdrop-blur-sm text-white rounded-lg text-lg font-medium transition-all duration-300 hover:bg-white/10 hover:border-white/30 w-full sm:w-auto"
            >
              Explore Features
            </a>
          </motion.div>

          {/* Stats - Modified to be more aspirational */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 mb-10"
          >
            <motion.div
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10"
            >
              <div className="flex items-center justify-center mb-3">
                <div className="p-2.5 bg-primary-500/20 rounded-lg">
                  <Sparkles className="w-6 h-6 text-primary-400" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">Intuitive</div>
              <div className="text-gray-400">User Experience</div>
            </motion.div>

            <motion.div
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10"
            >
              <div className="flex items-center justify-center mb-3">
                <div className="p-2.5 bg-primary-500/20 rounded-lg">
                  <Clock className="w-6 h-6 text-primary-400" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">5-Min</div>
              <div className="text-gray-400">Quick Setup</div>
            </motion.div>

            <motion.div
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10"
            >
              <div className="flex items-center justify-center mb-3">
                <div className="p-2.5 bg-primary-500/20 rounded-lg">
                  <BarChart2 className="w-6 h-6 text-primary-400" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">97%</div>
              <div className="text-gray-400">Efficiency Boost</div>
            </motion.div>

            <motion.div
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10"
            >
              <div className="flex items-center justify-center mb-3">
                <div className="p-2.5 bg-primary-500/20 rounded-lg">
                  <Shield className="w-6 h-6 text-primary-400" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">24/7</div>
              <div className="text-gray-400">Support</div>
            </motion.div>
          </motion.div>

          {/* Additional trust indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 1, delay: 1 }}
            className="flex items-center justify-center mt-8 text-sm text-gray-400"
          >
            <span>Trusted by businesses from startups to enterprises</span>
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