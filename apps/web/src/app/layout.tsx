import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { AppProviders } from './providers';

export const metadata: Metadata = {
  title: 'RecruitFlow — Enterprise AI Recruitment & Applicant Tracking System',
  description:
    'Multi-tenant B2B AI Recruitment SaaS platform with structured resume parsing, explainable candidate matching, Kanban pipelines, and interview scorecards.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RecruitFlow',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#4F46E5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#F8FAFC] text-[#0F172A] antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
