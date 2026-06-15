# 🏋️ Gym Booker v2 — Peoples Fitness Bad Homburg

Multi-user automatic class booking bot with live schedule browser.

## Features
- **Multi-user** — each friend registers their own account with their own gym credentials
- **Live schedule** — fetches the real class timetable from MySports for the next 8 days
- **Smart booking** — choose "Every week" or "This date only" per class
- **Auto-booking** — cron job fires every 5 min, books exactly when the 48h window opens
- **Email notifications** — confirmation or failure email per booking attempt

---

## Deploy in 5 minutes

### 1. Push to GitHub, import to Vercel

```bash
# In the gym-booker folder:
git init && git add . && git commit -m "init"
# Push to GitHub, then import at vercel.com → New Project
```

### 2. Set environment variables (Vercel → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `JWT_SECRET` | `openssl rand -hex 32` |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `SMTP_HOST` | `securesmtp.t-online.de` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `jonas.jepp@t-online.de` |
| `SMTP_PASS` | Your T-Online password |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL |

### 3. Register & use

1. Open your Vercel app URL
2. Click **Register**, enter your MySports email + password + notification email
3. Go to **Class Schedule**, enter your gym password to load the live timetable
4. Click **+ Book** on any class → choose **Every week** or **This date only** → **Add**
5. The bot books it automatically when the window opens

### Share with friends
Send them your Vercel URL — they register with their own credentials, totally separate.

---

## How the cron works

Vercel runs `/api/cron` every 5 minutes. It:
1. Loads all registered users
2. For each user, checks if any booking's 48h window is open (±10 min)
3. If yes: logs into MySports with their credentials, finds the course, books it
4. Sends email confirmation

**Note on credentials:** MySports requires your actual password to make bookings (it uses JWT auth, not API keys). Passwords are bcrypt-hashed for storage. The cron job uses a short-lived in-process cache of the plaintext password set when you load the schedule — so the bot can book within ~30 min of you last visiting the app. For personal use this is fine; for a longer guarantee, simply visit the schedule page occasionally to refresh the cache.

---

## Architecture

```
/ (login/register page)
/dashboard (schedule browser + my bookings)

/api/auth     POST  register / login / logout
/api/schedule POST  fetch live MySports timetable (needs password)
/api/settings GET   load user bookings
              POST  save user bookings
/api/cron     GET   booking bot (called by Vercel cron every 5 min)
```
