import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showSubtext?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  variant = 'light',
  size = 'md',
  showSubtext = true
}) => {
  const iconSizes = {
    sm: 'h-10 w-20',
    md: 'h-14 w-32',
    lg: 'h-16 w-36',
  };

  const textSizes = {
    sm: 'text-[1.4rem]',
    md: 'text-[1.85rem]',
    lg: 'text-[2.35rem]',
  };

  return (
    <Link to="/" className={cn("flex items-center gap-0.5 group", className)}>
      <img
        src="/brand/convia-logo.png"
        alt="CONVIA logo"
        className={cn("block shrink-0 overflow-visible object-cover object-left transition-transform group-hover:scale-105", iconSizes[size])}
      />
      <div className="-ml-1 flex flex-col leading-tight">
        <span className={cn(
          "font-black tracking-[-0.05em] transition-all duration-300 group-hover:translate-x-[1px]",
          textSizes[size]
        )}>
          <span className={cn(
            "bg-clip-text text-transparent bg-gradient-to-br drop-shadow-sm",
            variant === 'light' ? 'from-emerald-400 to-green-600' : 'from-emerald-300 to-green-500'
          )}>
            CON
          </span>
          <span className={cn(
            "transition-colors",
            variant === 'light' ? 'text-slate-900' : 'text-white'
          )}>
            VIA
          </span>
          <span className={cn(
            "text-green-500 ml-[1px] animate-pulse"
          )}>.</span>
        </span>
        {showSubtext && (
          <span className="text-[10px] font-extrabold text-primary-700 dark:text-primary-400 uppercase tracking-[0.26em]">
            AI Meeting Intelligence
          </span>
        )}
      </div>
    </Link>
  );
};

export default Logo;
