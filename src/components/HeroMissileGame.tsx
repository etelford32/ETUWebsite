"use client";

import React, { useEffect, useRef, useState } from "react";

type WaveTier = 'flawless' | 'halfway' | 'par' | 'siege' | null;
type Complication = 'none' | 'bossier' | 'fast-enemies' | 'no-upgrades';

interface KillEntry {
  id: number;
  type: string;
  score: number;
  combo: number;
  t: number;
}

interface HeroMissileGameProps {
  gameState: {
    score: number;
    health: number;
    shipCount: number;
    missileCount: number;
    wave: number;
    waveState: string;
    waveCountdown?: number;
    waveBonus?: { wave: number; amount: number; tier?: WaveTier } | null;
    waveShipsRemaining?: number;
    waveShipsTotal?: number;
    waveElapsed?: number;
    waveParTime?: number;
    recentKills?: KillEntry[];
    complication?: Complication;
    shieldHP: number;
    maxShieldHP: number;
    upgradeLevel: number;
    combo?: number;
    comboTimer?: number;
    perf?: {
      fps: number;
      frameMs: number;
      collisionChecks: number;
      collisionChecksFull: number;
      barrageQueue: number;
    };
  };
}

// Per-type display: emoji icon + tone color. Used by the kill-feed.
const KILL_TYPE_DISPLAY: Record<string, { icon: string; color: string }> = {
  fighter:     { icon: '✈',  color: '#67e8f9' },
  interceptor: { icon: '⚡', color: '#a5f3fc' },
  bomber:      { icon: '✦',  color: '#fda4af' },
  cruiser:     { icon: '◆',  color: '#fcd34d' },
  tank:        { icon: '⛟',  color: '#fdba74' },
  sam:         { icon: '◈',  color: '#86efac' },
};
function killDisplay(type: string) {
  return KILL_TYPE_DISPLAY[type] ?? { icon: '◯', color: '#94a3b8' };
}

const COMPLICATION_LABEL: Record<Complication, { label: string; tone: string; glow: string } | null> = {
  'none':         null,
  'bossier':      { label: '☠ Bosses Every 3rd Wave',  tone: '#fda4af', glow: 'rgba(244,63,94,0.30)' },
  'fast-enemies': { label: '⚡ Fast Enemies (×1.35)',   tone: '#fcd34d', glow: 'rgba(251,191,36,0.30)' },
  'no-upgrades':  { label: '✕ No Weapon Upgrades',    tone: '#fb923c', glow: 'rgba(251,146,60,0.30)' },
};

const UPGRADE_NAMES = [
  '',
  'Homing Missiles',
  'Wide-Beam Lasers',
  'Missile Barrage',
  'Weapons Maxed',
];

