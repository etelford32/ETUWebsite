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

type SubmitStatus =
  | { kind: 'idle' }
  | { kind: 'anonymous' }       // ran the game without being logged in
  | { kind: 'submitting' }
  | { kind: 'submitted'; rank?: number }
  | { kind: 'error'; message: string };

export default function MissileGamePage() {
  const [animationQuality, setAnimationQuality] = useState<QualityLevel>("medium");
  const megabotSceneRef = useRef<any>(null);
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Auth state — checked on mount via /api/auth/session.
  const [authUser, setAuthUser] = useState<{ id: string; username?: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Run token issued by /api/megabot/run-token at game start. Submit-score
  // verifies the token (signature + age + ownership + score-vs-wave ceiling)
  // before flipping is_verified=true. Logged-out players don't have one;
  // their score still inserts but stays unverified.
  const runTokenRef = useRef<string | null>(null);
  // Latest heartbeat chain token. Each cleared wave we POST a heartbeat with
  // (current score, wave just cleared, prevHeartbeat) and stash the
  // returned token here. The final submit sends this token alongside
  // runToken; submit-score verifies score + wave match the heartbeat.
  const heartbeatTokenRef = useRef<string | null>(null);
  // Highest cleared wave we've already heartbeated, so we don't double-beat
  // the same intermission.
  const lastHeartbeatWaveRef = useRef(0);
  const heartbeatInFlightRef = useRef(false);

  // Score-submission status (drives the bottom-center pill).
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>({ kind: 'idle' });
  const submittedRef = useRef(false);

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

    // Check session once on mount; the score-submit effect waits on this.
    // If authenticated, immediately request a run-token so the moment-of-
    // submit doesn't have to round-trip for it. Token failures are non-fatal
    // (the run still plays, just submits unverified).
    fetch('/api/auth/session', { credentials: 'include' })
      .then(r => r.json())
      .then(async data => {
        if (data?.authenticated && data?.user) {
          setAuthUser({ id: data.user.id, username: data.user.username });
          try {
            const tokRes = await fetch('/api/megabot/run-token', {
              method: 'POST',
              credentials: 'include',
            });
            if (tokRes.ok) {
              const tokJson = await tokRes.json();
              if (tokJson?.token) runTokenRef.current = tokJson.token;
            }
          } catch {
            /* leave runTokenRef null; submit-score will mark unverified */
          }
        }
      })
      .catch(() => { /* leave authUser null */ })
      .finally(() => setAuthChecked(true));
  }, []);

  // Heartbeat watcher: when waveState transitions back to 'intermission'
  // and a wave was actually cleared (wave > lastHeartbeatWave), post a
  // heartbeat with the current score + cleared wave count. Server returns
  // a fresh chain token bound to (runId, wave, score, t) which we keep
  // for the next beat or for the final submit.
  useEffect(() => {
    if (!authChecked || !authUser) return;
    if (!runTokenRef.current) return;
    if (gameState.waveState !== 'intermission') return;
    if (gameState.wave <= 0) return;
    if (gameState.wave <= lastHeartbeatWaveRef.current) return;
    if (heartbeatInFlightRef.current) return;

    heartbeatInFlightRef.current = true;
    const wave = gameState.wave;
    const snapshotScore = gameState.score;
    fetch('/api/megabot/heartbeat', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runToken: runTokenRef.current,
        prevHeartbeat: heartbeatTokenRef.current,
        currentWave: wave,
        currentScore: snapshotScore,
      }),
    })
      .then(async r => {
        const json = await r.json().catch(() => ({}));
        if (r.ok && json?.token) {
          heartbeatTokenRef.current = json.token;
          lastHeartbeatWaveRef.current = wave;
        }
        // Non-fatal: if the heartbeat is rejected (e.g. score-rate spike)
        // we just keep the previous chain token and stop trying for this
        // wave. The final submit will fail the verified gate; the run
        // still records.
      })
      .catch(() => { /* network blip — best effort */ })
      .finally(() => { heartbeatInFlightRef.current = false; });
  }, [authChecked, authUser, gameState.wave, gameState.waveState, gameState.score]);

  // Game-over watcher: when Megabot's HP hits zero we submit the run once.
  // We gate on `authChecked` so we don't race with the session check, and on
  // submittedRef so a re-render can't trigger a second POST.
  useEffect(() => {
    if (submittedRef.current) return;
    if (!authChecked) return;
    if (gameState.health > 0) return;

    submittedRef.current = true;

    if (!authUser) {
      setSubmitStatus({ kind: 'anonymous' });
      return;
    }
    if (gameState.score <= 0 || gameState.wave <= 0) {
      // Don't pollute the leaderboard with zero/instant-death runs.
      setSubmitStatus({ kind: 'idle' });
      return;
    }

    setSubmitStatus({ kind: 'submitting' });
    fetch('/api/submit-score', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: gameState.score,
        mode: 'megabot',
        platform: 'PC',
        level: gameState.wave,
        metadata: {
          wave: gameState.wave,
          upgradeLevel: gameState.upgradeLevel,
          // Mark the source so server-side verification can later filter
          // on it without inferring from `mode` alone.
          source: 'web-megabot-arena',
          // Stripped server-side before persistence; used only for the
          // is_verified gate. Null when the token fetch failed at game
          // start — score still inserts, just stays unverified.
          runToken: runTokenRef.current,
          // Latest chain heartbeat. Required for is_verified=true; if
          // null (no waves cleared, or all heartbeats failed) the score
          // still records, just unverified.
          heartbeatToken: heartbeatTokenRef.current,
        },
      }),
    })
      .then(async r => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
        setSubmitStatus({ kind: 'submitted' });
      })
      .catch((err: any) => {
        setSubmitStatus({ kind: 'error', message: err?.message || 'Submit failed' });
      });
  }, [authChecked, authUser, gameState.health, gameState.score, gameState.wave, gameState.upgradeLevel]);

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

        {/* Submit-status pill (bottom center, only while a run has ended) */}
        {submitStatus.kind !== 'idle' && (
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30"
            style={{ pointerEvents: "auto" }}
          >
            <SubmitPill status={submitStatus} score={gameState.score} wave={gameState.wave} />
          </div>
        )}

        {/* Back link (bottom left, outside game UI) */}
        <Link
          href="/"
          className="btn-ghost absolute bottom-6 left-6 z-30 text-xs"
          style={{ pointerEvents: "auto" }}
        >
          ← Back to Home
        </Link>

        {/* Leaderboard link (bottom right) */}
        <Link
          href="/leaderboard?mode=megabot"
          className="btn-ghost absolute bottom-6 right-6 z-30 text-xs"
          style={{ pointerEvents: "auto" }}
        >
          🏆 Megabot Arena Leaderboard
        </Link>
      </section>

      <Footer />
    </>
  );
}

function SubmitPill({
  status,
  score,
  wave,
}: {
  status: SubmitStatus;
  score: number;
  wave: number;
}) {
  switch (status.kind) {
    case 'submitting':
      return (
        <span className="etu-pill etu-pill--cyan">
          <span className="ping" /> Submitting score · {score.toLocaleString()}
        </span>
      );
    case 'submitted':
      return (
        <span className="etu-pill etu-pill--green">
          ✓ Score submitted · Wave {wave} · {score.toLocaleString()}
        </span>
      );
    case 'anonymous':
      return (
        <Link href="/login" className="etu-pill etu-pill--amber">
          ⚠ Log in to save your {score.toLocaleString()} on the Megabot Arena leaderboard
        </Link>
      );
    case 'error':
      return (
        <span className="etu-pill etu-pill--purple" title={status.message}>
          ⚠ Submit failed — score not saved
        </span>
      );
    default:
      return null;
  }
}
