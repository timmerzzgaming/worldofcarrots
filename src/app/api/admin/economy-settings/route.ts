import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

async function verifyAdmin(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  if (!supabaseUrl || !supabaseAnonKey) return null

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null

  const { data: profile } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' ? user.id : null
}

/** GET /api/admin/economy-settings — returns all settings */
export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Admin client not configured' } }, { status: 503 })
  }

  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('economy_settings')
    .select('key, value, updated_at')
    .order('key')

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ data })
}

/** PATCH /api/admin/economy-settings — update a single setting */
export async function PATCH(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Admin client not configured' } }, { status: 503 })
  }

  const adminId = await verifyAdmin(request)
  if (!adminId) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 })
  }

  let body: { key: string; value: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid JSON' } }, { status: 400 })
  }

  if (!body.key || body.value === undefined) {
    return NextResponse.json({ error: { code: 'VALIDATION_FAILED', message: 'key and value required' } }, { status: 422 })
  }

  const { error } = await supabaseAdmin
    .from('economy_settings')
    .upsert({
      key: body.key,
      value: body.value,
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    })

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ data: { key: body.key, saved: true } })
}
