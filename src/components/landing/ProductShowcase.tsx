import React from 'react';
import { CheckCircle2, MousePointer2, TrendingUp, Layers, ArrowRight, Zap } from 'lucide-react';
import { Button } from './ui/Button';
import { useWhitelabel } from '@/hooks/useWhitelabel';

// Custom SVG Data URIs for subtle placeholder appearance
const IMAGES = {
  BUILDER: "data:image/svg+xml,%3Csvg width='800' height='600' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%230f111a'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-weight='600' font-size='24' text-anchor='middle' dominant-baseline='middle' fill='%236366f1' fill-opacity='0.15' letter-spacing='0.2em'%3EVISUAL BUILDER%3C/text%3E%3C/svg%3E",
  
  SIMULATION: "data:image/svg+xml,%3Csvg width='800' height='600' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%230f111a'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-weight='600' font-size='24' text-anchor='middle' dominant-baseline='middle' fill='%2310b981' fill-opacity='0.15' letter-spacing='0.2em'%3EPROFIT SIMULATION%3C/text%3E%3C/svg%3E",
  
  DASHBOARD: "data:image/svg+xml,%3Csvg width='800' height='600' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%230f111a'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-weight='600' font-size='24' text-anchor='middle' dominant-baseline='middle' fill='%23a855f7' fill-opacity='0.15' letter-spacing='0.2em'%3EDASHBOARD VIEW%3C/text%3E%3C/svg%3E",
  
  WIZARD: "data:image/svg+xml,%3Csvg width='800' height='600' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%230f111a'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-weight='600' font-size='24' text-anchor='middle' dominant-baseline='middle' fill='%23f59e0b' fill-opacity='0.15' letter-spacing='0.2em'%3EWIZARD INTERFACE%3C/text%3E%3C/svg%3E"
};

