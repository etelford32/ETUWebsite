"use client";

import React from "react";

interface HeroMissileGameProps {
  gameState: {
    score: number;
    health: number;
    shipCount: number;
    missileCount: number;
  };
}

export default function HeroMissileGame({ gameState }: HeroMissileGameProps) {
  const healthPercent = gameState.health / 10000;
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
        style={{ pointerEvents: "auto", minWidth: "200px" }}
      >
        {/* Score */}
        <div className="mb-3">
          <div className="text-cyan-400 text-xs font-bold mb-1">SCORE</div>
          <div className="text-2xl font-bold text-white">{gameState.score.toLocaleString()}</div>
        </div>

        {/* Megabot Health */}
        <div className="mb-2">
          <div className="text-cyan-400 text-xs font-bold mb-1">MEGABOT HEALTH</div>
          <div className="relative w-full h-6 bg-gray-800 rounded-full overflow-hidden border border-cyan-500/30">
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
            <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow-lg">
              {gameState.health.toLocaleString()} / 10,000
            </div>
          </div>
        </div>

        {/* Game Over Warning */}
        {gameState.health === 0 && (
          <div className="mt-2 p-2 bg-red-500/80 rounded text-center text-xs font-bold animate-pulse">
            ⚠️ MEGABOT DESTROYED ⚠️
          </div>
        )}
      </div>

      {/* Stats info - Top Right */}
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
        <div className="text-cyan-400 text-[10px] mt-2 pt-2 border-t border-purple-500/30">
          Click to launch 3D missiles!
        </div>
        <div className="text-yellow-400 text-[10px] mt-1">
          Move mouse to aim lasers!
        </div>
      </div>
    </div>
  );
}
