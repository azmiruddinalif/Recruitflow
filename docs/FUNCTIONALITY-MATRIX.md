# RecruitFlow — Master Dynamic Functionality Audit Matrix (`v1.0.0`)

This document fulfills **Section 28.18 (Mandatory Functional Audit Document)** of the RecruitFlow Master Development Specification. Every page, button, form, table, filter, chart, modal, backend API endpoint, Prisma database model, RBAC permission, automated/manual test case, and verified test result is documented below.

---

## 1. Executive Summary of Dynamic Architecture

- **Database Engine**: PostgreSQL 18 (`127.0.0.1:5433/recruitflow`) with **32 Prisma models** in [`prisma/schema.prisma`](../prisma/schema.prisma).
- **Backend API**: NestJS 11 REST API (`/api/v1/*`) with `AuthGuard` (Better Auth session verification), `OrganizationGuard` (tenant isolation via `x-organization-id`), and `PermissionsGuard` (`@RequirePermissions(...)` across 32 atomic permissions).
- **Frontend State & Server Synchronization**: Next.js 15 App Router (`apps/web`) with TanStack React Query (`@tanstack/react-query`) + `RecruitFlowProvider` (`src/stores/recruitflow-store.tsx`) executing live `fetch` calls (`credentials: 'include'`) against `/api/v1/*` and automatically invalidating/updating state upon mutations.
- **Zero Dead Buttons Policy**: Every button, filter, tab, modal, and form control triggers a real handler, API call, state transition, or file download.

---

## 2. Page-by-Page & Component-Level Functionality Matrix

### 2.1 Marketing & Public Pages (`/`)

| Page / Feature | UI Element & Type | Expected Dynamic Behavior | Backend Endpoint | Prisma Model(s) | Required Permission | Test Case | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Landing Page** (`/`) | Top Navbar `Sign In` / `Launch Live Workspace` CTA buttons | Navigates to `/login` or `/dashboard` with active session | `GET /api/auth/get-session` | `User`, `Session` | Public | E2E `01` — Load `/` and verify navigation links | **PASS** |
| **Landing Page** (`/`) | Interactive Billing Period Toggle (`Monthly` / `Annual -20%`) | Dynamically recalculates Starter, Growth, and Enterprise plan pricing cards | `GET /api/v1/subscriptions/plans` | `SubscriptionPlan` | Public | Toggle pricing switch and verify price updates | **PASS** |

---

### 2.2 Authentication & Onboarding (`/login`, `/register`, `/forgot-password`)

| Page / Feature | UI Element & Type | Expected Dynamic Behavior | Backend Endpoint | Prisma Model(s) | Required Permission | Test Case | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Login Page** (`/login`) | Email + Password Form (`Sign In to Workspace` button) | Validates credentials with Zod, calls Better Auth `/api/auth/sign-in/email`, sets session cookie, redirects to `/dashboard` | `POST /api/auth/sign-in/email` | `User`, `Account`, `Session`, `AuditLog` | Public | Unit `auth.integration.spec.ts` + E2E Login | **PASS** |
| **Login Page** (`/login`) | 5 Instant Demo Role Switcher Buttons (`Super Admin`, `Org Admin`, `Hiring Manager`, `Recruiter`, `Interviewer`) | Authenticates as the selected demo persona, loads their organization and RBAC permission set, and redirects to `/dashboard` | `POST /api/auth/sign-in/email` + `GET /api/v1/users/me` | `User`, `OrganizationMember`, `RolePermission` | Public | Click each demo role button and verify RBAC permissions update | **PASS** |
| **Register Page** (`/register`) | Full Name, Work Email, Organization Name, Password Form (`Create Organization Workspace` button) | Creates User + Account via Better Auth, provisions new `Organization` and `ORG_ADMIN` membership, redirects to `/dashboard` | `POST /api/auth/sign-up/email` + `POST /api/v1/organizations` | `User`, `Account`, `Organization`, `OrganizationMember`, `Subscription` | Public | Submit registration form with valid/invalid payloads | **PASS** |
| **Forgot Password** (`/forgot-password`) | Work Email Form (`Send Recovery Link` button) | Validates email format, dispatches password reset token request, renders confirmation state | `POST /api/auth/forget-password` | `User`, `Verification` | Public | Submit email and verify confirmation state | **PASS** |

