"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QualitySettings, { type QualityLevel } from "@/components/QualitySettings";
import CameraControls from "@/components/CameraControls";
import { detectConnectionQuality, initPerformanceOptimizations } from "@/lib/performance";

const Megabot = dynamic(() => import("@/components/Megabot"), { ssr: false });
const HeroMissileGame = dynamic(() => import("@/components/HeroMissileGame"), { ssr: false });

export default function MissileGamePage() {
  const [animationQuality, setAnimationQuality] = useState<QualityLevel>("medium");
  const megabotSceneRef = useRef<any>(null);
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const [gameState, setGameState] = useState<{
    score: number;
    health: number;
    shipCount: number;
    missileCount: number;
    wave: number;
    waveState: string;
    waveCountdown: number;
    waveBonus: { wave: number; amount: number } | null;
    waveShipsRemaining: number;
    waveShipsTotal: number;
    shieldHP: number;
    maxShieldHP: number;
    upgradeLevel: number;
    combo?: number;
    comboTimer?: number;
    perf?: { fps: number; frameMs: number; collisionChecks: number; collisionChecksFull: number; barrageQueue: number };
  }>({
    score: 0,
    health: 10000,
    shipCount: 0,
    missileCount: 0,
    wave: 0,
    waveState: 'intermission',
    waveCountdown: 0,
    waveBonus: null,
    waveShipsRemaining: 0,
    waveShipsTotal: 0,
    shieldHP: 3000,
    maxShieldHP: 3000,
    upgradeLevel: 0,
  });

  useEffect(() => {
    initPerformanceOptimizations();
    const saved = typeof window !== "undefined"
      ? (localStorage.getItem("etu-animation-quality") as QualityLevel | null)
      : null;
    if (!saved) setAnimationQuality(detectConnectionQuality());
  }, []);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <>
      <Header />

      <section
        ref={heroSectionRef}
        className="relative h-[calc(100vh-64px)] min-h-[640px] flex items-center overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        <Suspense fallback={<div />}>
          <Megabot
            quality={animationQuality}
            trackingTarget={mousePosition}
            buttonBounds={null}
            isButtonClicked={false}
            onLaserUpdate={undefined}
            onGameStateUpdate={setGameState}
            onSceneReady={(scene: any) => { megabotSceneRef.current = scene; }}
          />
        </Suspense>

        <Suspense fallback={<div />}>
          <HeroMissileGame gameState={gameState} />
        </Suspense>

        <QualitySettings
          onChange={setAnimationQuality}
          defaultQuality={animationQuality}
        />
        <CameraControls megabotRef={megabotSceneRef} />

        {/* Title overlay (top center) */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
          <span className="etu-pill etu-pill--amber inline-flex">
            <span className="ping" /> Live · Megabot Arena
          </span>
          <h1 className="font-orbitron mt-3 text-2xl md:text-3xl tracking-[0.08em] uppercase text-[#c7d9e8] drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            Megabot Missile Defense
          </h1>
          <p className="mt-2 text-xs md:text-sm text-slate-300/80 max-w-md mx-auto px-4">
            Defend Earth's last station. Megabot studies how you fight — every wave gets harder.
          </p>
        </div>

        {/* Back link (bottom left, outside game UI) */}
        <Link
          href="/"
          className="btn-ghost absolute bottom-6 left-6 z-30 text-xs"
          style={{ pointerEvents: "auto" }}
        >
          ← Back to Home
        </Link>
      </section>

      <Footer />
    </>
  );
}
