# RecruitFlow — AI-Powered Recruitment Management System & ATS

**RecruitFlow** is a commercial, self-hostable, multi-tenant **Applicant Tracking System (ATS)** and **AI-Powered Recruitment Management Platform** built with **Next.js (App Router)**, **NestJS**, **PostgreSQL**, **Prisma ORM**, **Better Auth**, **BullMQ**, and **Tailwind CSS**.

---

## Key Capabilities

- **Multi-Tenant Organization Architecture**: Strict server-side tenant isolation (`OrganizationGuard`), organization switching, custom branding, and team invitations.
- **5-Tier Role-Based Access Control (RBAC)**: Built-in `SUPER_ADMIN`, `ORG_ADMIN`, `HIRING_MANAGER`, `RECRUITER`, and `INTERVIEWER` roles with 32 atomic permissions enforced on every NestJS route via `@RequirePermissions(...)`.
- **Single Source of Truth Authentication**: Powered by **Better Auth** + PostgreSQL + Prisma with email/password, session management, 2FA support, and session revocation.
- **Complete Recruitment Lifecycle**:
  - **Candidates**: 360° candidate profiles, skills, work experience, education, certifications, notes, attachments, and versioned resumes.
  - **Jobs**: Requisition workflow (`DRAFT`, `PUBLISHED`, `PAUSED`, `CLOSED`, `ARCHIVED`), required/preferred skills, salary bands, and AI job description generation.
  - **Applications Pipeline**: Interactive **Kanban Board** and **Table View** across 9 stages (`NEW` → `HIRED`/`REJECTED`/`WITHDRAWN`). Supports multiple independent job applications per candidate.
  - **Interviews & Scorecards**: Timezone-aware scheduling, multi-interviewer panels, and structured 1–5 evaluation scorecards.
- **Provider-Independent AI Suite (`OpenAI`, `Google Gemini`, `Anthropic Claude`)**:
  - **AI Resume Parser**: Extracts structured candidate profiles into a `PENDING_REVIEW` staging workflow requiring human approval.
  - **Explainable AI Candidate Matching**: Evaluates skills, experience, and education alignment without demographic bias or automated rejection.
  - **AI Job Description Generator**, **AI Interview Question & Rubric Assistant**, and **AI Recruitment Email Assistant**.
- **Executive Analytics & Reporting**: Real database aggregations for hiring funnels, time-to-hire, source effectiveness, and recruiter activity.
- **Subscriptions, Stripe Billing & Self-Hosted Mode**: Full Stripe Checkout + Webhook integration with automatic graceful fallback to **Self-Hosted Licensing Mode** when Stripe is not configured.

---

## Quick Start

### 1. Install Dependencies & Build Workspace Packages
```bash
cp .env.example .env
npm install
npm run db:generate
npm run build:packages
```

### 2. Database Setup (PostgreSQL)
```bash
npm run db:push
npm run db:seed
```

### 3. Start Development Servers
```bash
npm run dev
```
- **Web Application**: `http://localhost:3000`
- **NestJS REST API**: `http://localhost:4000/api/v1`
- **Swagger API Documentation**: `http://localhost:4000/api/docs`

---

## Documentation Index

- [System Architecture](./docs/ARCHITECTURE.md)
- [Database Design & ERD](./docs/DATABASE-DESIGN.md)
- [Role & Permission Matrix](./docs/PERMISSION-MATRIX.md)
- [UI/UX Design System](./docs/DESIGN-SYSTEM.md)
- [Implementation Roadmap](./docs/IMPLEMENTATION-ROADMAP.md)
- [Installation Guide](./docs/installation/INSTALLATION-GUIDE.md)
- [Configuration Guide](./docs/configuration/CONFIGURATION-GUIDE.md)
- [REST API Reference](./docs/api/API-REFERENCE.md)
- [User & Admin Guide](./docs/user-guide/USER-GUIDE.md)
- [Third-Party Licenses](./docs/THIRD-PARTY-LICENSES.md)

