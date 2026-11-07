# RecruitFlow — UI/UX Design System Specification

> **Document Version**: 1.0.0  
> **Framework**: Tailwind CSS + shadcn/ui + Lucide React + Recharts  
> **Design Language**: Modern B2B Enterprise SaaS — Clean, Minimal, High-Signal, Accessible (WCAG 2.1 AA)

---

## 1. Visual Direction & Principles

RecruitFlow is designed for recruitment agencies, HR executives, and hiring teams who spend hours daily reviewing resumes, managing Kanban pipelines, and evaluating interview scorecards.
- **Clarity over Decoration**: No gratuitous neon gradients, heavy drop shadows, or cluttered cards. Hierarchy is achieved through crisp 1px borders (`#E2E8F0` in light mode, `#1E293B` in dark mode), subtle surface contrast, and disciplined typography.
- **Information Density with Breathing Room**: Tables, Kanban cards, and candidate profiles present key signals (match score, stage badge, skills, last activity) scannably without truncation traps.
- **Consistent Interactive Feedback**: Every form submission, AI action, and pipeline drag/transition provides clear optimistic or skeleton loading states, structured error banners, and toast confirmations.

---

## 2. Color System & Centralized CSS Tokens

All colors are defined as CSS custom properties in `apps/web/src/styles/globals.css` and mapped into Tailwind configuration so buyers can rebrand the entire product by editing a single token file.

### 2.1 Core Brand & Surface Palette (Light Theme Default)

| Token Role | Hex Value | Tailwind Equivalent | Usage |
| :--- | :--- | :--- | :--- |
| **Primary** | `#4F46E5` | `indigo-600` | Primary CTAs, active navigation indicators, focused rings, key brand accents |
| **Primary Hover** | `#4338CA` | `indigo-700` | Hover state for primary buttons and interactive links |
| **Primary Subtle** | `#EEF2FF` | `indigo-50` | Active sidebar item fill, selected table row highlight, AI feature badges |
| **Secondary / Accent** | `#0EA5E9` | `sky-500` | Secondary data visualization series, informational highlights |
| **Background (App)** | `#F8FAFC` | `slate-50` | Main application canvas background |
| **Surface (Card/Panel)**| `#FFFFFF` | `white` | Cards, modals, tables, slide-over drawers, top header |
| **Surface Muted** | `#F1F5F9` | `slate-100` | Kanban column tracks, code/JSON preview blocks, subtle table headers |
| **Text Primary** | `#0F172A` | `slate-900` | Headings, candidate names, job titles, primary metrics |
| **Text Secondary** | `#475569` | `slate-600` | Body copy, descriptions, table cell secondary data |
| **Text Muted** | `#94A3B8` | `slate-400` | Timestamps, placeholders, disabled labels |
| **Border Default** | `#E2E8F0` | `slate-200` | Card borders, table dividers, input outlines |

### 2.2 Dark Theme Palette

| Token Role | Hex Value | Tailwind Equivalent |
| :--- | :--- | :--- |
| **Background (App)** | `#090D16` | Custom deep slate |
| **Surface (Card/Panel)**| `#0F172A` | `slate-900` |
| **Surface Elevated** | `#1E293B` | `slate-800` |
| **Primary** | `#6366F1` | `indigo-500` |
| **Text Primary** | `#F8FAFC` | `slate-50` |
| **Text Secondary** | `#94A3B8` | `slate-400` |
| **Border Default** | `#1E293B` | `slate-800` |

### 2.3 Semantic & ATS Pipeline Stage Colors

