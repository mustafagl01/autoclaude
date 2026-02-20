import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createUser } from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { success: false, error: passwordCheck.error || 'Invalid password' },
        { status: 400 }
      );
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const hashResult = await hashPassword(password);
    if (!hashResult.success || !hashResult.hash) {
      return NextResponse.json(
        { success: false, error: hashResult.error || 'Failed to hash password' },
        { status: 500 }
      );
    }

    const id = crypto.randomUUID();
    const result = await createUser({
      id,
      email,
      password_hash: hashResult.hash,
      name: email.split('@')[0] || 'User',
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
