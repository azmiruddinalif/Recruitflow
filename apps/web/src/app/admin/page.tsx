'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Building2,
  Cpu,
  KeyRound,
  ShieldAlert,
  Users,
} from 'lucide-react';
import type { AIProviderType } from '@recruitflow/types';
import { useRecruitFlow } from '@/stores/recruitflow-store';

export default function SuperAdminPage() {
  const {
    organizations,
    candidates,
    jobs,
    applications,
    aiProviders,
    auditLogs,
    updateAIProviderConfig,
  } = useRecruitFlow();

  const [editingProvider, setEditingProvider] = useState<AIProviderType | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState('gpt-4o-mini');

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;
    await updateAIProviderConfig(editingProvider, {
      modelName: modelInput,
      isConfigured: true,
      isActive: true,
      maskedApiKey: apiKeyInput
        ? `••••••••${apiKeyInput.slice(-4)}`
        : '••••••••9a4f',
    });
    setEditingProvider(null);
    setApiKeyInput('');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                <ShieldAlert className="h-3.5 w-3.5" />
                SUPER_ADMIN
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Platform Super Admin Console
              </h1>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Global oversight of tenant organizations, AI provider credentials, subscription plans, and security audit logs.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Tenant Workspace
          </Link>
        </div>

        {/* Platform KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Tenant Organizations</span>
              <Building2 className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{organizations.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Global Candidates</span>
              <Users className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{candidates.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Active Jobs & Applications</span>
              <Activity className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              {jobs.length} Jobs / {applications.length} Apps
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Configured AI Engines</span>
              <Cpu className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-2">
              {aiProviders.filter((p) => p.isConfigured).length} / {aiProviders.length} Active
            </p>
          </div>
        </div>

        {/* Global AI Provider Configuration */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            Global AI Provider Configuration (OpenAI, Google Gemini, Anthropic Claude)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiProviders.map((prov) => (
              <div
                key={prov.provider}
                className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{prov.displayName}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      prov.isConfigured
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {prov.isConfigured ? 'CONFIGURED' : 'UNCONFIGURED'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-mono">Model: {prov.modelName}</p>
                <p className="text-xs text-slate-500 font-mono">
                  Key: {prov.maskedApiKey || 'Not Set'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProvider(prov.provider);
                    setModelInput(prov.modelName);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Configure Credentials
                </button>
              </div>
            ))}
          </div>

          {editingProvider && (
            <form
              onSubmit={handleSaveProvider}
              className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 space-y-3"
            >
              <p className="text-xs font-semibold text-indigo-900">
                Update {editingProvider} Credentials
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="password"
                  placeholder="Enter API Key (sk-... / AIza...)"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="Default Model"
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white"
                >
                  Save Provider
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProvider(null)}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Audit Logs */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Platform Security Audit Logs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 font-semibold">Timestamp</th>
                  <th className="py-2 font-semibold">Organization</th>
                  <th className="py-2 font-semibold">Actor</th>
                  <th className="py-2 font-semibold">Action</th>
                  <th className="py-2 font-semibold">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 text-slate-500 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 font-medium text-slate-900">{log.organizationName}</td>
                    <td className="py-2.5 text-slate-700">
                      {log.actorName} ({log.actorEmail})
                    </td>
                    <td className="py-2.5 font-mono text-indigo-600">{log.action}</td>
                    <td className="py-2.5 font-mono text-slate-500">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
