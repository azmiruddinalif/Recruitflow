'use client';

import * as React from 'react';
import {
  Briefcase,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import type { ExperienceLevel, JobStatus, WorkLocationType } from '@recruitflow/types';
import { useRecruitFlow, type JobRecord } from '@/stores/recruitflow-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { formatSalaryRange, getJobStatusStyle } from '@/lib/utils';

export default function JobsPage() {
  const {
    activeOrganization,
    jobs,
    applications,
    createJob,
    updateJobStatus,
    currentUser,
    pushToast,
  } = useRecruitFlow();

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | JobStatus>('ALL');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [selectedJob, setSelectedJob] = React.useState<JobRecord | null>(null);
  const [generatingAI, setGeneratingAI] = React.useState(false);

  // Create Job Form State
  const [title, setTitle] = React.useState('Senior Staff Platform Engineer');
  const [department, setDepartment] = React.useState('Cloud Platform Engineering');
  const [location, setLocation] = React.useState('San Francisco, CA / Hybrid');
  const [workLocationType, setWorkLocationType] =
    React.useState<WorkLocationType>('HYBRID');
  const [experienceLevel, setExperienceLevel] =
    React.useState<ExperienceLevel>('SENIOR');
  const [minExperienceYears, setMinExperienceYears] = React.useState(6);
  const [salaryMin, setSalaryMin] = React.useState(185000);
  const [salaryMax, setSalaryMax] = React.useState(220000);
  const [requiredSkillsText, setRequiredSkillsText] = React.useState(
    'TypeScript, Kubernetes, PostgreSQL, AWS, Go',
  );
  const [preferredSkillsText, setPreferredSkillsText] = React.useState(
    'Terraform, Redis, Observability',
  );
  const [description, setDescription] = React.useState(
    'Design, scale, and operate resilient distributed cloud platform services powering enterprise AI workloads.',
  );
  const [openingsCount, setOpeningsCount] = React.useState(2);

  const orgJobs = React.useMemo(() => {
    return jobs
      .filter((j) => j.organizationId === activeOrganization.id)
      .filter((j) => {
        if (statusFilter !== 'ALL' && j.status !== statusFilter) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          j.title.toLowerCase().includes(q) ||
          j.department.toLowerCase().includes(q) ||
          j.requiredSkills.some((s) => s.toLowerCase().includes(q))
        );
      });
  }, [jobs, activeOrganization.id, statusFilter, search]);

  const handleAIGenerateDescription = () => {
    setGeneratingAI(true);
    setTimeout(() => {
      setDescription(
        `We are hiring a ${title} within our ${department} group (${location}). You will architect high-availability services using ${requiredSkillsText}, lead technical RFCs, and mentor engineers across our multi-tenant cloud infrastructure.`,
      );
      setGeneratingAI(false);
      pushToast(
        'AI Job Description Generated',
        `Structured description and requirements synthesized for ${title}.`,
        'info',
      );
    }, 350);
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqSkills = requiredSkillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const prefSkills = preferredSkillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    await createJob({
      title,
      department,
      location,
      workLocationType,
      employmentType: 'FULL_TIME',
      experienceLevel,
      minExperienceYears: Number(minExperienceYears) || 5,
      salaryMin: Number(salaryMin) || 170000,
      salaryMax: Number(salaryMax) || 210000,
      salaryCurrency: 'USD',
      showSalary: true,
      description,
      responsibilities: [
        `Architect and maintain core systems for ${title}.`,
        `Collaborate with cross-functional engineering and product leaders.`,
      ],
      qualifications: [
        `${minExperienceYears}+ years of production experience with ${reqSkills.join(', ')}.`,
      ],
      benefits: ['Competitive salary + equity', 'Comprehensive health coverage'],
      requiredSkills: reqSkills,
      preferredSkills: prefSkills,
      openingsCount: Number(openingsCount) || 1,
      status: 'PUBLISHED',
      hiringManagerName: currentUser.name,
      aiGenerated: true,
    });

    setShowCreateModal(false);
  };

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

        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          <span>Create Job Requisition</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job title, department, or required skill..."
            className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['ALL', 'PUBLISHED', 'DRAFT', 'PAUSED', 'CLOSED'] as const).map(
            (st) => (
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
            ),
          )}
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {orgJobs.map((job) => {
          const jobApps = applications.filter((a) => a.jobId === job.id);
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
                      {job.aiGenerated && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#4F46E5]">
                          <Sparkles className="h-3 w-3" />
                          AI Crafted
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-slate-900">
                      {job.title}
                    </h3>
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
                      {formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {job.minExperienceYears}+ yrs · {job.openingsCount}{' '}
                      {job.openingsCount === 1 ? 'opening' : 'openings'}
                    </p>
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 text-xs text-slate-600 leading-relaxed">
                  {job.description}
                </p>

                {/* Required Skills */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {job.requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-medium text-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="h-4 w-4 text-[#4F46E5]" />
                  <span className="font-semibold text-slate-900">
                    {jobApps.length} Applicants
                  </span>
                  <span className="text-slate-400">·</span>
                  <span>HM: {job.hiringManagerName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    aria-label="Job Status"
                    value={job.status}
                    onChange={(e) =>
                      updateJobStatus(job.id, e.target.value as JobStatus)
                    }
                    className="h-8 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 text-xs font-medium text-slate-700"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PAUSED">Paused</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedJob(job)}
                  >
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
            <Input
              label="Job Title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              label="Department"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Location"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <Select
              label="Work Arrangement"
              value={workLocationType}
              onChange={(e) =>
                setWorkLocationType(e.target.value as WorkLocationType)
              }
              options={[
                { label: 'Hybrid', value: 'HYBRID' },
                { label: 'Remote', value: 'REMOTE' },
                { label: 'On-Site', value: 'ONSITE' },
              ]}
            />
            <Select
              label="Seniority Level"
              value={experienceLevel}
              onChange={(e) =>
                setExperienceLevel(e.target.value as ExperienceLevel)
              }
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
              onChange={(e) => setSalaryMin(Number(e.target.value))}
            />
            <Input
              label="Salary Max (USD)"
              type="number"
              value={salaryMax}
              onChange={(e) => setSalaryMax(Number(e.target.value))}
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
                className="inline-flex items-center gap-1 rounded-md bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-[#4F46E5] hover:bg-indigo-100"
              >
                <Sparkles className="h-3 w-3" />
                <span>
                  {generatingAI ? 'Synthesizing...' : 'Generate with AI Copilot'}
                </span>
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
            <Button type="submit">Publish Job Requisition</Button>
          </div>
        </form>
      </Modal>

      {/* Job Detail Drawer */}
      <Modal
        open={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
        title={selectedJob?.title ?? 'Job Details'}
        description={`${selectedJob?.department ?? ''} · ${selectedJob?.location ?? ''}`}
        maxWidth="xl"
        mode="drawer"
      >
        {selectedJob && (
          <div className="space-y-5 text-xs">
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <p className="font-semibold text-slate-900">
                Compensation Band:{' '}
                {formatSalaryRange(
                  selectedJob.salaryMin,
                  selectedJob.salaryMax,
                  selectedJob.salaryCurrency,
                )}
              </p>
              <p className="mt-1 text-slate-600">
                Experience Requirement: {selectedJob.minExperienceYears}+ years · Hiring Manager:{' '}
                {selectedJob.hiringManagerName}
              </p>
            </div>

            <div>
              <h4 className="font-semibold uppercase tracking-wider text-slate-400">
                Overview
              </h4>
              <p className="mt-1.5 text-slate-700 leading-relaxed">
                {selectedJob.description}
              </p>
            </div>

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

            <div>
              <h4 className="font-semibold uppercase tracking-wider text-slate-400">
                Required &amp; Preferred Skills
              </h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedJob.requiredSkills.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-indigo-200 bg-[#EEF2FF] px-2.5 py-1 font-medium text-[#4F46E5]"
                  >
                    {s} (Required)
                  </span>
                ))}
                {selectedJob.preferredSkills.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-slate-600"
                  >
                    {s} (Preferred)
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
