import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'Server not configured' } },
      { status: 503 },
    )
  }

  let body: { email: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  const { email } = body
  if (!email?.trim() || !email.includes('@')) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Valid email is required' } },
      { status: 422 },
    )
  }

  const trimmedEmail = email.trim().toLowerCase()
  const origin = request.headers.get('origin') || request.nextUrl.origin

  // Send password reset email — Supabase ignores non-existent emails
  const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(trimmedEmail, {
    redirectTo: `${origin}/auth/reset-password`,
  })

  if (resetError) {
    console.error('Password reset error:', resetError.message)
  }

  // Look up nickname via auth admin — find user by email, then fetch profile
  let maskedNickname: string | null = null

  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const authUser = users?.find((u) => u.email?.toLowerCase() === trimmedEmail)

  if (authUser) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('nickname')
      .eq('id', authUser.id)
      .single()

    if (profile?.nickname) {
      const n = profile.nickname
      maskedNickname = n.length <= 3
        ? n[0] + '**'
        : n[0] + '*'.repeat(n.length - 2) + n[n.length - 1]
    }
  }

  // Always return success to prevent email enumeration
  return NextResponse.json({ data: { sent: true, nickname: maskedNickname } })
}
