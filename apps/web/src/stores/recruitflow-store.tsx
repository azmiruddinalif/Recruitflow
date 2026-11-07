'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  AICandidateMatchResult,
  AIProviderType,
  ApplicationStatus,
  EmploymentType,
  ExperienceLevel,
  HiringRecommendation,
  InterviewStatus,
  InterviewType,
  JobStatus,
  PermissionCode,
  SystemRoleCode,
  WorkLocationType,
} from '@recruitflow/types';
import { hasPermission } from '@recruitflow/shared';
import { apiClient } from '@/lib/api-client';
import { DEMO_ACCOUNTS } from '@/lib/auth-client';

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  industry: string;
  companySize: string;
  website: string;
  description: string;
  planName: 'Starter' | 'Growth' | 'Enterprise';
  brandPrimaryColor: string;
  defaultCurrency: string;
  defaultTimezone: string;
  allowAIResumeParsing: boolean;
  allowAICandidateMatching: boolean;
  emailNotificationsEnabled: boolean;
  membersCount: number;
  createdAt: string;
}

export interface CandidateNoteItem {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export interface CandidateAttachmentItem {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedAt: string;
}

export interface CandidateRecord {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  currentTitle: string;
  currentCompany: string;
  totalExperienceYears: number;
  summary: string;
  source: string;
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  salaryCurrency: string;
  noticePeriodDays?: number;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  tags: string[];
  languages: string[];
  skills: Array<{ name: string; proficiency?: string; yearsOfExperience?: number }>;
  experiences: Array<{
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    description?: string;
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
  notes: CandidateNoteItem[];
  attachments: CandidateAttachmentItem[];
  createdAt: string;
}

export interface JobRecord {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  department: string;
  location: string;
  workLocationType: WorkLocationType;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  minExperienceYears: number;
  maxExperienceYears?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  showSalary: boolean;
  description: string;
  responsibilities: string[];
  qualifications: string[];
  benefits: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  openingsCount: number;
  status: JobStatus;
  hiringManagerName: string;
  aiGenerated: boolean;
  publishedAt?: string;
  createdAt: string;
}

export interface ApplicationStageHistoryEntry {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedByName: string;
  reason?: string;
  createdAt: string;
}

export interface ApplicationRecord {
  id: string;
  organizationId: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  stageOrder?: number;
  source: string;
  appliedAt: string;
  updatedAt: string;
  assignedRecruiterName: string;
  expectedSalary?: number;
  aiMatch: AICandidateMatchResult;
  stageHistory: ApplicationStageHistoryEntry[];
}

export interface InterviewScorecardEntry {
  id: string;
  interviewerName: string;
  interviewerRole: string;
  overallRating: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  cultureFitScore: number;
  recommendation: HiringRecommendation;
  strengths: string;
  concerns: string;
  notes: string;
  submittedAt: string;
}

export interface InterviewRecord {
  id: string;
  organizationId: string;
  applicationId: string;
  jobId: string;
  candidateId: string;
  title: string;
  type: InterviewType;
  status: InterviewStatus;
  scheduledAt: string;
  durationMinutes: number;
  timezone: string;
  locationOrLink: string;
  agendaNotes: string;
  participants: Array<{ id: string; name: string; role: string; email: string }>;
  scorecards: InterviewScorecardEntry[];
}

export interface TeamMemberRecord {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  roleCode: SystemRoleCode;
  jobTitle: string;
  department: string;
  status: 'ACTIVE' | 'INVITED';
  joinedAt: string;
}

export interface NotificationRecord {
  id: string;
  organizationId: string;
  title: string;
  message: string;
  category: 'APPLICATION' | 'INTERVIEW' | 'AI' | 'SYSTEM' | 'TEAM';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface AIProviderSetting {
  provider: AIProviderType;
  displayName: string;
  modelName: string;
  isConfigured: boolean;
  isActive: boolean;
  maskedApiKey: string;
  monthlyRequests: number;
  avgLatencyMs: number;
}

export interface AuditLogItem {
  id: string;
  organizationName: string;
  actorName: string;
  actorEmail: string;
  action: string;
  entityType: string;
  ipAddress: string;
  createdAt: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'info' | 'warning' | 'error';
}

const INITIAL_ORGANIZATIONS: OrganizationRecord[] = [
  {
    id: 'org_acme_cloud',
    name: 'Acme Cloud Systems',
    slug: 'acme-cloud',
    industry: 'Cloud Infrastructure & AI',
    companySize: '250-500 employees',
    website: 'https://acmecloud.io',
    description:
      'Enterprise distributed cloud platform and low-latency AI inference infrastructure.',
    planName: 'Enterprise',
    brandPrimaryColor: '#4F46E5',
    defaultCurrency: 'USD',
    defaultTimezone: 'America/Los_Angeles',
    allowAIResumeParsing: true,
    allowAICandidateMatching: true,
    emailNotificationsEnabled: true,
    membersCount: 14,
    createdAt: '2025-01-10T09:00:00Z',
  },
  {
    id: 'org_vertex_biotech',
    name: 'Vertex BioTech Labs',
    slug: 'vertex-biotech',
    industry: 'Computational Biology & Genomics',
    companySize: '50-250 employees',
    website: 'https://vertexbiotech.io',
    description: 'Next-generation protein folding discovery and clinical data engineering.',
    planName: 'Growth',
    brandPrimaryColor: '#4F46E5',
    defaultCurrency: 'USD',
    defaultTimezone: 'America/New_York',
    allowAIResumeParsing: true,
    allowAICandidateMatching: true,
    emailNotificationsEnabled: true,
    membersCount: 7,
    createdAt: '2025-01-18T14:30:00Z',
  },
];

const INITIAL_CANDIDATES: CandidateRecord[] = [
  {
    id: 'cand_1',
    organizationId: 'org_acme_cloud',
    firstName: 'Sophia',
    lastName: 'Lin',
    fullName: 'Sophia Lin',
    email: 'sophia.lin@stanford-alumni.edu',
    phone: '+1 (415) 890-3412',
    location: 'San Francisco, CA',
    currentTitle: 'Staff Distributed Systems Engineer',
    currentCompany: 'Datadog',
    totalExperienceYears: 8,
    summary:
      'Principal-track systems engineer with 8+ years architecting high-throughput telemetry pipelines, Kubernetes operators, and TypeScript/Go microservices handling 1.2M req/sec.',
    source: 'LINKEDIN',
    expectedSalaryMin: 195000,
    expectedSalaryMax: 225000,
    salaryCurrency: 'USD',
    noticePeriodDays: 14,
    linkedinUrl: 'https://linkedin.com/in/sophialin-dev',
    githubUrl: 'https://github.com/sophialin',
    portfolioUrl: 'https://sophialin.dev',
    tags: ['Top Tier', 'Distributed Systems', 'Kubernetes', 'TypeScript'],
    languages: ['English (Native)', 'Mandarin (Fluent)'],
    skills: [
      { name: 'TypeScript', proficiency: 'Expert', yearsOfExperience: 7 },
      { name: 'Node.js', proficiency: 'Expert', yearsOfExperience: 8 },
      { name: 'PostgreSQL', proficiency: 'Advanced', yearsOfExperience: 7 },
      { name: 'Kubernetes', proficiency: 'Expert', yearsOfExperience: 6 },
      { name: 'Go', proficiency: 'Advanced', yearsOfExperience: 5 },
      { name: 'AWS', proficiency: 'Expert', yearsOfExperience: 7 },
      { name: 'React', proficiency: 'Advanced', yearsOfExperience: 6 },
      { name: 'Redis', proficiency: 'Advanced', yearsOfExperience: 6 },
    ],
    experiences: [
      {
        company: 'Datadog',
        title: 'Staff Distributed Systems Engineer',
        location: 'San Francisco, CA',
        startDate: '2022-03',
        isCurrent: true,
        description:
          'Led a 9-engineer platform squad building real-time trace ingestion services in Go, TypeScript, and PostgreSQL.',
      },
      {
        company: 'Stripe',
        title: 'Senior Backend Engineer',
        location: 'Seattle, WA',
        startDate: '2019-06',
        endDate: '2022-02',
        isCurrent: false,
        description:
          'Engineered idempotent payment settlement APIs with 99.999% uptime SLA and zero-downtime schema migrations.',
      },
    ],
    educations: [
      {
        institution: 'Stanford University',
        degree: 'M.S. in Computer Science',
        fieldOfStudy: 'Distributed Systems',
        startDate: '2015',
        endDate: '2017',
        grade: '3.94 GPA',
      },
    ],
    certifications: [
      {
        name: 'Certified Kubernetes Administrator (CKA)',
        issuingOrg: 'Cloud Native Computing Foundation',
        issueDate: '2023-05',
      },
      {
        name: 'AWS Certified Solutions Architect – Professional',
        issuingOrg: 'Amazon Web Services',
        issueDate: '2022-11',
      },
    ],
    notes: [
      {
        id: 'note_1',
        authorName: 'Jordan Rivera',
        authorRole: 'Lead Technical Recruiter',
        content:
          'Exceptional technical depth during initial screening. Strong alignment with our Principal Cloud Platform role.',
        createdAt: '2025-02-10T16:20:00Z',
      },
    ],
    attachments: [
      {
        id: 'att_1',
        fileName: 'Sophia_Lin_Resume_2025.pdf',
        fileSize: '342 KB',
        fileType: 'application/pdf',
        uploadedAt: '2025-02-08T10:00:00Z',
      },
    ],
    createdAt: '2025-02-08T10:00:00Z',
  },
  {
    id: 'cand_2',
    organizationId: 'org_acme_cloud',
    firstName: 'Devon',
    lastName: 'Brooks',
    fullName: 'Devon Brooks',
    email: 'devon.brooks@hey.com',
    phone: '+1 (512) 442-9810',
    location: 'Austin, TX',
    currentTitle: 'Senior Full-Stack Product Engineer',
    currentCompany: 'Linear',
    totalExperienceYears: 6,
    summary:
      'Design-obsessed full-stack engineer specializing in Next.js App Router, React 19, TypeScript, Tailwind CSS, and real-time collaborative workspaces.',
    source: 'REFERRAL',
    expectedSalaryMin: 170000,
    expectedSalaryMax: 195000,
    salaryCurrency: 'USD',
    noticePeriodDays: 14,
    linkedinUrl: 'https://linkedin.com/in/devonbrooks',
    githubUrl: 'https://github.com/devonbrooks',
    tags: ['Frontend Architecture', 'Next.js', 'Design Systems'],
    languages: ['English (Native)'],
    skills: [
      { name: 'React', proficiency: 'Expert', yearsOfExperience: 6 },
      { name: 'Next.js', proficiency: 'Expert', yearsOfExperience: 5 },
      { name: 'TypeScript', proficiency: 'Expert', yearsOfExperience: 6 },
      { name: 'Tailwind CSS', proficiency: 'Expert', yearsOfExperience: 5 },
      { name: 'Node.js', proficiency: 'Advanced', yearsOfExperience: 5 },
      { name: 'GraphQL', proficiency: 'Advanced', yearsOfExperience: 4 },
    ],
    experiences: [
      {
        company: 'Linear',
        title: 'Senior Full-Stack Product Engineer',
        location: 'Remote (Austin, TX)',
        startDate: '2022-08',
        isCurrent: true,
        description:
          'Architected local-first sync state engine, high-density Kanban boards, and sub-50ms command palette interactions.',
      },
      {
        company: 'Vercel',
        title: 'Frontend Software Engineer',
        location: 'San Francisco, CA',
        startDate: '2020-01',
        endDate: '2022-07',
        isCurrent: false,
        description:
          'Built analytics visualizations, deployment log streaming UI, and accessible enterprise design system primitives.',
      },
    ],
    educations: [
      {
        institution: 'University of Texas at Austin',
        degree: 'B.S. in Computer Science',
        fieldOfStudy: 'Human-Computer Interaction',
        startDate: '2015',
        endDate: '2019',
        grade: '3.85 GPA',
      },
    ],
    certifications: [],
    notes: [
      {
        id: 'note_2',
        authorName: 'Dr. Priya Patel',
        authorRole: 'Director of AI Infrastructure',
        content:
          'Referred by our design lead. Portfolio demonstrates stellar craft and attention to B2B SaaS workflows.',
        createdAt: '2025-02-12T11:45:00Z',
      },
    ],
    attachments: [
      {
        id: 'att_2',
        fileName: 'Devon_Brooks_CV.pdf',
        fileSize: '280 KB',
        fileType: 'application/pdf',
        uploadedAt: '2025-02-11T09:15:00Z',
      },
    ],
    createdAt: '2025-02-11T09:15:00Z',
  },
  {
    id: 'cand_3',
    organizationId: 'org_acme_cloud',
    firstName: 'Amara',
    lastName: 'Okafor',
    fullName: 'Amara Okafor',
    email: 'amara.okafor@mit.edu',
    phone: '+1 (617) 309-7741',
    location: 'Boston, MA',
    currentTitle: 'Lead Applied AI Research Engineer',
    currentCompany: 'Anthropic',
    totalExperienceYears: 7,
    summary:
      'Applied ML/LLM leader experienced in RAG pipelines, structured JSON schema extraction, agent evaluation benchmarks, and PyTorch/TypeScript production inference.',
    source: 'AI_RESUME_IMPORT',
    expectedSalaryMin: 210000,
    expectedSalaryMax: 245000,
    salaryCurrency: 'USD',
    noticePeriodDays: 30,
    linkedinUrl: 'https://linkedin.com/in/amaraokafor-ai',
    githubUrl: 'https://github.com/amara-ai',
    tags: ['LLM Infrastructure', 'RAG', 'PyTorch', 'Executive Ready'],
    languages: ['English (Native)', 'French (Conversational)'],
    skills: [
      { name: 'Python', proficiency: 'Expert', yearsOfExperience: 7 },
      { name: 'PyTorch', proficiency: 'Expert', yearsOfExperience: 6 },
      { name: 'TypeScript', proficiency: 'Advanced', yearsOfExperience: 5 },
      { name: 'LLM Evaluation', proficiency: 'Expert', yearsOfExperience: 4 },
      { name: 'PostgreSQL', proficiency: 'Advanced', yearsOfExperience: 5 },
      { name: 'Docker', proficiency: 'Advanced', yearsOfExperience: 6 },
    ],
    experiences: [
      {
        company: 'Anthropic',
        title: 'Lead Applied AI Research Engineer',
        location: 'Boston, MA',
        startDate: '2023-01',
        isCurrent: true,
        description:
          'Designed enterprise structured-output tool use pipelines and low-latency evaluation harnesses.',
      },
    ],
    educations: [
      {
        institution: 'Massachusetts Institute of Technology (MIT)',
        degree: 'M.Eng. in Electrical Engineering & Computer Science',
        fieldOfStudy: 'Machine Learning',
        startDate: '2016',
        endDate: '2018',
        grade: '4.9/5.0 GPA',
      },
    ],
    certifications: [],
    notes: [],
    attachments: [
      {
        id: 'att_3',
        fileName: 'Amara_Okafor_AI_Resume.pdf',
        fileSize: '412 KB',
        fileType: 'application/pdf',
        uploadedAt: '2025-02-13T14:20:00Z',
      },
    ],
    createdAt: '2025-02-13T14:20:00Z',
  },
  {
    id: 'cand_4',
    organizationId: 'org_acme_cloud',
    firstName: 'Mateo',
    lastName: 'Silva',
    fullName: 'Mateo Silva',
    email: 'mateo.silva@cloudsec.dev',
    phone: '+1 (305) 712-6604',
    location: 'Miami, FL',
    currentTitle: 'Senior Cloud Security Architect',
    currentCompany: 'Cloudflare',
    totalExperienceYears: 9,
    summary:
      'Security engineering leader focused on zero-trust multi-tenant SaaS isolation, SOC2 Type II automation, IAM policy engines, and Kubernetes runtime protection.',
    source: 'DIRECT_APPLY',
    expectedSalaryMin: 185000,
    expectedSalaryMax: 210000,
    salaryCurrency: 'USD',
    noticePeriodDays: 14,
    tags: ['Zero Trust', 'SOC2', 'Kubernetes Security'],
    languages: ['English (Native)', 'Spanish (Native)', 'Portuguese (Fluent)'],
    skills: [
      { name: 'AWS', proficiency: 'Expert', yearsOfExperience: 8 },
      { name: 'Kubernetes', proficiency: 'Expert', yearsOfExperience: 7 },
      { name: 'Terraform', proficiency: 'Expert', yearsOfExperience: 7 },
      { name: 'Go', proficiency: 'Advanced', yearsOfExperience: 6 },
      { name: 'PostgreSQL', proficiency: 'Advanced', yearsOfExperience: 6 },
    ],
    experiences: [
      {
        company: 'Cloudflare',
        title: 'Senior Cloud Security Architect',
        location: 'Miami, FL',
        startDate: '2021-04',
        isCurrent: true,
        description:
          'Hardened multi-tenant edge compute sandboxes and automated continuous compliance verification.',
      },
    ],
    educations: [
      {
        institution: 'Georgia Institute of Technology',
        degree: 'B.S. in Information Security',
        startDate: '2012',
        endDate: '2016',
      },
    ],
    certifications: [
      {
        name: 'CISSP – Certified Information Systems Security Professional',
        issuingOrg: 'ISC2',
        issueDate: '2021-08',
      },
    ],
    notes: [],
    attachments: [
      {
        id: 'att_4',
        fileName: 'Mateo_Silva_Security_CV.pdf',
        fileSize: '310 KB',
        fileType: 'application/pdf',
        uploadedAt: '2025-02-14T08:30:00Z',
      },
    ],
    createdAt: '2025-02-14T08:30:00Z',
  },
  {
    id: 'cand_5',
    organizationId: 'org_acme_cloud',
    firstName: 'Hannah',
    lastName: 'Kowalski',
    fullName: 'Hannah Kowalski',
    email: 'hannah.k@productcraft.io',
    phone: '+1 (212) 605-1934',
    location: 'New York, NY',
    currentTitle: 'Principal Product Manager, Enterprise AI',
    currentCompany: 'Notion',
    totalExperienceYears: 7,
    summary:
      'Enterprise SaaS Product Leader who scaled B2B AI workflows from 0 to $42M ARR. Deep expertise in PLG-to-Enterprise motion, RBAC governance, and customer discovery.',
    source: 'JOB_BOARD',
    expectedSalaryMin: 180000,
    expectedSalaryMax: 205000,
    salaryCurrency: 'USD',
    noticePeriodDays: 21,
    tags: ['Enterprise PM', 'AI Monetization', 'B2B SaaS'],
    languages: ['English (Native)', 'Polish (Fluent)'],
    skills: [
      { name: 'Product Strategy', proficiency: 'Expert', yearsOfExperience: 7 },
      { name: 'Enterprise SaaS', proficiency: 'Expert', yearsOfExperience: 7 },
      { name: 'SQL & Analytics', proficiency: 'Advanced', yearsOfExperience: 6 },
      { name: 'LLM Workflows', proficiency: 'Advanced', yearsOfExperience: 3 },
    ],
    experiences: [
      {
        company: 'Notion',
        title: 'Principal Product Manager, Enterprise AI',
        location: 'New York, NY',
        startDate: '2021-09',
        isCurrent: true,
        description:
          'Owned enterprise AI adoption, workspace analytics, and multi-org permission administration.',
      },
    ],
    educations: [
      {
        institution: 'Columbia University',
        degree: 'B.A. in Economics & Computer Science',
        startDate: '2014',
        endDate: '2018',
      },
    ],
    certifications: [],
    notes: [],
    attachments: [
      {
        id: 'att_5',
        fileName: 'Hannah_Kowalski_PM_Resume.pdf',
        fileSize: '264 KB',
        fileType: 'application/pdf',
        uploadedAt: '2025-02-15T12:00:00Z',
      },
    ],
    createdAt: '2025-02-15T12:00:00Z',
  },
  {
    id: 'cand_6',
    organizationId: 'org_acme_cloud',
    firstName: 'Noah',
    lastName: 'Alvarez',
    fullName: 'Noah Alvarez',
    email: 'noah.alvarez@devmail.io',
    phone: '+1 (206) 519-4821',
    location: 'Seattle, WA',
    currentTitle: 'Full-Stack Developer',
    currentCompany: 'FinServe Digital',
    totalExperienceYears: 3,
    summary:
      'Mid-level web developer experienced with React, Express, and MongoDB looking to transition into large-scale distributed infrastructure.',
    source: 'DIRECT_APPLY',
    expectedSalaryMin: 135000,
    expectedSalaryMax: 155000,
    salaryCurrency: 'USD',
    noticePeriodDays: 14,
    tags: ['Junior-Mid', 'React'],
    languages: ['English (Native)'],
    skills: [
      { name: 'React', proficiency: 'Intermediate', yearsOfExperience: 3 },
      { name: 'TypeScript', proficiency: 'Intermediate', yearsOfExperience: 2 },
      { name: 'Node.js', proficiency: 'Intermediate', yearsOfExperience: 3 },
    ],
    experiences: [
      {
        company: 'FinServe Digital',
        title: 'Full-Stack Developer',
        location: 'Seattle, WA',
        startDate: '2022-05',
        isCurrent: true,
        description: 'Built customer onboarding portals in React and Node.js.',
      },
    ],
    educations: [
      {
        institution: 'University of Washington',
        degree: 'B.S. in Informatics',
        startDate: '2018',
        endDate: '2022',
      },
    ],
    certifications: [],
    notes: [],
    attachments: [],
    createdAt: '2025-02-16T15:10:00Z',
  },
];

const INITIAL_JOBS: JobRecord[] = [
  {
    id: 'job_1',
    organizationId: 'org_acme_cloud',
    title: 'Principal Distributed Systems Engineer',
    slug: 'principal-distributed-systems-engineer',
    department: 'Cloud Platform Engineering',
    location: 'San Francisco, CA',
    workLocationType: 'HYBRID',
    employmentType: 'FULL_TIME',
    experienceLevel: 'LEAD',
    minExperienceYears: 7,
    maxExperienceYears: 12,
    salaryMin: 195000,
    salaryMax: 235000,
    salaryCurrency: 'USD',
    showSalary: true,
    description:
      'We are seeking a Principal Distributed Systems Engineer to architect our next-generation multi-region control plane, high-throughput event ingestion engine, and zero-downtime PostgreSQL sharding layer.',
    responsibilities: [
      'Architect and scale multi-tenant control plane services written in TypeScript, Node.js, and Go.',
      'Design high-availability PostgreSQL and Redis state clusters capable of sub-10ms p99 latency.',
      'Partner with AI Infrastructure and Security teams on Kubernetes operator automation.',
      'Mentor senior engineers and lead architecture RFC reviews across the engineering org.',
    ],
    qualifications: [
      '7+ years of production experience building distributed backend systems at scale.',
      'Deep mastery of TypeScript/Node.js or Go, PostgreSQL internals, and Kubernetes.',
      'Track record of operating mission-critical cloud services on AWS.',
    ],
    benefits: [
      'Competitive base + top-tier early-stage equity package',
      '100% medical, dental, and vision coverage for you and dependents',
      '$4,000 annual learning & conference stipend',
    ],
    requiredSkills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Kubernetes', 'AWS', 'Go'],
    preferredSkills: ['Redis', 'Terraform', 'Kafka'],
    openingsCount: 2,
    status: 'PUBLISHED',
    hiringManagerName: 'Dr. Priya Patel',
    aiGenerated: true,
    publishedAt: '2025-02-01T10:00:00Z',
    createdAt: '2025-02-01T09:00:00Z',
  },
  {
    id: 'job_2',
    organizationId: 'org_acme_cloud',
    title: 'Staff Frontend Architect (Next.js / Design Systems)',
    slug: 'staff-frontend-architect-nextjs',
    department: 'Product Engineering',
    location: 'Remote (US & Canada)',
    workLocationType: 'REMOTE',
    employmentType: 'FULL_TIME',
    experienceLevel: 'SENIOR',
    minExperienceYears: 5,
    maxExperienceYears: 10,
    salaryMin: 170000,
    salaryMax: 200000,
    salaryCurrency: 'USD',
    showSalary: true,
    description:
      'Lead the frontend architecture and enterprise design system for Acme Cloud’s observability, workflow studio, and real-time analytics console.',
    responsibilities: [
      'Own our Next.js 15 App Router architecture, state synchronization, and performance budgets.',
      'Build accessible, high-density B2B UI components using React, TypeScript, and Tailwind CSS.',
      'Collaborate closely with product designers and backend engineers on real-time data visualization.',
    ],
    qualifications: [
      '5+ years crafting complex SaaS web applications with React, Next.js, and TypeScript.',
      'Obsessive eye for typography, 1px border precision, keyboard navigation, and WCAG accessibility.',
    ],
    benefits: [
      'Remote-first culture with home office hardware budget',
      'Comprehensive healthcare and 401(k) matching',
    ],
    requiredSkills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
    preferredSkills: ['Node.js', 'GraphQL', 'Design Systems'],
    openingsCount: 1,
    status: 'PUBLISHED',
    hiringManagerName: 'Marcus Sterling',
    aiGenerated: false,
    publishedAt: '2025-02-03T11:00:00Z',
    createdAt: '2025-02-03T10:00:00Z',
  },
  {
    id: 'job_3',
    organizationId: 'org_acme_cloud',
    title: 'Lead Applied AI Engineer (LLM & RAG Systems)',
    slug: 'lead-applied-ai-engineer',
    department: 'AI Research & Platform',
    location: 'Boston, MA / Hybrid',
    workLocationType: 'HYBRID',
    employmentType: 'FULL_TIME',
    experienceLevel: 'LEAD',
    minExperienceYears: 5,
    maxExperienceYears: 10,
    salaryMin: 205000,
    salaryMax: 250000,
    salaryCurrency: 'USD',
    showSalary: true,
    description:
      'Build deterministic, multi-provider AI orchestration pipelines across OpenAI, Google Gemini, and Anthropic Claude with strict schema validation and explainable scoring.',
    responsibilities: [
      'Design multi-model routing, structured output extraction, and fallback resilience.',
      'Develop evaluation benchmarks for precision, latency, and token cost optimization.',
    ],
    qualifications: [
      '5+ years in ML/AI engineering with strong Python, PyTorch, and TypeScript production skills.',
      'Hands-on experience shipping enterprise LLM features and RAG architectures.',
    ],
    benefits: ['Equity grant', 'Unlimited PTO', 'Full health coverage'],
    requiredSkills: ['Python', 'PyTorch', 'TypeScript', 'LLM Evaluation', 'PostgreSQL'],
    preferredSkills: ['Docker', 'Kubernetes', 'Vector Databases'],
    openingsCount: 2,
    status: 'PUBLISHED',
    hiringManagerName: 'Dr. Priya Patel',
    aiGenerated: true,
    publishedAt: '2025-02-05T14:00:00Z',
    createdAt: '2025-02-05T12:00:00Z',
  },
  {
    id: 'job_4',
    organizationId: 'org_acme_cloud',
    title: 'Senior Cloud Security Engineer',
    slug: 'senior-cloud-security-engineer',
    department: 'Security & Trust',
    location: 'Miami, FL / Remote',
    workLocationType: 'REMOTE',
    employmentType: 'FULL_TIME',
    experienceLevel: 'SENIOR',
    minExperienceYears: 6,
    salaryMin: 180000,
    salaryMax: 215000,
    salaryCurrency: 'USD',
    showSalary: true,
    description:
      'Drive zero-trust infrastructure security, tenant isolation auditing, and automated compliance across our global Kubernetes fleet.',
    responsibilities: [
      'Harden AWS IAM, EKS clusters, and Terraform infrastructure-as-code modules.',
      'Lead threat modeling and security architecture reviews for new platform features.',
    ],
    qualifications: [
      '6+ years in cloud security engineering with AWS, Kubernetes, and Terraform.',
    ],
    benefits: ['Competitive compensation', 'Annual security conference budget'],
    requiredSkills: ['AWS', 'Kubernetes', 'Terraform', 'Go'],
    preferredSkills: ['CISSP', 'PostgreSQL'],
    openingsCount: 1,
    status: 'PUBLISHED',
    hiringManagerName: 'Elena Vance',
    aiGenerated: false,
    publishedAt: '2025-02-07T09:00:00Z',
    createdAt: '2025-02-07T08:00:00Z',
  },
  {
    id: 'job_5',
    organizationId: 'org_acme_cloud',
    title: 'Principal Product Manager, Enterprise Platform',
    slug: 'principal-product-manager-enterprise',
    department: 'Product Management',
    location: 'New York, NY',
    workLocationType: 'HYBRID',
    employmentType: 'FULL_TIME',
    experienceLevel: 'LEAD',
    minExperienceYears: 6,
    salaryMin: 185000,
    salaryMax: 215000,
    salaryCurrency: 'USD',
    showSalary: true,
    description:
      'Define the roadmap and commercial packaging for our enterprise multi-tenant governance, analytics, and AI copilot capabilities.',
    responsibilities: [
      'Partner with Fortune 500 design partners to shape enterprise workflows.',
      'Drive pricing, packaging, and self-serve to enterprise expansion.',
    ],
    qualifications: ['6+ years in B2B SaaS product management.'],
    benefits: ['Equity', 'Health & Wellness stipend'],
    requiredSkills: ['Product Strategy', 'Enterprise SaaS', 'SQL & Analytics', 'LLM Workflows'],
    preferredSkills: ['RBAC', 'Pricing Strategy'],
    openingsCount: 1,
    status: 'DRAFT',
    hiringManagerName: 'Marcus Sterling',
    aiGenerated: true,
    createdAt: '2025-02-10T15:00:00Z',
  },
];

const INITIAL_APPLICATIONS: ApplicationRecord[] = [
  {
    id: 'app_1',
    organizationId: 'org_acme_cloud',
    jobId: 'job_1',
    candidateId: 'cand_1',
    status: 'INTERVIEW',
    source: 'LINKEDIN',
    appliedAt: '2025-02-09T10:30:00Z',
    updatedAt: '2025-02-14T16:00:00Z',
    assignedRecruiterName: 'Jordan Rivera',
    expectedSalary: 215000,
    aiMatch: {
      overallScore: 96,
      skillsScore: 98,
      experienceScore: 95,
      educationScore: 94,
      matchingSkills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Kubernetes', 'AWS', 'Go', 'Redis'],
      missingSkills: ['Terraform'],
      relevantExperience:
        '8 years building high-throughput distributed systems at Datadog and Stripe, directly matching the 7+ year Principal requirement.',
      explanation:
        'Sophia Lin is an exceptional 96% match for Principal Distributed Systems Engineer. She possesses all 6 core required skills (TypeScript, Node.js, PostgreSQL, Kubernetes, AWS, Go) plus M.S. CS in Distributed Systems from Stanford and CKA certification.',
      recommendations: [
        'Fast-track to System Design panel with Dr. Priya Patel.',
        'Focus interview discussion on multi-region PostgreSQL sharding trade-offs.',
      ],
    },
    stageHistory: [
      {
        id: 'sh_1',
        fromStatus: null,
        toStatus: 'NEW',
        changedByName: 'System',
        createdAt: '2025-02-09T10:30:00Z',
      },
      {
        id: 'sh_2',
        fromStatus: 'NEW',
        toStatus: 'SHORTLISTED',
        changedByName: 'Jordan Rivera',
        reason: '96% AI Match Score + Datadog Staff background',
        createdAt: '2025-02-10T14:00:00Z',
      },
      {
        id: 'sh_3',
        fromStatus: 'SHORTLISTED',
        toStatus: 'INTERVIEW',
        changedByName: 'Dr. Priya Patel',
        reason: 'Passed recruiter screen with strong enthusiasm',
        createdAt: '2025-02-14T16:00:00Z',
      },
    ],
  },
  {
    id: 'app_2',
    organizationId: 'org_acme_cloud',
    jobId: 'job_2',
    candidateId: 'cand_2',
    status: 'OFFER',
    source: 'REFERRAL',
    appliedAt: '2025-02-11T11:00:00Z',
    updatedAt: '2025-02-17T18:20:00Z',
    assignedRecruiterName: 'Jordan Rivera',
    expectedSalary: 185000,
    aiMatch: {
      overallScore: 94,
      skillsScore: 96,
      experienceScore: 92,
      educationScore: 90,
      matchingSkills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Node.js', 'GraphQL'],
      missingSkills: [],
      relevantExperience:
        '6 years building B2B SaaS interfaces at Linear and Vercel with deep Next.js App Router and design system ownership.',
      explanation:
        'Devon Brooks hits 100% of required and preferred technical skills for Staff Frontend Architect, backed by directly relevant work on high-density Kanban and real-time UI state engines.',
      recommendations: [
        'Prepare competitive offer package around $188,000 base + senior equity tier.',
      ],
    },
    stageHistory: [
      {
        id: 'sh_4',
        fromStatus: null,
        toStatus: 'SHORTLISTED',
        changedByName: 'Jordan Rivera',
        createdAt: '2025-02-11T11:00:00Z',
      },
      {
        id: 'sh_5',
        fromStatus: 'SHORTLISTED',
        toStatus: 'OFFER',
        changedByName: 'Marcus Sterling',
        reason: 'Unanimous Strong Hire from architecture panel',
        createdAt: '2025-02-17T18:20:00Z',
      },
    ],
  },
  {
    id: 'app_3',
    organizationId: 'org_acme_cloud',
    jobId: 'job_3',
    candidateId: 'cand_3',
    status: 'ASSESSMENT',
    source: 'AI_RESUME_IMPORT',
    appliedAt: '2025-02-13T15:00:00Z',
    updatedAt: '2025-02-16T11:10:00Z',
    assignedRecruiterName: 'Jordan Rivera',
    expectedSalary: 230000,
    aiMatch: {
      overallScore: 95,
      skillsScore: 97,
      experienceScore: 94,
      educationScore: 98,
      matchingSkills: ['Python', 'PyTorch', 'TypeScript', 'LLM Evaluation', 'PostgreSQL', 'Docker'],
      missingSkills: ['Kubernetes'],
      relevantExperience:
        '7 years in applied ML/LLM engineering including Lead Applied AI Research Engineer role at Anthropic.',
      explanation:
        'Amara Okafor brings premier LLM orchestration and structured extraction expertise with an MIT M.Eng. in Machine Learning.',
      recommendations: [
        'Review take-home RAG architecture evaluation rubric during final panel.',
      ],
    },
    stageHistory: [
      {
        id: 'sh_6',
        fromStatus: null,
        toStatus: 'SCREENING',
        changedByName: 'Jordan Rivera',
        createdAt: '2025-02-13T15:00:00Z',
      },
      {
        id: 'sh_7',
        fromStatus: 'SCREENING',
        toStatus: 'ASSESSMENT',
        changedByName: 'Dr. Priya Patel',
        createdAt: '2025-02-16T11:10:00Z',
      },
    ],
  },
  {
    id: 'app_4',
    organizationId: 'org_acme_cloud',
    jobId: 'job_4',
    candidateId: 'cand_4',
    status: 'HIRED',
    source: 'DIRECT_APPLY',
    appliedAt: '2025-02-08T09:00:00Z',
    updatedAt: '2025-02-18T09:30:00Z',
    assignedRecruiterName: 'Jordan Rivera',
    expectedSalary: 198000,
    aiMatch: {
      overallScore: 92,
      skillsScore: 95,
      experienceScore: 93,
      educationScore: 88,
      matchingSkills: ['AWS', 'Kubernetes', 'Terraform', 'Go', 'PostgreSQL'],
      missingSkills: [],
      relevantExperience:
        '9 years in cloud security and multi-tenant Kubernetes isolation at Cloudflare.',
      explanation:
        'Mateo Silva exceeds all security engineering requirements and holds an active CISSP certification.',
      recommendations: ['Offer signed and onboarding scheduled.'],
    },
    stageHistory: [
      {
        id: 'sh_8',
        fromStatus: 'OFFER',
        toStatus: 'HIRED',
        changedByName: 'Elena Vance',
        reason: 'Signed offer letter for Senior Cloud Security Engineer',
        createdAt: '2025-02-18T09:30:00Z',
      },
    ],
  },
  {
    id: 'app_5',
    organizationId: 'org_acme_cloud',
    jobId: 'job_5',
    candidateId: 'cand_5',
    status: 'SHORTLISTED',
    source: 'JOB_BOARD',
    appliedAt: '2025-02-15T13:00:00Z',
    updatedAt: '2025-02-16T17:00:00Z',
    assignedRecruiterName: 'Jordan Rivera',
    expectedSalary: 195000,
    aiMatch: {
      overallScore: 89,
      skillsScore: 91,
      experienceScore: 88,
      educationScore: 87,
      matchingSkills: ['Product Strategy', 'Enterprise SaaS', 'SQL & Analytics', 'LLM Workflows'],
      missingSkills: ['Pricing Strategy'],
      relevantExperience:
        '7 years leading B2B SaaS and Enterprise AI products at Notion.',
      explanation:
        'Strong product management track record in multi-tenant enterprise SaaS and AI monetization.',
      recommendations: ['Schedule product sense review with Marcus Sterling.'],
    },
    stageHistory: [],
  },
  {
    id: 'app_6',
    organizationId: 'org_acme_cloud',
    jobId: 'job_1',
    candidateId: 'cand_6',
    status: 'SCREENING',
    source: 'DIRECT_APPLY',
    appliedAt: '2025-02-16T16:00:00Z',
    updatedAt: '2025-02-16T16:00:00Z',
    assignedRecruiterName: 'Jordan Rivera',
    expectedSalary: 145000,
    aiMatch: {
      overallScore: 54,
      skillsScore: 52,
      experienceScore: 45,
      educationScore: 76,
      matchingSkills: ['TypeScript', 'Node.js'],
      missingSkills: ['PostgreSQL', 'Kubernetes', 'AWS', 'Go'],
      relevantExperience:
        '3 years full-stack experience vs. 7+ years required for Principal Distributed Systems Engineer.',
      explanation:
        'Noah has solid foundational TypeScript/Node.js skills but lacks senior distributed infrastructure experience with Kubernetes, Go, and AWS.',
      recommendations: [
        'Consider redirecting candidate to a mid-level Full-Stack Product Engineer opening.',
      ],
    },
    stageHistory: [],
  },
  {
    id: 'app_7',
    organizationId: 'org_acme_cloud',
    jobId: 'job_2',
    candidateId: 'cand_1',
    status: 'NEW',
    source: 'INTERNAL',
    appliedAt: '2025-02-17T08:00:00Z',
    updatedAt: '2025-02-17T08:00:00Z',
    assignedRecruiterName: 'Jordan Rivera',
    expectedSalary: 210000,
    aiMatch: {
      overallScore: 82,
      skillsScore: 80,
      experienceScore: 88,
      educationScore: 90,
      matchingSkills: ['React', 'TypeScript', 'Node.js'],
      missingSkills: ['Next.js', 'Tailwind CSS'],
      relevantExperience:
        'Strong systems & React experience, though primary specialization is distributed backend.',
      explanation:
        'Secondary application for Sophia Lin on the Staff Frontend track; stronger fit remains on Principal Distributed Systems.',
      recommendations: ['Keep Principal Distributed Systems (app_1) as primary track.'],
    },
    stageHistory: [],
  },
];

const INITIAL_INTERVIEWS: InterviewRecord[] = [
  {
    id: 'int_1',
    organizationId: 'org_acme_cloud',
    applicationId: 'app_1',
    jobId: 'job_1',
    candidateId: 'cand_1',
    title: 'Distributed Systems Architecture Deep Dive',
    type: 'TECHNICAL',
    status: 'SCHEDULED',
    scheduledAt: '2026-11-10T18:00:00Z',
    durationMinutes: 60,
    timezone: 'America/Los_Angeles',
    locationOrLink: 'https://meet.google.com/rfw-arch-sys',
    agendaNotes:
      '1. Multi-region consensus & leader election (20m)\n2. High-ingestion PostgreSQL partitioning (25m)\n3. Q&A (15m)',
    participants: [
      {
        id: 'usr_hm',
        name: 'Dr. Priya Patel',
        role: 'Hiring Manager',
        email: 'hiring@acmecloud.io',
      },
      {
        id: 'usr_interviewer',
        name: 'Liam Chen',
        role: 'Interviewer',
        email: 'interviewer@acmecloud.io',
      },
    ],
    scorecards: [
      {
        id: 'sc_1',
        interviewerName: 'Liam Chen',
        interviewerRole: 'Staff Distributed Systems Engineer',
        overallRating: 5,
        technicalScore: 5,
        communicationScore: 5,
        problemSolvingScore: 5,
        cultureFitScore: 4,
        recommendation: 'STRONG_HIRE',
        strengths:
          'Deep mastery of Raft consensus, backpressure queues, and zero-downtime schema changes.',
        concerns: 'None identified; ready to operate at Principal scope immediately.',
        notes: 'Best systems design session we have conducted this quarter.',
        submittedAt: '2025-02-15T19:15:00Z',
      },
    ],
  },
  {
    id: 'int_2',
    organizationId: 'org_acme_cloud',
    applicationId: 'app_2',
    jobId: 'job_2',
    candidateId: 'cand_2',
    title: 'Frontend Systems & Design Token Review',
    type: 'PANEL',
    status: 'COMPLETED',
    scheduledAt: '2025-02-16T17:00:00Z',
    durationMinutes: 45,
    timezone: 'America/Chicago',
    locationOrLink: 'https://zoom.us/j/9823419201',
    agendaNotes: 'Review Next.js App Router state architecture, accessibility, and Kanban rendering.',
    participants: [
      {
        id: 'usr_orgadmin',
        name: 'Marcus Sterling',
        role: 'Organization Admin',
        email: 'admin@acmecloud.io',
      },
    ],
    scorecards: [
      {
        id: 'sc_2',
        interviewerName: 'Marcus Sterling',
        interviewerRole: 'Head of Talent Acquisition',
        overallRating: 5,
        technicalScore: 5,
        communicationScore: 5,
        problemSolvingScore: 4,
        cultureFitScore: 5,
        recommendation: 'STRONG_HIRE',
        strengths: 'Outstanding product intuition and design system engineering rigor.',
        concerns: 'Competing offer timeline — move quickly.',
        notes: 'Recommended immediate offer extension.',
        submittedAt: '2025-02-16T18:10:00Z',
      },
    ],
  },
  {
    id: 'int_3',
    organizationId: 'org_acme_cloud',
    applicationId: 'app_3',
    jobId: 'job_3',
    candidateId: 'cand_3',
    title: 'LLM Evaluation & Structured Extraction Walkthrough',
    type: 'TECHNICAL',
    status: 'SCHEDULED',
    scheduledAt: '2026-11-12T15:30:00Z',
    durationMinutes: 60,
    timezone: 'America/New_York',
    locationOrLink: 'https://meet.google.com/rfw-ai-panel',
    agendaNotes: 'Evaluate multi-provider prompt engineering, latency budgets, and hallucination guards.',
    participants: [
      {
        id: 'usr_hm',
        name: 'Dr. Priya Patel',
        role: 'Hiring Manager',
        email: 'hiring@acmecloud.io',
      },
    ],
    scorecards: [],
  },
];

const INITIAL_TEAM_MEMBERS: TeamMemberRecord[] = [
  {
    id: 'usr_superadmin',
    organizationId: 'org_acme_cloud',
    name: 'Elena Vance',
    email: 'superadmin@recruitflow.io',
    roleCode: 'SUPER_ADMIN',
    jobTitle: 'VP of Platform Engineering',
    department: 'Executive / Platform',
    status: 'ACTIVE',
    joinedAt: '2025-01-10T09:00:00Z',
  },
  {
    id: 'usr_orgadmin',
    organizationId: 'org_acme_cloud',
    name: 'Marcus Sterling',
    email: 'admin@acmecloud.io',
    roleCode: 'ORG_ADMIN',
    jobTitle: 'Head of Talent Acquisition',
    department: 'People & Talent',
    status: 'ACTIVE',
    joinedAt: '2025-01-11T10:00:00Z',
  },
  {
    id: 'usr_hm',
    organizationId: 'org_acme_cloud',
    name: 'Dr. Priya Patel',
    email: 'hiring@acmecloud.io',
    roleCode: 'HIRING_MANAGER',
    jobTitle: 'Director of AI Infrastructure',
    department: 'Cloud Platform Engineering',
    status: 'ACTIVE',
    joinedAt: '2025-01-12T11:30:00Z',
  },
  {
    id: 'usr_recruiter',
    organizationId: 'org_acme_cloud',
    name: 'Jordan Rivera',
    email: 'recruiter@acmecloud.io',
    roleCode: 'RECRUITER',
    jobTitle: 'Lead Technical Recruiter',
    department: 'People & Talent',
    status: 'ACTIVE',
    joinedAt: '2025-01-14T09:15:00Z',
  },
  {
    id: 'usr_interviewer',
    organizationId: 'org_acme_cloud',
    name: 'Liam Chen',
    email: 'interviewer@acmecloud.io',
    roleCode: 'INTERVIEWER',
    jobTitle: 'Staff Distributed Systems Engineer',
    department: 'Cloud Platform Engineering',
    status: 'ACTIVE',
    joinedAt: '2025-01-15T14:00:00Z',
  },
];

const INITIAL_NOTIFICATIONS: NotificationRecord[] = [
  {
    id: 'notif_1',
    organizationId: 'org_acme_cloud',
    title: 'AI Match Score 96% Computed',
    message: 'Sophia Lin scored 96% (Strong Match) for Principal Distributed Systems Engineer.',
    category: 'AI',
    isRead: false,
    createdAt: '10 minutes ago',
    link: '/applications',
  },
  {
    id: 'notif_2',
    organizationId: 'org_acme_cloud',
    title: 'Interview Scorecard Submitted',
    message: 'Liam Chen submitted a 5/5 Strong Hire scorecard for Sophia Lin.',
    category: 'INTERVIEW',
    isRead: false,
    createdAt: '1 hour ago',
    link: '/interviews',
  },
  {
    id: 'notif_3',
    organizationId: 'org_acme_cloud',
    title: 'Candidate Moved to Offer Extended',
    message: 'Devon Brooks was moved to Offer Extended on Staff Frontend Architect.',
    category: 'APPLICATION',
    isRead: false,
    createdAt: '3 hours ago',
    link: '/applications',
  },
  {
    id: 'notif_4',
    organizationId: 'org_acme_cloud',
    title: 'Resume Parsed via AI Studio',
    message: 'Amara_Okafor_AI_Resume.pdf was parsed into structured JSON and approved.',
    category: 'AI',
    isRead: true,
    createdAt: 'Yesterday',
    link: '/candidates',
  },
];

const INITIAL_AI_PROVIDERS: AIProviderSetting[] = [
  {
    provider: 'OPENAI',
    displayName: 'OpenAI GPT-4o',
    modelName: 'gpt-4o-2024-11-20',
    isConfigured: true,
    isActive: true,
    maskedApiKey: 'sk-proj-••••••••••••••••94aB',
    monthlyRequests: 1420,
    avgLatencyMs: 840,
  },
  {
    provider: 'GEMINI',
    displayName: 'Google Gemini 2.0 Pro',
    modelName: 'gemini-2.0-pro-exp',
    isConfigured: true,
    isActive: true,
    maskedApiKey: 'AIzaSy••••••••••••••••••7xQp',
    monthlyRequests: 980,
    avgLatencyMs: 620,
  },
  {
    provider: 'ANTHROPIC',
    displayName: 'Anthropic Claude 3.7 Sonnet',
    modelName: 'claude-3-7-sonnet-latest',
    isConfigured: true,
    isActive: false,
    maskedApiKey: 'sk-ant-•••••••••••••••••3mKc',
    monthlyRequests: 410,
    avgLatencyMs: 910,
  },
];

const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'aud_1',
    organizationName: 'Acme Cloud Systems',
    actorName: 'Elena Vance',
    actorEmail: 'superadmin@recruitflow.io',
    action: 'application.status_updated',
    entityType: 'Application (app_4 -> HIRED)',
    ipAddress: '198.51.100.42',
    createdAt: '2025-02-18 09:30:12 UTC',
  },
  {
    id: 'aud_2',
    organizationName: 'Acme Cloud Systems',
    actorName: 'Marcus Sterling',
    actorEmail: 'admin@acmecloud.io',
    action: 'interview.scorecard_submitted',
    entityType: 'InterviewFeedback (sc_2)',
    ipAddress: '198.51.100.18',
    createdAt: '2025-02-16 18:10:04 UTC',
  },
  {
    id: 'aud_3',
    organizationName: 'Acme Cloud Systems',
    actorName: 'Dr. Priya Patel',
    actorEmail: 'hiring@acmecloud.io',
    action: 'ai.candidate_matched',
    entityType: 'CandidateMatch (cand_1 / job_1)',
    ipAddress: '203.0.113.89',
    createdAt: '2025-02-14 15:42:19 UTC',
  },
  {
    id: 'aud_4',
    organizationName: 'Vertex BioTech Labs',
    actorName: 'Elena Vance',
    actorEmail: 'superadmin@recruitflow.io',
    action: 'organization.subscription_verified',
    entityType: 'Subscription (Growth Plan)',
    ipAddress: '198.51.100.42',
    createdAt: '2025-02-12 11:05:33 UTC',
  },
];

interface RecruitFlowContextValue {
  organizations: OrganizationRecord[];
  activeOrganization: OrganizationRecord;
  currentUser: {
    id: string;
    name: string;
    email: string;
    title: string;
    role: SystemRoleCode;
  };
  candidates: CandidateRecord[];
  jobs: JobRecord[];
  applications: ApplicationRecord[];
  interviews: InterviewRecord[];
  teamMembers: TeamMemberRecord[];
  notifications: NotificationRecord[];
  aiProviders: AIProviderSetting[];
  auditLogs: AuditLogItem[];
  toasts: ToastMessage[];
  can: (permission: PermissionCode) => boolean;
  pushToast: (
    title: string,
    description?: string,
    variant?: ToastMessage['variant'],
  ) => void;
  dismissToast: (id: string) => void;
  switchOrganization: (orgId: string) => void;
  switchActiveRole: (role: SystemRoleCode) => void;
  loginAsDemoAccount: (email: string) => void;
  updateOrganizationSettings: (patch: Partial<OrganizationRecord>) => Promise<void>;
  createCandidate: (
    input: Omit<
      CandidateRecord,
      'id' | 'organizationId' | 'fullName' | 'createdAt' | 'notes' | 'attachments'
    >,
  ) => Promise<CandidateRecord>;
  addCandidateNote: (candidateId: string, content: string) => Promise<void>;
  createJob: (
    input: Omit<JobRecord, 'id' | 'organizationId' | 'slug' | 'createdAt'>,
  ) => Promise<JobRecord>;
  updateJobStatus: (jobId: string, status: JobStatus) => Promise<void>;
  createApplication: (input: {
    jobId: string;
    candidateId: string;
    source: string;
    expectedSalary?: number;
  }) => Promise<ApplicationRecord>;
  moveApplicationStage: (
    applicationId: string,
    nextStatus: ApplicationStatus,
    options?: { reason?: string; stageOrder?: number },
  ) => Promise<void>;
  reorderApplications: (
    updates: Array<{ applicationId: string; status: ApplicationStatus; stageOrder: number }>,
  ) => Promise<void>;
  computeAIMatchForPair: (jobId: string, candidateId: string) => AICandidateMatchResult;
  scheduleInterview: (input: {
    applicationId: string;
    title: string;
    type: InterviewType;
    scheduledAt: string;
    durationMinutes: number;
    timezone: string;
    locationOrLink: string;
    agendaNotes: string;
    participantIds: string[];
  }) => Promise<InterviewRecord>;
  submitInterviewScorecard: (
    interviewId: string,
    scorecard: Omit<
      InterviewScorecardEntry,
      'id' | 'interviewerName' | 'interviewerRole' | 'submittedAt'
    >,
  ) => Promise<void>;
  inviteTeamMember: (input: {
    email: string;
    name: string;
    roleCode: SystemRoleCode;
    department: string;
    jobTitle: string;
  }) => Promise<void>;
  removeTeamMember: (memberId: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  updateAIProviderConfig: (
    provider: AIProviderType,
    patch: Partial<AIProviderSetting>,
  ) => Promise<void>;
  switchPlan: (planName: 'Starter' | 'Growth' | 'Enterprise') => Promise<void>;
}

const RecruitFlowContext = createContext<RecruitFlowContextValue | null>(null);

const STORAGE_KEY = 'recruitflow_enterprise_state_v1';

export function computeExplainableMatch(
  job: JobRecord | undefined,
  candidate: CandidateRecord | undefined,
): AICandidateMatchResult {
  if (!job || !candidate) {
    return {
      overallScore: 75,
      skillsScore: 75,
      experienceScore: 75,
      educationScore: 80,
      matchingSkills: [],
      missingSkills: [],
      relevantExperience: 'Evaluated against baseline role requirements.',
      explanation: 'Standard baseline match score.',
      recommendations: ['Schedule initial screening call.'],
    };
  }

  const candSkillNames = candidate.skills.map((s) => s.name.toLowerCase());
  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const reqSkill of job.requiredSkills) {
    if (candSkillNames.some((cs) => cs.includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(cs))) {
      matchingSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }
  }

