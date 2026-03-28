import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const NICKNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'Server not configured' } },
      { status: 503 },
    )
  }

  let body: { nickname: string; email: string; password: string; avatar?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  const { nickname, email, password, avatar } = body

  if (!nickname || !NICKNAME_RE.test(nickname)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Nickname must be 3-20 alphanumeric characters or underscores' } },
      { status: 422 },
    )
  }

  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Valid email is required' } },
      { status: 422 },
    )
  }

  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Password must be at least 6 characters' } },
      { status: 422 },
    )
  }

  // Check nickname uniqueness
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: `Nickname "${nickname}" is already taken` } },
      { status: 409 },
    )
  }

  // Create auth user — email_confirm: false so Supabase sends a confirmation email
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { nickname, avatar: avatar ?? '🌍' },
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'This email is already registered' } },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: { code: 'AUTH_ERROR', message: authError.message } },
      { status: 500 },
    )
  }

  // Create profile row (account exists but isn't confirmed yet — profile is ready for when they confirm)
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: authData.user.id,
    nickname,
    avatar: avatar ?? '🌍',
    role: 'user',
    credits: 0,
  })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json(
      { error: { code: 'PROFILE_ERROR', message: profileError.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: { id: authData.user.id, nickname } }, { status: 201 })
}
