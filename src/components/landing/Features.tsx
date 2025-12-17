import React, { useRef, useState } from 'react';
import { MousePointer2, Calculator, Share2, Cloud, Zap, Layout, Star, Shield, Users, Rocket, Target, Globe } from 'lucide-react';
import { useWhitelabel, DEFAULT_FEATURES } from '@/hooks/useWhitelabel';
import type { WhitelabelFeature } from '@/integrations/supabase/types';

// Icon mapping for dynamic features
const iconMap: Record<string, React.ReactNode> = {
  MousePointer2: <MousePointer2 className="w-6 h-6 text-indigo-400" />,
  Calculator: <Calculator className="w-6 h-6 text-emerald-400" />,
  Zap: <Zap className="w-6 h-6 text-amber-400" />,
  Cloud: <Cloud className="w-6 h-6 text-sky-400" />,
  Share2: <Share2 className="w-6 h-6 text-purple-400" />,
  Layout: <Layout className="w-6 h-6 text-pink-400" />,
  Star: <Star className="w-6 h-6 text-yellow-400" />,
  Shield: <Shield className="w-6 h-6 text-green-400" />,
  Users: <Users className="w-6 h-6 text-blue-400" />,
  Rocket: <Rocket className="w-6 h-6 text-red-400" />,
  Target: <Target className="w-6 h-6 text-orange-400" />,
  Globe: <Globe className="w-6 h-6 text-cyan-400" />,
};

// Color mapping for spotlight effects
const spotlightColors: Record<string, string> = {
  MousePointer2: "rgba(99, 102, 241, 0.15)", // Indigo
  Calculator: "rgba(16, 185, 129, 0.15)", // Emerald
  Zap: "rgba(245, 158, 11, 0.15)", // Amber
  Cloud: "rgba(14, 165, 233, 0.15)", // Sky
  Share2: "rgba(168, 85, 247, 0.15)", // Purple
  Layout: "rgba(236, 72, 153, 0.15)", // Pink
  Star: "rgba(234, 179, 8, 0.15)", // Yellow
  Shield: "rgba(34, 197, 94, 0.15)", // Green
  Users: "rgba(59, 130, 246, 0.15)", // Blue
  Rocket: "rgba(239, 68, 68, 0.15)", // Red
  Target: "rgba(249, 115, 22, 0.15)", // Orange
  Globe: "rgba(6, 182, 212, 0.15)", // Cyan
};

// Default column spans based on feature index for visual layout
const getColSpan = (index: number): string => {
  const pattern = ['lg:col-span-2', 'lg:col-span-1', 'lg:col-span-1', 'lg:col-span-2', 'lg:col-span-1', 'lg:col-span-2'];
  return pattern[index % pattern.length];
};

interface FeatureCardProps {
  feature: {
    title: string;
    description: string;
    icon?: string;
    colSpan?: string;
    spotlightColor?: string;
  };
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, index }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  // Get icon and spotlight color
  const iconName = feature.icon || 'Zap';
  const icon = iconMap[iconName] || <Zap className="w-6 h-6 text-indigo-400" />;
  const spotlightColor = feature.spotlightColor || spotlightColors[iconName] || "rgba(99, 102, 241, 0.15)";
  const colSpan = feature.colSpan || getColSpan(index);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`${colSpan} group relative p-8 rounded-2xl border border-white/5 bg-dark-800/50 hover:bg-dark-800 transition-all duration-300 hover:border-indigo-500/30 hover:-translate-y-1 overflow-hidden`}
    >
      {/* Mouse Follow Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px transition duration-300 opacity-0 group-hover:opacity-100"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />

      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5 group-hover:border-white/10 shadow-lg">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-3 font-display">{feature.title}</h3>
        <p className="text-slate-400 leading-relaxed text-sm md:text-base">
          {feature.description}
        </p>
      </div>
    </div>
  );
};

export const Features: React.FC = () => {
  const { config, isLoading } = useWhitelabel();

  // Use whitelabel features or fall back to defaults
  const features: WhitelabelFeature[] = config.features && config.features.length > 0
    ? config.features
    : DEFAULT_FEATURES;

  return (
    <section id="features" className="py-24 bg-[#0a0a0f] relative overflow-hidden">
       {/* Subtle grid background */}
       <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
       <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
            Everything You Need to <br/> <span className="text-indigo-400">Plan Profitable Funnels</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Professional modeling tools for marketers, entrepreneurs, and funnel strategists who value data over intuition.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <FeatureCard key={idx} feature={feature} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
};