| Status / Stage | Foreground | Background | Border |
| :--- | :--- | :--- | :--- |
| **Success / Hired / Strong Match (`>=80%`)** | `#15803D` (`green-700`) | `#F0FDF4` (`green-50`) | `#BBF7D0` (`green-200`) |
| **Warning / Assessment / Medium Match (`50–79%`)**| `#B45309` (`amber-700`) | `#FFFBEB` (`amber-50`) | `#FDE68A` (`amber-200`) |
| **Danger / Rejected / Low Match (`<50%`)** | `#B91C1C` (`red-700`) | `#FEF2F2` (`red-50`) | `#FECACA` (`red-200`) |
| **Info / Interview / Shortlisted** | `#1D4ED8` (`blue-700`) | `#EFF6FF` (`blue-50`) | `#BFDBFE` (`blue-200`) |
| **Offer Extended** | `#6D28D9` (`violet-700`) | `#F5F3FF` (`violet-50`) | `#DDD6FE` (`violet-200`) |
| **New / Screening / Withdrawn** | `#334155` (`slate-700`) | `#F8FAFC` (`slate-50`) | `#E2E8F0` (`slate-200`) |

---

## 3. Typography Scale

- **Primary Sans Font**: `Inter` (or system UI fallback `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`)
- **Monospace Font**: `JetBrains Mono` (used for API keys, webhook logs, match score numbers, reference IDs)

| Element | Size | Line Height | Weight | Tracking |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title (`h1`)** | `24px` (`1.5rem`) | `32px` | `600` (SemiBold) | `-0.02em` |
| **Section Header (`h2`)** | `18px` (`1.125rem`) | `28px` | `600` (SemiBold) | `-0.01em` |
| **Card Title (`h3`)** | `15px` (`0.9375rem`)| `22px` | `600` (SemiBold) | `0` |
| **Body Default** | `14px` (`0.875rem`) | `20px` | `400` (Regular) | `0` |
| **Table / Compact UI** | `13px` (`0.8125rem`)| `18px` | `500` (Medium) | `0` |
| **Caption / Badge** | `12px` (`0.75rem`) | `16px` | `500` (Medium) | `0.01em` |

---

## 4. Layout & Navigation Architecture

1. **App Shell (`apps/web/src/components/layout/`)**:
   - **Left Sidebar (`260px` fixed on desktop, collapsible drawer on mobile)**:
     - Organization Switcher dropdown at top (with organization logo, active plan badge, and "Create Organization" action).
     - Grouped Navigation:
       - *Core ATS*: Dashboard, Jobs, Candidates, Applications (Kanban & Table), Interviews
       - *Intelligence*: AI Resume Parser, AI Assistant Hub, Analytics & Reports
       - *Workspace*: Team Members, Notifications, Billing & Plans, Organization Settings
       - *Platform (visible only to Super Admin)*: Super Admin Console
   - **Top Header (`64px` height)**:
     - Global command search (`Ctrl+K` / `Cmd+K`), quick "+ New" action menu (New Job, Add Candidate, Schedule Interview), Notification Bell popover with unread badge, Theme Toggle, and User Profile Menu.
   - **Main Content Area**:
     - Max container width `1440px` with `24px` (`px-6`) horizontal padding on desktop, `16px` (`px-4`) on mobile.
     - Standardized `PageHeader` component displaying breadcrumb, title, subtitle, and primary action buttons.

---

## 5. Reusable Component Library (`apps/web/src/components/`)

- **UI Primitives (`components/ui/`)**: Button, Input, Textarea, Select, Dialog, Sheet/Drawer, DropdownMenu, Tabs, Badge, Avatar, Table, Pagination, Skeleton, Switch, Tooltip, Toast/Sonner.
- **Shared Domain Components (`components/shared/`)**:
  - `StatCard`: KPI card with metric value, period-over-period delta badge, and Lucide icon.
  - `DataTable`: Server-side paginated, sortable, filterable table with search bar, bulk actions, empty state, and loading skeleton rows.
  - `KanbanBoard`: Drag-and-drop / stage-actionable recruitment pipeline board displaying candidate cards, match score pills, and stage counts.
  - `AIMatchBadge`: Circular/pill score indicator (`0–100%`) with click-to-expand explainability drawer (matching skills, missing skills, experience summary).
  - `EmptyState`: Clean illustration/icon + clear title + explanation + direct CTA button.
  - `ConfirmDialog`: Destructive action safeguard with explicit confirmation.

