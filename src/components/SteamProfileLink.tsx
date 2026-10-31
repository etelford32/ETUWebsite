"use client"

import { useEffect, useState } from 'react'
import { maskSteamId, steamProfileUrl } from '@/lib/steamIdentity'
import { trackSteamEvent } from '@/lib/analytics'
import { SteamIcon } from '@/components/SteamIcon'
import WishlistButton from '@/components/WishlistButton'

export { SteamIcon } from '@/components/SteamIcon'

type Flash = { type: 'success' | 'error'; text: string }

/** Outcome codes /api/steam/callback appends to the return URL. */
const STEAM_MESSAGES: Record<string, Flash> = {
  steam_linked: { type: 'success', text: 'Steam account linked. Your avatar and game progress now sync to this profile.' },
  steam_merged: { type: 'success', text: 'Accounts merged. Your Steam sign-in, game progress and scores now live on this account.' },
  steam_already_linked: {
    type: 'error',
    text: 'That Steam account is linked to a different ETU account that has its own email sign-in. Sign in to that account with Steam, unlink Steam under Settings, then link it here.',
  },
  steam_replace_requires_unlink: { type: 'error', text: 'Unlink your current Steam account before linking a different one.' },
  steam_cancelled: { type: 'error', text: 'Steam sign-in was cancelled.' },
  steam_expired: { type: 'error', text: 'The Steam request expired. Please try again.' },
  steam_unavailable: { type: 'error', text: "Steam didn't respond. Please try again in a minute." },
  steam_rate_limited: { type: 'error', text: 'Too many Steam attempts. Please wait a minute and try again.' },
  steam_failed: { type: 'error', text: 'Steam linking failed. Please try again.' },
  steam_server_error: { type: 'error', text: 'Something went wrong on our side. Please try again.' },
}

/**
 * The callback's code for "this Steam ID already has a Steam-only account
 * (the player signed in from the game first); offer to merge it".
 */
const MERGE_OFFER_CODE = 'steam_merge_available'

/**
 * Read a ?message= / ?error= Steam outcome from the current URL (once), and
 * strip it so a refresh doesn't replay it. Done via window.location rather
 * than useSearchParams so pages don't need a Suspense boundary.
 */
export function useSteamFlash(): [Flash | null, (flash: Flash | null) => void, boolean, (offered: boolean) => void] {
  const [flash, setFlash] = useState<Flash | null>(null)
  const [mergeOffered, setMergeOffered] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const code = url.searchParams.get('message') || url.searchParams.get('error')
    if (code === MERGE_OFFER_CODE) {
      setMergeOffered(true)
    } else {
      if (!code || !STEAM_MESSAGES[code]) return
      setFlash(STEAM_MESSAGES[code])
      if (code === 'steam_linked') void trackSteamEvent('steam_linked')
    }
    url.searchParams.delete('message')
    url.searchParams.delete('error')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  return [flash, setFlash, mergeOffered, setMergeOffered]
}

/** Mutating Steam routes need the session's CSRF token in a header. */
async function csrfHeaders(): Promise<Record<string, string>> {
  const res = await fetch('/api/csrf-token')
  const data = res.ok ? await res.json() : {}
  return { 'Content-Type': 'application/json', 'x-csrf-token': data.csrfToken ?? '' }
}

export interface SteamOwnershipState {
  isVerifiedOwner: boolean
  verifiedAt: string | null
  checkedAt: string | null
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
  /** Purchase-verification state from the profile row, when known. */
  ownership?: SteamOwnershipState
  onOwnershipChanged?: (state: SteamOwnershipState) => void
}