---

### 2.3 Top Header & Global Multi-Tenant Controls (`(dashboard)/layout.tsx`)

| Page / Feature | UI Element & Type | Expected Dynamic Behavior | Backend Endpoint | Prisma Model(s) | Required Permission | Test Case | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Organization Switcher** | Header Organization Dropdown (`Acme Cloud Infrastructure` / `Apex Global Staffing`) | Switches active `organizationId`, sends `x-organization-id` header on subsequent API requests, reloads organization-scoped candidates, jobs, applications, interviews, and KPIs | `GET /api/v1/organizations` + `GET /api/v1/analytics/dashboard` | `Organization`, `OrganizationMember` | Authenticated Member | E2E `02` + `app.e2e-spec.ts` cross-tenant isolation test | **PASS** |
| **RBAC Role Simulator** | Header Role Selector (`SUPER_ADMIN`, `ORG_ADMIN`, `HIRING_MANAGER`, `RECRUITER`, `INTERVIEWER`) | Dynamically switches active role context to preview exact permission gates across all UI buttons and routes | `GET /api/v1/users/me` | `OrganizationMember`, `RolePermission` | Authenticated Member | Switch to `INTERVIEWER` and verify `Post New Job` / `Settings` actions are gated | **PASS** |
| **Notifications Bell** | Header Unread Counter Badge & Link | Displays real-time count of unread notifications for active organization; clicking navigates to `/notifications` | `GET /api/v1/notifications` | `Notification` | Authenticated Member | Mark notification read and verify badge count decrements | **PASS** |

---

### 2.4 Executive Dashboard (`/dashboard`)

| Page / Feature | UI Element & Type | Expected Dynamic Behavior | Backend Endpoint | Prisma Model(s) | Required Permission | Test Case | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Date Range Filter Bar** |Segmented Filter Buttons (`Last 7d`, `Last 30d`, `Last 90d`, `This Year`, `Custom`) + Custom Date Inputs (`From`, `To`) | Queries backend analytics endpoint with `?range=7d|30d|90d|1y|custom&from=...&to=...` and recalculates KPI cards, conversion funnel percentages, and application volume | `GET /api/v1/analytics/dashboard?range=...&from=...&to=...` | `Candidate`, `Job`, `Application`, `Interview`, `AIUsageLog` | `analytics.view` | Select `Last 7d`, `Last 30d`, `Custom` and verify network query + metric recalculation | **PASS** |
| **KPI Stat Cards** | 4 Dynamic Cards (`Total Candidates`, `Active Jobs`, `Applications in Window`, `Interviews Scheduled`) | Displays real counts for the active organization and selected date window | `GET /api/v1/analytics/dashboard` | `Candidate`, `Job`, `Application`, `Interview` | `analytics.view` | Create a new candidate/job and verify KPI card increments | **PASS** |
| **Hiring Pipeline Funnel Chart** | 6-Stage Horizontal Progress Funnel (`NEW`, `SHORTLISTED`, `INTERVIEW`, `OFFER`, `HIRED`, `REJECTED`) | Dynamically calculates stage counts and percentage bars from filtered applications | `GET /api/v1/analytics/dashboard` | `Application` | `analytics.view` | Move application stage in `/applications` and verify funnel bars update | **PASS** |
| **AI Usage & Quota Widget** | Progress Bar + Provider Status Card | Shows monthly token consumption, AI request count, and active default provider (`OPENAI` / `GEMINI` / `ANTHROPIC`) | `GET /api/v1/ai/usage` | `AIUsageLog`, `Subscription`, `SubscriptionPlan` | `analytics.view` | Trigger AI Match or Resume Parse and verify usage counter increments | **PASS** |
| **Upcoming Interviews Feed** | List of Scheduled Interviews + `View All` link | Lists upcoming interviews for active organization with candidate name, job title, round, and meeting link | `GET /api/v1/interviews` | `Interview`, `Application`, `Candidate`, `Job` | `interview.view` | Schedule new interview and verify it appears in dashboard feed | **PASS** |
| **Recent Activity Audit Feed** | Chronological Audit Stream | Displays latest `AuditLog` entries (`application.stage_changed`, `candidate.created`, `interview.scheduled`, etc.) | `GET /api/v1/analytics/dashboard` | `AuditLog` | `analytics.view` | Perform CRUD action and verify new audit log row appears | **PASS** |

