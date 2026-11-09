'use client';

import React, { useState } from 'react';
import {
  ClipboardCheck,
  ExternalLink,
  Loader2,
  Plus,
  Star,
  Users,
  Video,
} from 'lucide-react';
import type { HiringRecommendation, InterviewStatus, InterviewType } from '@recruitflow/types';
import {
  useInterviewsList,
  useScheduleInterview,
  useSubmitInterviewFeedback,
} from '@/features/interviews/use-interviews';
import { useApplicationsKanban } from '@/features/applications/use-applications';
import { useTeamMembers } from '@/features/team/use-team';
import { useRecruitFlow } from '@/stores/recruitflow-store';
import { ApiClientError } from '@/lib/api-client';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function InterviewsPage() {
  const { can, pushToast } = useRecruitFlow();

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeScorecardInterviewId, setActiveScorecardInterviewId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | InterviewStatus>('ALL');

  const interviewsQuery = useInterviewsList({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  });
  const interviews = interviewsQuery.data ?? [];

  const applicationsQuery = useApplicationsKanban({});
  const applications = applicationsQuery.data ?? [];

  const membersQuery = useTeamMembers();
  const members = membersQuery.data ?? [];

  const scheduleInterview = useScheduleInterview();
  const submitFeedback = useSubmitInterviewFeedback();

  // Schedule form state
  const [applicationId, setApplicationId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<InterviewType>('TECHNICAL');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [timezone, setTimezone] = useState('UTC');
  const [locationOrLink, setLocationOrLink] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (!applicationId && applications[0]) setApplicationId(applications[0].id);
  }, [applications, applicationId]);

  // Scorecard state
  const [overallRating, setOverallRating] = useState(5);
  const [technicalScore, setTechnicalScore] = useState(5);
  const [communicationScore, setCommunicationScore] = useState(4);
  const [recommendation, setRecommendation] = useState<HiringRecommendation>('STRONG_HIRE');
  const [strengths, setStrengths] = useState('');
  const [concerns, setConcerns] = useState('');

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId || !title.trim() || !scheduledAt) return;
    if (selectedParticipantIds.length === 0) {
      pushToast('Select at least one interviewer', undefined, 'error');
      return;
    }
    try {
      await scheduleInterview.mutateAsync({
        applicationId,
        title,
        type,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes,
        timezone,
        locationOrLink: locationOrLink || undefined,
        participantUserIds: selectedParticipantIds,
      });
      pushToast('Interview scheduled', `${title} added to the calendar.`, 'success');
      setShowScheduleModal(false);
      setTitle('');
      setScheduledAt('');
    } catch (error) {
      pushToast(
        'Could not schedule interview',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
  };

  const handleScorecardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeScorecardInterviewId) return;
    try {
      await submitFeedback.mutateAsync({
        interviewId: activeScorecardInterviewId,
        overallRating,
        technicalScore,
        communicationScore,
        recommendation,
        strengths: strengths || undefined,
        concerns: concerns || undefined,
      });
      pushToast('Scorecard submitted', `Recorded ${overallRating}/5 rating (${recommendation}).`, 'success');
      setActiveScorecardInterviewId(null);
      setStrengths('');
      setConcerns('');
    } catch (error) {
      pushToast(
        'Could not submit scorecard',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
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
            <Button type="button" onClick={() => setShowScheduleModal(true)}>
              <Plus className="h-4 w-4" />
              Schedule Interview
            </Button>
          )}
        </div>
      </div>

      {interviewsQuery.isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {interviews.length === 0 && !interviewsQuery.isLoading && (
          <p className="py-8 text-center text-sm text-slate-500">No interviews scheduled yet.</p>
        )}
        {interviews.map((intv) => (
          <div
            key={intv.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={intv.status === 'COMPLETED' ? 'success' : 'info'}>
                  {intv.status}
                </Badge>
                <Badge variant="default">{intv.type}</Badge>
                <span className="text-xs text-slate-500">
                  {new Date(intv.scheduledAt).toLocaleString()} ({intv.timezone}) •{' '}
                  {intv.durationMinutes} mins
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">{intv.title}</h3>
              <p className="text-sm text-slate-600">
                Candidate:{' '}
                <span className="font-medium text-slate-900">
                  {intv.application.candidate.fullName}
                </span>{' '}
                • Role:{' '}
                <span className="font-medium text-slate-900">{intv.application.job.title}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  Panel: {intv.participants.map((p) => p.user.name).join(', ')}
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

              {intv.feedbacks.length > 0 && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Submitted Scorecards ({intv.feedbacks.length})
                  </p>
                  {intv.feedbacks.map((sc) => (
                    <div
                      key={sc.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white p-2.5 rounded border border-slate-200"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">
                          {sc.reviewer?.name ?? 'Interviewer'}
                        </span>
                        <p className="text-slate-600 mt-0.5">{sc.strengths}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          {sc.overallRating}/5
                        </span>
                        <Badge variant="primary">{sc.recommendation}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {can('interviews.feedback') && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveScorecardInterviewId(intv.id)}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Submit Scorecard
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Schedule Modal */}
      <Modal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Schedule Candidate Interview"
        maxWidth="lg"
      >
        <form onSubmit={handleSchedule} className="space-y-4">
          <Select
            label="Candidate Application"
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
            options={applications.map((app) => ({
              value: app.id,
              label: `${app.candidate.fullName} — ${app.job.title} (${app.status})`,
            }))}
          />
          <Input
            label="Interview Title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as InterviewType)}
              options={[
                { value: 'VIDEO', label: 'Video' },
                { value: 'TECHNICAL', label: 'Technical' },
                { value: 'BEHAVIORAL', label: 'Behavioral' },
                { value: 'PANEL', label: 'Panel' },
                { value: 'ONSITE', label: 'Onsite' },
                { value: 'FINAL', label: 'Final Executive' },
              ]}
            />
            <Input
              label="Duration (Minutes)"
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date & Time"
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <Input
              label="Timezone"
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>
          <Input
            label="Meeting Link or Location"
            type="text"
            value={locationOrLink}
            onChange={(e) => setLocationOrLink(e.target.value)}
          />
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Interview Panel
            </label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const checked = selectedParticipantIds.includes(m.user.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() =>
                      setSelectedParticipantIds((prev) =>
                        checked ? prev.filter((id) => id !== m.user.id) : [...prev, m.user.id],
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      checked
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                        : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    {m.user.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setShowScheduleModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={scheduleInterview.isPending}>
              {scheduleInterview.isPending ? 'Scheduling...' : 'Confirm & Send Invites'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Scorecard Modal */}
      <Modal
        open={activeScorecardInterviewId !== null}
        onClose={() => setActiveScorecardInterviewId(null)}
        title="Submit Structured Interview Scorecard"
        maxWidth="lg"
      >
        <form onSubmit={handleScorecardSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Overall Rating (1-5)"
              type="number"
              min={1}
              max={5}
              value={overallRating}
              onChange={(e) => setOverallRating(Number(e.target.value))}
            />
            <Select
              label="Hiring Recommendation"
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value as HiringRecommendation)}
              options={[
                { value: 'STRONG_HIRE', label: 'Strong Hire' },
                { value: 'HIRE', label: 'Hire' },
                { value: 'NEUTRAL', label: 'Neutral / Hold' },
                { value: 'NO_HIRE', label: 'No Hire' },
                { value: 'STRONG_NO_HIRE', label: 'Strong No Hire' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Technical Score (1-5)"
              type="number"
              min={1}
              max={5}
              value={technicalScore}
              onChange={(e) => setTechnicalScore(Number(e.target.value))}
            />
            <Input
              label="Communication Score (1-5)"
              type="number"
              min={1}
              max={5}
              value={communicationScore}
              onChange={(e) => setCommunicationScore(Number(e.target.value))}
            />
          </div>
          <Textarea
            label="Key Strengths Observed"
            rows={2}
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
          />
          <Textarea
            label="Concerns / Follow-ups"
            rows={2}
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveScorecardInterviewId(null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitFeedback.isPending}>
              {submitFeedback.isPending ? 'Saving...' : 'Save Scorecard'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
