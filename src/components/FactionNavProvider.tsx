"use client"

import { createContext, useContext, type ReactNode } from 'react'

/** What the site navigation needs to list a faction: no lore, no art. */
export interface FactionNavItem {
  id: string
  name: string
  /** "live" = full profile shipped. "in-development" = stub. */
  status: 'live' | 'in-development'
  /** The faction's primary colour, for its dot in the menu. */
  color: string
}

const FactionNavContext = createContext<FactionNavItem[]>([])

/**
 * Hands the header its faction list. The root layout (a server component)
 * builds the list from src/data/factions.ts and passes it down, so the full
 * faction profiles stay out of the JavaScript every page downloads.
 */
export function FactionNavProvider({
  factions,
  children,
}: {
  factions: FactionNavItem[]
  children: ReactNode
}) {
  return <FactionNavContext.Provider value={factions}>{children}</FactionNavContext.Provider>
}

/** Live factions first, then the in-development roster, alphabetical within each. */
export function useFactionNav(): FactionNavItem[] {
  return useContext(FactionNavContext)
}
