'use client'

// The game's Ship Designer, on the website.
//
// The layout follows GameModeSelectScreen._draw_ship_design_page in the game:
// the same four tabs, the same three panels on each, the same labels and
// colours. Everything about the ship comes from src/lib/shipDesigner, which is
// exported from the game by scripts/export-ship-designer.py.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EtuTitle from '@/components/EtuTitle'
import ShipHangar from '@/components/ShipHangar'
import {
  ACTION_BAR,
  FRESH_PROFILE,
  LASER_MODES,
  MISSILE_MODES,
  SHIP,
  SKINS,
  UI,
  freshDesign,
  isLaserModeUnlocked,
  isMissileModeUnlocked,
  normalizeDesign,
  skinById,
  titleCase,
  type DesignerTab,
  type ShipDesign,
  type ShipMode,
} from '@/lib/shipDesigner'

const STORAGE_KEY = 'etu.shipDesigner.design'

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'signin' }
  | { kind: 'error'; message: string }

export default function ShipDesignerPage() {
  const [design, setDesign] = useState<ShipDesign>(freshDesign)
  const [tab, setTab] = useState<DesignerTab>('overview')
  const [signedIn, setSignedIn] = useState(false)
  const [save, setSave] = useState<SaveState>({ kind: 'idle' })
  const loaded = useRef(false)

  // A design in progress survives a reload; a signed-in pilot's saved design
  // wins over it.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) setDesign(normalizeDesign(JSON.parse(stored)))
    } catch {
      // Storage is a convenience; the page works without it.
    }
    loaded.current = true

    let cancelled = false
    ;(async () => {
      try {
        const session = await fetch('/api/auth/session').then(res => res.json())
        if (cancelled || !session.authenticated) return
        setSignedIn(true)
        const saved = await fetch('/api/save-ship').then(res => (res.ok ? res.json() : null))
        if (!cancelled && saved?.design) setDesign(normalizeDesign(saved.design))
      } catch {
        // Signed out, or offline: the page is still a designer.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!loaded.current) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(design))
    } catch {
      // See above.
    }
  }, [design])

  const change = useCallback((next: Partial<ShipDesign>) => {
    setDesign(current => ({ ...current, ...next }))
    setSave({ kind: 'idle' })
  }, [])

  const skin = skinById(design.appearance.skin_id)
  const skinIndex = SKINS.findIndex(entry => entry.id === skin.id)
  const stepSkin = useCallback(
    (delta: number) => {
      const next = SKINS[(skinIndex + delta + SKINS.length) % SKINS.length]
      change({ appearance: { skin_id: next.id } })
    },
    [skinIndex, change]
  )

  // 1-4 switch tabs, as in the game.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const index = ['1', '2', '3', '4'].indexOf(event.key)
      if (index >= 0) setTab(SHIP.tabs[index].id as DesignerTab)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function handleSave() {
    if (!signedIn) {
      setSave({ kind: 'signin' })
      return
    }
    setSave({ kind: 'saving' })
    try {
      const csrf = await fetch('/api/csrf-token').then(res => res.json())
      const response = await fetch('/api/save-ship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.csrfToken ?? '' },
        body: JSON.stringify({ ship_data: design }),
      })
      if (response.status === 401) {
        setSignedIn(false)
        setSave({ kind: 'signin' })
        return
      }
      if (!response.ok) throw new Error('The ship could not be saved. Try again in a moment.')
      setSave({ kind: 'saved' })
    } catch (error: any) {
      setSave({ kind: 'error', message: error?.message || 'The ship could not be saved.' })
    }
  }

  const laserLabel = titleCase(design.active_laser_mode)
  const missileLabel = titleCase(design.active_missile_mode)
  const laserUnlocked = LASER_MODES.filter(mode => isLaserModeUnlocked(mode.id)).length
  const missileUnlocked = MISSILE_MODES.filter(mode => isMissileModeUnlocked(mode.id)).length

  return (
    <>
      <Header />
      <main
        className="min-h-screen bg-deep-900 text-slate-100"
        style={
          {
            '--sd-border': UI.panelBorder,
            '--sd-label': UI.rowLabel,
            '--sd-value': UI.rowValue,
            '--sd-hint': UI.hint,
            '--sd-locked': UI.locked,
          } as CSSProperties
        }
      >
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:pt-12">
          {/* Header: title centred, the action on the right, as in the game. */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="hidden w-40 sm:block" />
            <div className="text-center">
              <EtuTitle as="h1" text="Ship Designer" className="text-4xl sm:text-5xl md:text-6xl" />
              <p className="mt-3 text-sm sm:text-base" style={{ color: UI.hint }}>
                Profile ship <span aria-hidden>·</span> Level {FRESH_PROFILE.level}{' '}
                <span aria-hidden>·</span> {skin.name}
              </p>
            </div>
            <div className="flex w-40 flex-col items-center gap-2 sm:items-end">
              <GameButton accent={UI.syncAccent} onClick={handleSave} disabled={save.kind === 'saving'} wide>
                {save.kind === 'saving' ? 'Saving…' : save.kind === 'saved' ? 'Saved' : 'Save'}
              </GameButton>
              <p className="min-h-[1.25rem] text-center text-xs sm:text-right" role="status" style={{ color: UI.hint }}>
                {save.kind === 'saved' && 'Saved to your ETU profile.'}
                {save.kind === 'error' && <span className="text-red-300">{save.message}</span>}
                {save.kind === 'signin' && (
                  <>
                    <Link href="/login" className="underline" style={{ color: UI.tabAccent }}>
                      Sign in
                    </Link>{' '}
                    to save. Your design is kept on this device.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Ship designer">
            {SHIP.tabs.map(entry => (
              <GameButton
                key={entry.id}
                role="tab"
                aria-selected={tab === entry.id}
                active={tab === entry.id}
                accent={tab === entry.id ? UI.tabAccent : UI.panelBorder}
                onClick={() => setTab(entry.id as DesignerTab)}
                wide
              >
                {entry.label}
              </GameButton>
            ))}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.05fr_1.1fr_1fr]" role="tabpanel">
            {tab === 'overview' && (
              <>
                <Panel title="Appearance">
                  <ShipHangar skin={skin} className="mx-auto block h-72 w-full sm:h-80" />
                  <p className="mt-1 text-center text-xl font-bold" style={{ color: UI.title }}>
                    {skin.name}
                  </p>
                  <SkinStrip selected={skin.id} onSelect={id => change({ appearance: { skin_id: id } })} onStep={stepSkin} />
                  <Hint>
                    Click a hull or use the arrows. These are the game&apos;s {SKINS.length} hulls, and the choice
                    is the ship you fly in every mode.
                  </Hint>
                </Panel>

                <Panel title="Pilot">
                  <Row label="Level" value={FRESH_PROFILE.level} color={UI.level} />
                  <Row label="XP" value={`${FRESH_PROFILE.xp} / ${FRESH_PROFILE.xpNext}`} color={UI.xp} />
                  <div
                    className="mb-3 h-3 overflow-hidden rounded-md border"
                    style={{ background: UI.xpBarTrack, borderColor: '#82aad2' }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.min(100, (FRESH_PROFILE.xp / FRESH_PROFILE.xpNext) * 100)}%`,
                        background: UI.xpBarFill,
                      }}
                    />
                  </div>
                  <Row label="Skill Points" value={FRESH_PROFILE.skillPoints} color="#ffda7e" />
                  <Row label="Skills" value={`${FRESH_PROFILE.skills.length} at base rank`} />
                  <Hint>
                    Every pilot starts here. Level, XP and what you buy with skill points are earned in the
                    game and stay with the ship.
                  </Hint>
                  <SubHeading>The hull shows its progress</SubHeading>
                  <TierStrip />
                </Panel>

                <Panel title="Loadout">
                  <Row label="Laser" value={laserLabel} color="#82f0dc" />
                  <Row label="Missile" value={missileLabel} color="#b4f596" />
                  <Row label="Laser Modes" value={`${laserUnlocked} / ${LASER_MODES.length}`} />
                  <Row label="Missile Modes" value={`${missileUnlocked} / ${MISSILE_MODES.length}`} />
                  <SubHeading>Action Bar</SubHeading>
                  <ActionBarChips />
                  <Hint>Defaults change on the Loadout tab.</Hint>
                </Panel>
              </>
            )}

            {tab === 'loadout' && (
              <>
                <Panel title="Profile Defaults">
                  <Row label="Laser" value={laserLabel} color="#82f0dc" />
                  <Row label="Missile" value={missileLabel} color="#b4f596" />
                  <Row label="Skin" value={skin.name} />
                  <SubHeading>Action Bar Defaults</SubHeading>
                  <ActionBarChips />
                  <Hint>The bar is rearranged in the game, where every ability can be tried.</Hint>
                </Panel>

                <Panel title="Laser Mode">
                  <ModeButtons
                    modes={LASER_MODES}
                    active={design.active_laser_mode}
                    unlocked={isLaserModeUnlocked}
                    accent={UI.laserAccent}
                    onSelect={id => change({ active_laser_mode: id })}
                  />
                  <Hint>Locked modes unlock from Character Screen upgrades, in the game.</Hint>
                </Panel>

                <Panel title="Missile Mode">
                  <ModeButtons
                    modes={MISSILE_MODES}
                    active={design.active_missile_mode}
                    unlocked={isMissileModeUnlocked}
                    accent={UI.missileAccent}
                    onSelect={id => change({ active_missile_mode: id })}
                  />
                  <Hint>Defaults hydrate Survival and Construct ships.</Hint>
                </Panel>
              </>
            )}

            {tab === 'upgrades' && (
              <>
                <Panel title="Skills">
                  <Row label="Skill Points" value={FRESH_PROFILE.skillPoints} color="#ffda7e" />
                  {FRESH_PROFILE.skills.map(skill => (
                    <Row key={skill.id} label={skill.label} value={`Rank ${skill.rank}`} dim />
                  ))}
                  <Hint>All {FRESH_PROFILE.skills.length} start at base rank. Ranks are bought with skill points as the ship levels.</Hint>
                </Panel>

                <Panel title="Hull Progression">
                  <p className="mb-3 text-sm" style={{ color: UI.rowLabel }}>
                    As a run invests, the hull earns a progression tier: running lights along the wings, a rim
                    glow, wing chevrons, a lit core.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {SHIP.progressionTiers.map(entry => (
                      <figure key={entry.tier} className="rounded-md border border-white/10 bg-black/20 p-2 text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={entry.sprite}
                          alt={`Classic hull at progression tier ${entry.tier}`}
                          width={SHIP.sprite.width}
                          height={SHIP.sprite.height}
                          loading="lazy"
                          className="mx-auto h-28 w-auto"
                        />
                        <figcaption className="mt-1 text-xs" style={{ color: UI.rowLabel }}>
                          {entry.tier === 0 ? 'Fresh hull' : `Tier ${entry.tier}`}
                          <span className="block" style={{ color: UI.level }}>
                            Level {entry.level}
                          </span>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                  <Hint>Levels shown are by levelling alone; spending on defence earns each tier sooner.</Hint>
                </Panel>

                <Panel title="Laser Doctrine">
                  <p className="mb-3 text-sm" style={{ color: UI.rowLabel }}>
                    The accents take the colour of the laser doctrine a run commits to, so the ship wears its
                    build.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {SHIP.doctrines.map(entry => (
                      <figure key={entry.id} className="rounded-md border border-white/10 bg-black/20 p-2 text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={entry.sprite}
                          alt={`Classic hull at the top tier in the ${entry.name} doctrine's colour`}
                          width={SHIP.sprite.width}
                          height={SHIP.sprite.height}
                          loading="lazy"
                          className="mx-auto h-28 w-auto"
                        />
                        <figcaption className="mt-1 text-sm font-semibold" style={{ color: entry.accent }}>
                          {entry.name}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                  <Hint>An uncommitted run wears a neutral blue-white.</Hint>
                </Panel>
              </>
            )}

            {tab === 'abilities' && (
              <>
                <Panel title="Laser Abilities">
                  {LASER_MODES.map(mode => (
                    <StatusRow
                      key={mode.id}
                      label={titleCase(mode.id)}
                      active={mode.id === design.active_laser_mode}
                      unlocked={isLaserModeUnlocked(mode.id)}
                      activeColor="#82f0dc"
                    />
                  ))}
                </Panel>

                <Panel title="Missile Abilities">
                  {MISSILE_MODES.map(mode => (
                    <StatusRow
                      key={mode.id}
                      label={titleCase(mode.id)}
                      active={mode.id === design.active_missile_mode}
                      unlocked={isMissileModeUnlocked(mode.id)}
                      activeColor="#b4f596"
                    />
                  ))}
                  <Hint>The missile and mine trees rank up in the game.</Hint>
                </Panel>

                <Panel title="Action Bar">
                  <ul className="space-y-2">
                    {ACTION_BAR.map((slot, index) =>
                      slot ? (
                        <li key={slot.id} className="flex gap-2 text-sm">
                          <span
                            className="mt-0.5 h-fit shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-semibold tracking-wide"
                            style={{ borderColor: slot.accent ?? UI.panelBorder, color: UI.title, background: UI.buttonFill }}
                          >
                            {index < SHIP.actionBar.hotkeySlots && (
                              <span style={{ color: UI.level }}>{index + 1} </span>
                            )}
                            {slot.label}
                          </span>
                          <span style={{ color: UI.rowLabel }}>{slot.description}</span>
                        </li>
                      ) : null
                    )}
                  </ul>
                </Panel>
              </>
            )}
          </div>

          <p className="mt-4 text-center text-xs sm:text-sm" style={{ color: UI.hint }}>
            1-4 switch tabs <span aria-hidden>·</span> Save writes the design to your ETU profile{' '}
            <span aria-hidden>·</span> Hulls and data are exported from the game build
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}

// ── the game's own drawing helpers, as components ──────────────────────────

/** _ship_design_draw_panel */
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      className="min-w-0 rounded-lg border-2 p-4"
      style={{ background: UI.panelFill, borderColor: UI.panelBorder }}
    >
      <h2 className="mb-3 text-2xl font-bold" style={{ color: UI.title }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

/** _ship_design_draw_row */
function Row({ label, value, color, dim }: { label: string; value: ReactNode; color?: string; dim?: boolean }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3 text-base">
      <span className="truncate" style={{ color: dim ? UI.locked : UI.rowLabel }}>
        {label}
      </span>
      <span className="shrink-0 tabular-nums" style={{ color: dim ? UI.locked : color ?? UI.rowValue }}>
        {value}
      </span>
    </div>
  )
}

function StatusRow({
  label,
  active,
  unlocked,
  activeColor,
}: {
  label: string
  active: boolean
  unlocked: boolean
  activeColor: string
}) {
  const status = active ? 'Active' : unlocked ? 'Unlocked' : 'Locked'
  const color = active ? activeColor : unlocked ? UI.rowValue : UI.locked
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3 text-base">
      <span style={{ color: UI.rowLabel }}>{label}</span>
      <span style={{ color }}>{status}</span>
    </div>
  )
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 mt-4 text-base" style={{ color: UI.rowLabel }}>
      {children}
    </h3>
  )
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-sm leading-snug" style={{ color: UI.hint }}>
      {children}
    </p>
  )
}

