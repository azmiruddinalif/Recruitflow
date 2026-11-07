# RecruitFlow — Configuration Guide (AI, Storage, Stripe, Better Auth)

---

## 1. Better Auth Configuration

RecruitFlow uses **Better Auth** as its single source of truth for authentication.
Configure these variables in `.env`:

```env
BETTER_AUTH_SECRET="your-minimum-32-character-cryptographic-secret"
BETTER_AUTH_URL=https://app.yourdomain.com
BETTER_AUTH_TRUSTED_ORIGINS=https://app.yourdomain.com,https://api.yourdomain.com
```

### Optional Social OAuth Providers
Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` or `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` in `.env` to enable social sign-in automatically.

---

## 2. AI Provider Configuration (OpenAI, Google Gemini, Anthropic)

RecruitFlow features a provider-independent AI architecture (`apps/api/src/modules/ai/ai.factory.ts`).
You can configure AI credentials either via **`.env`** or dynamically in the **Super Admin Console (`/admin`)**:

```env
DEFAULT_AI_PROVIDER=OPENAI # OPENAI | GEMINI | ANTHROPIC

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_DEFAULT_MODEL=gpt-4o-mini

# Google Gemini
GEMINI_API_KEY=AIza...
GEMINI_DEFAULT_MODEL=gemini-2.5-flash

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_DEFAULT_MODEL=claude-3-5-sonnet-latest
```

> **Behavior When No AI Key Is Configured**:  
> RecruitFlow never fakes AI output. If no API key is configured, AI endpoints return `AI_PROVIDER_NOT_CONFIGURED` and the UI displays an explicit configuration prompt directing administrators to add their API key.

---

## 3. File Storage (Local vs. S3-Compatible)

- **Local Development / Single-Server Mode (`STORAGE_DRIVER=local`)**:
  Resumes and attachments are stored outside the public web root in `./storage/uploads/<organizationId>/...`.
- **Production S3 / Cloudflare R2 / MinIO (`STORAGE_DRIVER=s3`)**:
  ```env
  STORAGE_DRIVER=s3
  S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
  S3_REGION=us-east-1
  S3_BUCKET=recruitflow-production
  S3_ACCESS_KEY_ID=AKIA...
  S3_SECRET_ACCESS_KEY=...
  S3_FORCE_PATH_STYLE=false
  ```

---

## 4. Stripe Billing vs. Self-Hosted Mode

- **Self-Hosted Mode (Default when `STRIPE_SECRET_KEY` is empty)**:
  All organizations operate under self-managed plans without requiring external payment gateway setup. Super Admins can assign any plan or custom limits to any organization.
- **Commercial SaaS Billing Mode (When `STRIPE_SECRET_KEY` is configured)**:
  ```env
  STRIPE_SECRET_KEY=sk_live_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```
  Configure your Stripe Webhook endpoint to point to:
  `https://api.yourdomain.com/api/v1/subscriptions/webhook`
  Listening to events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

