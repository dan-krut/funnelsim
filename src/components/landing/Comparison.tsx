import React from 'react';
import { X, Check, FileSpreadsheet, Zap } from 'lucide-react';
import { useWhitelabel } from '@/hooks/useWhitelabel';

export const Comparison: React.FC = () => {
  const { config } = useWhitelabel();
  const brandName = config.brand_name || 'FunnelSim';

  return (
    <section className="py-24 relative border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
            Spreadsheets weren't built for <span className="text-indigo-400">Funnels</span>
          </h2>
          <p className="text-slate-400 text-lg">
            Stop trying to visualize complex user journeys in rows and columns. 
            Upgrade to a tool built specifically for the job.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
          
          {/* The Old Way */}
          <div className="relative p-8 rounded-2xl border border-white/5 bg-dark-800/30 flex flex-col">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-dark-900 border border-white/10 rounded-full flex items-center justify-center z-10">
                <FileSpreadsheet className="w-5 h-5 text-slate-500" />
            </div>
            
            <h3 className="text-xl font-bold text-slate-400 text-center mt-4 mb-8">The Spreadsheet Way</h3>
            
            <ul className="space-y-6">
              {[
                "Hard to visualize the actual customer journey",
                "Formula errors break the entire projection",
                "Clients don't understand static tables",
                "Zero visual connection between steps",
                "Hours spent formatting cells and rows"
              ].map((item, i) => (
                <li key={i} className="flex items-start space-x-4 text-slate-500">
                  <X className="w-5 h-5 shrink-0 text-red-500/50 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* The brandName Way */}
          <div className="relative p-8 rounded-2xl border border-indigo-500/30 bg-indigo-900/5 flex flex-col">
            
            {/* Inner container for background effects with overflow hidden */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                {/* Glow Effect */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
                <div className="absolute inset-0 bg-indigo-500/5 blur-3xl -z-10"></div>
            </div>

            {/* Icon - positioned outside the overflow hidden container */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 z-10 flex items-center justify-center">
                
                {/* Orbiting Trace Animation */}
                <div className="absolute inset-0 animate-spin [animation-duration:3s]">
                     {/* The Dot */}
                     <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-[3px] w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_8px_2px_rgba(129,140,248,0.6)]"></div>
                </div>

                {/* Static Track Ring */}
                <div className="absolute inset-0 rounded-full border border-indigo-500/20"></div>
                
                {/* Actual Icon */}
                <div className="relative w-12 h-12 bg-indigo-600 border border-indigo-400 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Zap className="w-5 h-5 text-white fill-current" />
                </div>
            </div>

            <h3 className="text-xl font-bold text-white text-center mt-4 mb-8 relative z-10">The {brandName} Way</h3>
            
            <ul className="space-y-6 relative z-10">
              {[
                "Crystal clear visual flow map",
                "Real-time, error-free calculations",
                "Impress clients with professional diagrams",
                "Instant 'What-If' scenario modeling",
                "Builds in minutes with drag-and-drop"
              ].map((item, i) => (
                <li key={i} className="flex items-start space-x-4 text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-indigo-400" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
};