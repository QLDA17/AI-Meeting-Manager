import React from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import GlossaryTable from '../features/glossary/GlossaryTable';
import { useGlossaryStore } from '../stores';
import { useOrgStore } from '../stores';

const GlossaryView: React.FC = () => {
  const { currentOrg } = useOrgStore();
  const { glossaries, categories, isLoading, loadGlossaries, loadGlossaryCategories } = useGlossaryStore();

  React.useEffect(() => {
    if (currentOrg?.id) {
      loadGlossaries(currentOrg.id);
      loadGlossaryCategories(currentOrg.id);
    }
  }, [currentOrg?.id, loadGlossaries, loadGlossaryCategories]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
          <BookOpen className="text-primary-600" size={24} />
          Từ điển chuyên ngành
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Danh sách thuật ngữ chuyên ngành được sử dụng để cải thiện độ chính xác nhận dạng giọng nói và dịch thuật.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary-500" size={32} />
        </div>
      ) : (
        <GlossaryTable data={glossaries} categories={categories} />
      )}
    </div>
  );
};

export default GlossaryView;
