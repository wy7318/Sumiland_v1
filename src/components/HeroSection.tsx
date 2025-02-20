import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { ParticleBackground } from './ParticleBackground';

export function HeroSection() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  
  return (
    <motion.section
      style={{ opacity, scale }}
      className="relative min-h-screen flex items-center justify-center text-center px-4"
    >
      <ParticleBackground />
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-6xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-600"
        >
          Crafting Digital Excellence
        </motion.h1>
        <motion.p
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xl text-gray-600 mb-8"
        >
          We transform ideas into exceptional digital experiences
        </motion.p>
        <motion.button
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="bg-primary-500 text-white px-8 py-3 rounded-full text-lg font-medium hover:bg-primary-600 transition-colors duration-300"
        >
          View Our Work
        </motion.button>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="w-8 h-8 text-primary-500 animate-bounce" />
        </motion.div>
      </div>
    </motion.section>
  );
}