'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { BookingEntry } from '@/lib/types'
import type { Course } from '@/lib/types'

// ── helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9) }

const WEEKDAY_DE: Record<string, string> = {
  monday:'Mo', tuesday:'Di', wednesday:'Mi', thursday:'Do',
  friday:'Fr', saturday:'Sa', sunday:'So',
}
const WEEKDAY_FULL: Record<string, string> = {
  monday:'Montag', tuesday:'Dienstag', wednesday:'Mittwoch', thursday:'Donnerstag',
  friday:'Freitag', saturday:'Samstag', sunday:'Sonntag',
}

function dayOfWeek(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Europe/Berlin' }).toLowerCase()
}
function timeStr(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
}
function dateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('sv', { timeZone: 'Europe/Berlin' })
}
function displayDate(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Berlin',
  })
}

// Group courses by day
function groupByDay(courses: Course[]): Record<string, Course[]> {
  const groups: Record<string, Course[]> = {}
  for (const c of courses) {
    const d = dateStr(c.startTime)
    if (!groups[d]) groups[d] = []
    groups[d].push(c)
  }
  return groups
}

// ── StatusChip ────────────────────────────────────────────────────────────────
function StatusChip({ result }: { result?: string }) {
  if (!result) return <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>
  const ok = result.startsWith('✅')
  const wait = result.startsWith('⏳')
  const color = ok ? 'var(--accent2)' : wait ? 'var(--warn)' : 'var(--danger)'
  return (
    <span style={{ color, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
      {result.replace(/^[✅❌⏳]\s*/, '')}
    </span>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{
      background: on ? 'var(--accent2)' : 'var(--surface3)',
      border: 'none', borderRadius: 20, width: 40, height: 22,
      position: 'relative', flexShrink: 0, transition: 'background 0.2s',
    }}>
      <span style={{
        position: 'absolute', top: 3, left: on ? 20 : 2,
        width: 16, height: 16, borderRadius: '50%', background: 'white',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<'schedule' | 'mybookings'>('schedule')

  // User data
  const [userEmail, setUserEmail] = useState('')
  const [bookings, setBookings] = useState<BookingEntry[]>([])
  const [saving, setSaving] = useState(false)

  // Schedule fetch
  const [schedulePassword, setSchedulePassword] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [scheduleError, setScheduleError] = useState('')
  const [scheduleLoaded, setScheduleLoaded] = useState(false)

  // Selection state: courseId → { frequency, date }
  const [pendingSelections, setPendingSelections] = useState<
    Record<string, { frequency: 'weekly' | 'once'; date?: string }>
  >({})

  // ── Load user settings ──────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    const res = await fetch('/api/settings')
    if (res.status === 401) { router.push('/'); return }
    const data = await res.json()
    setUserEmail(data.email || '')
    setBookings(data.bookings || [])
  }, [router])

  useEffect(() => { loadSettings() }, [loadSettings])

  // ── Sync bookings to server ─────────────────────────────────────────────────
  const persist = async (newBookings: BookingEntry[]) => {
    setSaving(true)
    setBookings(newBookings)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookings: newBookings }),
    })
    setSaving(false)
  }

  // ── Fetch live schedule ─────────────────────────────────────────────────────
  const fetchSchedule = async () => {
    if (!schedulePassword) return
    setLoadingSchedule(true)
    setScheduleError('')
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: schedulePassword }),
      })
      const data = await res.json()
      if (!res.ok) { setScheduleError(data.error || 'Failed'); return }
      setCourses(data.courses || [])
      setScheduleLoaded(true)
    } catch {
      setScheduleError('Network error')
    } finally {
      setLoadingSchedule(false)
    }
  }

  // ── Add booking from schedule selection ─────────────────────────────────────
  const addBooking = (course: Course) => {
    const sel = pendingSelections[course.id]
    if (!sel) return

    const entry: BookingEntry = {
      id: uid(),
      courseId: course.id,
      courseName: course.name,
      weekday: dayOfWeek(course.startTime),
      time: timeStr(course.startTime),
      frequency: sel.frequency,
      date: sel.frequency === 'once' ? dateStr(course.startTime) : undefined,
      enabled: true,
    }

    // Avoid duplicates
    const already = bookings.some(b =>
      b.courseName === entry.courseName &&
      b.weekday === entry.weekday &&
      b.time === entry.time &&
      b.frequency === entry.frequency &&
      (entry.frequency === 'weekly' || b.date === entry.date)
    )
    if (already) return

    persist([...bookings, entry])
    setPendingSelections(p => { const n = { ...p }; delete n[course.id]; return n })
  }

  const removeBooking = (id: string) => persist(bookings.filter(b => b.id !== id))
  const toggleBooking = (id: string) =>
    persist(bookings.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b))

  const logout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout', email: '', password: '' }),
    })
    router.push('/')
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const groupedCourses = groupByDay(courses)
  const sortedDays = Object.keys(groupedCourses).sort()

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 80px' }}>

      {/* Nav */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(12,12,16,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 0', marginBottom: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🏋️</span>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>Gym Booker</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{userEmail}</span>
          {saving && <span style={{ color: 'var(--muted)', fontSize: 12 }}>Saving…</span>}
          <button onClick={logout} style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 6, color: 'var(--muted2)', padding: '5px 12px', fontSize: 13,
          }}>Log out</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 3, marginBottom: 28, gap: 2,
      }}>
        {[
          { key: 'schedule', label: '📅 Class Schedule' },
          { key: 'mybookings', label: `⚡ My Auto-Bookings (${bookings.filter(b => b.enabled).length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)} style={{
            flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', fontSize: 13,
            fontWeight: 600,
            background: tab === key ? 'var(--surface2)' : 'transparent',
            color: tab === key ? 'var(--text)' : 'var(--muted)',
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* ── SCHEDULE TAB ─────────────────────────────────────────────────── */}
      {tab === 'schedule' && (
        <div>
          {/* Password gate to fetch schedule */}
          {!scheduleLoaded && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '22px',
            }}>
              <p style={{ color: 'var(--muted2)', fontSize: 14, marginBottom: 14 }}>
                Enter your gym password to load the live class schedule from MySports.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="password"
                  placeholder="Your gym password"
                  value={schedulePassword}
                  onChange={e => setSchedulePassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchSchedule()}
                />
                <button
                  onClick={fetchSchedule}
                  disabled={loadingSchedule || !schedulePassword}
                  style={{
                    background: 'var(--accent)', border: 'none', borderRadius: 8,
                    color: '#0f0a1e', fontWeight: 700, fontSize: 14, padding: '10px 20px',
                    whiteSpace: 'nowrap',
                    opacity: loadingSchedule || !schedulePassword ? 0.5 : 1,
                  }}
                >
                  {loadingSchedule ? '…' : 'Load schedule'}
                </button>
              </div>
              {scheduleError && (
                <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{scheduleError}</p>
              )}
            </div>
          )}

          {/* Refresh button after loaded */}
          {scheduleLoaded && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={fetchSchedule} style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--muted2)', padding: '6px 14px', fontSize: 12,
              }}>
                {loadingSchedule ? '…' : '↻ Refresh schedule'}
              </button>
            </div>
          )}

          {/* Course list grouped by day */}
          {scheduleLoaded && courses.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '48px 0',
              color: 'var(--muted)', fontSize: 14,
            }}>No courses found for the next 8 days.</div>
          )}

          {sortedDays.map(day => (
            <div key={day} style={{ marginBottom: 28 }}>
              <h2 style={{
                fontSize: 12, fontWeight: 600, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
              }}>
                {new Date(day + 'T12:00:00').toLocaleDateString('de-DE', {
                  weekday: 'long', day: '2-digit', month: '2-digit',
                })}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {groupedCourses[day].map(course => {
                  const sel = pendingSelections[course.id]
                  const alreadyBooked = bookings.some(b =>
                    b.courseName === course.name &&
                    b.weekday === dayOfWeek(course.startTime) &&
                    b.time === timeStr(course.startTime) &&
                    (b.frequency === 'weekly' || b.date === dateStr(course.startTime))
                  )

                  return (
                    <div key={course.id} style={{
                      background: alreadyBooked
                        ? 'rgba(52,211,153,0.06)'
                        : sel ? 'rgba(167,139,250,0.07)' : 'var(--surface)',
                      border: `1px solid ${alreadyBooked ? 'rgba(52,211,153,0.25)' : sel ? 'rgba(167,139,250,0.3)' : 'var(--border)'}`,
                      borderRadius: 10,
                      padding: '14px 16px',
                      transition: 'all 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: 15 }}>{course.name}</span>
                            {course.category && (
                              <span style={{
                                background: 'var(--surface3)', border: '1px solid var(--border)',
                                borderRadius: 4, padding: '1px 7px', fontSize: 11, color: 'var(--muted2)',
                              }}>{course.category}</span>
                            )}
                          </div>
                          <div style={{ color: 'var(--muted2)', fontSize: 13 }}>
                            {timeStr(course.startTime)} – {timeStr(course.endTime)}
                            {course.trainer && <> · {course.trainer}</>}
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12 }}>
                            <span style={{
                              color: course.spotsAvailable > 3 ? 'var(--accent2)' : course.spotsAvailable > 0 ? 'var(--warn)' : 'var(--danger)',
                            }}>
                              {course.spotsAvailable > 0
                                ? `${course.spotsAvailable} spots left`
                                : course.waitlistAvailable ? 'Waitlist available' : 'Full'}
                            </span>
                            {course.bookingOpensAt && (
                              <span style={{ color: 'var(--muted)', marginLeft: 10 }}>
                                Booking opens {displayDate(course.bookingOpensAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action side */}
                        {alreadyBooked ? (
                          <span style={{
                            background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)',
                            borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--accent2)',
                            whiteSpace: 'nowrap', flexShrink: 0,
                          }}>✓ Scheduled</span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {sel && (
                              <>
                                <select
                                  value={sel.frequency}
                                  onChange={e => setPendingSelections(p => ({
                                    ...p,
                                    [course.id]: { ...sel, frequency: e.target.value as 'weekly' | 'once' }
                                  }))}
                                  style={{ width: 120, padding: '6px 10px', fontSize: 13 }}
                                >
                                  <option value="once">This date only</option>
                                  <option value="weekly">Every week</option>
                                </select>
                                <button
                                  onClick={() => addBooking(course)}
                                  style={{
                                    background: 'var(--accent)', border: 'none', borderRadius: 7,
                                    color: '#0f0a1e', fontWeight: 700, fontSize: 13, padding: '7px 14px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >Add</button>
                                <button
                                  onClick={() => setPendingSelections(p => { const n={...p}; delete n[course.id]; return n })}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 16, padding: '4px 6px' }}
                                >×</button>
                              </>
                            )}
                            {!sel && (
                              <button
                                onClick={() => setPendingSelections(p => ({
                                  ...p, [course.id]: { frequency: 'once' }
                                }))}
                                style={{
                                  background: 'var(--surface2)', border: '1px solid var(--border)',
                                  borderRadius: 7, color: 'var(--muted2)', fontSize: 13, padding: '6px 14px',
                                  whiteSpace: 'nowrap',
                                }}
                              >+ Book</button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MY BOOKINGS TAB ──────────────────────────────────────────────── */}
      {tab === 'mybookings' && (
        <div>
          {bookings.length === 0 && (
            <div style={{
              background: 'var(--surface)', border: '1px dashed var(--border)',
              borderRadius: 'var(--radius)', padding: '48px', textAlign: 'center',
              color: 'var(--muted)', fontSize: 14,
            }}>
              No auto-bookings set up yet.<br />
              <span style={{ color: 'var(--muted2)', marginTop: 8, display: 'block' }}>
                Go to the Class Schedule tab, pick a class, and choose "Every week" or "This date only".
              </span>
            </div>
          )}

          {/* Weekly bookings */}
          {bookings.filter(b => b.frequency === 'weekly').length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Weekly — Recurring
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bookings.filter(b => b.frequency === 'weekly').map(b => (
                  <BookingRow key={b.id} booking={b} onToggle={() => toggleBooking(b.id)} onRemove={() => removeBooking(b.id)} />
                ))}
              </div>
            </div>
          )}

          {/* One-off bookings */}
          {bookings.filter(b => b.frequency === 'once').length > 0 && (
            <div>
              <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Single Bookings
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bookings.filter(b => b.frequency === 'once').map(b => (
                  <BookingRow key={b.id} booking={b} onToggle={() => toggleBooking(b.id)} onRemove={() => removeBooking(b.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Info box */}
          {bookings.length > 0 && (
            <div style={{
              marginTop: 28, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '16px 18px',
            }}>
              <p style={{ color: 'var(--muted2)', fontSize: 13, lineHeight: 1.7 }}>
                ⚡ The bot checks every 5 minutes and books automatically when the 48h window opens.
                Check the <strong>My Auto-Bookings</strong> tab to see the status of each booking.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── BookingRow component ───────────────────────────────────────────────────────
function BookingRow({
  booking, onToggle, onRemove
}: {
  booking: BookingEntry
  onToggle: () => void
  onRemove: () => void
}) {
  const WEEKDAY_FULL: Record<string, string> = {
    monday:'Montag', tuesday:'Dienstag', wednesday:'Mittwoch', thursday:'Donnerstag',
    friday:'Freitag', saturday:'Samstag', sunday:'Sonntag',
  }

  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${booking.enabled ? 'var(--border)' : 'var(--surface2)'}`,
      borderRadius: 10, padding: '14px 16px',
      opacity: booking.enabled ? 1 : 0.45, transition: 'opacity 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{booking.courseName}</span>
            <span style={{
              background: booking.frequency === 'weekly' ? 'rgba(167,139,250,0.15)' : 'rgba(251,191,36,0.12)',
              border: `1px solid ${booking.frequency === 'weekly' ? 'rgba(167,139,250,0.3)' : 'rgba(251,191,36,0.3)'}`,
              borderRadius: 4, padding: '1px 7px', fontSize: 11,
              color: booking.frequency === 'weekly' ? 'var(--accent)' : 'var(--warn)',
            }}>
              {booking.frequency === 'weekly' ? '↻ Wöchentlich' : '📅 Einmalig'}
            </span>
          </div>
          <div style={{ color: 'var(--muted2)', fontSize: 13 }}>
            {booking.frequency === 'weekly'
              ? `${WEEKDAY_FULL[booking.weekday] || booking.weekday}, ${booking.time} Uhr`
              : `${booking.date} · ${booking.time} Uhr`}
          </div>
          <div style={{ marginTop: 6 }}>
            <StatusChip result={booking.lastResult} />
          </div>
          {booking.lastAttempt && (
            <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 3 }}>
              Letzter Versuch: {new Date(booking.lastAttempt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Toggle on={booking.enabled} onChange={onToggle} />
          <button onClick={onRemove} style={{
            background: 'transparent', border: 'none', color: 'var(--muted)',
            fontSize: 18, padding: '2px 6px', lineHeight: 1,
          }}>×</button>
        </div>
      </div>
    </div>
  )
}
