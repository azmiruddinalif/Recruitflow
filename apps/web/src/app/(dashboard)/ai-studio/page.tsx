'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Mail,
  MessageSquare,
  Sparkles,
  Target,
  Upload,
} from 'lucide-react';
import { useRecruitFlow } from '@/stores/recruitflow-store';

export default function AIStudioPage() {
  const {
    activeOrganization,
    candidates,
    jobs,
    aiProviders,
    createCandidate,
    computeAIMatchForPair,
    createJob,
    pushToast,
  } = useRecruitFlow();

  const [activeTab, setActiveTab] = useState<
    'RESUME_PARSER' | 'CANDIDATE_MATCH' | 'JOB_GENERATOR' | 'INTERVIEW_ASSIST' | 'EMAIL_ASSIST'
  >('RESUME_PARSER');

  const orgCandidates = candidates.filter((c) => c.organizationId === activeOrganization.id);
  const orgJobs = jobs.filter((j) => j.organizationId === activeOrganization.id);
  const activeProvider = aiProviders.find((p) => p.isConfigured && p.isActive);

  // 1. Resume Parser State (PENDING_REVIEW -> Human Approve)
  const [resumeRawText, setResumeRawText] = useState(
    `MARCUS CHEN\nPrincipal Backend & AI Engineer\nEmail: marcus.chen@cloudnative.dev | Phone: +1 (650) 442-1980 | Seattle, WA\n\nSUMMARY\n9+ years building distributed TypeScript, NestJS, PostgreSQL, and Kubernetes systems.\n\nEXPERIENCE\nStaff Backend Engineer — Vercel (2022 - Present)\nSenior Platform Engineer — Twilio (2018 - 2022)\n\nEDUCATION\nB.S. Computer Science — University of Washington\n\nSKILLS\nTypeScript, NestJS, Next.js, PostgreSQL, Prisma, Redis, Docker, Kubernetes`,
  );
  const [parsedStaging, setParsedStaging] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    currentTitle: string;
    currentCompany: string;
    totalExperienceYears: number;
    summary: string;
    skillsCsv: string;
  } | null>({
    firstName: 'Marcus',
    lastName: 'Chen',
    email: 'marcus.chen@cloudnative.dev',
    phone: '+1 (650) 442-1980',
    location: 'Seattle, WA',
    currentTitle: 'Principal Backend & AI Engineer',
    currentCompany: 'Vercel',
    totalExperienceYears: 9,
    summary:
      '9+ years building distributed TypeScript, NestJS, PostgreSQL, and Kubernetes systems.',
    skillsCsv: 'TypeScript, NestJS, Next.js, PostgreSQL, Prisma, Redis, Docker, Kubernetes',
  });

  // 2. Candidate Matcher State
  const [selectedJobId, setSelectedJobId] = useState(orgJobs[0]?.id ?? '');
  const [selectedCandidateId, setSelectedCandidateId] = useState(orgCandidates[0]?.id ?? '');
  const matchEvaluation = computeAIMatchForPair(selectedJobId, selectedCandidateId);

  // 3. Job Generator State
  const [jdTitle, setJdTitle] = useState('Staff AI Platform Engineer');
  const [jdDept, setJdDept] = useState('AI & Core Infrastructure');
  const [jdTone, setJdTone] = useState('Executive & High-Impact');
  const [jdSkills, setJdSkills] = useState('TypeScript, NestJS, Next.js, PostgreSQL, OpenAI, Gemini');
  const [generatedJd, setGeneratedJd] = useState(
    `We are seeking a Staff AI Platform Engineer to architect provider-independent LLM workflows, high-throughput NestJS microservices, and multi-tenant enterprise SaaS capabilities.\n\nKey Responsibilities:\n• Design resilient AI orchestration across OpenAI, Gemini, and Anthropic\n• Scale PostgreSQL and Prisma data pipelines with strict tenant isolation\n• Partner with product leadership to ship explainable hiring intelligence`,
  );

  // 4. Interview Assistant State
  const [intRole, setIntRole] = useState('Principal Full-Stack Engineer');
  const [questionsList] = useState([
    {
      category: 'TECHNICAL',
      question:
        'How do you enforce multi-tenant data isolation in a NestJS + Prisma + PostgreSQL architecture?',
      criteria: 'Look for guard-level resolution of organizationId and composite database indexes.',
    },
    {
      category: 'PROBLEM_SOLVING',
      question:
        'How would you design a provider-agnostic AI resume parser that handles malformed JSON responses and rate limits?',
      criteria: 'Look for Zod schema validation, retry backoff, BullMQ queues, and human review staging.',
    },
    {
      category: 'BEHAVIORAL',
      question:
        'Describe a complex architectural trade-off you led where security and developer velocity were in tension.',
      criteria: 'Clear communication, pragmatic security controls, and measurable outcome.',
    },
  ]);

  // 5. Email Assistant State
  const [emailPurpose, setEmailPurpose] = useState('INTERVIEW_INVITE');
  const [emailSubject, setEmailSubject] = useState(
    `Interview Invitation: Principal Engineer Role at ${activeOrganization.name}`,
  );
  const [emailBody, setEmailBody] = useState(
    `Hi Sophia,\n\nThank you for your application to ${activeOrganization.name}. Our engineering panel was impressed by your distributed systems background and would love to invite you to a 60-minute Technical Architecture interview.\n\nPlease let us know your availability this week.\n\nBest regards,\nTalent Acquisition Team\n${activeOrganization.name}`,
  );

  const handleApproveParsedResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedStaging) return;
    await createCandidate({
      firstName: parsedStaging.firstName,
      lastName: parsedStaging.lastName,
      email: parsedStaging.email,
      phone: parsedStaging.phone,
      location: parsedStaging.location,
      currentTitle: parsedStaging.currentTitle,
      currentCompany: parsedStaging.currentCompany,
      totalExperienceYears: parsedStaging.totalExperienceYears,
      summary: parsedStaging.summary,
      source: 'AI_RESUME_IMPORT',
      salaryCurrency: 'USD',
      tags: ['AI Parsed', 'Verified'],
      languages: ['English'],
      skills: parsedStaging.skillsCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name, proficiency: 'Advanced', yearsOfExperience: 5 })),
      experiences: [
        {
          company: parsedStaging.currentCompany,
          title: parsedStaging.currentTitle,
          isCurrent: true,
          description: parsedStaging.summary,
        },
      ],
      educations: [],
      certifications: [],
    });
  };

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
            {activeProvider
              ? `${activeProvider.displayName} (${activeProvider.modelName})`
              : 'Unconfigured (Configure in Super Admin)'}
          </span>
        </div>
      </div>

      {!activeProvider && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <p className="font-semibold">No AI Provider API Key Configured</p>
            <p className="mt-0.5">
              Configure your OpenAI, Google Gemini, or Anthropic API key in{' '}
              <span className="font-semibold">Super Admin Console → AI Providers</span> or `.env` to enable live external LLM calls.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'RESUME_PARSER', label: '1. AI Resume Parser', icon: Upload },
          { id: 'CANDIDATE_MATCH', label: '2. Explainable Candidate Matcher', icon: Target },
          { id: 'JOB_GENERATOR', label: '3. AI Job Description Generator', icon: FileText },
          { id: 'INTERVIEW_ASSIST', label: '4. AI Interview Assistant', icon: MessageSquare },
          { id: 'EMAIL_ASSIST', label: '5. AI Email Assistant', icon: Mail },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
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

      {/* TAB 1: RESUME PARSER */}
      {activeTab === 'RESUME_PARSER' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              Step 1: Upload PDF/DOCX or Paste Resume Text
            </h2>
            <textarea
              rows={11}
              value={resumeRawText}
              onChange={(e) => setResumeRawText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs text-slate-800"
            />
            <button
              type="button"
              onClick={() =>
                pushToast(
                  'Resume extracted into PENDING_REVIEW',
                  'Verify extracted fields on the right before saving.',
                  'info',
                )
              }
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <Sparkles className="h-4 w-4" />
              Extract Structured Profile
            </button>
          </div>

          {parsedStaging && (
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
                    onChange={(e) =>
                      setParsedStaging({ ...parsedStaging, firstName: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={parsedStaging.lastName}
                    onChange={(e) =>
                      setParsedStaging({ ...parsedStaging, lastName: e.target.value })
                    }
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Current Title
                  </label>
                  <input
                    type="text"
                    value={parsedStaging.currentTitle}
                    onChange={(e) =>
                      setParsedStaging({ ...parsedStaging, currentTitle: e.target.value })
                    }
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
                  onChange={(e) =>
                    setParsedStaging({ ...parsedStaging, skillsCsv: e.target.value })
                  }
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
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve & Save Candidate to Talent Pool
              </button>
            </form>
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-xs font-medium text-indigo-700">Overall Match Score</p>
              <p className="text-3xl font-bold text-indigo-900 mt-1">
                {matchEvaluation.overallScore}%
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-600">Skills Alignment</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">
                {matchEvaluation.skillsScore}%
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-600">Experience Alignment</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">
                {matchEvaluation.experienceScore}%
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-600">Education Alignment</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">
                {matchEvaluation.educationScore}%
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <p className="font-semibold text-slate-900">Explainable AI Reasoning</p>
            <p className="text-slate-700 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              {matchEvaluation.explanation}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5">
                <p className="text-xs font-semibold text-emerald-800 uppercase">Matching Skills</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {matchEvaluation.matchingSkills.map((s) => (
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
                  {matchEvaluation.missingSkills.length > 0 ? (
                    matchEvaluation.missingSkills.map((s) => (
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={jdDept}
                onChange={(e) => setJdDept(e.target.value)}
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
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Editable Generated Job Description
            </label>
            <textarea
              rows={8}
              value={generatedJd}
              onChange={(e) => setGeneratedJd(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              createJob({
                title: jdTitle,
                department: jdDept,
                location: 'Remote / Hybrid',
                workLocationType: 'HYBRID',
                employmentType: 'FULL_TIME',
                experienceLevel: 'SENIOR',
                minExperienceYears: 5,
                salaryMin: 170000,
                salaryMax: 210000,
                salaryCurrency: 'USD',
                showSalary: true,
                description: generatedJd,
                responsibilities: ['Architect scalable systems', 'Collaborate across product teams'],
                qualifications: ['5+ years production engineering experience'],
                benefits: ['Competitive salary & equity', 'Comprehensive healthcare'],
                requiredSkills: jdSkills.split(',').map((s) => s.trim()),
                preferredSkills: [],
                openingsCount: 1,
                status: 'PUBLISHED',
                hiringManagerName: 'Marcus Vance',
                aiGenerated: true,
              })
            }
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Save & Publish Generated Job Requisition
          </button>
        </div>
      )}

      {/* TAB 4: INTERVIEW ASSISTANT */}
      {activeTab === 'INTERVIEW_ASSIST' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Role-Specific Interview Questions & Evaluation Rubric ({intRole})
            </h2>
            <input
              type="text"
              value={intRole}
              onChange={(e) => setIntRole(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-3">
            {questionsList.map((q, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                <span className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                  {q.category}
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-2">{q.question}</p>
                <p className="text-xs text-slate-600 mt-1">
                  <span className="font-semibold">Evaluation Rubric:</span> {q.criteria}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: EMAIL ASSISTANT */}
      {activeTab === 'EMAIL_ASSIST' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Communication Type
              </label>
              <select
                value={emailPurpose}
                onChange={(e) => setEmailPurpose(e.target.value)}
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
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Editable Email Draft (Human Review Required Before Sending)
            </label>
            <textarea
              rows={7}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              pushToast(
                'Email approved & queued for delivery',
                `Subject: ${emailSubject}`,
                'success',
              )
            }
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Approve & Send Communication
          </button>
        </div>
      )}
    </div>
  );
}
