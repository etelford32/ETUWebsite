/**
 * LEADERBOARD-00: the boards the game, this website and Steam share.
 *
 * A board name here is also its Steam leaderboard API name and the
 * `p_board` the get_leaderboard RPC accepts (see the 20261027 migration),
 * so the three can never drift apart.
 */

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'hardcore'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export const GAME_MODES = ['survival', 'coop_survival'] as const
export type GameMode = (typeof GAME_MODES)[number]

export type SteamDisplayType = 'Numeric' | 'Seconds'

export interface BoardDef {
  name: string
  label: string
  /** What the board ranks: the run's score, or how long it lasted. */
  ranks: 'score' | 'time'
  steamDisplayType: SteamDisplayType
}

export const BOARDS: readonly BoardDef[] = [
  { name: 'SURVIVAL_GLOBAL', label: 'Survival', ranks: 'score', steamDisplayType: 'Numeric' },
  { name: 'SURVIVAL_EASY', label: 'Easy', ranks: 'score', steamDisplayType: 'Numeric' },
  { name: 'SURVIVAL_MEDIUM', label: 'Medium', ranks: 'score', steamDisplayType: 'Numeric' },
  { name: 'SURVIVAL_HARD', label: 'Hard', ranks: 'score', steamDisplayType: 'Numeric' },
  { name: 'SURVIVAL_HARDCORE', label: 'Hardcore', ranks: 'score', steamDisplayType: 'Numeric' },
  { name: 'SURVIVAL_LONGEST', label: 'Longest Survival', ranks: 'time', steamDisplayType: 'Seconds' },
  { name: 'COOP_SURVIVAL', label: 'Co-op Survival', ranks: 'score', steamDisplayType: 'Numeric' },
]

export const BOARD_NAMES = BOARDS.map(b => b.name)

export function getBoard(name: string): BoardDef | undefined {
  return BOARDS.find(b => b.name === name)
}

/** Steam stores int32 scores. */
export const INT32_MAX = 2 ** 31 - 1

/** A submitted game run, after the route has validated its shape. */
export interface GameRun {
  run_id: string
  mode: GameMode
  difficulty: Difficulty
  score: number
  time_seconds: number
  wave: number
  kills: number
  ship_skin: string | null
  ship_skin_index: number
  doctrine: string | null
  doctrine_index: number
  game_version: string | null
  build: number
  ended_at: string
  end_reason: string | null
  coop_session_id: string | null
}

// ── parsing ─────────────────────────────────────────────────────────────────

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function int(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  return value >= min && value <= max ? value : null
}

function text(value: unknown, max: number): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, max)
  return trimmed || null
}

/** The run, or null when its shape is wrong. */
export function parseRun(body: any): GameRun | null {
  if (!body || typeof body !== 'object') return null
  const run_id = typeof body.run_id === 'string' && UUID_PATTERN.test(body.run_id) ? body.run_id.toLowerCase() : null
  const mode = (GAME_MODES as readonly string[]).includes(body.mode) ? body.mode : null
  const difficulty = (DIFFICULTIES as readonly string[]).includes(body.difficulty) ? body.difficulty : null
  const score = int(body.score, 0, INT32_MAX)
  const time_seconds = int(body.time_seconds, 0, 24 * 60 * 60)
  const wave = int(body.wave ?? 1, 1, 100000)
  const kills = int(body.kills ?? 0, 0, INT32_MAX)
  const ended_at = typeof body.ended_at === 'string' && Number.isFinite(Date.parse(body.ended_at)) ? body.ended_at : null
  if (!run_id || !mode || !difficulty || score == null || time_seconds == null || wave == null || kills == null || !ended_at) {
    return null
  }
  return {
    run_id,
    mode,
    difficulty,
    score,
    time_seconds,
    wave,
    kills,
    ship_skin: text(body.ship_skin, 40),
    ship_skin_index: int(body.ship_skin_index ?? 0, 0, 1000) ?? 0,
    doctrine: text(body.doctrine, 40),
    doctrine_index: int(body.doctrine_index ?? 0, 0, 1000) ?? 0,
    game_version: text(body.game_version, 32),
    build: int(body.build ?? 0, 0, INT32_MAX) ?? 0,
    ended_at: new Date(Date.parse(ended_at)).toISOString(),
    end_reason: text(body.end_reason, 40),
    coop_session_id: text(body.coop_session_id, 64),
  }
}

