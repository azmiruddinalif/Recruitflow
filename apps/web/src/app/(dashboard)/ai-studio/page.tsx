'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Settings as SettingsIcon,
  Sparkles,
  Target,
  Upload,
  UserSquare2,
} from 'lucide-react';
import Link from 'next/link';
import type { ParsedResumeData, PermissionCode } from '@recruitflow/types';
import { useRecruitFlow } from '@/stores/recruitflow-store';
import {
  useAIProviderStatus,
  useApproveParsedResume,
  useGenerateCandidateSummary,
  useGenerateEmailDraft,
  useGenerateInterviewQuestions,
  useGenerateJobDescription,
  useMatchCandidate,
  useParseResume,
  useResumeParseStatus,
} from '@/features/ai/use-ai';
import { useCandidatesList } from '@/features/candidates/use-candidates';
import { useCreateJob, useJobsList } from '@/features/jobs/use-jobs';

type EditableParsedResume = ParsedResumeData & { skillsCsv: string };

function toEditable(data: ParsedResumeData): EditableParsedResume {
  return { ...data, skillsCsv: data.skills.map((s) => s.name).join(', ') };
}

function AIErrorNotice({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'AI request failed.';
  const notConfigured = message.includes('AI_PROVIDER_NOT_CONFIGURED') || message.includes('No AI provider');
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">{notConfigured ? 'No AI provider configured' : 'AI request failed'}</p>
        <p className="mt-0.5">
          {notConfigured ? (
            <>
              Configure an OpenAI, Gemini, or Anthropic API key in{' '}
              <Link href="/settings" className="font-semibold underline">
                Settings → AI Providers
              </Link>{' '}
              before using this feature.
            </>
          ) : (
            message
          )}
        </p>
      </div>
    </div>
  );
}

type AIStudioTabId =
  | 'RESUME_PARSER'
  | 'CANDIDATE_MATCH'
  | 'JOB_GENERATOR'
  | 'INTERVIEW_ASSIST'
  | 'EMAIL_ASSIST'
  | 'CANDIDATE_SUMMARY';

const AI_STUDIO_TABS: ReadonlyArray<{
  id: AIStudioTabId;
  label: string;
  icon: typeof Upload;
  permission: PermissionCode;
}> = [
  { id: 'RESUME_PARSER', label: '1. AI Resume Parser', icon: Upload, permission: 'ai.resume_parse' },
  {
    id: 'CANDIDATE_MATCH',
    label: '2. Explainable Candidate Matcher',
    icon: Target,
    permission: 'ai.candidate_match',
  },
  { id: 'JOB_GENERATOR', label: '3. AI Job Description Generator', icon: FileText, permission: 'ai.job_generate' },
  {
    id: 'INTERVIEW_ASSIST',
    label: '4. AI Interview Assistant',
    icon: MessageSquare,
    permission: 'ai.interview_assist',
  },
  { id: 'EMAIL_ASSIST', label: '5. AI Email Assistant', icon: Mail, permission: 'ai.email_assist' },
  {
    id: 'CANDIDATE_SUMMARY',
    label: '6. AI Candidate Summary',
    icon: UserSquare2,
    permission: 'ai.candidate_summary',
  },
];

