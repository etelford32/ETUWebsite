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

        {/* Score */}
        <div className="mb-2">
          <div className="text-cyan-400 text-xs font-bold mb-1">SCORE</div>
          <div className="text-2xl font-bold text-white">{gameState.score.toLocaleString()}</div>
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
          <div className="text-gray-400 text-[10px]"><span className="text-white">WASD</span> Move Megabot</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">Q/E</span> Rotate Megabot</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">Click</span> Fire missile</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">Shift+Click</span> Cluster missiles</div>
          <div className="text-gray-400 text-[10px]"><span className="text-white">Mouse</span> Aim lasers</div>
          {gameState.upgradeLevel >= 3 && (
            <div className="text-yellow-400 text-[10px]"><span className="text-white">X</span> Missile Barrage</div>
          )}
        </div>
      </div>
    </div>
  );
}
