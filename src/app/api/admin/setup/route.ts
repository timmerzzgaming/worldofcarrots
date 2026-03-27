import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/admin/setup
 * Bootstrap the admin account. Only works if no admin profile exists yet.
 * Body: { password: string }
 */
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'Supabase admin client not configured' } },
      { status: 503 },
    )
  }

  let body: { password: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  if (!body.password || body.password.length < 6) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Password must be at least 6 characters' } },
      { status: 422 },
    )
  }

  // Check if an admin already exists
  const { data: existingAdmins } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)

  if (existingAdmins && existingAdmins.length > 0) {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: 'Admin account already exists' } },
      { status: 409 },
    )
  }

  const adminEmail = 'admin@test.woc.local'

  // Create the auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: body.password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json(
      { error: { code: 'AUTH_ERROR', message: authError.message } },
      { status: 500 },
    )
  }

  // Create the admin profile
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: authData.user.id,
    nickname: 'admin',
    avatar: '⭐',
    role: 'admin',
    credits: 0,
  })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json(
      { error: { code: 'PROFILE_ERROR', message: profileError.message } },
      { status: 500 },
    )
  }

  return NextResponse.json(
    { data: { message: 'Admin account created. Login with username "admin" and your password.' } },
    { status: 201 },
  )
}
