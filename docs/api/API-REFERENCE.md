# RecruitFlow — REST API Reference (`/api/v1`)

> **Interactive OpenAPI / Swagger UI**: Available at `http://localhost:4000/api/docs` when the API server is running.

---

## 1. Response Envelope Standard

All `/api/v1/*` endpoints return a deterministic JSON envelope:

### Success Response (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "message": "Candidate created successfully",
  "data": {
    "id": "cand_01",
    "fullName": "Sophia Martinez"
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 48,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Error Response (`400` / `401` / `403` / `404` / `422` / `500`)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

---

## 2. Core Endpoints Summary

| Method | Endpoint | Permission Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Public | System, database, storage, and AI health check |
| `POST` | `/api/v1/auth/register` | Public | Register user account & initial organization |
| `POST` | `/api/v1/auth/login` | Public | Authenticate via Better Auth & issue session |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revoke current Better Auth session |
| `GET` | `/api/v1/auth/session` | Authenticated | Verify session & return user + organizations |
| `GET` | `/api/v1/organizations` | Authenticated | List organizations the user belongs to |
| `POST` | `/api/v1/organizations` | Authenticated | Create a new multi-tenant organization |
| `POST` | `/api/v1/organizations/invitations` | `members.manage` | Invite a team member with role assignment |
| `GET` | `/api/v1/candidates` | `candidates.read` | Paginated, searchable candidate directory |
| `POST` | `/api/v1/candidates` | `candidates.create` | Create candidate with skills, experience, education |
| `PATCH` | `/api/v1/candidates/:id` | `candidates.update` | Update candidate profile |
| `DELETE` | `/api/v1/candidates/:id` | `candidates.delete` | Soft-delete candidate profile |
| `GET` | `/api/v1/jobs` | `jobs.read` | List jobs with applicant counts & skill tags |
| `POST` | `/api/v1/jobs` | `jobs.create` | Create job requisition |
| `PATCH` | `/api/v1/jobs/:id` | `jobs.update` | Update job details or publish/archive status |
| `GET` | `/api/v1/applications` | `applications.read` | List applications (Kanban grouped or table view) |
| `POST` | `/api/v1/applications` | `applications.create` | Apply a candidate to a job (prevents duplicates) |
| `PATCH` | `/api/v1/applications/:id/status` | `applications.update` | Transition application stage & log history |
| `GET` | `/api/v1/interviews` | `interviews.read` | List scheduled interviews (scoped for Interviewers) |
| `POST` | `/api/v1/interviews` | `interviews.schedule` | Schedule interview with timezone & panel |
| `POST` | `/api/v1/interviews/:id/feedback` | `interviews.feedback` | Submit structured interview scorecard |
| `POST` | `/api/v1/ai/parse-resume` | `ai.resume_parse` | Extract & structure resume into `PENDING_REVIEW` |
| `POST` | `/api/v1/ai/parse-resume/:id/approve`| `candidates.create` | Approve reviewed AI resume extraction & save |
| `POST` | `/api/v1/ai/match-candidate` | `ai.candidate_match` | Compute explainable AI job-candidate match |
| `POST` | `/api/v1/ai/generate-job-description`| `ai.job_generate` | Generate editable job description |
| `POST` | `/api/v1/ai/interview-questions` | `ai.interview_assist` | Generate role-specific interview questions |
| `POST` | `/api/v1/ai/generate-email` | `ai.email_assist` | Draft candidate hiring email |
| `GET` | `/api/v1/analytics/dashboard` | `analytics.read` | Real-time dashboard KPIs & funnel metrics |
| `GET` | `/api/v1/analytics/reports` | `analytics.read` | Time-to-hire, source conversion, recruiter stats |
| `GET` | `/api/v1/subscriptions/current` | `billing.read` | Active subscription plan, quotas, and invoices |
| `GET` | `/api/v1/admin/overview` | `SUPER_ADMIN` | Platform-wide Super Admin metrics & controls |

