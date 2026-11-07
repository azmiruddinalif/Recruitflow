'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Briefcase,
  Calendar,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import type { SystemRoleCode } from '@recruitflow/types';
import { useRecruitFlow } from '@/stores/recruitflow-store';
import { formatRoleLabel, getInitials } from '@/lib/utils';

const ALL_ROLES: SystemRoleCode[] = [
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'HIRING_MANAGER',
  'RECRUITER',
  'INTERVIEWER',
];

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const {
    currentUser,
    switchActiveRole,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    candidates,
    jobs,
  } = useRecruitFlow();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [showQuickCreate, setShowQuickCreate] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = React.useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredCandidates = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return candidates
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.currentTitle.toLowerCase().includes(q) ||
          c.skills.some((s) => s.name.toLowerCase().includes(q)),
      )
      .slice(0, 4);
  }, [candidates, searchQuery]);

  const filteredJobs = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return jobs
      .filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.department.toLowerCase().includes(q),
      )
      .slice(0, 3);
  }, [jobs, searchQuery]);

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
            className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:bg-white focus:outline-none sm:pr-14"
          />
          <span className="pointer-events-none absolute right-2.5 hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400 sm:block">
            Ctrl K
          </span>
        </div>

        {/* Live Search Results Dropdown */}
        {showSearchDropdown && searchQuery.trim().length > 0 && (
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
        {/* Interactive RBAC Role Switcher for Testing Permissions */}
        <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1">
          <ShieldCheck className="h-3.5 w-3.5 text-[#4F46E5]" />
          <span className="text-[11px] font-medium text-slate-500">RBAC Role:</span>
          <select
            aria-label="RBAC Role Switcher"
            value={currentUser.role}
            onChange={(e) => switchActiveRole(e.target.value as SystemRoleCode)}
            className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
          >
            {ALL_ROLES.map((role) => (
              <option key={role} value={role}>
                {formatRoleLabel(role)}
              </option>
            ))}
          </select>
        </div>

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
                  onClick={markAllNotificationsRead}
                  className="text-[11px] font-medium text-[#4F46E5] hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                {notifications.slice(0, 6).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`cursor-pointer px-4 py-3 hover:bg-slate-50 ${
                      !n.isRead ? 'bg-[#EEF2FF]/40' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                      <span className="text-[10px] text-slate-400">{n.createdAt}</span>
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
      </div>
    </header>
  );
}
