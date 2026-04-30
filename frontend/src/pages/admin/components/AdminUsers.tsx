import React from 'react';
import { Search, Shield, Users, UserCheck, UserMinus } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../../services/api';
import { normalizeUser } from '../../../services/mappers';
import { toast } from '../../../components/ui/Toast';
import type { User } from '../../../types';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/admin/users');
      const rows = Array.isArray(response.data) ? response.data.map(normalizeUser) : [];
      setUsers(rows);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Khong tai duoc danh sach nguoi dung');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleStatus = async (user: User) => {
    setUpdatingId(user.id);
    try {
      const response = await api.patch(`/api/admin/users/${user.id}/status`, {
        is_active: !user.isActive,
      });
      const updated = normalizeUser(response.data);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(updated.isActive ? 'Da kich hoat tai khoan' : 'Da vo hieu hoa tai khoan');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Khong cap nhat duoc trang thai');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const haystack = `${user.displayName || ''} ${user.email} ${user.username || ''}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.isActive).length;
  const disabledUsers = totalUsers - activeUsers;
  const systemAdminUsers = users.filter((user) => user.systemRole === 'system-admin').length;

  const stats = [
    { label: 'Tong nguoi dung', value: String(totalUsers), icon: <Users />, color: 'blue' },
    { label: 'Dang hoat dong', value: String(activeUsers), icon: <UserCheck />, color: 'green' },
    { label: 'Bi vo hieu hoa', value: String(disabledUsers), icon: <UserMinus />, color: 'red' },
    { label: 'System Admin', value: String(systemAdminUsers), icon: <Shield />, color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const colorStyles = {
            blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
            green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
            purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
            red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
          }[s.color as 'blue' | 'green' | 'purple' | 'red'];

          return (
            <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className={clsx('rounded-xl p-2', colorStyles)}>{s.icon}</div>
                <div>
                  <p className="text-2xl font-black text-gray-900 dark:text-slate-100">{s.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tim kiem nguoi dung bang ten, email, username..."
            className="w-full rounded-2xl border border-gray-200 bg-white px-10 py-3 text-sm font-bold outline-none focus:border-red-400 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        {error && <p className="text-sm font-semibold text-red-500">{error}</p>}

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-5">Nguoi dung</th>
                <th className="px-6 py-5">Email</th>
                <th className="px-6 py-5">Role</th>
                <th className="px-6 py-5">To chuc</th>
                <th className="px-6 py-5 text-right">Thao tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading && (
                <tr>
                  <td className="px-6 py-6 text-sm text-gray-500" colSpan={5}>
                    Dang tai du lieu...
                  </td>
                </tr>
              )}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-sm text-gray-500" colSpan={5}>
                    Khong co nguoi dung nao phu hop.
                  </td>
                </tr>
              )}
              {!loading &&
                filteredUsers.map((user) => (
                  <tr key={user.id} className="transition hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-[11px] font-black text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                          {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-900 dark:text-slate-100">{user.displayName || user.username || user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-medium text-gray-600 dark:text-slate-400">{user.email}</td>
                    <td className="px-6 py-5">
                      {user.systemRole === 'system-admin' ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-red-700 dark:bg-red-900/20 dark:text-red-400">
                          <Shield size={10} /> Admin
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 italic">User</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-gray-500">
                      {user.orgMemberships.length > 0 ? `${user.orgMemberships.length} Org(s)` : '---'}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        disabled={updatingId === user.id}
                        className={clsx(
                          'text-xs font-black uppercase tracking-widest transition-colors',
                          user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700',
                          updatingId === user.id && 'cursor-not-allowed opacity-60',
                        )}
                      >
                        {updatingId === user.id ? 'Dang cap nhat...' : user.isActive ? 'Khoa' : 'Mo khoa'}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
