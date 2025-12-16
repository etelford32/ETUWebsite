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
      {/* Header */}
      <div className="border-b border-white/10 bg-deep-900/95 backdrop-blur-md sticky top-16 z-40">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Ship Designer
          </h1>
          <p className="text-gray-400 mt-1">Design your spaceship for Explore the Universe 2175</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas Area */}
          <div className="lg:col-span-2">
            <div className="bg-deep-800/50 border border-white/10 rounded-lg p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 text-blue-300">Ship Preview</h2>
              <div className="bg-black/50 rounded-lg border border-white/5 overflow-hidden">
                <ShipCanvas shipData={shipData} />
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="space-y-6">
            {/* Ship Info */}
            <div className="bg-deep-800/50 border border-white/10 rounded-lg p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 text-blue-300">Ship Configuration</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ship Name
                  </label>
                  <input
                    type="text"
                    value={shipData.name}
                    onChange={(e) => setShipData({ ...shipData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Scale: {shipData.scale.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={shipData.scale}
                    onChange={(e) => setShipData({ ...shipData, scale: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rotation: {shipData.rotation}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={shipData.rotation}
                    onChange={(e) => setShipData({ ...shipData, rotation: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Hull Size: {shipData.components.hull.size}
                  </label>
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
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Color Picker */}
            <div className="bg-deep-800/50 border border-white/10 rounded-lg p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 text-blue-300">Colors</h2>

              <div className="space-y-3">
                {Object.entries(shipData.color).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-300 mb-1 capitalize">
                      {key}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => setShipData({
                          ...shipData,
                          color: { ...shipData.color, [key]: e.target.value }
                        })}
                        className="w-12 h-10 rounded border border-white/10 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setShipData({
                          ...shipData,
                          color: { ...shipData.color, [key]: e.target.value }
                        })}
                        className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Engine Settings */}
            <div className="bg-deep-800/50 border border-white/10 rounded-lg p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 text-blue-300">Engine</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">
                    Engine Enabled
                  </label>
                  <input
                    type="checkbox"
                    checked={shipData.components.engine.enabled}
                    onChange={(e) => setShipData({
                      ...shipData,
                      components: {
                        ...shipData.components,
                        engine: { ...shipData.components.engine, enabled: e.target.checked }
                      }
                    })}
                    className="w-5 h-5 rounded bg-black/30 border-white/10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Glow Intensity: {shipData.components.engine.glowIntensity.toFixed(2)}
                  </label>
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
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="bg-deep-800/50 border border-white/10 rounded-lg p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4 text-blue-300">Export</h2>

              <div className="space-y-3">
                <button
                  onClick={handleExport}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Download JSON
                </button>

                <button
                  onClick={handleCopyJSON}
                  className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-semibold transition-all duration-200"
                >
                  Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
