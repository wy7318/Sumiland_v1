import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { SEO } from './SEO';
import { HeroSection } from './HeroSection';
import { FeaturesHubSection } from './FeaturesHubSection';
import { ServicesSection } from './ServicesSection';
import { TestimonialsSection } from './TestimonialsSection';
import { PricingSection } from './PricingSection';
import { IntegrationsSection } from './IntegrationsSection';
import { FAQSection } from './FAQSection';
import { ContactSection } from './ContactSection';
import { FooterSection } from './FooterSection';

export function HomePage() {
  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <SEO
        title="Xelytic CRM | Transform Your Business with Smart Analytics"
        description="Harness the power of data-driven insights with Xelytic CRM. Make smarter decisions, grow your business, and delight your customers with our comprehensive solution."
        keywords="CRM, customer relationship management, analytics, business intelligence, sales automation, customer support, business growth"
      />

      <main className="bg-gradient-to-b from-gray-900 via-primary-900 to-gray-900 text-white">
        <HeroSection />
        <FeaturesHubSection />
        <ServicesSection />
        <TestimonialsSection />
        <PricingSection />
        <IntegrationsSection />
        <FAQSection />
        <ContactSection />
        <FooterSection />
      </main>
    </>
  );
}