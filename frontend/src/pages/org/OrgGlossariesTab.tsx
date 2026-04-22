import React from 'react';
import { BookOpen, Info } from 'lucide-react';
import GlossaryTable from '../../features/glossary/GlossaryTable';
import { useGlossaryStore } from '../../stores';
import { Card } from '../../components/ui';

interface OrgGlossariesTabProps {
  orgId: string;
}

const OrgGlossariesTab: React.FC<OrgGlossariesTabProps> = ({ orgId }) => {
  const { glossaries, loadGlossaries, removeGlossary } = useGlossaryStore();

  React.useEffect(() => {
    loadGlossaries(orgId);
  }, [orgId, loadGlossaries]);

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa thư viện từ vựng này?')) {
      removeGlossary(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="text-primary-600" size={24} />
            Từ điển chuyên ngành
          </h2>
          <p className="text-gray-500 dark:text-slate-400">
            Quản lý các thư viện từ vựng đặc thù của tổ chức để AI nhận diện chính xác hơn.
          </p>
        </div>
      </div>

      <Card className="bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30 p-4 flex gap-3">
        <Info className="text-blue-600 dark:text-blue-400 shrink-0" size={20} />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold">Lưu ý về phạm vi:</p>
          <p>
            Các thư viện có phạm vi **Hệ thống** được cung cấp sẵn bởi quản trị viên. Các thư viện **Nội bộ** do bạn tạo ra và chỉ có hiệu lực trong tổ chức này.
          </p>
        </div>
      </Card>

      <GlossaryTable 
        data={glossaries} 
        onDelete={handleDelete}
        onAdd={() => console.log('Add new glossary')}
        onEdit={(g) => console.log('Edit glossary', g)}
      />
    </div>
  );
};

export default OrgGlossariesTab;
