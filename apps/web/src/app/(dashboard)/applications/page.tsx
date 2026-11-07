'use client';

import * as React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Kanban,
  Plus,
  Sparkles,
  Table as TableIcon,
} from 'lucide-react';
import type { ApplicationStatus } from '@recruitflow/types';
import { APPLICATION_PIPELINE_STAGES } from '@recruitflow/shared';
import { useRecruitFlow, type ApplicationRecord } from '@/stores/recruitflow-store';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { AIMatchBadge } from '@/components/shared/ai-match-badge';
import { KanbanBoard } from '@/components/applications/kanban-board';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ApplicationsPipelinePage() {
  const {
    activeOrganization,
    applications,
    candidates,
    jobs,
    moveApplicationStage,
    reorderApplications,
    createApplication,
  } = useRecruitFlow();

  const [viewMode, setViewMode] = React.useState<'KANBAN' | 'TABLE'>('KANBAN');
  const [jobFilter, setJobFilter] = React.useState<string>('ALL');
  const [inspectMatchApp, setInspectMatchApp] =
    React.useState<ApplicationRecord | null>(null);
  const [showApplyModal, setShowApplyModal] = React.useState(false);

  // Apply Modal State
  const [selectedJobId, setSelectedJobId] = React.useState(jobs[0]?.id ?? 'job_1');
  const [selectedCandidateId, setSelectedCandidateId] = React.useState(
    candidates[0]?.id ?? 'cand_1',
  );
  const [applicationSource, setApplicationSource] = React.useState('LINKEDIN');

  const orgApps = React.useMemo(() => {
    return applications
      .filter((a) => a.organizationId === activeOrganization.id)
      .filter((a) => (jobFilter === 'ALL' ? true : a.jobId === jobFilter));
  }, [applications, activeOrganization.id, jobFilter]);

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    await createApplication({
      jobId: selectedJobId,
      candidateId: selectedCandidateId,
      source: applicationSource,
    });
    setShowApplyModal(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col space-y-6">
      {/* Page Header */}
      <div className="flex shrink-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Applications Pipeline Board
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Move individual candidate applications across 9 recruitment stages and inspect explainable AI match scores.
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

          {/* Job Filter */}
          <select
            aria-label="Filter by Job Requisition"
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-slate-800"
          >
            <option value="ALL">All Job Requisitions ({orgApps.length})</option>
            {jobs
              .filter((j) => j.organizationId === activeOrganization.id)
              .map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
          </select>

          <Button onClick={() => setShowApplyModal(true)}>
            <Plus className="h-4 w-4" />
            <span>Apply Candidate to Job</span>
          </Button>
        </div>
      </div>

      {/* KANBAN PIPELINE VIEW */}
      {viewMode === 'KANBAN' ? (
        <div className="min-h-0 flex-1">
          <KanbanBoard
            applications={orgApps}
            candidates={candidates}
            jobs={jobs}
            onInspectMatch={setInspectMatchApp}
            onReorder={reorderApplications}
            onMoveStage={(applicationId, nextStatus) =>
              moveApplicationStage(applicationId, nextStatus)
            }
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
                {orgApps.map((app) => {
                  const candidate = candidates.find(
                    (c) => c.id === app.candidateId,
                  );
                  const job = jobs.find((j) => j.id === app.jobId);
                  return (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                        {app.id}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">
                          {candidate?.fullName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {candidate?.currentTitle}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-800">{job?.title}</p>
                        <p className="text-[11px] text-slate-500">
                          {job?.department}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <AIMatchBadge
                          score={app.aiMatch.overallScore}
                          onClick={() => setInspectMatchApp(app)}
                        />
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        {formatCurrency(app.expectedSalary)}
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          value={app.status}
                          onChange={(e) =>
                            moveApplicationStage(
                              app.id,
                              e.target.value as ApplicationStatus,
                            )
                          }
                          className="h-8 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 text-xs font-medium text-slate-800"
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
                          onClick={() => setInspectMatchApp(app)}
                        >
                          Inspect AI Match
                        </Button>
                      </td>
                    </tr>
                  );
                })}
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
        description="Creates an application record and immediately runs AI candidate-to-job matching."
      >
        <form onSubmit={handleCreateApplication} className="space-y-4">
          <Select
            label="Select Candidate"
            value={selectedCandidateId}
            onChange={(e) => setSelectedCandidateId(e.target.value)}
            options={candidates.map((c) => ({
              label: `${c.fullName} (${c.currentTitle})`,
              value: c.id,
            }))}
          />
          <Select
            label="Select Job Requisition"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            options={jobs.map((j) => ({
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
            <Button type="submit">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Create Application &amp; Score</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Explainable AI Match Score Drawer */}
      <Modal
        open={Boolean(inspectMatchApp)}
        onClose={() => setInspectMatchApp(null)}
        title="AI Candidate-to-Job Match Analysis"
        description="Transparent multi-criteria evaluation across skills, experience, and education."
        maxWidth="xl"
        mode="drawer"
      >
        {inspectMatchApp && (
          <div className="space-y-5 text-xs">
            <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {
                    candidates.find((c) => c.id === inspectMatchApp.candidateId)
                      ?.fullName
                  }
                </p>
                <p className="text-slate-500">
                  Applied for{' '}
                  <strong className="text-slate-800">
                    {jobs.find((j) => j.id === inspectMatchApp.jobId)?.title}
                  </strong>
                </p>
              </div>
              <AIMatchBadge
                score={inspectMatchApp.aiMatch.overallScore}
                size="md"
              />
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
                  <span>
                    Matching Skills ({inspectMatchApp.aiMatch.matchingSkills.length})
                  </span>
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
                  <span>
                    Missing / Unverified Skills (
                    {inspectMatchApp.aiMatch.missingSkills.length})
                  </span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {inspectMatchApp.aiMatch.missingSkills.length === 0 ? (
                    <span className="text-[#15803D] font-medium">
                      Zero missing required skills!
                    </span>
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
              <p className="mt-2 text-slate-600">
                {inspectMatchApp.aiMatch.relevantExperience}
              </p>
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