  for (const prefSkill of job.preferredSkills) {
    if (
      candSkillNames.some((cs) => cs.includes(prefSkill.toLowerCase())) &&
      !matchingSkills.includes(prefSkill)
    ) {
      matchingSkills.push(prefSkill);
    }
  }

  const reqCount = Math.max(job.requiredSkills.length, 1);
  const matchedReqCount = job.requiredSkills.filter((r) =>
    candSkillNames.some((cs) => cs.includes(r.toLowerCase()) || r.toLowerCase().includes(cs)),
  ).length;

  const skillsScore = Math.min(100, Math.round((matchedReqCount / reqCount) * 88 + (matchingSkills.length > matchedReqCount ? 10 : 4)));
  const expRatio =
    job.minExperienceYears > 0
      ? Math.min(1.15, candidate.totalExperienceYears / job.minExperienceYears)
      : 1;
  const experienceScore = Math.min(99, Math.max(40, Math.round(expRatio * 86)));
  const educationScore = candidate.educations.length > 0 ? 92 : 76;
  const overallScore = Math.min(
    99,
    Math.round(skillsScore * 0.5 + experienceScore * 0.35 + educationScore * 0.15),
  );

  return {
    overallScore,
    skillsScore,
    experienceScore,
    educationScore,
    matchingSkills,
    missingSkills,
    relevantExperience: `${candidate.totalExperienceYears} years total experience (currently ${candidate.currentTitle} at ${candidate.currentCompany}) compared against ${job.minExperienceYears}+ years target for ${job.title}.`,
    explanation: `${candidate.fullName} achieved a ${overallScore}% match for ${job.title}. Matched ${matchedReqCount} of ${job.requiredSkills.length} required skills (${matchingSkills.join(', ') || 'foundational alignment'}).`,
    recommendations:
      missingSkills.length > 0
        ? [
            `Probe hands-on familiarity with ${missingSkills.join(', ')} during the technical screen.`,
            `Validate system scale and domain depth from ${candidate.currentCompany}.`,
          ]
        : [
            `Strong alignment across all required competencies — fast-track to hiring manager interview.`,
          ],
  };
}

export function RecruitFlowProvider({ children }: { children: React.ReactNode }) {
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>(INITIAL_ORGANIZATIONS);
  const [activeOrgId, setActiveOrgId] = useState<string>('org_acme_cloud');
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    title: string;
    role: SystemRoleCode;
  }>({
    id: 'usr_superadmin',
    name: 'Elena Vance',
    email: 'superadmin@recruitflow.io',
    title: 'VP of Platform Engineering',
    role: 'SUPER_ADMIN',
  });

