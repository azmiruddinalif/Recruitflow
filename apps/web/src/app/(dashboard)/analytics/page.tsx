'use client';

import React from 'react';
import { BarChart3, Clock, Loader2, Target, TrendingUp, Users } from 'lucide-react';
import { APPLICATION_PIPELINE_STAGES } from '@recruitflow/shared';
import { useDashboardMetrics, useDetailedReports } from '@/features/analytics/use-analytics';
import { useApplicationsKanban } from '@/features/applications/use-applications';

export default function AnalyticsPage() {
  const metricsQuery = useDashboardMetrics({ range: '1y' });
  const reportsQuery = useDetailedReports();
  const applicationsQuery = useApplicationsKanban({});

  const metrics = metricsQuery.data;
  const reports = reportsQuery.data;
  const applications = applicationsQuery.data ?? [];

  const evaluatedApps = applications.filter((a) => a.aiMatch !== null);
  const avgMatchScore =
    evaluatedApps.length > 0
      ? Math.round(
          evaluatedApps.reduce((acc, a) => acc + (a.aiMatch?.overallScore ?? 0), 0) /
            evaluatedApps.length,
        )
      : null;

  const scheduledOrCompletedInterviews =
    reports?.interviewConversion.reduce((sum, i) => sum + i.count, 0) ?? 0;
  const completedInterviews =
    reports?.interviewConversion.find((i) => i.status === 'COMPLETED')?.count ?? 0;
  const interviewToOfferPct =
    scheduledOrCompletedInterviews > 0
      ? Math.round((completedInterviews / scheduledOrCompletedInterviews) * 100)
      : null;

  const totalApplicationsAllTime = reports?.sourceEffectiveness.reduce((s, x) => s + x.applications, 0) ?? 0;
  const isLoading = metricsQuery.isLoading || reportsQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Recruitment Analytics & Conversion Reports
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Live database aggregations for pipeline conversion, time-to-hire, source effectiveness, and recruiter velocity.
          </p>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Avg. Time to Hire</span>
            <Clock className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {reports ? `${reports.averageTimeToHireDays} Days` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">From application to hire</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Interview Completion Rate</span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {interviewToOfferPct !== null ? `${interviewToOfferPct}%` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {scheduledOrCompletedInterviews} interviews tracked
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Avg. AI Candidate Match</span>
            <Target className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {avgMatchScore !== null ? `${avgMatchScore}%` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Across {evaluatedApps.length} AI-evaluated of {applications.length} applications
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Talent Pool</span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{metrics?.totalCandidates ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">{metrics?.activeJobs ?? 0} active job requisitions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            Hiring Funnel Conversion by Stage
          </h2>
          <div className="space-y-3">
            {APPLICATION_PIPELINE_STAGES.map((stage) => {
              const found = metrics?.funnel.find((f) => f.status === stage.status);
              const count = found?.count ?? 0;
              const pct = found?.percentage ?? 0;
              return (
                <div key={stage.status} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{stage.label}</span>
                    <span>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all"
                      style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source Effectiveness */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            Recruitment Source Effectiveness
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 font-semibold">Source Channel</th>
                  <th className="py-2 font-semibold">Applications</th>
                  <th className="py-2 font-semibold">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(reports?.sourceEffectiveness ?? []).map((item) => (
                  <tr key={item.source}>
                    <td className="py-2.5 font-medium text-slate-900">
                      {item.source.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 text-slate-700">{item.applications}</td>
                    <td className="py-2.5 text-indigo-600 font-semibold">
                      {totalApplicationsAllTime > 0
                        ? Math.round((item.applications / totalApplicationsAllTime) * 100)
                        : 0}
                      %
                    </td>
                  </tr>
                ))}
                {(reports?.sourceEffectiveness ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">
                      No applications recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
