// ============================================================================
// @recruitflow/types — Canonical Shared Domain & API Types
// ============================================================================

export type SystemRoleCode =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'HIRING_MANAGER'
  | 'RECRUITER'
  | 'INTERVIEWER';

export type PermissionCode =
  | 'candidates.read'
  | 'candidates.create'
  | 'candidates.update'
  | 'candidates.delete'
  | 'jobs.read'
  | 'jobs.create'
  | 'jobs.update'
  | 'jobs.delete'
  | 'applications.read'
  | 'applications.create'
  | 'applications.update'
  | 'applications.delete'
  | 'interviews.read'
  | 'interviews.schedule'
  | 'interviews.feedback'
  | 'ai.resume_parse'
  | 'ai.candidate_match'
  | 'ai.job_generate'
  | 'ai.interview_assist'
  | 'ai.email_assist'
  | 'analytics.read'
  | 'organization.read'
  | 'organization.manage'
  | 'members.read'
  | 'members.manage'
  | 'billing.read'
  | 'billing.manage'
  | 'admin.organizations'
  | 'admin.users'
  | 'admin.plans'
  | 'admin.ai'
  | 'admin.system';

export type ApplicationStatus =
  | 'NEW'
  | 'SCREENING'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'ASSESSMENT'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'TEMPORARY'
  | 'INTERNSHIP'
  | 'FREELANCE';

export type WorkLocationType = 'ONSITE' | 'REMOTE' | 'HYBRID';

export type ExperienceLevel = 'ENTRY' | 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD' | 'EXECUTIVE';

export type InterviewType =
  | 'PHONE_SCREEN'
  | 'VIDEO'
  | 'TECHNICAL'
  | 'BEHAVIORAL'
  | 'PANEL'
  | 'ONSITE'
  | 'FINAL';

export type InterviewStatus = 'SCHEDULED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';

export type HiringRecommendation =
  | 'STRONG_HIRE'
  | 'HIRE'
  | 'NEUTRAL'
  | 'NO_HIRE'
  | 'STRONG_NO_HIRE';

export type AIProviderType = 'OPENAI' | 'GEMINI' | 'ANTHROPIC';

export type AIFeatureType =
  | 'RESUME_PARSE'
  | 'CANDIDATE_MATCH'
  | 'JOB_DESCRIPTION'
  | 'INTERVIEW_ASSISTANT'
  | 'EMAIL_ASSISTANT';

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors: ApiErrorDetail[];
  statusCode?: number;
  timestamp?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  jobTitle?: string | null;
  timezone: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  activeOrganizationId?: string | null;
}

export interface AuthenticatedOrganizationContext {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  memberId: string;
  roleCode: SystemRoleCode;
  permissions: PermissionCode[];
}

export interface ParsedResumeData {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  currentTitle?: string;
  currentCompany?: string;
  totalExperienceYears?: number;
  summary: string;
  skills: Array<{
    name: string;
    proficiency?: string;
    yearsOfExperience?: number;
  }>;
  experiences: Array<{
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    description?: string;
    highlights?: string[];
  }>;
  educations: Array<{
    institution: string;
    degree: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
    grade?: string;
  }>;
  certifications: Array<{
    name: string;
    issuingOrg: string;
    issueDate?: string;
  }>;
  languages: string[];
}

export interface AICandidateMatchResult {
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  relevantExperience: string;
  explanation: string;
  recommendations: string[];
}

export interface AIJobDescriptionResult {
  title: string;
  summary: string;
  description: string;
  responsibilities: string[];
  qualifications: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  benefits: string[];
}

export interface AIInterviewQuestionsResult {
  questions: Array<{
    category: 'TECHNICAL' | 'BEHAVIORAL' | 'ROLE_SPECIFIC' | 'PROBLEM_SOLVING';
    question: string;
    evaluationCriteria: string;
    expectedSignals: string[];
  }>;
  scorecardCriteria: Array<{
    name: string;
    weight: number;
    description: string;
  }>;
}

export interface AIEmailDraftResult {
  subject: string;
  body: string;
  tone: string;
  placeholders: string[];
}

export interface DashboardMetrics {
  totalCandidates: number;
  activeJobs: number;
  totalApplications: number;
  scheduledInterviews: number;
  hiredCandidates: number;
  rejectedApplications: number;
  funnel: Array<{
    status: ApplicationStatus;
    count: number;
    percentage: number;
  }>;
  hiringTrends: Array<{
    month: string;
    applications: number;
    interviews: number;
    hired: number;
  }>;
  upcomingInterviews: Array<{
    id: string;
    title: string;
    scheduledAt: string;
    type: InterviewType;
    candidateName: string;
    jobTitle: string;
  }>;
  recentActivities: Array<{
    id: string;
    action: string;
    description: string;
    actorName: string;
    createdAt: string;
  }>;
}

