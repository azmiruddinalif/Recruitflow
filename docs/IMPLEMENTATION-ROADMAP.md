# RecruitFlow — Master Implementation Roadmap

> **Document Version**: 1.0.0  
> **Status Tracking**: Synchronized with root `DEVELOPMENT_STATUS.md`

---

## Phase 1: Repository Inspection & Architecture Specification
**Objective**: Establish complete architectural blueprint, normalized relational schema design, RBAC permission matrix, design system tokens, and risk mitigations before writing feature code.

- [x] Inspect workspace environment and initialize monorepo directory structure
- [x] Author `docs/ARCHITECTURE.md` (System topology, Better Auth + NestJS verification, AI provider abstraction, storage, risk matrix)
- [x] Author `docs/DATABASE-DESIGN.md` (32-model relational specification, ERD, transaction boundaries, indexing)
- [x] Author `docs/PERMISSION-MATRIX.md` (5-role RBAC matrix and server-side guard rules)
- [x] Author `docs/DESIGN-SYSTEM.md` (`#4F46E5` Indigo token system, typography, ATS pipeline colors, layout components)
- [x] Author `docs/IMPLEMENTATION-ROADMAP.md` (5-phase engineering plan)
- [x] Author `prisma/schema.prisma` (Complete PostgreSQL Prisma schema)
- [x] Author `DEVELOPMENT_STATUS.md`

---

## Phase 2: Monorepo Foundation & Core Infrastructure
**Objective**: Implement workspace configuration, shared packages, database layer, Better Auth integration, NestJS foundation, RBAC/Organization guards, and Next.js design system shell.

1. **Workspace & Tooling**:
   - `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.env.example`, `tsconfig.base.json`
   - Shared packages: `@recruitflow/types`, `@recruitflow/validation`, `@recruitflow/shared`, `@recruitflow/config`
2. **Database & Prisma ORM**:
   - `prisma/schema.prisma` validation & Prisma Client generation
   - `prisma/seed.ts` (Deterministic demo organization, roles, permissions, sample jobs, candidates, applications, interviews, subscription plans)
3. **Authentication (Better Auth) & NestJS Guard Pipeline**:
   - Better Auth server configuration with Prisma adapter, Organization plugin, and Two-Factor support
   - `apps/api/src/modules/auth/` (`auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.guard.ts`, `current-user.decorator.ts`, `auth.types.ts`, `auth.integration.spec.ts`)
   - `OrganizationGuard`, `PermissionsGuard`, `SuperAdminGuard`, `@RequirePermissions()`, `@CurrentOrg()`
   - Global ValidationPipe, AllExceptionsFilter, ResponseTransformInterceptor (`{ success, message, data }`), Swagger (`/api/docs`), HealthCheck (`/api/v1/health`)
4. **Frontend App Shell & Design System (`apps/web`)**:
   - Next.js App Router setup, Tailwind CSS tokens (`#4F46E5`), `shadcn/ui` components, TanStack Query provider, Better Auth client hooks
   - Dashboard layout shell (Sidebar, Organization Switcher, Header, Notification Bell, Mobile navigation)

---

## Phase 3: Product Modules Implementation (18 Modules)
**Objective**: Build every module end-to-end (Prisma queries, Zod/DTO validation, NestJS controller/service/repository + unit tests, Next.js screens + loading/empty/error states).

