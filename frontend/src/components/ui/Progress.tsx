import React from "react";
import { cn } from "../../lib/utils";

interface ProgressProps {
  label?: string;
  progress: number;
  showPercent?: boolean;
  variant?: "default" | "success" | "warning" | "danger";
  size?: "sm" | "md";
}

const Progress: React.FC<ProgressProps> = ({
  label,
  progress,
  showPercent = true,
  variant = "default",
  size = "sm",
}) => {
  const barColors = {
    default: "bg-gradient-to-r from-primary-400 to-primary-600",
    success: "bg-gradient-to-r from-primary-400 to-primary-600",
    warning: "bg-gradient-to-r from-amber-400 to-amber-600",
    danger: "bg-gradient-to-r from-red-400 to-red-600",
  };

  const heights = {
    sm: "h-1.5",
    md: "h-2.5",
  };

  return (
    <div className="space-y-1">
      {(label || showPercent) && (
        <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
          {label && <span className="max-w-[70%] truncate">{label}</span>}
          {showPercent && <span>{Math.min(progress, 100)}%</span>}
        </div>
      )}
      <div className={cn("overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800", heights[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", barColors[variant])}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default Progress;
