'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRecruitFlow } from '@/stores/recruitflow-store';

export default function RegisterPage() {
  const router = useRouter();
  const { pushToast, updateOrganizationSettings } = useRecruitFlow();

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [organizationName, setOrganizationName] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (organizationName.trim()) {
      await updateOrganizationSettings({ name: organizationName.trim() });
    }
    pushToast(
      'Workspace provisioned',
      `Welcome ${name || 'Admin'}! Your multi-tenant organization is ready.`,
      'success',
    );
    router.push('/dashboard');
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
          Create your organization workspace
        </h1>
        <p className="mt-1 text-center text-xs text-slate-500">
          14-day Enterprise trial · No credit card required
        </p>

        <div className="mt-6 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Morgan"
            />
            <Input
              label="Work Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
            />
            <Input
              label="Organization / Company Name"
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="NovaScale Cloud Inc."
            />
            <Input
              label="Password (8+ chars, uppercase & number)"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
            <Button type="submit" className="w-full" size="lg">
              <span>Provision Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#4F46E5] hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