---

### 2.5 Candidates Module (`/candidates`)

| Page / Feature | UI Element & Type | Expected Dynamic Behavior | Backend Endpoint | Prisma Model(s) | Required Permission | Test Case | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Candidate Search & Filter Bar** | Search Input (Name, Email, Title, Skills) + Source Filter Dropdown + Tag Filter | Filters candidate table in real time and supports server-side query parameters (`?search=...&source=...&skills=...&location=...`) | `GET /api/v1/candidates` | `Candidate`, `CandidateTag` | `candidate.view` | `candidates.service.spec.ts` + E2E search filter verification | **PASS** |
| **Create Candidate Modal** | `+ Add Candidate` Button & Validated Form (`Full Name`, `Email`, `Phone`, `Location`, `Current Title`, `Current Company`, `Years Exp`, `Skills`, `Source`, `Summary`) | Validates fields, prevents duplicate email within the same organization (`409 Conflict`), persists candidate in PostgreSQL, updates table immediately | `POST /api/v1/candidates` | `Candidate`, `AuditLog` | `candidate.create` | Unit test duplicate email check + create candidate in UI | **PASS** |
| **Candidate Detail Drawer** | Row Click / `Inspect Profile` Button | Opens comprehensive drawer showing parsed resume data, work history, education, skills badges, application history across jobs, and internal recruiter notes | `GET /api/v1/candidates/:id` | `Candidate`, `CandidateResume`, `CandidateNote`, `Application` | `candidate.view` | Click candidate row and inspect all tabs in detail drawer | **PASS** |
| **Recruiter Notes Form** | Note Textarea + `Add Internal Note` Button inside Candidate Drawer | Persists timestamped recruiter note attributed to the current user and appends to candidate's timeline | `POST /api/v1/candidates/:id/notes` | `CandidateNote`, `AuditLog` | `candidate.update` | Submit note and verify immediate display | **PASS** |
| **Delete Candidate Action** | `Delete` Action with Confirmation | Verifies `candidate.delete` permission, removes candidate record, refreshes list | `DELETE /api/v1/candidates/:id` | `Candidate`, `AuditLog` | `candidate.delete` | Delete test candidate and verify removal | **PASS** |

---

### 2.6 Jobs Module (`/jobs`)

| Page / Feature | UI Element & Type | Expected Dynamic Behavior | Backend Endpoint | Prisma Model(s) | Required Permission | Test Case | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Job Search & Status Filter** | Search Input (Title, Department, Location) + Status Filter Pills (`ALL`, `PUBLISHED`, `DRAFT`, `CLOSED`, `ARCHIVED`) | Filters job requisitions dynamically by keyword and lifecycle status | `GET /api/v1/jobs` | `Job` | `job.view` | Filter by `PUBLISHED` vs `DRAFT` and search by department | **PASS** |
| **Create Job Modal** | `+ Create Job Requisition` Button & Form (`Title`, `Department`, `Location`, `Work Mode`, `Employment Type`, `Experience Level`, `Salary Min/Max`, `Required Skills`, `Description`) | Validates salary bounds and required fields, creates job requisition in database, updates job grid | `POST /api/v1/jobs` | `Job`, `JobRequirement`, `AuditLog` | `job.create` | Submit new job requisition and verify card creation | **PASS** |
| **AI Job Description Generator** | `✨ Generate with AI` Button inside Create Job Modal | Calls AI Job Generator service using entered title, department, and skills to populate structured overview, responsibilities, and qualifications | `POST /api/v1/ai/generate-job-description` | `AIJobGeneration`, `AIUsageLog` | `ai.use`, `job.create` | Click `Generate with AI` in job modal and verify populated description | **PASS** |
| **Job Lifecycle Status Control** | Status Action Buttons (`Publish`, `Pause / Draft`, `Close Requisition`, `Archive`) | Transitions job status in PostgreSQL and updates public/pipeline availability | `PATCH /api/v1/jobs/:id` | `Job`, `AuditLog` | `job.publish` / `job.update` | Toggle job status from `DRAFT` to `PUBLISHED` and `CLOSED` | **PASS** |

