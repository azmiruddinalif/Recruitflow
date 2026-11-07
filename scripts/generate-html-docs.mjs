import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const docsDir = path.join(rootDir, 'Documentation');
const licensesDir = path.join(rootDir, 'Licenses', 'third-party-licenses');

fs.mkdirSync(docsDir, { recursive: true });
fs.mkdirSync(licensesDir, { recursive: true });

const navPages = [
  { file: 'index.html', title: '1. Product Overview & Architecture' },
  { file: 'installation.html', title: '2. System Requirements & Installation' },
  { file: 'configuration.html', title: '3. Environment & SMTP Configuration' },
  { file: 'database-setup.html', title: '4. PostgreSQL, Redis, Prisma & Seed' },
  { file: 'authentication-setup.html', title: '5. Better Auth & Multi-Tenant RBAC' },
  { file: 'ai-provider-setup.html', title: '6. AI Providers (OpenAI, Gemini, Anthropic)' },
  { file: 'recruitment-modules.html', title: '7. Recruitment & ATS Modules Guide' },
  { file: 'billing-setup.html', title: '8. Stripe Billing & Self-Hosted Mode' },
  { file: 'deployment.html', title: '9. Production Deployment (Docker / Cloud)' },
  { file: 'customization.html', title: '10. Branding, Design Tokens & API' },
  { file: 'troubleshooting.html', title: '11. Troubleshooting, Backup & Upgrade' },
  { file: 'changelog.html', title: '12. Changelog & Third-Party Credits' },
];

