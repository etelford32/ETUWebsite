"use client";

import { useEffect, useRef, useState } from "react";

// Feature flag - easy disable if needed
const ENABLE_MISSILE_GAME = true;

interface Missile {
  active: boolean; // For object pooling
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetime: number;
  maxLifetime: number;
  trailX: Float32Array; // Circular buffer for trail X positions
  trailY: Float32Array; // Circular buffer for trail Y positions
  trailIndex: number; // Current position in circular buffer
  trailFilled: boolean; // Whether the trail buffer is full
}

interface HeroMissileGameProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

export default function HeroMissileGame({ containerRef }: HeroMissileGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Object pool for missiles
  const missilePoolRef = useRef<Missile[]>([]);
  const activeMissileCountRef = useRef<number>(0);
  const [activeMissileCount, setActiveMissileCount] = useState(0);

  // Physics constants
  const MISSILE_SPEED = 600;
  const MAX_MISSILES = 50; // Increased limit due to better performance
  const MISSILE_LIFETIME = 3;
  const TRAIL_LENGTH = 15; // Increased for smoother trails
  const GRAVITY = 0;

  // Initialize object pool
  const initializeMissilePool = () => {
    missilePoolRef.current = Array.from({ length: MAX_MISSILES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      lifetime: 0,
      maxLifetime: MISSILE_LIFETIME,
      trailX: new Float32Array(TRAIL_LENGTH),
      trailY: new Float32Array(TRAIL_LENGTH),
      trailIndex: 0,
      trailFilled: false,
    }));
  };

  // Get an inactive missile from the pool
  const getMissileFromPool = (): Missile | null => {
    for (let i = 0; i < missilePoolRef.current.length; i++) {
      const missile = missilePoolRef.current[i];
      if (!missile.active) {
        return missile;
      }
    }
    return null; // Pool exhausted
  };

  // Launch missile from Megabot's shoulder position
  const launchMissile = (clickX: number, clickY: number) => {
    if (!containerRef.current) return;

    const missile = getMissileFromPool();
    if (!missile) return; // Pool exhausted

    const rect = containerRef.current.getBoundingClientRect();

    // Spawn from top center (Megabot's approximate position)
    const startX = rect.width / 2;
    const startY = rect.height * 0.3;

    // Calculate velocity components for straight-line motion
    const dx = clickX - startX;
    const dy = clickY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Normalize and apply speed
    const vx = (dx / distance) * MISSILE_SPEED;
    const vy = (dy / distance) * MISSILE_SPEED;

    // Reset and activate missile from pool
    missile.active = true;
    missile.x = startX;
    missile.y = startY;
    missile.vx = vx;
    missile.vy = vy;
    missile.lifetime = 0;
    missile.trailIndex = 0;
    missile.trailFilled = false;

    activeMissileCountRef.current++;
    setActiveMissileCount(activeMissileCountRef.current);
  };

  // Handle click events
  const handleClick = (e: MouseEvent) => {
    if (!containerRef.current || !ENABLE_MISSILE_GAME) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    launchMissile(clickX, clickY);
  };

  // Physics update and render loop
  const updateAndRender = (deltaTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dt = deltaTime / 1000; // Convert to seconds
    const rect = containerRef.current.getBoundingClientRect();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeCount = 0;

    // Update and render all active missiles
    for (let i = 0; i < missilePoolRef.current.length; i++) {
      const missile = missilePoolRef.current[i];
      if (!missile.active) continue;

      activeCount++;

      // Update lifetime
      missile.lifetime += dt;
      if (missile.lifetime >= missile.maxLifetime) {
        missile.active = false;
        continue;
      }

      // Add current position to trail (circular buffer)
      missile.trailX[missile.trailIndex] = missile.x;
      missile.trailY[missile.trailIndex] = missile.y;
      missile.trailIndex = (missile.trailIndex + 1) % TRAIL_LENGTH;
      if (missile.trailIndex === 0) {
        missile.trailFilled = true;
      }

      // Update position using physics
      missile.x += missile.vx * dt;
      missile.y += missile.vy * dt;

      // Apply gravity (if enabled)
      if (GRAVITY !== 0) {
        missile.vy += GRAVITY * dt;
      }

      // Remove if out of bounds
      if (
        missile.x < -50 ||
        missile.x > rect.width + 50 ||
        missile.y < -50 ||
        missile.y > rect.height + 50
      ) {
        missile.active = false;
        continue;
      }

      // Render trail
      const trailLength = missile.trailFilled ? TRAIL_LENGTH : missile.trailIndex;
      for (let j = 0; j < trailLength; j++) {
        // Calculate the index in the circular buffer (oldest to newest)
        const bufferIndex = missile.trailFilled
          ? (missile.trailIndex + j) % TRAIL_LENGTH
          : j;

        const x = missile.trailX[bufferIndex];
        const y = missile.trailY[bufferIndex];

        // Progress through the trail (0 = oldest, 1 = newest)
        const progress = (j + 1) / trailLength;
        const opacity = progress * 0.8;
        const size = 2 + progress * 3;

        // Draw trail point with gradient
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, `rgba(6, 182, 212, ${opacity})`);
        gradient.addColorStop(0.5, `rgba(59, 130, 246, ${opacity * 0.7})`);
        gradient.addColorStop(1, `rgba(139, 92, 246, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render missile head with glow effect
      const headSize = 4;
      const glowSize = 15;

      // Outer glow
      const outerGlow = ctx.createRadialGradient(
        missile.x,
        missile.y,
        0,
        missile.x,
        missile.y,
        glowSize
      );
      outerGlow.addColorStop(0, "rgba(139, 92, 246, 0.4)");
      outerGlow.addColorStop(0.5, "rgba(59, 130, 246, 0.2)");
      outerGlow.addColorStop(1, "rgba(6, 182, 212, 0)");

      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(missile.x, missile.y, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Inner glow
      const innerGlow = ctx.createRadialGradient(
        missile.x,
        missile.y,
        0,
        missile.x,
        missile.y,
        headSize * 2
      );
      innerGlow.addColorStop(0, "rgba(6, 182, 212, 1)");
      innerGlow.addColorStop(0.5, "rgba(59, 130, 246, 0.8)");
      innerGlow.addColorStop(1, "rgba(139, 92, 246, 0.3)");

      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(missile.x, missile.y, headSize * 2, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(missile.x, missile.y, headSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Update active count if changed
    if (activeCount !== activeMissileCountRef.current) {
      activeMissileCountRef.current = activeCount;
      setActiveMissileCount(activeCount);
    }
  };

  // Animation loop using requestAnimationFrame
  const animate = (timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    // Update physics and render (cap at 60fps to prevent large delta spikes)
    if (deltaTime < 100) {
      updateAndRender(deltaTime);
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Handle canvas resize
  const resizeCanvas = () => {
    if (!canvasRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const canvas = canvasRef.current;

    // Set canvas size to match container
    canvas.width = rect.width;
    canvas.height = rect.height;
  };

  // Setup and cleanup
  useEffect(() => {
    if (!ENABLE_MISSILE_GAME || !containerRef.current) return;

    // Initialize object pool
    initializeMissilePool();

    const container = containerRef.current;
    container.addEventListener("click", handleClick);

    // Setup canvas
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      container.removeEventListener("click", handleClick);
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      missilePoolRef.current = [];
    };
  }, []);

  if (!ENABLE_MISSILE_GAME) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 999 }}
      aria-hidden="true"
    >
      {/* Canvas for missile rendering */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ imageRendering: "auto" }}
      />

      {/* Debug info */}
      <div
        className="absolute top-4 right-4 bg-black/50 text-white text-xs p-2 rounded"
        style={{ pointerEvents: "auto" }}
      >
        <div>Missiles: {activeMissileCount} / {MAX_MISSILES}</div>
        <div className="text-cyan-400 text-[10px] mt-1">Click to launch!</div>
        <div className="text-green-400 text-[10px]">Canvas optimized</div>
      </div>
    </div>
  );
}
