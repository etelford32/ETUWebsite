"use client"

import { DEMO_DATE_LABEL, DEMO_DATE_SHORT, DEMO_RELEASE_AT } from '@/lib/campaign'
import { useCountdown } from '@/lib/useCountdown'

const UNITS = ['Days', 'Hrs', 'Min', 'Sec'] as const

/**
 * The demo-day launch board: FREE DEMO, the date, and a split-flap countdown
 * inside a frame with a beam of light running round it. Once the demo is out
 * it turns green and drops the clock. Styled by `.demo-sign` in globals.css.
 */
export default function DemoSign({ className = '' }: { className?: string }) {
  const parts = useCountdown(DEMO_RELEASE_AT)

  if (parts === null) {
    return (
      <div className={`demo-sign demo-sign--live ${className}`} role="status">
        <div className="demo-sign__head">
          <span className="demo-sign__kicker">
            <span className="demo-sign__ping" aria-hidden="true" />
            Live now
          </span>
          <span className="demo-sign__title">Free Demo</span>
          <span className="demo-sign__date">
            Out now <b>on Steam</b>
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`demo-sign ${className}`}
      role="timer"
      aria-label={`Free demo on Steam, ${DEMO_DATE_LABEL}`}
    >
      <div className="demo-sign__head">
        <span className="demo-sign__kicker">
          <span className="demo-sign__ping" aria-hidden="true" />
          Lands on Steam
        </span>
        <span className="demo-sign__title">Free Demo</span>
        <span className="demo-sign__date">
          Thanksgiving Day <b>· {DEMO_DATE_SHORT}</b>
        </span>
      </div>

      <div className="demo-sign__clock">
        {UNITS.map((unit, i) => {
          const value = parts ? String(parts[i]).padStart(2, '0') : '--'
          return (
            <div key={unit} className="contents">
              {i > 0 && (
                <span className="demo-sign__sep" aria-hidden="true">
                  :
                </span>
              )}
              <div className="demo-sign__cell">
                {/* Re-keyed each second so the seconds tile flips */}
                <span
                  key={unit === 'Sec' ? value : unit}
                  className={`demo-sign__num ${unit === 'Sec' && parts ? 'demo-sign__num--tick' : ''}`}
                >
                  {value.split('').map((digit, d) => (
                    <span key={d} className="demo-sign__digit">
                      {digit}
                    </span>
                  ))}
                </span>
                <span className="demo-sign__unit">{unit}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
