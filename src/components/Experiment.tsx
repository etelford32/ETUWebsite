"use client"

import { useEffect, useState, type ReactNode } from 'react'
import {
  EXPERIMENTS,
  cookieNameFor,
  defaultVariant,
  isValidVariant,
  type ExperimentId,
} from '@/lib/experiments'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=')[1] || '') : undefined
}

export function useExperiment(id: ExperimentId): string {
  const exp = EXPERIMENTS[id]
  const [variant, setVariant] = useState<string>(() => defaultVariant(exp))

  useEffect(() => {
    const cookieValue = readCookie(cookieNameFor(id))
    const resolved = isValidVariant(exp, cookieValue) ? cookieValue! : defaultVariant(exp)
    setVariant(resolved)

    // Fire one exposure event per page load.
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'experiment_exposure', {
        experiment_id: id,
        variant_id: resolved,
      })
    }
  }, [id, exp])

  return variant
}

interface ExperimentProps<TKey extends string> {
  id: ExperimentId
  variants: Record<TKey, ReactNode>
}

export default function Experiment<TKey extends string>({
  id,
  variants,
}: ExperimentProps<TKey>) {
  const variant = useExperiment(id)
  const node = (variants as Record<string, ReactNode>)[variant]
  if (node !== undefined) return <>{node}</>
  // Fallback: render the first declared variant.
  const fallbackKey = Object.keys(variants)[0]
  return <>{fallbackKey ? (variants as Record<string, ReactNode>)[fallbackKey] : null}</>
}
