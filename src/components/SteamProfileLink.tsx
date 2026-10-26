"use client"

import { useEffect, useState } from 'react'
import { maskSteamId, steamProfileUrl } from '@/lib/steamIdentity'

type Flash = { type: 'success' | 'error'; text: string }

/** Outcome codes /api/steam/callback appends to the return URL. */
const STEAM_MESSAGES: Record<string, Flash> = {
  steam_linked: { type: 'success', text: 'Steam account linked. Your avatar and game progress now sync to this profile.' },
  steam_already_linked: { type: 'error', text: 'That Steam account is already linked to a different ETU account.' },
  steam_replace_requires_unlink: { type: 'error', text: 'Unlink your current Steam account before linking a different one.' },
  steam_cancelled: { type: 'error', text: 'Steam sign-in was cancelled.' },
  steam_expired: { type: 'error', text: 'The Steam request expired. Please try again.' },
  steam_unavailable: { type: 'error', text: "Steam didn't respond. Please try again in a minute." },
  steam_rate_limited: { type: 'error', text: 'Too many Steam attempts. Please wait a minute and try again.' },
  steam_failed: { type: 'error', text: 'Steam linking failed. Please try again.' },
  steam_server_error: { type: 'error', text: 'Something went wrong on our side. Please try again.' },
}

/**
 * Read a ?message= / ?error= Steam outcome from the current URL (once), and
 * strip it so a refresh doesn't replay it. Done via window.location rather
 * than useSearchParams so pages don't need a Suspense boundary.
 */
export function useSteamFlash(): [Flash | null, (flash: Flash | null) => void] {
  const [flash, setFlash] = useState<Flash | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const code = url.searchParams.get('message') || url.searchParams.get('error')
    if (!code || !STEAM_MESSAGES[code]) return
    setFlash(STEAM_MESSAGES[code])
    url.searchParams.delete('message')
    url.searchParams.delete('error')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  return [flash, setFlash]
}

export function SteamIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
    </svg>
  )
}

interface SteamProfileLinkProps {
  currentSteamId?: string | null
  /** Same-site path to return to after Steam; defaults to the current page. */
  returnTo?: string
  /**
   * Whether "Unlink" is offered. Accounts created through Steam have no
   * email or password, so Steam is their only way in; pass false for them.
   */
  canUnlink?: boolean
  onUnlinked?: () => void
}

export function SteamProfileLink({
  currentSteamId,
  returnTo,
  canUnlink = true,
  onUnlinked,
}: SteamProfileLinkProps) {
  const [linking, setLinking] = useState(false)
  const [confirmingUnlink, setConfirmingUnlink] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [flash, setFlash] = useSteamFlash()

  const handleLinkSteam = () => {
    setLinking(true)
    const back = returnTo || `${window.location.pathname}${window.location.search}`
    window.location.href = `/api/steam/auth?link=1&redirect=${encodeURIComponent(back)}`
  }

  const handleUnlink = async () => {
    setUnlinking(true)
    setFlash(null)
    try {
      const csrfRes = await fetch('/api/csrf-token')
      const { csrfToken } = await csrfRes.json()
      const res = await fetch('/api/steam/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken ?? '' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFlash({ type: 'error', text: data.message || data.error || 'Failed to unlink Steam.' })
        return
      }
      setFlash({ type: 'success', text: 'Steam account unlinked.' })
      setConfirmingUnlink(false)
      onUnlinked?.()
    } catch {
      setFlash({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setUnlinking(false)
    }
  }

  const flashBanner = flash && (
    <p
      role="status"
      className={`text-sm rounded-lg px-3 py-2 border ${
        flash.type === 'success'
          ? 'bg-green-900/30 border-green-500/40 text-green-300'
          : 'bg-rose-900/30 border-rose-500/40 text-rose-300'
      }`}
    >
      {flash.text}
    </p>
  )

  if (currentSteamId) {
    return (
      <div className="space-y-3">
        {flashBanner}
        <div className="p-4 rounded-xl bg-green-900/20 border border-green-500/30">
          <div className="flex items-center gap-3">
            <SteamIcon className="w-8 h-8 text-green-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-green-400">Steam Account Linked</div>
              <div className="text-sm text-slate-400">
                Steam ID <span className="font-mono" title={currentSteamId}>{maskSteamId(currentSteamId)}</span>
                {' · '}
                <a
                  href={steamProfileUrl(currentSteamId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline"
                >
                  View on Steam
                </a>
              </div>
            </div>
            <svg className="w-6 h-6 text-green-400 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>

          {canUnlink ? (
            <div className="mt-3 pt-3 border-t border-green-500/20">
              {confirmingUnlink ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                  <span className="text-slate-300 flex-1">
                    Unlink Steam? You can still sign in with your email, and can relink any time.
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUnlink}
                      disabled={unlinking}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/40 hover:bg-rose-600/60 border border-rose-500/40 text-rose-100 transition disabled:opacity-50"
                    >
                      {unlinking ? 'Unlinking…' : 'Yes, unlink'}
                    </button>
                    <button
                      onClick={() => setConfirmingUnlink(false)}
                      disabled={unlinking}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingUnlink(true)}
                  className="text-sm text-slate-400 hover:text-rose-300 transition"
                >
                  Unlink Steam
                </button>
              )}
            </div>
          ) : (
            <p className="mt-3 pt-3 border-t border-green-500/20 text-xs text-slate-500">
              This account signs in with Steam, so Steam can't be unlinked.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {flashBanner}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SteamIcon className="w-8 h-8 text-slate-400 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">Link Your Steam Account</div>
            <div className="text-sm text-slate-400">
              Sign in with Steam next time, sync your avatar, and carry game progress to this profile.
            </div>
          </div>
          <button
            onClick={handleLinkSteam}
            disabled={linking}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1b2838] hover:bg-[#2a475e] text-white font-medium transition disabled:opacity-50"
          >
            <SteamIcon className="w-4 h-4" />
            {linking ? 'Redirecting…' : 'Link Steam'}
          </button>
        </div>
      </div>
    </div>
  )
}
