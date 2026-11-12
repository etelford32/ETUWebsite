"use client"

import type { ReactNode } from 'react'
import { trackWishlistClick } from '@/lib/analytics'
import { steamStoreUrl } from '@/lib/campaign'
import { SteamIcon } from '@/components/SteamIcon'

interface WishlistButtonProps {
  /** Which button this is (header, hero, dashboard, …) for the analytics funnel. */
  placement: string
  className?: string
  /** Defaults to a Steam icon + "Wishlist on Steam". */
  children?: ReactNode
  /** Omit the default icon when supplying custom children. */
  icon?: boolean
  /** Defaults to the store page, tagged with this placement for Steam's UTM analytics. */
  href?: string
  /** What the click is for; all land on the store page. */
  intent?: 'wishlist' | 'playtest' | 'demo'
  /** Runs after the click is recorded (the Steam tab opens regardless). */
  onOpen?: () => void
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
  href,
  intent = 'wishlist',
  onOpen,
}: WishlistButtonProps) {
  return (
    <a
      href={href ?? steamStoreUrl(placement)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => {
        // Fire-and-forget; the tab opens regardless.
        void trackWishlistClick(placement, { intent })
        onOpen?.()
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
