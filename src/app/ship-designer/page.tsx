'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ShipCanvas from '@/components/ShipCanvas';
import Header from '@/components/Header';

/* MIGRATION STUB - needs API route migration */
const supabase: any = {
  from: () => ({
    select: () => ({
      eq: () => Promise.resolve({ data: [], error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      order: () => ({ limit: () => Promise.resolve({ data: [] }) })
    }),
    insert: () => Promise.resolve({ error: { message: 'Not migrated' } }),
    update: () => ({ eq: () => Promise.resolve({ error: { message: 'Not migrated' } }) })
  }),
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  removeChannel: () => {},
  channel: () => ({ on: () => ({ subscribe: () => {} }) })
};


export default function ShipDesigner() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
    weaponColors: {
      laser: '#ef4444',
      missile: '#f97316',
      mine: '#a855f7'
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
          { x: 0, y: -40 },
          { x: -25, y: 30 },
          { x: 25, y: 30 }
        ]
      },
      engine: {
        enabled: true,
        thrust: 1.0,
        glowIntensity: 0.8,
        style: 'dual' as 'dual' | 'single' | 'quad' | 'ring' | 'plasma'
      },
      cockpit: {
        enabled: true,
        style: 'bubble' as 'bubble' | 'angular' | 'sleek' | 'armored' | 'windowed' | 'minimal'
      }
    }
  });

  useEffect(() => {
    // Check auth state
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkAuth() {
    const sessionRes = await fetch("/api/auth/session"); const sessionData = await sessionRes.json(); const session = sessionData.authenticated ? { user: sessionData.user } : null;
    setUser(session?.user || null);
  }

  async function handleSaveShip() {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/save-ship', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          ship_data: shipData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save ship');
      }

      setSaveMessage({
        type: 'success',
        text: `"${shipData.name}" saved successfully!`,
      });

      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      setSaveMessage({
        type: 'error',
        text: error.message || 'Failed to save ship',
      });
    } finally {
      setSaving(false);
    }
  }

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
    <div className="min-h-screen bg-deep-900 text-white flex flex-col">
      <Header />

      {/* Page Header with Actions */}
      <div className="border-b border-white/10 bg-deep-900/95 backdrop-blur-md sticky top-16 z-30">
        <div className="container mx-auto px-2 sm:px-4 py-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Ship Designer
            </h1>
            <div className="flex gap-1 sm:gap-2">
              <button
                onClick={handleSaveShip}
                disabled={saving}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCopyJSON}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded font-semibold transition-all"
              >
                Copy
              </button>
              <button
                onClick={handleExport}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded font-semibold transition-all"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Prompt Modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-deep-800 border border-white/10 rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-blue-300 mb-3">Sign In Required</h2>
            <p className="text-gray-300 mb-4">
              Create a free account to save your ship designs and sync them across all platforms!
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/login')}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg font-semibold transition-all shadow-lg"
              >
                Sign In / Create Account
              </button>
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-semibold transition-all"
              >
                Maybe Later
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              Your designs will be available in-game on PC, Mac, Linux, and Steam Deck
            </p>
          </div>
        </div>
      )}

      {/* Save Message */}
      {saveMessage && (
        <div className="fixed top-20 right-4 z-40 animate-in slide-in-from-right">
          <div className={`px-4 py-3 rounded-lg shadow-lg border ${
            saveMessage.type === 'success'
              ? 'bg-green-900/90 border-green-500/30 text-green-100'
              : 'bg-red-900/90 border-red-500/30 text-red-100'
          }`}>
            {saveMessage.text}
          </div>
        </div>
      )}

      {/* Ship Canvas - Front and Center */}
      <div className="flex-1 flex flex-col">
        <div className="bg-deep-800/30 border-b border-white/5">
          <ShipCanvas shipData={shipData} />
        </div>

        {/* Compact Controls at Bottom */}
        <div className="bg-deep-800/50 border-t border-white/10 backdrop-blur-sm">
          <div className="container mx-auto px-2 py-2 max-w-6xl">
            {/* Ship Name */}
            <div className="mb-2">
              <input
                type="text"
                value={shipData.name}
                onChange={(e) => setShipData({ ...shipData, name: e.target.value })}
                className="w-full px-2 py-1 text-sm bg-black/30 border border-white/10 rounded text-white focus:outline-none focus:border-blue-500"
                placeholder="Ship Name"
              />
            </div>

            {/* Grid Layout for All Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">

              {/* Column 1: Ship Config */}
              <div className="space-y-1">
                <div className="text-xs font-bold text-blue-300 mb-1">Configuration</div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400 w-16">Scale</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={shipData.scale}
                    onChange={(e) => setShipData({ ...shipData, scale: parseFloat(e.target.value) })}
                    className="flex-1 h-1"
                  />
                  <span className="text-xs text-gray-300 w-8">{shipData.scale.toFixed(1)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400 w-16">Rotation</label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={shipData.rotation}
                    onChange={(e) => setShipData({ ...shipData, rotation: parseInt(e.target.value) })}
                    className="flex-1 h-1"
                  />
                  <span className="text-xs text-gray-300 w-8">{shipData.rotation}°</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400 w-16">Size</label>
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
                    className="flex-1 h-1"
                  />
                  <span className="text-xs text-gray-300 w-8">{shipData.components.hull.size}</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400 w-16">Glow</label>
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
                    className="flex-1 h-1"
                  />
                  <span className="text-xs text-gray-300 w-8">{shipData.components.engine.glowIntensity.toFixed(1)}</span>
                </div>

                {/* Hull Colors */}
                <div className="text-xs font-bold text-blue-300 mt-2 mb-1">Hull Colors</div>
                <div className="grid grid-cols-4 gap-1">
                  {Object.entries(shipData.color).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-[10px] text-gray-400 capitalize block">{key}</label>
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => setShipData({
                          ...shipData,
                          color: { ...shipData.color, [key]: e.target.value }
                        })}
                        className="w-full h-6 rounded border border-white/10 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                {/* Weapon Colors */}
                <div className="text-xs font-bold text-blue-300 mt-2 mb-1">Weapon Colors</div>
                <div className="grid grid-cols-3 gap-1">
                  {Object.entries(shipData.weaponColors).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-[10px] text-gray-400 capitalize block">{key}</label>
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => setShipData({
                          ...shipData,
                          weaponColors: { ...shipData.weaponColors, [key]: e.target.value }
                        })}
                        className="w-full h-6 rounded border border-white/10 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                {/* Thruster Style */}
                <div className="text-xs font-bold text-blue-300 mt-2 mb-1">Thruster Style</div>
                <select
                  value={shipData.components.engine.style}
                  onChange={(e) => setShipData({
                    ...shipData,
                    components: {
                      ...shipData.components,
                      engine: { ...shipData.components.engine, style: e.target.value as 'dual' | 'single' | 'quad' | 'ring' | 'plasma' }
                    }
                  })}
                  className="w-full px-2 py-1 text-xs bg-black/30 border border-white/10 rounded text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="dual">Dual Thrusters</option>
                  <option value="single">Single Center</option>
                  <option value="quad">Quad Array</option>
                  <option value="ring">Ring Thruster</option>
                  <option value="plasma">Plasma Drive</option>
                </select>

                {/* Cockpit Style */}
                <div className="text-xs font-bold text-blue-300 mt-2 mb-1">Cockpit Style</div>
                <select
                  value={shipData.components.cockpit.style}
                  onChange={(e) => setShipData({
                    ...shipData,
                    components: {
                      ...shipData.components,
                      cockpit: { ...shipData.components.cockpit, style: e.target.value as 'bubble' | 'angular' | 'sleek' | 'armored' | 'windowed' | 'minimal' }
                    }
                  })}
                  className="w-full px-2 py-1 text-xs bg-black/30 border border-white/10 rounded text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="bubble">Bubble Canopy</option>
                  <option value="angular">Angular Cockpit</option>
                  <option value="sleek">Sleek Design</option>
                  <option value="armored">Armored</option>
                  <option value="windowed">Windowed</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              {/* Column 2: Defense Systems */}
              <div className="space-y-1">
                <div className="text-xs font-bold text-blue-300 mb-1">Defense Systems</div>

                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <label className="text-xs text-gray-400 w-16">Hull</label>
                    <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all"
                        style={{ width: `${(shipData.defense.hull / 200) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-green-400 font-bold w-8">{shipData.defense.hull}</span>
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
                    className="w-full h-1"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <label className="text-xs text-gray-400 w-16">Armor</label>
                    <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all"
                        style={{ width: `${(shipData.defense.armor / 150) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-yellow-400 font-bold w-8">{shipData.defense.armor}</span>
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
                    className="w-full h-1"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <label className="text-xs text-gray-400 w-16">Shield</label>
                    <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all"
                        style={{ width: `${shipData.defense.shield}%` }}
                      />
                    </div>
                    <span className="text-xs text-blue-400 font-bold w-8">{shipData.defense.shield}</span>
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
                    className="w-full h-1"
                  />
                </div>

                {/* Stats Summary */}
                <div className="bg-black/20 rounded p-2 mt-2">
                  <div className="text-xs font-bold text-blue-300 mb-1">Combat Rating</div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Defense:</span>
                      <span className="text-green-400 font-bold">{shipData.defense.hull + shipData.defense.armor + shipData.defense.shield}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Weapons:</span>
                      <span className="text-red-400 font-bold">{shipData.weapons.lasers + shipData.weapons.missiles + shipData.weapons.mines}</span>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span className="text-gray-400">Power:</span>
                      <span className="text-indigo-400 font-bold">
                        {Math.round((shipData.defense.hull + shipData.defense.armor + shipData.defense.shield) * 0.4 +
                         (shipData.weapons.lasers * 15 + shipData.weapons.missiles * 10 + shipData.weapons.mines * 8))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: Weapon Systems */}
              <div className="space-y-1">
                <div className="text-xs font-bold text-blue-300 mb-1">Weapon Systems</div>

                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <label className="text-xs text-gray-400 w-16">Lasers</label>
                    <div className="flex-1 flex gap-0.5">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 h-1.5 rounded-full transition-all ${
                            i < shipData.weapons.lasers ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]' : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-red-400 font-bold w-8">{shipData.weapons.lasers}</span>
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
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <label className="text-xs text-gray-400 w-16">Missiles</label>
                    <div className="flex-1 flex gap-0.5">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 h-1.5 rounded-full transition-all ${
                            i < shipData.weapons.missiles ? 'bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.8)]' : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-orange-400 font-bold w-8">{shipData.weapons.missiles}</span>
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
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <label className="text-xs text-gray-400 w-16">Mines</label>
                    <div className="flex-1 flex gap-0.5">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 h-1.5 rounded-full transition-all ${
                            i < shipData.weapons.mines ? 'bg-purple-500 shadow-[0_0_4px_rgba(168,85,247,0.8)]' : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-purple-400 font-bold w-8">{shipData.weapons.mines}</span>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
