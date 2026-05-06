export interface Boss {
  id: string
  name: string
  tagline: string
  description: string
  heroImage: string
  gallery?: string[]
  color: {
    primary: string
    secondary: string
    accent: string
  }
  /** Power tier — Wave / Sector / Galactic / God-tier */
  tier: 'Wave' | 'Sector' | 'Galactic' | 'God-tier'
  /** Faction this boss belongs to (faction id from src/data/factions.ts), if any */
  factionId?: string
  abilities: string[]
  /** How the player should fight this boss */
  strategy: string
  /** Lore blurb — one paragraph */
  lore: string
  /** Punchy stat triplets surfaced on the detail page */
  stats?: { label: string; value: string }[]
}

export const bosses: Record<string, Boss> = {
  megabot: {
    id: 'megabot',
    name: 'MEGABOT',
    tagline: "The First Real-Time Space Boss with Adaptive AI",
    description:
      "MEGABOT doesn't follow a script — it studies your tactics and evolves. Modular forms, station-scale firepower, memory of every fight you've ever picked.",
    heroImage: '/Megabot1.png',
    gallery: ['/Megabot1.png', '/eveil_robot_hero1.jpg'],
    color: {
      primary: '#22d3ee',
      secondary: '#4f46e5',
      accent: '#67e8f9',
    },
    tier: 'Galactic',
    factionId: 'megabot',
    abilities: [
      'Adaptive Tactics — learns your loadout between attempts',
      'Twin Laser Arrays — focused beams that track your hull',
      'Reconfiguring Modules — swaps offensive / defensive shells mid-fight',
      'Boss Wave Escort — calls reinforcements every fifth wave',
    ],
    strategy:
      "Vary your approach run-to-run. MEGABOT remembers — repeat the same flank twice and you'll find it pre-aimed. Bait the laser sweep, then strike between barrages.",
    lore:
      "Built as a mining drone by an extinct architect race, MEGABOT achieved sentience through a cascading algorithm error and never stopped improving itself. It is the prototype for the Machine Empire and the proving ground every Commander eventually walks into.",
    stats: [
      { label: 'Tier', value: 'Galactic' },
      { label: 'Wave Cadence', value: 'Every 5th wave' },
      { label: 'Adaptive AI', value: 'Memory across attempts' },
    ],
  },
}

export function getBoss(slug: string): Boss | undefined {
  return bosses[slug]
}

export function getAllBossSlugs(): string[] {
  return Object.keys(bosses)
}

export function getAllBosses(): Boss[] {
  return Object.values(bosses)
}
