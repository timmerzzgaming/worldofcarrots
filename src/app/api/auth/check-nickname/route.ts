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

  if (!nickname || !NICKNAME_RE.test(nickname)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Nickname must be 3-20 alphanumeric characters or underscores' } },
      { status: 422 },
    )
  }

  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .ilike('nickname', nickname)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: `Nickname "${nickname}" is already taken` } },
      { status: 409 },
    )
  }

  return NextResponse.json({ data: { available: true } })
}
