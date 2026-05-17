import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

const variantStyles = {
  primary:
    "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700",
  secondary:
    "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800",
  ghost:
    "bg-transparent text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800",
  danger:
    "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
  success:
    "bg-primary-500 text-white hover:bg-primary-600",
} as const;

const sizeStyles = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-9 px-4 text-sm gap-2 rounded-xl",
  lg: "h-10 px-5 text-sm gap-2 rounded-xl",
  xl: "h-12 px-6 text-base gap-2.5 rounded-xl",
} as const;

const baseStyles =
  "inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-400/50 disabled:opacity-50 disabled:cursor-not-allowed select-none";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  loading?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  isLoading = false,
  icon,
  children,
  disabled,
  className,
  ...props
}) => {
  const isCurrentlyLoading = loading || isLoading;

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || isCurrentlyLoading}
      {...props}
    >
      {isCurrentlyLoading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
};

export default Button;