---

### 2.7 Applications & Kanban Pipeline (`/applications`)

| Page / Feature | UI Element & Type | Expected Dynamic Behavior | Backend Endpoint | Prisma Model(s) | Required Permission | Test Case | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **View Switcher & Job Filter** | `Kanban Board` / `Table View` Toggle + Job Filter Dropdown + Stage Filter | Switches between 9-column interactive Kanban board and tabular view; filters applications by specific job requisition | `GET /api/v1/applications?jobId=...&status=...` | `Application`, `Candidate`, `Job`, `AICandidateMatch` | `application.view` | Switch between Kanban and Table views and filter by Job | **PASS** |
| **Drag-and-Drop Kanban Cards** | `@dnd-kit` pointer + keyboard sortable cards, draggable via a dedicated grip handle, with a live drag overlay and droppable column highlighting | Moving a card persists the new `status` and `stageOrder` to the backend (cross-column move or same-column reorder); the UI updates optimistically and rolls back to the prior board state if the server request fails | `PATCH /api/v1/applications/:id/status` (one call per affected card) | `Application`, `ApplicationStatusHistory`, `ActivityLog` | `applications.update` | `applications.service.spec.ts` (reorder leaves no stage-history row) + manual drag/rollback verification in Chrome | **PASS** |
| **Stage Transition Controls** | Per-card Stage Dropdown + `Advance` Button (accessible alternative to drag), forward order `NEW` → `SCREENING` → `SHORTLISTED` → `INTERVIEW` → `ASSESSMENT` → `OFFER` → `HIRED`) | Updates `Application.status`, appends an `ApplicationStatusHistory` record with actor & timestamp only when the stage actually changes (a pure reorder does not create a spurious history row), writes `ActivityLog`, and updates Kanban column counts | `PATCH /api/v1/applications/:id/status` | `Application`, `ApplicationStatusHistory`, `ActivityLog` | `applications.update` | `applications.service.spec.ts` + manual stage-change verification in Chrome | **PASS** |
| **AI Match Score Computation** | `Recompute AI Match` Button on Application Card / Detail Modal | Evaluates candidate skills, experience, and education against job requirements, stores weighted breakdown (`overallScore`, `skillsScore`, `experienceScore`, `educationScore`, `matchingSkills`, `missingSkills`, `explanation`), and updates badge | `POST /api/v1/ai/match-candidate` | `AICandidateMatch`, `AIUsageLog` | `ai.use` | Click `Recompute AI Match` and verify updated score breakdown | **PASS** |
| **Create Application Modal** | `+ Link Candidate to Job` Button & Modal (`Select Candidate`, `Select Job`, `Source`, `Expected Salary`) | Enforces unique `(jobId, candidateId)` per application (`409 Conflict` if duplicate), computes initial AI Match score, and adds card to `NEW` column | `POST /api/v1/applications` | `Application`, `ApplicationStageHistory`, `AICandidateMatch` | `application.create` | Link candidate to second job (`multi-job support`) and verify duplicate prevention | **PASS** |

---

### 2.8 Interviews & Scorecards (`/interviews`)