| Order | Module | Backend (`apps/api/src/modules/*`) | Frontend (`apps/web/src/features/*` & `app/*`) |
| :---: | :--- | :--- | :--- |
| **1** | **Authentication** | Better Auth handler, session verification, password reset, 2FA, session revocation | Login, Register, Forgot Password, Reset Password, Verify Email, Security Settings |
| **2** | **User Management** | Profile update, avatar upload, password change, active sessions list, account deactivation | User Profile & Account Settings page |
| **3** | **Organizations** | Create/update org, logo upload, org switcher, org settings, tenant isolation | Onboarding / Create Org modal, Org Switcher, Organization Settings page |
| **4** | **Team Management** | Invite member, accept/reject invite, role assignment (`ORG_ADMIN`, `HIRING_MANAGER`, `RECRUITER`, `INTERVIEWER`), member removal | Team Members & Invitations management screen |
| **5** | **Dashboard** | Real database aggregations (total candidates, active jobs, pipeline breakdown, upcoming interviews, recent activity) | Executive Dashboard with KPI cards, funnel chart, hiring trend chart, upcoming interviews |
| **6** | **Candidates** | CRUD, search/filter/sort/pagination, skills, experience, education, certifications, notes, attachments, resume upload | Candidates Directory table, Create/Edit drawer, Candidate 360° Profile page |
| **7** | **Jobs** | CRUD, publish/unpublish/archive, required/preferred skills, salary range, pipeline config | Jobs Directory, Create/Edit Job wizard, Job Detail & Applicants view |
| **8** | **Applications** | Apply candidate to job, duplicate check, stage transitions (`NEW` -> `HIRED`/`REJECTED`), immutable history, notes, resume snapshot | Interactive Kanban Pipeline Board + Table View + Application Detail slide-over |
| **9** | **Interviews** | Schedule/reschedule/cancel, timezone handling, multi-interviewer assignment, structured scorecards & feedback | Interviews Calendar/List view, Schedule Interview modal, Scorecard submission drawer |
| **10** | **AI Provider Core** | `AIProviderInterface`, `OpenAIProvider`, `GeminiProvider`, `AnthropicProvider`, `AIFactory`, usage/cost logger | AI Configuration banner & status indicators |
| **11** | **AI Resume Parser** | PDF/DOCX validation & text extraction, BullMQ background job, structured extraction, human review & approval workflow | AI Resume Upload dropzone, Side-by-side Extraction Review & Approve screen |
| **12** | **AI Candidate Matching**| Explainable job-candidate scoring (`matchingSkills`, `missingSkills`, `experienceAlignment`, `recommendations`) | AI Match Score badge, Explainable Match Breakdown drawer |
| **13** | **AI Job Description Generator** | Tone, seniority, skills -> structured responsibilities, qualifications, benefits | In-editor AI Job Description Generator modal |
| **14** | **AI Interview Assistant** | Role-specific interview questions, evaluation rubrics, and interview-note summarizer | AI Question Generator & Scorecard Summarizer inside Interview view |
| **15** | **AI Email Assistant** | Editable drafts for interview invites, status updates, follow-ups, offers, rejections | AI Email Composer drawer on Candidate/Application pages |
| **16** | **Notifications** | In-app notifications, read/unread state, email dispatch queue (`apps/worker`), preferences | Notification Center popover & Notification Preferences tab |
| **17** | **Analytics & Reports** | Hiring funnel conversion, time-to-hire, applications per job, source effectiveness, recruiter activity | Analytics & Reports dashboard with interactive Recharts visualizations |
| **18** | **Subscription, Billing & Super Admin** | Free/Paid plans, quota enforcement, Stripe Checkout & verified Webhooks, self-hosted fallback; Super Admin orgs/users/plans/AI/audit/health | Billing & Plans page + `/admin` Super Admin Console |

---

## Phase 4: Integration, Security Verification & Automated QA
**Objective**: Verify end-to-end workflows, cross-tenant security boundaries, unit tests, integration tests, and Playwright E2E flows.

- [ ] Unit tests for NestJS services, guards, and AI factory (`*.spec.ts`)
- [ ] Integration / E2E API tests (`apps/api/test/e2e/`) verifying:
  - Unauthenticated access rejection (`401`)
  - Cross-organization access rejection (`403` / `404`)
  - Role permission enforcement (`INTERVIEWER` blocked from `candidates.delete`, `billing.manage`, etc.)
  - Candidate multi-application state independence
  - AI unconfigured graceful error state
- [ ] Playwright E2E browser tests covering registration/login, org creation, job creation, candidate creation, Kanban stage movement, and interview scheduling
- [ ] TypeScript strict typecheck (`tsc --noEmit`), ESLint validation, and production build verification

---

## Phase 5: Commercial Release & CodeCanyon Packaging
**Objective**: Prepare turnkey installation scripts, Docker Compose stack, comprehensive buyer documentation, and QA report.

- [ ] `docker-compose.yml` & Dockerfiles for `web`, `api`, `worker`, `postgres`, `redis`
- [ ] Automated installation & verification scripts (`scripts/install.sh`, `scripts/verify.sh`)
- [ ] Complete buyer documentation (`docs/installation/`, `docs/configuration/`, `docs/api/`, `docs/user-guide/`, `docs/QA-REPORT.md`)
- [ ] License & third-party attribution documentation