/** _ship_design_draw_button */
function GameButton({
  children,
  active = false,
  disabled = false,
  accent,
  wide = false,
  onClick,
  ...rest
}: {
  children: ReactNode
  active?: boolean
  disabled?: boolean
  accent: string
  wide?: boolean
  onClick?: () => void
  role?: string
  'aria-selected'?: boolean
  'aria-pressed'?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative rounded-[7px] px-3 py-2 text-xs font-medium uppercase tracking-wide transition-[filter] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 enabled:hover:brightness-125 disabled:cursor-not-allowed ${
        wide ? 'w-full' : ''
      }`}
      style={{
        background: disabled ? UI.buttonFillDisabled : active ? UI.buttonFillActive : UI.buttonFill,
        border: `${active ? 2 : 1}px solid ${disabled ? UI.buttonBorderDisabled : accent}`,
        color: disabled ? '#76889a' : '#ecf8ff',
      }}
      {...rest}
    >
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[3px] rounded-[5px] border"
          style={{ borderColor: UI.buttonInnerActive }}
        />
      )}
      {children}
    </button>
  )
}

/** _draw_ship_design_mode_buttons */
function ModeButtons({
  modes,
  active,
  unlocked,
  accent,
  onSelect,
}: {
  modes: ShipMode[]
  active: string
  unlocked: (id: string) => boolean
  accent: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {modes.map(mode => {
        const enabled = unlocked(mode.id)
        return (
          <GameButton
            key={mode.id}
            accent={accent}
            active={mode.id === active}
            disabled={!enabled}
            aria-pressed={mode.id === active}
            title={enabled ? undefined : 'Unlocks in the game'}
            onClick={() => onSelect(mode.id)}
            wide
          >
            {mode.label}
          </GameButton>
        )
      })}
    </div>
  )
}

/** _draw_ship_design_action_bar_summary */
function ActionBarChips() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ACTION_BAR.map((slot, index) => (
        <span
          key={slot?.id ?? `empty-${index}`}
          title={slot?.description}
          className="rounded border px-1.5 py-0.5 text-xs tracking-wide"
          style={{ borderColor: UI.panelBorder, background: UI.buttonFill, color: '#ecf8ff' }}
        >
          {index < SHIP.actionBar.hotkeySlots && <span style={{ color: UI.level }}>{index + 1} </span>}
          {slot?.label ?? '-'}
        </span>
      ))}
    </div>
  )
}

/** _draw_ship_design_skin_strip: every hull, as the game's designer draws it. */
function SkinStrip({
  selected,
  onSelect,
  onStep,
}: {
  selected: string
  onSelect: (id: string) => void
  onStep: (delta: number) => void
}) {
  const stripRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const strip = stripRef.current
    const card = strip?.querySelector<HTMLElement>(`[data-skin="${selected}"]`)
    if (!strip || !card) return
    strip.scrollTo({
      left: card.offsetLeft - (strip.clientWidth - card.clientWidth) / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [selected])

  return (
    <div
      className="mt-3 flex items-center gap-1 rounded-lg border p-1.5"
      style={{ borderColor: UI.panelBorder, background: 'rgba(8,16,28,.6)' }}
    >
      <StripArrow label="Previous hull" onClick={() => onStep(-1)}>
        ◀
      </StripArrow>
      <div
        ref={stripRef}
        className="relative flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="radiogroup"
        aria-label="Hull"
        onKeyDown={event => {
          if (event.key === 'ArrowLeft') onStep(-1)
          if (event.key === 'ArrowRight') onStep(1)
        }}
      >
        {SKINS.map(entry => {
          const active = entry.id === selected
          return (
            <button
              key={entry.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={entry.name}
              title={entry.name}
              data-skin={entry.id}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(entry.id)}
              className="shrink-0 rounded-md border px-2 py-1.5 transition-[filter] hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              style={{
                borderColor: active ? UI.tabAccent : 'transparent',
                background: active ? UI.buttonFillActive : 'transparent',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.sprite}
                alt=""
                width={SHIP.sprite.width}
                height={SHIP.sprite.height}
                className="h-14 w-auto"
              />
            </button>
          )
        })}
      </div>
      <StripArrow label="Next hull" onClick={() => onStep(1)}>
        ▶
      </StripArrow>
    </div>
  )
}

function StripArrow({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-8 w-8 shrink-0 place-items-center rounded border text-xs hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      style={{ borderColor: UI.panelBorder, background: UI.buttonFill, color: '#ecf8ff' }}
    >
      {children}
    </button>
  )
}

function TierStrip() {
  return (
    <div className="flex items-end justify-between gap-1">
      {SHIP.progressionTiers.map(entry => (
        <figure key={entry.tier} className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.sprite}
            alt={`Hull at progression tier ${entry.tier}`}
            width={SHIP.sprite.width}
            height={SHIP.sprite.height}
            loading="lazy"
            className="mx-auto h-16 w-auto"
          />
          <figcaption className="mt-1 text-[11px]" style={{ color: UI.rowLabel }}>
            Lv {entry.level}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
