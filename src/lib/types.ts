// ─── MySports course (from API) ───────────────────────────────────────────────
export interface Course {
  id: string
  name: string
  category?: string
  startTime: string   // ISO 8601, Europe/Berlin
  endTime: string
  trainer?: string
  location?: string
  spotsAvailable: number
  spotsTotal: number
  bookable: boolean
  waitlistAvailable?: boolean
  bookingOpensAt?: string // ISO 8601 — when the 48h window opens
}

// ─── A booking entry saved per user ───────────────────────────────────────────
export type BookingFrequency = 'weekly' | 'once'

export interface BookingEntry {
  id: string                // local uuid
  courseId: string          // matches Course.id for "once"; used to match by name+time for "weekly"
  courseName: string
  weekday: string           // 'monday' … 'sunday'
  time: string              // HH:MM Berlin
  frequency: BookingFrequency
  date?: string             // ISO date (YYYY-MM-DD) for 'once' bookings
  enabled: boolean
  lastAttempt?: string
  lastResult?: string
  lastBooked?: string
}

// ─── Per-user data (stored in KV under key `user:{userId}`) ──────────────────
export interface UserProfile {
  userId: string            // email-derived slug
  email: string             // MySports login email
  passwordHash: string      // bcrypt hash of MySports password
  notificationEmail: string
  bookings: BookingEntry[]
  createdAt: string
}

// ─── App-wide settings ────────────────────────────────────────────────────────
export const STUDIO_SLUG = 'cGVvcGxlcy1neW06MTI1MzQxMzk0MA=='
export const TIMEZONE    = 'Europe/Berlin'
export const BOOKING_WINDOW_HOURS = 48
export const CHECK_WINDOW_MINUTES = 10
export const MYSPORTS_API = 'https://api.mysports.com'
