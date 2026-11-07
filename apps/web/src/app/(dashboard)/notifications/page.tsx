'use client';

import React, { useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useRecruitFlow } from '@/stores/recruitflow-store';

export default function NotificationsPage() {
  const {
    activeOrganization,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
  } = useRecruitFlow();

  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');

  const orgNotifications = notifications
    .filter((n) => n.organizationId === activeOrganization.id)
    .filter((n) => {
      if (filter === 'UNREAD') return !n.isRead;
      if (filter === 'READ') return n.isRead;
      return true;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Notifications Center
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time alerts for candidate applications, interview schedules, scorecards, and AI parsing jobs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-xs">
            {(['ALL', 'UNREAD', 'READ'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filter === tab
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab === 'UNREAD' ? 'Unread' : 'Read'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <CheckCheck className="h-4 w-4 text-indigo-600" />
            Mark All as Read
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {orgNotifications.length === 0 ? (
          <div className="p-10 text-center">
            <Bell className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-700">No notifications found</p>
            <p className="mt-1 text-xs text-slate-500">
              You have no {filter === 'ALL' ? '' : filter.toLowerCase() + ' '}notifications in {activeOrganization.name}.
            </p>
          </div>
        ) : (
          orgNotifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 ${
                n.isRead ? 'bg-white' : 'bg-indigo-50/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    {!n.isRead && (
                      <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{n.createdAt}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => markNotificationRead(n.id)}
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    Mark Read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteNotification(n.id)}
                  title="Delete notification"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