/** The boards one run feeds, in the order they are written to Steam. */
export function boardsForRun(run: Pick<GameRun, 'mode' | 'difficulty'>): string[] {
  if (run.mode === 'coop_survival') return ['COOP_SURVIVAL']
  return ['SURVIVAL_GLOBAL', `SURVIVAL_${run.difficulty.toUpperCase()}`, 'SURVIVAL_LONGEST']
}

/** The value a run posts to a board. */
export function boardValue(board: string, run: Pick<GameRun, 'score' | 'time_seconds'>): number {
  const value = getBoard(board)?.ranks === 'time' ? run.time_seconds : run.score
  return Math.min(Math.max(Math.trunc(value), 0), INT32_MAX)
}

/**
 * Steam leaderboard entry details (int32[]). Version 1 layout — append new
 * fields, never reorder: the game reads these back by index.
 */
export const DETAILS_VERSION = 1
export function packDetails(run: GameRun): number[] {
  const clamp = (n: number) => Math.min(Math.max(Math.trunc(n) || 0, 0), INT32_MAX)
  return [
    DETAILS_VERSION,
    clamp(run.time_seconds),
    clamp(run.wave),
    DIFFICULTIES.indexOf(run.difficulty),
    clamp(run.ship_skin_index),
    clamp(run.kills),
    clamp(run.doctrine_index),
    clamp(run.build),
  ]
}

// ── plausibility ────────────────────────────────────────────────────────────
//
// Scores are self-reported (ACCOUNT-01). These checks don't make them
// trustworthy; they keep obviously impossible runs off the public boards.
// A failing run is still stored, unverified, with the reason.

export const MIN_RUN_SECONDS = 30
export const MAX_RUN_SECONDS = 6 * 60 * 60
/** Offline runs older than this are not accepted onto the boards. */
export const MAX_RUN_AGE_MS = 14 * 24 * 60 * 60 * 1000
const CLOCK_SKEW_MS = 5 * 60 * 1000

/** HighscoreManager.DIFFICULTY_SCORE_MULTIPLIERS (SCORERUN-06). */
const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 0.85,
  medium: 1.0,
  hard: 1.25,
  hardcore: 1.5,
}

function envNumber(name: string, fallback: number): number {
  const raw = Number(process.env[name])
  return Number.isFinite(raw) && raw > 0 ? raw : fallback
}

/**
 * The most a run of this length could plausibly score. Deliberately
 * generous until real runs give us a distribution to tune against.
 */
export function scoreCeiling(run: Pick<GameRun, 'difficulty' | 'time_seconds'>): number {
  const perSecond = envNumber('LEADERBOARD_MAX_POINTS_PER_SECOND', 200)
  const flat = envNumber('LEADERBOARD_SCORE_ALLOWANCE', 5000)
  const multiplier = DIFFICULTY_MULTIPLIER[run.difficulty] * 1.5 // combo cap, SCORERUN-07
  return Math.min(Math.ceil((flat + perSecond * run.time_seconds) * multiplier), INT32_MAX)
}

/** null when the run may go on the public boards, else why not. */
export function unverifiedReason(run: GameRun, now: number = Date.now()): string | null {
  if (run.time_seconds < MIN_RUN_SECONDS) return 'run too short'
  if (run.time_seconds > MAX_RUN_SECONDS) return 'run too long'
  const ended = Date.parse(run.ended_at)
  if (!Number.isFinite(ended)) return 'bad ended_at'
  if (ended > now + CLOCK_SKEW_MS) return 'ended in the future'
  if (ended < now - MAX_RUN_AGE_MS) return 'run too old'
  const ceiling = scoreCeiling(run)
  if (run.score > ceiling) return `score above ceiling (${run.score} > ${ceiling})`
  return null
}
