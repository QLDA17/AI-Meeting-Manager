import React from "react";
import { cn } from "../../lib/utils";

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
  accent?: "default" | "primary" | "warning" | "danger" | "success" | "info";
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subtitle, icon, accent = "default" }) => {
  const accentStyles = {
    default: "border-gray-200 bg-white dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)]",
    primary: "border-primary-200/80 bg-white dark:border-primary-900/40 dark:from-slate-900 dark:to-slate-900/60 shadow-[0_8px_30px_rgba(16,185,129,0.05)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.12)]",
    warning: "border-amber-200/80 bg-white dark:border-amber-900/40 dark:from-slate-900 dark:to-slate-900/60 shadow-[0_8px_30px_rgba(245,158,11,0.05)] hover:shadow-[0_15px_40px_rgba(245,158,11,0.12)]",
    danger: "border-red-200/85 bg-white dark:border-red-900/40 dark:from-slate-900 dark:to-slate-900/60 shadow-[0_8px_30px_rgba(239,68,68,0.06)] hover:shadow-[0_15px_40px_rgba(239,68,68,0.14)]",
    success: "border-emerald-200/80 bg-white dark:border-emerald-900/40 dark:from-slate-900 dark:to-slate-900/60 shadow-[0_8px_30px_rgba(16,185,129,0.05)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.12)]",
    info: "border-blue-200/80 bg-white dark:border-blue-900/40 dark:from-slate-900 dark:to-slate-900/60 shadow-[0_8px_30px_rgba(59,130,246,0.05)] hover:shadow-[0_15px_40px_rgba(59,130,246,0.12)]",
  };

  const iconBgStyles = {
    default: "bg-gray-100/80 text-gray-500 border border-gray-250/20 shadow-sm dark:bg-slate-800 dark:text-slate-400",
    primary: "bg-primary-50 text-primary-600 border border-primary-100/50 shadow-sm shadow-primary-500/10 dark:bg-primary-950/40 dark:text-primary-400 dark:border-primary-900/30",
    warning: "bg-amber-50 text-amber-600 border border-amber-100/50 shadow-sm shadow-amber-500/10 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30",
    danger: "bg-red-50 text-red-600 border border-red-100/50 shadow-sm shadow-red-500/10 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/30",
    success: "bg-emerald-50 text-emerald-600 border border-emerald-100/50 shadow-sm shadow-emerald-500/10 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30",
    info: "bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm shadow-blue-500/10 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30",
  };

  const valueStyles = {
    default: "text-gray-900 dark:text-white",
    primary: "text-primary-750 dark:text-primary-400",
    warning: "text-amber-750 dark:text-amber-400",
    danger: "text-red-700 dark:text-red-400",
    success: "text-emerald-700 dark:text-emerald-400",
    info: "text-blue-700 dark:text-blue-400",
  };
  const iconElement = React.isValidElement<{ className?: string }>(icon) ? icon : null;

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-xl border p-6 transition-all duration-500 hover:-translate-y-1", 
      accentStyles[accent]
    )}>
      {/* Subtle decorative radial background blur glow in the corner on hover */}
      <div className={cn(
        "absolute -right-12 -bottom-12 h-28 w-28 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-700",
        accent === "primary" ? "bg-primary-300/25" :
        accent === "warning" ? "bg-amber-300/25" :
        accent === "danger" ? "bg-red-300/25" :
        accent === "success" ? "bg-emerald-300/25" :
        accent === "info" ? "bg-blue-300/25" : "bg-gray-300/20"
      )} />

      <div className="relative z-10">
        {/* Top Row: Label & Squircle Icon Wrapper */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-500 leading-none">
            {label}
          </span>
          {icon && (
            <div className={cn(
              "h-11 w-11 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3", 
              iconBgStyles[accent]
            )}>
              {iconElement ? React.cloneElement(iconElement, {
                className: cn(iconElement.props.className, "stroke-[2.5]"),
              }) : icon}
            </div>
          )}
        </div>

        {/* Numeric Value & Secondary Pill */}
        <div className="flex items-baseline gap-2">
          <div className={cn("text-3xl font-black tracking-tight leading-none", valueStyles[accent])}>
            {value}
          </div>
          {subtitle && (
            <span className={cn(
              "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border",
              accent === "primary" ? "bg-primary-50/50 text-primary-700 border-primary-100 dark:bg-primary-950/20 dark:text-primary-450 dark:border-primary-900/30" :
              accent === "warning" ? "bg-amber-50/50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/30" :
              accent === "danger" ? "bg-red-50/50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-450 dark:border-red-900/30" :
              accent === "success" ? "bg-emerald-50/50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30" :
              accent === "info" ? "bg-blue-50/50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/30" :
              "bg-gray-50/50 text-gray-600 border-gray-100 dark:bg-slate-800/40 dark:text-slate-450 dark:border-slate-700/30"
            )}>
              {subtitle}
            </span>
          )}
        </div>

        {/* Progress bar or small dynamic status underlay */}
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100/60 dark:bg-slate-800/60 border border-gray-100/20">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-1000 ease-out",
              accent === "primary" ? "bg-gradient-to-r from-primary-400 to-primary-500" :
              accent === "warning" ? "bg-gradient-to-r from-amber-400 to-amber-500" :
              accent === "danger" ? "bg-gradient-to-r from-red-400 to-red-500" :
              accent === "success" ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
              accent === "info" ? "bg-gradient-to-r from-blue-400 to-blue-500" : "bg-gradient-to-r from-gray-400 to-gray-500"
            )}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
};

export { Card as default, StatCard };
