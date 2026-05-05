import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';

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
    sm: 'h-8 w-8 text-xs rounded-lg',
    md: 'h-10 w-10 text-sm rounded-xl',
    lg: 'h-12 w-12 text-lg rounded-2xl',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <Link to="/" className={cn("flex items-center gap-3 group", className)}>
      <div className={cn(
        "inline-flex items-center justify-center bg-primary-600 font-black text-white shadow-lg transition-transform group-hover:scale-105",
        iconSizes[size]
      )}>
        MM
      </div>
      <div className="flex flex-col leading-tight">
        <span className={cn(
          "font-black tracking-tight transition-colors",
          variant === 'light' ? 'text-gray-900' : 'text-white',
          textSizes[size]
        )}>
          MultiMinutes<span className="text-primary-600">AI</span>
        </span>
        {showSubtext && (
          <span className="text-[10px] font-bold text-primary-700 dark:text-primary-400 uppercase tracking-widest">
            Ghi chép thông minh
          </span>
        )}
      </div>
    </Link>
  );
};

export default Logo;
