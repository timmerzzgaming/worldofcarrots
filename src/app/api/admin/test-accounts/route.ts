import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** Verify the caller is an admin by checking their session token against the profiles table. */
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.slice(7)
  if (!supabaseUrl || !supabaseAnonKey) return false

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return false

  const { data: profile } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin'
}

const NICKNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'Supabase admin client not configured' } },
      { status: 503 },
    )
  }

  if (!(await verifyAdmin(request))) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 },
    )
  }

  let body: { username: string; password: string; avatar?: string; credits?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  const { username, password, avatar, credits } = body

  if (!username || !NICKNAME_RE.test(username)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Username must be 3-20 alphanumeric characters or underscores' } },
      { status: 422 },
    )
  }

  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Password must be at least 6 characters' } },
      { status: 422 },
    )
  }

  // Use a fake email derived from the username — no real email needed
  const fakeEmail = `${username.toLowerCase()}@test.woc.local`

  // Create the auth user with email pre-confirmed (skips verification)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: fakeEmail,
    password,
    email_confirm: true,
  })

  if (authError) {
    // Duplicate email means username already taken
    if (authError.message.includes('already been registered')) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: `Test account "${username}" already exists` } },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: { code: 'AUTH_ERROR', message: authError.message } },
      { status: 500 },
    )
  }

  // Create the profile row
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: authData.user.id,
    nickname: username,
    avatar: avatar ?? '🌍',
    role: 'user',
    credits: credits ?? 0,
  })

  if (profileError) {
    // Roll back the auth user if profile creation fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json(
      { error: { code: 'PROFILE_ERROR', message: profileError.message } },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      data: {
        id: authData.user.id,
        username,
        email: fakeEmail,
        avatar: avatar ?? '🌍',
        credits: credits ?? 0,
      },
    },
    { status: 201 },
  )
}
