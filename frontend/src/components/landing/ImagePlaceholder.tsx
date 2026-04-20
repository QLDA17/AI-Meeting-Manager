import React from 'react';
import { cn } from '../../lib/utils';

interface ImagePlaceholderProps {
  width: number;
  height: number;
  label: string;
  className?: string;
}

const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({ width, height, label, className }) => {
  const paddingBottom = `${(height / width) * 100}%`;

  return (
    <div
      className={cn('relative w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-800', className)}
      style={{ paddingBottom }}
      role="img"
      aria-label={label}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        {/* Grid pattern overlay */}
        <svg
          className="absolute inset-0 w-full h-full opacity-20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id={`grid-${label.replace(/\s+/g, '-')}`} width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-400" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${label.replace(/\s+/g, '-')})`} />
        </svg>

        {/* Image icon */}
        <svg
          className="w-10 h-10 text-gray-300 dark:text-slate-600 relative z-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>

        {/* Label */}
        <span className="text-caption text-gray-400 dark:text-slate-500 relative z-10 text-center px-4 font-medium tracking-wide uppercase text-xs">
          {label}
        </span>

        {/* Dimensions */}
        <span className="text-xs text-gray-300 dark:text-slate-600 relative z-10">
          {width} × {height}
        </span>
      </div>
    </div>
  );
};

export default ImagePlaceholder;
