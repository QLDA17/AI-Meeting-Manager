import React from 'react';
import { Cpu, Shield, Activity, Globe, CheckCircle2 } from 'lucide-react';

const AdminAIServices: React.FC = () => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* LLM Providers */}
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-blue-500 p-3 text-white shadow-lg shadow-blue-500/20">
              <Cpu size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-slate-100">LLM Provider</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Xử lý tóm tắt & AI Notes</p>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" className="peer sr-only" defaultChecked />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-700" />
          </label>
        </div>
        
        <div className="space-y-4">
          <div className="group relative rounded-2xl border-2 border-primary-500 bg-primary-50/20 p-5 dark:border-primary-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary-600">Mặc định</p>
                <p className="text-base font-black text-gray-900 dark:text-slate-100">Google Gemini 1.5 Pro</p>
              </div>
              <CheckCircle2 className="text-primary-600" />
            </div>
          </div>
          
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 transition hover:border-gray-200 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-gray-700 dark:text-slate-300">OpenAI GPT-4o</p>
                <p className="text-[10px] font-bold text-gray-400">Secondary Provider</p>
              </div>
              <button className="text-xs font-black uppercase tracking-tighter text-primary-600">Thiết lập</button>
            </div>
          </div>
        </div>
      </div>

      {/* STT Services */}
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-purple-500 p-3 text-white shadow-lg shadow-purple-500/20">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-slate-100">STT Service</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Speech-to-Text Workers</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 p-5 dark:border-slate-800">
            <div className="flex items-center gap-3">
               <div className="h-2 w-2 rounded-full bg-green-500" />
               <div>
                  <p className="font-black text-gray-900 dark:text-slate-100">OpenAI Whisper</p>
                  <p className="text-[10px] font-bold text-gray-500">Self-hosted Worker Node #1</p>
               </div>
            </div>
            <span className="rounded-md bg-green-50 px-2 py-1 text-[10px] font-black uppercase text-green-700 dark:bg-green-900/20">Active</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-gray-100 p-5 opacity-50 dark:border-slate-800">
            <div className="flex items-center gap-3">
               <div className="h-2 w-2 rounded-full bg-gray-300" />
               <div>
                  <p className="font-black text-gray-900 dark:text-slate-100">Google Cloud Speech</p>
                  <p className="text-[10px] font-bold text-gray-500">Cloud API Integration</p>
               </div>
            </div>
            <button className="text-[10px] font-black uppercase text-gray-400">Kích hoạt</button>
          </div>
        </div>
      </div>

      {/* API Health */}
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
         <h3 className="mb-6 text-lg font-black text-gray-900 dark:text-slate-100">Trạng thái API & Độ trễ</h3>
         <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { name: 'Gemini API', lat: '120ms', status: 'Online' },
              { name: 'Whisper Core', lat: '450ms', status: 'Online' },
              { name: 'Vector DB', lat: '15ms', status: 'Online' },
              { name: 'Storage API', lat: '85ms', status: 'Online' },
            ].map(api => (
              <div key={api.name} className="space-y-2">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{api.name}</p>
                 <div className="flex items-end gap-2">
                    <span className="text-2xl font-black text-gray-900 dark:text-slate-100">{api.lat}</span>
                    <span className="mb-1 text-[10px] font-bold text-green-600 uppercase">{api.status}</span>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default AdminAIServices;
