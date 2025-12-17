import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from './ui/Button';
import { useNavigate } from 'react-router-dom';
import { useWhitelabel } from '@/hooks/useWhitelabel';
import logoDark from '@/assets/logo-dark.png';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { config, isLoading } = useWhitelabel();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Determine which logo to use
  // Priority: config.logo_dark_url > default logoDark
  const logoUrl = config.logo_dark_url || logoDark;
  const brandName = config.brand_name || 'FunnelSim';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-dark-900/80 backdrop-blur-md py-4 shadow-lg shadow-indigo-500/5' : 'bg-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 group cursor-pointer">
            {!isLoading && (
              <img
                src={logoUrl}
                alt={brandName}
                className="h-8 group-hover:scale-105 transition-transform"
                onError={(e) => {
                  // Fallback to default logo if custom logo fails to load
                  (e.target as HTMLImageElement).src = logoDark;
                }}
              />
            )}
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Pricing</a>
            <div className="flex items-center space-x-4 ml-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>Sign In</Button>
              <a href="#pricing"><Button variant="primary" size="sm">Get Started</Button></a>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-300 hover:text-white">
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-dark-900 border-b border-white/5 p-4 animate-in slide-in-from-top-5">
          <div className="flex flex-col space-y-4">
            <a href="#features" className="text-slate-300 hover:text-white py-2">Features</a>
            <a href="#how-it-works" className="text-slate-300 hover:text-white py-2">How it Works</a>
            <a href="#pricing" className="text-slate-300 hover:text-white py-2">Pricing</a>
            <div className="h-px bg-white/10 my-2"></div>
            <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/auth')}>Sign In</Button>
            <a href="#pricing"><Button variant="primary" className="w-full">Get Started</Button></a>
          </div>
        </div>
      )}
    </nav>
  );
};
