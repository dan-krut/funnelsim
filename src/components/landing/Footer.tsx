import React from 'react';
import { useWhitelabel } from '@/hooks/useWhitelabel';
import logoDark from '@/assets/logo-dark.png';

// Default footer text
const DEFAULT_FOOTER_TEXT = "The standard for funnel modeling and simulation. Built for marketers who demand data over guesswork.";

export const Footer: React.FC = () => {
  const { config, isLoading } = useWhitelabel();

  // Use whitelabel values with fallbacks
  const brandName = config.brand_name || 'FunnelSim';
  const footerText = config.footer_text || DEFAULT_FOOTER_TEXT;
  const logoUrl = config.logo_dark_url || logoDark;

  return (
    <footer className="bg-dark-900 border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            {!isLoading && (
              <img
                src={logoUrl}
                alt={brandName}
                className="h-8"
                onError={(e) => {
                  // Fallback to default logo if custom logo fails to load
                  (e.target as HTMLImageElement).src = logoDark;
                }}
              />
            )}
          </div>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            {footerText}
          </p>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col items-center justify-center">
          <p className="text-slate-500 text-xs">
            &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
