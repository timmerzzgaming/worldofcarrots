import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

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

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'Server not configured' } },
      { status: 503 },
    )
  }

  if (!(await verifyAdmin(request))) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 },
    )
  }

  let body: { userId: string; newPassword: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  const { userId, newPassword } = body

  if (!userId) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'userId is required' } },
      { status: 422 },
    )
  }

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Password must be at least 6 characters' } },
      { status: 422 },
    )
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) {
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: { success: true } })
}
