import type { Metadata } from 'next'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EtuTitle from '@/components/EtuTitle'
import AudioHub from '@/components/audio/AudioHub'

export const metadata: Metadata = {
  title: 'Intergalactic Radio | Explore the Universe 2175',
  description:
    'Listen to the Explore the Universe 2175 soundtrack and every sound in the game, build your own radio stations, and upload your own music to fly to.',
  alternates: { canonical: '/audio' },
}

export default function AudioPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        <section className="relative overflow-hidden border-b border-white/10">
          <Image
            src="/etu_soundtrack.png"
            alt=""
            fill
            priority
            className="object-cover object-[50%_32%] opacity-45"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-deep-900/50 via-deep-900/75 to-deep-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-deep-900/90 via-deep-900/55 to-transparent" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-9 pt-12 md:pb-10 md:pt-16 lg:px-6">
            <div className="eyebrow mb-3 text-slate-200">Original soundtrack by the E.T.</div>
            <EtuTitle as="h1" text="Intergalactic Radio" fit className="text-4xl md:text-6xl" />
            <p
              className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-100 md:text-xl"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,.9)' }}
            >
              The music and sounds of Explore the Universe 2175. Tune the stations from the game, build your own, and bring your own
              music along for the flight.
            </p>

            <a
              href="https://soundcloud.com/elliottelford"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-300 underline-offset-4 hover:text-white hover:underline"
            >
              More from the composer on SoundCloud
              <span aria-hidden>↗</span>
            </a>
          </div>
        </section>

        <AudioHub />
      </main>

      <Footer />
    </>
  )
}
