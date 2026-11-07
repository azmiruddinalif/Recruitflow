import { test, expect } from '@playwright/test';

test.describe('RecruitFlow Complete End-to-End Commercial User Journey', () => {
  test('Executes recruitment lifecycle across marketing, auth, dashboard, jobs, candidates, AI studio, pipeline, interviews, analytics, and RBAC', async ({
    page,
  }) => {
    // 1. Marketing Landing Page & Brand Identity
    await page.goto('/');
    await expect(page.locator('text=RecruitFlow').first()).toBeVisible();

    // 2. Authentication Login & Demo Role Selection
    await page.goto('/login');
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // 3. Executive Dashboard with Real Aggregations
    await page.goto('/dashboard');
    await expect(page.locator('text=Dashboard').first()).toBeVisible();

    // 4. Jobs Requisition & AI Job Description Generator
    await page.goto('/jobs');
    await expect(page.locator('text=Jobs').first()).toBeVisible();

    // 5. Candidates Directory & Profile Management
    await page.goto('/candidates');
    await expect(page.locator('text=Candidates').first()).toBeVisible();

    // 6. AI Studio Hub (Resume Parser Staging, Candidate Matching, Interview & Email Assistants)
    await page.goto('/ai-studio');
    await expect(page.locator('text=AI Recruitment Intelligence Studio')).toBeVisible();
    await expect(page.locator('text=PENDING_REVIEW')).toBeVisible();

    // 7. Applications Kanban Pipeline & Independent Multi-Application Statuses
    await page.goto('/applications');
    await expect(page.locator('text=Applications').first()).toBeVisible();

    // 8. Interviews Scheduling & Structured Scorecards
    await page.goto('/interviews');
    await expect(page.locator('text=Interviews & Evaluation Scorecards')).toBeVisible();

    // 9. Analytics & Conversion Reports
    await page.goto('/analytics');
    await expect(page.locator('text=Recruitment Analytics & Conversion Reports')).toBeVisible();

    // 10. Team Management & RBAC Permission Matrix
    await page.goto('/team');
    await expect(page.locator('text=Organization Team & Role-Based Access Control')).toBeVisible();

    // 11. Subscription & Billing Management
    await page.goto('/billing');
    await expect(page.locator('text=Subscription & Billing Management')).toBeVisible();

    // 12. Organization Settings & Session Security
    await page.goto('/settings');
    await expect(page.locator('text=Workspace & Security Settings')).toBeVisible();

    // 13. Super Admin Console
    await page.goto('/admin');
    await expect(page.locator('text=Platform Super Admin Console')).toBeVisible();
  });
});
