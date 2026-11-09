'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { DEMO_ACCOUNTS } from '@/lib/auth-client';
import { useSignIn } from '@/features/auth/use-session';
import { ApiClientError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRoleLabel } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const signIn = useSignIn();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const performSignIn = async (signInEmail: string, signInPassword: string) => {
    setError(null);
    try {
      await signIn.mutateAsync({ email: signInEmail, password: signInPassword });
      router.push('/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to sign in. Check your credentials and try again.',
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void performSignIn(email, password);
  };

  const handleQuickDemoSelect = (presetEmail: string, presetPassword: string) => {
    setEmail(presetEmail);
    setPassword(presetPassword);
    void performSignIn(presetEmail, presetPassword);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="flex justify-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4F46E5] text-sm font-bold text-white">
              RF
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              RecruitFlow
            </span>
          </Link>
        </div>
        <h1 className="mt-5 text-center text-xl font-semibold text-slate-900">
          Sign in to your workspace
        </h1>
        <p className="mt-1 text-center text-xs text-slate-500">
          Enter your credentials or select a one-click RBAC demo account below
        </p>
      </div>

      <div className="mt-6 mx-auto w-full max-w-md space-y-5">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <Input
              label="Work Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[#4F46E5] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={signIn.isPending}>
              <span>{signIn.isPending ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-500">
            Need a new organization workspace?{' '}
            <Link href="/register" className="font-semibold text-[#4F46E5] hover:underline">
              Create an account
            </Link>
          </div>
        </div>

        {/* One-Click Demo Account Selector */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <ShieldCheck className="h-4 w-4 text-[#4F46E5]" />
            <span>One-Click Demo Accounts (5 RBAC Roles)</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Click any role below to sign in with a real seeded demo account:
          </p>
          <div className="mt-3 space-y-2">
            {DEMO_ACCOUNTS.map((acct) => (
              <button
                key={acct.email}
                type="button"
                disabled={signIn.isPending}
                onClick={() => handleQuickDemoSelect(acct.email, acct.password)}
                className="flex w-full items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-left transition-colors hover:border-[#4F46E5] hover:bg-[#EEF2FF]/40 disabled:opacity-60"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {acct.name}
                    </span>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${acct.badgeColor}`}
                    >
                      {formatRoleLabel(acct.role)}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                    {acct.email}
                  </p>
                </div>
                <KeyRound className="h-3.5 w-3.5 text-[#4F46E5]" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
