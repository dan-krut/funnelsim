import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  children, 
  ...props 
}) => {
  // CRITICAL FIX: explicit focus:ring-0 and focus:ring-offset-0 prevents the browser's default 
  // white/blue ring from flashing when clicked with a mouse. 
  // We only want rings for keyboard navigation (focus-visible).
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 ease-in-out outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] hover:scale-[1.02]";
  
  const variants = {
    primary: "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/20 border border-transparent hover:shadow-indigo-500/40 focus-visible:ring-2 focus-visible:ring-indigo-500",
    secondary: "bg-white text-slate-900 hover:bg-slate-50 border border-transparent shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-slate-200",
    outline: "bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600 focus-visible:ring-2 focus-visible:ring-slate-500",
    ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/50 focus-visible:ring-2 focus-visible:ring-slate-500",
  };

  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-6 text-base",
    lg: "h-14 px-8 text-lg",
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], sizes[size], className)} 
      {...props}
    >
      {children}
    </button>
  );
};