export function SteamProfileLink({
  currentSteamId,
  returnTo,
  canUnlink = true,
  onUnlinked,
  ownership,
  onOwnershipChanged,
}: SteamProfileLinkProps) {
  const [linking, setLinking] = useState(false)
  const [confirmingUnlink, setConfirmingUnlink] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [flash, setFlash, mergeOffered, setMergeOffered] = useSteamFlash()

  const handleLinkSteam = () => {
    setLinking(true)
    void trackSteamEvent('steam_link_start')
    const back = returnTo || `${window.location.pathname}${window.location.search}`
    window.location.href = `/api/steam/auth?link=1&redirect=${encodeURIComponent(back)}`
  }

  const handleUnlink = async () => {
    setUnlinking(true)
    setFlash(null)
    try {
      const res = await fetch('/api/steam/unlink', { method: 'POST', headers: await csrfHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFlash({ type: 'error', text: data.message || data.error || 'Failed to unlink Steam.' })
        return
      }
      void trackSteamEvent('steam_unlinked')
      setFlash({ type: 'success', text: 'Steam account unlinked.' })
      setConfirmingUnlink(false)
      onUnlinked?.()
    } catch {
      setFlash({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setUnlinking(false)
    }
  }

  const handleVerifyOwnership = async () => {
    setVerifying(true)
    setFlash(null)
    try {
      const res = await fetch('/api/steam/verify-ownership', { method: 'POST', headers: await csrfHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFlash({ type: 'error', text: data.message || data.error || 'Could not verify ownership.' })
        return
      }
      if (data.owns_app) {
        void trackSteamEvent('steam_ownership_verified', { family_shared: !!data.family_shared })
        setFlash({
          type: 'success',
          text: data.family_shared
            ? 'Verified: you have access to the game through Steam Family Sharing.'
            : 'Verified: this Steam account owns Explore the Universe 2175.',
        })
        onOwnershipChanged?.({ isVerifiedOwner: true, verifiedAt: data.verified_at, checkedAt: data.checked_at })
      } else {
        void trackSteamEvent('steam_ownership_not_owned')
        setFlash({
          type: 'error',
          text: "Ownership verification failed — make sure you're signed in to the Steam account that owns the game, or wishlist it below.",
        })
        onOwnershipChanged?.({ isVerifiedOwner: false, verifiedAt: null, checkedAt: data.checked_at })
      }
    } catch {
      setFlash({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setVerifying(false)
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
    const verifiedOn = ownership?.verifiedAt
      ? new Date(ownership.verifiedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : null

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

          {/* Purchase verification */}
          {ownership && (
            <div className="mt-3 pt-3 border-t border-green-500/20">
              {ownership.isVerifiedOwner ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 font-semibold text-xs uppercase tracking-wide">
                    <SteamIcon className="w-3.5 h-3.5" />
                    Steam Verified Owner
                  </span>
                  <span className="text-slate-400 flex-1">
                    {verifiedOn ? `Game ownership confirmed ${verifiedOn}.` : 'Game ownership confirmed.'}
                  </span>
                  <button
                    onClick={handleVerifyOwnership}
                    disabled={verifying}
                    className="text-xs text-slate-500 hover:text-slate-300 transition disabled:opacity-50"
                  >
                    {verifying ? 'Checking…' : 'Re-check'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                    <span className="text-slate-300 flex-1">
                      {ownership.checkedAt
                        ? "Steam doesn't show this account owning the game yet."
                        : 'Game ownership not verified yet.'}
                    </span>
                    <button
                      onClick={handleVerifyOwnership}
                      disabled={verifying}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-100 transition disabled:opacity-50 whitespace-nowrap"
                    >
                      {verifying ? 'Checking with Steam…' : 'Verify game ownership'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Don&apos;t have it yet?</span>
                    <WishlistButton
                      placement="steam-card"
                      className="inline-flex items-center gap-1.5 text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline"
                      icon={false}
                    >
                      Wishlist on Steam
                    </WishlistButton>
                  </div>
                </div>
              )}
            </div>
          )}

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
              This account signs in with Steam, so Steam can&apos;t be unlinked.
            </p>
          )}
        </div>
      </div>
    )
  }

  if (mergeOffered) {
    return (
      <div className="space-y-3">
        {flashBanner}
        <SteamMergePrompt
          onCancelled={() => {
            setMergeOffered(false)
            setFlash({ type: 'error', text: 'Steam was not linked. Your game account is unchanged.' })
          }}
        />
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
              Sign in with Steam next time, sync your avatar, verify your copy of the game, and carry progress to this profile.
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

interface MergePreview {
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  level: number | null
  highestScore: number | null
  scores: number
  shipDesigns: number
  isVerifiedOwner: boolean
  createdAt: string | null
}

/**
 * Shown when "Link Steam" found the Steam ID already on a Steam-only account
 * (made when the player signed in from the game). Confirming folds that
 * account into this one via POST /api/steam/merge.
 */
function SteamMergePrompt({ onCancelled }: { onCancelled: () => void }) {
  const [preview, setPreview] = useState<MergePreview | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/steam/merge', { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!active) return
        if (!res.ok || !data.steam_account) {
          setLoadError('The merge request expired. Click "Link Steam" again to restart it.')
          return
        }
        setPreview(data.steam_account)
        setCurrentUsername(data.current_username ?? null)
      })
      .catch(() => active && setLoadError('Network error. Please reload the page and try again.'))
    return () => {
      active = false
    }
  }, [])

  const handleMerge = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/steam/merge', { method: 'POST', headers: await csrfHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.message || 'Merging failed. Please try again.')
        setBusy(false)
        return
      }
      void trackSteamEvent('steam_linked', { merged: true })
      // Reload (staying busy) so every part of the page picks up the merged profile.
      const url = new URL(window.location.href)
      url.searchParams.set('message', 'steam_merged')
      window.location.assign(url.toString())
    } catch {
      setError('Network error. Please try again.')
      setBusy(false)
    }
  }

  const handleCancel = async () => {
    setBusy(true)
    await fetch('/api/steam/merge', { method: 'DELETE', headers: await csrfHeaders() }).catch(() => undefined)
    setBusy(false)
    onCancelled()
  }

  if (loadError) {
    return (
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700 space-y-3">
        <p className="text-sm text-rose-300">{loadError}</p>
        <button onClick={onCancelled} className="text-sm text-slate-400 hover:text-slate-200 transition">
          Dismiss
        </button>
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700 text-sm text-slate-400">
        Checking your Steam account…
      </div>
    )
  }

  const name = preview.username || preview.displayName || 'your Steam account'
  const keepsName = !!currentUsername && !!preview.username && currentUsername.toLowerCase() !== preview.username.toLowerCase()

  return (
    <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 space-y-4">
      <div className="flex items-start gap-3">
        <SteamIcon className="w-8 h-8 text-indigo-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-indigo-100">This Steam account already has game progress</div>
          <p className="text-sm text-slate-300 mt-1">
            You signed in from the game as <span className="font-semibold text-white">{name}</span>. Merge it into
            this account to keep one profile: your Steam sign-in, scores and progress move here, and the separate
            game account is closed.
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <li className="rounded-lg bg-slate-900/60 border border-slate-700 px-2 py-2">
          <div className="text-lg font-semibold text-white">{preview.level ?? 1}</div>
          <div className="text-slate-400">Level</div>
        </li>
        <li className="rounded-lg bg-slate-900/60 border border-slate-700 px-2 py-2">
          <div className="text-lg font-semibold text-white">{preview.scores}</div>
          <div className="text-slate-400">{preview.scores === 1 ? 'Run' : 'Runs'}</div>
        </li>
        <li className="rounded-lg bg-slate-900/60 border border-slate-700 px-2 py-2">
          <div className="text-lg font-semibold text-white">{(preview.highestScore ?? 0).toLocaleString()}</div>
          <div className="text-slate-400">Best score</div>
        </li>
        <li className="rounded-lg bg-slate-900/60 border border-slate-700 px-2 py-2">
          <div className="text-lg font-semibold text-white">{preview.shipDesigns}</div>
          <div className="text-slate-400">{preview.shipDesigns === 1 ? 'Ship design' : 'Ship designs'}</div>
        </li>
      </ul>

      <ul className="text-xs text-slate-400 space-y-1 list-disc pl-5">
        <li>You&apos;ll keep signing in here with your email, and can also sign in with Steam.</li>
        <li>Lifetime game totals keep the higher of the two accounts.</li>
        {keepsName ? (
          <li>
            Your callsign stays <span className="text-slate-200">{currentUsername}</span>;{' '}
            <span className="text-slate-200">{preview.username}</span> is released.
          </li>
        ) : !currentUsername && preview.username ? (
          <li>
            This account takes the callsign <span className="text-slate-200">{preview.username}</span>.
          </li>
        ) : null}
        {preview.isVerifiedOwner && <li>Your Steam Verified Owner badge comes with it.</li>}
        <li>This can&apos;t be undone.</li>
      </ul>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleMerge}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition disabled:opacity-50"
        >
          {busy ? 'Merging…' : 'Merge accounts'}
        </button>
        <button
          onClick={handleCancel}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition disabled:opacity-50"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
