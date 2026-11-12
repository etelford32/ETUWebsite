'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  /** ISO timestamp to count down to. */
  targetDate: string;
  label?: string;
  /** Shown in place of the clock once the target has passed. */
  expiredLabel?: string;
}

const UNITS = ['Days', 'Hrs', 'Min', 'Sec'] as const;

function partsUntil(targetDate: string): number[] | null {
  const difference = +new Date(targetDate) - Date.now();
  if (difference <= 0) return null;
  return [
    Math.floor(difference / (1000 * 60 * 60 * 24)),
    Math.floor((difference / (1000 * 60 * 60)) % 24),
    Math.floor((difference / 1000 / 60) % 60),
    Math.floor((difference / 1000) % 60),
  ];
}

export default function CountdownTimer({
  targetDate,
  label = 'Demo launches in',
  expiredLabel = 'The free demo is live',
}: CountdownTimerProps) {
  // undefined until mounted, so the prerendered HTML and the first client
  // render agree; null once the target has passed.
  const [parts, setParts] = useState<number[] | null | undefined>(undefined);

  useEffect(() => {
    const tick = () => setParts(partsUntil(targetDate));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (parts === null) {
    return (
      <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-emerald-500/15 border border-emerald-400/40 backdrop-blur-sm">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        <span className="text-lg font-bold text-emerald-100 uppercase tracking-wide">
          {expiredLabel}
        </span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-4 px-5 py-3 rounded-xl bg-slate-950/60 border border-amber-400/35 backdrop-blur-sm"
      role="timer"
      aria-label={label}
    >
      <span className="text-xs md:text-sm font-semibold text-amber-300 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-start gap-2">
        {UNITS.map((unit, i) => (
          <div key={unit} className="flex items-start gap-2">
            {i > 0 && <span className="text-xl md:text-2xl text-amber-300/70" aria-hidden="true">:</span>}
            <div className="text-center min-w-[2.25rem]">
              <div className="text-2xl md:text-3xl font-bold text-amber-100 tabular-nums leading-none">
                {parts ? String(parts[i]).padStart(2, '0') : '--'}
              </div>
              <div className="mt-1 text-[0.7rem] text-slate-300 uppercase tracking-wide">{unit}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
