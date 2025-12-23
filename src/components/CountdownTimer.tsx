'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string; // ISO date string, e.g., "2025-12-25"
  label?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function CountdownTimer({ targetDate, label = "DEMO LAUNCHES IN" }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const calculateTimeLeft = (): TimeLeft => {
      const difference = +new Date(targetDate) - +new Date();

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }

      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-400/30 backdrop-blur-sm">
        <span className="text-xs font-semibold text-orange-300 uppercase tracking-wider">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-100 tabular-nums">--</div>
            <div className="text-xs text-slate-400 uppercase">Days</div>
          </div>
          <span className="text-xl text-amber-300">:</span>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-100 tabular-nums">--</div>
            <div className="text-xs text-slate-400 uppercase">Hrs</div>
          </div>
          <span className="text-xl text-amber-300">:</span>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-100 tabular-nums">--</div>
            <div className="text-xs text-slate-400 uppercase">Min</div>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  if (isExpired) {
    return (
      <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/40 backdrop-blur-sm">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-lg font-bold text-green-100 uppercase tracking-wide">
          🎮 DEMO AVAILABLE NOW!
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-400/30 backdrop-blur-sm hover:border-orange-400/50 transition-all">
      <span className="text-xs font-semibold text-orange-300 uppercase tracking-wider">
        ⏰ {label}
      </span>
      <div className="flex items-center gap-2">
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-100 tabular-nums">
            {String(timeLeft.days).padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-400 uppercase">Days</div>
        </div>
        <span className="text-xl text-amber-300 animate-pulse">:</span>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-100 tabular-nums">
            {String(timeLeft.hours).padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-400 uppercase">Hrs</div>
        </div>
        <span className="text-xl text-amber-300 animate-pulse">:</span>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-100 tabular-nums">
            {String(timeLeft.minutes).padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-400 uppercase">Min</div>
        </div>
        <span className="text-xl text-amber-300 animate-pulse">:</span>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-100 tabular-nums">
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-400 uppercase">Sec</div>
        </div>
      </div>
    </div>
  );
}
