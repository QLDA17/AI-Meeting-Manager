import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Clock3, Link as LinkIcon, Plus, LogOut, Mail, CheckCircle2 } from 'lucide-react';
import { Button, Input, Logo } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useOrgStore } from '../stores';
import api from '../services/api';
import { normalizeOrganization } from '../services/mappers';
import type { Organization } from '../types';

const extractInviteToken = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!trimmed.includes('token=')) return trimmed;

  try {
    const url = new URL(trimmed);
    return url.searchParams.get('token') || '';
  } catch {
    const params = new URLSearchParams(trimmed.split('?')[1] || trimmed);
    return params.get('token') || '';
  }
};

interface PendingInvitation {
  id: string;
  email: string;
  organization_id: string;
  organization_name?: string;
  role: string;
  expires_at: string;
  created_at?: string;
}

const OrganizationSetup: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const { createOrg, setCurrentOrg } = useOrgStore();
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [pendingInvitations, setPendingInvitations] = React.useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [inviteCode, setInviteCode] = React.useState('');
  const [orgName, setOrgName] = React.useState('');
  const [orgDescription, setOrgDescription] = React.useState('');
  const [joinError, setJoinError] = React.useState('');
  const [emailInviteError, setEmailInviteError] = React.useState('');
  const [emailInviteSuccess, setEmailInviteSuccess] = React.useState('');
  const [isJoiningByEmail, setIsJoiningByEmail] = React.useState<string | null>(null);
  const [createError, setCreateError] = React.useState('');
  const [createSuccess, setCreateSuccess] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  React.useEffect(() => {
    const loadSetupData = async () => {
      try {
        const [orgResponse, inviteResponse] = await Promise.all([
          api.get('/api/organizations'),
          api.get('/api/invitations/pending'),
        ]);
        const nextOrganizations = Array.isArray(orgResponse.data)
          ? orgResponse.data.map(normalizeOrganization)
          : [];
        const nextInvitations = Array.isArray(inviteResponse.data) ? inviteResponse.data : [];
        setOrganizations(nextOrganizations);
        setPendingInvitations(nextInvitations);

        if (nextOrganizations.some((org) => org.approvalStatus === 'active')) {
          navigate('/dashboard', { replace: true });
        }
      } catch {
        setOrganizations([]);
        setPendingInvitations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSetupData();
  }, [navigate]);

  const pendingOrganizations = organizations.filter((org) => org.approvalStatus === 'pending');

  const handleJoinOrganization = () => {
    const token = extractInviteToken(inviteCode);
    if (!token) {
      setJoinError('Vui long nhap ma moi hop le.');
      return;
    }

    setJoinError('');
    navigate(`/invite?token=${encodeURIComponent(token)}`);
  };

  const handleJoinByEmailInvitation = async (invitation: PendingInvitation) => {
    setEmailInviteError('');
    setEmailInviteSuccess('');
    setIsJoiningByEmail(invitation.id);

    try {
      await api.post(`/api/invitations/${invitation.id}/accept`);
      await refreshUser();
      setCurrentOrg(invitation.organization_id);
      setPendingInvitations((current) => current.filter((item) => item.id !== invitation.id));
      setEmailInviteSuccess(`Da tham gia to chuc ${invitation.organization_name || ''} thanh cong.`);
      navigate('/dashboard');
    } catch (err: any) {
      setEmailInviteError(
        err?.response?.data?.detail || 'Khong the tham gia to chuc tu loi moi email. Vui long thu lai.',
      );
    } finally {
      setIsJoiningByEmail(null);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setCreateError('Vui long nhap ten to chuc.');
      return;
    }

    setIsCreating(true);
    setCreateError('');
    setCreateSuccess('');

    try {
      const newOrg = await createOrg(orgName.trim(), orgDescription.trim() || undefined);
      await refreshUser();
      setOrganizations((current) => [...current, newOrg]);
      setOrgName('');
      setOrgDescription('');
      setCreateSuccess(
        'Yeu cau tao to chuc da duoc gui. System admin duyet xong thi ban se thanh org admin.',
      );
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Khong tao duoc to chuc. Vui long thu lai.');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        Dang tai thiet lap to chuc...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <Logo variant="dark" />
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-200">{user?.displayName || user?.email}</p>
              <p className="text-xs text-slate-400">Thiet lap workspace dau tien</p>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-400 transition hover:bg-red-500/20"
            >
              <LogOut size={18} />
              Dang xuat
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black tracking-tight">Chon cach vao to chuc</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            Sau khi dang ky, ban co the nhap ma moi de tham gia to chuc san co hoac tao to chuc moi.
            Neu tao to chuc moi, he thong se chuyen yeu cau sang system admin de duyet.
          </p>
        </div>

        {pendingOrganizations.length > 0 && (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-1 text-amber-300" size={22} />
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-amber-100">To chuc dang cho duyet</h2>
                {pendingOrganizations.map((org) => (
                  <p key={org.id} className="text-sm text-amber-50">
                    <strong>{org.name}</strong> dang o trang thai cho duyet. Khi system admin phe duyet,
                    tai khoan cua ban trong to chuc nay se duoc nang thanh <strong>org-admin</strong>.
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-300">
                <LinkIcon size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Nhap ma gia nhap to chuc</h2>
                <p className="text-sm text-slate-400">
                  Dan ma moi hoac link moi ma org admin gui cho ban.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="Nhap token hoac dan link moi"
                className="h-12 rounded-2xl border-slate-700 bg-slate-950 text-white"
              />
              {joinError && <p className="text-sm text-red-400">{joinError}</p>}
              <Button
                type="button"
                onClick={handleJoinOrganization}
                className="h-12 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-500"
              >
                Xem loi moi
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-primary-500/10 p-3 text-primary-300">
                <Building2 size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Tao to chuc moi</h2>
                <p className="text-sm text-slate-400">
                  Yeu cau tao org moi se vao hang doi duyet cua system admin.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <Input
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                placeholder="Ten to chuc"
                className="h-12 rounded-2xl border-slate-700 bg-slate-950 text-white"
              />
              <textarea
                value={orgDescription}
                onChange={(event) => setOrgDescription(event.target.value)}
                placeholder="Mo ta ngan cho system admin de duyet"
                rows={4}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
              />
              {createError && <p className="text-sm text-red-400">{createError}</p>}
              {createSuccess && <p className="text-sm text-green-400">{createSuccess}</p>}
              <Button
                type="submit"
                loading={isCreating}
                className="h-12 w-full rounded-2xl bg-primary-600 text-white hover:bg-primary-500"
              >
                <Plus size={18} className="mr-2" />
                Gui yeu cau tao to chuc
              </Button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 lg:col-span-2">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
                <Mail size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Tham gia bang loi moi email</h2>
                <p className="text-sm text-slate-400">
                  Org admin co the moi ban tu Admin Console. Neu co loi moi gui den {user?.email}, bam tham gia ben duoi.
                </p>
              </div>
            </div>

            {emailInviteError && <p className="mb-3 text-sm text-red-400">{emailInviteError}</p>}
            {emailInviteSuccess && <p className="mb-3 text-sm text-green-400">{emailInviteSuccess}</p>}

            {pendingInvitations.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                Hien chua co loi moi nao qua email.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <p className="text-base font-semibold text-slate-100">
                        {invitation.organization_name || 'To chuc'}
                      </p>
                      <p className="text-sm text-slate-400">Vai tro: {invitation.role}</p>
                      <p className="text-xs text-slate-500">
                        Het han: {new Date(invitation.expires_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      loading={isJoiningByEmail === invitation.id}
                      onClick={() => handleJoinByEmailInvitation(invitation)}
                      className="h-11 rounded-xl bg-emerald-600 px-5 text-white hover:bg-emerald-500"
                    >
                      <CheckCircle2 size={16} className="mr-2" />
                      Tham gia to chuc
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSetup;
