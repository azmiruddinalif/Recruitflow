import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileSearch,
  Kanban,
  Layers,
  Lock,
  Sparkles,
  Users2,
} from 'lucide-react';

const FEATURES = [
  {
    title: 'AI Resume Parser & Structured Extraction',
    description:
      'Upload PDF or DOCX resumes and extract validated skills, employment history, education, and certifications into clean JSON ready for recruiter approval.',
    icon: FileSearch,
  },
  {
    title: 'Explainable AI Candidate Matching (0–100%)',
    description:
      'Multi-criteria scoring across required skills, seniority, and education with transparent matching vs. missing skill breakdowns.',
    icon: Sparkles,
  },
  {
    title: 'Multi-Stage Kanban & Table Pipeline',
    description:
      'Track candidates across 9 standard recruitment stages with full audit history, recruiter assignments, and instant stage transitions.',
    icon: Kanban,
  },
  {
    title: 'Structured Interview Scorecards',
    description:
      'Coordinate multi-interviewer panels, generate role-specific technical & behavioral rubrics, and capture 1–5 weighted hiring recommendations.',
    icon: Users2,
  },
  {
    title: 'Multi-Tenant RBAC & Workspace Isolation',
    description:
      'Purpose-built for agencies and enterprise HR teams with 5 system roles (Super Admin, Org Admin, Hiring Manager, Recruiter, Interviewer).',
    icon: Lock,
  },
  {
    title: 'Executive Funnel & Velocity Analytics',
    description:
      'Real-time conversion ratios, time-to-hire benchmarks, source attribution, and recruiter productivity reporting.',
    icon: BarChart3,
  },
];

interface PublicPlan {
  code: string;
  name: string;
  description: string;
  priceMonthlyCents: number;
  maxJobs: number;
  maxCandidates: number;
  maxMembers: number;
  aiCreditsMonthly: number;
  features: string[];
  sortOrder: number;
}

// Server-rendered: fetched from the real, admin-editable SubscriptionPlan
// table (Super Admin Console -> Plan Management) rather than hardcoded copy,
// so the public pricing section can never drift from what Billing actually
// charges.
async function getPublicPlans(): Promise<PublicPlan[]> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  try {
    const res = await fetch(`${apiBase.replace(/\/$/, '')}/subscriptions/plans`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: PublicPlan[] };
    return (json.data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return [];
  }
}

function formatPlanPrice(cents: number): string {
  return cents === 0 ? '$0' : `$${Math.round(cents / 100)}`;
}

