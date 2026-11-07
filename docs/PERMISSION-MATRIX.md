# RecruitFlow — Role & Permission Matrix Specification

> **Document Version**: 1.0.0  
> **Enforcement Layer**: NestJS `@RequirePermissions(...)` + `PermissionsGuard` + `OrganizationGuard` + `SuperAdminGuard`

---

## 1. Role Hierarchy Overview

RecruitFlow implements a two-tier authorization architecture:

1. **Platform Tier (`SUPER_ADMIN`)**:
   - Controlled via `User.isSuperAdmin === true` on the verified Better Auth user record.
   - Grants access to `/api/v1/admin/*` and the `/admin` console (managing all organizations, users, subscription plans, global AI provider configurations, system health, and global audit logs).
   - Super Admin status is **never** grantable via organization invitations or regular user endpoints.

2. **Organization Tier (Multi-Tenant RBAC)**:
   - Scoped strictly to a user's `OrganizationMember` record within the active `Organization`.
   - Every member is assigned one of the four standard organization roles (or a custom organization role):
     - **`ORG_ADMIN` (Organization Admin)**: Full administrative control over the organization, team members, billing, settings, jobs, candidates, applications, interviews, and AI tools.
     - **`HIRING_MANAGER` (Hiring Manager)**: Manages jobs, reviews candidates and applications, moves pipeline stages, schedules interviews, submits scorecards, uses AI assistants, and views recruitment analytics.
     - **`RECRUITER` (Recruiter)**: Day-to-day talent acquisition—creates/updates candidates, uploads and parses resumes with AI, manages job postings, manages applications across the Kanban pipeline, schedules interviews, and drafts AI communications.
     - **`INTERVIEWER` (Interviewer)**: Focused participant access—views assigned interviews and associated candidate/application packets, adds interview notes, and submits structured interview feedback/scorecards. Cannot delete candidates, alter billing, or modify organization settings.

---

## 2. Atomic Permission Matrix

Legend:
- `✅` Granted by default
- `🔒` Scoped to assigned records (e.g., interviews/applications where the user is an assigned participant)
- `—` Denied (`403 Forbidden`)

| Permission Code | Description | Super Admin (Platform) | Org Admin | Hiring Manager | Recruiter | Interviewer |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Candidates** | | | | | | |
| `candidates.read` | View candidate profiles, resumes, skills, history | ✅ | ✅ | ✅ | ✅ | 🔒 |
| `candidates.create` | Create candidates manually or via resume upload | ✅ | ✅ | ✅ | ✅ | — |
| `candidates.update` | Edit candidate profile, tags, notes, attachments | ✅ | ✅ | ✅ | ✅ | — |
| `candidates.delete` | Soft-delete or archive candidate records | ✅ | ✅ | — | — | — |
| **Jobs** | | | | | | |
| `jobs.read` | View jobs, requirements, and pipeline config | ✅ | ✅ | ✅ | ✅ | ✅ |
| `jobs.create` | Create new job requisitions | ✅ | ✅ | ✅ | ✅ | — |
| `jobs.update` | Edit job details, publish/unpublish, archive | ✅ | ✅ | ✅ | ✅ | — |
| `jobs.delete` | Delete/archive job requisitions | ✅ | ✅ | ✅ | — | — |
| **Applications** | | | | | | |
| `applications.read` | View job applications and stage history | ✅ | ✅ | ✅ | ✅ | 🔒 |
| `applications.create` | Attach/apply a candidate to a job | ✅ | ✅ | ✅ | ✅ | — |
| `applications.update` | Move pipeline stages, assign recruiter, add notes | ✅ | ✅ | ✅ | ✅ | — |
| `applications.delete` | Remove erroneous/duplicate job applications | ✅ | ✅ | — | — | — |
| **Interviews** | | | | | | |
| `interviews.read` | View scheduled interviews and details | ✅ | ✅ | ✅ | ✅ | 🔒 |
| `interviews.schedule` | Schedule, reschedule, or cancel interviews | ✅ | ✅ | ✅ | ✅ | — |
| `interviews.feedback` | Submit and edit interview scorecards & feedback | ✅ | ✅ | ✅ | ✅ | ✅ |
| **AI Capabilities** | | | | | | |
| `ai.resume_parse` | Parse uploaded PDF/DOCX resumes using AI | ✅ | ✅ | ✅ | ✅ | — |
| `ai.candidate_match`| Run explainable AI candidate-to-job matching | ✅ | ✅ | ✅ | ✅ | — |
| `ai.job_generate` | Generate job descriptions with AI | ✅ | ✅ | ✅ | ✅ | — |
| `ai.interview_assist`| Generate interview questions & summarize notes | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ai.email_assist` | Generate recruitment email drafts with AI | ✅ | ✅ | ✅ | ✅ | — |
| **Analytics & Reports** | | | | | | |
| `analytics.read` | View dashboard KPIs, funnels, and hiring reports | ✅ | ✅ | ✅ | ✅ | — |
| **Organization & Team** | | | | | | |
| `organization.read` | View organization profile and basic settings | ✅ | ✅ | ✅ | ✅ | ✅ |
| `organization.manage`| Edit organization profile, logo, settings, AI config| ✅ | ✅ | — | — | — |
| `members.read` | View organization team directory | ✅ | ✅ | ✅ | ✅ | ✅ |
| `members.manage` | Invite members, revoke invitations, change roles, remove members | ✅ | ✅ | — | — | — |
| **Subscription & Billing** | | | | | | |
| `billing.read` | View current plan, usage counters, and invoices | ✅ | ✅ | — | — | — |
| `billing.manage` | Upgrade/downgrade plans, launch Stripe Checkout | ✅ | ✅ | — | — | — |
| **Platform Administration** | | | | | | |
| `admin.organizations`| Manage all tenant organizations | ✅ | — | — | — | — |
| `admin.users` | Manage all platform users & deactivate accounts | ✅ | — | — | — | — |
| `admin.plans` | Create/edit subscription plans & limits | ✅ | — | — | — | — |
| `admin.ai` | Configure global AI providers & monitor token usage | ✅ | — | — | — | — |
| `admin.system` | View audit logs and system health diagnostics | ✅ | — | — | — | — |

---

## 3. Server-Side Enforcement Rules

1. **Zero Trust for Client Claims**:
   - The backend never reads `role` or `permissions` from request headers, query params, or JSON bodies.
   - `OrganizationGuard` queries `OrganizationMember` joined with `Role` and `RolePermission` -> `Permission` for `(userId, activeOrganizationId)`.
2. **Decorator Usage in Controllers**:
   ```typescript
   @Controller('api/v1/candidates')
   @UseGuards(AuthGuard, OrganizationGuard, PermissionsGuard)
   export class CandidatesController {
     @Get()
     @RequirePermissions('candidates.read')
     findAll(@CurrentOrg() org: AuthenticatedOrganization, @Query() query: CandidateQueryDto) {
       return this.candidatesService.findAll(org.id, query);
     }
   }
   ```
3. **Interviewer Scoped Access (`🔒`)**:
   - When a user's role is `INTERVIEWER`, service queries for `interviews`, `applications`, and `candidates` automatically filter to records where an `InterviewParticipant` entry exists for `userId = currentUser.id` within `organizationId = currentOrg.id`.
4. **Last Admin Protection**:
   - `MembersService` prevents removing or demoting the last active `ORG_ADMIN` of an organization to avoid orphaned workspaces.