export const ProductShowcase: React.FC = () => {
  const { config } = useWhitelabel();
  const brandName = config.brand_name || 'FunnelSim';

  return (
    <div className="bg-dark-900 relative overflow-hidden">
       {/* Shared background elements */}
       <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent"></div>
       
       {/* SECTION 1: VISUAL BUILDER (Text Left, Image Right) */}
       <section className="py-24 lg:py-32 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              
              {/* Text Content */}
              <div className="order-1">
                <div className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-400 text-sm font-medium px-3 py-1 rounded-full mb-6">
                    <MousePointer2 className="w-4 h-4" />
                    <span>Visual Canvas</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6 leading-tight">
                  Stop Building Blindly. <br/>
                  <span className="text-indigo-400">Map It Before You Build.</span>
                </h2>
                <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                  Most marketers guess. You calculate. Use our intuitive drag-and-drop canvas to visualize every step of the customer journey before you spend a dime on ads.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    "Drag-and-drop React Flow interface",
                    "Custom nodes for OTOs, Downsells, and Bumps",
                    "Visual branching logic for 'Yes/No' pathways"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      </div>
                      <span className="text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
                
                <a href="#pricing">
                  <Button variant="outline" className="group border-indigo-500/20 hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/50">
                    Try the Builder
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
              </div>

              {/* Image/Graphic */}
              <div className="order-2 relative group">
                 <div className="absolute inset-0 bg-indigo-600/20 blur-[100px] -z-10 rounded-full opacity-50"></div>
                 <div className="bg-[#0f111a] rounded-xl border border-white/10 shadow-2xl overflow-hidden h-[400px] flex flex-col transform transition-transform hover:scale-[1.02] duration-500">
                    <div className="h-10 border-b border-white/5 bg-[#161922] flex items-center px-4 space-x-2">
                        <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500/20"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500/20"></div>
                    </div>
                    <div className="flex-1 bg-[#0a0a0f] relative flex items-center justify-center overflow-hidden">
                         <img src="/images/funnel1.png" alt="Visual Builder" className="w-full h-full object-cover opacity-90" />
                    </div>
                 </div>
              </div>

            </div>
          </div>
       </section>

       {/* SECTION 2: ECONOMICS & SIMULATION (Image Left, Text Right) */}
       <section className="py-24 lg:py-32 relative bg-dark-800/30 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              
              {/* Image/Graphic */}
              <div className="order-2 lg:order-1 relative group">
                 <div className="absolute inset-0 bg-emerald-500/10 blur-[100px] -z-10 rounded-full opacity-50"></div>
                 <div className="bg-[#0f111a] rounded-xl border border-white/10 shadow-2xl overflow-hidden h-[400px] flex flex-col transform transition-transform hover:scale-[1.02] duration-500">
                    <div className="h-10 border-b border-white/5 bg-[#161922] flex items-center px-4 space-x-2">
                        <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                    </div>
                    <div className="flex-1 bg-[#0a0a0f] relative flex items-center justify-center overflow-hidden">
                         <img src="/images/profit1.png" alt="Profit Simulation" className="w-full h-full object-cover opacity-90" />
                    </div>
                 </div>
              </div>

              {/* Text Content */}
              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 text-sm font-medium px-3 py-1 rounded-full mb-6">
                    <TrendingUp className="w-4 h-4" />
                    <span>Profit Simulation</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6 leading-tight">
                  Simulate Traffic. <br/>
                  <span className="text-emerald-400">Predict Profit.</span>
                </h2>
                <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                  What if your conversion rate drops by 2%? What if CPA increases by $5? Tweak the numbers and see the impact on your bottom line instantly. It's like a crystal ball for your funnel.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    "Calculate EPC (Earnings Per Click) instantly",
                    "Input different traffic costs for multiple scenarios",
                    "Identify bottlenecks in your sequence"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>

                <a href="#pricing">
                  <Button variant="outline" className="group border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/50">
                    Explore Analytics
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
       </section>

       {/* SECTION 3: MANAGEMENT (Text Left, Image Right) */}
       <section className="py-24 lg:py-32 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              
              {/* Text Content */}
              <div className="order-1">
                <div className="inline-flex items-center space-x-2 bg-purple-500/10 text-purple-400 text-sm font-medium px-3 py-1 rounded-full mb-6">
                    <Layers className="w-4 h-4" />
                    <span>Scalable Management</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6 leading-tight">
                  Manage All Your <br/>
                  <span className="text-purple-400">Campaigns in One Place</span>
                </h2>
                <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                   Keep your entire marketing ecosystem organized. Clone best-performing funnels, compare ROI across different campaigns, and share results with your team instantly.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    "Project Organization & Grouping",
                    "One-click funnel cloning and duplication",
                    "Secure cloud storage for all your assets"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                      </div>
                      <span className="text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
                
                <a href="#pricing">
                  <Button variant="outline" className="group border-purple-500/20 hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/50">
                    Start Organizing Now
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
              </div>

              {/* Image/Graphic */}
              <div className="order-2 relative group">
                 <div className="absolute inset-0 bg-purple-600/20 blur-[100px] -z-10 rounded-full opacity-50"></div>
                 <div className="bg-[#0f111a] rounded-xl border border-white/10 shadow-2xl overflow-hidden h-[400px] flex flex-col transform transition-transform hover:scale-[1.02] duration-500">
                    <div className="h-10 border-b border-white/5 bg-[#161922] flex items-center px-4 space-x-2">
                       <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                    </div>
                    <div className="flex-1 bg-[#0a0a0f] relative flex items-center justify-center overflow-hidden">
                         <img src="images/dashboard1.png" alt="Dashboard View" className="w-full h-full object-cover opacity-90" />
                    </div>
                 </div>
              </div>

            </div>
          </div>
       </section>

        {/* SECTION 4: WIZARD (Image Left, Text Right) */}
       <section className="py-24 lg:py-32 relative bg-dark-800/30 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">

              {/* Image/Graphic */}
              <div className="order-2 lg:order-1 relative group">
                 <div className="absolute inset-0 bg-amber-500/10 blur-[100px] -z-10 rounded-full opacity-50"></div>
                 <div className="bg-[#0f111a] rounded-xl border border-white/10 shadow-2xl overflow-hidden h-[400px] flex flex-col transform transition-transform hover:scale-[1.02] duration-500">
                    <div className="h-10 border-b border-white/5 bg-[#161922] flex items-center px-4 space-x-2">
                        <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                    </div>
                    <div className="flex-1 bg-[#0a0a0f] relative flex items-center justify-center overflow-hidden">
                         <img src="images/wizard.png" alt="Wizard Interface" className="w-full h-full object-cover opacity-90" />
                    </div>
                 </div>
              </div>

              {/* Text Content */}
              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center space-x-2 bg-amber-500/10 text-amber-400 text-sm font-medium px-3 py-1 rounded-full mb-6">
                    <Zap className="w-4 h-4" />
                    <span>Quick Build</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6 leading-tight">
                  Model Your Entire Funnel <br/>
                  <span className="text-amber-400">In Seconds.</span>
                </h2>
                <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                   Skip the manual setup. Define your products, traffic sources, and costs in our intuitive wizard, and watch as {brandName} generates the entire simulation instantly.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    "Define product hierarchy (Frontend, OTOs, Downsells)",
                    "Outline traffic sources and acquisition costs",
                    "One-click simulation generation"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>

                <a href="#pricing">
                  <Button variant="outline" className="group border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/50">
                    Try the Wizard
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
       </section>
    </div>
  );
};