import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, RotateCcw } from 'lucide-react';
import Button from './Button';
import { cn } from '@/shared/lib/utils';

interface FloatingSaveBarProps {
  isVisible: boolean;
  isSaving?: boolean;
  onSave: () => void;
  onCancel: () => void;
  message?: string;
  subMessage?: string;
  className?: string;
}

const FloatingSaveBar: React.FC<FloatingSaveBarProps> = ({
  isVisible,
  isSaving = false,
  onSave,
  onCancel,
  message = "Cấu hình chưa được lưu",
  subMessage = "Lưu ý: Các thay đổi sẽ mất nếu bạn rời trang mà không lưu.",
  className
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, x: '-50%', opacity: 0 }}
          animate={{ y: 0, x: '-50%', opacity: 1 }}
          exit={{ y: 100, x: '-50%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={cn(
            "fixed bottom-8 left-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl",
            className
          )}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between rounded-3xl border border-white/20 bg-slate-900/90 p-2.5 shadow-2xl backdrop-blur-xl gap-4 sm:gap-0">
            <div className="flex items-center gap-3 ml-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-500/20 text-primary-400">
                <RotateCcw size={20} className={isSaving ? 'animate-spin' : ''} />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-black text-white tracking-wide">{message}</p>
                {subMessage && (
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                    {subMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="ghost"
                onClick={onCancel}
                className="flex-1 sm:flex-none rounded-2xl px-5 text-white hover:bg-white/10"
                disabled={isSaving}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                onClick={onSave}
                loading={isSaving}
                icon={<Save size={16} />}
                className="flex-1 sm:flex-none rounded-2xl px-8 h-10 shadow-lg shadow-primary-500/40 font-black"
              >
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingSaveBar;
