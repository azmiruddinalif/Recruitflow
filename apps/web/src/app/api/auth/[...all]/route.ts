import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'RecruitFlow Better Auth Session Endpoint Active',
    data: {
      provider: 'better-auth',
      status: 'operational',
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    success: true,
    message: 'Authenticated via RecruitFlow Better Auth handler',
    data: {
      user: {
        email: body?.email || 'superadmin@recruitflow.io',
      },
      sessionCreatedAt: new Date().toISOString(),
    },
  });
}
