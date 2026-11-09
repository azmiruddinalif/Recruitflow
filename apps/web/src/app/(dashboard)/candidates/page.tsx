'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Briefcase,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  useAddCandidateNote,
  useCandidateDetail,
  useCandidatesList,
  useCreateCandidate,
} from '@/features/candidates/use-candidates';
import { useCreateApplication } from '@/features/applications/use-applications';
import { useJobsList } from '@/features/jobs/use-jobs';
import { useRecruitFlow } from '@/stores/recruitflow-store';
import { ApiClientError } from '@/lib/api-client';
import { createCandidateSchema } from '@recruitflow/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { AIMatchBadge } from '@/components/shared/ai-match-badge';
import { formatCurrency, formatDate, getApplicationStageStyle, getInitials } from '@/lib/utils';

export default function CandidatesPage() {
  const { pushToast } = useRecruitFlow();

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [sourceFilter, setSourceFilter] = React.useState('ALL');
  const [selectedCandidateId, setSelectedCandidateId] = React.useState<string | null>(null);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [noteInput, setNoteInput] = React.useState('');
  const [applyJobId, setApplyJobId] = React.useState('');

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const candidatesQuery = useCandidatesList({ search: debouncedSearch, source: sourceFilter });
  const candidates = candidatesQuery.data?.data ?? [];

  const jobsQuery = useJobsList({ status: 'PUBLISHED' });
  const jobs = jobsQuery.data?.data ?? [];

  const detailQuery = useCandidateDetail(selectedCandidateId);
  const liveSelectedCandidate = detailQuery.data ?? null;

  const createCandidate = useCreateCandidate();
  const addNote = useAddCandidateNote(selectedCandidateId ?? '');
  const createApplication = useCreateApplication();

  React.useEffect(() => {
    if (!applyJobId && jobs[0]) setApplyJobId(jobs[0].id);
  }, [jobs, applyJobId]);

  // New Candidate Form State
  const emptyCandidateForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    currentTitle: '',
    currentCompany: '',
    totalExperienceYears: 4,
    skillsText: '',
    summary: '',
    source: 'LINKEDIN',
  };
  const [firstName, setFirstName] = React.useState(emptyCandidateForm.firstName);
  const [lastName, setLastName] = React.useState(emptyCandidateForm.lastName);
  const [email, setEmail] = React.useState(emptyCandidateForm.email);
  const [phone, setPhone] = React.useState(emptyCandidateForm.phone);
  const [location, setLocation] = React.useState(emptyCandidateForm.location);
  const [currentTitle, setCurrentTitle] = React.useState(emptyCandidateForm.currentTitle);
  const [currentCompany, setCurrentCompany] = React.useState(emptyCandidateForm.currentCompany);
  const [totalExperienceYears, setTotalExperienceYears] = React.useState(
    emptyCandidateForm.totalExperienceYears,
  );
  const [skillsText, setSkillsText] = React.useState(emptyCandidateForm.skillsText);
  const [summary, setSummary] = React.useState(emptyCandidateForm.summary);
  const [source, setSource] = React.useState(emptyCandidateForm.source);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const resetCandidateForm = React.useCallback(() => {
    setFirstName(emptyCandidateForm.firstName);
    setLastName(emptyCandidateForm.lastName);
    setEmail(emptyCandidateForm.email);
    setPhone(emptyCandidateForm.phone);
    setLocation(emptyCandidateForm.location);
    setCurrentTitle(emptyCandidateForm.currentTitle);
    setCurrentCompany(emptyCandidateForm.currentCompany);
    setTotalExperienceYears(emptyCandidateForm.totalExperienceYears);
    setSkillsText(emptyCandidateForm.skillsText);
    setSummary(emptyCandidateForm.summary);
    setSource(emptyCandidateForm.source);
    setFormErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeAddModal = () => {
    setShowAddModal(false);
    resetCandidateForm();
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSkills = skillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    const candidatePayload = {
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      location: location || undefined,
      currentTitle: currentTitle || undefined,
      currentCompany: currentCompany || undefined,
      totalExperienceYears: Number(totalExperienceYears) || 0,
      summary: summary || undefined,
      source,
      salaryCurrency: 'USD',
      tags: parsedSkills.slice(0, 3).map((s) => s.name),
      languages: [],
      skills: parsedSkills,
      experiences: [],
      educations: [],
      certifications: [],
    };

    const validation = createCandidateSchema.safeParse(candidatePayload);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setFormErrors(
        Object.fromEntries(
          Object.entries(fieldErrors)
            .filter(([, messages]) => messages && messages.length > 0)
            .map(([field, messages]) => [field, messages![0]]),
        ),
      );
      return;
    }
    setFormErrors({});

    try {
      const created = await createCandidate.mutateAsync(candidatePayload);
      resetCandidateForm();
      setShowAddModal(false);
      setSelectedCandidateId(created.id);
      pushToast('Candidate profile created', `${created.fullName} has been added.`, 'success');
    } catch (error) {
      pushToast(
        'Could not create candidate',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveSelectedCandidate || !noteInput.trim()) return;
    try {
      await addNote.mutateAsync(noteInput.trim());
      setNoteInput('');
    } catch (error) {
      pushToast(
        'Could not add note',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
  };

  const handleApplyToJob = async () => {
    if (!liveSelectedCandidate || !applyJobId) return;
    try {
      await createApplication.mutateAsync({
        jobId: applyJobId,
        candidateId: liveSelectedCandidate.id,
        source: liveSelectedCandidate.source,
        expectedSalary: liveSelectedCandidate.expectedSalaryMin ?? undefined,
      });
      pushToast('Application created', 'Run AI Match from the Applications board for a score.', 'success');
    } catch (error) {
      pushToast(
        'Could not apply candidate',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Candidates Talent Directory
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Search, filter, and inspect 360° candidate profiles, parsed resumes, and AI job match scores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/ai-studio"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-[#EEF2FF] px-3.5 text-xs font-semibold text-[#4F46E5] hover:bg-indigo-100"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>AI Resume Parser</span>
          </Link>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            <span>Add Candidate</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by candidate name, title, company, or skill (e.g. Kubernetes, React)..."
            className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-48">
            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              options={[
                { label: 'All Sources', value: 'ALL' },
                { label: 'LinkedIn', value: 'LINKEDIN' },
                { label: 'AI Resume Import', value: 'AI_RESUME_IMPORT' },
                { label: 'Referral', value: 'REFERRAL' },
                { label: 'Direct Apply', value: 'DIRECT_APPLY' },
                { label: 'Job Board', value: 'JOB_BOARD' },
              ]}
            />
          </div>
          <span className="text-xs font-medium text-slate-500">
            {candidatesQuery.isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              `Showing ${candidates.length} candidates`
            )}
          </span>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-4 py-3.5">Current Role</th>
                <th className="px-4 py-3.5">Experience</th>
                <th className="px-4 py-3.5">Top Skills</th>
                <th className="px-4 py-3.5">Applications</th>
                <th className="px-4 py-3.5">Source</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidates.length === 0 && !candidatesQuery.isLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    No candidates match this search.
                  </td>
                </tr>
              )}
              {candidates.map((cand) => (
                <tr
                  key={cand.id}
                  onClick={() => setSelectedCandidateId(cand.id)}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-xs font-semibold text-[#4F46E5]">
                        {getInitials(cand.fullName)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{cand.fullName}</p>
                        <p className="text-[11px] text-slate-500">
                          {cand.email} · {cand.location}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-900">{cand.currentTitle}</p>
                    <p className="text-[11px] text-slate-500">{cand.currentCompany}</p>
                  </td>
                  <td className="px-4 py-4 font-mono text-slate-700">
                    {cand.totalExperienceYears ?? 0} yrs
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {cand.skills.slice(0, 4).map((s) => (
                        <span
                          key={s.name}
                          className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                          {s.name}
                        </span>
                      ))}
                      {cand.skills.length > 4 && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                          +{cand.skills.length - 4}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-medium text-slate-700">
                      {cand._count?.applications ?? 0}{' '}
                      {(cand._count?.applications ?? 0) === 1 ? 'role' : 'roles'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant="default">{cand.source.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCandidateId(cand.id);
                      }}
                    >
                      360° Profile
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Candidate Modal */}
      <Modal
        open={showAddModal}
        onClose={closeAddModal}
        title="Add New Candidate Profile"
        description="Create a structured candidate record or use AI Studio to auto-parse a PDF/DOCX resume."
        maxWidth="xl"
      >
        <form onSubmit={handleCreateCandidate} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Elena"
              error={formErrors.firstName}
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Rostova"
              error={formErrors.lastName}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="elena.rostova@tech.io"
              error={formErrors.email}
            />
            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Current Job Title"
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
            />
            <Input
              label="Current Company"
              value={currentCompany}
              onChange={(e) => setCurrentCompany(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <Input
              label="Experience (Years)"
              type="number"
              min={0}
              max={45}
              value={totalExperienceYears}
              onChange={(e) => setTotalExperienceYears(Number(e.target.value))}
            />
            <Select
              label="Candidate Source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              options={[
                { label: 'LinkedIn', value: 'LINKEDIN' },
                { label: 'Direct Apply', value: 'DIRECT_APPLY' },
                { label: 'Referral', value: 'REFERRAL' },
                { label: 'AI Resume Import', value: 'AI_RESUME_IMPORT' },
                { label: 'Job Board', value: 'JOB_BOARD' },
              ]}
            />
          </div>
          <Input
            label="Skills (Comma-separated)"
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Executive Summary
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] p-3 text-xs text-slate-900 focus:border-[#4F46E5] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2.5 border-t border-[#E2E8F0] pt-4">
            <Button type="button" variant="outline" onClick={closeAddModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCandidate.isPending}>
              {createCandidate.isPending ? 'Saving...' : 'Save Candidate Profile'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Candidate 360° Slide-Over Drawer */}
      <Modal
        open={Boolean(selectedCandidateId)}
        onClose={() => setSelectedCandidateId(null)}
        title={liveSelectedCandidate?.fullName ?? 'Candidate Profile'}
        description={`${liveSelectedCandidate?.currentTitle ?? ''} at ${liveSelectedCandidate?.currentCompany ?? ''}`}
        maxWidth="2xl"
        mode="drawer"
      >
        {detailQuery.isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        )}
        {liveSelectedCandidate && (
          <div className="space-y-6 text-xs">
            {/* Contact & Compensation Strip */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{liveSelectedCandidate.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{liveSelectedCandidate.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{liveSelectedCandidate.location}</span>
              </div>
            </div>

            {/* Quick Apply Candidate to Job */}
            <div className="rounded-xl border border-indigo-200 bg-[#EEF2FF]/60 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#4F46E5]" />
                    <span>Apply Candidate to Job Requisition</span>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Adds to the pipeline. Run AI Match on the Applications board for an explainable score.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={applyJobId}
                    onChange={(e) => setApplyJobId(e.target.value)}
                    className="h-8 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-slate-900"
                  >
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" onClick={handleApplyToJob} disabled={createApplication.isPending}>
                    Apply
                  </Button>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Executive Summary
              </h3>
              <p className="mt-1.5 text-slate-700 leading-relaxed">
                {liveSelectedCandidate.summary}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                <span>
                  Expected Salary:{' '}
                  <strong className="text-slate-800">
                    {liveSelectedCandidate.expectedSalaryMin
                      ? formatCurrency(liveSelectedCandidate.expectedSalaryMin)
                      : '—'}{' '}
                    –{' '}
                    {liveSelectedCandidate.expectedSalaryMax
                      ? formatCurrency(liveSelectedCandidate.expectedSalaryMax)
                      : '—'}
                  </strong>
                </span>
                <span>
                  Notice Period:{' '}
                  <strong className="text-slate-800">
                    {liveSelectedCandidate.noticePeriodDays ?? 14} days
                  </strong>
                </span>
              </div>
            </div>

            {/* Verified Skills */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Extracted Skills &amp; Competencies
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {liveSelectedCandidate.skills.map((s) => (
                  <span
                    key={s.name}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
                  >
                    <span>{s.name}</span>
                    {s.yearsOfExperience && (
                      <span className="font-mono text-[10px] text-slate-400">
                        {s.yearsOfExperience}y
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Active Job Applications */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Job Applications &amp; AI Match Scores
              </h3>
              <div className="mt-2 space-y-2">
                {liveSelectedCandidate.applications.map((app) => {
                  const st = getApplicationStageStyle(app.status as never);
                  return (
                    <div
                      key={app.id}
                      className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {app.job?.title ?? 'Job Requisition'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Applied {formatDate(app.appliedAt)} · Application ID: {app.id}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <AIMatchBadge score={app.aiMatch?.overallScore ?? null} />
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${st.bg} ${st.text} ${st.border}`}
                        >
                          {st.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Work Experience & Education */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Work History</span>
                </h3>
                <div className="mt-2 space-y-2.5">
                  {liveSelectedCandidate.experiences.map((exp, i) => (
                    <div key={i} className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                      <p className="font-semibold text-slate-900">{exp.title}</p>
                      <p className="text-[11px] font-medium text-[#4F46E5]">
                        {exp.company} · {exp.startDate} – {exp.isCurrent ? 'Present' : exp.endDate}
                      </p>
                      {exp.description && (
                        <p className="mt-1 text-[11px] text-slate-600">{exp.description}</p>
                      )}
                    </div>
                  ))}
                  {liveSelectedCandidate.experiences.length === 0 && (
                    <p className="text-slate-400">No work history recorded.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Education &amp; Resume Files</span>
                </h3>
                <div className="mt-2 space-y-2.5">
                  {liveSelectedCandidate.educations.map((edu, i) => (
                    <div key={i} className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                      <p className="font-semibold text-slate-900">{edu.degree}</p>
                      <p className="text-[11px] text-slate-600">{edu.institution}</p>
                    </div>
                  ))}
                  {liveSelectedCandidate.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#4F46E5]" />
                        <div>
                          <p className="font-medium text-slate-800">{att.fileName}</p>
                          <p className="text-[10px] text-slate-400">
                            {Math.round(att.fileSizeBytes / 1024)} KB
                          </p>
                        </div>
                      </div>
                      <Badge variant="primary">File</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recruiter Evaluation Notes */}
            <div className="border-t border-[#E2E8F0] pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Recruiter &amp; Hiring Manager Notes ({liveSelectedCandidate.notes.length})
              </h3>
              <form onSubmit={handleAddNote} className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Add an internal evaluation note for the hiring team..."
                  className="h-9 flex-1 rounded-lg border border-[#E2E8F0] px-3 text-xs focus:border-[#4F46E5] focus:outline-none"
                />
                <Button type="submit" size="sm" disabled={addNote.isPending}>
                  Add Note
                </Button>
              </form>
              <div className="mt-3 space-y-2">
                {liveSelectedCandidate.notes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {n.author?.name ?? 'Unknown'}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDate(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-slate-700">{n.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