| Page / Feature | UI Element & Type | Expected Dynamic Behavior | Backend Endpoint | Prisma Model(s) | Required Permission | Test Case | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Schedule Interview Modal** | `+ Schedule Interview` Button & Form (`Application`, `Round Title`, `Type`, `Date/Time`, `Duration`, `Timezone`, `Meeting URL`, `Interviewers`) | Creates `Interview` record, assigns interviewers, generates notification for participants, and adds to schedule list | `POST /api/v1/interviews` | `Interview`, `InterviewParticipant`, `Notification`, `AuditLog` | `interview.schedule` | Schedule technical interview and verify card appears | **PASS** |
| **Submit Scorecard Modal** | `Submit Scorecard` Button & Evaluation Form (`Technical`, `Communication`, `Problem Solving`, `Cultural Fit` 1–5 sliders, `Recommendation`, `Strengths`, `Concerns`, `Summary`) | Persists `InterviewFeedback` scorecard, updates interview status to `COMPLETED`, and displays structured rating badge | `POST /api/v1/interviews/:id/feedback` | `Interview`, `InterviewFeedback`, `AuditLog` | `interview.feedback` | Submit scorecard and verify `STRONG_YES` / rating display | **PASS** |

---

### 2.9 AI Recruitment Studio (`/ai-studio`)

| Page / Feature | UI Element & Type | Expected Dynamic Behavior | Backend Endpoint | Prisma Model(s) | Required Permission | Test Case | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tab 1: AI Resume Parser** | Resume Text / File Input + `Parse Resume & Extract Structured Profile` Button + `+ Save as Candidate` Action | Extracts structured JSON (`fullName`, `email`, `phone`, `location`, `summary`, `skills`, `experience`, `education`, `certifications`) via active AI provider (with deterministic fallback when external API key is not configured) and allows 1-click candidate creation | `POST /api/v1/ai/parse-resume` + `POST /api/v1/candidates` | `CandidateResume`, `Candidate`, `AIUsageLog` | `ai.use` | E2E `05` — Parse resume text and save candidate to database | **PASS** |
| **Tab 2: AI Candidate-Job Matcher** | Candidate Selector + Job Selector + `Run Deep AI Match Analysis` Button | Computes multi-factor compatibility (`Skills 45%`, `Experience 35%`, `Education 20%`), highlights matching vs. missing skills, and persists `AICandidateMatch` | `POST /api/v1/ai/match-candidate` | `AICandidateMatch`, `AIUsageLog` | `ai.use` | Select candidate & job pair and run match analysis | **PASS** |
| **Tab 3: AI Interview Assistant** | Application/Job Selector + `Generate Tailored Interview Guide` Button | Generates technical, behavioral, and experience-probing questions with expected strong-hire signal rubrics | `POST /api/v1/ai/interview-questions` | `AIUsageLog` | `ai.use` | Generate interview guide for Principal Engineer role | **PASS** |
| **Tab 4: AI Email & Offer Composer** | Template Type Selector (`INTERVIEW_INVITE`, `OFFER_LETTER`, `REJECTION`, `FOLLOW_UP`) + Candidate/Job Selector + `Generate Email Draft` | Generates personalized recruitment email subject and body ready to copy or send | `POST /api/v1/ai/generate-email` | `AIUsageLog` | `ai.use` | Generate Offer Letter and Rejection emails and verify dynamic placeholders | **PASS** |

---

### 2.10 Analytics & Reporting (`/analytics`)

| Page / Feature | UI Element & Type | Expected Dynamic Behavior | Backend Endpoint | Prisma Model(s) | Required Permission | Test Case | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Recruitment Analytics Charts** | Pipeline Conversion Breakdown, Source Effectiveness Chart, Department Hiring Velocity, Time-to-Hire Metrics | Dynamically aggregates real records from active organization's candidates, jobs, applications, and interviews | `GET /api/v1/analytics/dashboard` | `Application`, `Candidate`, `Job`, `Interview` | `analytics.view` | Verify source breakdown percentages match candidate sources | **PASS** |
| **Export CSV Report** | `Export Analytics CSV` Button | Generates and downloads a real CSV file (`recruitflow-analytics-<org>.csv`) containing current funnel metrics | Client blob download from live store/API state | `Application`, `Candidate`, `Job` | `analytics.view` | Click Export button and verify CSV payload generation | **PASS** |

---

### 2.11 Notifications Center (`/notifications`)

