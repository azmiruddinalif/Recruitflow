'use client';

import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  ExternalLink,
  Plus,
  Sparkles,
  Star,
  Users,
  Video,
} from 'lucide-react';
import type { HiringRecommendation, InterviewType } from '@recruitflow/types';
import { useRecruitFlow } from '@/stores/recruitflow-store';

export default function InterviewsPage() {
  const {
    activeOrganization,
    interviews,
    applications,
    candidates,
    jobs,
    teamMembers,
    can,
    scheduleInterview,
    submitInterviewScorecard,
  } = useRecruitFlow();

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeScorecardInterviewId, setActiveScorecardInterviewId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'COMPLETED'>('ALL');

  const orgInterviews = interviews.filter(
    (i) =>
      i.organizationId === activeOrganization.id &&
      (statusFilter === 'ALL' || i.status === statusFilter),
  );
  const orgApps = applications.filter((a) => a.organizationId === activeOrganization.id);
  const orgMembers = teamMembers.filter((m) => m.organizationId === activeOrganization.id);

  // Schedule form state
  const [applicationId, setApplicationId] = useState(orgApps[0]?.id ?? '');
  const [title, setTitle] = useState('Technical System Design & Architecture Interview');
  const [type, setType] = useState<InterviewType>('TECHNICAL');
  const [scheduledAt, setScheduledAt] = useState('2026-11-10T15:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [timezone, setTimezone] = useState(activeOrganization.defaultTimezone || 'UTC');
  const [locationOrLink, setLocationOrLink] = useState('https://meet.recruitflow.io/tech-panel');
  const [agendaNotes, setAgendaNotes] = useState(
    '1. Distributed systems architecture\n2. Multi-tenant PostgreSQL & Prisma schema design\n3. Live API security review',
  );
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(
    orgMembers.slice(0, 2).map((m) => m.id),
  );

  // Scorecard state
  const [overallRating, setOverallRating] = useState(5);
  const [technicalScore, setTechnicalScore] = useState(5);
  const [communicationScore, setCommunicationScore] = useState(4);
  const [problemSolvingScore, setProblemSolvingScore] = useState(5);
  const [cultureFitScore, setCultureFitScore] = useState(5);
  const [recommendation, setRecommendation] = useState<HiringRecommendation>('STRONG_HIRE');
  const [strengths, setStrengths] = useState(
    'Exceptional command of distributed systems, TypeScript, and clean multi-tenant architecture.',
  );
  const [concerns, setConcerns] = useState('None identified during technical deep-dive.');
  const [notes, setNotes] = useState('Answered all system scaling scenarios with clear trade-offs.');

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId) return;
    await scheduleInterview({
      applicationId,
      title,
      type,
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMinutes,
      timezone,
      locationOrLink,
      agendaNotes,
      participantIds: selectedParticipantIds,
    });
    setShowScheduleModal(false);
  };

  const handleScorecardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeScorecardInterviewId) return;
    await submitInterviewScorecard(activeScorecardInterviewId, {
      overallRating,
      technicalScore,
      communicationScore,
      problemSolvingScore,
      cultureFitScore,
      recommendation,
      strengths,
      concerns,
      notes,
    });
    setActiveScorecardInterviewId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Interviews & Evaluation Scorecards
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Schedule timezone-aware interviews, coordinate panels, and capture structured hiring scorecards.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            {(['ALL', 'SCHEDULED', 'COMPLETED'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  statusFilter === tab
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {can('interviews.schedule') && (
            <button
              type="button"
              onClick={() => setShowScheduleModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              <Plus className="h-4 w-4" />
              Schedule Interview
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {orgInterviews.map((intv) => {
          const cand = candidates.find((c) => c.id === intv.candidateId);
          const job = jobs.find((j) => j.id === intv.jobId);
          return (
            <div
              key={intv.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium border ${
                      intv.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {intv.status}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {intv.type}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(intv.scheduledAt).toLocaleString()} ({intv.timezone}) •{' '}
                    {intv.durationMinutes} mins
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900">{intv.title}</h3>
                <p className="text-sm text-slate-600">
                  Candidate:{' '}
                  <span className="font-medium text-slate-900">
                    {cand?.fullName ?? 'Candidate'}
                  </span>{' '}
                  • Role:{' '}
                  <span className="font-medium text-slate-900">{job?.title ?? 'Job Role'}</span>
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    Panel: {intv.participants.map((p) => p.name).join(', ')}
                  </span>
                  {intv.locationOrLink && (
                    <a
                      href={intv.locationOrLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Join Meeting Room
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {intv.scorecards.length > 0 && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Submitted Scorecards ({intv.scorecards.length})
                    </p>
                    {intv.scorecards.map((sc) => (
                      <div
                        key={sc.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white p-2.5 rounded border border-slate-200"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">{sc.interviewerName}</span>{' '}
                          <span className="text-slate-500">({sc.interviewerRole})</span>
                          <p className="text-slate-600 mt-0.5">{sc.strengths}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                            <Star className="h-3.5 w-3.5 fill-amber-400" />
                            {sc.overallRating}/5
                          </span>
                          <span className="rounded bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 border border-indigo-200">
                            {sc.recommendation}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {can('interviews.feedback') && (
                  <button
                    type="button"
                    onClick={() => setActiveScorecardInterviewId(intv.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Submit Scorecard
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900">Schedule Candidate Interview</h2>
            <form onSubmit={handleSchedule} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Candidate Application
                </label>
                <select
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {orgApps.map((app) => {
                    const c = candidates.find((cand) => cand.id === app.candidateId);
                    const j = jobs.find((jb) => jb.id === app.jobId);
                    return (
                      <option key={app.id} value={app.id}>
                        {c?.fullName} — {j?.title} ({app.status})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Interview Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as InterviewType)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="VIDEO">Video</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="BEHAVIORAL">Behavioral</option>
                    <option value="PANEL">Panel</option>
                    <option value="ONSITE">Onsite</option>
                    <option value="FINAL">Final Executive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Timezone</label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Meeting Link or Location
                </label>
                <input
                  type="text"
                  value={locationOrLink}
                  onChange={(e) => setLocationOrLink(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Confirm & Send Invites
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scorecard Modal */}
      {activeScorecardInterviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900">
              Submit Structured Interview Scorecard
            </h2>
            <form onSubmit={handleScorecardSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Overall Rating (1-5)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={overallRating}
                    onChange={(e) => setOverallRating(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Hiring Recommendation
                  </label>
                  <select
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value as HiringRecommendation)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="STRONG_HIRE">Strong Hire</option>
                    <option value="HIRE">Hire</option>
                    <option value="NEUTRAL">Neutral / Hold</option>
                    <option value="NO_HIRE">No Hire</option>
                    <option value="STRONG_NO_HIRE">Strong No Hire</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Technical Score (1-5)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={technicalScore}
                    onChange={(e) => setTechnicalScore(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Communication Score (1-5)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={communicationScore}
                    onChange={(e) => setCommunicationScore(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Key Strengths Observed
                </label>
                <textarea
                  rows={2}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Concerns / Follow-ups
                </label>
                <textarea
                  rows={2}
                  value={concerns}
                  onChange={(e) => setConcerns(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveScorecardInterviewId(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Save Scorecard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
