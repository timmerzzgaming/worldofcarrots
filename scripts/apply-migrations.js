/**
 * Apply pending migrations via Supabase Management API.
 * Requires SUPABASE_ACCESS_TOKEN env var (personal access token from supabase.com/dashboard/account/tokens)
 *
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-migrations.js
 * Or:    Set the token in .env.local and run: node scripts/apply-migrations.js
 */

const fs = require('fs')
const path = require('path')

async function main() {
  const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
  const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim()
  const projectRef = supabaseUrl?.match(/https:\/\/(.+)\.supabase/)?.[1]

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN || envFile.match(/SUPABASE_ACCESS_TOKEN=(.*)/)?.[1]?.trim()

  if (!accessToken) {
    console.error('Missing SUPABASE_ACCESS_TOKEN. Get one from https://supabase.com/dashboard/account/tokens')
    console.error('Then run: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-migrations.js')
    process.exit(1)
  }

  if (!projectRef) {
    console.error('Could not determine project ref from NEXT_PUBLIC_SUPABASE_URL')
    process.exit(1)
  }

  console.log(`Project: ${projectRef}`)

  const migrationFiles = [
    '004_economy_settings_and_daily_login.sql',
    '005_diamonds_and_chests.sql',
    '006_leaderboards.sql',
    '007_daily_challenges.sql',
  ]

  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, '..', 'supabase', 'migrations', file)
    if (!fs.existsSync(filePath)) {
      console.log(`⏭  ${file} — not found, skipping`)
      continue
    }

    const sql = fs.readFileSync(filePath, 'utf8')
    console.log(`📦 Running ${file}...`)

    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    })

    if (res.ok) {
      console.log(`✅ ${file} — applied`)
    } else {
      const text = await res.text()
      console.error(`❌ ${file} — failed (${res.status}): ${text.slice(0, 200)}`)
    }
  }

  console.log('\nDone! Restart your dev server.')
}

main().catch(console.error)
