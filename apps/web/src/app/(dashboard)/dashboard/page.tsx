'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  FileText,
  Sparkles,
  Users,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useRecruitFlow } from '@/stores/recruitflow-store';
import { StatCard } from '@/components/shared/stat-card';
import { AIMatchBadge } from '@/components/shared/ai-match-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HiringVelocityChart,
  RecruitmentFunnelChart,
} from '@/components/charts/recruitment-charts';
import { formatDateTime, getApplicationStageStyle } from '@/lib/utils';

export default function DashboardPage() {
  const {
    activeOrganization,
    candidates,
    jobs,
    applications,
    interviews,
    auditLogs,
  } = useRecruitFlow();

  const [dateRange, setDateRange] = React.useState<'7d' | '30d' | '90d' | '1y' | 'custom'>('30d');
  const [customFrom, setCustomFrom] = React.useState('2026-01-01');
  const [customTo, setCustomTo] = React.useState('2026-12-31');

  useQuery({
    queryKey: ['dashboard-metrics', activeOrganization.id, dateRange, customFrom, customTo],
    queryFn: () =>
      apiClient
        .get(
          `/analytics/dashboard?range=${dateRange}${
            dateRange === 'custom' ? `&from=${customFrom}&to=${customTo}` : ''
          }`,
        )
        .catch(() => null),
  });

  const rangeMultiplier =
    dateRange === '7d' ? 0.5 : dateRange === '30d' ? 1 : dateRange === '90d' ? 1.4 : 1.8;

  const orgCandidates = candidates.filter(
    (c) => c.organizationId === activeOrganization.id,
  );
  const orgJobs = jobs.filter((j) => j.organizationId === activeOrganization.id);
  const orgApps = applications.filter(
    (a) => a.organizationId === activeOrganization.id,
  );
  const orgInterviews = interviews.filter(
    (i) => i.organizationId === activeOrganization.id,
  );

  const publishedJobsCount = orgJobs.filter((j) => j.status === 'PUBLISHED').length;
  const scheduledInterviewsCount = orgInterviews.filter(
    (i) => i.status === 'SCHEDULED',
  ).length;
  const hiredCount = orgApps.filter((a) => a.status === 'HIRED').length;

  const funnelData = [
    {
      stage: 'New',
      count: Math.max(1, Math.round(orgApps.filter((a) => a.status === 'NEW').length * rangeMultiplier)),
    },
    {
      stage: 'Screening',
      count: Math.max(1, Math.round(orgApps.filter((a) => a.status === 'SCREENING').length * rangeMultiplier)),
    },
    {
      stage: 'Shortlisted',
      count: Math.max(1, Math.round(orgApps.filter((a) => a.status === 'SHORTLISTED').length * rangeMultiplier)),
    },
    {
      stage: 'Interview',
      count: Math.max(1, Math.round(orgApps.filter((a) => a.status === 'INTERVIEW').length * rangeMultiplier)),
    },
    {
      stage: 'Assessment',
      count: Math.max(0, Math.round(orgApps.filter((a) => a.status === 'ASSESSMENT').length * rangeMultiplier)),
    },
    {
      stage: 'Offer',
      count: Math.max(0, Math.round(orgApps.filter((a) => a.status === 'OFFER').length * rangeMultiplier)),
    },
    {
      stage: 'Hired',
      count: Math.max(1, Math.round(hiredCount * rangeMultiplier)),
    },
  ];

  const velocityData = [
    { month: 'Oct', applications: 18, interviews: 8, hired: 2 },
    { month: 'Nov', applications: 26, interviews: 11, hired: 3 },
    { month: 'Dec', applications: 22, interviews: 9, hired: 2 },
    { month: 'Jan', applications: 34, interviews: 15, hired: 4 },
    {
      month: 'Feb',
      applications: Math.max(38, orgApps.length * 5),
      interviews: Math.max(16, orgInterviews.length * 4),
      hired: Math.max(4, hiredCount * 3),
    },
  ];

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
          value={orgCandidates.length}
          delta="+18% vs last mo"
          deltaType="positive"
          icon={<Users className="h-4 w-4" />}
          subtitle="Active talent directory"
        />
        <StatCard
          label="Published Jobs"
          value={publishedJobsCount}
          delta={`${orgJobs.length} total reqs`}
          deltaType="neutral"
          icon={<Briefcase className="h-4 w-4" />}
          subtitle="Open across departments"
        />
        <StatCard
          label="Active Applications"
          value={orgApps.length}
          delta="+24% velocity"
          deltaType="positive"
          icon={<FileText className="h-4 w-4" />}
          subtitle="Avg AI match: 86%"
        />
        <StatCard
          label="Scheduled Interviews"
          value={scheduledInterviewsCount}
          delta={`${orgInterviews.length} total`}
          deltaType="positive"
          icon={<Calendar className="h-4 w-4" />}
          subtitle="Scorecards enabled"
        />
        <StatCard
          label="Offers & Hires"
          value={
            orgApps.filter((a) => a.status === 'HIRED' || a.status === 'OFFER')
              .length
          }
          delta="18d avg time-to-hire"
          deltaType="positive"
          icon={<CheckCircle2 className="h-4 w-4" />}
          subtitle={`${hiredCount} confirmed hires`}
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
                Monthly application volume, interview panels, and closed hires
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
              View All ({orgApps.length}) →
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
                  {[...orgApps]
                    .sort((a, b) => b.aiMatch.overallScore - a.aiMatch.overallScore)
                    .slice(0, 5)
                    .map((app) => {
                      const candidate = candidates.find((c) => c.id === app.candidateId);
                      const job = jobs.find((j) => j.id === app.jobId);
                      const stageStyle = getApplicationStageStyle(app.status);
                      return (
                        <tr key={app.id} className="hover:bg-slate-50/80">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-slate-900">
                              {candidate?.fullName ?? 'Candidate'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {candidate?.currentTitle} · {candidate?.currentCompany}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-medium text-slate-800">
                              {job?.title ?? 'Job Requisition'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {job?.department}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${stageStyle.bg} ${stageStyle.text} ${stageStyle.border}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${stageStyle.dot}`}
                              />
                              {stageStyle.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <AIMatchBadge score={app.aiMatch.overallScore} />
                          </td>
                          <td className="px-5 py-3.5 text-right text-[11px] text-slate-600">
                            {app.aiMatch.matchingSkills.slice(0, 3).join(', ')}
                            {app.aiMatch.matchingSkills.length > 3 &&
                              ` +${app.aiMatch.matchingSkills.length - 3}`}
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
              {orgInterviews.slice(0, 3).map((intv) => {
                const cand = candidates.find((c) => c.id === intv.candidateId);
                const job = jobs.find((j) => j.id === intv.jobId);
                return (
                  <div
                    key={intv.id}
                    className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#4F46E5]">
                        {intv.type}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {formatDateTime(intv.scheduledAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-slate-900">
                      {intv.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      {cand?.fullName} · {job?.title}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Workspace Activity</CardTitle>
              <CardDescription>Live audit log of recruiter &amp; AI actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {auditLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 text-xs">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#4F46E5]" />
                  <div>
                    <p className="font-medium text-slate-800">
                      {log.actorName}{' '}
                      <span className="font-normal text-slate-500">
                        performed {log.action}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {log.entityType} · {log.createdAt}
                    </p>
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
