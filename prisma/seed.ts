import { PrismaClient } from '@prisma/client';
import { ALL_PERMISSIONS, ROLE_PERMISSION_MATRIX } from '../packages/shared/src/index';
import { hashPassword } from '../apps/api/src/modules/auth/auth.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding RecruitFlow commercial database...');

  // 1. Seed Atomic Permissions
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { module: perm.module, description: perm.description },
      create: { code: perm.code, module: perm.module, description: perm.description },
    });
  }

  // 2. Seed Subscription Plans
  const plans = [
    {
      code: 'FREE',
      name: 'Self-Hosted / Starter Free',
      description: 'Ideal for small teams and self-hosted evaluation.',
      priceMonthlyCents: 0,
      priceYearlyCents: 0,
      maxJobs: 5,
      maxCandidates: 250,
      maxMembers: 5,
      aiCreditsMonthly: 100,
      features: ['Up to 5 Active Jobs', '250 Candidate Profiles', 'Kanban Pipeline', 'Basic Analytics'],
      sortOrder: 1,
    },
    {
      code: 'PROFESSIONAL',
      name: 'Growth & Agency Pro',
      description: 'Full AI recruitment suite for growing HR teams and agencies.',
      priceMonthlyCents: 7900,
      priceYearlyCents: 79000,
      maxJobs: 50,
      maxCandidates: 5000,
      maxMembers: 25,
      aiCreditsMonthly: 1500,
      features: [
        '50 Active Jobs',
        '5,000 Candidate Profiles',
        'AI Resume Parser & Matcher',
        'AI Job & Interview Assistants',
        'Custom Scorecards & Analytics',
      ],
      sortOrder: 2,
    },
    {
      code: 'ENTERPRISE',
      name: 'Enterprise Unlimited',
      description: 'Unlimited multi-tenant hiring scale with custom AI providers and SLA.',
      priceMonthlyCents: 24900,
      priceYearlyCents: 249000,
      maxJobs: 9999,
      maxCandidates: 100000,
      maxMembers: 500,
      aiCreditsMonthly: 15000,
      features: [
        'Unlimited Jobs & Candidates',
        'Bring Your Own AI Keys (OpenAI / Gemini / Anthropic)',
        'Multi-Organization Isolation',
        'Dedicated Audit Logs & Priority Support',
      ],
      sortOrder: 3,
    },
  ];

  const seededPlans: Record<string, { id: string }> = {};
  for (const plan of plans) {
    const record = await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
    seededPlans[plan.code] = record;
  }

  // 3. Seed Demo Users with Better Auth Credential Accounts
  const defaultPasswordHash = hashPassword('RecruitFlow@2026!');

  const demoUsers = [
    {
      email: 'admin@recruitflow.io',
      name: 'Alex Morgan (Super Admin)',
      jobTitle: 'Principal Platform Administrator',
      isSuperAdmin: true,
      roleCode: 'ORG_ADMIN' as const,
    },
    {
      email: 'sarah.chen@talentscale.io',
      name: 'Sarah Chen',
      jobTitle: 'VP of Talent Acquisition',
      isSuperAdmin: false,
      roleCode: 'ORG_ADMIN' as const,
    },
    {
      email: 'marcus.vance@talentscale.io',
      name: 'Marcus Vance',
      jobTitle: 'Director of Engineering',
      isSuperAdmin: false,
      roleCode: 'HIRING_MANAGER' as const,
    },
    {
      email: 'elena.rostova@talentscale.io',
      name: 'Elena Rostova',
      jobTitle: 'Senior Technical Recruiter',
      isSuperAdmin: false,
      roleCode: 'RECRUITER' as const,
    },
    {
      email: 'david.kim@talentscale.io',
      name: 'David Kim',
      jobTitle: 'Staff Systems Architect',
      isSuperAdmin: false,
      roleCode: 'INTERVIEWER' as const,
    },
  ];

  const userMap: Record<string, { id: string; name: string }> = {};

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        jobTitle: u.jobTitle,
        isSuperAdmin: u.isSuperAdmin,
        emailVerified: true,
        isActive: true,
      },
      create: {
        email: u.email,
        name: u.name,
        jobTitle: u.jobTitle,
        isSuperAdmin: u.isSuperAdmin,
        emailVerified: true,
        isActive: true,
      },
    });
    userMap[u.email] = user;

    await prisma.account.upsert({
      where: {
        providerId_accountId: {
          providerId: 'credential',
          accountId: user.id,
        },
      },
      update: { password: defaultPasswordHash },
      create: {
        userId: user.id,
        providerId: 'credential',
        accountId: user.id,
        password: defaultPasswordHash,
      },
    });
  }

  // 4. Seed Primary Organization (TalentScale Global) & Secondary Org (Apex Tech Staffing)
  const primaryOrg = await prisma.organization.upsert({
    where: { slug: 'talentscale' },
    update: {
      name: 'TalentScale Global',
      industry: 'Enterprise Software & AI',
      companySize: '250-500',
      website: 'https://talentscale.io',
    },
    create: {
      name: 'TalentScale Global',
      slug: 'talentscale',
      industry: 'Enterprise Software & AI',
      companySize: '250-500',
      website: 'https://talentscale.io',
      description: 'Global technology and AI product engineering organization.',
    },
  });

  await prisma.organizationSettings.upsert({
    where: { organizationId: primaryOrg.id },
    update: {},
    create: {
      organizationId: primaryOrg.id,
      defaultTimezone: 'America/New_York',
      defaultCurrency: 'USD',
      brandPrimaryColor: '#4F46E5',
    },
  });

  await prisma.subscription.upsert({
    where: { organizationId: primaryOrg.id },
    update: { planId: seededPlans.PROFESSIONAL.id },
    create: {
      organizationId: primaryOrg.id,
      planId: seededPlans.PROFESSIONAL.id,
      status: 'SELF_HOSTED',
      billingInterval: 'YEARLY',
      aiCreditsUsed: 42,
    },
  });

  // Secondary Organization for Cross-Tenant Isolation Verification
  const secondaryOrg = await prisma.organization.upsert({
    where: { slug: 'apex-staffing' },
    update: { name: 'Apex Tech Staffing' },
    create: {
      name: 'Apex Tech Staffing',
      slug: 'apex-staffing',
      industry: 'Executive Recruiting Agency',
      companySize: '50-100',
    },
  });

  await prisma.subscription.upsert({
    where: { organizationId: secondaryOrg.id },
    update: { planId: seededPlans.ENTERPRISE.id },
    create: {
      organizationId: secondaryOrg.id,
      planId: seededPlans.ENTERPRISE.id,
      status: 'SELF_HOSTED',
    },
  });

  // Seed Memberships in Primary Org
  for (const u of demoUsers) {
    const user = userMap[u.email];
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: primaryOrg.id,
          userId: user.id,
        },
      },
      update: { roleCode: u.roleCode, role: u.roleCode },
      create: {
        organizationId: primaryOrg.id,
        userId: user.id,
        roleCode: u.roleCode,
        role: u.roleCode,
        department: 'Talent & Engineering',
      },
    });
  }

  // 5. Seed Jobs
  const job1 = await prisma.job.upsert({
    where: {
      organizationId_slug: {
        organizationId: primaryOrg.id,
        slug: 'principal-fullstack-engineer-nextjs-nestjs',
      },
    },
    update: {},
    create: {
      organizationId: primaryOrg.id,
      title: 'Principal Full-Stack Engineer (Next.js & NestJS)',
      slug: 'principal-fullstack-engineer-nextjs-nestjs',
      code: 'ENG-2026-01',
      department: 'Platform Engineering',
      location: 'San Francisco, CA / Hybrid',
      workLocationType: 'HYBRID',
      employmentType: 'FULL_TIME',
      experienceLevel: 'SENIOR',
      minExperienceYears: 6,
      maxExperienceYears: 12,
      salaryMin: 175000,
      salaryMax: 215000,
      description:
        'Lead the architecture and delivery of our multi-tenant SaaS platform built with Next.js App Router, NestJS microservices, PostgreSQL, and AI agent workflows.',
      responsibilities: [
        'Architect scalable multi-tenant modules in NestJS and Prisma ORM',
        'Design high-signal enterprise interfaces in Next.js and Tailwind CSS',
        'Integrate LLM workflows across OpenAI, Gemini, and Anthropic providers',
      ],
      qualifications: [
        '6+ years production TypeScript experience across React/Next.js and Node.js/NestJS',
        'Deep relational database modeling expertise in PostgreSQL',
      ],
      benefits: ['Competitive Equity', 'Comprehensive Health & Dental', 'Flexible Remote Hybrid'],
      status: 'PUBLISHED',
      publishedAt: new Date(),
      hiringManagerId: userMap['marcus.vance@talentscale.io'].id,
      createdById: userMap['sarah.chen@talentscale.io'].id,
      skills: {
        create: [
          { name: 'TypeScript', isRequired: true, weight: 10 },
          { name: 'Next.js', isRequired: true, weight: 9 },
          { name: 'NestJS', isRequired: true, weight: 9 },
          { name: 'PostgreSQL', isRequired: true, weight: 8 },
          { name: 'Prisma', isRequired: false, weight: 7 },
        ],
      },
    },
  });

  const job2 = await prisma.job.upsert({
    where: {
      organizationId_slug: {
        organizationId: primaryOrg.id,
        slug: 'senior-ai-solutions-architect',
      },
    },
    update: {},
    create: {
      organizationId: primaryOrg.id,
      title: 'Senior AI Solutions Architect',
      slug: 'senior-ai-solutions-architect',
      code: 'AI-2026-02',
      department: 'Applied AI',
      location: 'Remote (US & Europe)',
      workLocationType: 'REMOTE',
      employmentType: 'FULL_TIME',
      experienceLevel: 'LEAD',
      minExperienceYears: 5,
      salaryMin: 185000,
      salaryMax: 230000,
      description:
        'Design and optimize structured LLM extraction, RAG pipelines, and explainable candidate matching models.',
      responsibilities: [
        'Build provider-agnostic LLM orchestration pipelines',
        'Ensure explainability, bias mitigation, and schema validation across AI features',
      ],
      qualifications: ['5+ years software engineering with 2+ years in production GenAI systems'],
      benefits: ['Remote First', 'Annual Learning Stipend', 'Top-tier Hardware'],
      status: 'PUBLISHED',
      publishedAt: new Date(),
      hiringManagerId: userMap['marcus.vance@talentscale.io'].id,
      createdById: userMap['elena.rostova@talentscale.io'].id,
    },
  });

  // 6. Seed Candidates & Independent Multi-Job Applications
  const candidate1 = await prisma.candidate.upsert({
    where: {
      organizationId_email: {
        organizationId: primaryOrg.id,
        email: 'sophia.martinez@example.com',
      },
    },
    update: {},
    create: {
      organizationId: primaryOrg.id,
      firstName: 'Sophia',
      lastName: 'Martinez',
      fullName: 'Sophia Martinez',
      email: 'sophia.martinez@example.com',
      phone: '+1 (415) 890-3412',
      location: 'San Francisco, CA',
      currentTitle: 'Staff Full-Stack Engineer',
      currentCompany: 'CloudScale Systems',
      totalExperienceYears: 8,
      summary:
        'Staff Software Engineer with 8 years of experience building multi-tenant B2B SaaS platforms using Next.js, NestJS, TypeScript, and PostgreSQL.',
      source: 'LINKEDIN',
      tags: ['Top Talent', 'Full-Stack', 'TypeScript'],
      languages: ['English', 'Spanish'],
      createdById: userMap['elena.rostova@talentscale.io'].id,
      skills: {
        create: [
          { name: 'TypeScript', proficiency: 'Expert', yearsOfExperience: 7, isVerified: true },
          { name: 'Next.js', proficiency: 'Expert', yearsOfExperience: 5, isVerified: true },
          { name: 'NestJS', proficiency: 'Advanced', yearsOfExperience: 4, isVerified: true },
          { name: 'PostgreSQL', proficiency: 'Advanced', yearsOfExperience: 6, isVerified: true },
          { name: 'Prisma', proficiency: 'Advanced', yearsOfExperience: 4, isVerified: true },
        ],
      },
    },
  });

  // Apply Sophia to Job 1 (INTERVIEW stage) and Job 2 (SHORTLISTED stage) to demonstrate multi-application independence
  const app1 = await prisma.jobApplication.upsert({
    where: {
      jobId_candidateId: {
        jobId: job1.id,
        candidateId: candidate1.id,
      },
    },
    update: {},
    create: {
      organizationId: primaryOrg.id,
      jobId: job1.id,
      candidateId: candidate1.id,
      status: 'INTERVIEW',
      stageOrder: 3,
      source: 'LINKEDIN',
      matchScore: 94,
      assignedRecruiterId: userMap['elena.rostova@talentscale.io'].id,
    },
  });

  await prisma.jobApplication.upsert({
    where: {
      jobId_candidateId: {
        jobId: job2.id,
        candidateId: candidate1.id,
      },
    },
    update: {},
    create: {
      organizationId: primaryOrg.id,
      jobId: job2.id,
      candidateId: candidate1.id,
      status: 'SHORTLISTED',
      stageOrder: 2,
      source: 'INTERNAL',
      matchScore: 86,
      assignedRecruiterId: userMap['elena.rostova@talentscale.io'].id,
    },
  });

  // Schedule an upcoming interview on app1
  const existingInterviews = await prisma.interview.count({
    where: { applicationId: app1.id },
  });
  if (existingInterviews === 0) {
    await prisma.interview.create({
      data: {
        organizationId: primaryOrg.id,
        applicationId: app1.id,
        title: 'System Architecture & NestJS Deep Dive',
        type: 'TECHNICAL',
        status: 'SCHEDULED',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        durationMinutes: 60,
        timezone: 'America/New_York',
        locationOrLink: 'https://meet.recruitflow.io/eng-arch-sophia',
        scheduledById: userMap['elena.rostova@talentscale.io'].id,
        participants: {
          create: [
            { userId: userMap['marcus.vance@talentscale.io'].id, role: 'HIRING_MANAGER' },
            { userId: userMap['david.kim@talentscale.io'].id, role: 'INTERVIEWER' },
          ],
        },
      },
    });
  }

  console.log('✅ RecruitFlow database seed completed successfully.');
}

main()
  .catch((err) => {
    console.error('❌ Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
