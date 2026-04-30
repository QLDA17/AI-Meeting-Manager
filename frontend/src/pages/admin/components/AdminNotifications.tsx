import React from 'react';
import { Send, Trash2 } from 'lucide-react';
import api from '../../../services/api';
import { toast } from '../../../components/ui/Toast';

type BroadcastItem = {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'broadcast';
  target: string;
  status: string;
  sentAt: string;
  reach: number;
};

const AdminNotifications: React.FC = () => {
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [type, setType] = React.useState<'info' | 'warning' | 'broadcast'>('info');
  const [target, setTarget] = React.useState('all');
  const [history, setHistory] = React.useState<BroadcastItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');

  const loadHistory = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/admin/notifications');
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Khong tai duoc lich su thong bao');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      const response = await api.post('/api/admin/notifications', { title, content, type, target });
      setHistory((current) => [response.data, ...current]);
      setTitle('');
      setContent('');
      toast.success('Da gui thong bao he thong');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Khong gui duoc thong bao');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/admin/notifications/${id}`);
      setHistory((current) => current.filter((item) => item.id !== id));
      toast.success('Da xoa thong bao');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Khong xoa duoc thong bao');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-lg font-black text-gray-900 dark:text-slate-100">Broadcast moi</h3>
          <form onSubmit={handleSend} className="space-y-3">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tieu de"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Noi dung"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'info' | 'warning' | 'broadcast')}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="info">Thong tin</option>
                <option value="warning">Canh bao</option>
                <option value="broadcast">Quan trong</option>
              </select>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="all">Toan he thong</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
            >
              <Send size={16} />
              {sending ? 'Dang gui...' : 'Gui broadcast'}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="rounded-3xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-gray-100 px-6 py-4 dark:border-slate-800">
            <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">Lich su gui</h3>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {loading && <p className="p-6 text-sm text-gray-500">Dang tai du lieu...</p>}
            {!loading && history.length === 0 && <p className="p-6 text-sm text-gray-500">Chua co broadcast nao.</p>}
            {!loading &&
              history.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 p-6">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 dark:text-slate-100">{item.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.content}</p>
                    <p className="mt-2 text-[11px] font-semibold text-gray-400">
                      {new Date(item.sentAt).toLocaleString('vi-VN')} - reach: {item.reach}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;
