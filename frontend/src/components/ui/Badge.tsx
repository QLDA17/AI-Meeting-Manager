import React from "react";
import { cn } from "../../lib/utils";

const statusConfig = {
  processing: { label: "Đang xử lý", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800" },
  completed: { label: "Hoàn thành", color: "bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-800" },
  failed: { label: "Thất bại", color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800" },
  pending: { label: "Chờ xử lý", color: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  reviewing: { label: "Đang duyệt", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800" },
  queued: { label: "Chờ xử lý", color: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
} as const;

type StatusType = keyof typeof statusConfig;

interface BadgeProps {
  status: StatusType;
  className?: string;
  showDot?: boolean;
}

const Badge: React.FC<BadgeProps> = ({ status, className, showDot = true }) => {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        config.color,
        className
      )}
    >
      {showDot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {config.label}
    </span>
  );
};

export default Badge;
export { statusConfig };
export type { StatusType };
