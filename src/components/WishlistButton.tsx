"use client"

import type { ReactNode } from 'react'
import { STEAM_STORE_URL, trackWishlistClick } from '@/lib/analytics'
import { SteamIcon } from '@/components/SteamIcon'

interface WishlistButtonProps {
  /** Which button this is (header, hero, dashboard, …) for the analytics funnel. */
  placement: string
  className?: string
  /** Defaults to a Steam icon + "Wishlist on Steam". */
  children?: ReactNode
  /** Omit the default icon when supplying custom children. */
  icon?: boolean
  href?: string
  /** What the click is for; both land on the store page. */
  intent?: 'wishlist' | 'playtest'
}

/**
 * The one way to send players to the Steam store page. Every click is
 * recorded as a `wishlist_steam` analytics event with its placement, so the
 * admin console can see which buttons convert.
 */
export default function WishlistButton({
  placement,
  className = 'btn-3d btn-3d-steam',
  children,
  icon = true,
  href = STEAM_STORE_URL,
  intent = 'wishlist',
}: WishlistButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => {
        // Fire-and-forget; the tab opens regardless.
        void trackWishlistClick(placement, { intent })
      }}
    >
      {children ?? (
        <>
          {icon && <SteamIcon className="w-5 h-5" />}
          <span>Wishlist on Steam</span>
        </>
      )}
    </a>
  )
}
