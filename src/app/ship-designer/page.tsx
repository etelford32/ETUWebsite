'use client';

import React, { useState } from 'react';
import ShipCanvas from '@/components/ShipCanvas';

export default function ShipDesigner() {
  const [shipData, setShipData] = useState({
    name: 'Custom Ship',
    scale: 1.0,
    rotation: 0,
    color: {
      primary: '#e0f2fe',
      secondary: '#bae6fd',
      accent: '#7dd3fc',
      glow: '#0ea5e9'
    },
    defense: {
      hull: 100,
      armor: 50,
      shield: 75
    },
    weapons: {
      lasers: 2,
      missiles: 4,
      mines: 3
    },
    components: {
      hull: {
        type: 'triangle',
        size: 40,
        points: [
          { x: 0, y: -40 },  // Nose
          { x: -25, y: 30 },  // Left wing
          { x: 25, y: 30 }    // Right wing
        ]
      },
      engine: {
        enabled: true,
        thrust: 1.0,
        glowIntensity: 0.8
      }
    }
  });

  const handleExport = () => {
    const jsonString = JSON.stringify(shipData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${shipData.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyJSON = () => {
    const jsonString = JSON.stringify(shipData, null, 2);
    navigator.clipboard.writeText(jsonString);
  };

  return (
    <div className="min-h-screen bg-deep-900 text-white">
      {/* Compact Header */}
      <div className="border-b border-white/10 bg-deep-900/95 backdrop-blur-md sticky top-16 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Ship Designer
              </h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyJSON}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-semibold transition-all duration-200"
              >
                Copy JSON
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Left Panel - Ship Config & Colors */}
          <div className="xl:col-span-1 space-y-4">
            {/* Ship Info */}
            <div className="bg-deep-800/50 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-blue-300 mb-3">Configuration</h3>
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={shipData.name}
                    onChange={(e) => setShipData({ ...shipData, name: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-black/30 border border-white/10 rounded text-white focus:outline-none focus:border-blue-500"
                    placeholder="Ship Name"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Scale: {shipData.scale.toFixed(1)}</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={shipData.scale}
                    onChange={(e) => setShipData({ ...shipData, scale: parseFloat(e.target.value) })}
                    className="w-full h-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Rotation: {shipData.rotation}°</label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={shipData.rotation}
                    onChange={(e) => setShipData({ ...shipData, rotation: parseInt(e.target.value) })}
                    className="w-full h-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Size: {shipData.components.hull.size}</label>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    step="5"
                    value={shipData.components.hull.size}
                    onChange={(e) => {
                      const size = parseInt(e.target.value);
                      setShipData({
                        ...shipData,
                        components: {
                          ...shipData.components,
                          hull: {
                            ...shipData.components.hull,
                            size,
                            points: [
                              { x: 0, y: -size },
                              { x: -size * 0.625, y: size * 0.75 },
                              { x: size * 0.625, y: size * 0.75 }
                            ]
                          }
                        }
                      });
                    }}
                    className="w-full h-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Engine Glow: {shipData.components.engine.glowIntensity.toFixed(1)}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={shipData.components.engine.glowIntensity}
                    onChange={(e) => setShipData({
                      ...shipData,
                      components: {
                        ...shipData.components,
                        engine: { ...shipData.components.engine, glowIntensity: parseFloat(e.target.value) }
                      }
                    })}
                    className="w-full h-1"
                  />
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="bg-deep-800/50 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-blue-300 mb-3">Colors</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(shipData.color).map(([key, value]) => (
                  <div key={key}>
                    <label className="text-xs text-gray-400 capitalize block mb-1">{key}</label>
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => setShipData({
                        ...shipData,
                        color: { ...shipData.color, [key]: e.target.value }
                      })}
                      className="w-full h-8 rounded border border-white/10 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center - Canvas */}
          <div className="xl:col-span-2">
            <div className="bg-deep-800/50 border border-white/10 rounded-lg p-4 backdrop-blur-sm h-full">
              <div className="bg-black/50 rounded-lg border border-white/5 overflow-hidden">
                <ShipCanvas shipData={shipData} />
              </div>
            </div>
          </div>

          {/* Right Panel - Weapons & Defense */}
          <div className="xl:col-span-1 space-y-4">
            {/* Defense Stats */}
            <div className="bg-deep-800/50 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-blue-300 mb-3">Defense Systems</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-gray-400">Hull Integrity</label>
                    <span className="text-xs font-bold text-green-400">{shipData.defense.hull}</span>
                  </div>
                  <div className="relative h-2 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-600 to-green-400 transition-all duration-300"
                      style={{ width: `${shipData.defense.hull}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="5"
                    value={shipData.defense.hull}
                    onChange={(e) => setShipData({
                      ...shipData,
                      defense: { ...shipData.defense, hull: parseInt(e.target.value) }
                    })}
                    className="w-full h-1 mt-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-gray-400">Armor Plating</label>
                    <span className="text-xs font-bold text-yellow-400">{shipData.defense.armor}</span>
                  </div>
                  <div className="relative h-2 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-300"
                      style={{ width: `${(shipData.defense.armor / 150) * 100}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="5"
                    value={shipData.defense.armor}
                    onChange={(e) => setShipData({
                      ...shipData,
                      defense: { ...shipData.defense, armor: parseInt(e.target.value) }
                    })}
                    className="w-full h-1 mt-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-gray-400">Shield Strength</label>
                    <span className="text-xs font-bold text-blue-400">{shipData.defense.shield}</span>
                  </div>
                  <div className="relative h-2 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-300"
                      style={{ width: `${shipData.defense.shield}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={shipData.defense.shield}
                    onChange={(e) => setShipData({
                      ...shipData,
                      defense: { ...shipData.defense, shield: parseInt(e.target.value) }
                    })}
                    className="w-full h-1 mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Weapons */}
            <div className="bg-deep-800/50 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-blue-300 mb-3">Weapon Systems</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-gray-400">Laser Cannons</label>
                    <span className="text-xs font-bold text-red-400">{shipData.weapons.lasers}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="1"
                    value={shipData.weapons.lasers}
                    onChange={(e) => setShipData({
                      ...shipData,
                      weapons: { ...shipData.weapons, lasers: parseInt(e.target.value) }
                    })}
                    className="w-full h-1"
                  />
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full transition-all ${
                          i < shipData.weapons.lasers ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-gray-400">Missile Launchers</label>
                    <span className="text-xs font-bold text-orange-400">{shipData.weapons.missiles}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="1"
                    value={shipData.weapons.missiles}
                    onChange={(e) => setShipData({
                      ...shipData,
                      weapons: { ...shipData.weapons, missiles: parseInt(e.target.value) }
                    })}
                    className="w-full h-1"
                  />
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full transition-all ${
                          i < shipData.weapons.missiles ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-gray-400">Space Mines</label>
                    <span className="text-xs font-bold text-purple-400">{shipData.weapons.mines}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={shipData.weapons.mines}
                    onChange={(e) => setShipData({
                      ...shipData,
                      weapons: { ...shipData.weapons, mines: parseInt(e.target.value) }
                    })}
                    className="w-full h-1"
                  />
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full transition-all ${
                          i < shipData.weapons.mines ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="bg-deep-800/50 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-blue-300 mb-3">Combat Rating</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Defense:</span>
                  <span className="font-bold text-green-400">{shipData.defense.hull + shipData.defense.armor + shipData.defense.shield}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Weapons:</span>
                  <span className="font-bold text-red-400">{shipData.weapons.lasers + shipData.weapons.missiles + shipData.weapons.mines}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Combat Power:</span>
                  <span className="font-bold text-indigo-400">
                    {Math.round((shipData.defense.hull + shipData.defense.armor + shipData.defense.shield) * 0.4 +
                     (shipData.weapons.lasers * 15 + shipData.weapons.missiles * 10 + shipData.weapons.mines * 8))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
