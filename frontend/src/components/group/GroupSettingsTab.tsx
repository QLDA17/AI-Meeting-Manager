/**
 * GroupSettingsTab - Tab cài đặt group
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  RotateCcw,
  AlertTriangle,
  Lock,
  Building2,
  Globe,
  Users,
  FileText,
  Bell,
} from 'lucide-react';
import { getGroupById } from '../../data';
import type { PrivacyLevel } from '../../types';

interface GroupSettingsTabProps {
  groupId: string;
}

const GroupSettingsTab: React.FC<GroupSettingsTabProps> = ({ groupId }) => {
  const group = getGroupById(groupId);
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    privacyLevel: group?.privacyLevel || 'internal' as PrivacyLevel,
    allowCreateMeetings: true,
    autoSummarize: true,
    requireApproval: false,
    notifications: true,
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('Saving group settings:', formData);
  };

  const privacyOptions: Array<{ value: PrivacyLevel; icon: React.ReactNode; label: string; desc: string }> = [
    {
      value: 'private',
      icon: <Lock size={14} />,
      label: 'Private',
      desc: 'Only invited members can see',
    },
    {
      value: 'internal',
      icon: <Building2 size={14} />,
      label: 'Internal',
      desc: 'All org members can see',
    },
    {
      value: 'public',
      icon: <Globe size={14} />,
      label: 'Public',
      desc: 'Anyone can see, request join',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
          Group Settings
        </h3>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Configure group preferences and policies
        </p>
      </div>

      {/* General Settings */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-100">
          General Information
        </h4>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Group Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-primary-900/30"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-primary-900/30"
            />
          </div>
        </div>
      </div>

      {/* Privacy Level */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-100">
          Privacy Level
        </h4>
        <div className="space-y-3">
          {privacyOptions.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                formData.privacyLevel === option.value
                  ? 'border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20'
                  : 'border-gray-200 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              <input
                type="radio"
                name="privacy"
                value={option.value}
                checked={formData.privacyLevel === option.value}
                onChange={(e) => handleChange('privacyLevel', e.target.value)}
                className="h-4 w-4 text-primary-600"
              />
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-slate-400">{option.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{option.label}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{option.desc}</p>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Policies */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-100">
          Policies & Permissions
        </h4>
        <div className="space-y-4">
          {/* Toggle: Allow Create Meetings */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <FileText size={18} className="mt-0.5 text-gray-500 dark:text-slate-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  Allow Members to Create Meetings
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Any member can upload audio and create meetings
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={formData.allowCreateMeetings}
                onChange={(e) => handleChange('allowCreateMeetings', e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>

          {/* Toggle: Auto Summarize */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Bell size={18} className="mt-0.5 text-gray-500 dark:text-slate-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  Auto-summarize Meetings
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Automatically generate AI summaries after processing
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={formData.autoSummarize}
                onChange={(e) => handleChange('autoSummarize', e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>

          {/* Toggle: Require Approval */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Users size={18} className="mt-0.5 text-gray-500 dark:text-slate-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  Require Approval for New Members
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Admin must approve before someone can join
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={formData.requireApproval}
                onChange={(e) => handleChange('requireApproval', e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-900/20">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">
              Danger Zone
            </h4>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              These actions are irreversible. Proceed with caution.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/40">
                Transfer Ownership
              </button>
              <button className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/40">
                Archive Group
              </button>
              <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700">
                Delete Group
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Actions */}
      <div className="flex items-center justify-end gap-3">
        <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
          <RotateCcw size={14} />
          Reset to Default
        </button>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          <Save size={14} />
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default GroupSettingsTab;
