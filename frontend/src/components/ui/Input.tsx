import React from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, icon, className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const finalIcon = leftIcon || icon;

    return (
      <div className="space-y-1.5">
        {label && (
          <label 
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700 dark:text-slate-200"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {finalIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {finalIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-10 px-3 rounded-xl border border-gray-200 bg-white",
              "text-sm text-gray-900 placeholder-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
              "transition-all duration-150",
              "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500",
              "dark:focus:ring-primary-900/30",
              "disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-slate-800",
              finalIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-red-300 focus:ring-red-500 dark:border-red-800",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
