import type { Metadata } from 'next'
import './globals.css'
import '../input.css'

export const metadata: Metadata = {
  title: 'Explore the Universe 2175 — Open-World Space Adventure',
  description: 'Explore the Universe 2175 is an open-world space adventure with living factions, realistic astrophysics, and a global scoreboard.',
  openGraph: {
    title: 'Explore the Universe 2175 — Open-World Space Adventure',
    description: 'A living galaxy with adaptive AI, realistic space physics, and community leaderboards.',
    url: 'https://exploretheuniverse2175.com/',
    siteName: 'Explore the Universe 2175',
    images: [
      {
        url: 'https://exploretheuniverse2175.com/etu_epic7.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore the Universe 2175',
    description: 'Open-world space adventure with realistic astrophysics and dynamic factions.',
    images: ['https://exploretheuniverse2175.com/etu_epic7.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-deep-900 text-slate-100 selection:bg-indigo-500/40">
        {children}
      </body>
    </html>
  )
}
