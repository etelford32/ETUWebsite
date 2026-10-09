import type { Metadata } from 'next'
import Script from 'next/script'
import { Orbitron, Exo_2, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import '../input.css'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import { SITE_URL } from '@/lib/siteUrl'

// Self-hosted at build time: the CSP (next.config.js) only allows fonts and
// stylesheets from 'self', so a Google Fonts <link>/@import is blocked.
const orbitron = Orbitron({ subsets: ['latin'], display: 'swap', variable: '--font-orbitron-face' })
const exo2 = Exo_2({ subsets: ['latin'], display: 'swap', variable: '--font-exo2-face' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-jetbrains-face' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Explore the Universe 2175 — Open-Galaxy Space Adventure | Free Steam Playtest',
  description: 'Explore a new galaxy every run: quests, bosses, black holes and solar storms, with a crystal AI companion who learns who you are. Free Steam playtest.',
  alternates: {
    // Relative — resolves per page against metadataBase, so every route
    // self-canonicalizes instead of pointing at the homepage.
    canonical: './',
  },
  icons: {
    icon: '/logo2.png',
    apple: '/logo2.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Explore the Universe 2175 — Open-Galaxy Space Adventure | Free Steam Playtest',
    description: 'Explore a new galaxy every run: quests, bosses, black holes and solar storms, with a crystal AI companion who learns who you are. Free Steam playtest.',
    url: `${SITE_URL}/`,
    siteName: 'Explore the Universe 2175',
    images: [
      {
        url: `${SITE_URL}/etu_epic7.png`,
        width: 1024,
        height: 1024,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore the Universe 2175 — Open-Galaxy Space Adventure | Free Steam Playtest',
    description: 'Explore a new galaxy every run: quests, bosses, black holes and solar storms, with a crystal AI companion who learns who you are. Free Steam playtest.',
    images: [`${SITE_URL}/etu_epic7.png`],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${orbitron.variable} ${exo2.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-deep-900 text-slate-100 selection:bg-indigo-500/40">
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-6RCVW65DDL"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-6RCVW65DDL');
          `}
        </Script>
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  )
}
