import React, { useEffect } from 'react';
import { WhitelabelProvider, useWhitelabel } from '@/hooks/useWhitelabel';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { ProductShowcase } from '@/components/landing/ProductShowcase';
import { Comparison } from '@/components/landing/Comparison';
import { Testimonials } from '@/components/landing/Testimonials';
import { FAQ } from '@/components/landing/FAQ';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';

/**
 * Inner component that handles document title and favicon updates
 * Must be inside WhitelabelProvider to access config
 */
const DocumentHead: React.FC = () => {
  const { config } = useWhitelabel();

  useEffect(() => {
    // Update document title
    const brandName = config.brand_name || 'FunnelSim';
    const tagline = config.tagline;
    document.title = tagline ? `${brandName} - ${tagline}` : brandName;

    // Update favicon if configured
    if (config.favicon_url) {
      const existingFavicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (existingFavicon) {
        existingFavicon.href = config.favicon_url;
      } else {
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.href = config.favicon_url;
        document.head.appendChild(favicon);
      }
    }
  }, [config.brand_name, config.tagline, config.favicon_url]);

  return null;
};

const Landing: React.FC = () => {
  return (
    <WhitelabelProvider>
      <DocumentHead />
      <div className="min-h-screen bg-dark-900 text-slate-200 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
        {/* Global Background Grid Pattern */}
        <div className="fixed inset-0 z-0 pointer-events-none bg-grid opacity-20"></div>

        <Navbar />

        <main className="relative z-10">
          <Hero />
          <Features />
          <ProductShowcase />
          <Comparison />
          <Testimonials />
          <CTA />
          <FAQ />
        </main>

        <Footer />
      </div>
    </WhitelabelProvider>
  );
};

export default Landing;
