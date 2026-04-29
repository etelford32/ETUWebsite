"use client";

import React from "react";

interface HeroMissileGameProps {
  gameState: {
    score: number;
    health: number;
    shipCount: number;
    missileCount: number;
    wave: number;
    waveState: string;
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

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 999 }}
      aria-hidden="true"
    >
      {/* Game UI - Top Left */}
      <div
        className="absolute top-4 left-4 bg-black/70 text-white text-sm p-3 rounded-lg border-2 border-cyan-500/50"
        style={{ pointerEvents: "auto", minWidth: "220px" }}
      >
        {/* Wave indicator */}
        <div className="mb-2 text-center">
          {gameState.wave === 0 ? (
            <div className="text-yellow-400 text-xs font-bold animate-pulse">GET READY...</div>
          ) : gameState.waveState === 'intermission' ? (
            <div className="text-green-400 text-xs font-bold animate-pulse">WAVE {gameState.wave} COMPLETE</div>
          ) : gameState.waveState === 'boss' ? (
            <div className="text-red-400 text-sm font-bold animate-pulse">BOSS WAVE {gameState.wave}</div>
          ) : (
            <div className="text-cyan-400 text-xs font-bold">WAVE {gameState.wave}</div>
          )}
        </div>

        {/* Score + Combo */}
        <div className="mb-2">
          <div className="text-cyan-400 text-xs font-bold mb-1">SCORE</div>
          <div className="text-2xl font-bold text-white">{gameState.score.toLocaleString()}</div>
          {(gameState.combo ?? 0) >= 2 && (
            <div className="mt-1 flex items-center gap-1">
              <span
                className={`text-sm font-black tracking-wide ${
                  (gameState.combo ?? 0) >= 6 ? 'text-red-400 animate-pulse' :
                  (gameState.combo ?? 0) >= 4 ? 'text-orange-400' :
                  'text-yellow-400'
                }`}
              >
                x{Math.min(gameState.combo ?? 0, 8)} COMBO!
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

      {/* Stats + Controls - Top Right */}
      <div
        className="absolute top-4 right-4 bg-black/70 text-white text-xs p-3 rounded-lg border-2 border-purple-500/50"
        style={{ pointerEvents: "auto" }}
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
          <div className="text-gray-400 text-[10px]"><span className="text-white">WASD / Arrows</span> Move</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">Q/E</span> Manual rotate</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">Click</span> Fire forward</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">Shift+Click</span> Cluster fan</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">Right-drag</span> Orbit camera</div>
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
