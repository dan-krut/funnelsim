import React from 'react';
import { Button } from './ui/Button';
import { ArrowRight, Sparkles } from 'lucide-react';
export const CTA: React.FC = () => {
  return (
    <section className="py-12 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-[#0a0a0f] shadow-2xl">

        {/* --- Background Effects (Contained within the box) --- */}

        {/* Ambient Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>

        {/* Texture Overlays */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none"></div>
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" style={{ maskImage: 'radial-gradient(black, transparent 70%)', WebkitMaskImage: 'radial-gradient(black, transparent 70%)' }}></div>

        {/* --- Content --- */}
        <div className="relative z-10 py-20 md:py-28 px-6 text-center">

          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm shadow-lg shadow-indigo-500/10 hover:bg-indigo-500/20 transition-colors cursor-default">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-300 font-medium">Start building for free</span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 tracking-tight leading-tight">
            Ready to optimize <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 animate-gradient-x">
              your funnel strategy?
            </span>
          </h2>

          {/* Subhead */}
          <p className="text-slate-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop wrestling with spreadsheets and start predicting profit. Visualize, calculate, and optimize your next funnel in minutes.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <a href="#pricing">
              <Button variant="primary" size="lg" className="w-full sm:w-auto px-10 h-14 text-lg shadow-xl shadow-indigo-500/20 group">
                Get Started Now
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 pt-10 border-t border-white/5 flex flex-wrap justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            <p className="w-full text-center text-xs font-mono uppercase tracking-widest mb-2 text-slate-600">Trusted by teams at</p>
            <div className="flex items-center space-x-8 md:space-x-12">
              <span className="text-lg font-display font-bold text-slate-500">Acme Corp</span>
              <span className="text-lg font-display font-bold text-slate-500">GlobalScale</span>
              <span className="text-lg font-display font-bold text-slate-500">FunnelHacks</span>
              <span className="text-lg font-display font-bold text-slate-500">Growth.io</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};