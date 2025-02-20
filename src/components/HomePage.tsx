import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { ServicesSection } from './ServicesSection';
import { PortfolioSection } from './PortfolioSection';
import { ContactSection } from './ContactSection';
import { TypingEffect } from './TypingEffect';
import { CircularLogo } from './CircularLogo';

export function HomePage() {
  const circleTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!circleTextRef.current) return;

    const text = "CRAFTING DIGITAL EXPERIENCES & CREATIVE SOLUTIONS • ";
    const chars = text.split('');
    const radius = 300;
    
    circleTextRef.current.innerHTML = '';

    chars.forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char;
      
      const angle = (i / chars.length) * Math.PI * 2;
      const x = radius * Math.cos(angle - Math.PI / 2);
      const y = radius * Math.sin(angle - Math.PI / 2);
      
      span.style.position = 'absolute';
      span.style.left = `${x}px`;
      span.style.top = `${y}px`;
      span.style.transform = `rotate(${angle}rad)`;
      span.style.transformOrigin = '0 0';
      
      circleTextRef.current?.appendChild(span);
    });
  }, []);

  return (
    <>
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
        
        <TypingEffect />
        
        <div className="flex items-center justify-center">
          <div className="relative w-[600px] h-[600px] md:w-[700px] md:h-[700px] flex items-center justify-center">
            {/* Circular Logo */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-[300px] h-[300px] md:w-[400px] md:h-[400px]">
                <CircularLogo />
              </div>
            </div>
            
            {/* Rotating Text */}
            <div
              ref={circleTextRef}
              className="absolute animate-spin-slow"
              style={{
                WebkitTextStroke: '2px #037ffc',
                color: 'transparent'
              }}
            >
              <style>
                {`
                  @keyframes spin-slow {
                    from {
                      transform: rotate(0deg);
                    }
                    to {
                      transform: rotate(360deg);
                    }
                  }

                  .animate-spin-slow {
                    animation: spin-slow 20s linear infinite;
                  }

                  #circleTextRef span {
                    position: absolute;
                    font-size: 6rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    white-space: nowrap;
                    transform-origin: 0 0;
                  }

                  @media (min-width: 768px) {
                    #circleTextRef span {
                      font-size: 6.5rem;
                    }
                  }
                `}
              </style>
            </div>
          </div>
        </div>

        <div className="relative mt-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex gap-4 justify-center"
          >
            <a
              href="#portfolio"
              className="bg-primary-500 text-white px-8 py-3 rounded-full text-lg font-medium hover:bg-primary-600 transition-colors duration-300"
            >
              View Our Work
            </a>
            <a
              href="/blog"
              className="border-2 border-primary-500 text-primary-500 px-8 py-3 rounded-full text-lg font-medium hover:bg-primary-50 transition-colors duration-300"
            >
              Read Our Blog
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="w-8 h-8 text-primary-500 animate-bounce" />
        </motion.div>
      </section>

      <ServicesSection />
      <PortfolioSection />
      <ContactSection />
    </>
  );
}