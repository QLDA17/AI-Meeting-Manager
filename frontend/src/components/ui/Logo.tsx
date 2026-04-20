import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

const Logo: React.FC<LogoProps> = ({ className = '', variant = 'light' }) => {
  return (
    <Link to="/" className={`flex items-center gap-2 group ${className}`}>
      <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-110 transition-transform">
        <span className="text-white font-bold text-lg">M</span>
      </div>
      <div className="flex flex-col leading-none">
        <span className={`font-sans font-bold tracking-tight text-lg transition-colors ${
          variant === 'light' ? 'text-gray-900' : 'text-white'
        }`}>
          MultiMinutes
        </span>
        <span className="text-[10px] font-mono font-bold text-primary-600 tracking-widest uppercase">
          AI Platform
        </span>
      </div>
    </Link>
  );
};

export default Logo;
