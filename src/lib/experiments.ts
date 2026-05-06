/**
 * Lightweight homepage A/B testing.
 *
 * Variant assignment is sticky-by-cookie: middleware picks a variant on the
 * first request and writes `etu_exp_<id>` for ~6 months. The client reads the
 * cookie and renders the matching slot. No vendor SDK, no edge config.
 *
 * To launch a new test:
 *   1. Add an entry to `EXPERIMENTS` below (id, variants, weights).
 *   2. Wrap the surface in `<Experiment id="..." variants={{...}} />`.
 *   3. Watch `experiment_exposure` events in GA4.
 */

export type ExperimentId = 'home_hero_subhead'

export interface ExperimentVariant {
  id: string
  weight: number
}

export interface ExperimentConfig {
  id: ExperimentId
  variants: ExperimentVariant[]
}

export const EXPERIMENTS: Record<ExperimentId, ExperimentConfig> = {
  home_hero_subhead: {
    id: 'home_hero_subhead',
    variants: [
      { id: 'control', weight: 1 },
      { id: 'urgency', weight: 1 },
    ],
  },
}

export const EXP_COOKIE_PREFIX = 'etu_exp_'
export const EXP_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180

export function cookieNameFor(id: ExperimentId): string {
  return `${EXP_COOKIE_PREFIX}${id}`
}

export function pickVariant(exp: ExperimentConfig, rand: number): string {
  const total = exp.variants.reduce((s, v) => s + v.weight, 0)
  const target = rand * total
  let acc = 0
  for (const v of exp.variants) {
    acc += v.weight
    if (target < acc) return v.id
  }
  return exp.variants[exp.variants.length - 1]!.id
}

export function isValidVariant(exp: ExperimentConfig, id: string | undefined | null): boolean {
  if (!id) return false
  return exp.variants.some(v => v.id === id)
}

export function defaultVariant(exp: ExperimentConfig): string {
  return exp.variants[0]!.id
}
