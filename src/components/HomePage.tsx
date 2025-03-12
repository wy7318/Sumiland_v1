import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ServicesSection } from './ServicesSection';
import { ContactSection } from './ContactSection';
import { HeroSection } from './HeroSection';
import { PricingSection } from './PricingSection';

export function HomePage() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <PricingSection />
      <ContactSection />
    </>
  );
}