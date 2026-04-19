/**
 * OrgSettingsTab - Cài đặt organization
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { getOrgById } from '../../data';

interface OrgSettingsTabProps {
  orgId: string;
}

const OrgSettingsTab: React.FC<OrgSettingsTabProps> = ({ orgId }) => {
  const org = getOrgById(orgId);
  const [formData, setFormData] = useState({
    name: org?.name || '',
    description: org?.description || '',
    defaultRole: 'member',
    sttProvider: 'google',
    translationLang: 'en',
    allowCreateGroups: true,
    autoSummarize: true,
    requireApproval: false,
    retention: '90',
    maxAudioSize: '50',
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Mock save
    console.log('Saving org settings:', formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
          Organization Settings
        </h3>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Configure organization preferences and policies
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
              Organization Name
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
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Default Role for New Members
            </label>
            <select
              value={formData.defaultRole}
              onChange={(e) => handleChange('defaultRole', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="member">Member (can create groups)</option>
              <option value="viewer">Viewer (read-only)</option>
            </select>
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-100">
          AI & Processing
        </h4>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
              STT Provider
            </label>
            <select
              value={formData.sttProvider}
              onChange={(e) => handleChange('sttProvider', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="google">Google Gemini</option>
              <option value="openai">OpenAI Whisper</option>
              <option value="azure">Azure Speech</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Default Translation Language
            </label>
            <select
              value={formData.translationLang}
              onChange={(e) => handleChange('translationLang', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="en">English</option>
              <option value="ja">Japanese</option>
              <option value="vi">Vietnamese</option>
            </select>
          </div>
        </div>
      </div>

      {/* Policies */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-100">
          Policies & Permissions
        </h4>
        <div className="space-y-4">
          {/* Toggle: Allow Create Groups */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                Allow Members to Create Groups
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Any member can create a new group and become its admin
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={formData.allowCreateGroups}
                onChange={(e) => handleChange('allowCreateGroups', e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>

          {/* Toggle: Auto Summarize */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                Auto-summarize Meetings
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Automatically generate AI summaries after processing
              </p>
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
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                Require Approval for External Sharing
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Meetings shared outside org need admin approval
              </p>
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

      {/* Retention & Limits */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-100">
          Retention & Limits
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Meeting Retention (days)
            </label>
            <select
              value={formData.retention}
              onChange={(e) => handleChange('retention', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
              <option value="forever">Forever</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Max Audio Size (MB)
            </label>
            <select
              value={formData.maxAudioSize}
              onChange={(e) => handleChange('maxAudioSize', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="25">25 MB</option>
              <option value="50">50 MB</option>
              <option value="100">100 MB</option>
              <option value="250">250 MB</option>
            </select>
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
                Archive Organization
              </button>
              <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700">
                Delete Organization
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

export default OrgSettingsTab;