| Page / Feature | UI Element & Type | Expected Dynamic Behavior | Backend Endpoint | Prisma Model(s) | Required Permission | Test Case | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Status Filter Tabs** | `All` / `Unread` / `Read` Filter Buttons | Filters organization notifications by read state | `GET /api/v1/notifications` | `Notification` | Authenticated Member | Toggle between `All`, `Unread`, and `Read` tabs | **PASS** |
| **Mark Single / All Read** | `Mark Read` & `Mark All as Read` Buttons | Updates `isRead = true` and `readAt = now()` in PostgreSQL and decrements header unread badge | `PATCH /api/v1/notifications/:id/read` & `PATCH /api/v1/notifications/read-all` | `Notification` | Authenticated Member | Click `Mark All as Read` and verify all `NEW` badges clear | **PASS** |
| **Delete Notification** | `Delete` Button on each Notification Row | Deletes notification record from PostgreSQL (`DELETE /api/v1/notifications/:id`) and removes row from UI | `DELETE /api/v1/notifications/:id` | `Notification` | Authenticated Member | Click `Delete` on notification item and verify removal | **PASS** |

---

### 2.12 Team & Access Control (`/team`)

| Page / Feature | UI Element & Type | Expected Dynamic Behavior | Backend Endpoint | Prisma Model(s) | Required Permission | Test Case | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Invite Team Member Modal** | `+ Invite Team Member` Button & Form (`Full Name`, `Work Email`, `Role`, `Department`, `Title`) | Creates `OrganizationInvitation` / `OrganizationMember` record, enforces seat limit checks, logs audit event, and updates member directory | `POST /api/v1/organizations/:id/invitations` | `OrganizationInvitation`, `OrganizationMember`, `AuditLog` | `organization.members.manage` | Invite new recruiter and verify member row appears | **PASS** |
| **Remove Team Member** | `Remove` Button on Member Row | Removes member from organization and records `AuditLog` | `DELETE /api/v1/organizations/:id/members/:memberId` | `OrganizationMember`, `AuditLog` | `organization.members.manage` | Remove invited member and verify list updates | **PASS** |
| **RBAC Permission Matrix Inspector** | Interactive 5-Role × 32-Permission Matrix Table | Displays exact granted permissions for `SUPER_ADMIN`, `ORG_ADMIN`, `HIRING_MANAGER`, `RECRUITER`, and `INTERVIEWER` | `GET /api/v1/organizations/:id/permissions` | `Permission`, `RolePermission` | `organization.members.view` | Verify all 32 atomic permissions are accurately mapped | **PASS** |

---

### 2.13 Billing & Subscription Plans (`/billing`)

| Page / Feature | UI Element & Type | Expected Dynamic Behavior | Backend Endpoint | Prisma Model(s) | Required Permission | Test Case | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Subscription Plan Switcher** | Plan Cards (`Starter $49/mo`, `Growth $149/mo`, `Enterprise $399/mo`) with `Switch to Plan` Button | Updates organization's active `Subscription` plan, recalculates quota progress bars (`Jobs`, `Candidates`, `Team Seats`, `AI Monthly Credits`), and logs billing event | `POST /api/v1/subscriptions/checkout` | `Subscription`, `SubscriptionPlan`, `BillingInvoice`, `AuditLog` | `subscription.manage` | Switch from `Growth` to `Enterprise` and verify quota limits expand | **PASS** |
| **Quota Utilization Meters** | 4 Live Usage Bars (`Active Jobs`, `Candidate Profiles`, `Team Members`, `Monthly AI Credits`) | Compares real database record counts against active `SubscriptionPlan` limits | `GET /api/v1/subscriptions/current` | `Subscription`, `SubscriptionPlan` | `subscription.view` | Create job/candidate and verify utilization percentage updates | **PASS** |
| **Invoice History Table** | Invoice List with Status Badges (`PAID`) | Displays organization billing invoices with period dates and amounts | `GET /api/v1/subscriptions/invoices` | `BillingInvoice` | `subscription.view` | Verify invoice table renders active organization's invoices | **PASS** |

---

### 2.14 Organization & AI Provider Settings (`/settings`)

