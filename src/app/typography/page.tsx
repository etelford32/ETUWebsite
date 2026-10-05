import type { Metadata } from 'next'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EtuTitle from '@/components/EtuTitle'

export const metadata: Metadata = {
  title: 'Title Typography — Explore the Universe 2175 Brand',
  description:
    'The official Explore the Universe 2175 title typography: extruded block capitals of riveted silver plating over glowing cyan crystal.',
}

const SPEC = [
  ['Letterforms', 'Heavy chamfered block capitals, cut straight from the official artwork'],
  ['Material', 'Riveted silver plating peeled back to glowing cyan crystal tiles'],
  ['Energy', 'Cyan crystal light that breathes across the title'],
  ['Motion', 'Letters drop in and land with a flash; hover lifts, click sends a shockwave'],
  ['Digits', 'Assembled from the letters until a dedicated digits sheet exists'],
  ['Accessibility', 'Real text for screen readers; reduced-motion users get a still title'],
]

const USAGE = `import EtuTitle from '@/components/EtuTitle'

<EtuTitle
  as="h1"
  text={['Explore the', 'Universe 2175']}
  className="text-6xl md:text-8xl"
/>

// Options: variant="cyan" | "amber" | "violet",
// intro={false}, stagger={0.1}, interactive={false}, glints={false}`

export default function TypographyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-deep-900 via-[#04101a] to-black pt-28 pb-24 overflow-hidden">
        <section className="max-w-6xl mx-auto px-4 lg:px-6 text-center">
          <p className="eyebrow mb-6">Brand · Title Typography</p>
          <EtuTitle as="h1" text="ETU" className="text-[6rem] sm:text-[8rem] md:text-[10rem]" />
          <div
            aria-hidden="true"
            className="relative mx-auto mt-6 mb-10 h-px max-w-4xl bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.8)]"
          >
            <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-cyan-300" />
          </div>
          <div className="space-y-4 md:space-y-6">
            <EtuTitle as="p" text="ABCDEFGHI" className="text-[2.4rem] sm:text-6xl md:text-7xl" />
            <EtuTitle as="p" text="JKLMNOPQR" className="text-[2.4rem] sm:text-6xl md:text-7xl" />
            <EtuTitle as="p" text="STUVWXYZ" className="text-[2.4rem] sm:text-6xl md:text-7xl" />
            <EtuTitle as="p" text="0123456789" className="text-[2.1rem] sm:text-5xl md:text-6xl" />
          </div>
          <p className="eyebrow mt-10">Hover the letters · click to send a shockwave</p>
        </section>

        <section className="max-w-6xl mx-auto px-4 lg:px-6 mt-24 grid gap-10 lg:grid-cols-2 items-start">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold headline-gradient mb-4">The official treatment</h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              Every Explore the Universe 2175 title uses the letters from the official artwork:
              heavy, chamfered capitals built like hull armour, with riveted silver plates peeled
              back to a crystalline core that leaks cyan energy. On the site each letter is a
              live object: it drops into place, lifts toward your cursor and rings when you click.
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              {SPEC.map(([term, detail]) => (
                <div key={term} className="rounded-lg border border-cyan-500/20 bg-white/5 p-4">
                  <dt className="eyebrow text-cyan-300 mb-1">{term}</dt>
                  <dd className="text-sm text-slate-200">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
          <figure className="rounded-xl overflow-hidden border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.15)]">
            <Image
              src="/brand/etu-title-typography.webp"
              alt="Official ETU 2175 title typography reference sheet: the letters ETU above the full alphabet, in extruded silver and cyan crystal tiles"
              width={1672}
              height={941}
              className="w-full h-auto"
            />
            <figcaption className="bg-black/60 px-4 py-2 text-xs text-slate-400 font-mono">
              Reference artwork · /brand/etu-title-typography.webp
            </figcaption>
          </figure>
        </section>

        <section className="max-w-6xl mx-auto px-4 lg:px-6 mt-24">
          <h2 className="text-2xl md:text-3xl font-bold headline-gradient mb-6">Faction energy variants</h2>
          <div className="grid gap-10 md:grid-cols-3 text-center">
            <div>
              <EtuTitle as="p" text="CYL" className="text-4xl lg:text-5xl" />
              <p className="eyebrow mt-3">cyan · official</p>
            </div>
            <div>
              <EtuTitle as="p" text="Megabot" variant="amber" className="text-4xl lg:text-5xl" />
              <p className="eyebrow mt-3">amber</p>
            </div>
            <div>
              <EtuTitle as="p" text="Mycelari" variant="violet" className="text-4xl lg:text-5xl" />
              <p className="eyebrow mt-3">violet</p>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 lg:px-6 mt-24">
          <h2 className="text-2xl md:text-3xl font-bold headline-gradient mb-6">Using it</h2>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-5 text-sm text-cyan-100 font-mono">
            <code>{USAGE}</code>
          </pre>
          <ul className="mt-6 space-y-2 text-slate-300 text-sm list-disc pl-5">
            <li>Reserve it for page titles and hero moments — one or two per screen.</li>
            <li>Letters A–Z and digits are supported; other characters fall back to plain styled text.</li>
            <li>Section headings and body copy stay in Orbitron / Exo 2.</li>
            <li>To regenerate the letters, run <code className="font-mono text-cyan-200">python3 scripts/extract-title-glyphs.py</code>.</li>
          </ul>
        </section>
      </main>
      <Footer />
    </>
  )
}
