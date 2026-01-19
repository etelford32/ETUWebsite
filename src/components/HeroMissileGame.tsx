"use client";

import { useEffect, useRef, useState } from "react";

// Feature flags
const ENABLE_MISSILE_GAME = true;
const DEBUG_COLLISION = false; // Set to true to visualize collision boundaries

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

interface EnemyShip {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  size: number;
  rotation: number;
  type: 'fighter' | 'bomber' | 'interceptor';
  hitFlash: number; // Flash effect when hit
}

interface Explosion {
  active: boolean;
  x: number;
  y: number;
  lifetime: number;
  maxLifetime: number;
  size: number;
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

  // Enemy ships pool
  const shipPoolRef = useRef<EnemyShip[]>([]);
  const [activeShipCount, setActiveShipCount] = useState(0);

  // Explosions pool
  const explosionPoolRef = useRef<Explosion[]>([]);

  // Game state
  const [score, setScore] = useState(0);
  const [megabotHealth, setMegabotHealth] = useState(100);
  const scoreRef = useRef<number>(0);
  const megabotHealthRef = useRef<number>(100);
  const lastSpawnTimeRef = useRef<number>(0);
  const screenShakeRef = useRef<number>(0); // Screen shake intensity

  // Physics constants
  const MISSILE_SPEED = 600;
  const MAX_MISSILES = 50;
  const MISSILE_LIFETIME = 3;
  const TRAIL_LENGTH = 15;
  const GRAVITY = 0;

  // Ship constants
  const MAX_SHIPS = 15;
  const SHIP_SPAWN_INTERVAL = 2000; // ms
  const SHIP_SPEED_MIN = 80;
  const SHIP_SPEED_MAX = 150;
  const COLLISION_RADIUS = 15;
  const MAX_EXPLOSIONS = 30;

  // Initialize object pools
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

