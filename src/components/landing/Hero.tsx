import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { ArrowRight, PlayCircle, Save, X } from 'lucide-react';
import { useWhitelabel } from '@/hooks/useWhitelabel';

// Default hero image
const HERO_IMAGE_URL = "/images/screens1.png";

// Default values for hero content
const DEFAULT_HEADLINE = "Simulate High-Converting Sales Funnels Instantly";
const DEFAULT_SUBHEADLINE = "The first visual funnel builder that predicts your profit before you build. Map out flows, calculate conversions, and optimize ROI in real-time.";
const DEFAULT_BADGE_TEXT = "Early Bird Deal Now Available";
const DEFAULT_CTA_TEXT = "Get Started";

export const Hero: React.FC = () => {
  const { config, isLoading } = useWhitelabel();
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVideoOpen(false);
      }
    };

    if (isVideoOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVideoOpen]);

  // Use whitelabel config values with fallbacks
  const headline = config.hero_headline || DEFAULT_HEADLINE;
  const subheadline = config.hero_subheadline || DEFAULT_SUBHEADLINE;
  const badgeText = config.hero_badge_text || DEFAULT_BADGE_TEXT;
  const ctaText = config.cta_button_text || DEFAULT_CTA_TEXT;

  // Split headline to apply gradient to last part if it contains a line break pattern
  const renderHeadline = () => {
    // Check if headline contains a specific pattern for gradient text
    // Format: "Normal text | Gradient text" or just plain text
    if (headline.includes('|')) {
      const [normalPart, gradientPart] = headline.split('|').map(s => s.trim());
      return (
        <>
          {normalPart} <br className="hidden md:block" />
          <span className="gradient-text">{gradientPart}</span>
        </>
      );
    }

    // Default styling for the default headline
    if (headline === DEFAULT_HEADLINE) {
      return (
        <>
          Simulate High-Converting <br className="hidden md:block" />
          <span className="gradient-text">Sales Funnels Instantly</span>
        </>
      );
    }

    // Just return the headline as-is
    return headline;
  };

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-40 overflow-hidden">
      {/* Background Effects - Darkened */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-violet-900/20 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
      <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-indigo-900/10 rounded-full blur-[100px] -z-10"></div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center mb-8">

          {/* Badge */}
          {badgeText && (
            <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm hover:bg-white/10 transition-colors cursor-default">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-sm text-slate-300 font-medium">{badgeText}</span>
            </div>
          )}

          {/* Headline */}
          <h1 className="text-5xl lg:text-7xl font-display font-bold leading-[1.1] mb-6 tracking-tight max-w-4xl">
            {renderHeadline()}
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-2xl mx-auto">
            {subheadline}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
            <a href="#pricing">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto group px-8 h-14 text-lg"
              >
                {ctaText}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 h-14 text-lg backdrop-blur-sm bg-white/5 border-white/10 hover:bg-white/10"
              onClick={() => setIsVideoOpen(true)}
            >
              <PlayCircle className="mr-2 w-5 h-5" />
              See It In Action
            </Button>
          </div>

        </div>

        {/* APP INTERFACE PLACEHOLDER - NO TILT */}
        <div className="relative mx-auto max-w-6xl -mt-1">

          {/* Float Wrapper */}
          <div className="animate-float" style={{ animationDuration: '8s' }}>

            {/* Window Container */}
            <div className="relative bg-[#0f111a] rounded-xl border border-white/10 shadow-2xl overflow-hidden">

              {/* Window Controls / Header */}
              <div className="h-12 bg-[#161922] border-b border-white/5 flex items-center justify-between px-4 select-none z-20 relative">
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                   <div className="hidden sm:flex items-center text-xs text-slate-500 space-x-2 mr-2">
                    <Save className="w-3 h-3" /> <span>Auto-saved</span>
                  </div>
                </div>
              </div>

              {/* Image Area */}
              <div className="relative h-[400px] md:h-[600px] bg-[#0a0a0f] group">
                {/* Actual Image Tag */}
                <img
                  src={HERO_IMAGE_URL}
                  alt={`${config.brand_name || 'FunnelSim'} Interface`}
                  className="w-full h-full object-cover opacity-90"
                />

                {/* Optional Overlay for better text contrast if needed later */}
                <div className="absolute inset-0 pointer-events-none shadow-inner"></div>
              </div>
            </div>
          </div>

          {/* Glow under the app */}
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[90%] h-20 bg-indigo-500/30 blur-[80px] -z-10 animate-pulse-slow"></div>
        </div>

      </div>

      {/* Video Modal */}
      {isVideoOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setIsVideoOpen(false)}
          ></div>

          {/* Modal Container */}
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-10">
            {/* Close Button */}
            <button
              onClick={() => setIsVideoOpen(false)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-sm"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Video Embed */}
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
              title={`${config.brand_name || 'FunnelSim'} Demo`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    </section>
  );
};