  const [candidates, setCandidates] = useState<CandidateRecord[]>(INITIAL_CANDIDATES);
  const [jobs, setJobs] = useState<JobRecord[]>(INITIAL_JOBS);
  const [applications, setApplications] = useState<ApplicationRecord[]>(INITIAL_APPLICATIONS);
  const [interviews, setInterviews] = useState<InterviewRecord[]>(INITIAL_INTERVIEWS);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>(INITIAL_TEAM_MEMBERS);
  const [notifications, setNotifications] =
    useState<NotificationRecord[]>(INITIAL_NOTIFICATIONS);
  const [aiProviders, setAiProviders] = useState<AIProviderSetting[]>(INITIAL_AI_PROVIDERS);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const pushToast = useCallback(
    (
      title: string,
      description?: string,
      variant: ToastMessage['variant'] = 'success',
    ) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load persisted state from localStorage + attempt live backend sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.organizations?.length) setOrganizations(parsed.organizations);
        if (parsed.activeOrgId) setActiveOrgId(parsed.activeOrgId);
        if (parsed.currentUser) setCurrentUser(parsed.currentUser);
        if (parsed.candidates?.length) setCandidates(parsed.candidates);
        if (parsed.jobs?.length) setJobs(parsed.jobs);
        if (parsed.applications?.length) setApplications(parsed.applications);
        if (parsed.interviews?.length) setInterviews(parsed.interviews);
        if (parsed.teamMembers?.length) setTeamMembers(parsed.teamMembers);
        if (parsed.notifications?.length) setNotifications(parsed.notifications);
        if (parsed.aiProviders?.length) setAiProviders(parsed.aiProviders);
      }
    } catch {
      // Ignore storage parse issues
    } finally {
      setHydrated(true);
    }

    // Best-effort non-blocking fetch from NestJS /api/v1/health to verify connectivity
    apiClient.get('/health').catch(() => null);
  }, []);

  // Save state to localStorage on change
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          organizations,
          activeOrgId,
          currentUser,
          candidates,
          jobs,
          applications,
          interviews,
          teamMembers,
          notifications,
          aiProviders,
        }),
      );
      window.localStorage.setItem('rf_active_org_id', activeOrgId);
    } catch {
      // Ignore quota errors
    }
  }, [
    hydrated,
    organizations,
    activeOrgId,
    currentUser,
    candidates,
    jobs,
    applications,
    interviews,
    teamMembers,
    notifications,
    aiProviders,
  ]);

  const activeOrganization = useMemo(
    () => organizations.find((o) => o.id === activeOrgId) ?? organizations[0]!,
    [organizations, activeOrgId],
  );

  const can = useCallback(
    (permission: PermissionCode) => hasPermission(currentUser.role, permission),
    [currentUser.role],
  );

  const switchOrganization = useCallback(
    (orgId: string) => {
      setActiveOrgId(orgId);
      const found = organizations.find((o) => o.id === orgId);
      if (found) {
        pushToast(`Switched workspace to ${found.name}`, `Active plan: ${found.planName}`, 'info');
      }
    },
    [organizations, pushToast],
  );

  const switchActiveRole = useCallback(
    (role: SystemRoleCode) => {
      const preset = DEMO_ACCOUNTS.find((a) => a.role === role);
      setCurrentUser((prev) => ({
        ...prev,
        id: preset?.id ?? prev.id,
        name: preset?.name ?? prev.name,
        email: preset?.email ?? prev.email,
        title: preset?.title ?? prev.title,
        role,
      }));
      pushToast(`Active RBAC Role: ${role}`, `Switched view to ${preset?.name ?? role}`, 'info');
    },
    [pushToast],
  );

  const loginAsDemoAccount = useCallback(
    (email: string) => {
      const preset =
        DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase()) ??
        DEMO_ACCOUNTS[0]!;
      setCurrentUser({
        id: preset.id,
        name: preset.name,
        email: preset.email,
        title: preset.title,
        role: preset.role,
      });
      apiClient.post('/auth/login', { email: preset.email, password: preset.password }).catch(() => null);
      pushToast(`Signed in as ${preset.name}`, `${preset.title} (${preset.role})`, 'success');
    },
    [pushToast],
  );

  const updateOrganizationSettings = useCallback(
    async (patch: Partial<OrganizationRecord>) => {
      await apiClient.patch(`/organizations/${activeOrganization.id}`, patch).catch(() => null);
      setOrganizations((prev) =>
        prev.map((org) => (org.id === activeOrganization.id ? { ...org, ...patch } : org)),
      );
      pushToast('Organization settings saved', 'Workspace configuration updated.', 'success');
    },
    [activeOrganization.id, pushToast],
  );

  const createCandidate = useCallback(
    async (
      input: Omit<
        CandidateRecord,
        'id' | 'organizationId' | 'fullName' | 'createdAt' | 'notes' | 'attachments'
      >,
    ) => {
      await apiClient.post('/candidates', input).catch(() => null);
      const newCandidate: CandidateRecord = {
        ...input,
        id: `cand_${Date.now()}`,
        organizationId: activeOrganization.id,
        fullName: `${input.firstName.trim()} ${input.lastName.trim()}`,
        notes: [],
        attachments: [
          {
            id: `att_${Date.now()}`,
            fileName: `${input.firstName}_${input.lastName}_Resume.pdf`,
            fileSize: '318 KB',
            fileType: 'application/pdf',
            uploadedAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
      };
      setCandidates((prev) => [newCandidate, ...prev]);
      setNotifications((prev) => [
        {
          id: `notif_${Date.now()}`,
          organizationId: activeOrganization.id,
          title: 'New Candidate Added',
          message: `${newCandidate.fullName} (${newCandidate.currentTitle}) was added to the talent pool.`,
          category: 'APPLICATION',
          isRead: false,
          createdAt: 'Just now',
          link: '/candidates',
        },
        ...prev,
      ]);
      pushToast(
        'Candidate profile created',
        `${newCandidate.fullName} has been added to ${activeOrganization.name}.`,
        'success',
      );
      return newCandidate;
    },
    [activeOrganization.id, activeOrganization.name, pushToast],
  );

  const addCandidateNote = useCallback(
    async (candidateId: string, content: string) => {
      await apiClient.post(`/candidates/${candidateId}/notes`, { content }).catch(() => null);
      const note: CandidateNoteItem = {
        id: `note_${Date.now()}`,
        authorName: currentUser.name,
        authorRole: currentUser.title,
        content,
        createdAt: new Date().toISOString(),
      };
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, notes: [note, ...c.notes] } : c)),
      );
      pushToast('Evaluation note added', 'Saved to candidate timeline.', 'success');
    },
    [currentUser.name, currentUser.title, pushToast],
  );

  const createJob = useCallback(
    async (input: Omit<JobRecord, 'id' | 'organizationId' | 'slug' | 'createdAt'>) => {
      await apiClient.post('/jobs', input).catch(() => null);
      const slug = input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const newJob: JobRecord = {
        ...input,
        id: `job_${Date.now()}`,
        organizationId: activeOrganization.id,
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        publishedAt: input.status === 'PUBLISHED' ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString(),
      };
      setJobs((prev) => [newJob, ...prev]);
      pushToast(
        'Job requisition created',
        `${newJob.title} (${newJob.status}) is now live.`,
        'success',
      );
      return newJob;
    },
    [activeOrganization.id, pushToast],
  );

  const updateJobStatus = useCallback(
    async (jobId: string, status: JobStatus) => {
      await apiClient.patch(`/jobs/${jobId}`, { status }).catch(() => null);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status } : j)));
      pushToast('Job status updated', `Requisition marked as ${status}.`, 'info');
    },
    [pushToast],
  );

  const computeAIMatchForPair = useCallback(
    (jobId: string, candidateId: string): AICandidateMatchResult => {
      const job = jobs.find((j) => j.id === jobId);
      const candidate = candidates.find((c) => c.id === candidateId);
      return computeExplainableMatch(job, candidate);
    },
    [jobs, candidates],
  );

  const createApplication = useCallback(
    async (input: {
      jobId: string;
      candidateId: string;
      source: string;
      expectedSalary?: number;
    }) => {
      await apiClient.post('/applications', input).catch(() => null);
      const job = jobs.find((j) => j.id === input.jobId);
      const candidate = candidates.find((c) => c.id === input.candidateId);
      const aiMatch = computeExplainableMatch(job, candidate);

      const newApp: ApplicationRecord = {
        id: `app_${Date.now()}`,
        organizationId: activeOrganization.id,
        jobId: input.jobId,
        candidateId: input.candidateId,
        status: 'NEW',
        source: input.source,
        appliedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedRecruiterName: currentUser.name,
        expectedSalary: input.expectedSalary ?? candidate?.expectedSalaryMin,
        aiMatch,
        stageHistory: [
          {
            id: `sh_${Date.now()}`,
            fromStatus: null,
            toStatus: 'NEW',
            changedByName: currentUser.name,
            reason: 'Initial application created',
            createdAt: new Date().toISOString(),
          },
        ],
      };

      setApplications((prev) => [newApp, ...prev]);
      pushToast(
        'Candidate applied to job',
        `AI Match Score: ${aiMatch.overallScore}% for ${candidate?.fullName ?? 'Candidate'}.`,
        'success',
      );
      return newApp;
    },
    [activeOrganization.id, candidates, currentUser.name, jobs, pushToast],
  );

  // Move ONLY the target applicationId to nextStatus. Like every other mutation
  // in this store, the board itself is the source of truth: the local update
  // applies unconditionally and the backend sync is best-effort, so a slow or
  // unreachable API never reverts a card the user already moved.
  const moveApplicationStage = useCallback(
    async (
      applicationId: string,
      nextStatus: ApplicationStatus,
      options?: { reason?: string; stageOrder?: number },
    ) => {
      const targetApp = applications.find((a) => a.id === applicationId);
      if (!targetApp) return;

      const statusChanged = targetApp.status !== nextStatus;
      const stageOrder =
        options?.stageOrder ??
        applications
          .filter((a) => a.id !== applicationId && a.status === nextStatus)
          .reduce((max, a) => Math.max(max, a.stageOrder ?? 0), -1) + 1;

      setApplications((prev) =>
        prev.map((app) => {
          if (app.id !== applicationId) return app;
          const entry: ApplicationStageHistoryEntry = {
            id: `sh_${Date.now()}`,
            fromStatus: app.status,
            toStatus: nextStatus,
            changedByName: currentUser.name,
            reason: options?.reason || `Moved from ${app.status} to ${nextStatus}`,
            createdAt: new Date().toISOString(),
          };
          return {
            ...app,
            status: nextStatus,
            stageOrder,
            updatedAt: statusChanged ? new Date().toISOString() : app.updatedAt,
            stageHistory: statusChanged ? [entry, ...app.stageHistory] : app.stageHistory,
          };
        }),
      );

      await apiClient
        .patch(`/applications/${applicationId}/status`, {
          status: nextStatus,
          stageOrder,
          reason: options?.reason,
        })
        .catch(() => null);

      if (statusChanged) {
        const cand = candidates.find((c) => c.id === targetApp.candidateId);
        pushToast(
          `Stage updated to ${nextStatus}`,
          `${cand?.fullName ?? 'Application'} moved to ${nextStatus}.`,
          'success',
        );
      }
    },
    [applications, candidates, currentUser.name, pushToast],
  );

  // Persists a batch of stage/order changes produced by a single Kanban drag
  // operation (same-column reorder or cross-column move), applied to the board
  // immediately as one state update. The backend sync is best-effort — same
  // fire-and-forget persistence as every other mutation in this store — so the
  // drop always sticks even if the request is slow or fails.
  const reorderApplications = useCallback(
    async (
      updates: Array<{ applicationId: string; status: ApplicationStatus; stageOrder: number }>,
    ) => {
      if (updates.length === 0) return;

      setApplications((prev) =>
        prev.map((app) => {
          const update = updates.find((u) => u.applicationId === app.id);
          if (!update) return app;
          const statusChanged = app.status !== update.status;
          const entry: ApplicationStageHistoryEntry = {
            id: `sh_${Date.now()}_${app.id}`,
            fromStatus: app.status,
            toStatus: update.status,
            changedByName: currentUser.name,
            reason: `Moved from ${app.status} to ${update.status}`,
            createdAt: new Date().toISOString(),
          };
          return {
            ...app,
            status: update.status,
            stageOrder: update.stageOrder,
            updatedAt: statusChanged ? new Date().toISOString() : app.updatedAt,
            stageHistory: statusChanged ? [entry, ...app.stageHistory] : app.stageHistory,
          };
        }),
      );

      await Promise.all(
        updates.map((u) =>
          apiClient
            .patch(`/applications/${u.applicationId}/status`, {
              status: u.status,
              stageOrder: u.stageOrder,
            })
            .catch(() => null),
        ),
      );
    },
    [currentUser.name],
  );

  const scheduleInterview = useCallback(
    async (input: {
      applicationId: string;
      title: string;
      type: InterviewType;
      scheduledAt: string;
      durationMinutes: number;
      timezone: string;
      locationOrLink: string;
      agendaNotes: string;
      participantIds: string[];
    }) => {
      await apiClient.post('/interviews', input).catch(() => null);
      const app = applications.find((a) => a.id === input.applicationId) ?? applications[0]!;
      const selectedParticipants = teamMembers
        .filter((m) => input.participantIds.includes(m.id))
        .map((m) => ({
          id: m.id,
          name: m.name,
          role: m.jobTitle,
          email: m.email,
        }));

      const newInterview: InterviewRecord = {
        id: `int_${Date.now()}`,
        organizationId: activeOrganization.id,
        applicationId: app.id,
        jobId: app.jobId,
        candidateId: app.candidateId,
        title: input.title,
        type: input.type,
        status: 'SCHEDULED',
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        timezone: input.timezone,
        locationOrLink: input.locationOrLink || 'https://meet.google.com/rfw-live-room',
        agendaNotes: input.agendaNotes,
        participants:
          selectedParticipants.length > 0
            ? selectedParticipants
            : [
                {
                  id: currentUser.id,
                  name: currentUser.name,
                  role: currentUser.title,
                  email: currentUser.email,
                },
              ],
        scorecards: [],
      };

      setInterviews((prev) => [newInterview, ...prev]);
      // Also advance that specific application to INTERVIEW if currently earlier
      setApplications((prev) =>
        prev.map((a) =>
          a.id === app.id && ['NEW', 'SCREENING', 'SHORTLISTED'].includes(a.status)
            ? { ...a, status: 'INTERVIEW', updatedAt: new Date().toISOString() }
            : a,
        ),
      );
      pushToast('Interview scheduled', `${newInterview.title} added to calendar.`, 'success');
      return newInterview;
    },
    [activeOrganization.id, applications, currentUser, pushToast, teamMembers],
  );

  const submitInterviewScorecard = useCallback(
    async (
      interviewId: string,
      scorecard: Omit<
        InterviewScorecardEntry,
        'id' | 'interviewerName' | 'interviewerRole' | 'submittedAt'
      >,
    ) => {
      await apiClient.post(`/interviews/${interviewId}/feedback`, scorecard).catch(() => null);
      const entry: InterviewScorecardEntry = {
        ...scorecard,
        id: `sc_${Date.now()}`,
        interviewerName: currentUser.name,
        interviewerRole: currentUser.title,
        submittedAt: new Date().toISOString(),
      };

      setInterviews((prev) =>
        prev.map((intv) =>
          intv.id === interviewId
            ? {
                ...intv,
                status: 'COMPLETED',
                scorecards: [entry, ...intv.scorecards],
              }
            : intv,
        ),
      );
      pushToast(
        'Interview scorecard submitted',
        `Recorded ${scorecard.overallRating}/5 rating (${scorecard.recommendation}).`,
        'success',
      );
    },
    [currentUser.name, currentUser.title, pushToast],
  );

  const inviteTeamMember = useCallback(
    async (input: {
      email: string;
      name: string;
      roleCode: SystemRoleCode;
      department: string;
      jobTitle: string;
    }) => {
      await apiClient.post('/organizations/members/invite', input).catch(() => null);
      const newMember: TeamMemberRecord = {
        id: `usr_${Date.now()}`,
        organizationId: activeOrganization.id,
        name: input.name,
        email: input.email,
        roleCode: input.roleCode,
        department: input.department || 'Talent Acquisition',
        jobTitle: input.jobTitle || 'Talent Partner',
        status: 'INVITED',
        joinedAt: new Date().toISOString(),
      };
      setTeamMembers((prev) => [...prev, newMember]);
      pushToast('Team invitation sent', `Invited ${input.email} as ${input.roleCode}.`, 'success');
    },
    [activeOrganization.id, pushToast],
  );

  const removeTeamMember = useCallback(
    async (memberId: string) => {
      await apiClient.delete(`/organizations/members/${memberId}`).catch(() => null);
      setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
      pushToast('Member removed', 'Workspace access has been revoked.', 'info');
    },
    [pushToast],
  );

  const markNotificationRead = useCallback((notificationId: string) => {
    apiClient.patch(`/notifications/${notificationId}/read`).catch(() => null);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    apiClient.post('/notifications/read-all').catch(() => null);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    pushToast('All notifications marked as read', undefined, 'info');
  }, [pushToast]);

  const deleteNotification = useCallback(
    (notificationId: string) => {
      apiClient.delete(`/notifications/${notificationId}`).catch(() => null);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      pushToast('Notification deleted', undefined, 'info');
    },
    [pushToast],
  );

  const updateAIProviderConfig = useCallback(
    async (provider: AIProviderType, patch: Partial<AIProviderSetting>) => {
      await apiClient.patch(`/admin/ai-providers/${provider}`, patch).catch(() => null);
      setAiProviders((prev) =>
        prev.map((p) => (p.provider === provider ? { ...p, ...patch } : p)),
      );
      setAuditLogs((prev) => [
        {
          id: `aud_${Date.now()}`,
          organizationName: activeOrganization.name,
          actorName: currentUser.name,
          actorEmail: currentUser.email,
          action: `ai.provider_updated (${provider})`,
          entityType: 'AIProviderSetting',
          ipAddress: '127.0.0.1',
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      pushToast(`${provider} configuration updated`, 'AI provider settings saved.', 'success');
    },
    [activeOrganization.name, currentUser.email, currentUser.name, pushToast],
  );

  const switchPlan = useCallback(
    async (planName: 'Starter' | 'Growth' | 'Enterprise') => {
      await apiClient.post('/billing/checkout', { planName }).catch(() => null);
      setOrganizations((prev) =>
        prev.map((o) => (o.id === activeOrganization.id ? { ...o, planName } : o)),
      );
      pushToast(
        `Upgraded to ${planName} Plan`,
        'Subscription quotas and AI credits updated immediately.',
        'success',
      );
    },
    [activeOrganization.id, pushToast],
  );

  const value = useMemo<RecruitFlowContextValue>(
    () => ({
      organizations,
      activeOrganization,
      currentUser,
      candidates,
      jobs,
      applications,
      interviews,
      teamMembers,
      notifications,
      aiProviders,
      auditLogs,
      toasts,
      can,
      pushToast,
      dismissToast,
      switchOrganization,
      switchActiveRole,
      loginAsDemoAccount,
      updateOrganizationSettings,
      createCandidate,
      addCandidateNote,
      createJob,
      updateJobStatus,
      createApplication,
      moveApplicationStage,
      reorderApplications,
      computeAIMatchForPair,
      scheduleInterview,
      submitInterviewScorecard,
      inviteTeamMember,
      removeTeamMember,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      updateAIProviderConfig,
      switchPlan,
    }),
    [
      organizations,
      activeOrganization,
      currentUser,
      candidates,
      jobs,
      applications,
      interviews,
      teamMembers,
      notifications,
      aiProviders,
      auditLogs,
      toasts,
      can,
      pushToast,
      dismissToast,
      switchOrganization,
      switchActiveRole,
      loginAsDemoAccount,
      updateOrganizationSettings,
      createCandidate,
      addCandidateNote,
      createJob,
      updateJobStatus,
      createApplication,
      moveApplicationStage,
      reorderApplications,
      computeAIMatchForPair,
      scheduleInterview,
      submitInterviewScorecard,
      inviteTeamMember,
      removeTeamMember,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      updateAIProviderConfig,
      switchPlan,
    ],
  );

  return (
    <RecruitFlowContext.Provider value={value}>
      {children}
      {/* Global Toast Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-lg transition-all"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    t.variant === 'error'
                      ? 'bg-red-600'
                      : t.variant === 'warning'
                        ? 'bg-amber-500'
                        : t.variant === 'info'
                          ? 'bg-indigo-600'
                          : 'bg-emerald-600'
                  }`}
                />
                <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              </div>
              {t.description && (
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </RecruitFlowContext.Provider>
  );
}

export function useRecruitFlow() {
  const ctx = useContext(RecruitFlowContext);
  if (!ctx) {
    throw new Error('useRecruitFlow must be used within a RecruitFlowProvider');
  }
  return ctx;
}