export default async function MarketingLandingPage() {
  const plans = await getPublicPlans();
  const highlightIndex = Math.floor(plans.length / 2);
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F46E5] text-sm font-bold text-white">
              RF
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900">
              RecruitFlow
            </span>
            <span className="rounded-md border border-indigo-200 bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#4F46E5]">
              Enterprise AI ATS
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900">
              Platform Capabilities
            </a>
            <a href="#ai-engine" className="hover:text-slate-900">
              AI Studio
            </a>
            <a href="#pricing" className="hover:text-slate-900">
              Pricing & Licensing
            </a>
            <Link href="/admin" className="hover:text-slate-900">
              Admin Console
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4338CA]"
            >
              <span>Launch Live Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-[#E2E8F0] bg-white py-20">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-[#EEF2FF] px-3.5 py-1 text-xs font-semibold text-[#4F46E5]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Multi-Provider AI Orchestration · OpenAI · Gemini · Claude</span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Precision AI Recruitment &amp; Applicant Tracking for Modern Hiring Teams
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 leading-relaxed">
            Parse unstructured resumes into clean candidate profiles, compute explainable 0–100% job match scores, orchestrate multi-stage Kanban pipelines, and standardize interview scorecards in one enterprise-ready SaaS platform.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#4F46E5] px-6 text-sm font-semibold text-white hover:bg-[#4338CA] shadow-xs"
            >
              <span>Open Interactive Live Demo</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/ai-studio"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Sparkles className="h-4 w-4 text-[#4F46E5]" />
              <span>Explore AI Studio Hub</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <span>Test 5 RBAC Demo Accounts</span>
            </Link>
          </div>

          {/* Executive Preview Strip */}
          <div className="mt-14 grid grid-cols-2 gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 text-left sm:grid-cols-4">
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-slate-500">AI Match Accuracy</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">96.4%</p>
              <p className="mt-0.5 text-[11px] text-emerald-700">Explainable skill breakdown</p>
            </div>
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-slate-500">Resume Extraction</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">&lt; 1.2s</p>
              <p className="mt-0.5 text-[11px] text-slate-500">PDF &amp; DOCX to Zod JSON</p>
            </div>
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-slate-500">Pipeline Stages</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">9 Stages</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Kanban + Table dual view</p>
            </div>
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-slate-500">Tenant Isolation</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">5 RBAC Roles</p>
              <p className="mt-0.5 text-[11px] text-[#4F46E5]">32 granular permissions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#4F46E5]">
            End-to-End Recruitment Operating System
          </span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Engineered for High-Velocity Talent Acquisition Teams
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Every workflow is built around structured data, human-in-the-loop AI verification, and multi-tenant enterprise governance.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="rounded-xl border border-[#E2E8F0] bg-white p-6 transition-colors hover:border-slate-300"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {feat.title}
                </h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* AI Engine Highlight */}
      <section id="ai-engine" className="border-y border-[#E2E8F0] bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-[#4F46E5]">
                <Layers className="h-3.5 w-3.5" />
                Provider-Agnostic AI Architecture
              </span>
              <h2 className="mt-4 text-2xl font-semibold text-slate-900">
                5 Specialized AI Recruitment Copilots with Human Approval Controls
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Switch seamlessly between OpenAI GPT-4o, Google Gemini 2.0 Pro, and Anthropic Claude 3.7 Sonnet. Every AI output is validated against strict Zod schemas before saving.
              </p>
              <ul className="mt-6 space-y-3 text-xs text-slate-700">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>AI Resume Parser:</strong> Side-by-side extraction &amp; manual field verification before saving candidate records.
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>AI Candidate Matcher:</strong> Multi-dimensional 0–100% scoring with matching vs. missing skill tags.
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>AI Job Description &amp; Interview Generator:</strong> Instant role requirements, structured rubrics, and tailored candidate outreach emails.
                  </span>
                </li>
              </ul>
              <div className="mt-7">
                <Link
                  href="/ai-studio"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#4F46E5] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#4338CA]"
                >
                  <span>Try AI Studio Live</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <span className="text-xs font-semibold text-slate-900">
                  Sample Explainable AI Match Output
                </span>
                <span className="rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-2 py-0.5 font-mono text-xs font-semibold text-[#15803D]">
                  96% Strong Match
                </span>
              </div>
              <div className="mt-4 space-y-3 text-xs">
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-3.5">
                  <p className="font-semibold text-slate-900">
                    Sophia Lin → Principal Distributed Systems Engineer
                  </p>
                  <p className="mt-1 text-slate-600">
                    8 years experience at Datadog &amp; Stripe · M.S. CS Stanford University
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                    <p className="text-[11px] text-slate-500">Skills Alignment</p>
                    <p className="mt-0.5 font-mono text-base font-semibold text-slate-900">
                      98 / 100
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                    <p className="text-[11px] text-slate-500">Seniority Fit</p>
                    <p className="mt-0.5 font-mono text-base font-semibold text-slate-900">
                      95 / 100
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                    <p className="text-[11px] text-slate-500">Education Fit</p>
                    <p className="mt-0.5 font-mono text-base font-semibold text-slate-900">
                      94 / 100
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#4F46E5]">
            Flexible SaaS Subscriptions &amp; Self-Hosted Licensing
          </span>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Transparent Plans Built for Every Stage of Hiring Growth
          </h2>
        </div>

        {plans.length === 0 ? (
          <p className="mt-10 text-center text-sm text-slate-500">
            Pricing plans are not configured yet. Check back soon.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {plans.map((plan, index) => {
              const highlighted = index === highlightIndex;
              return (
                <div
                  key={plan.code}
                  className={`flex flex-col justify-between rounded-xl border bg-white p-6 ${
                    highlighted ? 'border-[#4F46E5] ring-1 ring-[#4F46E5]' : 'border-[#E2E8F0]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-900">{plan.name}</h3>
                      {highlighted && (
                        <span className="rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-semibold text-[#4F46E5]">
                          Most Popular
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-semibold text-slate-900">
                        {formatPlanPrice(plan.priceMonthlyCents)}
                      </span>
                      <span className="text-xs text-slate-500">/month</span>
                    </div>
                    <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#4F46E5] shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    href="/billing"
                    className={`mt-8 inline-flex h-10 w-full items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                      highlighted
                        ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                        : 'border border-[#E2E8F0] bg-[#F8FAFC] text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    Get Started with {plan.name}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#4F46E5] text-xs font-bold text-white">
              RF
            </div>
            <span className="text-xs font-semibold text-slate-900">
              RecruitFlow Enterprise v1.0.0
            </span>
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} RecruitFlow Inc. Multi-Tenant AI Recruitment &amp; ATS Platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
