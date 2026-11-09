'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } finally {
      setIsSubmitting(false);
      // Always show the same confirmation regardless of whether the account
      // exists, so this endpoint can't be used to enumerate registered emails.
      setSubmitted(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#F8FAFC] py-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              Reset your password
            </h1>
            <p className="text-xs text-slate-500">
              We will send a secure password recovery link to your work email.
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="mt-5 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-xs text-[#15803D]">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Recovery link dispatched</span>
            </div>
            <p className="mt-1">
              If an account exists for <strong>{email}</strong>, you will receive reset instructions within 60 seconds.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Input
              label="Work Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Reset Instructions'}
            </Button>
          </form>
        )}

        <div className="mt-5 text-center text-xs">
          <Link href="/login" className="font-medium text-[#4F46E5] hover:underline">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
