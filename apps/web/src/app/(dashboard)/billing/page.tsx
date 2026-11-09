'use client';

import React from 'react';
import { CheckCircle2, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useChangePlan, useCurrentSubscription, useSubscriptionPlans } from '@/features/billing/use-billing';
import { useRecruitFlow } from '@/stores/recruitflow-store';
import { ApiClientError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';

export default function BillingPage() {
  const { activeOrganization, can, pushToast } = useRecruitFlow();

  const plansQuery = useSubscriptionPlans();
  const currentQuery = useCurrentSubscription();
  const changePlan = useChangePlan();

  const plans = plansQuery.data ?? [];
  const current = currentQuery.data;

  const handleSwitchPlan = async (planCode: string) => {
    try {
      const result = await changePlan.mutateAsync({ planCode });
      if (result.requiresCheckout) {
        pushToast(
          'Stripe Checkout required',
          result.message ?? 'This plan requires Stripe payment processing, which is being finalized.',
          'info',
        );
      } else {
        pushToast('Plan updated', `Switched to the ${planCode} plan.`, 'success');
      }
    } catch (error) {
      pushToast(
        'Could not change plan',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
  };

  const isLoading = plansQuery.isLoading || currentQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Subscription & Billing Management
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage plan quotas and billing mode for{' '}
            <span className="font-semibold">{activeOrganization.name}</span>.
          </p>
        </div>
        {current && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold ${
              current.stripeConfigured
                ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {current.stripeConfigured ? (
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-emerald-600" />
            )}
            {current.stripeConfigured ? 'Stripe Billing Active' : 'Self-Hosted Mode (No Stripe Configured)'}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      )}

      {current && (
        <>
          {/* Quota Usage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">Current Plan</p>
              <p className="text-xl font-bold text-indigo-600 mt-1">
                {current.subscription?.plan.name ?? 'No Plan'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">Active Jobs Quota</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {current.usage.jobsUsed} / {current.usage.jobsLimit}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">Candidates Stored</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {current.usage.candidatesUsed} / {current.usage.candidatesLimit}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">Team Seats Used</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {current.usage.membersUsed} / {current.usage.membersLimit}
              </p>
            </div>
          </div>

          {/* Plan Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = current.subscription?.plan.code === plan.code;
              return (
                <div
                  key={plan.code}
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
                    <p className="text-2xl font-bold text-slate-900">
                      {plan.priceMonthlyCents === 0
                        ? 'Free'
                        : `${formatCurrency(plan.priceMonthlyCents / 100)} / month`}
                    </p>
                    <p className="text-xs text-slate-600">{plan.description}</p>
                    <ul className="space-y-2 pt-2 border-t border-slate-100">
                      {plan.features.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    disabled={isCurrent || !can('billing.manage') || changePlan.isPending}
                    onClick={() => handleSwitchPlan(plan.code)}
                    className={`mt-6 w-full rounded-lg px-4 py-2.5 text-xs font-semibold transition ${
                      isCurrent
                        ? 'bg-slate-100 text-slate-500 cursor-default'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60'
                    }`}
                  >
                    {isCurrent ? 'Current Active Plan' : `Switch to ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Payment History */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Payment History</h2>
            </div>
            {current.payments.length === 0 ? (
              <p className="px-5 py-6 text-center text-xs text-slate-500">
                No payments recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {current.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 text-xs">
                    <span className="text-slate-700">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(p.amountCents / 100)} {p.currency}
                    </span>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
