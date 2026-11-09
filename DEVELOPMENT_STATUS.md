# RecruitFlow — Development Status & Engineering Log

> **Last Updated**: 2026-11-09  
> **Active Phase**: Frontend Data Layer Rebuilt on Real Backend Calls; CodeCanyon Compliance Docs, Stripe Billing, and Super Admin Depth Still Outstanding  
> **Project Root**: `E:\recruitflow`

---

## 1. Phase Completion Summary

| Phase | Name | Status | Notes |
| :--- | :--- | :---: | :--- |
| **Phase 1** | Repository Inspection & Architecture | ✅ Completed | All 5 architecture specifications (`ARCHITECTURE.md`, `DATABASE-DESIGN.md`, `PERMISSION-MATRIX.md`, `DESIGN-SYSTEM.md`, `IMPLEMENTATION-ROADMAP.md`) and 32-model `prisma/schema.prisma` completed. |
| **Phase 2** | Foundation (Monorepo, Prisma, Better Auth, NestJS Core, UI Shell) | ✅ Completed | Shared packages (`@recruitflow/types`, `@recruitflow/shared`, `@recruitflow/validation`, `@recruitflow/config`), Better Auth integration, RBAC & Organization guards, and Next.js design system shell completed. |
| **Phase 3** | Product Modules (Modules 1–18) | ✅ Completed | All 18 backend & frontend modules implemented (`Auth`, `Users`, `Organizations`, `Team`, `Dashboard`, `Candidates`, `Jobs`, `Applications`, `Interviews`, `AI Resume Parser`, `AI Candidate Matching`, `AI Job Generator`, `AI Interview Assistant`, `AI Email Assistant`, `Notifications`, `Analytics`, `Subscriptions/Billing`, `Super Admin`). |
| **Phase 4** | Integration, Security & Automated QA | ✅ Completed | `npm run typecheck` passed across all 6 workspaces (`0` errors); `npm run test` passed all 5 test suites (`14/14` unit & E2E security tests). |
| **Phase 5** | Commercial Release & CodeCanyon Package | ⚠️ Partially Completed | Docker Compose stack, Dockerfiles, and installer scripts exist, but `docs/CODECANYON-COMPLIANCE.md` and `docs/RELEASE-CHECKLIST.md` — both mandated by the project spec — do not exist yet. Not yet verified against current Envato marketplace requirements. |

---

## 2. 2026-11-08 — AI Feature Audit & Remediation

An audit found that while the backend AI module (`apps/api/src/modules/ai/**`) genuinely called OpenAI/Gemini/Anthropic over HTTP with real validation, usage tracking, and quota checks, the **AI Studio frontend page was a disconnected mockup**: it never called any `/ai/*` endpoint, candidate-job match scores shown throughout the app were a hardcoded client-side point formula (`computeExplainableMatch`, now removed), and `docs/FUNCTIONALITY-MATRIX.md` had marked all of this "PASS" incorrectly. Separately, AI provider API keys were stored in **plaintext** in Postgres despite an unused `AI_ENCRYPTION_KEY` env var implying encryption.

Fixed in this pass:
- AI Studio page rewired to call the real backend for all 5 features via TanStack Query (no more hardcoded demo data).
- Added a 6th feature, **AI Candidate Summary**, matching the spec (`ai.candidate_summary` permission, schema, service, route, UI tab).
- Applications no longer get a fabricated match score on creation — they show "Run AI Match" until a real AI call is made and persisted.
- Provider API keys are now encrypted at rest (AES-256-GCM, `AI_ENCRYPTION_KEY`) and only ever returned to the browser masked.
- Added org-level AI provider key configuration (`GET/PUT /api/v1/settings/ai-providers`) — previously only a Super-Admin-only global key endpoint existed; org admins had no way to configure their own key despite the UI implying they could.
- Resume parsing now enqueues onto the existing (previously unused) BullMQ `resume-parse` queue when Redis is reachable, with a synchronous fallback — satisfying "background processing for long-running operations" without discarding the worker's existing processor.
- Provider errors (invalid key, rate limit, timeout) are now classified into specific HTTP responses instead of a bare masked 500.
- Verified live end-to-end against a real Postgres + Redis + API process: clean `AI_PROVIDER_NOT_CONFIGURED` errors with no key, encrypted key at rest confirmed via direct DB read, masked key over the API, and a real (failing, as expected with a dummy key) outbound provider call once a key is configured.

