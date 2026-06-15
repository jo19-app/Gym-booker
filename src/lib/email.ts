import nodemailer from 'nodemailer'

function transport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER) { console.log('[Email] SMTP not set, skipping:', subject); return }
  await transport().sendMail({ from: `"Gym Booker 🏋️" <${process.env.SMTP_USER}>`, to, subject, html })
}

const base = (content: string) => `
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;background:#fafafa;border-radius:12px;">
  ${content}
  <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Gym Booker · <a href="${process.env.NEXT_PUBLIC_APP_URL||''}">Manage bookings</a></p>
</div>`

const badge = (color: string, text: string) =>
  `<div style="background:${color};color:#fff;padding:18px 22px;border-radius:8px;margin-bottom:20px;"><h1 style="margin:0;font-size:20px;">${text}</h1></div>`

const card = (name: string, time: string, extra = '') =>
  `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:18px;margin-bottom:16px;">
     <p style="margin:0 0 6px;font-weight:600;font-size:17px;">${name}</p>
     <p style="margin:0;color:#6b7280;">📅 ${time}</p>${extra}
   </div>`

export function emailBooked(name: string, time: string, bookingId?: string, waitlisted?: boolean) {
  const color = waitlisted ? '#f59e0b' : '#10b981'
  const title = waitlisted ? '⏳ On Waitlist' : '✅ Booking Confirmed'
  const note = waitlisted
    ? `<p style="background:#fef3c7;color:#92400e;padding:10px 14px;border-radius:6px;font-size:13px;">You're on the waitlist — we'll notify you if a spot opens.</p>`
    : `<p style="background:#d1fae5;color:#065f46;padding:10px 14px;border-radius:6px;font-size:13px;">See you at the gym! 💪</p>`
  return {
    subject: `${title}: ${name} · ${time}`,
    html: base(badge(color, title) + card(name, time, bookingId ? `<p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">ID: ${bookingId}</p>` : '') + note),
  }
}

export function emailFailed(name: string, time: string, reason: string) {
  return {
    subject: `❌ Booking Failed: ${name} · ${time}`,
    html: base(
      badge('#ef4444', '❌ Booking Failed') +
      card(name, time) +
      `<div style="background:#fee2e2;border-radius:6px;padding:12px 14px;"><p style="margin:0;color:#991b1b;font-size:13px;"><b>Reason:</b> ${reason}</p></div>`
    ),
  }
}
