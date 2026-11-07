import { z } from 'zod';

// ============================================================================
// 1. AUTHENTICATION & USER SCHEMAS
// ============================================================================

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please provide a valid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(true),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(40).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  timezone: z.string().max(64).optional(),
  image: z.string().url().optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

// ============================================================================
// 2. ORGANIZATION & TEAM SCHEMAS
// ============================================================================

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name is required').max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .optional(),
  industry: z.string().max(80).optional(),
  companySize: z.string().max(40).optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  description: z.string().max(2000).optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial().extend({
  defaultTimezone: z.string().optional(),
  defaultCurrency: z.string().length(3).optional(),
  brandPrimaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  allowAIResumeParsing: z.boolean().optional(),
  allowAICandidateMatching: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Valid email address required').toLowerCase(),
  roleCode: z.enum(['ORG_ADMIN', 'HIRING_MANAGER', 'RECRUITER', 'INTERVIEWER']),
  department: z.string().max(80).optional(),
});

// ============================================================================
// 3. CANDIDATE SCHEMAS
// ============================================================================

export const candidateSkillSchema = z.object({
  name: z.string().min(1).max(80),
  proficiency: z.string().max(40).optional(),
  yearsOfExperience: z.number().min(0).max(50).optional(),
});

export const candidateExperienceSchema = z.object({
  company: z.string().min(1).max(120),
  title: z.string().min(1).max(120),
  location: z.string().max(120).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional().default(false),
  description: z.string().max(4000).optional(),
  highlights: z.array(z.string()).optional().default([]),
});

export const candidateEducationSchema = z.object({
  institution: z.string().min(1).max(150),
  degree: z.string().min(1).max(150),
  fieldOfStudy: z.string().max(150).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  grade: z.string().max(40).optional(),
});

export const candidateCertificationSchema = z.object({
  name: z.string().min(1).max(150),
  issuingOrg: z.string().min(1).max(150),
  issueDate: z.string().optional(),
  credentialId: z.string().max(100).optional(),
  credentialUrl: z.string().url().optional().or(z.literal('')),
});

export const createCandidateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName: z.string().min(1, 'Last name is required').max(80),
  email: z.string().email('Valid email is required').toLowerCase(),
  phone: z.string().max(40).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  currentTitle: z.string().max(120).optional().nullable(),
  currentCompany: z.string().max(120).optional().nullable(),
  totalExperienceYears: z.number().min(0).max(60).optional().nullable(),
  summary: z.string().max(5000).optional().nullable(),
  linkedinUrl: z.string().url().optional().or(z.literal('')).nullable(),
  portfolioUrl: z.string().url().optional().or(z.literal('')).nullable(),
  githubUrl: z.string().url().optional().or(z.literal('')).nullable(),
  expectedSalaryMin: z.number().int().min(0).optional().nullable(),
  expectedSalaryMax: z.number().int().min(0).optional().nullable(),
  salaryCurrency: z.string().default('USD'),
  noticePeriodDays: z.number().int().min(0).max(365).optional().nullable(),
  source: z
    .enum([
      'DIRECT_APPLY',
      'LINKEDIN',
      'REFERRAL',
      'AGENCY',
      'JOB_BOARD',
      'AI_RESUME_IMPORT',
      'INTERNAL',
      'OTHER',
    ])
    .default('DIRECT_APPLY'),
  tags: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  skills: z.array(candidateSkillSchema).optional().default([]),
  experiences: z.array(candidateExperienceSchema).optional().default([]),
  educations: z.array(candidateEducationSchema).optional().default([]),
  certifications: z.array(candidateCertificationSchema).optional().default([]),
});

export const updateCandidateSchema = createCandidateSchema.partial();

// ============================================================================
// 4. JOB SCHEMAS
// ============================================================================

export const createJobSchema = z.object({
  title: z.string().min(3, 'Job title must be at least 3 characters').max(140),
  department: z.string().min(2, 'Department is required').max(100),
  location: z.string().min(2, 'Location is required').max(120),
  workLocationType: z.enum(['ONSITE', 'REMOTE', 'HYBRID']).default('HYBRID'),
  employmentType: z
    .enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'FREELANCE'])
    .default('FULL_TIME'),
  experienceLevel: z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE']).default('MID'),
  minExperienceYears: z.number().int().min(0).max(40).default(0),
  maxExperienceYears: z.number().int().min(0).max(50).optional().nullable(),
  salaryMin: z.number().int().min(0).optional().nullable(),
  salaryMax: z.number().int().min(0).optional().nullable(),
  salaryCurrency: z.string().default('USD'),
  showSalary: z.boolean().default(true),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  responsibilities: z.array(z.string()).default([]),
  qualifications: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  educationRequirement: z.string().max(200).optional().nullable(),
  openingsCount: z.number().int().min(1).max(500).default(1),
  status: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED']).default('DRAFT'),
  applicationDeadline: z.string().optional().nullable(),
  hiringManagerId: z.string().optional().nullable(),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  aiGenerated: z.boolean().default(false),
});