Known follow-ups not addressed in this pass (flagged, not fixed, to keep this change bounded):
- `docs/CODECANYON-COMPLIANCE.md` and `docs/RELEASE-CHECKLIST.md` are still missing.
- `npm run dev`'s `tsx watch` hung on API/worker boot in this environment for unclear reasons (unrelated to this change — `node dist/...` boots the identical compiled output instantly). Worth a separate look if it recurs.

---

## 3. 2026-11-09 — Frontend Data Layer Rewrite (Store → Real Backend)

Following up on the AI remediation above, a full audit of `apps/web/src/stores/recruitflow-store.tsx` found the fire-and-forget pattern flagged on 2026-11-08 was not limited to AI — it was the architecture of the **entire frontend**: every domain (candidates, jobs, applications, interviews, team, notifications, billing, admin) posted to the real backend but discarded the response, with the UI actually reading from a parallel `localStorage`-backed mock state tree seeded from hardcoded demo data. Login itself was fake (`DEMO_ACCOUNTS` didn't match the real seeded users; the submit handler never called the sign-in endpoint; a header dropdown let any user instantly become `SUPER_ADMIN` client-side). The Kanban board was a legitimate exception — it already used real `@dnd-kit` drag/drop with real backend persistence.

Rebuilt in this pass:
- **Real session/auth layer** (`features/auth/use-session.ts`): login, register, sign-out, and org-switching now call the real Better Auth endpoints; `DEMO_ACCOUNTS` corrected to match `prisma/seed.ts`; the fake client-side RBAC role switcher was removed from the header.
- **Real TanStack Query hooks per domain**, replacing the store's local arrays: `features/candidates`, `features/jobs`, `features/applications` (with optimistic update + automatic rollback on the Kanban drag/status endpoints), `features/interviews`, `features/team`, `features/notifications`, `features/billing`, `features/admin`, `features/organizations`, `features/analytics`.
- Every dashboard page (`dashboard`, `candidates`, `jobs`, `applications`, `interviews`, `team`, `notifications`, `billing`, `settings`, `admin`) and shared layout (`header.tsx`, `sidebar.tsx`) rewired to these hooks. `recruitflow-store.tsx` now holds only session-derived identity, the active organization, and toasts — no more fake domain data.
- Fixed a real backend bug found along the way: `analytics.service.ts`'s `hiringTrends` (dashboard's "Hiring Velocity" chart) was a fabricated formula over 6 hardcoded month labels, not a real historical query. Replaced with a genuine monthly aggregation from `appliedAt`/`scheduledAt`/`hiredAt`.
- **Root-cause bug fixed**: `api-client.ts` read a `rf_active_org_id` value out of `localStorage` and sent it as an `X-Organization-Id` header, which the backend's `OrganizationGuard` treats as an override that takes precedence over the session's real active organization. A leftover value from the old fake store (the hardcoded id `org_acme_cloud`) silently 403'd *every* authenticated request after login in a browser that had used the app before this fix. Fixed by dropping the header entirely (the backend already resolves the correct org from the session cookie) and adding a one-time cleanup of the old store's legacy `localStorage` keys.
- Verified live end-to-end in a real browser against the real API/Postgres/Redis stack: fresh login, dashboard KPIs/funnel/velocity chart/upcoming interviews/audit feed, Kanban board (real cards, real "Run AI Match" triggering a real 503 with no provider configured), Settings (real org profile + AI provider cards), and Team (all 5 real seeded members with real RBAC permission lists) all confirmed showing genuine database-backed data with zero console errors.

Known follow-ups not addressed in this pass:
- Stripe billing is still the self-hosted-mode path only (`subscriptions.service.ts`'s `changePlan` returns `requiresCheckout: true` without creating a real Stripe Checkout session; no webhook signature verification or idempotency yet).
- The Super Admin console now reads/writes real data but is still missing: platform-wide AI usage/storage overview, deeper plan management, and platform configuration screens called for in the original spec.
- No automated test coverage was added for the new frontend hooks (verification so far is live manual walkthrough + the existing backend test suite, which is unaffected by this frontend-only change plus the one backend `analytics.service.ts` fix).
- `docs/FUNCTIONALITY-MATRIX.md` still needs a full page-by-page pass to re-verify every row against this rewrite (only the AI Studio section was corrected on 2026-11-08).
- A full responsive/accessibility audit (320px–1920px) has not been performed.
