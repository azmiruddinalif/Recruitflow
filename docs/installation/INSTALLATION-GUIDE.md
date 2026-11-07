# RecruitFlow — Self-Hosted Installation Guide

> **Audience**: System Administrators, DevOps Engineers, and CodeCanyon Buyers  
> **Supported Environments**: Linux (Ubuntu 22.04/24.04 LTS), macOS, Windows Server / WSL2, Docker Compose, Vercel + Railway/Render

---

## 1. System Requirements

| Component | Minimum Requirement | Recommended Production |
| :--- | :--- | :--- |
| **Node.js** | `v20.11.0+` | `v22.x LTS` |
| **PostgreSQL** | `14+` | `16+` (Managed or Dedicated) |
| **Redis** | `6.2+` (Optional for sync dev, required for BullMQ worker) | `7.x` |
| **CPU / RAM** | 2 vCPU / 4 GB RAM | 4 vCPU / 8 GB RAM |
| **Disk Space** | 10 GB SSD | 50 GB+ SSD (or S3 object storage for resumes) |

---

## 2. Option A: One-Command Docker Compose Deployment (Recommended)

1. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set a strong `BETTER_AUTH_SECRET` (`openssl rand -base64 32`).

2. **Launch the Stack**:
   ```bash
   docker compose up -d --build
   ```

3. **Seed Initial Roles, Permissions & Demo Data**:
   ```bash
   docker exec -it recruitflow-api npm run db:seed
   ```

4. **Access RecruitFlow**:
   - **Web Application**: `http://localhost:3000`
   - **REST API (`/api/v1`)**: `http://localhost:4000/api/v1/health`
   - **Swagger OpenAPI Docs**: `http://localhost:4000/api/docs`

---

## 3. Option B: Manual / Bare-Metal Node.js Installation

### Step 1: Copy `.env.example` to `.env`
```bash
cp .env.example .env
```
Update `DATABASE_URL` in `.env` to point to your PostgreSQL database:
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/recruitflow?schema=public"
```

### Step 2: Install Dependencies & Build Shared Packages
```bash
npm install
npm run db:generate
npm run build:packages
```

### Step 3: Apply Database Schema & Seed Default Data
```bash
npm run db:push
npm run db:seed
```

### Step 4: Build & Start for Production
```bash
npm run build
# Start API (Port 4000), Web (Port 3000), and Worker
npm run start:api
npm run start:web
npm run start:worker
```
For development with hot-reloading across all workspaces:
```bash
npm run dev
```

---

## 4. Default Demo Credentials (Seeded via `npm run db:seed`)

| Role | Email | Password | Organization |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@recruitflow.io` | `RecruitFlow@2026!` | Platform & All Orgs |
| **Organization Admin** | `sarah.chen@talentscale.io` | `RecruitFlow@2026!` | TalentScale Global |
| **Hiring Manager** | `marcus.vance@talentscale.io` | `RecruitFlow@2026!` | TalentScale Global |
| **Recruiter** | `elena.rostova@talentscale.io` | `RecruitFlow@2026!` | TalentScale Global |
| **Interviewer** | `david.kim@talentscale.io` | `RecruitFlow@2026!` | TalentScale Global |

