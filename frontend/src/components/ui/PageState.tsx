import React from 'react';
import {
  AlertCircle,
  FileText,
  Info,
  Loader2,
} from 'lucide-react';

type PageStateTone = 'loading' | 'empty' | 'error' | 'processing';

interface PageStateProps {
  title: string;
  description?: string;
  tone?: PageStateTone;
  action?: React.ReactNode;
  compact?: boolean;
}

const toneConfig: Record<PageStateTone, { icon: React.ReactNode; className: string }> = {
  loading: {
    icon: <Loader2 size={36} className="animate-spin" />,
    className: 'border-gray-200 bg-white text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
  },
  empty: {
    icon: <FileText size={36} />,
    className: 'border-dashed border-gray-300 bg-white text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
  },
  error: {
    icon: <AlertCircle size={36} />,
    className: 'border-red-200 bg-red-50/40 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300',
  },
  processing: {
    icon: <Info size={36} />,
    className: 'border-blue-200 bg-blue-50/40 text-blue-600 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300',
  },
};

const PageState: React.FC<PageStateProps> = ({
  title,
  description,
  tone = 'empty',
  action,
  compact = false,
}) => {
  const config = toneConfig[tone];

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[2rem] border p-8 text-center shadow-sm ${config.className} ${
        compact ? 'py-12' : 'py-20'
      }`}
    >
      <div className="mb-4 rounded-full bg-white/70 p-4 dark:bg-slate-900/30">
        {config.icon}
      </div>
      <p className="text-xl font-black text-gray-900 dark:text-slate-100">{title}</p>
      {description && (
        <p className="mt-2 max-w-md text-sm font-medium leading-6 text-gray-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
};

export default PageState;
