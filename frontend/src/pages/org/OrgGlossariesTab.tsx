import React from 'react';
import {
  ArrowRightLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Languages,
  RefreshCcw,
  Sparkles,
  Tags,
  XCircle,
} from 'lucide-react';
import GlossaryTable from '../../features/glossary/GlossaryTable';
import { useGlossaryStore } from '../../stores';
import { Badge, Button, Card, Input, StatCard, AnimatedCounter } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import type { GlossaryImportReport, GlossarySuggestion, GlossaryTerm } from '../../types';

// Helper function to highlight canonical term and aliases in transcript evidence
const highlightKeywords = (text: string, term: string, aliases: string[]) => {
  if (!text) return <span></span>;
  const keywords = Array.from(new Set([term, ...aliases]))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  
  if (keywords.length === 0) return <span>{text}</span>;
  
  const escapeRegex = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regexPattern = `(${keywords.map(escapeRegex).join('|')})`;
  
  try {
    const regex = new RegExp(regexPattern, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, index) => {
          if (keywords.some(k => k.toLowerCase() === part.toLowerCase())) {
            return (
              <mark 
                key={index} 
                className="bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded-lg border border-amber-250/20 dark:border-amber-850/40 shadow-sm"
              >
                {part}
              </mark>
            );
          }
          return part;
        })}
      </span>
    );
  } catch (e) {
    return <span>{text}</span>;
  }
};

interface OrgGlossariesTabProps {
  orgId: string;
}

type ViewMode = 'glossary' | 'suggestions';
type FormMode = 'create' | 'edit' | 'approve';

interface GlossaryFormState {
  term: string;
  aliases: string[];
  aliasDraft: string;
  translationVi: string;
  translationEn: string;
  translationJa: string;
  translationZh: string;
  translationKo: string;
  category: string;
  isActive: boolean;
}

const emptyForm = (): GlossaryFormState => ({
  term: '',
  aliases: [],
  aliasDraft: '',
  translationVi: '',
  translationEn: '',
  translationJa: '',
  translationZh: '',
  translationKo: '',
  category: '',
  isActive: true,
});

