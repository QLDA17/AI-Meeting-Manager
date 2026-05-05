/**
 * Cá nhân Page (v2)
 * User profile với multi-org support, notification preferences, security
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Calendar,
  Globe,
  Bell,
  Shield,
  Building2,
  LogOut,
  Edit,
  Check,
} from 'lucide-react';
import { mockOrganizations } from '@/shared/mockData';
import type { Organization } from '@/shared/types';

type ProfileTab = 'profile' | 'organizations' | 'notifications' | 'security';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [isEditing, setIsEditing] = useState(false);

  const tabs: Array<{ key: ProfileTab; label: string; icon: React.ReactNode }> = [
    { key: 'profile', label: 'Cá nhân', icon: <User size={16} /> },
    { key: 'organizations', label: 'Tổ chức', icon: <Building2 size={16} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { key: 'security', label: 'Bảo mật', icon: <Shield size={16} /> },
  ];

  const userOrgs: Array<{ org: Organization; role: string }> = React.useMemo(() => {
    if (!user?.orgMemberships) return [];
    return user.orgMemberships
      .map((membership) => ({
        org: mockOrganizations.find((o) => o.id === membership.orgId)!,
        role: membership.role,
      }))
      .filter((item) => item.org);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel-glass rounded-3xl border border-gray-200 p-6 shadow-card dark:border-slate-700"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
            {(user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              {user?.displayName || user?.email}
            </h1>
            <p className="text-gray-600 dark:text-slate-300">{user?.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                {user?.systemRole || 'member'}
              </span>
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Tabs */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-900">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-100 px-2 dark:border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600 dark:border-primary-300 dark:text-primary-300'
                  : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Cá nhân Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                  Thông tin cá nhân
                </h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {isEditing ? <Check size={14} /> : <Edit size={14} />}
                  {isEditing ? 'Save' : 'Edit'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200">
                    <User size={14} className="mr-1 inline" />
                    Tên hiển thị
                  </label>
                  <input
                    type="text"
                    defaultValue={user?.displayName || ''}
                    disabled={!isEditing}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-primary-900/30 dark:disabled:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200">
                    <Mail size={14} className="mr-1 inline" />
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue={user?.email || ''}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200">
                    <Globe size={14} className="mr-1 inline" />
                    Ngôn ngữ
                  </label>
                  <select
                    defaultValue={user?.language || 'vi'}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-primary-900/30"
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200">
                    <Calendar size={14} className="mr-1 inline" />
                    Múi giờ
                  </label>
                  <select
                    defaultValue={user?.timezone || 'Asia/Ho_Chi_Minh'}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-primary-900/30"
                  >
                    <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Tổ chức Tab */}
          {activeTab === 'organizations' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                My Tổ chức ({userOrgs.length})
              </h3>

              {userOrgs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-slate-700">
                  <Building2 size={32} className="mx-auto mb-3 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    No organizations yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userOrgs.map(({ org, role }) => (
                    <div
                      key={org.id}
                      className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/40">
                            <Building2 size={20} className="text-primary-600 dark:text-primary-300" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-gray-900 dark:text-slate-100">
                              {org.name}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-slate-300">
                              {org.description}
                            </p>
                            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                                {role}
                              </span>
                              <span>{org.memberCount} members</span>
                              <span>{org.groupCount} groups</span>
                              <span>{org.meetingCount} meetings</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/')}
                          className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-700"
                        >
                          Switch to Org
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                Tùy chọn thông báo
              </h3>

              <div className="space-y-3">
                {[
                  { key: 'meetingSummaries', label: 'Tóm tắt cuộc họp', desc: 'Get AI-generated meeting summaries' },
                  { key: 'groupAnnouncements', label: 'Thông báo nhóm', desc: 'Notifications for group-wide announcements' },
                  { key: 'slackIntegration', label: 'Tích hợp Slack', desc: 'Send notifications to Slack' },
                ].map((pref) => (
                  <div
                    key={pref.key}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {pref.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{pref.desc}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-primary-100 dark:bg-slate-700 dark:peer-focus:ring-primary-900"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bảo mật Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                Bảo mật & Account
              </h3>

              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    Đổi mật khẩu
                  </h4>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    Update your password to keep your account secure
                  </p>
                  <button className="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700">
                    Đổi mật khẩu
                  </button>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    Two-Factor Authentication (2FA)
                  </h4>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    Add an extra layer of security to your account
                  </p>
                  <button className="mt-3 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                    Bật 2FA
                  </button>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/20">
                  <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">
                    Logout All Sessions
                  </h4>
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    This will log you out from all devices
                  </p>
                  <button className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700">
                    Logout All
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                  >
                    <LogOut size={14} />
                    Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
