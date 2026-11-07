'use client';

import * as React from 'react';

export function PwaRegister() {
  React.useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
      return;
    }

    // Self-healing guard: a dev server that briefly served a production
    // build (e.g. `next build` run into the same .next directory a running
    // `next dev` uses) can register this service worker once. It then
    // outlives any number of dev-server restarts and silently serves stale,
    // non-content-hashed dev chunks forever, which looks like a broken app.
    // Every non-production load actively clears it out.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .then(() => caches.keys())
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => null);
  }, []);

  return null;
}