const filledTranslationCount = (item: GlossaryTerm) =>
  [item.translationVi, item.translationEn, item.translationJa, item.translationZh, item.translationKo].filter(Boolean).length;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    if (response?.data?.detail) return response.data.detail;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const OrgGlossariesTab: React.FC<OrgGlossariesTabProps> = ({ orgId }) => {
  const {
    glossaries,
    categories,
    suggestions,
    insights,
    loadGlossaries,
    loadGlossaryCategories,
    loadSuggestions,
    loadInsights,
    removeGlossary,
    createGlossary,
    updateGlossary,
    importGlossaries,
    exportGlossaries,
    runSuggestions,
    approveSuggestion,
    mergeSuggestion,
    rejectSuggestion,
  } = useGlossaryStore();
  const [activeView, setActiveView] = React.useState<ViewMode>('glossary');
  const [formMode, setFormMode] = React.useState<FormMode>('create');
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<GlossaryTerm | null>(null);
  const [activeSuggestion, setActiveSuggestion] = React.useState<GlossarySuggestion | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [runningSuggestions, setRunningSuggestions] = React.useState(false);
  const [report, setReport] = React.useState<GlossaryImportReport | null>(null);
  const [mergeTargetId, setMergeTargetId] = React.useState('');
  const [mergeModalOpen, setMergeModalOpen] = React.useState(false);
  const [form, setForm] = React.useState<GlossaryFormState>(emptyForm);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const refreshGlossaryData = React.useCallback(async () => {
    await Promise.all([
      loadGlossaries(orgId),
      loadGlossaryCategories(orgId),
      loadSuggestions(orgId),
      loadInsights(orgId),
    ]);
  }, [loadGlossaries, loadGlossaryCategories, loadInsights, loadSuggestions, orgId]);

  React.useEffect(() => {
    refreshGlossaryData();
  }, [refreshGlossaryData]);

  const stats = React.useMemo(() => {
    const activeCount = glossaries.filter((item) => item.isActive).length;
    const withoutAliases = glossaries.filter((item) => item.aliases.length === 0).length;
    const missingTranslations = glossaries.filter((item) => filledTranslationCount(item) === 0).length;
    return {
      total: glossaries.length,
      activeCount,
      categoryCount: categories.length,
      withoutAliases,
      missingTranslations,
    };
  }, [categories.length, glossaries]);

  const pendingSuggestions = React.useMemo(
    () => suggestions.filter((item) => item.status === 'PENDING'),
    [suggestions]
  );

  const commitAliasDraft = React.useCallback(() => {
    const nextValues = form.aliasDraft
      .split(/[,;\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (nextValues.length === 0) return;
    setForm((previous) => {
      const seen = new Set(previous.aliases.map((value) => value.toLowerCase()));
      const aliases = [...previous.aliases];
      for (const value of nextValues) {
        if (!seen.has(value.toLowerCase()) && value.toLowerCase() !== previous.term.trim().toLowerCase()) {
          aliases.push(value);
          seen.add(value.toLowerCase());
        }
      }
      return { ...previous, aliases, aliasDraft: '' };
    });
  }, [form.aliasDraft]);

  const removeAlias = (alias: string) => {
    setForm((previous) => ({
      ...previous,
      aliases: previous.aliases.filter((item) => item !== alias),
    }));
  };

  const openCreate = () => {
    setFormMode('create');
    setEditing(null);
    setActiveSuggestion(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (item: GlossaryTerm) => {
    setFormMode('edit');
    setEditing(item);
    setActiveSuggestion(null);
    setForm({
      term: item.term || '',
      aliases: item.aliases || [],
      aliasDraft: '',
      translationVi: item.translationVi || '',
      translationEn: item.translationEn || '',
      translationJa: item.translationJa || '',
      translationZh: item.translationZh || '',
      translationKo: item.translationKo || '',
      category: item.category || '',
      isActive: item.isActive ?? true,
    });
    setShowModal(true);
  };

  const openApproveFromSuggestion = (suggestion: GlossarySuggestion) => {
    setFormMode('approve');
    setEditing(null);
    setActiveSuggestion(suggestion);
    setForm({
      term: suggestion.canonical_term_candidate,
      aliases: suggestion.alias_candidates || [],
      aliasDraft: '',
      translationVi: '',
      translationEn: '',
      translationJa: '',
      translationZh: '',
      translationKo: '',
      category: suggestion.category_hint || '',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá thuật ngữ này?')) {
      await removeGlossary(id);
      await refreshGlossaryData();
      toast.success('Đã xoá thuật ngữ');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.term.trim()) return;
    const draftAliases = form.aliasDraft
      .split(/[,;\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
    const mergedAliases = Array.from(
      new Set(
        [...form.aliases, ...draftAliases]
          .map((value) => value.trim())
          .filter(Boolean)
          .filter((value) => value.toLowerCase() !== form.term.trim().toLowerCase())
      )
    );

    setSaving(true);
    try {
      const payload = {
        term: form.term.trim(),
        name: form.term.trim(),
        aliases: mergedAliases,
        translation_vi: form.translationVi || undefined,
        translation_en: form.translationEn || undefined,
        translation_ja: form.translationJa || undefined,
        translation_zh: form.translationZh || undefined,
        translation_ko: form.translationKo || undefined,
        category: form.category || undefined,
        is_active: form.isActive,
        organization_id: orgId,
      };
      if (formMode === 'edit' && editing) {
        await updateGlossary(editing.id, payload);
        toast.success('Đã cập nhật thuật ngữ');
      } else if (formMode === 'approve' && activeSuggestion) {
        await approveSuggestion(activeSuggestion.id, payload);
        toast.success('Đã tạo glossary từ suggestion');
      } else {
        await createGlossary(payload);
        toast.success('Đã tạo thuật ngữ');
      }
      await refreshGlossaryData();
      setShowModal(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể lưu glossary'));
    } finally {
      setSaving(false);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const nextReport = await importGlossaries(orgId, file);
      setReport(nextReport);
      await refreshGlossaryData();
      toast.success(`Import xong: ${nextReport.created} mới, ${nextReport.updated} cập nhật`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể import glossary'));
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportGlossaries(orgId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `glossary-${orgId}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể export glossary'));
    } finally {
      setExporting(false);
    }
  };

  const handleRunSuggestions = async () => {
    setRunningSuggestions(true);
    try {
      const result = await runSuggestions(orgId);
      await refreshGlossaryData();
      toast.success(`Đã quét ${result.processed_transcripts} transcript, cập nhật ${result.suggestions_changed} suggestion`);
      setActiveView('suggestions');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể chạy suggestion batch'));
    } finally {
      setRunningSuggestions(false);
    }
  };

  const handleRejectSuggestion = async (suggestion: GlossarySuggestion) => {
    try {
      await rejectSuggestion(suggestion.id, orgId);
      await refreshGlossaryData();
      toast.success('Đã reject suggestion');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể reject suggestion'));
    }
  };

  const openMergeModal = (suggestion: GlossarySuggestion) => {
    setActiveSuggestion(suggestion);
    setMergeTargetId(glossaries[0]?.id || '');
    setMergeModalOpen(true);
  };

  const submitMergeSuggestion = async () => {
    if (!activeSuggestion || !mergeTargetId) return;
    try {
      await mergeSuggestion(activeSuggestion.id, {
        organization_id: orgId,
        target_term_id: mergeTargetId,
        aliases: activeSuggestion.alias_candidates,
      });
      await refreshGlossaryData();
      setMergeModalOpen(false);
      toast.success('Đã merge suggestion vào glossary có sẵn');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể merge suggestion'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 pb-5 border-b border-gray-100 dark:border-slate-800 xl:flex-row xl:items-end xl:justify-between xl:gap-8">
        <div className="flex-1 min-w-0">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-slate-100">
            <BookOpen className="text-primary-600" size={24} />
            Từ điển chuyên ngành
          </h2>
          <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed mt-1">
            Quản trị glossary hiện tại, AI suggestions và insight chất lượng STT trong cùng một workspace.
          </p>
        </div>
        <div className="flex flex-row items-center gap-3 shrink-0 xl:pb-[2px] overflow-x-auto no-scrollbar">
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />
          <Button variant="secondary" className="h-10 rounded-2xl flex items-center gap-2 px-5 font-bold shadow-sm" onClick={() => fileInputRef.current?.click()} isLoading={importing}>
            <FileSpreadsheet size={15} />
            Import CSV
          </Button>
          <Button variant="secondary" className="h-10 rounded-2xl flex items-center gap-2 px-5 font-bold shadow-sm" onClick={handleExport} isLoading={exporting}>
            <Download size={15} />
            Export CSV
          </Button>
          <Button variant="secondary" className="h-10 rounded-2xl flex items-center gap-2 px-5 font-bold shadow-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 border-primary-200/40 dark:border-primary-900/20" onClick={handleRunSuggestions} isLoading={runningSuggestions}>
            <RefreshCcw size={15} />
            Chạy suggestion batch
          </Button>
        </div>
      </div>

      <Card className="flex gap-3 border-blue-100 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
        <Info className="shrink-0 text-blue-600 dark:text-blue-400" size={20} />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold">V2 workflow</p>
          <p>Transcript hoàn tất sẽ sinh glossary suggestions nền. Admin duyệt suggestion để tạo mới hoặc merge alias vào term đang có.</p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Tổng glossary"
          value={<AnimatedCounter value={stats.total} />}
          icon={<BookOpen size={18} />}
          accent="default"
        />
        <StatCard
          label="Đang active"
          value={<AnimatedCounter value={stats.activeCount} />}
          icon={<CheckCircle2 size={18} />}
          accent="success"
        />
        <StatCard
          label="Pending suggestions"
          value={<AnimatedCounter value={insights?.pending_suggestions_count ?? pendingSuggestions.length} />}
          icon={<Bot size={18} />}
          accent="warning"
        />
        <StatCard
          label="Thiếu alias"
          value={<AnimatedCounter value={stats.withoutAliases} />}
          icon={<Tags size={18} />}
          accent="danger"
        />
        <StatCard
          label="Thiếu translation"
          value={<AnimatedCounter value={stats.missingTranslations} />}
          icon={<Languages size={18} />}
          accent="info"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="space-y-4 p-5 border border-gray-150/40 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm rounded-3xl transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">
            <Sparkles size={15} className="text-primary-500" />
            Top corrected aliases
          </div>
          <div className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
            {(insights?.top_corrected_aliases || []).length > 0 ? (
              insights?.top_corrected_aliases.map((item) => (
                <div key={item.value} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-slate-800">
                  <span>{item.value}</span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))
            ) : (
              <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-150 p-4 text-center dark:border-slate-800 bg-gray-50/20 dark:bg-slate-950/10">
                <Sparkles size={22} className="stroke-[1.5] text-gray-300 dark:text-slate-700 animate-pulse" />
                <p className="mt-2 text-xs font-bold text-gray-500 dark:text-slate-400">Chưa có dữ liệu hiệu chỉnh</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 max-w-[200px] leading-relaxed mx-auto">
                  Hệ thống tự động tổng hợp khi STT sửa đổi các cụm từ viết sai.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-4 p-5 border border-gray-150/40 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm rounded-3xl transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">
            <Bot size={15} className="text-primary-500" />
            Top missing terms
          </div>
          <div className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
            {(insights?.top_missing_terms || []).length > 0 ? (
              insights?.top_missing_terms.map((item) => (
                <div key={item.value} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-slate-800">
                  <span>{item.value}</span>
                  <Badge variant="amber">{item.count}</Badge>
                </div>
              ))
            ) : (
              <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-150 p-4 text-center dark:border-slate-800 bg-gray-50/20 dark:bg-slate-950/10">
                <Bot size={22} className="stroke-[1.5] text-gray-300 dark:text-slate-700 animate-pulse" />
                <p className="mt-2 text-xs font-bold text-gray-500 dark:text-slate-400">Chưa có missing term</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 max-w-[200px] leading-relaxed mx-auto">
                  AI sẽ quét và phát hiện các thuật ngữ chuyên ngành bị bỏ sót từ transcript.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-4 p-5 border border-gray-150/40 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm rounded-3xl transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">
            <CheckCircle2 size={15} className="text-primary-500" />
            Suggestion outcomes
          </div>
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="rounded-2xl bg-amber-50/60 border border-amber-100/50 p-3.5 text-center dark:bg-amber-950/10 dark:border-amber-900/20 transition-all hover:scale-105 duration-300">
              <p className="text-[9px] font-black uppercase tracking-wider text-amber-500">Pending</p>
              <p className="mt-1.5 text-2xl font-black text-amber-600 dark:text-amber-400">{insights?.pending_suggestions_count ?? pendingSuggestions.length}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50/60 border border-emerald-100/50 p-3.5 text-center dark:bg-emerald-950/10 dark:border-emerald-900/20 transition-all hover:scale-105 duration-300">
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-500">Applied</p>
              <p className="mt-1.5 text-2xl font-black text-emerald-600 dark:text-emerald-400">{insights?.approved_count ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-gray-50/60 border border-gray-150/50 p-3.5 text-center dark:bg-slate-950/40 dark:border-slate-800/60 transition-all hover:scale-105 duration-300">
              <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Rejected</p>
              <p className="mt-1.5 text-2xl font-black text-gray-600 dark:text-slate-400">{insights?.rejected_count ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {report && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Import / Review</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">Kết quả lần import gần nhất.</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="primary">Tạo mới {report.created}</Badge>
              <Badge variant="blue">Cập nhật {report.updated}</Badge>
              <Badge variant="amber">Lỗi {report.errors.length}</Badge>
            </div>
          </div>
          {report.errors.length > 0 ? (
            <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-200">
              {report.errors.map((error) => (
                <div key={`${error.row}-${error.term || 'row'}`}>
                  Dòng {error.row} {error.term ? `(${error.term})` : ''}: {error.message}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">Không có lỗi import.</p>
          )}
        </Card>
      )}

      <div className="rounded-3xl border border-gray-200 bg-white p-2 shadow-card dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveView('glossary')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeView === 'glossary'
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-200'
                : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Glossary list
          </button>
          <button
            onClick={() => setActiveView('suggestions')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeView === 'suggestions'
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-200'
                : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Suggestions
            <span className="ml-2 rounded-full bg-gray-900 px-2 py-0.5 text-xs text-white dark:bg-slate-100 dark:text-slate-900">
              {pendingSuggestions.length}
            </span>
          </button>
        </div>
      </div>

      {activeView === 'glossary' ? (
        <GlossaryTable data={glossaries} categories={categories} onDelete={handleDelete} onAdd={openCreate} onEdit={openEdit} />
      ) : (
        <div className="space-y-4">
          {pendingSuggestions.length > 0 ? (
            pendingSuggestions.map((suggestion) => (
              <Card key={suggestion.id} className="space-y-5 p-6 border border-primary-100/50 bg-gradient-to-br from-white via-white to-primary-50/5 hover:border-primary-350 dark:border-slate-800/80 dark:bg-slate-900/60 dark:to-primary-950/5 relative overflow-hidden transition-all duration-300 shadow-md hover:shadow-xl rounded-3xl group">
                {/* Decorative glow for AI feel */}
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-primary-400/10 blur-xl opacity-70 group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
                
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between relative z-10">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-gray-900 dark:text-slate-100 tracking-tight">
                        {suggestion.canonical_term_candidate}
                      </h3>
                      <Badge variant="blue" className="bg-primary-50/80 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300 font-bold uppercase tracking-wider text-[10px]">{suggestion.suggestion_type}</Badge>
                      <Badge variant="secondary" className="font-bold">{Math.round(suggestion.confidence_score * 100)}% độ tin cậy</Badge>
                      <Badge variant="amber" className="font-bold">{suggestion.occurrence_count} lần bắt gặp</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(suggestion.alias_candidates || []).map((alias) => (
                        <span
                          key={alias}
                          className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-1 text-xs font-medium text-gray-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-350"
                        >
                          {alias}
                        </span>
                      ))}
                      {suggestion.alias_candidates.length === 0 && (
                        <span className="text-xs text-gray-400 dark:text-slate-500 italic">Chưa phát hiện alias candidate.</span>
                      )}
                    </div>
                    {suggestion.category_hint && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
                        <span className="font-semibold text-gray-500">Phân loại gợi ý:</span>
                        <span className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{suggestion.category_hint}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <Button variant="primary" className="h-9 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-primary-600/10" onClick={() => openApproveFromSuggestion(suggestion)}>
                      <CheckCircle2 size={14} className="stroke-[2.5]" />
                      Chấp thuận
                    </Button>
                    <Button variant="secondary" className="h-9 px-4 rounded-xl text-xs flex items-center gap-1.5" onClick={() => openMergeModal(suggestion)}>
                      <ArrowRightLeft size={14} className="stroke-[2.5]" />
                      Gộp alias
                    </Button>
                    <Button variant="ghost" className="h-9 px-4 rounded-xl text-xs text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 flex items-center gap-1.5" onClick={() => handleRejectSuggestion(suggestion)}>
                      <XCircle size={14} />
                      Bỏ qua
                    </Button>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-2 relative z-10">
                  <div className="space-y-2.5">
                    <p className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Bằng chứng từ transcript (highlight từ khóa)</p>
                    <div className="space-y-2">
                      {suggestion.evidence_examples.map((example, index) => (
                        <div key={`${suggestion.id}-evidence-${index}`} className="relative pl-8 pr-4 py-3 rounded-2xl bg-gray-50/50 border border-gray-150/40 text-xs text-gray-700 dark:bg-slate-950/40 dark:border-slate-800/60 dark:text-slate-355 flex items-start gap-2.5">
                          <div className="absolute left-2.5 top-3.5 h-3.5 w-3.5 rounded-full bg-primary-100 flex items-center justify-center dark:bg-primary-950/40">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                          </div>
                          <div className="leading-relaxed">
                            {highlightKeywords(example, suggestion.canonical_term_candidate, suggestion.alias_candidates)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Mức độ phân phối</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/30 p-4 dark:border-slate-850 dark:bg-slate-950/30 transition hover:bg-white dark:hover:bg-slate-900/30">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">Số cuộc họp</p>
                        <p className="mt-1 text-2xl font-black text-gray-900 dark:text-slate-100">{suggestion.source_meeting_ids.length}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/30 p-4 dark:border-slate-850 dark:bg-slate-950/30 transition hover:bg-white dark:hover:bg-slate-900/30">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">Số Aliases</p>
                        <p className="mt-1 text-2xl font-black text-gray-900 dark:text-slate-100">{suggestion.alias_candidates.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center text-gray-500 dark:text-slate-400">
              Chưa có suggestion nào cần duyệt.
            </Card>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <form onSubmit={handleSubmit} className="w-full max-w-3xl rounded-[2.5rem] bg-white p-7 shadow-2xl border border-gray-100 dark:border-slate-800 dark:bg-slate-900 animate-slideUp">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <BookOpen size={20} className="text-primary-500" />
                  {formMode === 'approve' ? 'Phê duyệt gợi ý vào Từ điển' : formMode === 'edit' ? 'Cập nhật thuật ngữ từ điển' : 'Thêm thuật ngữ từ điển mới'}
                </h3>
                <p className="mt-1 text-xs text-gray-400 dark:text-slate-550">
                  {formMode === 'approve'
                    ? 'Bạn có thể hiệu chỉnh từ gốc canonical term và alias trước khi chính thức áp dụng.'
                    : 'Đặt canonical term rõ ràng, sau đó thêm alias mà STT dễ viết sai chính tả.'}
                </p>
              </div>
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowModal(false)} className="rounded-full w-8 h-8 p-0 flex items-center justify-center">
                ×
              </Button>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Input label="Canonical term (Từ gốc chuẩn)" value={form.term} onChange={(e) => setForm((p) => ({ ...p, term: e.target.value }))} placeholder="Ví dụ: LLM" required className="h-11 rounded-2xl" />
              <label className="space-y-1.5 text-sm text-gray-700 dark:text-slate-200">
                <span className="block font-semibold">Danh mục phân loại</span>
                <input
                  list="glossary-categories"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-750 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="Chọn hoặc nhập mới (AI, Product, Internal...)"
                />
                <datalist id="glossary-categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </label>
            </div>

            <div className="mt-5 rounded-3xl border border-gray-150/60 bg-gray-50/20 p-5 dark:border-slate-800 dark:bg-slate-955/25">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">
                <Tags size={15} />
                Aliases đồng nghĩa (Cho công cụ nhận diện giọng nói STT)
              </div>
              <p className="mt-1 text-xs text-gray-400 dark:text-slate-555">
                Nhập từ đồng nghĩa, từ viết tắt hoặc cụm từ STT dễ nghe nhầm rồi nhấn Enter, dấu phẩy hoặc nút thêm.
              </p>
              <div className="mt-3 flex gap-2">
                <Input
                  value={form.aliasDraft}
                  onChange={(e) => setForm((p) => ({ ...p, aliasDraft: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
                      e.preventDefault();
                      commitAliasDraft();
                    }
                  }}
                  placeholder="Ví dụ: el em em, lờ lờ mờ, large language model"
                  className="h-10 rounded-xl"
                />
                <Button type="button" variant="secondary" onClick={commitAliasDraft} className="rounded-xl h-10 px-5 text-xs font-bold">
                  Thêm tag
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {form.aliases.map((alias) => (
                  <button
                    key={alias}
                    type="button"
                    onClick={() => removeAlias(alias)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition-all hover:border-red-200 hover:text-red-600 dark:border-slate-850 dark:bg-slate-900 dark:text-slate-355 dark:hover:border-red-950 dark:hover:text-red-400 shadow-sm animate-pop"
                  >
                    {alias}
                    <span className="text-[10px] text-gray-400 hover:text-red-500 font-bold">×</span>
                  </button>
                ))}
                {form.aliases.length === 0 && <p className="text-xs text-gray-400 dark:text-slate-500 italic">Chưa có alias bổ trợ.</p>}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Input label="Bản dịch TIẾNG VIỆT" value={form.translationVi} onChange={(e) => setForm((p) => ({ ...p, translationVi: e.target.value }))} placeholder="Ví dụ: Mô hình ngôn ngữ lớn" className="h-10 rounded-xl" />
                <Input label="Bản dịch TIẾNG ANH" value={form.translationEn} onChange={(e) => setForm((p) => ({ ...p, translationEn: e.target.value }))} placeholder="Ví dụ: Large Language Model" className="h-10 rounded-xl" />
                <Input label="Bản dịch TIẾNG NHẬT" value={form.translationJa} onChange={(e) => setForm((p) => ({ ...p, translationJa: e.target.value }))} placeholder="Ví dụ: 大規模言語モデル" className="h-10 rounded-xl" />
                <Input label="Bản dịch TIẾNG TRUNG" value={form.translationZh} onChange={(e) => setForm((p) => ({ ...p, translationZh: e.target.value }))} placeholder="Ví dụ: 大语言模型" className="h-10 rounded-xl" />
                <Input label="Bản dịch TIẾNG HÀN" value={form.translationKo} onChange={(e) => setForm((p) => ({ ...p, translationKo: e.target.value }))} placeholder="Ví dụ: 거대 언어 모델" className="h-10 rounded-xl" />
                
                <div className="rounded-xl border border-gray-150/60 bg-gray-50/20 p-4 dark:border-slate-800/80 dark:bg-slate-950/25 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">
                    <span className="flex items-center gap-1"><Languages size={14} />Độ phủ bản dịch</span>
                    <span>{[form.translationVi, form.translationEn, form.translationJa, form.translationZh, form.translationKo].filter(Boolean).length}/5</span>
                  </div>
                  <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-100/10">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        [form.translationVi, form.translationEn, form.translationJa, form.translationZh, form.translationKo].filter(Boolean).length === 5
                          ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                          : [form.translationVi, form.translationEn, form.translationJa, form.translationZh, form.translationKo].filter(Boolean).length >= 3
                          ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                          : 'bg-gradient-to-r from-amber-400 to-amber-500'
                      }`}
                      style={{ width: `${([form.translationVi, form.translationEn, form.translationJa, form.translationZh, form.translationKo].filter(Boolean).length / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <label className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-slate-400 cursor-pointer select-none">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4.5 w-4.5" />
                <span className="font-bold">Kích hoạt thuật ngữ này trong pipeline STT của tổ chức</span>
              </label>

              <div className="flex gap-2.5">
                <Button variant="ghost" type="button" onClick={() => setShowModal(false)} className="rounded-xl px-5 h-10 text-xs">
                  Huỷ bỏ
                </Button>
                <Button variant="primary" type="submit" isLoading={saving} className="rounded-xl px-6 h-10 text-xs font-bold shadow-lg shadow-primary-600/15">
                  {formMode === 'approve' ? 'Phê duyệt gợi ý' : 'Lưu cài đặt'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {mergeModalOpen && activeSuggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Merge suggestion</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Merge alias candidates của <span className="font-semibold">{activeSuggestion.canonical_term_candidate}</span> vào một glossary term có sẵn.
                </p>
              </div>
              <Button variant="ghost" type="button" onClick={() => setMergeModalOpen(false)}>
                Đóng
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="space-y-1.5 text-sm text-gray-700 dark:text-slate-200">
                <span className="block font-medium">Target glossary term</span>
                <select
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {glossaries.map((glossary) => (
                    <option key={glossary.id} value={glossary.id}>
                      {glossary.term}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Aliases sẽ merge</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeSuggestion.alias_candidates.map((alias) => (
                    <span
                      key={alias}
                      className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMergeModalOpen(false)}>
                Huỷ
              </Button>
              <Button variant="primary" onClick={submitMergeSuggestion}>
                Merge into glossary
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgGlossariesTab;
