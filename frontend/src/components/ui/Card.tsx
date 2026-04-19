import React from "react";
import { cn } from "../../lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "stat" | "glass";
}

const Card: React.FC<CardProps> = ({ variant = "default", className, children, ...props }) => {
  const variants = {
    default:
      "bg-white rounded-2xl border border-gray-200 p-6 shadow-card dark:border-slate-700 dark:bg-slate-900",
    stat:
      "bg-white rounded-2xl border border-gray-200 p-5 shadow-card dark:border-slate-700 dark:bg-slate-900",
    glass:
      "panel-glass rounded-3xl border border-gray-200 p-6 shadow-card dark:border-slate-700",
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
    default: "border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900",
    primary: "border-primary-200 bg-primary-50 dark:border-primary-900/40 dark:bg-primary-900/15",
    warning: "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10",
    danger: "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10",
  };

  const iconBgStyles = {
    default: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300",
    primary: "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300",
    warning: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
    danger: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300",
  };

  const textStyles = {
    default: "text-gray-900 dark:text-slate-100",
    primary: "text-primary-800 dark:text-primary-200",
    warning: "text-amber-800 dark:text-amber-200",
    danger: "text-red-800 dark:text-red-200",
  };

  return (
    <div className={cn("rounded-2xl border p-5 shadow-card", accentStyles[accent])}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-caption uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</span>
        {icon && (
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconBgStyles[accent])}>
            {icon}
          </div>
        )}
      </div>
      <div className={cn("text-h2 font-bold", textStyles[accent])}>{value}</div>
      {subtitle && <div className="text-caption text-gray-500 dark:text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );
};

export { Card as default, StatCard };
