import React from 'react';
import { Globe, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { MultiSelect } from '../ui';

interface AIConfigSectionProps {
  language: string;
  onLanguageChange: (lang: string) => void;
  enableRecord?: boolean;
  onToggleRecord?: () => void;
  enableSummary?: boolean;
  onToggleSummary?: () => void;
  glossaries: { id: string; name: string }[];
  selectedGlossaryIds: string[];
  onGlossaryChange: (ids: string[]) => void;
  children?: React.ReactNode;
  hideToggles?: boolean;
}

const AIConfigSection: React.FC<AIConfigSectionProps> = ({
  language,
  onLanguageChange,
  glossaries,
  selectedGlossaryIds,
  onGlossaryChange,
  children,
  hideToggles = false,
}) => (
  <div className="space-y-5">
    {/* Language */}
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
        <Globe size={14} />
        Ngôn ngữ chính
      </label>
      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-700 shadow-sm transition-all focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      >
        <option value="vi">Tiếng Việt</option>
        <option value="en">English</option>
        <option value="ja">日本語</option>
        <option value="ko">한국어</option>
        <option value="zh">中文</option>
      </select>
    </div>

    {/* Glossary */}
    {glossaries.length > 0 && (
      <MultiSelect
        options={glossaries}
        selectedIds={selectedGlossaryIds}
        onChange={onGlossaryChange}
        label="Từ điển chuyên ngành"
        placeholder="Chọn glossary..."
      />
    )}

    {/* Always-on features */}
    {!hideToggles && (
      <div className="grid grid-cols-2 gap-3">
        <AlwaysOnBadge icon={<Zap size={14} />} label="Ghi âm" />
        <AlwaysOnBadge icon={<CheckCircle2 size={14} />} label="AI Tóm tắt" />
      </div>
    )}

    {/* Extra toggles */}
    {children}

    {/* Info banner */}
    <div className="flex items-start gap-3 rounded-xl border border-primary-100 bg-primary-50/50 px-4 py-3 dark:border-primary-900/30 dark:bg-primary-900/10">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
        <AlertCircle size={14} className="text-primary-600 dark:text-primary-400" />
      </div>
      <p className="text-xs leading-relaxed text-primary-700 dark:text-primary-300">
        AI sẽ tự động ghi âm, nhận dạng giọng nói và tạo biên bản khi cuộc họp kết thúc.
      </p>
    </div>
  </div>
);

const AlwaysOnBadge: React.FC<{
  icon: React.ReactNode;
  label: string;
}> = ({ icon, label }) => (
  <div className="flex items-center gap-2.5 rounded-xl border border-primary-200 bg-primary-50/80 px-3.5 py-3 dark:border-primary-800 dark:bg-primary-900/20">
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-gray-900 dark:text-slate-100">{label}</p>
      <p className="text-[10px] text-primary-600 dark:text-primary-400">Luôn bật</p>
    </div>
    <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary-500">
      <CheckCircle2 size={12} className="text-white" />
    </div>
  </div>
);

export default AIConfigSection;