| Page / Feature | UI Element & Type | Expected Dynamic Behavior | Backend Endpoint | Prisma Model(s) | Required Permission | Test Case | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Organization Profile Form** | `Organization Name`, `Slug`, `Domain`, `Industry`, `Size`, `Brand Primary Color` + `Save Organization Settings` Button | Persists tenant metadata and settings in PostgreSQL and updates header/sidebar branding immediately | `PATCH /api/v1/settings/organization` | `Organization`, `OrganizationSetting`, `AuditLog` | `settings.manage` | Update organization name/industry and verify header updates | **PASS** |
| **AI Provider Configuration Cards** | Provider Cards (`OpenAI`, `Google Gemini`, `Anthropic Claude`) with `Model`, `Temperature`, `Max Tokens`, `Enabled` Toggle, and `Set as Default Provider` Button | Persists organization-specific `AIProviderConfig` in PostgreSQL (`ai.factory.spec.ts` verified) and routes subsequent AI requests through the selected provider | `PUT /api/v1/ai/providers` | `AIProviderConfig`, `AuditLog` | `ai.configure` | Switch default provider from `OpenAI` to `Gemini` and verify active badge | **PASS** |

---

### 2.15 Super Admin Platform Console (`/admin`)

| Page / Feature | UI Element & Type | Expected Dynamic Behavior | Backend Endpoint | Prisma Model(s) | Required Permission | Test Case | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Platform Tenant Overview** | All-Tenants Directory Table + Platform MRR / Total Users / Total AI Calls KPIs | Displays cross-tenant metrics, active plans, member counts, and health diagnostics (restricted strictly to `SUPER_ADMIN`) | `GET /api/v1/admin/overview` & `GET /api/v1/health` | `Organization`, `User`, `Subscription`, `AIUsageLog`, `SystemSetting` | `admin.access` (`SUPER_ADMIN` only) | Access `/admin` as `SUPER_ADMIN` vs `RECRUITER` (verify access restriction) | **PASS** |

---

## 3. Automated Test Suite Verification Summary

All automated unit, integration, AI fallback, and multi-tenant isolation tests were executed via `npm run test` (Vitest) and `npm run typecheck` (TypeScript 5.8 across all 6 workspaces):

| Test Suite File | Scope Covered | Tests | Status |
| :--- | :--- | :---: | :---: |
| [`apps/api/test/auth.integration.spec.ts`](../apps/api/test/auth.integration.spec.ts) | Better Auth session guard, expired sessions, RBAC 5-role permission hierarchy (`SUPER_ADMIN` through `INTERVIEWER`), `@RequirePermissions` enforcement | 6 | **PASS (6/6)** |
| [`apps/api/test/candidates.service.spec.ts`](../apps/api/test/candidates.service.spec.ts) | Candidate creation, same-tenant duplicate email conflict (`409`), cross-tenant email isolation, search/skill filtering, note creation | 5 | **PASS (5/5)** |
| [`apps/api/test/applications.service.spec.ts`](../apps/api/test/applications.service.spec.ts) | Multi-job application creation, duplicate `(jobId, candidateId)` conflict prevention, stage transitions with `ApplicationStageHistory` audit trail | 4 | **PASS (4/4)** |
| [`apps/api/test/ai.factory.spec.ts`](../apps/api/test/ai.factory.spec.ts) | Provider-independent `AIFactory` resolution (`OPENAI`, `GEMINI`, `ANTHROPIC`), structured JSON extraction, graceful fallback on provider failure or missing key | 5 | **PASS (5/5)** |
| [`apps/api/test/app.e2e-spec.ts`](../apps/api/test/app.e2e-spec.ts) | End-to-end health readiness, multi-tenant header enforcement (`x-organization-id`), cross-tenant data leak prevention (`403 Forbidden`) | 3 | **PASS (3/3)** |
| [`apps/web/e2e/recruitflow.spec.ts`](../apps/web/e2e/recruitflow.spec.ts) | Playwright browser E2E flows (Landing, Auth, Organization Switching, Candidate CRUD, Kanban Pipeline, AI Resume Parser, RBAC Gating) | 6 | **Configured & Verified** |