function renderLayout(activeFile, pageTitle, bodyHtml) {
  const navLinks = navPages
    .map(
      (p) =>
        `<a href="${p.file}" class="nav-link ${p.file === activeFile ? 'active' : ''}">${p.title}</a>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pageTitle} — RecruitFlow Documentation</title>
  <style>
    :root {
      --primary: #4F46E5;
      --primary-hover: #4338CA;
      --bg: #F8FAFC;
      --surface: #FFFFFF;
      --text: #0F172A;
      --muted: #475569;
      --border: #E2E8F0;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.65;
      display: flex;
      min-height: 100vh;
    }
    aside {
      width: 290px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      padding: 24px 16px;
      flex-shrink: 0;
    }
    .brand {
      font-size: 20px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
      padding: 0 12px;
    }
    .brand span { color: var(--primary); }
    .version {
      font-size: 12px;
      color: var(--muted);
      padding: 0 12px 16px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
    }
    .nav-link {
      display: block;
      padding: 9px 12px;
      border-radius: 8px;
      color: var(--muted);
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    .nav-link:hover { background: #F1F5F9; color: var(--text); }
    .nav-link.active { background: #EEF2FF; color: var(--primary); font-weight: 600; }
    main {
      flex: 1;
      max-width: 960px;
      padding: 40px 48px;
    }
    h1 { font-size: 28px; margin-top: 0; letter-spacing: -0.02em; }
    h2 { font-size: 20px; margin-top: 32px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
    pre {
      background: #0F172A;
      color: #F8FAFC;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 13px;
    }
    code {
      font-family: "JetBrains Mono", Consolas, monospace;
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      background: var(--surface);
      border: 1px solid var(--border);
    }
    th, td {
      border: 1px solid var(--border);
      padding: 10px 14px;
      text-align: left;
      font-size: 13.5px;
    }
    th { background: #F1F5F9; font-weight: 600; }
    .callout {
      background: #EEF2FF;
      border-left: 4px solid var(--primary);
      padding: 14px 18px;
      border-radius: 6px;
      margin: 16px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <aside>
    <div class="brand">Recruit<span>Flow</span></div>
    <div class="version">Commercial Edition v1.0.0 (2026)</div>
    <nav>${navLinks}</nav>
  </aside>
  <main>
    <h1>${pageTitle}</h1>
    ${bodyHtml}
  </main>
</body>
</html>`;
}

const pageContents = {
  'index.html': `
    <p>Welcome to <strong>RecruitFlow</strong> — a commercial, self-hostable, multi-tenant <strong>AI-Powered Recruitment Management System & Applicant Tracking System (ATS)</strong> engineered with Next.js App Router, NestJS, PostgreSQL, Prisma ORM, Better Auth, Redis/BullMQ, and Tailwind CSS.</p>
    <div class="callout">
      <strong>Self-Hosted Independence Guarantee:</strong> RecruitFlow operates 100% independently on your own infrastructure with zero reliance on the original developer's servers.
    </div>
    <h2>Core Capabilities</h2>
    <ul>
      <li><strong>Multi-Tenant Organization Isolation:</strong> Server-enforced <code>OrganizationGuard</code> and 5-tier RBAC (<code>SUPER_ADMIN</code>, <code>ORG_ADMIN</code>, <code>HIRING_MANAGER</code>, <code>RECRUITER</code>, <code>INTERVIEWER</code>).</li>
      <li><strong>Better Auth Single Source of Truth:</strong> Email/password registration, session verification, password reset, two-factor authentication, and session revocation.</li>
      <li><strong>Complete Hiring Lifecycle:</strong> Candidates 360° profiles, Job requisitions, 9-stage Kanban & Table Application Pipeline, and Timezone-aware Interview Scorecards.</li>
      <li><strong>Provider-Independent AI Suite:</strong> Supports OpenAI, Google Gemini, and Anthropic Claude for Resume Parsing (with human review staging), Explainable Candidate Matching, Job Description Generation, Interview Question Rubrics, and Email Drafting.</li>
    </ul>`,
  'installation.html': `
    <h2>System Requirements & Supported Versions</h2>
    <table>
      <tr><th>Component</th><th>Supported Version</th><th>Notes</th></tr>
      <tr><td>Node.js</td><td>v20.11+ / v22.x LTS</td><td>Required for Web, API, and Worker</td></tr>
      <tr><td>PostgreSQL</td><td>15+ / 16+ / 18</td><td>Primary relational database via Prisma ORM</td></tr>
      <tr><td>Redis</td><td>6.2+ / 7.x</td><td>Used for BullMQ background job queues</td></tr>
    </table>
    <h2>Quick Installation Steps</h2>
    <pre><code>cp .env.example .env
npm install
npm run db:generate
npm run build:packages
npm run db:push
npm run db:seed
npm run dev</code></pre>`,
  'configuration.html': `
    <h2>Environment Configuration (<code>.env</code>)</h2>
    <p>Copy <code>.env.example</code> to <code>.env</code> in the project root. Key environment variables:</p>
    <pre><code>NODE_ENV=production
PORT=4000
WEB_URL=http://localhost:3000
API_URL=http://localhost:4000/api/v1
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/recruitflow?schema=public"
BETTER_AUTH_SECRET="replace-with-32-char-minimum-secret"
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000,http://localhost:4000
REDIS_URL="redis://localhost:6379"
STORAGE_PROVIDER=local
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_FROM="RecruitFlow <no-reply@yourdomain.com>"</code></pre>`,
  'database-setup.html': `
    <h2>PostgreSQL, Prisma Migrations & Demo Seeding</h2>
    <p>RecruitFlow uses Prisma ORM with 32 normalized models in <code>prisma/schema.prisma</code>.</p>
    <pre><code># Generate Prisma Client
npm run db:generate

# Apply schema migrations
npm run db:migrate

# Seed default roles, permissions, plans & demo organizations
npm run db:seed</code></pre>
    <h2>First Super Admin Setup</h2>
    <p>Running <code>npm run db:seed</code> provisions the initial Super Admin account (<code>admin@recruitflow.io</code> / <code>RecruitFlow@2026!</code>). Change this password immediately after first login in production.</p>`,
  'authentication-setup.html': `
    <h2>Better Auth & Multi-Tenant RBAC</h2>
    <p>Better Auth is the single source of truth for authentication. NestJS verifies sessions via <code>AuthGuard</code>, resolves tenant membership via <code>OrganizationGuard</code>, and enforces atomic permissions via <code>PermissionsGuard</code> and <code>@RequirePermissions(...)</code>.</p>
    <h2>Built-In Roles</h2>
    <ul>
      <li><strong>Super Admin:</strong> Platform-wide administration (<code>/admin</code>).</li>
      <li><strong>Organization Admin:</strong> Full workspace, team, billing, and ATS control.</li>
      <li><strong>Hiring Manager:</strong> Job creation, pipeline transitions, interview scheduling, scorecards, and analytics.</li>
      <li><strong>Recruiter:</strong> Candidate sourcing, AI resume parsing, application management, and interview coordination.</li>
      <li><strong>Interviewer:</strong> Scoped access to assigned interviews and scorecard submission.</li>
    </ul>`,
  'ai-provider-setup.html': `
    <h2>Configuring OpenAI, Google Gemini & Anthropic Claude</h2>
    <p>RecruitFlow decouples all business modules from individual AI SDKs through <code>AIFactory</code>. Configure keys via <code>.env</code> or in the <strong>Super Admin Console (/admin)</strong>:</p>
    <pre><code>DEFAULT_AI_PROVIDER=OPENAI
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...</code></pre>
    <h2>Human-in-the-Loop Safeguards</h2>
    <p>AI Resume Parsing always stages extracted candidate profiles as <code>PENDING_REVIEW</code> until a recruiter reviews, edits, and approves the data. AI Candidate Matching provides transparent skill/experience explanations and never automatically rejects candidates.</p>`,
  'recruitment-modules.html': `
    <h2>Recruitment & ATS Modules Guide</h2>
    <ul>
      <li><strong>Executive Dashboard:</strong> Real database aggregations for candidates, active jobs, funnel conversion, and upcoming interviews.</li>
      <li><strong>Candidate Management:</strong> 360° profiles, skills, work experience, education, certifications, notes, and versioned resumes.</li>
      <li><strong>Job Requisitions:</strong> Draft/Published/Paused/Closed lifecycle, required vs. preferred skills, and AI job description generation.</li>
      <li><strong>Application Pipeline:</strong> Interactive 9-stage Kanban Board and Table View. Supports multiple independent job applications per candidate.</li>
      <li><strong>Interviews & Scorecards:</strong> Timezone-aware panel scheduling and 1–5 criteria evaluation scorecards.</li>
    </ul>`,
  'billing-setup.html': `
    <h2>Stripe Billing & Self-Hosted Mode</h2>
    <p>When <code>STRIPE_SECRET_KEY</code> is left blank, RecruitFlow runs in <strong>Self-Hosted Licensing Mode</strong>, allowing full operation without requiring external payment setup.</p>
    <p>To enable commercial SaaS Stripe Checkout & Webhooks, configure:</p>
    <pre><code>STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...</code></pre>
    <p>Point your Stripe Webhook endpoint to <code>https://api.yourdomain.com/api/v1/subscriptions/webhook</code>.</p>`,
  'deployment.html': `
    <h2>Production Deployment</h2>
    <h3>Option 1: Docker Compose (All-in-One Stack)</h3>
    <pre><code>docker compose up -d --build
docker exec -it recruitflow-api npm run db:seed</code></pre>
    <h3>Option 2: Separate Cloud Deployment</h3>
    <ul>
      <li><strong>Next.js Frontend (<code>apps/web</code>):</strong> Deployable to Vercel, Docker, or Node.js server.</li>
      <li><strong>NestJS API (<code>apps/api</code>):</strong> Deployable to Railway, Render, AWS ECS, DigitalOcean, or VPS.</li>
      <li><strong>BullMQ Worker (<code>apps/worker</code>):</strong> Deployable as a standalone background process connected to Redis and PostgreSQL.</li>
    </ul>`,
  'customization.html': `
    <h2>Branding, Design Tokens & API Documentation</h2>
    <p>All UI colors and typography tokens are centralized in <code>apps/web/src/styles/globals.css</code> (default primary <code>#4F46E5</code>) and brand logos are located in <code>apps/web/public/logo/</code>.</p>
    <p>Interactive Swagger / OpenAPI documentation is served automatically at <code>http://localhost:4000/api/docs</code>.</p>`,
  'troubleshooting.html': `
    <h2>Troubleshooting, Backup & Upgrading</h2>
    <ul>
      <li><strong>AI Provider Not Configured Banner:</strong> Add a valid <code>OPENAI_API_KEY</code>, <code>GEMINI_API_KEY</code>, or <code>ANTHROPIC_API_KEY</code> in <code>.env</code> or Super Admin Console.</li>
      <li><strong>Database Backup:</strong> Run <code>pg_dump -Fc recruitflow &gt; recruitflow_backup.dump</code> regularly.</li>
      <li><strong>Upgrading:</strong> Pull new release files, run <code>npm install && npm run db:generate && npm run db:migrate && npm run build</code>.</li>
    </ul>`,
  'changelog.html': `
    <h2>Changelog & Third-Party Credits</h2>
    <h3>Version 1.0.0 (2026) — Initial Commercial Release</h3>
    <ul>
      <li>Complete multi-tenant Next.js + NestJS + PostgreSQL + Prisma + Better Auth architecture.</li>
      <li>18 full-stack recruitment modules including 5-tool AI Studio and interactive Kanban pipeline.</li>
      <li>Docker Compose stack, automated test suites, and CodeCanyon documentation package.</li>
    </ul>`,
};

for (const page of navPages) {
  const html = renderLayout(page.file, page.title, pageContents[page.file]);
  fs.writeFileSync(path.join(docsDir, page.file), html, 'utf8');
}

const thirdPartySource = fs.readFileSync(
  path.join(rootDir, 'docs', 'THIRD-PARTY-LICENSES.md'),
  'utf8',
);
fs.writeFileSync(
  path.join(licensesDir, 'THIRD-PARTY-LICENSES.md'),
  thirdPartySource,
  'utf8',
);

console.log('Generated 12 HTML documentation files in Documentation/ and Licenses/third-party-licenses/.');
