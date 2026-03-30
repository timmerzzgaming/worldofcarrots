import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }

  // Verify admin via auth header
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token)
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get all auth users
  const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers()
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Get all profiles
  const { data: profiles } = await supabaseAdmin.from('profiles').select('*')
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  // Merge auth users with profiles
  const merged = authUsers.map((u) => {
    const profile = profileMap.get(u.id)
    return {
      id: u.id,
      email: u.email,
      nickname: profile?.nickname ?? null,
      avatar: profile?.avatar ?? null,
      role: profile?.role ?? 'user',
      credits: profile?.credits ?? 0,
      xp: profile?.xp ?? 0,
      level: profile?.level ?? 0,
      carrots: profile?.diamonds ?? profile?.carrots ?? 0,
      games_completed: profile?.games_completed ?? 0,
      is_banned: profile?.is_banned ?? false,
      has_profile: !!profile,
      email_confirmed: !!u.email_confirmed_at,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }
  })

  return NextResponse.json({ data: merged })
}
