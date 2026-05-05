import React from "react";
import { cn } from '@/shared/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "stat" | "glass";
}

const Card: React.FC<CardProps> = ({ variant = "default", className, children, ...props }) => {
  const variants = {
    default:
      "bg-white rounded-3xl border border-gray-100 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900",
    stat:
      "bg-white rounded-2xl border border-gray-100 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900",
    glass:
      "panel-glass rounded-[2rem] border border-white/20 p-6 shadow-xl dark:border-slate-800",
  };

  return (
    <div className={cn(variants[variant], className)} {...props}>
      {children}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number | React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: "default" | "primary" | "warning" | "danger";
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subtitle, icon, accent = "default" }) => {
  const accentStyles = {
    default: "border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900",
    primary: "border-primary-100 bg-primary-50/30 dark:border-primary-900/40 dark:bg-primary-900/10",
    warning: "border-amber-100 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-900/10",
    danger: "border-red-100 bg-red-50/30 dark:border-red-900/40 dark:bg-red-900/10",
  };

  const iconBgStyles = {
    default: "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400",
    primary: "bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400",
    warning: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    danger: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
  };

  const textStyles = {
    default: "text-gray-900 dark:text-white",
    primary: "text-primary-700 dark:text-primary-300",
    warning: "text-amber-700 dark:text-amber-300",
    danger: "text-red-700 dark:text-red-300",
  };

  return (
    <div className={cn("rounded-[1.5rem] border p-6 transition-all duration-300 hover:shadow-md", accentStyles[accent])}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">{label}</span>
        {icon && (
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", iconBgStyles[accent])}>
            {icon}
          </div>
        )}
      </div>
      <div className={cn("text-3xl font-black", textStyles[accent])}>{value}</div>
      {subtitle && <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-2">{subtitle}</div>}
    </div>
  );
};

export { Card as default, StatCard };
