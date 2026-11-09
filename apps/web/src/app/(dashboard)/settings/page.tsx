'use client';

import React, { useState } from 'react';
import { Building2, CheckCircle2, KeyRound, Loader2, Save, ShieldCheck, Sparkles } from 'lucide-react';
import type { AIProviderType } from '@recruitflow/types';
import { useRecruitFlow } from '@/stores/recruitflow-store';
import { useOrganizationAIProviders, useUpsertOrganizationAIProvider } from '@/features/ai/use-ai';
import { useCurrentOrganization, useUpdateOrganization } from '@/features/organizations/use-organizations';
import { ApiClientError } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PROVIDER_DEFAULTS: Record<AIProviderType, { displayName: string; defaultModel: string }> = {
  OPENAI: { displayName: 'OpenAI', defaultModel: 'gpt-4o-mini' },
  GEMINI: { displayName: 'Google Gemini', defaultModel: 'gemini-2.5-flash' },
  ANTHROPIC: { displayName: 'Anthropic Claude', defaultModel: 'claude-3-5-sonnet-latest' },
};

function AIProviderCard({ provider }: { provider: AIProviderType }) {
  const { data: providers } = useOrganizationAIProviders();
  const existing = providers?.find((p) => p.provider === provider);
  const defaults = PROVIDER_DEFAULTS[provider];

  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState(existing?.defaultModel ?? defaults.defaultModel);
  const [isEnabled, setIsEnabled] = useState(existing?.isEnabled ?? false);
  const upsertMutation = useUpsertOrganizationAIProvider();

  React.useEffect(() => {
    if (existing) {
      setDefaultModel(existing.defaultModel);
      setIsEnabled(existing.isEnabled);
    }
  }, [existing]);

  return (
    <div className="rounded-lg border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{defaults.displayName}</p>
        {existing?.apiKeyEncrypted ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Configured
          </Badge>
        ) : (
          <Badge variant="default">Not configured</Badge>
        )}
      </div>
      <Input
        label="API Key"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={existing?.apiKeyEncrypted ? 'Leave blank to keep existing key' : 'sk-...'}
      />
      <Input
        label="Default Model"
        type="text"
        value={defaultModel}
        onChange={(e) => setDefaultModel(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <Checkbox id={`ai-enabled-${provider}`} checked={isEnabled} onCheckedChange={(v) => setIsEnabled(v === true)} />
        <Label htmlFor={`ai-enabled-${provider}`}>Enabled</Label>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={upsertMutation.isPending}
        onClick={() =>
          upsertMutation.mutate(
            {
              provider,
              displayName: defaults.displayName,
              defaultModel,
              isEnabled,
              apiKey: apiKey.trim() || undefined,
            },
            { onSuccess: () => setApiKey('') },
          )
        }
      >
        {upsertMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Save {defaults.displayName} Key
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const { currentUser, can, pushToast } = useRecruitFlow();
  const orgQuery = useCurrentOrganization();
  const updateOrganization = useUpdateOrganization();
  const org = orgQuery.data;

  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [currency, setCurrency] = useState('USD');
  const [allowAIResumeParsing, setAllowAIResumeParsing] = useState(true);
  const [allowAICandidateMatching, setAllowAICandidateMatching] = useState(true);

  React.useEffect(() => {
    if (!org) return;
    setOrgName(org.name);
    setIndustry(org.industry ?? '');
    setWebsite(org.website ?? '');
    setTimezone(org.settings?.defaultTimezone ?? 'UTC');
    setCurrency(org.settings?.defaultCurrency ?? 'USD');
    setAllowAIResumeParsing(org.settings?.allowAIResumeParsing ?? true);
    setAllowAICandidateMatching(org.settings?.allowAICandidateMatching ?? true);
  }, [org]);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateOrganization.mutateAsync({
        name: orgName,
        industry,
        website,
        defaultTimezone: timezone,
        defaultCurrency: currency,
        allowAIResumeParsing,
        allowAICandidateMatching,
      });
      pushToast('Organization settings saved', 'Workspace configuration updated.', 'success');
    } catch (error) {
      pushToast(
        'Could not save settings',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
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
          <Input label="Organization Name" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Industry" type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            <Input label="Website" type="text" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Default Timezone"
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
            <Input label="Currency" type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="allow-ai-resume-parsing"
                checked={allowAIResumeParsing}
                onCheckedChange={(v) => setAllowAIResumeParsing(v === true)}
              />
              <Label htmlFor="allow-ai-resume-parsing">
                Enable AI Resume Parsing (Human-in-the-loop review required)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="allow-ai-candidate-matching"
                checked={allowAICandidateMatching}
                onCheckedChange={(v) => setAllowAICandidateMatching(v === true)}
              />
              <Label htmlFor="allow-ai-candidate-matching">
                Enable Explainable AI Candidate-to-Job Matching
              </Label>
            </div>
          </div>
          <Button type="submit" size="sm" disabled={!can('organization.manage')}>
            <Save className="h-4 w-4" />
            Save Organization Settings
          </Button>
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                pushToast(
                  'Other sessions revoked',
                  'All other Better Auth sessions have been invalidated.',
                  'info',
                )
              }
            >
              <KeyRound className="h-4 w-4 text-indigo-600" />
              Revoke All Other Active Sessions
            </Button>
          </div>
        </div>
      </div>

      {can('organization.manage') && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            AI Provider Configuration
          </h2>
          <p className="text-xs text-slate-600">
            Configure your organization&apos;s own API keys for the AI Recruitment Studio. Keys are encrypted at
            rest and never exposed to the browser after saving.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AIProviderCard provider="OPENAI" />
            <AIProviderCard provider="GEMINI" />
            <AIProviderCard provider="ANTHROPIC" />
          </div>
        </div>
      )}
    </div>
  );
}
