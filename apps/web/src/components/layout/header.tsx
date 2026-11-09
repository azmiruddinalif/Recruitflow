'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Briefcase,
  Building2,
  Calendar,
  Check,
  LogOut,
  Menu,
  Plus,
  Search,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications/use-notifications';
import { useCandidatesList } from '@/features/candidates/use-candidates';
import { useJobsList } from '@/features/jobs/use-jobs';
import { useSignOut } from '@/features/auth/use-session';
import { useRecruitFlow } from '@/stores/recruitflow-store';
import { getInitials } from '@/lib/utils';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const { currentUser, activeOrganization, organizations, switchOrganization } = useRecruitFlow();
  const signOut = useSignOut();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [showQuickCreate, setShowQuickCreate] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = React.useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const notificationsQuery = useNotifications();
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const notifications = notificationsQuery.data?.notifications ?? [];
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const searchActive = debouncedQuery.trim().length > 0;
  const candidatesQuery = useCandidatesList({ search: searchActive ? debouncedQuery : undefined });
  const jobsQuery = useJobsList({ search: searchActive ? debouncedQuery : undefined });
  const filteredCandidates = searchActive ? (candidatesQuery.data?.data ?? []).slice(0, 4) : [];
  const filteredJobs = searchActive ? (jobsQuery.data?.data ?? []).slice(0, 3) : [];

  const handleSignOut = async () => {
    await signOut.mutateAsync();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-2 border-b border-[#E2E8F0] bg-white px-3 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50 lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Global Search Bar */}
      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setShowSearchDropdown(true)}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 180)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates, jobs, skills..."
            className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:bg-white focus:outline-none"
          />
        </div>

        {/* Live Search Results Dropdown */}
        {showSearchDropdown && searchActive && (
          <div className="absolute left-0 top-11 z-50 w-full rounded-xl border border-[#E2E8F0] bg-white p-2 shadow-xl">
            {filteredCandidates.length === 0 && filteredJobs.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-500">
                No matching candidates or jobs found for &ldquo;{searchQuery}&rdquo;
              </p>
            ) : (
              <div className="space-y-2">
                {filteredCandidates.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Candidates
                    </p>
                    {filteredCandidates.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => router.push('/candidates')}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-xs font-medium text-slate-900">{c.fullName}</p>
                          <p className="text-[11px] text-slate-500">
                            {c.currentTitle} · {c.currentCompany}
                          </p>
                        </div>
                        <span className="text-[11px] font-medium text-[#4F46E5]">
                          View Profile →
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {filteredJobs.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Job Requisitions
                    </p>
                    {filteredJobs.map((j) => (
                      <button
                        key={j.id}
                        type="button"
                        onMouseDown={() => router.push('/jobs')}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-xs font-medium text-slate-900">{j.title}</p>
                          <p className="text-[11px] text-slate-500">
                            {j.department} · {j.location}
                          </p>
                        </div>
                        <span className="text-[11px] font-medium text-[#4F46E5]">
                          Open Job →
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        {/* Organization Switcher */}
        {organizations.length > 1 && (
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setShowOrgSwitcher((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Building2 className="h-3.5 w-3.5 text-[#4F46E5]" />
              <span className="max-w-[140px] truncate">{activeOrganization.name}</span>
            </button>
            {showOrgSwitcher && (
              <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => {
                      void switchOrganization(org.id);
                      setShowOrgSwitcher(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <span className="truncate">{org.name}</span>
                    {org.id === activeOrganization.id && <Check className="h-3.5 w-3.5 text-[#4F46E5]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Create Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowQuickCreate((prev) => !prev);
              setShowNotifications(false);
            }}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#4F46E5] px-2.5 text-xs font-semibold text-white hover:bg-[#4338CA] transition-colors sm:px-3"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Quick Action</span>
          </button>

          {showQuickCreate && (
            <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl">
              <Link
                href="/candidates?action=new"
                onClick={() => setShowQuickCreate(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <UserPlus className="h-4 w-4 text-[#4F46E5]" />
                <span>Add New Candidate</span>
              </Link>
              <Link
                href="/jobs?action=new"
                onClick={() => setShowQuickCreate(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Briefcase className="h-4 w-4 text-[#4F46E5]" />
                <span>Create Job Requisition</span>
              </Link>
              <Link
                href="/interviews?action=new"
                onClick={() => setShowQuickCreate(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Calendar className="h-4 w-4 text-[#4F46E5]" />
                <span>Schedule Interview</span>
              </Link>
              <Link
                href="/ai-studio"
                onClick={() => setShowQuickCreate(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Sparkles className="h-4 w-4 text-[#4F46E5]" />
                <span>Parse Resume with AI</span>
              </Link>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications((prev) => !prev);
              setShowQuickCreate(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#4F46E5] px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
                <span className="text-xs font-semibold text-slate-900">
                  Notifications ({unreadCount} unread)
                </span>
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  className="text-[11px] font-medium text-[#4F46E5] hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                {notifications.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs text-slate-500">No notifications yet.</p>
                )}
                {notifications.slice(0, 6).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markRead.mutate(n.id)}
                    className={`cursor-pointer px-4 py-3 hover:bg-slate-50 ${
                      !n.isRead ? 'bg-[#EEF2FF]/40' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">{n.message}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#E2E8F0] p-2 text-center">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-medium text-[#4F46E5] hover:underline"
                >
                  Open Notification Center →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 hover:bg-slate-50"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF2FF] text-[11px] font-semibold text-[#4F46E5]">
              {getInitials(currentUser.name)}
            </div>
            <span className="hidden lg:inline text-xs font-medium text-slate-800">
              {currentUser.name}
            </span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
