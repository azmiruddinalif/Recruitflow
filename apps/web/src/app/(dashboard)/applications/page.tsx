'use client';

import * as React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Kanban,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Table as TableIcon,
} from 'lucide-react';
import type { ApplicationStatus } from '@recruitflow/types';
import { APPLICATION_PIPELINE_STAGES } from '@recruitflow/shared';
import {
  useApplicationDetail,
  useApplicationsKanban,
  useCreateApplication,
  useReorderApplications,
  useUpdateApplicationStatus,
} from '@/features/applications/use-applications';
import { useMatchCandidate } from '@/features/ai/use-ai';
import { useCandidatesList } from '@/features/candidates/use-candidates';
import { useJobsList } from '@/features/jobs/use-jobs';
import { useRecruitFlow } from '@/stores/recruitflow-store';
import { ApiClientError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { AIMatchBadge } from '@/components/shared/ai-match-badge';
import { KanbanBoard } from '@/components/applications/kanban-board';
import { formatCurrency } from '@/lib/utils';

export default function ApplicationsPipelinePage() {
  const { can, pushToast } = useRecruitFlow();

  const [viewMode, setViewMode] = React.useState<'KANBAN' | 'TABLE'>('KANBAN');
  const [jobFilter, setJobFilter] = React.useState<string>('ALL');
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [inspectMatchAppId, setInspectMatchAppId] = React.useState<string | null>(null);
  const [matchingAppId, setMatchingAppId] = React.useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const kanbanQuery = useApplicationsKanban({
    jobId: jobFilter !== 'ALL' ? jobFilter : undefined,
    search: debouncedSearch || undefined,
  });
  const applications = kanbanQuery.data ?? [];

  const candidatesLite = React.useMemo(() => {
    const map = new Map<string, { id: string; fullName: string; currentTitle?: string | null }>();
    for (const app of applications) {
      if (!map.has(app.candidateId)) {
        map.set(app.candidateId, {
          id: app.candidateId,
          fullName: app.candidate.fullName,
          currentTitle: app.candidate.currentTitle,
        });
      }
    }
    return Array.from(map.values());
  }, [applications]);

  const jobsLite = React.useMemo(() => {
    const map = new Map<string, { id: string; title: string }>();
    for (const app of applications) {
      if (!map.has(app.jobId)) {
        map.set(app.jobId, { id: app.jobId, title: app.job.title });
      }
    }
    return Array.from(map.values());
  }, [applications]);

  const jobsListQuery = useJobsList({ status: 'PUBLISHED' });
  const candidatesListQuery = useCandidatesList({});
  const allJobs = jobsListQuery.data?.data ?? [];
  const allCandidates = candidatesListQuery.data?.data ?? [];

  const updateStatus = useUpdateApplicationStatus();
  const reorder = useReorderApplications();
  const createApplication = useCreateApplication();
  const matchCandidate = useMatchCandidate();

  const inspectDetailQuery = useApplicationDetail(inspectMatchAppId);
  const inspectMatchApp = inspectDetailQuery.data;

  const handleRunAIMatch = React.useCallback(
    async (app: { id: string; jobId: string; candidateId: string }) => {
      setMatchingAppId(app.id);
      try {
        await matchCandidate.mutateAsync({
          jobId: app.jobId,
          candidateId: app.candidateId,
          applicationId: app.id,
        });
        await kanbanQuery.refetch();
        if (inspectMatchAppId === app.id) await inspectDetailQuery.refetch();
      } catch (error) {
        pushToast(
          'AI match failed',
          error instanceof ApiClientError ? error.message : 'Unknown error',
          'error',
        );
      } finally {
        setMatchingAppId(null);
      }
    },
    [matchCandidate, kanbanQuery, inspectDetailQuery, inspectMatchAppId, pushToast],
  );

  const handleInspectOrRunMatch = React.useCallback(
    (app: { id: string; jobId: string; candidateId: string; aiMatch: unknown }) => {
      if (app.aiMatch) {
        setInspectMatchAppId(app.id);
      } else {
        void handleRunAIMatch(app);
      }
    },
    [handleRunAIMatch],
  );

  // Apply Modal State
  const [selectedJobId, setSelectedJobId] = React.useState('');
  const [selectedCandidateId, setSelectedCandidateId] = React.useState('');
  const [applicationSource, setApplicationSource] = React.useState('LINKEDIN');

  React.useEffect(() => {
    if (!selectedJobId && allJobs[0]) setSelectedJobId(allJobs[0].id);
  }, [allJobs, selectedJobId]);
  React.useEffect(() => {
    if (!selectedCandidateId && allCandidates[0]) setSelectedCandidateId(allCandidates[0].id);
  }, [allCandidates, selectedCandidateId]);

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createApplication.mutateAsync({
        jobId: selectedJobId,
        candidateId: selectedCandidateId,
        source: applicationSource,
      });
      pushToast('Candidate applied to job', 'Run AI Match to get an explainable compatibility score.', 'success');
      setShowApplyModal(false);
    } catch (error) {
      pushToast(
        'Could not create application',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
  };

  const handleMoveStage = React.useCallback(
    async (applicationId: string, nextStatus: ApplicationStatus) => {
      const app = applications.find((a) => a.id === applicationId);
      if (!app) return;
      try {
        await updateStatus.mutateAsync({
          applicationId,
          status: nextStatus,
          stageOrder: app.stageOrder,
        });
      } catch (error) {
        pushToast(
          'Stage update failed',
          error instanceof ApiClientError ? error.message : 'The board has been reverted.',
          'error',
        );
      }
    },
    [applications, updateStatus, pushToast],
  );

  const handleReorder = React.useCallback(
    async (updates: Array<{ applicationId: string; status: ApplicationStatus; stageOrder: number }>) => {
      try {
        await reorder.mutateAsync(updates);
      } catch (error) {
        pushToast(
          'Move failed',
          error instanceof ApiClientError ? error.message : 'The board has been reverted.',
          'error',
        );
      }
    },
    [reorder, pushToast],
  );

  return (
    <div className="flex h-full min-h-0 flex-col space-y-6">
      {/* Page Header */}
      <div className="flex shrink-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Applications Pipeline Board
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Move individual candidate applications across recruitment stages and inspect explainable AI match scores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Toggle */}
          <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-white p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('KANBAN')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'KANBAN'
                  ? 'bg-[#EEF2FF] text-[#4F46E5]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'TABLE'
                  ? 'bg-[#EEF2FF] text-[#4F46E5]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Table View</span>
            </button>
          </div>

          {can('applications.create') && (
            <Button onClick={() => setShowApplyModal(true)}>
              <Plus className="h-4 w-4" />
              <span>Apply Candidate to Job</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search + Job Filter */}
      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate or job..."
            className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:outline-none"
          />
        </div>
        <select
          aria-label="Filter by Job Requisition"
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-slate-800"
        >
          <option value="ALL">All Job Requisitions ({applications.length})</option>
          {jobsLite.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
        {kanbanQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      {/* KANBAN PIPELINE VIEW */}
      {viewMode === 'KANBAN' ? (
        <div className="min-h-0 flex-1">
          <KanbanBoard
            applications={applications}
            candidates={candidatesLite}
            jobs={jobsLite}
            canEdit={can('applications.update')}
            onInspectMatch={handleInspectOrRunMatch}
            onReorder={handleReorder}
            onMoveStage={handleMoveStage}
          />
        </div>
      ) : (
        /* TABLE PIPELINE VIEW */
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
          <div className="h-full overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Application ID</th>
                  <th className="px-4 py-3.5">Candidate</th>
                  <th className="px-4 py-3.5">Job Requisition</th>
                  <th className="px-4 py-3.5">AI Match Score</th>
                  <th className="px-4 py-3.5">Expected Comp</th>
                  <th className="px-4 py-3.5">Pipeline Stage</th>
                  <th className="px-5 py-3.5 text-right">Explainability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                      {app.id}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900">{app.candidate.fullName}</p>
                      <p className="text-[11px] text-slate-500">{app.candidate.currentTitle}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-800">{app.job.title}</p>
                      <p className="text-[11px] text-slate-500">{app.job.department}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <AIMatchBadge
                        score={app.aiMatch?.overallScore ?? null}
                        loading={matchingAppId === app.id}
                        onClick={() => handleInspectOrRunMatch(app)}
                      />
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700">
                      {app.expectedSalary ? formatCurrency(app.expectedSalary) : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={app.status}
                        onChange={(e) => handleMoveStage(app.id, e.target.value as ApplicationStatus)}
                        disabled={!can('applications.update')}
                        className="h-8 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 text-xs font-medium text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {APPLICATION_PIPELINE_STAGES.map((s) => (
                          <option key={s.status} value={s.status}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInspectOrRunMatch(app)}
                      >
                        {app.aiMatch ? 'Inspect AI Match' : 'Run AI Match'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply Candidate Modal */}
      <Modal
        open={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Apply Candidate to Job Requisition"
        description="Creates a real application record. Run AI Match afterward for an explainable compatibility score."
      >
        <form onSubmit={handleCreateApplication} className="space-y-4">
          <Select
            label="Select Candidate"
            value={selectedCandidateId}
            onChange={(e) => setSelectedCandidateId(e.target.value)}
            options={allCandidates.map((c) => ({
              label: `${c.fullName} (${c.currentTitle ?? 'N/A'})`,
              value: c.id,
            }))}
          />
          <Select
            label="Select Job Requisition"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            options={allJobs.map((j) => ({
              label: `${j.title} (${j.department})`,
              value: j.id,
            }))}
          />
          <Select
            label="Application Source"
            value={applicationSource}
            onChange={(e) => setApplicationSource(e.target.value)}
            options={[
              { label: 'LinkedIn', value: 'LINKEDIN' },
              { label: 'Direct Apply', value: 'DIRECT_APPLY' },
              { label: 'Referral', value: 'REFERRAL' },
              { label: 'Internal Talent Pool', value: 'INTERNAL' },
            ]}
          />
          <div className="flex justify-end gap-2.5 pt-3">
            <Button variant="outline" onClick={() => setShowApplyModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createApplication.isPending}>
              <Sparkles className="h-3.5 w-3.5" />
              <span>{createApplication.isPending ? 'Creating...' : 'Create Application'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Explainable AI Match Score Drawer */}
      <Modal
        open={Boolean(inspectMatchAppId)}
        onClose={() => setInspectMatchAppId(null)}
        title="AI Candidate-to-Job Match Analysis"
        description="Transparent multi-criteria evaluation across skills, experience, and education."
        maxWidth="xl"
        mode="drawer"
      >
        {inspectDetailQuery.isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        )}
        {inspectMatchApp && !inspectMatchApp.aiMatch && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-600">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <p>This application has not been evaluated by AI yet.</p>
            <Button
              size="sm"
              onClick={() => handleRunAIMatch(inspectMatchApp)}
              disabled={matchingAppId === inspectMatchApp.id}
            >
              {matchingAppId === inspectMatchApp.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>Run AI Match</span>
            </Button>
          </div>
        )}
        {inspectMatchApp?.aiMatch && (
          <div className="space-y-5 text-xs">
            <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {inspectMatchApp.candidate.fullName}
                </p>
                <p className="text-slate-500">
                  Applied for <strong className="text-slate-800">{inspectMatchApp.job.title}</strong>
                </p>
              </div>
              <AIMatchBadge score={inspectMatchApp.aiMatch.overallScore} size="md" />
            </div>

            {/* Sub-scores */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                <p className="text-[11px] text-slate-500">Skills Alignment</p>
                <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
                  {inspectMatchApp.aiMatch.skillsScore}%
                </p>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                <p className="text-[11px] text-slate-500">Experience Fit</p>
                <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
                  {inspectMatchApp.aiMatch.experienceScore}%
                </p>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                <p className="text-[11px] text-slate-500">Education Fit</p>
                <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
                  {inspectMatchApp.aiMatch.educationScore}%
                </p>
              </div>
            </div>

            {/* Matching vs Missing Skills */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-3.5">
                <p className="flex items-center gap-1.5 font-semibold text-[#15803D]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Matching Skills ({inspectMatchApp.aiMatch.matchingSkills.length})</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {inspectMatchApp.aiMatch.matchingSkills.map((s) => (
                    <span
                      key={s}
                      className="rounded border border-[#BBF7D0] bg-white px-2 py-0.5 font-medium text-[#15803D]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3.5">
                <p className="flex items-center gap-1.5 font-semibold text-[#B45309]">
                  <AlertCircle className="h-4 w-4" />
                  <span>Missing / Unverified Skills ({inspectMatchApp.aiMatch.missingSkills.length})</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {inspectMatchApp.aiMatch.missingSkills.length === 0 ? (
                    <span className="text-[#15803D] font-medium">Zero missing required skills!</span>
                  ) : (
                    inspectMatchApp.aiMatch.missingSkills.map((s) => (
                      <span
                        key={s}
                        className="rounded border border-[#FDE68A] bg-white px-2 py-0.5 font-medium text-[#B45309]"
                      >
                        {s}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Explainable Summary */}
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
              <h4 className="font-semibold uppercase tracking-wider text-slate-400">
                AI Reasoning &amp; Experience Analysis
              </h4>
              <p className="mt-1.5 text-slate-700 leading-relaxed">
                {inspectMatchApp.aiMatch.explanation}
              </p>
              <p className="mt-2 text-slate-600">{inspectMatchApp.aiMatch.relevantExperience}</p>
            </div>

            {/* Recommendations */}
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <h4 className="font-semibold uppercase tracking-wider text-slate-400">
                Recommended Next Steps
              </h4>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-700">
                {inspectMatchApp.aiMatch.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
