import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

const SystemAdminConsole: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/30 dark:bg-amber-900/10">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 text-amber-600 dark:text-amber-400" size={22} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">System Admin Console</h1>
            <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
              Phần quản trị hệ thống tổng đang được chuyển sang phase 2. Core release hiện ưu tiên luồng người dùng chính: auth, organization, group, meeting, action items và notifications.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <AlertTriangle className="mx-auto mb-4 text-gray-400" size={40} />
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Chưa bật trong release core</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          Các màn như quản trị người dùng toàn hệ thống, prompts, audit logs và AI services sẽ được nối backend thật ở đợt tiếp theo.
        </p>
      </div>
    </div>
  );
};

export default SystemAdminConsole;
