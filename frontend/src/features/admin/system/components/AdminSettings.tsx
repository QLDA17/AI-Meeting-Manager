import React from 'react';
import { Lock, Save, Database, ShieldAlert, Globe, Server } from 'lucide-react';

const AdminSettings: React.FC = () => {
  return (
    <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-10 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-8 text-2xl font-black text-gray-900 dark:text-slate-100">Cấu hình Hệ thống (Global)</h3>
      
      <div className="space-y-10">
        {/* Security Section */}
        <section>
          <div className="mb-6 flex items-center gap-3">
             <div className="rounded-xl bg-red-50 p-2 text-red-600 dark:bg-red-900/20">
                <Lock size={20} />
             </div>
             <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Bảo mật & Xác thực</h4>
          </div>
          <div className="space-y-6 pl-11">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">Bắt buộc 2FA cho Admin</p>
                <p className="text-xs text-gray-500">Yêu cầu xác thực 2 lớp cho tất cả tài khoản quản trị viên.</p>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded-md text-red-600 focus:ring-red-500" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">Đăng ký mới công khai</p>
                <p className="text-xs text-gray-500">Cho phép người dùng mới tự đăng ký tài khoản từ trang login.</p>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded-md text-red-600 focus:ring-red-500" defaultChecked />
            </div>
          </div>
        </section>

        {/* Database Section */}
        <section>
          <div className="mb-6 flex items-center gap-3">
             <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/20">
                <Database size={20} />
             </div>
             <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Lưu trữ & Database</h4>
          </div>
          <div className="space-y-6 pl-11">
             <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                   <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Dung lượng tối đa / Org</label>
                   <div className="flex items-center gap-2">
                      <input type="number" defaultValue={50} className="w-24 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-800" />
                      <span className="text-xs font-bold text-gray-500">GB</span>
                   </div>
                </div>
                <div>
                   <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Thời gian lưu bản ghi</label>
                   <select className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-800">
                      <option>Vĩnh viễn</option>
                      <option>1 năm</option>
                      <option>6 tháng</option>
                   </select>
                </div>
             </div>
          </div>
        </section>

        {/* Maintenance Section */}
        <section className="rounded-2xl border-2 border-dashed border-red-200 bg-red-50/30 p-6 dark:border-red-900/30 dark:bg-red-900/10">
           <div className="flex items-start gap-4">
              <ShieldAlert className="mt-1 text-red-600" />
              <div className="flex-1">
                 <p className="text-sm font-black text-red-700 dark:text-red-400">Chế độ Bảo trì (Maintenance Mode)</p>
                 <p className="mt-1 text-xs text-red-600/70">Khi kích hoạt, toàn bộ hệ thống sẽ ngừng phục vụ người dùng ngoại trừ Admin.</p>
                 <button className="mt-4 rounded-xl bg-red-600 px-6 py-2 text-xs font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700">Kích hoạt ngay</button>
              </div>
           </div>
        </section>

        <div className="flex justify-end pt-6">
          <button className="flex items-center gap-2 rounded-2xl bg-gray-900 px-10 py-4 font-black text-white shadow-xl shadow-gray-900/20 transition hover:bg-black dark:bg-slate-100 dark:text-slate-900">
            <Save size={20} />
            Lưu tất cả thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