  const initializeShipPool = () => {
    shipPoolRef.current = Array.from({ length: MAX_SHIPS }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      health: 3,
      maxHealth: 3,
      size: 20,
      rotation: 0,
      type: 'fighter',
      hitFlash: 0,
    }));
  };

  const initializeExplosionPool = () => {
    explosionPoolRef.current = Array.from({ length: MAX_EXPLOSIONS }, () => ({
      active: false,
      x: 0,
      y: 0,
      lifetime: 0,
      maxLifetime: 0.5,
      size: 20,
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

  // Get an inactive ship from the pool
  const getShipFromPool = (): EnemyShip | null => {
    for (let i = 0; i < shipPoolRef.current.length; i++) {
      const ship = shipPoolRef.current[i];
      if (!ship.active) {
        return ship;
      }
    }
    return null;
  };

  // Get an inactive explosion from the pool
  const getExplosionFromPool = (): Explosion | null => {
    for (let i = 0; i < explosionPoolRef.current.length; i++) {
      const explosion = explosionPoolRef.current[i];
      if (!explosion.active) {
        return explosion;
      }
    }
    return null;
  };

  // Create explosion effect
  const createExplosion = (x: number, y: number, size: number) => {
    const explosion = getExplosionFromPool();
    if (!explosion) return;

    explosion.active = true;
    explosion.x = x;
    explosion.y = y;
    explosion.lifetime = 0;
    explosion.maxLifetime = 0.5;
    explosion.size = size;
  };

  // Spawn enemy ship
  const spawnEnemyShip = () => {
    if (!containerRef.current) return;

    const ship = getShipFromPool();
    if (!ship) return;

    const rect = containerRef.current.getBoundingClientRect();

    // Random spawn position (edges of screen)
    const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let startX, startY;

    switch (side) {
      case 0: // top
        startX = Math.random() * rect.width;
        startY = -30;
        break;
      case 1: // right
        startX = rect.width + 30;
        startY = Math.random() * rect.height;
        break;
      case 2: // bottom
        startX = Math.random() * rect.width;
        startY = rect.height + 30;
        break;
      default: // left
        startX = -30;
        startY = Math.random() * rect.height;
    }

    // Target megabot position (top center)
    const targetX = rect.width / 2;
    const targetY = rect.height * 0.3;

    // Calculate velocity
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = SHIP_SPEED_MIN + Math.random() * (SHIP_SPEED_MAX - SHIP_SPEED_MIN);

    // Ship types with different properties
    const types: Array<EnemyShip['type']> = ['fighter', 'bomber', 'interceptor'];
    const type = types[Math.floor(Math.random() * types.length)];

    let health, size;
    switch (type) {
      case 'fighter':
        health = 1;
        size = 15;
        break;
      case 'bomber':
        health = 3;
        size = 25;
        break;
      case 'interceptor':
        health = 2;
        size = 18;
        break;
    }

    ship.active = true;
    ship.x = startX;
    ship.y = startY;
    ship.vx = (dx / distance) * speed;
    ship.vy = (dy / distance) * speed;
    ship.health = health;
    ship.maxHealth = health;
    ship.size = size;
    ship.type = type;
    ship.rotation = Math.atan2(dy, dx);
    ship.hitFlash = 0;
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

  // Check collision between two objects
  const checkCollision = (x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (r1 + r2);
  };

  // Physics update and render loop
  const updateAndRender = (deltaTime: number, timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dt = deltaTime / 1000; // Convert to seconds
    const rect = containerRef.current.getBoundingClientRect();

    // Megabot position
    const megabotX = rect.width / 2;
    const megabotY = rect.height * 0.3;
    const megabotRadius = 40;

    // Update screen shake
    if (screenShakeRef.current > 0) {
      screenShakeRef.current -= dt * 30; // Decay quickly
      if (screenShakeRef.current < 0) screenShakeRef.current = 0;
    }

    // Apply screen shake transform
    const shakeX = screenShakeRef.current > 0 ? (Math.random() - 0.5) * screenShakeRef.current : 0;
    const shakeY = screenShakeRef.current > 0 ? (Math.random() - 0.5) * screenShakeRef.current : 0;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply shake transform
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Spawn enemy ships periodically
    if (timestamp - lastSpawnTimeRef.current > SHIP_SPAWN_INTERVAL) {
      spawnEnemyShip();
      lastSpawnTimeRef.current = timestamp;
    }

    let activeCount = 0;
    let shipCount = 0;

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

      // Check collision with ships
      let hitShip = false;
      for (let j = 0; j < shipPoolRef.current.length; j++) {
        const ship = shipPoolRef.current[j];
        if (!ship.active) continue;

        if (checkCollision(missile.x, missile.y, 5, ship.x, ship.y, ship.size)) {
          ship.health--;
          hitShip = true;

          // Flash effect on hit
          ship.hitFlash = 1.0;

          if (ship.health <= 0) {
            // Ship destroyed
            ship.active = false;
            createExplosion(ship.x, ship.y, ship.size * 2);
            scoreRef.current += ship.maxHealth * 100;
            setScore(scoreRef.current);
          } else {
            // Ship damaged
            createExplosion(missile.x, missile.y, 10);
          }

          missile.active = false;
          break;
        }
      }

      if (hitShip) continue;

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

    // Update and render enemy ships
    for (let i = 0; i < shipPoolRef.current.length; i++) {
      const ship = shipPoolRef.current[i];
      if (!ship.active) continue;

      shipCount++;

      // Update position
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;

      // Fade hit flash effect
      if (ship.hitFlash > 0) {
        ship.hitFlash -= dt * 3; // Fade over ~0.33 seconds
        if (ship.hitFlash < 0) ship.hitFlash = 0;
      }

      // Check collision with megabot
      if (checkCollision(ship.x, ship.y, ship.size, megabotX, megabotY, megabotRadius)) {
        ship.active = false;
        createExplosion(ship.x, ship.y, ship.size * 2);

        // Damage megabot
        megabotHealthRef.current = Math.max(0, megabotHealthRef.current - 10);
        setMegabotHealth(megabotHealthRef.current);

        // Screen shake on damage
        screenShakeRef.current = 10;

        continue;
      }

      // Remove if out of bounds (far out)
      if (
        ship.x < -100 ||
        ship.x > rect.width + 100 ||
        ship.y < -100 ||
        ship.y > rect.height + 100
      ) {
        ship.active = false;
        continue;
      }

      // Render ship based on type
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.rotation);

      // Ship color based on type
      let shipColor;
      switch (ship.type) {
        case 'fighter':
          shipColor = '#ff4444';
          break;
        case 'bomber':
          shipColor = '#ff8800';
          break;
        case 'interceptor':
          shipColor = '#ffff00';
          break;
      }

      // Apply hit flash effect (blend with white)
      let renderColor = shipColor;
      if (ship.hitFlash > 0) {
        // Interpolate between ship color and white based on flash intensity
        const flashAmount = ship.hitFlash;
        renderColor = `rgba(255, 255, 255, ${flashAmount})`;
      }

      // Ship body (triangle)
      ctx.fillStyle = ship.hitFlash > 0 ? renderColor : shipColor;
      ctx.beginPath();
      ctx.moveTo(ship.size, 0);
      ctx.lineTo(-ship.size * 0.6, ship.size * 0.5);
      ctx.lineTo(-ship.size * 0.6, -ship.size * 0.5);
      ctx.closePath();
      ctx.fill();

      // Ship glow
      const shipGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, ship.size);
      shipGlow.addColorStop(0, `${shipColor}80`);
      shipGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = shipGlow;
      ctx.beginPath();
      ctx.arc(0, 0, ship.size * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Engine glow
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.arc(-ship.size * 0.5, 0, ship.size * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Health bar
      const healthBarWidth = ship.size * 2;
      const healthBarHeight = 4;
      const healthPercent = ship.health / ship.maxHealth;

      // Health bar background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(
        ship.x - healthBarWidth / 2,
        ship.y - ship.size - 10,
        healthBarWidth,
        healthBarHeight
      );

      // Health bar fill
      ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
      ctx.fillRect(
        ship.x - healthBarWidth / 2,
        ship.y - ship.size - 10,
        healthBarWidth * healthPercent,
        healthBarHeight
      );
    }

    // Update ship count
    if (shipCount !== activeShipCount) {
      setActiveShipCount(shipCount);
    }

    // Update and render explosions
    for (let i = 0; i < explosionPoolRef.current.length; i++) {
      const explosion = explosionPoolRef.current[i];
      if (!explosion.active) continue;

      explosion.lifetime += dt;

      if (explosion.lifetime >= explosion.maxLifetime) {
        explosion.active = false;
        continue;
      }

      const progress = explosion.lifetime / explosion.maxLifetime;
      const size = explosion.size * (1 + progress * 2);
      const opacity = 1 - progress;

      // Outer explosion
      const gradient = ctx.createRadialGradient(
        explosion.x,
        explosion.y,
        0,
        explosion.x,
        explosion.y,
        size
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
      gradient.addColorStop(0.3, `rgba(255, 150, 0, ${opacity * 0.8})`);
      gradient.addColorStop(0.6, `rgba(255, 50, 0, ${opacity * 0.5})`);
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, size, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright core
      const coreGradient = ctx.createRadialGradient(
        explosion.x,
        explosion.y,
        0,
        explosion.x,
        explosion.y,
        size * 0.5
      );
      coreGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
      coreGradient.addColorStop(1, `rgba(255, 200, 0, 0)`);

      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Debug: Visualize collision boundaries
    if (DEBUG_COLLISION) {
      // Megabot collision circle
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(megabotX, megabotY, megabotRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Ship collision circles
      for (let i = 0; i < shipPoolRef.current.length; i++) {
        const ship = shipPoolRef.current[i];
        if (!ship.active) continue;

        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.size, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Missile collision circles
      for (let i = 0; i < missilePoolRef.current.length; i++) {
        const missile = missilePoolRef.current[i];
        if (!missile.active) continue;

        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(missile.x, missile.y, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Restore transform (remove shake)
    ctx.restore();
  };

  // Animation loop using requestAnimationFrame
  const animate = (timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
      lastSpawnTimeRef.current = timestamp;
    }

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    // Update physics and render (cap at 60fps to prevent large delta spikes)
    if (deltaTime < 100) {
      updateAndRender(deltaTime, timestamp);
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

    // Initialize object pools
    initializeMissilePool();
    initializeShipPool();
    initializeExplosionPool();

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
      shipPoolRef.current = [];
      explosionPoolRef.current = [];
    };
  }, []);

  if (!ENABLE_MISSILE_GAME) return null;

  const healthPercent = megabotHealth / 100;

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

      {/* Game UI - Top Left */}
      <div
        className="absolute top-4 left-4 bg-black/70 text-white text-sm p-3 rounded-lg border-2 border-cyan-500/50"
        style={{ pointerEvents: "auto", minWidth: "200px" }}
      >
        {/* Score */}
        <div className="mb-3">
          <div className="text-cyan-400 text-xs font-bold mb-1">SCORE</div>
          <div className="text-2xl font-bold text-white">{score.toLocaleString()}</div>
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
              {megabotHealth}%
            </div>
          </div>
        </div>

        {/* Game Over Warning */}
        {megabotHealth === 0 && (
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
        <div className="text-purple-400 font-bold mb-2">COMBAT STATUS</div>
        <div className="space-y-1">
          <div className="flex justify-between gap-3">
            <span className="text-gray-400">Missiles:</span>
            <span className="text-cyan-400 font-bold">{activeMissileCount} / {MAX_MISSILES}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-400">Enemy Ships:</span>
            <span className="text-red-400 font-bold">{activeShipCount} / {MAX_SHIPS}</span>
          </div>
        </div>
        <div className="text-cyan-400 text-[10px] mt-2 pt-2 border-t border-purple-500/30">
          Click to launch missiles!
        </div>
      </div>
    </div>
  );
}
