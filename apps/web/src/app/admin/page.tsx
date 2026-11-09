'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  Building2,
  Cpu,
  KeyRound,
  Loader2,
  ShieldAlert,
  Users,
} from 'lucide-react';
import type { AIProviderType } from '@recruitflow/types';
import {
  useAdminOverview,
  useAdminPlans,
  useToggleOrganizationStatus,
  useUpdateAdminPlan,
  useUpsertGlobalAIProvider,
  type AdminPlan,
} from '@/features/admin/use-admin';
import { useRecruitFlow } from '@/stores/recruitflow-store';
import { ApiClientError } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PROVIDER_LABELS: Record<AIProviderType, string> = {
  OPENAI: 'OpenAI',
  GEMINI: 'Google Gemini',
  ANTHROPIC: 'Anthropic Claude',
};

function PlanManagementCard({ plan }: { plan: AdminPlan }) {
  const updatePlan = useUpdateAdminPlan();
  const { pushToast } = useRecruitFlow();

  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description);
  const [priceMonthly, setPriceMonthly] = useState(plan.priceMonthlyCents / 100);
  const [maxJobs, setMaxJobs] = useState(plan.maxJobs);
  const [maxCandidates, setMaxCandidates] = useState(plan.maxCandidates);
  const [maxMembers, setMaxMembers] = useState(plan.maxMembers);
  const [aiCredits, setAiCredits] = useState(plan.aiCreditsMonthly);
  const [featuresText, setFeaturesText] = useState(plan.features.join('\n'));
  const [isPublic, setIsPublic] = useState(plan.isPublic);
  const [isActive, setIsActive] = useState(plan.isActive);

  const handleSave = async () => {
    try {
      await updatePlan.mutateAsync({
        planId: plan.id,
        name,
        description,
        priceMonthlyCents: Math.round(priceMonthly * 100),
        maxJobs,
        maxCandidates,
        maxMembers,
        aiCreditsMonthly: aiCredits,
        features: featuresText.split('\n').map((f) => f.trim()).filter(Boolean),
        isPublic,
        isActive,
      });
      pushToast(`${name} plan updated`, 'Changes are live on the pricing page immediately.', 'success');
    } catch (error) {
      pushToast(
        'Could not save plan',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="font-semibold text-slate-900"
        />
        <Badge variant="default" className="font-mono">{plan.code}</Badge>
      </div>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="text-xs"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Price / month (USD)"
          type="number"
          min={0}
          value={priceMonthly}
          onChange={(e) => setPriceMonthly(Number(e.target.value))}
          className="text-xs"
        />
        <Input
          label="Monthly AI Credits"
          type="number"
          min={0}
          value={aiCredits}
          onChange={(e) => setAiCredits(Number(e.target.value))}
          className="text-xs"
        />
        <Input
          label="Max Jobs"
          type="number"
          min={1}
          value={maxJobs}
          onChange={(e) => setMaxJobs(Number(e.target.value))}
          className="text-xs"
        />
        <Input
          label="Max Candidates"
          type="number"
          min={1}
          value={maxCandidates}
          onChange={(e) => setMaxCandidates(Number(e.target.value))}
          className="text-xs"
        />
        <div className="col-span-2">
          <Input
            label="Max Team Members"
            type="number"
            min={1}
            value={maxMembers}
            onChange={(e) => setMaxMembers(Number(e.target.value))}
            className="text-xs"
          />
        </div>
      </div>
      <Textarea
        label="Features (one per line, shown on the public pricing page)"
        value={featuresText}
        onChange={(e) => setFeaturesText(e.target.value)}
        rows={4}
        className="text-xs"
      />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Checkbox id={`plan-active-${plan.id}`} checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
          <Label htmlFor={`plan-active-${plan.id}`}>Active</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Checkbox id={`plan-public-${plan.id}`} checked={isPublic} onCheckedChange={(v) => setIsPublic(v === true)} />
          <Label htmlFor={`plan-public-${plan.id}`}>Shown on public pricing page</Label>
        </div>
      </div>
      <Button type="button" className="w-full" size="sm" onClick={handleSave} disabled={updatePlan.isPending}>
        {updatePlan.isPending ? 'Saving...' : 'Save Plan'}
      </Button>
    </div>
  );
}

export default function SuperAdminPage() {
  const router = useRouter();
  const { currentUser, isSessionLoading, pushToast } = useRecruitFlow();

  React.useEffect(() => {
    if (!isSessionLoading && !currentUser.isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [isSessionLoading, currentUser.isSuperAdmin, router]);

  const overviewQuery = useAdminOverview();
  const upsertProvider = useUpsertGlobalAIProvider();
  const toggleOrg = useToggleOrganizationStatus();
  const overview = overviewQuery.data;
  const plansQuery = useAdminPlans();
  const plans = plansQuery.data ?? [];

  const [editingProvider, setEditingProvider] = useState<AIProviderType | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState('');

  if (!currentUser.isSuperAdmin) {
    return null;
  }

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;
    try {
      await upsertProvider.mutateAsync({
        provider: editingProvider,
        displayName: PROVIDER_LABELS[editingProvider],
        defaultModel: modelInput,
        isEnabled: true,
        apiKey: apiKeyInput.trim() || undefined,
      });
      pushToast(`${PROVIDER_LABELS[editingProvider]} configuration updated`, undefined, 'success');
      setEditingProvider(null);
      setApiKeyInput('');
    } catch (error) {
      pushToast(
        'Could not save provider',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
  };

  const handleToggleOrg = async (organizationId: string, isActive: boolean) => {
    try {
      await toggleOrg.mutateAsync({ organizationId, isActive });
    } catch (error) {
      pushToast(
        'Could not update organization',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="primary" className="gap-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                SUPER_ADMIN
              </Badge>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Platform Super Admin Console
              </h1>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Global oversight of tenant organizations, AI provider credentials, and security audit logs.
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

        {overviewQuery.isLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        )}

        {overview && (
          <>
            {/* Platform KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Tenant Organizations</span>
                  <Building2 className="h-4 w-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {overview.metrics.organizationsCount}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Platform Users</span>
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-2">{overview.metrics.usersCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Jobs &amp; Applications</span>
                  <Activity className="h-4 w-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {overview.metrics.jobsCount} Jobs / {overview.metrics.applicationsCount} Apps
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Total AI Calls</span>
                  <Cpu className="h-4 w-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-600 mt-2">
                  {overview.metrics.aiCallsCount}
                </p>
              </div>
            </div>

            {/* Tenant Organizations */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-base font-semibold text-slate-900">Tenant Organizations</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-6 py-2.5 font-semibold">Organization</th>
                      <th className="px-4 py-2.5 font-semibold">Members</th>
                      <th className="px-4 py-2.5 font-semibold">Created</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="px-6 py-2.5 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overview.organizations.map((org) => (
                      <tr key={org.id}>
                        <td className="px-6 py-2.5 font-medium text-slate-900">{org.name}</td>
                        <td className="px-4 py-2.5 text-slate-700">{org._count?.members ?? 0}</td>
                        <td className="px-4 py-2.5 text-slate-500">
                          {new Date(org.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={org.isActive ? 'success' : 'danger'}>
                            {org.isActive ? 'ACTIVE' : 'SUSPENDED'}
                          </Badge>
                        </td>
                        <td className="px-6 py-2.5 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleOrg(org.id, !org.isActive)}
                            disabled={toggleOrg.isPending}
                            className="text-indigo-600 hover:underline"
                          >
                            {org.isActive ? 'Suspend' : 'Activate'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Global AI Provider Configuration */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <h2 className="text-base font-semibold text-slate-900">
                Global AI Provider Configuration (OpenAI, Google Gemini, Anthropic Claude)
              </h2>
              <p className="text-xs text-slate-500">
                Platform-wide fallback keys used when an organization has not configured its own.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['OPENAI', 'GEMINI', 'ANTHROPIC'] as AIProviderType[]).map((providerType) => {
                  const existing = overview.aiProviders.find((p) => p.provider === providerType);
                  return (
                    <div
                      key={providerType}
                      className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">
                          {PROVIDER_LABELS[providerType]}
                        </span>
                        <Badge variant={existing?.apiKeyEncrypted ? 'success' : 'warning'}>
                          {existing?.apiKeyEncrypted ? 'CONFIGURED' : 'UNCONFIGURED'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 font-mono">
                        Model: {existing?.defaultModel || '—'}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        Key: {existing?.apiKeyEncrypted || 'Not Set'}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setEditingProvider(providerType);
                          setModelInput(existing?.defaultModel || '');
                        }}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Configure Credentials
                      </Button>
                    </div>
                  );
                })}
              </div>

              {editingProvider && (
                <form
                  onSubmit={handleSaveProvider}
                  className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 space-y-3"
                >
                  <p className="text-xs font-semibold text-indigo-900">
                    Update {PROVIDER_LABELS[editingProvider]} Credentials
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      type="password"
                      placeholder="Enter API Key (sk-... / AIza...)"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="text-xs"
                    />
                    <Input
                      type="text"
                      placeholder="Default Model"
                      required
                      value={modelInput}
                      onChange={(e) => setModelInput(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={upsertProvider.isPending}>
                      {upsertProvider.isPending ? 'Saving...' : 'Save Provider'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingProvider(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Plan Management */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Subscription Plan Management</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Edits here are live immediately on the public pricing page and the org Billing screen —
                  there is no separate copy to keep in sync.
                </p>
              </div>
              {plansQuery.isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <PlanManagementCard key={plan.id} plan={plan} />
                  ))}
                </div>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overview.auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2.5 text-slate-500 font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 font-medium text-slate-900">
                          {log.organization?.name ?? 'Platform'}
                        </td>
                        <td className="py-2.5 text-slate-700">
                          {log.actor?.name ?? 'System'} ({log.actor?.email ?? '—'})
                        </td>
                        <td className="py-2.5 font-mono text-indigo-600">{log.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
