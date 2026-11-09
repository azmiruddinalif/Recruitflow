'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useRecruitFlow } from '@/stores/recruitflow-store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const { isAuthenticated, isSessionLoading } = useRecruitFlow();

  React.useEffect(() => {
    if (!isSessionLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isSessionLoading, isAuthenticated, router]);

  if (isSessionLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC]">
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex w-full flex-1 flex-col">{children}</div>
        </main>
      </div>
    </div>
  );
}