export const updateJobSchema = createJobSchema.partial();

// ============================================================================
// 5. APPLICATION SCHEMAS
// ============================================================================

export const createApplicationSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  candidateId: z.string().min(1, 'Candidate ID is required'),
  resumeId: z.string().optional().nullable(),
  source: z
    .enum([
      'DIRECT_APPLY',
      'LINKEDIN',
      'REFERRAL',
      'AGENCY',
      'JOB_BOARD',
      'AI_RESUME_IMPORT',
      'INTERNAL',
      'OTHER',
    ])
    .default('DIRECT_APPLY'),
  coverLetter: z.string().max(10000).optional().nullable(),
  expectedSalary: z.number().int().min(0).optional().nullable(),
  assignedRecruiterId: z.string().optional().nullable(),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum([
    'NEW',
    'SCREENING',
    'SHORTLISTED',
    'INTERVIEW',
    'ASSESSMENT',
    'OFFER',
    'HIRED',
    'REJECTED',
    'WITHDRAWN',
  ]),
  reason: z.string().max(1000).optional(),
  stageOrder: z.number().int().min(0).optional(),
});

export const addApplicationNoteSchema = z.object({
  content: z.string().min(1, 'Note content cannot be empty').max(5000),
  stageContext: z.string().max(60).optional(),
  isPrivate: z.boolean().default(false),
});

// ============================================================================
// 6. INTERVIEW & SCORECARD SCHEMAS
// ============================================================================

export const scheduleInterviewSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  title: z.string().min(3, 'Interview title is required').max(160),
  description: z.string().max(3000).optional(),
  type: z
    .enum(['PHONE_SCREEN', 'VIDEO', 'TECHNICAL', 'BEHAVIORAL', 'PANEL', 'ONSITE', 'FINAL'])
    .default('VIDEO'),
  scheduledAt: z.string().min(1, 'Scheduled date and time is required'),
  durationMinutes: z.number().int().min(15).max(480).default(45),
  timezone: z.string().default('UTC'),
  locationOrLink: z.string().max(500).optional(),
  agendaNotes: z.string().max(4000).optional(),
  participantUserIds: z.array(z.string()).min(1, 'Select at least one interviewer'),
});

export const submitInterviewFeedbackSchema = z.object({
  overallRating: z.number().int().min(1).max(5),
  technicalScore: z.number().int().min(1).max(5).optional(),
  communicationScore: z.number().int().min(1).max(5).optional(),
  problemSolvingScore: z.number().int().min(1).max(5).optional(),
  cultureFitScore: z.number().int().min(1).max(5).optional(),
  strengths: z.string().max(3000).optional(),
  concerns: z.string().max(3000).optional(),
  notes: z.string().max(5000).optional(),
  recommendation: z.enum(['STRONG_HIRE', 'HIRE', 'NEUTRAL', 'NO_HIRE', 'STRONG_NO_HIRE']),
});

// ============================================================================
// 7. AI STRUCTURED OUTPUT SCHEMAS
// ============================================================================

export const aiParsedResumeSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string().optional().default(''),
  location: z.string().optional().default(''),
  currentTitle: z.string().optional().default(''),
  currentCompany: z.string().optional().default(''),
  totalExperienceYears: z.number().optional().default(0),
  summary: z.string().default(''),
  skills: z
    .array(
      z.object({
        name: z.string(),
        proficiency: z.string().optional(),
        yearsOfExperience: z.number().optional(),
      }),
    )
    .default([]),
  experiences: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        location: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        isCurrent: z.boolean().optional(),
        description: z.string().optional(),
        highlights: z.array(z.string()).optional(),
      }),
    )
    .default([]),
  educations: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string(),
        fieldOfStudy: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        grade: z.string().optional(),
      }),
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuingOrg: z.string(),
        issueDate: z.string().optional(),
      }),
    )
    .default([]),
  languages: z.array(z.string()).default([]),
});

export const aiCandidateMatchOutputSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  skillsScore: z.number().int().min(0).max(100),
  experienceScore: z.number().int().min(0).max(100),
  educationScore: z.number().int().min(0).max(100),
  matchingSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  relevantExperience: z.string(),
  explanation: z.string(),
  recommendations: z.array(z.string()),
});

export const aiJobDescriptionOutputSchema = z.object({
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  responsibilities: z.array(z.string()),
  qualifications: z.array(z.string()),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  benefits: z.array(z.string()),
});

export const aiInterviewQuestionsOutputSchema = z.object({
  questions: z.array(
    z.object({
      category: z.enum(['TECHNICAL', 'BEHAVIORAL', 'ROLE_SPECIFIC', 'PROBLEM_SOLVING']),
      question: z.string(),
      evaluationCriteria: z.string(),
      expectedSignals: z.array(z.string()),
    }),
  ),
  scorecardCriteria: z.array(
    z.object({
      name: z.string(),
      weight: z.number(),
      description: z.string(),
    }),
  ),
});

export const aiEmailDraftOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
  tone: z.string(),
  placeholders: z.array(z.string()),
});

