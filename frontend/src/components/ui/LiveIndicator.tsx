/**
 * Live Indicator Component
 * Pulsing dot for real-time features
 */
import React from 'react';
import { motion } from 'framer-motion';

interface LiveIndicatorProps {
  isLive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const sizeMap = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

const colorMap = {
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
};

const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  isLive = true,
  size = 'md',
  color = 'success',
  showLabel = false,
  label,
  className = '',
}) => {
  const displayLabel = label || (isLive ? 'Live' : 'Offline');

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="relative">
        {/* Pulsing animation */}
        {isLive && (
          <>
            <motion.div
              className={`absolute inset-0 rounded-full ${colorMap[color]}`}
              animate={{
                scale: [1, 2],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
            <motion.div
              className={`absolute inset-0 rounded-full ${colorMap[color]}`}
              animate={{
                scale: [1, 2],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut',
                delay: 0.5,
              }}
            />
          </>
        )}
        {/* Core dot */}
        <div
          className={`relative rounded-full ${sizeMap[size]} ${
            isLive ? colorMap[color] : 'bg-gray-400 dark:bg-slate-600'
          }`}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
          {displayLabel}
        </span>
      )}
    </div>
  );
};

export default LiveIndicator;
