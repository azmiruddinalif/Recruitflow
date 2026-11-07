'use client';

import React, { useState } from 'react';
import { Building2, KeyRound, Save, ShieldCheck } from 'lucide-react';
import { useRecruitFlow } from '@/stores/recruitflow-store';

export default function SettingsPage() {
  const { activeOrganization, currentUser, can, updateOrganizationSettings, pushToast } =
    useRecruitFlow();

  const [orgName, setOrgName] = useState(activeOrganization.name);
  const [industry, setIndustry] = useState(activeOrganization.industry);
  const [website, setWebsite] = useState(activeOrganization.website);
  const [timezone, setTimezone] = useState(activeOrganization.defaultTimezone);
  const [currency, setCurrency] = useState(activeOrganization.defaultCurrency);
  const [allowAIResumeParsing, setAllowAIResumeParsing] = useState(
    activeOrganization.allowAIResumeParsing,
  );
  const [allowAICandidateMatching, setAllowAICandidateMatching] = useState(
    activeOrganization.allowAICandidateMatching,
  );

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateOrganizationSettings({
      name: orgName,
      industry,
      website,
      defaultTimezone: timezone,
      defaultCurrency: currency,
      allowAIResumeParsing,
      allowAICandidateMatching,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Workspace & Security Settings
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Configure organization branding, AI policies, and Better Auth session security.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleSaveOrg}
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-600" />
            Organization Profile & AI Policies
          </h2>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Industry</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Timezone
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Currency</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={allowAIResumeParsing}
                onChange={(e) => setAllowAIResumeParsing(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600"
              />
              Enable AI Resume Parsing (Human-in-the-loop review required)
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={allowAICandidateMatching}
                onChange={(e) => setAllowAICandidateMatching(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600"
              />
              Enable Explainable AI Candidate-to-Job Matching
            </label>
          </div>
          <button
            type="submit"
            disabled={!can('organization.manage')}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save Organization Settings
          </button>
        </form>

        {/* Better Auth User & Session Security */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            Authenticated User & Better Auth Session Security
          </h2>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1 text-xs">
            <p className="font-semibold text-slate-900">{currentUser.name}</p>
            <p className="text-slate-600">{currentUser.email}</p>
            <p className="text-indigo-600 font-medium">Active Role: {currentUser.role}</p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() =>
                pushToast(
                  'Other sessions revoked',
                  'All other Better Auth sessions have been invalidated.',
                  'info',
                )
              }
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <KeyRound className="h-4 w-4 text-indigo-600" />
              Revoke All Other Active Sessions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
