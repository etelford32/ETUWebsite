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
  ['Character set', 'A–Z, 0–9 and . , - : ! ’ — digits and punctuation built from letter parts'],
  ['Spacing', 'Measured advances, even tracking and 490 optical kerning pairs'],
  ['Motion', 'Letters drop in and land with a flash; hover lifts, click sends a shockwave'],
  ['Accessibility', 'Real text for screen readers; reduced-motion users get a still title'],
]

const USAGE = `import EtuTitle from '@/components/EtuTitle'

<EtuTitle as="h1" text={['Explore the', 'Universe 2175']} className="text-6xl md:text-8xl" />

// Props (defaults in brackets)
//   variant      "cyan" | "amber" | "violet"         ["cyan"]
//   fit          shrink to fit instead of wrapping   [false]
//   compact      half-resolution atlas, < ~3rem      [false]
//   kerning      optical kerning                     [true]
//   animate      any motion at all                   [true]
//   intro / stagger / interactive / glints           [true / 0.07 / true / true]`

const EXPORT = `# PNG for social posts, Steam art, thumbnails ("|" breaks lines)
python3 scripts/render-title.py "Explore the|Universe 2175" --height 120 -o title.png
python3 scripts/render-title.py "Megabot" --bg "#05070d" --padding 32 -o megabot.png

# Regenerate the font from the reference sheet
python3 scripts/extract-title-glyphs.py`

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="max-w-6xl mx-auto px-4 lg:px-6 mt-24">
      <h2 className="text-2xl md:text-3xl font-bold headline-gradient mb-6">{title}</h2>
      {children}
    </section>
  )
}

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
            <EtuTitle as="p" text="ABCDEFGHI" className="text-6xl md:text-7xl" />
            <EtuTitle as="p" text="JKLMNOPQR" className="text-6xl md:text-7xl" />
            <EtuTitle as="p" text="STUVWXYZ" className="text-6xl md:text-7xl" />
            <EtuTitle as="p" text="0123456789" className="text-5xl md:text-6xl" />
            <EtuTitle as="p" text=". , - : ! '" className="text-5xl md:text-6xl" />
          </div>
          <p className="eyebrow mt-10">Hover the letters · click to send a shockwave</p>
        </section>

        <section className="max-w-6xl mx-auto px-4 lg:px-6 mt-24 grid gap-10 lg:grid-cols-2 items-start">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold headline-gradient mb-4">The official treatment</h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              Every Explore the Universe 2175 title uses the letters from the official artwork:
              heavy, chamfered capitals built like hull armour, with riveted silver plates peeled
              back to a crystalline core that leaks cyan energy. Nothing is redrawn — each letter
              is cut from the sheet, measured and kerned, and on the site each one is a live
              object that drops into place, lifts toward your cursor and rings when you click.
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

        <Section title="Optical kerning">
          <p className="text-slate-300 mb-8 max-w-3xl">
            Diagonal letters leave holes next to each other (AV, WA, LT). The extractor measures each
            glyph&rsquo;s edge profile and tucks every pair together until its closest point keeps the
            same sliver of air.
          </p>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <EtuTitle as="p" text="WAVY TALL" kerning={false} animate={false} className="text-4xl lg:text-5xl" />
              <p className="eyebrow mt-3">Without kerning</p>
            </div>
            <div>
              <EtuTitle as="p" text="WAVY TALL" animate={false} className="text-4xl lg:text-5xl" />
              <p className="eyebrow mt-3">With kerning</p>
            </div>
          </div>
        </Section>

        <Section title="Sizes">
          <div className="space-y-6">
            {[
              ['text-7xl', 'Hero · text-7xl–8xl', false],
              ['text-5xl', 'Page title · text-5xl–6xl', false],
              ['text-3xl', 'Section · text-3xl, compact', true],
              ['text-xl', 'Label · text-xl, compact', true],
            ].map(([size, label, compact]) => (
              <div key={size as string} className="flex flex-col gap-2 md:flex-row md:items-center md:gap-8">
                <p className="eyebrow md:w-56 shrink-0">{label}</p>
                <EtuTitle as="p" text="Commander" compact={compact as boolean} intro={false} className={size as string} />
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-sm mt-6 max-w-3xl">
            With <code className="font-mono text-cyan-200">fit</code>, a title shrinks to fit its container
            (down to half size) instead of wrapping — use it for long hero titles. Below about
            3rem, pass <code className="font-mono text-cyan-200">compact</code> to load the 200 KB
            half-resolution atlas instead of the full one.
          </p>
        </Section>

        <Section title="Faction energy variants">
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
        </Section>

        <Section title="Using it">
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-5 text-sm text-cyan-100 font-mono">
            <code>{USAGE}</code>
          </pre>
          <h3 className="mt-10 mb-4 text-lg font-semibold text-slate-100">Outside the website</h3>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-5 text-sm text-cyan-100 font-mono">
            <code>{EXPORT}</code>
          </pre>
          <p className="text-slate-400 text-sm mt-4 max-w-3xl">
            The atlas and its metrics (<code className="font-mono text-cyan-200">/brand/etu-glyphs.webp</code>,{' '}
            <code className="font-mono text-cyan-200">/brand/etu-glyphs.json</code>) are engine-agnostic: cell
            rectangles, advances and kerning pairs, ready to load as a bitmap font in the game.
          </p>
          <ul className="mt-6 space-y-2 text-slate-300 text-sm list-disc pl-5">
            <li>Reserve it for page titles and hero moments — one or two per screen.</li>
            <li>Characters outside the set fall back to plain styled text; keep titles to letters, digits and simple punctuation.</li>
            <li>Section headings and body copy stay in Orbitron / Exo 2.</li>
            <li>Full documentation: <code className="font-mono text-cyan-200">docs/TITLE_TYPOGRAPHY.md</code>.</li>
          </ul>
        </Section>
      </main>
      <Footer />
    </>
  )
}
