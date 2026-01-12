"use client";

import { useEffect, useRef, useState } from "react";

// Feature flag - easy disable if needed
const ENABLE_MISSILE_GAME = true;

interface Missile {
  id: string;
  x: number;
  y: number;
  vx: number; // velocity x
  vy: number; // velocity y
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  lifetime: number; // seconds
  maxLifetime: number;
  trail: { x: number; y: number }[];
}

interface HeroMissileGameProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

export default function HeroMissileGame({ containerRef }: HeroMissileGameProps) {
  const [missiles, setMissiles] = useState<Missile[]>([]);
  const missilesRef = useRef<Missile[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const missileIdCounter = useRef<number>(0);

  // Physics constants
  const MISSILE_SPEED = 600; // pixels per second
  const MAX_MISSILES = 20; // performance limit
  const MISSILE_LIFETIME = 3; // seconds
  const TRAIL_LENGTH = 8; // number of trail points
  const GRAVITY = 0; // pixels per second squared (can add later)

  // Launch missile from Megabot's shoulder position
  const launchMissile = (clickX: number, clickY: number) => {
    if (!containerRef.current) return;
    if (missilesRef.current.length >= MAX_MISSILES) return;

    const rect = containerRef.current.getBoundingClientRect();

    // Spawn from top center (Megabot's approximate position)
    const startX = rect.width / 2;
    const startY = rect.height * 0.3; // Upper portion where Megabot is

    // Calculate velocity components for straight-line motion
    const dx = clickX - startX;
    const dy = clickY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Normalize and apply speed
    const vx = (dx / distance) * MISSILE_SPEED;
    const vy = (dy / distance) * MISSILE_SPEED;

    const missile: Missile = {
      id: `missile-${missileIdCounter.current++}`,
      x: startX,
      y: startY,
      vx,
      vy,
      startX,
      startY,
      targetX: clickX,
      targetY: clickY,
      lifetime: 0,
      maxLifetime: MISSILE_LIFETIME,
      trail: [],
    };

    missilesRef.current = [...missilesRef.current, missile];
    setMissiles(missilesRef.current);
  };

  // Handle click events
  const handleClick = (e: MouseEvent) => {
    if (!containerRef.current || !ENABLE_MISSILE_GAME) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    launchMissile(clickX, clickY);
  };

  // Physics update loop
  const updateMissiles = (deltaTime: number) => {
    const dt = deltaTime / 1000; // convert to seconds

    missilesRef.current = missilesRef.current
      .map((missile) => {
        // Update lifetime
        missile.lifetime += dt;
        if (missile.lifetime >= missile.maxLifetime) {
          return null; // Mark for removal
        }

        // Store previous position for trail
        missile.trail.push({ x: missile.x, y: missile.y });
        if (missile.trail.length > TRAIL_LENGTH) {
          missile.trail.shift(); // Remove oldest point
        }

        // Update position using physics
        missile.x += missile.vx * dt;
        missile.y += missile.vy * dt;

        // Apply gravity (if enabled)
        if (GRAVITY !== 0) {
          missile.vy += GRAVITY * dt;
        }

        // Remove if out of bounds
        if (!containerRef.current) return null;
        const rect = containerRef.current.getBoundingClientRect();
        if (
          missile.x < -50 ||
          missile.x > rect.width + 50 ||
          missile.y < -50 ||
          missile.y > rect.height + 50
        ) {
          return null; // Out of bounds
        }

        return missile;
      })
      .filter((m): m is Missile => m !== null); // Remove nulls

    setMissiles([...missilesRef.current]);
  };

  // Animation loop using requestAnimationFrame
  const animate = (timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    // Update physics (cap at 60fps to prevent large delta spikes)
    if (deltaTime < 100) {
      updateMissiles(deltaTime);
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Setup and cleanup
  useEffect(() => {
    if (!ENABLE_MISSILE_GAME || !containerRef.current) return;

    const container = containerRef.current;
    container.addEventListener("click", handleClick);

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      container.removeEventListener("click", handleClick);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      missilesRef.current = [];
    };
  }, []);

  if (!ENABLE_MISSILE_GAME) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 999 }}
      aria-hidden="true"
    >
      {/* Render missiles */}
      {missiles.map((missile) => (
        <div key={missile.id}>
          {/* Trail effect */}
          {missile.trail.map((point, index) => {
            const opacity = (index + 1) / missile.trail.length;
            const scale = (index + 1) / missile.trail.length;
            return (
              <div
                key={`${missile.id}-trail-${index}`}
                className="absolute"
                style={{
                  left: `${point.x}px`,
                  top: `${point.y}px`,
                  width: `${4 * scale}px`,
                  height: `${4 * scale}px`,
                  transform: "translate(-50%, -50%)",
                  background: `radial-gradient(circle, rgba(6, 182, 212, ${opacity}), rgba(59, 130, 246, ${opacity * 0.5}), transparent)`,
                  borderRadius: "50%",
                  pointerEvents: "none",
                  willChange: "transform, opacity",
                }}
              />
            );
          })}

          {/* Missile head */}
          <div
            className="absolute"
            style={{
              left: `${missile.x}px`,
              top: `${missile.y}px`,
              width: "6px",
              height: "6px",
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle, #06b6d4, #3b82f6)",
              boxShadow:
                "0 0 10px #06b6d4, 0 0 20px #3b82f6, 0 0 30px #8b5cf6",
              borderRadius: "50%",
              pointerEvents: "none",
              willChange: "transform",
            }}
          />
        </div>
      ))}

      {/* Debug info (remove later) */}
      <div
        className="absolute top-4 right-4 bg-black/50 text-white text-xs p-2 rounded"
        style={{ pointerEvents: "auto" }}
      >
        <div>Missiles: {missiles.length} / {MAX_MISSILES}</div>
        <div className="text-cyan-400 text-[10px] mt-1">Click to launch!</div>
      </div>
    </div>
  );
}
