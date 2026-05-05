import React, { useState, useRef } from "react";
import { cn } from '@/shared/lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  shortcut?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, side = "top", shortcut }) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<any>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), 400);
  };

  const hide = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const positionStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-50 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg",
            "dark:bg-slate-700 dark:text-slate-100",
            positionStyles[side]
          )}
        >
          {content}
          {shortcut && (
            <kbd className="ml-2 rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-mono dark:bg-slate-600">
              {shortcut}
            </kbd>
          )}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
