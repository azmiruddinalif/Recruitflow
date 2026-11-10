'use client';

import * as React from 'react';
import { Briefcase, Loader2, MapPin, Plus, Search, Sparkles, Users } from 'lucide-react';
import type { ExperienceLevel, JobStatus, WorkLocationType } from '@recruitflow/types';
import {
  useCreateJob,
  useJobDetail,
  useJobsList,
  useUpdateJobStatus,
  type JobListItem,
} from '@/features/jobs/use-jobs';
import { useGenerateJobDescription } from '@/features/ai/use-ai';
import { useRecruitFlow } from '@/stores/recruitflow-store';
import { ApiClientError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { formatSalaryRange, getJobStatusStyle } from '@/lib/utils';

export default function JobsPage() {
  const { can, pushToast } = useRecruitFlow();

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | JobStatus>('ALL');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const jobsQuery = useJobsList({
    search: debouncedSearch,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  });
  const jobs = jobsQuery.data?.data ?? [];

  const jobDetailQuery = useJobDetail(selectedJobId);
  const selectedJob = jobDetailQuery.data;

  const createJob = useCreateJob();
  const updateStatus = useUpdateJobStatus();
  const generateDescription = useGenerateJobDescription();

  // Create Job Form State
  const [title, setTitle] = React.useState('');
  const [department, setDepartment] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [workLocationType, setWorkLocationType] = React.useState<WorkLocationType>('HYBRID');
  const [experienceLevel, setExperienceLevel] = React.useState<ExperienceLevel>('SENIOR');
  const [minExperienceYears, setMinExperienceYears] = React.useState(5);
  const [salaryMin, setSalaryMin] = React.useState<number | ''>('');
  const [salaryMax, setSalaryMax] = React.useState<number | ''>('');
  const [requiredSkillsText, setRequiredSkillsText] = React.useState('');
  const [preferredSkillsText, setPreferredSkillsText] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [openingsCount, setOpeningsCount] = React.useState(1);

  const handleAIGenerateDescription = async () => {
    if (!title.trim() || !department.trim()) {
      pushToast('Add a title and department first', 'The AI generator needs both to write a description.', 'error');
      return;
    }
    try {
      const result = await generateDescription.mutateAsync({
        title,
        department,
        experienceLevel,
        requiredSkills: requiredSkillsText.split(',').map((s) => s.trim()).filter(Boolean),
        preferredSkills: preferredSkillsText.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setDescription(result.description);
      pushToast('AI description generated', `Drafted for ${title}.`, 'success');
    } catch (error) {
      pushToast(
        'AI generation failed',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqSkills = requiredSkillsText.split(',').map((s) => s.trim()).filter(Boolean);
    const prefSkills = preferredSkillsText.split(',').map((s) => s.trim()).filter(Boolean);

    try {
      await createJob.mutateAsync({
        title,
        department,
        location,
        workLocationType,
        employmentType: 'FULL_TIME',
        experienceLevel,
        minExperienceYears: Number(minExperienceYears) || 0,
        salaryMin: salaryMin === '' ? undefined : Number(salaryMin),
        salaryMax: salaryMax === '' ? undefined : Number(salaryMax),
        salaryCurrency: 'USD',
        showSalary: salaryMin !== '' && salaryMax !== '',
        description,
        responsibilities: [],
        qualifications: [],
        benefits: [],
        requiredSkills: reqSkills,
        preferredSkills: prefSkills,
        openingsCount: Number(openingsCount) || 1,
        status: 'PUBLISHED',
      });
      pushToast('Job requisition created', `${title} is now live.`, 'success');
      setShowCreateModal(false);
      setTitle('');
      setDepartment('');
    } catch (error) {
      pushToast(
        'Could not create job',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
  };

  const handleUpdateStatus = async (jobId: string, status: JobStatus) => {
    try {
      await updateStatus.mutateAsync({ jobId, status });
    } catch (error) {
      pushToast(
        'Could not update status',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
  };

  const requiredSkills = (job: JobListItem) => job.skills.filter((s) => s.isRequired);
  const preferredSkills = (job: JobListItem) => job.skills.filter((s) => !s.isRequired);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Job Requisitions &amp; Requirements
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage open roles, required skill matrices, compensation bands, and AI-assisted job descriptions.
          </p>
        </div>

        {can('jobs.create') && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            <span>Create Job Requisition</span>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job title, department, or location..."
            className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['ALL', 'PUBLISHED', 'DRAFT', 'PAUSED', 'CLOSED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-[#4F46E5] text-white'
                  : 'border border-[#E2E8F0] bg-[#F8FAFC] text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st === 'ALL' ? 'All Requisitions' : st}
            </button>
          ))}
          {jobsQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {jobs.length === 0 && !jobsQuery.isLoading && (
          <p className="col-span-2 py-8 text-center text-xs text-slate-500">
            No job requisitions match this filter.
          </p>
        )}
        {jobs.map((job) => {
          const statusStyle = getJobStatusStyle(job.status);

          return (
            <div
              key={job.id}
              className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-5 transition-colors hover:border-slate-300"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                      >
                        {statusStyle.label}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-slate-900">{job.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" />
                        {job.department}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.location} ({job.workLocationType})
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-xs font-semibold text-slate-900">
                      {formatSalaryRange(job.salaryMin ?? undefined, job.salaryMax ?? undefined, job.salaryCurrency)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {job.minExperienceYears}+ yrs · {job.openingsCount}{' '}
                      {job.openingsCount === 1 ? 'opening' : 'openings'}
                    </p>
                  </div>
                </div>

                {/* Required Skills */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {requiredSkills(job).map((skill) => (
                    <span
                      key={skill.name}
                      className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-medium text-slate-700"
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="h-4 w-4 text-[#4F46E5]" />
                  <span className="font-semibold text-slate-900">
                    {job._count?.applications ?? 0} Applicants
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    aria-label="Job Status"
                    value={job.status}
                    onChange={(e) => handleUpdateStatus(job.id, e.target.value as JobStatus)}
                    disabled={!can('jobs.update')}
                    className="h-8 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PAUSED">Paused</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                  <Button size="sm" variant="outline" onClick={() => setSelectedJobId(job.id)}>
                    Details
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Job Modal with AI Generator */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Job Requisition"
        description="Define role requirements, required skills for AI candidate matching, and compensation band."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateJob} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Job Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input label="Department" required value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Location" required value={location} onChange={(e) => setLocation(e.target.value)} />
            <Select
              label="Work Arrangement"
              value={workLocationType}
              onChange={(e) => setWorkLocationType(e.target.value as WorkLocationType)}
              options={[
                { label: 'Hybrid', value: 'HYBRID' },
                { label: 'Remote', value: 'REMOTE' },
                { label: 'On-Site', value: 'ONSITE' },
              ]}
            />
            <Select
              label="Seniority Level"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
              options={[
                { label: 'Mid-Level', value: 'MID' },
                { label: 'Senior', value: 'SENIOR' },
                { label: 'Lead / Staff', value: 'LEAD' },
                { label: 'Executive', value: 'EXECUTIVE' },
              ]}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Input
              label="Min Experience (Yrs)"
              type="number"
              value={minExperienceYears}
              onChange={(e) => setMinExperienceYears(Number(e.target.value))}
            />
            <Input
              label="Salary Min (USD)"
              type="number"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <Input
              label="Salary Max (USD)"
              type="number"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <Input
              label="Headcount Openings"
              type="number"
              min={1}
              value={openingsCount}
              onChange={(e) => setOpeningsCount(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Required Skills (Used by AI Matcher)"
              value={requiredSkillsText}
              onChange={(e) => setRequiredSkillsText(e.target.value)}
            />
            <Input
              label="Preferred Skills"
              value={preferredSkillsText}
              onChange={(e) => setPreferredSkillsText(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                Role Description &amp; Responsibilities
              </label>
              <button
                type="button"
                onClick={handleAIGenerateDescription}
                disabled={generateDescription.isPending}
                className="inline-flex items-center gap-1 rounded-md bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-[#4F46E5] hover:bg-indigo-100 disabled:opacity-60"
              >
                <Sparkles className="h-3 w-3" />
                <span>{generateDescription.isPending ? 'Generating...' : 'Generate with AI'}</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] p-3 text-xs text-slate-900 focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 border-t border-[#E2E8F0] pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createJob.isPending}>
              {createJob.isPending ? 'Publishing...' : 'Publish Job Requisition'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Job Detail Drawer */}
      <Modal
        open={Boolean(selectedJobId)}
        onClose={() => setSelectedJobId(null)}
        title={selectedJob?.title ?? 'Job Details'}
        description={`${selectedJob?.department ?? ''} · ${selectedJob?.location ?? ''}`}
        maxWidth="xl"
        mode="drawer"
      >
        {jobDetailQuery.isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        )}
        {selectedJob && (
          <div className="space-y-5 text-xs">
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <p className="font-semibold text-slate-900">
                Compensation Band:{' '}
                {formatSalaryRange(selectedJob.salaryMin ?? undefined, selectedJob.salaryMax ?? undefined, selectedJob.salaryCurrency)}
              </p>
              <p className="mt-1 text-slate-600">
                Experience Requirement: {selectedJob.minExperienceYears}+ years
                {selectedJob.hiringManager && <> · Hiring Manager: {selectedJob.hiringManager.name}</>}
              </p>
            </div>

            <div>
              <h4 className="font-semibold uppercase tracking-wider text-slate-400">Overview</h4>
              <p className="mt-1.5 text-slate-700 leading-relaxed">{selectedJob.description}</p>
            </div>

            {selectedJob.responsibilities.length > 0 && (
              <div>
                <h4 className="font-semibold uppercase tracking-wider text-slate-400">
                  Key Responsibilities
                </h4>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-700">
                  {selectedJob.responsibilities.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="font-semibold uppercase tracking-wider text-slate-400">
                Required &amp; Preferred Skills
              </h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {requiredSkills(selectedJob).map((s) => (
                  <span
                    key={s.name}
                    className="rounded-md border border-indigo-200 bg-[#EEF2FF] px-2.5 py-1 font-medium text-[#4F46E5]"
                  >
                    {s.name} (Required)
                  </span>
                ))}
                {preferredSkills(selectedJob).map((s) => (
                  <span
                    key={s.name}
                    className="rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-slate-600"
                  >
                    {s.name} (Preferred)
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
