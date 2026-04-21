import React, { useState } from 'react';
import {
  TerminalSquare,
  Save,
  RotateCcw,
  Plus,
  Play,
  Copy,
  Info,
  Code,
} from 'lucide-react';

interface SystemPrompt {
  id: string;
  name: string;
  key: string;
  description: string;
  content: string;
  version: string;
  lastUpdated: string;
  variables: string[];
}

const mockPrompts: SystemPrompt[] = [
  {
    id: '1',
    name: 'Tóm tắt cuộc họp (Việt)',
    key: 'summary_vi',
    description: 'Dùng để tạo bản tóm tắt nội dung cuộc họp bằng tiếng Việt.',
    version: '2.4.0',
    lastUpdated: '2025-04-10',
    variables: ['transcript', 'org_name', 'group_name', 'attendees'],
    content: `Bạn là một trợ lý thư ký cuộc họp chuyên nghiệp. 
Dựa trên bản ghi (transcript) dưới đây của tổ chức {{org_name}}, hãy tạo một bản tóm tắt chuyên nghiệp.

YÊU CẦU:
1. Viết bằng tiếng Việt, giọng văn trang trọng.
2. Tóm tắt các ý chính thảo luận.
3. Làm nổi bật các quyết định quan trọng.

BẢN GHI:
{{transcript}}`,
  },
  {
    id: '2',
    name: 'Trích xuất Việc cần làm',
    key: 'action_items',
    description: 'Dùng để nhận diện và trích xuất các đầu việc từ bản ghi.',
    version: '1.2.0',
    lastUpdated: '2025-03-25',
    variables: ['transcript', 'attendees'],
    content: `Trích xuất danh sách các việc cần làm (Action Items) từ bản ghi cuộc họp sau.
Mỗi việc cần làm phải bao gồm: Tên việc, Người phụ trách (nếu có), và Hạn hoàn thành (nếu có).

BẢN GHI:
{{transcript}}`,
  },
];

const AdminPrompts: React.FC = () => {
  const [selectedPrompt, setSelectedPrompt] = useState<SystemPrompt>(mockPrompts[0]);
  const [editContent, setEditContent] = useState(mockPrompts[0].content);
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = (prompt: SystemPrompt) => {
    setSelectedPrompt(prompt);
    setEditContent(prompt.content);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Đã cập nhật phiên bản Prompt mới thành công!');
    }, 1200);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Sidebar: Prompt List */}
      <div className="lg:col-span-4 space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">System Prompts</h3>
          <button className="rounded-lg bg-red-600 p-1.5 text-white">
            <Plus size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {(mockPrompts || []).map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              className={`flex w-full flex-col gap-1 rounded-2xl border p-4 text-left transition-all ${
                selectedPrompt.id === p.id
                  ? 'border-red-500 bg-red-50/50 shadow-sm dark:bg-red-900/10'
                  : 'border-gray-100 bg-white hover:border-gray-300 dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-black ${selectedPrompt.id === p.id ? 'text-red-600' : 'text-gray-900 dark:text-slate-100'}`}>
                  {p.name}
                </span>
                <span className="text-[10px] font-bold text-gray-400">v{p.version}</span>
              </div>
              <p className="line-clamp-1 text-xs text-gray-500">{p.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500 dark:bg-slate-800 uppercase">
                  {p.key}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main: Prompt Editor */}
      <div className="lg:col-span-8">
        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="rounded-xl bg-red-600 p-2 text-white shadow-lg shadow-red-500/20">
                  <TerminalSquare size={20} />
               </div>
               <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">{selectedPrompt.name}</h3>
                  <p className="text-xs font-medium text-gray-500">Key: <span className="font-mono text-red-500">{selectedPrompt.key}</span></p>
               </div>
            </div>
            <div className="flex gap-2">
               <button className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <RotateCcw size={14} />
                  Rollback
               </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Editor Area */}
            <div>
               <div className="mb-3 flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Nội dung Prompt</label>
                  <div className="flex gap-2">
                    {(selectedPrompt.variables || []).map(v => (
                       <span key={v} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-900/30">
                         {`{{${v}}}`}
                       </span>
                    ))}
                  </div>
               </div>
               <div className="relative">
                  <textarea
                    rows={12}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-6 font-mono text-sm leading-relaxed text-gray-700 outline-none focus:border-red-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  />
                  <div className="absolute bottom-4 right-4 flex gap-2">
                     <button className="rounded-lg bg-white p-2 text-gray-400 shadow-sm hover:text-gray-600 dark:bg-slate-700">
                        <Copy size={16} />
                     </button>
                     <button className="rounded-lg bg-white p-2 text-gray-400 shadow-sm hover:text-primary-600 dark:bg-slate-700">
                        <Play size={16} />
                     </button>
                  </div>
               </div>
            </div>

            {/* Config & Info */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
               <div className="rounded-2xl border border-gray-100 bg-gray-50/30 p-4 dark:border-slate-800">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold text-gray-500">
                     <Info size={14} />
                     Thông tin phiên bản
                  </div>
                  <div className="space-y-2">
                     <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Phiên bản hiện tại</span>
                        <span className="font-bold text-gray-900 dark:text-slate-100">v{selectedPrompt.version}</span>
                     </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Cập nhật lần cuối</span>
                        <span className="font-bold text-gray-900 dark:text-slate-100">{selectedPrompt.lastUpdated}</span>
                     </div>
                  </div>
               </div>
               <div className="rounded-2xl border border-gray-100 bg-gray-50/30 p-4 dark:border-slate-800">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold text-gray-500">
                     <Code size={14} />
                     Cài đặt mô hình
                  </div>
                  <div className="space-y-2">
                     <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Temperature</span>
                        <span className="font-bold text-gray-900 dark:text-slate-100">0.2</span>
                     </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Max Tokens</span>
                        <span className="font-bold text-gray-900 dark:text-slate-100">2048</span>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex justify-end pt-4">
               <button
                 onClick={handleSave}
                 disabled={isSaving}
                 className="flex items-center gap-2 rounded-2xl bg-red-600 px-10 py-3.5 font-black text-white shadow-xl shadow-red-500/20 transition hover:bg-red-700 disabled:opacity-50"
               >
                 {isSaving ? 'Đang lưu...' : (
                    <>
                      <Save size={20} />
                      Lưu & Deploy Phiên bản mới
                    </>
                 )}
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPrompts;
