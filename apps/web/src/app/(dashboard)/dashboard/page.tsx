'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Users,
} from 'lucide-react';
import { useRecruitFlow } from '@/stores/recruitflow-store';
import { useDashboardMetrics } from '@/features/analytics/use-analytics';
import { useApplicationsKanban } from '@/features/applications/use-applications';
import { StatCard } from '@/components/shared/stat-card';
import { AIMatchBadge } from '@/components/shared/ai-match-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HiringVelocityChart,
  RecruitmentFunnelChart,
} from '@/components/charts/recruitment-charts';
import { formatDateTime, getApplicationStageStyle } from '@/lib/utils';

export default function DashboardPage() {
  const { activeOrganization } = useRecruitFlow();

  const [dateRange, setDateRange] = React.useState<'7d' | '30d' | '90d' | '1y' | 'custom'>('30d');
  const [customFrom, setCustomFrom] = React.useState('2026-01-01');
  const [customTo, setCustomTo] = React.useState('2026-12-31');

  const metricsQuery = useDashboardMetrics({
    range: dateRange,
    from: dateRange === 'custom' ? customFrom : undefined,
    to: dateRange === 'custom' ? customTo : undefined,
  });
  const metrics = metricsQuery.data;

  const applicationsQuery = useApplicationsKanban({});
  const applications = applicationsQuery.data ?? [];

  const funnelData = (metrics?.funnel ?? []).map((f) => ({ stage: f.status, count: f.count }));
  const velocityData = metrics?.hiringTrends ?? [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Executive Recruitment Dashboard
            </h1>
            <span className="rounded-md border border-indigo-200 bg-[#EEF2FF] px-2 py-0.5 text-xs font-semibold text-[#4F46E5]">
              {activeOrganization.name}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Real-time hiring funnel metrics, AI candidate match signals, and upcoming interview schedule.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            {(
              [
                { id: '7d', label: 'Last 7d' },
                { id: '30d', label: 'Last 30d' },
                { id: '90d', label: 'Last 90d' },
                { id: '1y', label: 'This Year' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDateRange(opt.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  dateRange === opt.id
                    ? 'bg-[#4F46E5] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
              />
            </div>
          )}
          {metricsQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          <Link
            href="/ai-studio"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-[#EEF2FF] px-3.5 text-xs font-semibold text-[#4F46E5] hover:bg-indigo-100"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Open AI Studio</span>
          </Link>
          <Link
            href="/applications"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#4F46E5] px-4 text-xs font-semibold text-white hover:bg-[#4338CA]"
          >
            <span>Kanban Pipeline</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Candidates"
          value={metrics?.totalCandidates ?? 0}
          icon={<Users className="h-4 w-4" />}
          subtitle="Active talent directory"
        />
        <StatCard
          label="Published Jobs"
          value={metrics?.activeJobs ?? 0}
          icon={<Briefcase className="h-4 w-4" />}
          subtitle="Open across departments"
        />
        <StatCard
          label="Applications in Window"
          value={metrics?.totalApplications ?? 0}
          icon={<FileText className="h-4 w-4" />}
          subtitle="Within selected date range"
        />
        <StatCard
          label="Scheduled Interviews"
          value={metrics?.scheduledInterviews ?? 0}
          icon={<Calendar className="h-4 w-4" />}
          subtitle="Upcoming, confirmed"
        />
        <StatCard
          label="Hired"
          value={metrics?.hiredCandidates ?? 0}
          icon={<CheckCircle2 className="h-4 w-4" />}
          subtitle={`${metrics?.rejectedApplications ?? 0} rejected in window`}
        />
      </div>

      {/* Funnel & Velocity Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recruitment Pipeline Funnel</CardTitle>
              <CardDescription>
                Live distribution of applications across active ATS stages
              </CardDescription>
            </div>
            <Link
              href="/applications"
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              Manage Board →
            </Link>
          </CardHeader>
          <CardContent>
            <RecruitmentFunnelChart data={funnelData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Hiring Velocity &amp; Conversion Trends</CardTitle>
              <CardDescription>
                Monthly application volume, interview panels, and closed hires (last 6 months)
              </CardDescription>
            </div>
            <Link
              href="/analytics"
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              Full Analytics →
            </Link>
          </CardHeader>
          <CardContent>
            <HiringVelocityChart data={velocityData} />
          </CardContent>
        </Card>
      </div>

      {/* Top AI Matched Applications + Upcoming Interviews + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top AI Matched Candidates */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Highest AI-Matched Applications</CardTitle>
              <CardDescription>
                Explainable multi-criteria scoring across required skills, seniority, and education
              </CardDescription>
            </div>
            <Link
              href="/applications"
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              View All ({applications.length}) →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Candidate</th>
                    <th className="px-4 py-3">Job Requisition</th>
                    <th className="px-4 py-3">Stage</th>
                    <th className="px-4 py-3">AI Match Score</th>
                    <th className="px-5 py-3 text-right">Matched Skills</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...applications]
                    .sort((a, b) => (b.aiMatch?.overallScore ?? -1) - (a.aiMatch?.overallScore ?? -1))
                    .slice(0, 5)
                    .map((app) => {
                      const stageStyle = getApplicationStageStyle(app.status);
                      return (
                        <tr key={app.id} className="hover:bg-slate-50/80">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-slate-900">
                              {app.candidate.fullName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {app.candidate.currentTitle} · {app.candidate.currentCompany}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-medium text-slate-800">{app.job.title}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${stageStyle.bg} ${stageStyle.text} ${stageStyle.border}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${stageStyle.dot}`} />
                              {stageStyle.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <AIMatchBadge score={app.aiMatch?.overallScore ?? null} />
                          </td>
                          <td className="px-5 py-3.5 text-right text-[11px] text-slate-600">
                            {app.aiMatch
                              ? `${app.aiMatch.matchingSkills.slice(0, 3).join(', ')}${
                                  app.aiMatch.matchingSkills.length > 3
                                    ? ` +${app.aiMatch.matchingSkills.length - 3}`
                                    : ''
                                }`
                              : 'Not yet evaluated'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Interviews & Recent Audit Feed */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Upcoming Interviews</CardTitle>
                <CardDescription>Scheduled technical &amp; panel sessions</CardDescription>
              </div>
              <Link
                href="/interviews"
                className="text-xs font-medium text-[#4F46E5] hover:underline"
              >
                Schedule →
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {(metrics?.upcomingInterviews ?? []).length === 0 && (
                <p className="text-xs text-slate-400">No upcoming interviews.</p>
              )}
              {(metrics?.upcomingInterviews ?? []).map((intv) => (
                <div key={intv.id} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#4F46E5]">
                      {intv.type}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {formatDateTime(intv.scheduledAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs font-semibold text-slate-900">{intv.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    {intv.candidateName} · {intv.jobTitle}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Workspace Activity</CardTitle>
              <CardDescription>Live audit log of recruiter &amp; AI actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(metrics?.recentActivities ?? []).length === 0 && (
                <p className="text-xs text-slate-400">No recent activity.</p>
              )}
              {(metrics?.recentActivities ?? []).map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 text-xs">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#4F46E5]" />
                  <div>
                    <p className="font-medium text-slate-800">
                      {log.actorName}{' '}
                      <span className="font-normal text-slate-500">performed {log.action}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">{formatDateTime(log.createdAt)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
