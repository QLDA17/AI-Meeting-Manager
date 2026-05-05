import React from 'react';
import { BookOpen, Globe, Building, ShieldCheck } from 'lucide-react';
import GlossaryTable from '@/features/glossaries/components/GlossaryTable';
import { useGlossaryStore } from '@/shared/lib/stores';
import { Card, Badge } from '@/shared/ui';

const GlossariesAdmin: React.FC = () => {
  const { glossaries, loadGlossaries, removeGlossary } = useGlossaryStore();

  React.useEffect(() => {
    loadGlossaries(); // Load all glossaries (system-wide)
  }, [loadGlossaries]);

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa thư viện từ vựng này khỏi toàn hệ thống?')) {
      removeGlossary(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="text-red-600" size={28} />
            Quản trị Từ điển Hệ thống
          </h1>
          <p className="text-gray-500 dark:text-slate-400">
            Quản lý các bộ từ vựng Core dùng chung cho toàn bộ khách hàng trên hệ thống.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-primary-50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-800">
          <div className="flex items-center gap-3">
            <Globe className="text-primary-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Thư viện Hệ thống</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {glossaries.filter(g => g.scope === 'GLOBAL').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Building className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Thư viện Doanh nghiệp</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {glossaries.filter(g => g.scope === 'ORGANIZATION').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <BookOpen className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Tổng số thuật ngữ</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {glossaries.reduce((acc, curr) => acc + curr.termCount, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <GlossaryTable 
        data={glossaries} 
        onDelete={handleDelete}
        onAdd={() => console.log('Admin: Add new glossary')}
        onEdit={(g) => console.log('Admin: Edit glossary', g)}
      />
    </div>
  );
};

export default GlossariesAdmin;
