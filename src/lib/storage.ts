import fs from 'fs'
import path from 'path'
import type { UserProfile } from './types'

// Storage strategy:
// - On Vercel: /tmp is ephemeral but survives warm function calls
// - Config is also serialised into the USERS_DATA env var on save (a JSON blob)
//   so it survives cold starts and redeployments.
// - For production at scale you'd swap this for Vercel KV / Postgres.

const DATA_DIR = '/tmp/gym-booker-users'

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function userPath(userId: string) {
  // Sanitise userId to prevent path traversal
  const safe = userId.replace(/[^a-z0-9_-]/gi, '_')
  return path.join(DATA_DIR, `${safe}.json`)
}

// ── Hydrate from env var on cold start ──────────────────────────────────────
let hydrated = false
function hydrateFromEnv() {
  if (hydrated) return
  hydrated = true
  const raw = process.env.USERS_DATA
  if (!raw) return
  try {
    const users: UserProfile[] = JSON.parse(raw)
    ensureDir()
    for (const u of users) {
      const p = userPath(u.userId)
      if (!fs.existsSync(p)) {
        fs.writeFileSync(p, JSON.stringify(u, null, 2))
      }
    }
  } catch (e) {
    console.error('[Storage] Failed to hydrate from env:', e)
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function loadUser(userId: string): UserProfile | null {
  hydrateFromEnv()
  try {
    const p = userPath(userId)
    if (!fs.existsSync(p)) return null
    return JSON.parse(fs.readFileSync(p, 'utf-8'))
  } catch {
    return null
  }
}

export function saveUser(profile: UserProfile): void {
  hydrateFromEnv()
  ensureDir()
  fs.writeFileSync(userPath(profile.userId), JSON.stringify(profile, null, 2))
}

export function listUsers(): UserProfile[] {
  hydrateFromEnv()
  ensureDir()
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')) }
      catch { return null }
    })
    .filter(Boolean)
}

export function deleteUser(userId: string): void {
  const p = userPath(userId)
  if (fs.existsSync(p)) fs.unlinkSync(p)
}

// Serialise all users to a JSON string for storing in USERS_DATA env var
export function exportUsersJson(): string {
  return JSON.stringify(listUsers())
}

export function emailToUserId(email: string): string {
  return email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')
}
