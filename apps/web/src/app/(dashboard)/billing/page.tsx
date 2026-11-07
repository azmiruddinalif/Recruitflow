'use client';

import React from 'react';
import { CheckCircle2, CreditCard, ShieldCheck, Sparkles } from 'lucide-react';
import { useRecruitFlow } from '@/stores/recruitflow-store';

export default function BillingPage() {
  const { activeOrganization, jobs, candidates, teamMembers, can, switchPlan } = useRecruitFlow();

  const orgJobsCount = jobs.filter((j) => j.organizationId === activeOrganization.id).length;
  const orgCandidatesCount = candidates.filter(
    (c) => c.organizationId === activeOrganization.id,
  ).length;
  const orgMembersCount = teamMembers.filter(
    (m) => m.organizationId === activeOrganization.id,
  ).length;

  const plans: Array<{
    name: 'Starter' | 'Growth' | 'Enterprise';
    price: string;
    description: string;
    limits: string[];
  }> = [
    {
      name: 'Starter',
      price: '$0 / month',
      description: 'Self-hosted starter tier for small hiring teams.',
      limits: ['Up to 5 Active Jobs', '250 Candidates', '5 Team Members', '100 Monthly AI Credits'],
    },
    {
      name: 'Growth',
      price: '$79 / month',
      description: 'Full AI recruitment automation for scaling agencies and HR teams.',
      limits: [
        'Up to 50 Active Jobs',
        '5,000 Candidates',
        '25 Team Members',
        '1,500 Monthly AI Credits',
        'Explainable AI Candidate Matching',
      ],
    },
    {
      name: 'Enterprise',
      price: '$249 / month',
      description: 'Unlimited multi-tenant recruitment scale with custom AI keys & audit logs.',
      limits: [
        'Unlimited Active Jobs',
        '100,000+ Candidates',
        '500 Team Members',
        '15,000 Monthly AI Credits',
        'Bring Your Own OpenAI / Gemini / Anthropic Keys',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Subscription & Billing Management
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage plan quotas, Stripe Checkout integration, and Self-Hosted Licensing mode for{' '}
            <span className="font-semibold">{activeOrganization.name}</span>.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Self-Hosted Commercial Mode Active
        </span>
      </div>

      {/* Quota Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Current Plan</p>
          <p className="text-xl font-bold text-indigo-600 mt-1">{activeOrganization.planName}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Active Jobs Quota</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{orgJobsCount} / 50</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Candidates Stored</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{orgCandidatesCount} / 5,000</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Team Seats Used</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{orgMembersCount} / 25</p>
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = activeOrganization.planName === plan.name;
          return (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 bg-white flex flex-col justify-between ${
                isCurrent ? 'border-indigo-600 ring-2 ring-indigo-600/10' : 'border-slate-200'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
                  {isCurrent && (
                    <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                      Active Plan
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-slate-900">{plan.price}</p>
                <p className="text-xs text-slate-600">{plan.description}</p>
                <ul className="space-y-2 pt-2 border-t border-slate-100">
                  {plan.limits.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                disabled={isCurrent || !can('billing.manage')}
                onClick={() => switchPlan(plan.name)}
                className={`mt-6 w-full rounded-lg px-4 py-2.5 text-xs font-semibold transition ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-500 cursor-default'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isCurrent ? 'Current Active Plan' : `Switch to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