export default function AIStudioPage() {
  const { activeOrganization, can, pushToast } = useRecruitFlow();

  const visibleTabs = AI_STUDIO_TABS.filter((tab) => can(tab.permission));

  const [activeTab, setActiveTab] = useState<AIStudioTabId>('RESUME_PARSER');

  // Keep the active tab in sync with the role's permitted tool set: on first
  // render (and whenever the active organization/role changes), fall back to
  // the first tab this role can actually use instead of leaving a tool open
  // that the user has no permission to run.
  React.useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTabs.map((t) => t.id).join(',')]);

  const { data: providerStatus } = useAIProviderStatus();

  const createJob = useCreateJob();
  const orgCandidates = useCandidatesList({}).data?.data ?? [];
  const orgJobs = useJobsList({}).data?.data ?? [];

  // 1. Resume Parser
  const [resumeRawText, setResumeRawText] = useState('');
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [parsedStaging, setParsedStaging] = useState<EditableParsedResume | null>(null);
  const parseResumeMutation = useParseResume();
  const resumeStatusQuery = useResumeParseStatus(activeResumeId, true);
  const approveResumeMutation = useApproveParsedResume();

  const resumeData = resumeStatusQuery.data ?? parseResumeMutation.data;
  const resumeIsProcessing =
    parseResumeMutation.isPending || resumeData?.parseStatus === 'PROCESSING';

  React.useEffect(() => {
    if (resumeData?.extractedData && resumeData.parseStatus === 'PENDING_REVIEW' && !parsedStaging) {
      setParsedStaging(toEditable(resumeData.extractedData));
    }
  }, [resumeData, parsedStaging]);

  const handleExtractResume = () => {
    if (resumeRawText.trim().length < 20) {
      pushToast('Resume text too short', 'Paste at least a few lines of resume content.', 'error');
      return;
    }
    setParsedStaging(null);
    parseResumeMutation.mutate(
      {
        fileName: 'pasted-resume.txt',
        mimeType: 'text/plain',
        fileSizeBytes: resumeRawText.length,
        rawText: resumeRawText,
      },
      {
        onSuccess: (data) => {
          setActiveResumeId(data.resumeId);
          if (data.extractedData) setParsedStaging(toEditable(data.extractedData));
        },
      },
    );
  };

  const handleApproveParsedResume = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedStaging || !activeResumeId) return;
    const { skillsCsv, ...rest } = parsedStaging;
    const approvedData: ParsedResumeData = {
      ...rest,
      skills: skillsCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name })),
    };
    approveResumeMutation.mutate(
      { resumeId: activeResumeId, approvedData },
      {
        onSuccess: () => {
          pushToast('Candidate saved', `${approvedData.fullName} added to the talent pool.`, 'success');
          setParsedStaging(null);
          setActiveResumeId(null);
          setResumeRawText('');
        },
        onError: (error) => {
          pushToast('Failed to save candidate', error instanceof Error ? error.message : 'Unknown error', 'error');
        },
      },
    );
  };

  // 2. Candidate Matcher
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  React.useEffect(() => {
    if (!selectedJobId && orgJobs[0]) setSelectedJobId(orgJobs[0].id);
  }, [orgJobs, selectedJobId]);
  React.useEffect(() => {
    if (!selectedCandidateId && orgCandidates[0]) setSelectedCandidateId(orgCandidates[0].id);
  }, [orgCandidates, selectedCandidateId]);
  const matchMutation = useMatchCandidate();

  // 3. Job Generator
  const [jdTitle, setJdTitle] = useState('');
  const [jdDept, setJdDept] = useState('');
  const [jdTone, setJdTone] = useState('Professional & Engaging');
  const [jdExperienceLevel, setJdExperienceLevel] = useState('SENIOR');
  const [jdSkills, setJdSkills] = useState('');
  const jobDescriptionMutation = useGenerateJobDescription();
  const [editableJdDescription, setEditableJdDescription] = useState('');

  // 4. Interview Assistant
  const [intRole, setIntRole] = useState('');
  const [intExperienceLevel, setIntExperienceLevel] = useState('SENIOR');
  const [intSkills, setIntSkills] = useState('');
  const interviewQuestionsMutation = useGenerateInterviewQuestions();

  // 5. Email Assistant
  const [emailPurpose, setEmailPurpose] = useState<
    'INTERVIEW_INVITE' | 'STATUS_UPDATE' | 'FOLLOW_UP' | 'OFFER' | 'REJECTION'
  >('INTERVIEW_INVITE');
  const [emailCandidateName, setEmailCandidateName] = useState('');
  const [emailJobTitle, setEmailJobTitle] = useState('');
  const emailMutation = useGenerateEmailDraft();
  const [editableEmailSubject, setEditableEmailSubject] = useState('');
  const [editableEmailBody, setEditableEmailBody] = useState('');

  // 6. Candidate Summary
  const [summaryCandidateId, setSummaryCandidateId] = useState('');
  const summaryMutation = useGenerateCandidateSummary();
  React.useEffect(() => {
    if (!summaryCandidateId && orgCandidates[0]) setSummaryCandidateId(orgCandidates[0].id);
  }, [orgCandidates, summaryCandidateId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            AI Recruitment Intelligence Studio
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Provider-independent AI tools across OpenAI, Google Gemini, and Anthropic Claude with human-in-the-loop verification.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-medium text-indigo-800">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          Active Provider:{' '}
          <span className="font-semibold">
            {providerStatus?.isConfigured
              ? `${providerStatus.activeProvider} (${providerStatus.activeModel})`
              : 'Not configured'}
          </span>
        </div>
      </div>

      {providerStatus && !providerStatus.isConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <p className="font-semibold">No AI Provider API Key Configured</p>
            <p className="mt-0.5">
              AI features below will return a clean error until a provider is configured. Add your OpenAI,
              Google Gemini, or Anthropic API key in{' '}
              <Link href="/settings" className="font-semibold underline inline-flex items-center gap-1">
                Settings <SettingsIcon className="h-3 w-3" />
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      {visibleTabs.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
          Your role does not have access to any AI Studio tools.
        </div>
      )}

      {/* TAB 1: RESUME PARSER */}
      {activeTab === 'RESUME_PARSER' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              Step 1: Paste Resume Text
            </h2>
            <textarea
              rows={11}
              value={resumeRawText}
              onChange={(e) => setResumeRawText(e.target.value)}
              placeholder="Paste the candidate's resume text here..."
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs text-slate-800"
            />
            <button
              type="button"
              onClick={handleExtractResume}
              disabled={resumeIsProcessing}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {resumeIsProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {resumeIsProcessing ? 'Extracting…' : 'Extract Structured Profile'}
            </button>
            {parseResumeMutation.isError && <AIErrorNotice error={parseResumeMutation.error} />}
            {resumeStatusQuery.data?.parseError && <AIErrorNotice error={new Error(resumeStatusQuery.data.parseError)} />}
          </div>

          {parsedStaging ? (
            <form
              onSubmit={handleApproveParsedResume}
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  Step 2: Recruiter Review & Approval (Staging)
                </h2>
                <span className="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  PENDING_REVIEW
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={parsedStaging.firstName}
                    onChange={(e) => setParsedStaging({ ...parsedStaging, firstName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={parsedStaging.lastName}
                    onChange={(e) => setParsedStaging({ ...parsedStaging, lastName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={parsedStaging.email}
                    onChange={(e) => setParsedStaging({ ...parsedStaging, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Current Title</label>
                  <input
                    type="text"
                    value={parsedStaging.currentTitle ?? ''}
                    onChange={(e) => setParsedStaging({ ...parsedStaging, currentTitle: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Extracted Skills (Comma-Separated)
                </label>
                <input
                  type="text"
                  value={parsedStaging.skillsCsv}
                  onChange={(e) => setParsedStaging({ ...parsedStaging, skillsCsv: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Summary</label>
                <textarea
                  rows={2}
                  value={parsedStaging.summary}
                  onChange={(e) => setParsedStaging({ ...parsedStaging, summary: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={approveResumeMutation.isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {approveResumeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Approve & Save Candidate to Talent Pool
              </button>
            </form>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 flex items-center justify-center text-sm text-slate-500">
              {resumeIsProcessing
                ? 'AI extraction in progress…'
                : 'Extracted profile will appear here for review once parsed.'}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CANDIDATE MATCHING */}
      {activeTab === 'CANDIDATE_MATCH' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Target Job Requisition
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {orgJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.department})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Candidate to Evaluate
              </label>
              <select
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {orgCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} — {c.currentTitle} ({c.totalExperienceYears} yrs)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={!selectedJobId || !selectedCandidateId || matchMutation.isPending}
            onClick={() => matchMutation.mutate({ jobId: selectedJobId, candidateId: selectedCandidateId })}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {matchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
            {matchMutation.isPending ? 'Evaluating…' : 'Run Deep AI Match Analysis'}
          </button>

          {matchMutation.isError && <AIErrorNotice error={matchMutation.error} />}

          {matchMutation.data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                  <p className="text-xs font-medium text-indigo-700">Overall Match Score</p>
                  <p className="text-3xl font-bold text-indigo-900 mt-1">
                    {matchMutation.data.overallScore}%
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-600">Skills Alignment</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">
                    {matchMutation.data.skillsScore}%
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-600">Experience Alignment</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">
                    {matchMutation.data.experienceScore}%
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-600">Education Alignment</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">
                    {matchMutation.data.educationScore}%
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <p className="font-semibold text-slate-900">Explainable AI Reasoning</p>
                <p className="text-slate-700 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  {matchMutation.data.explanation}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5">
                    <p className="text-xs font-semibold text-emerald-800 uppercase">Matching Skills</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {matchMutation.data.matchingSkills.map((s) => (
                        <span
                          key={s}
                          className="rounded bg-white px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5">
                    <p className="text-xs font-semibold text-amber-800 uppercase">
                      Missing / Probe Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {matchMutation.data.missingSkills.length > 0 ? (
                        matchMutation.data.missingSkills.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-white px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-600">All required skills matched!</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: JOB GENERATOR */}
      {activeTab === 'JOB_GENERATOR' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                value={jdTitle}
                onChange={(e) => setJdTitle(e.target.value)}
                placeholder="e.g. Staff AI Platform Engineer"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={jdDept}
                onChange={(e) => setJdDept(e.target.value)}
                placeholder="e.g. Engineering"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tone</label>
              <input
                type="text"
                value={jdTone}
                onChange={(e) => setJdTone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Required Skills (Comma-Separated)</label>
            <input
              type="text"
              value={jdSkills}
              onChange={(e) => setJdSkills(e.target.value)}
              placeholder="e.g. TypeScript, NestJS, PostgreSQL"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={!jdTitle || !jdDept || jobDescriptionMutation.isPending}
            onClick={() =>
              jobDescriptionMutation.mutate(
                {
                  title: jdTitle,
                  department: jdDept,
                  experienceLevel: jdExperienceLevel,
                  tone: jdTone,
                  requiredSkills: jdSkills.split(',').map((s) => s.trim()).filter(Boolean),
                },
                { onSuccess: (data) => setEditableJdDescription(data.description) },
              )
            }
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {jobDescriptionMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {jobDescriptionMutation.isPending ? 'Generating…' : 'Generate with AI'}
          </button>

          {jobDescriptionMutation.isError && <AIErrorNotice error={jobDescriptionMutation.error} />}

          {jobDescriptionMutation.data && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  AI-Generated Description (editable before publishing)
                </label>
                <textarea
                  rows={8}
                  value={editableJdDescription}
                  onChange={(e) => setEditableJdDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  const generated = jobDescriptionMutation.data;
                  if (!generated) return;
                  await createJob.mutateAsync({
                    title: generated.title || jdTitle,
                    department: jdDept,
                    location: 'Remote / Hybrid',
                    workLocationType: 'HYBRID',
                    employmentType: 'FULL_TIME',
                    experienceLevel: jdExperienceLevel,
                    minExperienceYears: 5,
                    salaryCurrency: 'USD',
                    showSalary: false,
                    description: editableJdDescription,
                    responsibilities: generated.responsibilities,
                    qualifications: generated.qualifications,
                    benefits: generated.benefits,
                    requiredSkills: generated.requiredSkills,
                    preferredSkills: generated.preferredSkills,
                    openingsCount: 1,
                    status: 'DRAFT',
                    aiGenerated: true,
                  });
                  pushToast('Job requisition saved', `${generated.title} saved as draft.`, 'success');
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Save as Draft Job Requisition
              </button>
            </>
          )}
        </div>
      )}

      {/* TAB 4: INTERVIEW ASSISTANT */}
      {activeTab === 'INTERVIEW_ASSIST' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Job Title / Role</label>
              <input
                type="text"
                value={intRole}
                onChange={(e) => setIntRole(e.target.value)}
                placeholder="e.g. Principal Full-Stack Engineer"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Experience Level</label>
              <select
                value={intExperienceLevel}
                onChange={(e) => setIntExperienceLevel(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                {['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE'].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Key Skills (Comma-Separated)</label>
              <input
                type="text"
                value={intSkills}
                onChange={(e) => setIntSkills(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={!intRole || interviewQuestionsMutation.isPending}
            onClick={() =>
              interviewQuestionsMutation.mutate({
                jobTitle: intRole,
                experienceLevel: intExperienceLevel,
                skills: intSkills.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {interviewQuestionsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {interviewQuestionsMutation.isPending ? 'Generating…' : 'Generate Tailored Interview Guide'}
          </button>

          {interviewQuestionsMutation.isError && <AIErrorNotice error={interviewQuestionsMutation.error} />}

          {interviewQuestionsMutation.data && (
            <div className="space-y-3">
              {interviewQuestionsMutation.data.questions.map((q, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                  <span className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                    {q.category}
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-2">{q.question}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    <span className="font-semibold">Evaluation Criteria:</span> {q.evaluationCriteria}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: EMAIL ASSISTANT */}
      {activeTab === 'EMAIL_ASSIST' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Communication Type
              </label>
              <select
                value={emailPurpose}
                onChange={(e) => setEmailPurpose(e.target.value as typeof emailPurpose)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="INTERVIEW_INVITE">Interview Invitation</option>
                <option value="STATUS_UPDATE">Application Stage Update</option>
                <option value="FOLLOW_UP">Candidate Follow-Up</option>
                <option value="OFFER">Executive Offer Letter Draft</option>
                <option value="REJECTION">Empathetic Rejection Communication</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Candidate Name</label>
              <input
                type="text"
                value={emailCandidateName}
                onChange={(e) => setEmailCandidateName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                value={emailJobTitle}
                onChange={(e) => setEmailJobTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={!emailCandidateName || !emailJobTitle || emailMutation.isPending}
            onClick={() =>
              emailMutation.mutate(
                {
                  purpose: emailPurpose,
                  candidateName: emailCandidateName,
                  jobTitle: emailJobTitle,
                  companyName: activeOrganization.name,
                },
                {
                  onSuccess: (data) => {
                    setEditableEmailSubject(data.subject);
                    setEditableEmailBody(data.body);
                  },
                },
              )
            }
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {emailMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {emailMutation.isPending ? 'Drafting…' : 'Generate Email Draft'}
          </button>

          {emailMutation.isError && <AIErrorNotice error={emailMutation.error} />}

          {emailMutation.data && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Subject</label>
                <input
                  type="text"
                  value={editableEmailSubject}
                  onChange={(e) => setEditableEmailSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Editable Email Draft (Human Review Required Before Sending)
                </label>
                <textarea
                  rows={7}
                  value={editableEmailBody}
                  onChange={(e) => setEditableEmailBody(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(`Subject: ${editableEmailSubject}\n\n${editableEmailBody}`);
                  pushToast('Draft copied', 'Paste it into your email client to send.', 'success');
                }}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Copy Draft to Clipboard
              </button>
            </>
          )}
        </div>
      )}

      {/* TAB 6: CANDIDATE SUMMARY */}
      {activeTab === 'CANDIDATE_SUMMARY' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Candidate</label>
            <select
              value={summaryCandidateId}
              onChange={(e) => setSummaryCandidateId(e.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {orgCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} — {c.currentTitle}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!summaryCandidateId || summaryMutation.isPending}
            onClick={() => summaryMutation.mutate({ candidateId: summaryCandidateId })}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {summaryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserSquare2 className="h-4 w-4" />}
            {summaryMutation.isPending ? 'Summarizing…' : 'Generate Candidate Summary'}
          </button>

          {summaryMutation.isError && <AIErrorNotice error={summaryMutation.error} />}

          {summaryMutation.data && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-800 inline-block">
                AI-generated — verify against the candidate profile before use
              </div>
              <p className="text-slate-700 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                {summaryMutation.data.summary}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5">
                  <p className="text-xs font-semibold text-emerald-800 uppercase">Key Strengths</p>
                  <ul className="mt-2 space-y-1 text-xs text-emerald-900 list-disc pl-4">
                    {summaryMutation.data.keyStrengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5">
                  <p className="text-xs font-semibold text-amber-800 uppercase">Considerations</p>
                  <ul className="mt-2 space-y-1 text-xs text-amber-900 list-disc pl-4">
                    {summaryMutation.data.considerations.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Based on verified profile fields: {summaryMutation.data.basedOnFields.join(', ')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
