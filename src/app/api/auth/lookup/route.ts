import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'Server not configured' } },
      { status: 503 },
    )
  }

  let body: { nickname: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  const { nickname } = body
  if (!nickname?.trim()) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Nickname is required' } },
      { status: 422 },
    )
  }

  // Look up profile by nickname (case-insensitive)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .ilike('nickname', nickname.trim())
    .single()

  if (!profile) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'User not found' } },
      { status: 404 },
    )
  }

  // Get the auth user's email
  const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(profile.id)

  if (error || !user?.email) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'User not found' } },
      { status: 404 },
    )
  }

  return NextResponse.json({ data: { email: user.email } })
}
