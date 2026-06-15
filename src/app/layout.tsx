import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gym Booker · Peoples Fitness',
  description: 'Auto-book your classes at Peoples Fitness Bad Homburg',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
