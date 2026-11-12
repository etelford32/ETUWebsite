// The game's Ship Designer, as the website reads it.
//
// gameData.json is written by scripts/export-ship-designer.py from the game
// (etelford32/ETU). Nothing about the ship is authored here: the skins, the
// sprites, the modes and the action bar are the game's. To change them, change
// the game and export again.

import gameData from './gameData.json'

export interface ShipSkin {
  id: string
  name: string
  /** The flat hull the game's own designer draws (Ship.create_ship_surface). */
  sprite: string
  /** The lit 3D hull the ship wears in flight (etu.render.ship_hull_3d). */
  lit: string
  palette: { hull: string; glow: string; trim: string; trail: string; thruster: string }
}

export interface ShipMode {
  id: string
  label: string
}

export interface ActionBarSlot {
  id: string
  label: string
  category?: string
  description?: string
  accent?: string
}

export const SHIP = gameData
export const SKINS = gameData.skins as ShipSkin[]
export const LASER_MODES = gameData.laserModes as ShipMode[]
export const MISSILE_MODES = gameData.missileModes as ShipMode[]
export const ACTION_BAR = gameData.actionBar.defaults as (ActionBarSlot | null)[]
export const FRESH_PROFILE = gameData.freshProfile
export const UI = gameData.ui

export type DesignerTab = 'overview' | 'loadout' | 'upgrades' | 'abilities'

/**
 * What the website saves. The keys are the game's own profile keys
 * (SaveGame._normalize_ship_progress_profile), so the game can read a saved
 * design without a translation table.
 */
export interface ShipDesign {
  schema: 'etu.ship_profile.web.v1'
  appearance: { skin_id: string }
  active_laser_mode: string
  active_missile_mode: string
}

/** The one design a pilot has, as the game's designer calls it. */
export const PROFILE_SHIP_NAME = 'Profile ship'

export function freshDesign(): ShipDesign {
  return {
    schema: 'etu.ship_profile.web.v1',
    appearance: { skin_id: FRESH_PROFILE.skinId },
    active_laser_mode: FRESH_PROFILE.activeLaserMode,
    active_missile_mode: FRESH_PROFILE.activeMissileMode,
  }
}

export function skinById(id: string): ShipSkin {
  return SKINS.find(skin => skin.id === id) ?? SKINS[0]
}

/**
 * Modes a pilot can set as a default from the website. The site does not know
 * what a pilot has unlocked in the game, so it offers what a fresh profile
 * has; the rest unlock in the game and are chosen there.
 */
export function isLaserModeUnlocked(id: string): boolean {
  return FRESH_PROFILE.unlockedLaserModes.includes(id)
}

export function isMissileModeUnlocked(id: string): boolean {
  return FRESH_PROFILE.unlockedMissileModes.includes(id)
}

/**
 * Read anything (a request body, localStorage, an old saved row) as a design.
 * Unknown skins and modes fall back the way the game's own normalizers do:
 * to the fresh profile's value, never to an error.
 */
export function normalizeDesign(raw: unknown): ShipDesign {
  const design = freshDesign()
  if (!raw || typeof raw !== 'object') return design
  const source = raw as Record<string, any>

  const skin = String(source.appearance?.skin_id ?? source.skin_id ?? '').trim().toLowerCase()
  if (SKINS.some(entry => entry.id === skin)) design.appearance.skin_id = skin

  const laser = String(source.active_laser_mode ?? '').trim().toLowerCase()
  if (LASER_MODES.some(mode => mode.id === laser) && isLaserModeUnlocked(laser)) {
    design.active_laser_mode = laser
  }

  const missile = String(source.active_missile_mode ?? '').trim().toLowerCase()
  if (MISSILE_MODES.some(mode => mode.id === missile) && isMissileModeUnlocked(missile)) {
    design.active_missile_mode = missile
  }
  return design
}

/** `mode.replace("_", " ").title()`, as the game's designer labels a mode. */
export function titleCase(token: string): string {
  return token.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}
