'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PermissionCode, SystemRoleCode } from '@recruitflow/types';
import { useSession, useSwitchOrganization } from '@/features/auth/use-session';

export interface ActiveOrganization {
  id: string;
  name: string;
  slug: string;
  roleCode: SystemRoleCode;
  permissions: PermissionCode[];
}

export interface CurrentUserIdentity {
  id: string;
  name: string;
  email: string;
  title: string;
  role: SystemRoleCode;
  isSuperAdmin: boolean;
}

export interface OrganizationMembership {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  roleCode: SystemRoleCode;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'info' | 'warning' | 'error';
}

interface RecruitFlowContextValue {
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  organizations: OrganizationMembership[];
  activeOrganization: ActiveOrganization;
  currentUser: CurrentUserIdentity;
  can: (permission: PermissionCode) => boolean;
  switchOrganization: (organizationId: string) => Promise<void>;
  toasts: ToastMessage[];
  pushToast: (title: string, description?: string, variant?: ToastMessage['variant']) => void;
  dismissToast: (id: string) => void;
}

const RecruitFlowContext = createContext<RecruitFlowContextValue | null>(null);

const FALLBACK_ORGANIZATION: ActiveOrganization = {
  id: '',
  name: '',
  slug: '',
  roleCode: 'RECRUITER',
  permissions: [],
};

const FALLBACK_USER: CurrentUserIdentity = {
  id: '',
  name: '',
  email: '',
  title: '',
  role: 'RECRUITER',
  isSuperAdmin: false,
};

export function RecruitFlowProvider({ children }: { children: React.ReactNode }) {
  const sessionQuery = useSession();
  const switchOrgMutation = useSwitchOrganization();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback(
    (title: string, description?: string, variant: ToastMessage['variant'] = 'success') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // One-time cleanup of localStorage keys written by the previous fake,
  // localStorage-backed store. A stale 'rf_active_org_id' in particular used
  // to be sent as an X-Organization-Id override header, silently pointing
  // every request at a nonexistent organization for returning browsers.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    for (const key of ['rf_active_org_id', 'rf_auth_token', 'recruitflow_enterprise_state_v1']) {
      window.localStorage.removeItem(key);
    }
  }, []);

  const session = sessionQuery.data;

  const activeOrganization: ActiveOrganization = useMemo(() => {
    if (!session?.activeOrganization) return FALLBACK_ORGANIZATION;
    return {
      id: session.activeOrganization.organizationId,
      name: session.activeOrganization.organizationName,
      slug: session.activeOrganization.organizationSlug,
      roleCode: session.activeOrganization.roleCode,
      permissions: session.activeOrganization.permissions,
    };
  }, [session]);

  const currentUser: CurrentUserIdentity = useMemo(() => {
    if (!session?.user) return FALLBACK_USER;
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      title: session.user.jobTitle ?? '',
      role: session.activeOrganization?.roleCode ?? 'RECRUITER',
      isSuperAdmin: session.user.isSuperAdmin,
    };
  }, [session]);

  const organizations: OrganizationMembership[] = useMemo(
    () =>
      (session?.organizations ?? []).map((o) => ({
        id: o.organizationId,
        name: o.name,
        slug: o.slug,
        logo: o.logo,
        roleCode: o.roleCode,
      })),
    [session],
  );

  const can = useCallback(
    (permission: PermissionCode) =>
      currentUser.isSuperAdmin || activeOrganization.permissions.includes(permission),
    [currentUser.isSuperAdmin, activeOrganization.permissions],
  );

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      await switchOrgMutation.mutateAsync(organizationId);
      const found = organizations.find((o) => o.id === organizationId);
      if (found) {
        pushToast(`Switched workspace to ${found.name}`, undefined, 'info');
      }
    },
    [switchOrgMutation, organizations, pushToast],
  );

  const value = useMemo<RecruitFlowContextValue>(
    () => ({
      isAuthenticated: session !== null && session !== undefined,
      isSessionLoading: sessionQuery.isLoading,
      organizations,
      activeOrganization,
      currentUser,
      can,
      switchOrganization,
      toasts,
      pushToast,
      dismissToast,
    }),
    [
      session,
      sessionQuery.isLoading,
      organizations,
      activeOrganization,
      currentUser,
      can,
      switchOrganization,
      toasts,
      pushToast,
      dismissToast,
    ],
  );

  return (
    <RecruitFlowContext.Provider value={value}>
      {children}
      {/* Global Toast Stack */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-lg transition-all"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    t.variant === 'error'
                      ? 'bg-red-600'
                      : t.variant === 'warning'
                        ? 'bg-amber-500'
                        : t.variant === 'info'
                          ? 'bg-indigo-600'
                          : 'bg-emerald-600'
                  }`}
                />
                <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              </div>
              {t.description && (
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </RecruitFlowContext.Provider>
  );
}

export function useRecruitFlow() {
  const ctx = useContext(RecruitFlowContext);
  if (!ctx) {
    throw new Error('useRecruitFlow must be used within a RecruitFlowProvider');
  }
  return ctx;
}
