/**
 * CreateGroupModal Component
 * Modal để tạo group mới trong organization
 */
import React, { useState } from 'react';
import { X, Lock, Building2, Globe, Check, CheckCircle, PartyPopper, Sparkles, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useOrgStore } from '@/shared/lib/stores';

import { mockGroups } from '@/shared/mockData';
import type { PrivacyLevel, Group } from '@/shared/types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  name: string;
  description: string;
  privacyLevel: PrivacyLevel;
  selectedMembers: string[];
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrg, loadGroups } = useOrgStore();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    privacyLevel: 'private',
    selectedMembers: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Group | null>(null);

  // Mock users in org for invitation
  const orgMembers = React.useMemo(() => {
    if (!user?.orgMemberships) return [];
    const orgId = currentOrg?.id || user.orgMemberships[0]?.orgId;
    // In real app, this would come from API
    return [
      { id: 'user-001', email: 'nguyen.a@abc-company.com', displayName: 'Nguyễn Văn A' },
      { id: 'user-002', email: 'tran.b@abc-company.com', displayName: 'Trần Thị B' },
      { id: 'user-003', email: 'pham.c@abc-company.com', displayName: 'Phạm Văn C' },
    ];
  }, [user, currentOrg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Create new group (mock)
      const newGroup: Group = {
        id: `mock-group-${Date.now()}`,
        name: formData.name,
        orgId: currentOrg?.id || 'org-001',
        description: formData.description,
        privacyLevel: formData.privacyLevel,
        memberCount: formData.selectedMembers.length + 1,
        meetingCount: 0,
        totalHours: 0,
        createdBy: user?.id || 'user-001',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add to mock database
      mockGroups.push(newGroup);

      // Reload groups
      if (currentOrg?.id) {
        loadGroups(currentOrg.id);
      }

      setSuccess(newGroup);

      // Auto-close after success
      setTimeout(() => {
        navigate(`/groups/${newGroup.id}`);
        onClose();
      }, 2000);
    } catch (err) {
      setError('Có lỗi xảy ra khi tạo group. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMember = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedMembers: prev.selectedMembers.includes(userId)
        ? prev.selectedMembers.filter((id) => id !== userId)
        : [...prev.selectedMembers, userId],
    }));
  };

  const privacyOptions: Array<{ level: PrivacyLevel; icon: React.ReactNode; label: string; desc: string }> = [
    {
      level: 'private',
      icon: <Lock size={16} />,
      label: 'Private',
      desc: 'Only invited members can see',
    },
    {
      level: 'internal',
      icon: <Building2 size={16} />,
      label: 'Internal',
      desc: 'All org members can see',
    },
    {
      level: 'public',
      icon: <Globe size={16} />,
      label: 'Public',
      desc: 'Anyone can see, request join',
    },
  ];

  if (!isOpen) return null;

  // Success State
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Check size={32} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-slate-100">
              <PartyPopper size={24} className="text-green-600" /> Group Created Successfully!
            </h2>
            <p className="mt-2 text-gray-600 dark:text-slate-300">
              Welcome to "{success.name}"
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              You are now the Group Owner
            </p>

            <div className="mt-6 rounded-xl bg-gray-50 p-4 dark:bg-slate-800/70">
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
                <Sparkles size={14} className="text-primary-600" /> What's next?
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-600" /> Invite more members</li>
                <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-600" /> Upload meetings</li>
                <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-600" /> Manage settings</li>
                <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-600" /> View analytics</li>
              </ul>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => navigate(`/groups/${success.id}`)}
                className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                Go to Group
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-slate-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            ➕ Create New Group
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Organization */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200">
              Organization
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <Building2 size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-800 dark:text-slate-100">
                {currentOrg?.name || 'ABC Company'}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              You'll be adding this group to your organization
            </p>
          </div>

          {/* Group Name */}
          <div className="mb-5">
            <label 
              htmlFor="group-name"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200"
            >
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              id="group-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder='Ex: "Marketing Q3", "Tech Team", etc'
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-primary-900/30"
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <label 
              htmlFor="group-description"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200"
            >
              Description
            </label>
            <textarea
              id="group-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional - what's this group for?"
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-primary-900/30"
            />
          </div>

          {/* Privacy Level */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200">
              Privacy Level
            </label>
            <div className="space-y-2">
              {privacyOptions.map((option) => (
                <label
                  key={option.level}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                    formData.privacyLevel === option.level
                      ? 'border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20'
                      : 'border-gray-200 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="privacy"
                    value={option.level}
                    checked={formData.privacyLevel === option.level}
                    onChange={(e) =>
                      setFormData({ ...formData, privacyLevel: e.target.value as PrivacyLevel })
                    }
                    className="h-4 w-4 text-primary-600"
                  />
                  <div className="flex items-center gap-2">
                    {option.icon}
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{option.desc}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Invite Members */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200">
              Invite Initial Members (Optional)
            </label>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700">
              <div className="max-h-40 overflow-y-auto p-2">
                {orgMembers.map((member) => {
                  const isSelected = formData.selectedMembers.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMember(member.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition ${
                        isSelected
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
                          : 'text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="h-4 w-4"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{member.displayName}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-slate-400">
                          {member.email}
                        </p>
                      </div>
                      {isSelected && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
              {formData.selectedMembers.length > 0 && (
                <div className="border-t border-gray-200 px-3 py-2 dark:border-slate-700">
                  <p className="text-xs text-gray-600 dark:text-slate-300">
                    Selected: {formData.selectedMembers.length} member(s)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info Note */}
          <div className="mb-6 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <p className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
              <Info size={12} /> <strong>Note:</strong> You will be the Group Admin. You can manage members, meetings, and settings after creation.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name}
              className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : '✓ Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
