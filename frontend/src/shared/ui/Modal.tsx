import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from '@/shared/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = "md",
}) => {
  const sizeStyles = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[var(--surface-overlay)]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "relative w-full rounded-3xl border border-gray-200 bg-white shadow-modal",
              "dark:border-slate-700 dark:bg-slate-900",
              sizeStyles[size]
            )}
          >
            {(title || subtitle) && (
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-slate-800">
                <div>
                  {title && <h2 className="text-h3 text-gray-900 dark:text-slate-100">{title}</h2>}
                  {subtitle && <p className="text-caption text-gray-500">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-800"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
