'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  Kanban,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  UserSquare2,
  X,
} from 'lucide-react';
import { cn, formatRoleLabel } from '@/lib/utils';
import { useRecruitFlow } from '@/stores/recruitflow-store';

interface NavGroup {
  label: string;
  items: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    superAdminOnly?: boolean;
  }>;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const {
    organizations,
    activeOrganization,
    switchOrganization,
    currentUser,
    jobs,
    candidates,
    applications,
    interviews,
    notifications,
  } = useRecruitFlow();

  // Auto-close the mobile drawer whenever the user navigates to a new page.
  React.useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const orgJobs = jobs.filter((j) => j.organizationId === activeOrganization.id);
  const orgCandidates = candidates.filter((c) => c.organizationId === activeOrganization.id);
  const orgApps = applications.filter((a) => a.organizationId === activeOrganization.id);
  const orgInterviews = interviews.filter(
    (i) => i.organizationId === activeOrganization.id && i.status === 'SCHEDULED',
  );

  const navGroups: NavGroup[] = [
    {
      label: 'Core ATS',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        {
          name: 'Jobs',
          href: '/jobs',
          icon: Briefcase,
          badge: orgJobs.filter((j) => j.status === 'PUBLISHED').length,
        },
        {
          name: 'Candidates',
          href: '/candidates',
          icon: UserSquare2,
          badge: orgCandidates.length,
        },
        {
          name: 'Applications Pipeline',
          href: '/applications',
          icon: Kanban,
          badge: orgApps.length,
        },
        {
          name: 'Interviews',
          href: '/interviews',
          icon: Calendar,
          badge: orgInterviews.length,
        },
      ],
    },
    {
      label: 'AI & Intelligence',
      items: [
        { name: 'AI Studio Hub', href: '/ai-studio', icon: Sparkles, badge: 'AI' },
        { name: 'Analytics & Reports', href: '/analytics', icon: BarChart3 },
      ],
    },
    {
      label: 'Workspace',
      items: [
        { name: 'Team & RBAC', href: '/team', icon: Users },
        {
          name: 'Notifications',
          href: '/notifications',
          icon: Bell,
          badge: unreadCount > 0 ? unreadCount : undefined,
        },
        { name: 'Billing & Plans', href: '/billing', icon: CreditCard },
        { name: 'Settings', href: '/settings', icon: Settings },
      ],
    },
    {
      label: 'Platform Administration',
      items: [
        {
          name: 'Super Admin Console',
          href: '/admin',
          icon: ShieldAlert,
          superAdminOnly: true,
        },
      ],
    },
  ];

  return (
    <>
      {/* Backdrop: mobile/tablet only, dismisses the drawer on tap */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] max-w-[85vw] shrink-0 flex-col border-r border-[#E2E8F0] bg-white select-none transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-[#E2E8F0] px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F46E5] text-white font-bold text-sm shadow-xs">
            RF
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                RecruitFlow
              </span>
              <span className="rounded bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#4F46E5]">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Enterprise AI ATS</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation menu"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Multi-Tenant Organization Switcher */}
      <div className="border-b border-[#E2E8F0] p-3">
        <label className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-slate-400">
          <span>Active Workspace</span>
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
            {activeOrganization.planName}
          </span>
        </label>
        <div className="relative flex items-center">
          <Building2 className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
          <select
            value={activeOrganization.id}
            onChange={(e) => switchOrganization(e.target.value)}
            className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-8 pr-3 text-xs font-semibold text-slate-800 focus:border-[#4F46E5] focus:outline-none"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.superAdminOnly || currentUser.role === 'SUPER_ADMIN',
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
              <div className="mt-1.5 space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
                        isActive
                          ? 'bg-[#EEF2FF] text-[#4F46E5]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isActive ? 'text-[#4F46E5]' : 'text-slate-400',
                          )}
                        />
                        <span>{item.name}</span>
                      </span>
                      {item.badge !== undefined && (
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                            isActive
                              ? 'bg-[#4F46E5] text-white'
                              : 'bg-slate-100 text-slate-600',
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Active Role Footer */}
      <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-900">
              {currentUser.name}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              {formatRoleLabel(currentUser.role)}
            </p>
          </div>
          <Link
            href="/login"
            className="rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            Switch
          </Link>
        </div>
      </div>
      </aside>
    </>
  );
}