export default function HeroMissileGame({ gameState }: HeroMissileGameProps) {
  const healthPercent = gameState.health / 10000;
  const shieldPercent = gameState.maxShieldHP > 0 ? gameState.shieldHP / gameState.maxShieldHP : 0;
  const MAX_MISSILES = 50;
  const MAX_SHIPS = 15;

  // Telegraph fires during the intermission once wave 1+ has started. The
  // *next* wave the player is about to face is currentWave + 1.
  const isIntermission = gameState.waveState === 'intermission';
  const isSiege = gameState.waveState === 'siege';
  const showTelegraph = isIntermission && gameState.wave > 0;
  const nextWave = gameState.wave + 1;
  // Siege overrides boss when both align (matches Megabot.tsx wave-system).
  const isSiegeNext = nextWave % 7 === 0;
  const isBossNext = !isSiegeNext && nextWave % 5 === 0;
  const countdown = gameState.waveCountdown ?? 0;
  const bonus = gameState.waveBonus ?? null;
  const combo = gameState.combo ?? 0;
  const comboActive = combo >= 2;

  // Wave kill progress: count "killed" as total spawned-or-spawning that
  // are no longer alive. shipsLeft = remaining-to-spawn + currently-alive.
  const waveTotal = gameState.waveShipsTotal ?? 0;
  const waveRemaining = gameState.waveShipsRemaining ?? 0;
  const waveAlive = gameState.shipCount;
  const waveKilled = Math.max(0, waveTotal - waveRemaining - waveAlive);
  const waveProgress = waveTotal > 0 ? Math.min(1, waveKilled / waveTotal) : 0;
  const showProgress =
    (gameState.waveState === 'active' || gameState.waveState === 'boss') && waveTotal > 0;

  // Par-time bar: visible during active/boss waves only. Elapsed/par drives
  // the bar; the tier color matches the bonus tier the player is on track
  // for if they kill everything *right now*.
  const elapsed = gameState.waveElapsed ?? 0;
  const par = gameState.waveParTime ?? 0;
  const showParBar =
    (gameState.waveState === 'active' || gameState.waveState === 'boss') && par > 0;
  const parRatio = par > 0 ? Math.min(1, elapsed / par) : 0;
  const liveTier: WaveTier =
    !showParBar ? null :
    parRatio <= 0.5 ? 'flawless' :
    parRatio <= 0.75 ? 'halfway' :
    parRatio <= 1 ? 'par' :
    null;

  // Score-bump animation: trigger a brief "pop" key whenever a wave bonus
  // arrives so the score block can animate without prop-driven CSS.
  const [scorePop, setScorePop] = useState(0);
  const lastBonusKey = useRef<string>('');
  useEffect(() => {
    const key = bonus ? `${bonus.wave}:${bonus.amount}:${bonus.tier ?? ''}` : '';
    if (key && key !== lastBonusKey.current) {
      lastBonusKey.current = key;
      setScorePop((n) => n + 1);
    }
  }, [bonus]);

  // Low-HP vignette: starts at 30% HP, intensifies to a peak at 0. Pure
  // derived value — capped so it never fully blacks out the playfield.
  const lowHpStrength =
    healthPercent >= 0.3 ? 0
    : healthPercent <= 0  ? 0.85
    :                       (0.3 - healthPercent) / 0.3 * 0.85;

  // Kill-feed list (newest first). Items are keyed by id so React only
  // animates *new* entries; older entries hold position as the ring rotates.
  const killFeed = (gameState.recentKills ?? []).slice().reverse();

  // Active complication (null = vanilla rules; HUD shows nothing).
  const complication = gameState.complication ?? 'none';
  const complicationDisplay = COMPLICATION_LABEL[complication];

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 999 }}
      aria-hidden="true"
    >
      {/* LOW-HP VIGNETTE — radial red bleed from the edges, opacity scales
          with how badly Megabot is hurt. Hidden when HP >= 30%. */}
      {lowHpStrength > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 35%, rgba(244,63,94,0.55) 95%, rgba(127,29,29,0.85) 100%)',
            opacity: lowHpStrength,
            mixBlendMode: 'screen',
            animation: lowHpStrength > 0.5 ? 'etu-vignette-pulse 1.2s ease-in-out infinite' : undefined,
          }}
        />
      )}

      {/* COMPLICATION BANNER — persistent (top-center, below the title overlay
          on the page so we sit at top: 80px). Only renders when the run is
          rolled with a non-'none' modifier. */}
      {complicationDisplay && (
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ top: 88 }}
        >
          <div
            className="font-orbitron uppercase font-bold text-[11px] tracking-[0.22em] inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              color: complicationDisplay.tone,
              background: 'rgba(2,6,23,0.72)',
              border: `1px solid ${complicationDisplay.tone}66`,
              boxShadow: `0 0 18px ${complicationDisplay.glow}, 0 2px 8px rgba(0,0,0,0.85)`,
            }}
          >
            <span className="opacity-70 text-[10px] tracking-[0.28em]">Complication</span>
            <span className="opacity-30">·</span>
            <span>{complicationDisplay.label}</span>
          </div>
        </div>
      )}

      {/* KILL-FEED — vertical stack on the right edge, sitting below the
          top-right combat-status panel so the two never collide. Each
          entry shows the ship-type icon + score + combo; new entries fade
          in via etu-killfeed-in. Items naturally rotate out as the ring
          fills (Megabot.tsx caps at RECENT_KILLS_CAP = 6), so no explicit
          exit animations needed. */}
      <div
        className="absolute right-4 flex flex-col gap-1.5 pointer-events-none"
        style={{ top: 380, minWidth: 200 }}
      >
        {killFeed.map((k) => {
          const d = killDisplay(k.type);
          return (
            <div
              key={k.id}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-md font-mono tabular-nums text-xs"
              style={{
                background: 'rgba(2,6,23,0.72)',
                border: `1px solid ${d.color}55`,
                boxShadow: `0 0 12px ${d.color}22`,
                animation: 'etu-killfeed-in 0.45s ease-out',
              }}
            >
              <span className="text-base leading-none" style={{ color: d.color }}>{d.icon}</span>
              <span className="uppercase tracking-wider text-[10px] flex-1" style={{ color: d.color }}>
                {k.type}
              </span>
              <span className="font-bold text-amber-200">+{k.score.toLocaleString()}</span>
              {k.combo >= 2 && (
                <span
                  className={`text-[10px] font-black ${
                    k.combo >= 6 ? 'text-rose-300' :
                    k.combo >= 4 ? 'text-orange-300' :
                                   'text-yellow-300'
                  }`}
                >
                  ×{k.combo}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* WAVE INCOMING TELEGRAPH — fullscreen, brief, big.
          Three flavors: regular wave (cyan), boss wave (rose), siege beat
          (orange/red, the most alarming). Siege case keys off isSiegeNext
          which has priority over isBossNext (can't both be true). */}
      {showTelegraph && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background: isSiegeNext
                ? 'radial-gradient(circle at center, rgba(64,12,8,0.65) 0%, rgba(2,6,23,0) 55%)'
                : 'radial-gradient(circle at center, rgba(2,6,23,0.55) 0%, rgba(2,6,23,0) 55%)',
            }}
          />
          <div
            className="relative text-center"
            style={{ animation: isSiegeNext ? 'etu-telegraph-siege 2.5s ease-out forwards' : 'etu-telegraph 2.5s ease-out forwards' }}
          >
            <div
              className="font-orbitron uppercase text-[10px] md:text-xs tracking-[0.3em]"
              style={{
                color: isSiegeNext ? '#fed7aa' : isBossNext ? '#fda4af' : '#67e8f9',
                textShadow: '0 2px 8px rgba(0,0,0,0.85)',
              }}
            >
              {isSiegeNext
                ? '☢ Siege Inbound — Hold Position'
                : isBossNext
                  ? '☠ Boss Wave Incoming'
                  : 'Wave Incoming'}
            </div>
            <div
              className="font-orbitron font-bold text-5xl md:text-7xl tracking-[0.08em] leading-none mt-2"
              style={{
                color: isSiegeNext ? '#ffedd5' : '#c7d9e8',
                textShadow: isSiegeNext
                  ? '0 0 30px rgba(251,146,60,0.55), 0 0 60px rgba(251,146,60,0.30), 0 4px 12px rgba(0,0,0,0.95)'
                  : '0 0 30px rgba(147,197,253,0.45), 0 0 60px rgba(147,197,253,0.25), 0 4px 12px rgba(0,0,0,0.95)',
              }}
            >
              {isSiegeNext ? `SIEGE ${nextWave}` : `WAVE ${nextWave}`}
            </div>
            <div
              className="font-mono mt-3 text-2xl md:text-3xl tabular-nums"
              style={{
                color: isSiegeNext ? '#fb923c' : isBossNext ? '#f43f5e' : '#22d3ee',
                textShadow: '0 2px 8px rgba(0,0,0,0.85)',
              }}
            >
              {countdown.toFixed(1)}s
            </div>
          </div>
        </div>
      )}

      {/* SIEGE COUNTDOWN BANNER — top-center, only during an active siege. */}
      {isSiege && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none text-center">
          <div
            className="font-orbitron uppercase font-bold text-xs tracking-[0.28em] inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              color: '#fed7aa',
              background: 'rgba(64,12,8,0.55)',
              border: '1px solid rgba(251,146,60,0.55)',
              boxShadow: '0 0 18px rgba(251,146,60,0.35)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"
              style={{ boxShadow: '0 0 10px rgb(251 146 60)' }}
            />
            ☢ SIEGE · {countdown.toFixed(1)}s
          </div>
        </div>
      )}

      {/* WAVE BONUS TOAST — drifts up from center after a wave ends.
          Tier-aware: flawless / halfway / par tiers paint different
          colors + label the multiplier; siege beats get their own bold
          orange "SIEGE HELD" treatment. */}
      {bonus && (() => {
        const tier = bonus.tier ?? null;
        const isSiegeBonus = tier === 'siege';
        const tierLabel =
          tier === 'flawless' ? 'Flawless · ×3' :
          tier === 'halfway'  ? 'Sub-Par · ×2' :
          tier === 'par'      ? 'On Par · ×1.5' :
          tier === 'siege'    ? '☢ Siege Held' :
                                'Cleared';
        const tierColor =
          tier === 'flawless' ? '#a5f3fc' :
          tier === 'halfway'  ? '#67e8f9' :
          tier === 'par'      ? '#86efac' :
          tier === 'siege'    ? '#fed7aa' :
                                '#86efac';
        const valueColor = isSiegeBonus ? '#fb923c' : '#fde68a';
        const valueGlow  = isSiegeBonus
          ? '0 0 36px rgba(251,146,60,0.55), 0 4px 12px rgba(0,0,0,0.95)'
          : '0 0 30px rgba(253,230,138,0.45), 0 4px 12px rgba(0,0,0,0.95)';
        return (
          <div
            key={`${bonus.wave}-${bonus.amount}-${tier ?? ''}`}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 pointer-events-none"
            style={{ animation: 'etu-bonus-toast 2.4s ease-out forwards' }}
          >
            <div className="text-center font-orbitron uppercase">
              <div
                className="text-xs tracking-[0.28em]"
                style={{ color: tierColor, textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}
              >
                {isSiegeBonus
                  ? tierLabel
                  : `Wave ${bonus.wave} ${tier ? '· ' + tierLabel : 'Cleared'}`}
              </div>
              <div
                className="font-bold text-4xl md:text-5xl tabular-nums mt-1"
                style={{ color: valueColor, textShadow: valueGlow }}
              >
                +{bonus.amount.toLocaleString()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Inline keyframes for the two effects above */}
      <style jsx>{`
        @keyframes etu-telegraph {
          0%   { opacity: 0; transform: scale(0.85); }
          12%  { opacity: 1; transform: scale(1); }
          88%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.05); }
        }
        @keyframes etu-bonus-toast {
          0%   { opacity: 0; transform: translate(-50%, 20px); }
          15%  { opacity: 1; transform: translate(-50%, -10px); }
          70%  { opacity: 1; transform: translate(-50%, -40px); }
          100% { opacity: 0; transform: translate(-50%, -80px); }
        }
        @keyframes etu-score-pop {
          0%   { transform: scale(1); }
          25%  { transform: scale(1.18); }
          60%  { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        /* Siege telegraph rattles + pulses to read as alarm rather than the
           calm-cinematic breath of the regular wave card. */
        @keyframes etu-telegraph-siege {
          0%   { opacity: 0; transform: scale(0.92) translateX(0); }
          10%  { opacity: 1; transform: scale(1.04) translateX(-3px); }
          18%  { opacity: 1; transform: scale(0.99) translateX(3px); }
          26%  { opacity: 1; transform: scale(1.02) translateX(-2px); }
          34%  { opacity: 1; transform: scale(1) translateX(0); }
          85%  { opacity: 1; transform: scale(1) translateX(0); }
          100% { opacity: 0; transform: scale(1.05) translateX(0); }
        }
        /* Kill-feed entry slides in from the right edge with a brief fade.
           No exit anim — items rotate out as the ring fills. */
        @keyframes etu-killfeed-in {
          0%   { opacity: 0; transform: translateX(20px) scale(0.95); }
          60%  { opacity: 1; transform: translateX(0) scale(1.03); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        /* Low-HP vignette pulses subtly when health is very low so the
           overlay reads as alarm rather than a static red filter. */
        @keyframes etu-vignette-pulse {
          0%, 100% { filter: brightness(1); }
          50%      { filter: brightness(1.18); }
        }
      `}</style>
      {/* Game UI - Top Left.
          Readability pass: denser slate-950 background with cyan border, soft
          panel shadow, slight backdrop-blur so the panel never gets lost over
          a busy 3D scene. minWidth bumped so the wave-clear pill never
          truncates. */}
      <div
        className="absolute top-4 left-4 text-white text-sm p-3.5 rounded-lg"
        style={{
          pointerEvents: 'auto',
          minWidth: '240px',
          background: 'rgba(2,6,23,0.82)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: '1px solid rgba(34,211,238,0.45)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Wave indicator */}
        <div className="mb-2 text-center">
          {gameState.wave === 0 ? (
            <div className="text-yellow-400 text-xs font-bold animate-pulse">GET READY...</div>
          ) : gameState.waveState === 'intermission' ? (
            <div className="space-y-1">
              {/* Big "CLEAR" pill — green, checkmark, mono caps */}
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-orbitron text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{
                  background: 'rgba(52,211,153,0.12)',
                  border: '1px solid rgba(52,211,153,0.45)',
                  color: '#6ee7b7',
                  boxShadow: '0 0 14px rgba(52,211,153,0.25)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                Wave {gameState.wave} · Clear
              </div>
              {/* Bonus stamp — mirrors the floating toast for ~the same window */}
              {bonus && bonus.wave === gameState.wave && (
                <div className="font-mono text-[11px] tabular-nums text-amber-300">
                  +{bonus.amount.toLocaleString()} bonus
                </div>
              )}
              {/* Next-wave countdown */}
              {countdown > 0 && (
                <div className="font-mono text-[10px] tabular-nums text-slate-400">
                  Next: Wave {gameState.wave + 1} in {countdown.toFixed(1)}s
                </div>
              )}
            </div>
          ) : gameState.waveState === 'boss' ? (
            <div className="text-red-400 text-sm font-bold animate-pulse">☠ BOSS WAVE {gameState.wave}</div>
          ) : (
            <div className="text-cyan-400 text-xs font-bold">WAVE {gameState.wave}</div>
          )}
        </div>

        {/* Score + Combo */}
        <div className="mb-2">
          <div className="text-cyan-400 text-xs font-bold mb-1">SCORE</div>
          <div
            key={scorePop}
            className={`font-mono tabular-nums leading-none transition-all duration-200 ${
              comboActive
                ? 'text-3xl font-black tracking-tight'
                : 'text-2xl font-bold tracking-normal'
            }`}
            style={{
              color: comboActive
                ? combo >= 6 ? '#fda4af' : combo >= 4 ? '#fdba74' : '#fde68a'
                : '#ffffff',
              textShadow: comboActive
                ? combo >= 6
                  ? '0 0 14px rgba(244,63,94,0.55), 0 0 28px rgba(244,63,94,0.35)'
                  : combo >= 4
                  ? '0 0 12px rgba(249,115,22,0.55)'
                  : '0 0 12px rgba(253,224,71,0.45)'
                : 'none',
              animation: scorePop > 0 ? 'etu-score-pop 0.55s ease-out' : undefined,
            }}
          >
            {gameState.score.toLocaleString()}
          </div>
          {comboActive && (
            <div className="mt-1 flex items-center gap-1">
              <span
                className={`text-sm font-black tracking-wide ${
                  combo >= 6 ? 'text-red-400 animate-pulse' :
                  combo >= 4 ? 'text-orange-400' :
                  'text-yellow-400'
                }`}
              >
                x{Math.min(combo, 8)} COMBO!
              </span>
              {/* Combo timer bar */}
              <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 transition-all"
                  style={{ width: `${Math.min(((gameState.comboTimer ?? 0) / 2.5) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Active-wave kill progress */}
        {showProgress && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-[10px] font-bold mb-1">
              <span className={gameState.waveState === 'boss' ? 'text-red-400' : 'text-cyan-400'}>
                WAVE PROGRESS
              </span>
              <span className="font-mono tabular-nums text-slate-300">
                {waveKilled} / {waveTotal}
              </span>
            </div>
            <div
              className={`relative w-full h-2 rounded-full overflow-hidden border ${
                gameState.waveState === 'boss'
                  ? 'bg-red-950/60 border-red-500/30'
                  : 'bg-gray-800 border-cyan-500/30'
              }`}
            >
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-200 ${
                  gameState.waveState === 'boss'
                    ? 'bg-gradient-to-r from-rose-500 to-red-400'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-400'
                }`}
                style={{ width: `${waveProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Par-time bar — shows current tier-on-track-for during active/boss
            waves. Bar fills as elapsed approaches par; the colored fill
            reflects which multiplier the player would lock in if they
            cleared right now (cyan flawless ×3 → cyan halfway ×2 →
            green par ×1.5 → slate over-par no bonus). */}
        {showParBar && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-[10px] font-bold mb-1">
              <span
                style={{
                  color:
                    liveTier === 'flawless' ? '#a5f3fc' :
                    liveTier === 'halfway'  ? '#67e8f9' :
                    liveTier === 'par'      ? '#86efac' :
                                              '#94a3b8',
                }}
              >
                {liveTier === 'flawless' ? 'FLAWLESS · ×3' :
                 liveTier === 'halfway'  ? 'SUB-PAR · ×2' :
                 liveTier === 'par'      ? 'ON PAR · ×1.5' :
                                           'OVER PAR · ×1'}
              </span>
              <span className="font-mono tabular-nums text-slate-400">
                {elapsed.toFixed(1)} / {par.toFixed(0)}s
              </span>
            </div>
            <div className="relative w-full h-1.5 rounded-full overflow-hidden border bg-slate-900/60 border-white/10">
              <div
                className="absolute inset-y-0 left-0 transition-all duration-200"
                style={{
                  width: `${parRatio * 100}%`,
                  background:
                    liveTier === 'flawless' ? 'linear-gradient(90deg, #67e8f9, #22d3ee)' :
                    liveTier === 'halfway'  ? 'linear-gradient(90deg, #22d3ee, #60a5fa)' :
                    liveTier === 'par'      ? 'linear-gradient(90deg, #34d399, #fbbf24)' :
                                              'linear-gradient(90deg, #475569, #64748b)',
                }}
              />
              {/* Tick marks at the tier boundaries (50%, 75%, 100%) so the
                  player can see how much breathing room is left. */}
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
              <div className="absolute inset-y-0 left-3/4 w-px bg-white/20" />
            </div>
          </div>
        )}

        {/* Shield bar */}
        <div className="mb-2">
          <div className="text-blue-400 text-xs font-bold mb-1">SHIELD</div>
          <div className="relative w-full h-4 bg-gray-800 rounded-full overflow-hidden border border-blue-500/30">
            <div
              className="absolute inset-0 transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-400"
              style={{ width: `${shieldPercent * 100}%`, opacity: shieldPercent > 0 ? 1 : 0.2 }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold drop-shadow-lg">
              {gameState.shieldHP.toLocaleString()} / {gameState.maxShieldHP.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Megabot Health */}
        <div className="mb-2">
          <div className="text-cyan-400 text-xs font-bold mb-1">MEGABOT HEALTH</div>
          <div className="relative w-full h-5 bg-gray-800 rounded-full overflow-hidden border border-cyan-500/30">
            <div
              className={`absolute inset-0 transition-all duration-300 ${
                healthPercent > 0.5
                  ? 'bg-gradient-to-r from-green-500 to-green-400'
                  : healthPercent > 0.25
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                  : 'bg-gradient-to-r from-red-500 to-red-400 animate-pulse'
              }`}
              style={{ width: `${healthPercent * 100}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold drop-shadow-lg">
              {gameState.health.toLocaleString()} / 10,000
            </div>
          </div>
        </div>

        {/* Upgrade indicator */}
        {gameState.upgradeLevel > 0 && (
          <div className="mt-2 pt-2 border-t border-cyan-500/30">
            <div className="text-yellow-400 text-[10px] font-bold">
              LVL {gameState.upgradeLevel}: {UPGRADE_NAMES[gameState.upgradeLevel] || ''}
            </div>
          </div>
        )}

        {/* Game Over Warning */}
        {gameState.health === 0 && (
          <div className="mt-2 p-2 bg-red-500/80 rounded text-center text-xs font-bold animate-pulse">
            MEGABOT DESTROYED
          </div>
        )}
      </div>

      {/* Stats + Controls - Top Right (readability pass to match top-left). */}
      <div
        className="absolute top-4 right-4 text-white text-xs p-3.5 rounded-lg"
        style={{
          pointerEvents: 'auto',
          background: 'rgba(2,6,23,0.82)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: '1px solid rgba(168,85,247,0.45)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <div className="text-purple-400 font-bold mb-2">3D COMBAT STATUS</div>
        <div className="space-y-1">
          <div className="flex justify-between gap-3">
            <span className="text-gray-400">Missiles:</span>
            <span className="text-cyan-400 font-bold">{gameState.missileCount} / {MAX_MISSILES}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-400">Enemy Ships:</span>
            <span className="text-red-400 font-bold">{gameState.shipCount} / {MAX_SHIPS}</span>
          </div>
        </div>

        {/* Controls guide */}
        <div className="mt-2 pt-2 border-t border-purple-500/30 space-y-1">
          <div className="text-purple-300 font-bold text-[10px] mb-1">CONTROLS</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">Mouse</span> Aim Megabot</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">W / S</span> Forward / Back</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">A / D</span> Rotate left / right</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">Q / E</span> Strafe left / right</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">Arrows</span> Same as WASD</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">Click</span> Fire forward</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">Shift+Click</span> Cluster fan</div>
          <div className="text-cyan-300 text-[10px] pt-1 border-t border-purple-500/20 mt-1">CAMERA</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">V</span> Cycle: 3rd / FPS / Free</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">1 / 2 / 3</span> Pick mode directly</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">Right-drag</span> Tilt (3rd/FPS) / Orbit (Free)</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">Wheel</span> Zoom &nbsp;<span className="text-white">R</span> Reset cam</div>
          {gameState.upgradeLevel >= 3 && (
            <div className="text-yellow-400 text-[10px]"><span className="text-white">X</span> Missile Barrage</div>
          )}
        </div>
      </div>

      {/* Perf telemetry panel — bottom-right, dev overlay */}
      {gameState.perf && (
        <div
          className="absolute bottom-4 right-4 bg-black/80 text-white text-[10px] p-2 rounded border border-green-500/40 font-mono"
          style={{ pointerEvents: "none", minWidth: "200px" }}
        >
          <div className="text-green-400 font-bold mb-1 text-[10px] tracking-widest">PERF</div>
          <div className="space-y-0.5">
            {/* FPS with color-coded health */}
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">FPS</span>
              <span className={
                gameState.perf.fps >= 55 ? "text-green-400" :
                gameState.perf.fps >= 30 ? "text-yellow-400" : "text-red-400"
              }>
                {gameState.perf.fps} <span className="text-gray-600">({gameState.perf.frameMs}ms)</span>
              </span>
            </div>
            {/* Collision checks: grid actual vs brute-force theoretical */}
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Col.checks</span>
              <span className="text-cyan-400">
                {gameState.perf.collisionChecks}
                <span className="text-gray-600">
                  {gameState.perf.collisionChecksFull > 0
                    ? ` / ${gameState.perf.collisionChecksFull}`
                    : ""}
                </span>
              </span>
            </div>
            {/* Savings: how much work the grid avoided */}
            {gameState.perf.collisionChecksFull > 0 && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Grid saved</span>
                <span className="text-green-400">
                  {Math.round(
                    (1 - gameState.perf.collisionChecks / gameState.perf.collisionChecksFull) * 100
                  )}%
                </span>
              </div>
            )}
            {/* Barrage queue depth */}
            {gameState.perf.barrageQueue > 0 && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Barrage Q</span>
                <span className="text-yellow-400">{gameState.perf.barrageQueue}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
