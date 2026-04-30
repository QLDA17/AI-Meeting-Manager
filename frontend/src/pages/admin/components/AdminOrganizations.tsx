import React from 'react';
import { Building2, CheckCircle2, Clock3, Search, ShieldCheck } from 'lucide-react';
import api from '../../../services/api';
import { normalizeOrganization } from '../../../services/mappers';
import type { Organization } from '../../../types';

const AdminOrganizations: React.FC = () => {
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [error, setError] = React.useState('');
  const [approvingId, setApprovingId] = React.useState<string | null>(null);

  const loadOrganizations = React.useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.get('/api/organizations');
      setOrganizations(
        Array.isArray(response.data) ? response.data.map(normalizeOrganization) : [],
      );
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Khong tai duoc danh sach to chuc.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const handleApprove = async (organizationId: string) => {
    setApprovingId(organizationId);
    setError('');

    try {
      const response = await api.post(`/api/admin/organizations/${organizationId}/approve`);
      const approvedOrganization = normalizeOrganization(response.data);
      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === approvedOrganization.id ? approvedOrganization : organization,
        ),
      );
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Khong phe duyet duoc to chuc.');
    } finally {
      setApprovingId(null);
    }
  };

  const filteredOrganizations = organizations.filter((organization) => {
    const haystack = `${organization.name} ${organization.description || ''}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  const pendingOrganizations = filteredOrganizations.filter(
    (organization) => organization.approvalStatus === 'pending',
  );
  const approvedOrganizations = filteredOrganizations.filter(
    (organization) => organization.approvalStatus !== 'pending',
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              <Building2 />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900 dark:text-slate-100">
                {organizations.length}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Tong to chuc
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
              <Clock3 />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900 dark:text-slate-100">
                {organizations.filter((organization) => organization.approvalStatus === 'pending').length}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Cho duyet
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-50 p-2 text-green-600 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle2 />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900 dark:text-slate-100">
                {organizations.filter((organization) => organization.approvalStatus !== 'pending').length}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Da kich hoat
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tim kiem to chuc theo ten hoac mo ta..."
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-red-400 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>

      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/30 dark:bg-amber-900/10">
        <div className="mb-4 flex items-center gap-3">
          <Clock3 className="text-amber-600 dark:text-amber-400" size={22} />
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
              To chuc dang cho duyet
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Khi phe duyet, creator cua to chuc se duoc nang thanh org-admin.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-600 dark:text-slate-300">Dang tai danh sach...</p>
        ) : pendingOrganizations.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-slate-300">Khong co yeu cau cho duyet.</p>
        ) : (
          <div className="space-y-4">
            {pendingOrganizations.map((organization) => (
              <div
                key={organization.id}
                className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-white p-5 dark:border-amber-900/30 dark:bg-slate-900 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    {organization.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                    {organization.description || 'Khong co mo ta.'}
                  </p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                    Requested by: {organization.requestedByUserId || 'Unknown'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleApprove(organization.id)}
                  disabled={approvingId === organization.id}
                  className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldCheck size={16} className="mr-2" />
                  {approvingId === organization.id ? 'Dang phe duyet...' : 'Phe duyet va nang role'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-slate-100">
          To chuc da kich hoat
        </h2>
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/60">
              <tr>
                <th className="px-4 py-3 font-bold text-gray-500">To chuc</th>
                <th className="px-4 py-3 font-bold text-gray-500">Thanh vien</th>
                <th className="px-4 py-3 font-bold text-gray-500">Ngay duyet</th>
                <th className="px-4 py-3 font-bold text-gray-500">Trang thai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {approvedOrganizations.map((organization) => (
                <tr key={organization.id}>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">
                    {organization.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                    {organization.memberCount}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                    {organization.approvedAt
                      ? new Date(organization.approvedAt).toLocaleString('vi-VN')
                      : '--'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/20 dark:text-green-300">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
              {!isLoading && approvedOrganizations.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                    Chua co to chuc nao da kich hoat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminOrganizations;
