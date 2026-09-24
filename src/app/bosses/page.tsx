import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BossRoster, { type RosterEntry } from '@/components/bosses/BossRoster'
import { getAllBosses } from '@/data/bosses'
import { getFaction } from '@/data/factions'

export default function BossesIndexPage() {
  const entries: RosterEntry[] = getAllBosses().map(boss => {
    const faction = boss.factionId ? getFaction(boss.factionId) : undefined
    return {
      boss,
      faction: faction ? { id: faction.id, short: faction.name.split(' • ')[0] } : undefined,
    }
  })

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        <section className="max-w-7xl mx-auto px-4 lg:px-6 pt-14 pb-24">
          <div className="eyebrow mb-3">Adversaries</div>
          <h1 className="font-display text-4xl md:text-6xl font-bold etu-headline-grad tracking-tight">Bosses</h1>
          <p className="mt-3 mb-8 text-lg text-slate-300">
            <span className="font-mono text-cyan-300">{entries.length}</span> in the game.
          </p>
          <BossRoster entries={entries} />
        </section>
      </main>

      <Footer />
    </>
  )
}
