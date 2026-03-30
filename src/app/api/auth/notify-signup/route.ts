import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = 'timmerzzgaming@gmail.com'
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'World Of Carrots <noreply@worldofcarrots.com>'

export async function POST(request: NextRequest) {
  if (!RESEND_API_KEY) {
    return NextResponse.json({ ok: true }) // silently skip if not configured
  }

  let body: { email: string; nickname: string; avatar: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { email, nickname, avatar } = body

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `[WoC] New signup: ${nickname}`,
        html: `
          <h2>New World Of Carrots Registration</h2>
          <p><strong>Nickname:</strong> ${nickname}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Avatar:</strong> ${avatar}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        `,
      }),
    })
  } catch {
    // Don't block signup if notification fails
  }

  return NextResponse.json({ ok: true })
}
