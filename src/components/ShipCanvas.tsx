'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ShipData {
  name: string;
  scale: number;
  rotation: number;
  color: {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
  };
  weaponColors: {
    laser: string;
    missile: string;
    mine: string;
  };
  defense: {
    hull: number;
    armor: number;
    shield: number;
  };
  weapons: {
    lasers: number;
    missiles: number;
    mines: number;
  };
  components: {
    hull: {
      type: string;
      size: number;
      points: Array<{ x: number; y: number }>;
    };
    engine: {
      enabled: boolean;
      thrust: number;
      glowIntensity: number;
    };
  };
}

interface ShipCanvasProps {
  shipData: ShipData;
}

interface Missile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
  age: number;
  color: string;
}

interface LaserBeam {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  age: number;
  maxAge: number;
  color: string;
  particles: Array<{ x: number; y: number; vx: number; vy: number; alpha: number }>;
}

export default function ShipCanvas({ shipData }: ShipCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [time, setTime] = useState(0);

  // Weapon firing state
  const [missiles, setMissiles] = useState<Missile[]>([]);
  const [laserBeams, setLaserBeams] = useState<LaserBeam[]>([]);
  const missileIdRef = useRef(0);
  const laserIdRef = useRef(0);
  const keysPressed = useRef<Set<string>>(new Set());

  // Cooldowns
  const lastMissileFire = useRef(0);
  const lastLaserFire = useRef(0);
  const MISSILE_COOLDOWN = 500; // ms
  const LASER_COOLDOWN = 200; // ms

  // Weapon firing functions
  const fireLaser = () => {
    if (shipData.weapons.lasers === 0) return;

    const now = Date.now();
    if (now - lastLaserFire.current < LASER_COOLDOWN) return;
    lastLaserFire.current = now;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    const centerX = width / 2;
    const centerY = height / 2;

    // Create laser beam from ship front to edge of screen
    const angle = (shipData.rotation - 90) * (Math.PI / 180); // Ship points up initially
    const range = 500;
    const startOffset = shipData.components.hull.size * shipData.scale;

    const x1 = centerX + Math.cos(angle) * startOffset;
    const y1 = centerY + Math.sin(angle) * startOffset;
    const x2 = centerX + Math.cos(angle) * range;
    const y2 = centerY + Math.sin(angle) * range;

    // Create impact particles
    const particles = [];
    for (let i = 0; i < 10; i++) {
      const spreadAngle = angle + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 3 + 2;
      particles.push({
        x: x2,
        y: y2,
        vx: Math.cos(spreadAngle) * speed,
        vy: Math.sin(spreadAngle) * speed,
        alpha: 1
      });
    }

    const newBeam: LaserBeam = {
      id: laserIdRef.current++,
      x1,
      y1,
      x2,
      y2,
      age: 0,
      maxAge: 150, // ms
      color: shipData.weaponColors.laser,
      particles
    };

    setLaserBeams(prev => [...prev, newBeam]);
  };

  const fireMissile = () => {
    if (shipData.weapons.missiles === 0) return;

    const now = Date.now();
    if (now - lastMissileFire.current < MISSILE_COOLDOWN) return;
    lastMissileFire.current = now;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    const centerX = width / 2;
    const centerY = height / 2;

    // Fire from ship front with current rotation
    const angle = (shipData.rotation - 90) * (Math.PI / 180);
    const startOffset = shipData.components.hull.size * shipData.scale;
    const speed = 8;

    const newMissile: Missile = {
      id: missileIdRef.current++,
      x: centerX + Math.cos(angle) * startOffset,
      y: centerY + Math.sin(angle) * startOffset,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      trail: [],
      age: 0,
      color: shipData.weaponColors.missile
    };

    setMissiles(prev => [...prev, newMissile]);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.code);

      if (e.code === 'Space') {
        e.preventDefault();
        fireLaser();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        fireMissile();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    // Mouse click for lasers
    const handleClick = () => {
      fireLaser();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('click', handleClick);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (canvas) {
        canvas.removeEventListener('click', handleClick);
      }
    };
  }, [shipData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Animation loop
    let animTime = 0;
    const animate = () => {
      const deltaTime = 16; // ~60fps
      animTime += 0.016;
      setTime(animTime);

      // Update missiles
      setMissiles(prev => {
        return prev
          .map(m => {
            // Update trail
            const newTrail = [{ x: m.x, y: m.y, alpha: 1 }, ...m.trail]
              .slice(0, 20)
              .map((t, i) => ({ ...t, alpha: 1 - i / 20 }));

            return {
              ...m,
              x: m.x + m.vx,
              y: m.y + m.vy,
              trail: newTrail,
              age: m.age + deltaTime
            };
          })
          .filter(m => {
            // Remove missiles that are off screen or too old
            const width = canvas.width / window.devicePixelRatio;
            const height = canvas.height / window.devicePixelRatio;
            return m.x > -50 && m.x < width + 50 &&
                   m.y > -50 && m.y < height + 50 &&
                   m.age < 5000;
          });
      });

      // Update laser beams
      setLaserBeams(prev => {
        return prev
          .map(l => {
            // Update particles
            const newParticles = l.particles
              .map(p => ({
                x: p.x + p.vx,
                y: p.y + p.vy,
                vx: p.vx * 0.98, // Friction
                vy: p.vy * 0.98,
                alpha: p.alpha - 0.02
              }))
              .filter(p => p.alpha > 0);

            return {
              ...l,
              age: l.age + deltaTime,
              particles: newParticles
            };
          })
          .filter(l => l.age < l.maxAge);
      });

      drawShip(ctx, canvas, shipData, animTime);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [shipData, missiles, laserBeams]);

  const drawShip = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    data: ShipData,
    time: number
  ) => {
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw starfield background
    drawStarfield(ctx, width, height, time);

    // Save context
    ctx.save();

    // Translate to center
    ctx.translate(centerX, centerY);
    ctx.rotate((data.rotation * Math.PI) / 180);
    ctx.scale(data.scale, data.scale);

    // Draw shield (outermost layer)
    if (data.defense.shield > 0) {
      drawShield(ctx, data, time);
    }

    // Draw engine glow (behind ship)
    if (data.components.engine.enabled) {
      drawEngineGlow(ctx, data, time);
    }

    // Draw ship hull with pearly effect
    drawPearlyHull(ctx, data, time);

    // Draw armor plating
    if (data.defense.armor > 0) {
      drawArmor(ctx, data);
    }

    // Draw weapons
    drawWeapons(ctx, data, time);

    // Draw ship outline
    drawShipOutline(ctx, data);

    // Restore context
    ctx.restore();

    // Draw missiles and lasers (in world space, after ship)
    drawMissiles(ctx);
    drawLasers(ctx);

    // Draw UI overlays
    drawCrosshair(ctx, centerX, centerY);
    drawStatsOverlay(ctx, data, width, height);
    drawWeaponControls(ctx, width, height);
  };

  const drawMissiles = (ctx: CanvasRenderingContext2D) => {
    missiles.forEach(missile => {
      // Draw trail
      missile.trail.forEach((point, i) => {
        const r = parseInt(missile.color.slice(1, 3), 16);
        const g = parseInt(missile.color.slice(3, 5), 16);
        const b = parseInt(missile.color.slice(5, 7), 16);

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${point.alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3 * (1 - i / missile.trail.length), 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw missile body
      ctx.fillStyle = missile.color;
      ctx.save();
      ctx.translate(missile.x, missile.y);
      const angle = Math.atan2(missile.vy, missile.vx);
      ctx.rotate(angle);

      // Missile shape
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-4, -3);
      ctx.lineTo(-4, 3);
      ctx.closePath();
      ctx.fill();

      // Missile glow
      const r = parseInt(missile.color.slice(1, 3), 16);
      const g = parseInt(missile.color.slice(3, 5), 16);
      const b = parseInt(missile.color.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      // Engine glow at back
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(-4, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  };

  const drawLasers = (ctx: CanvasRenderingContext2D) => {
    laserBeams.forEach(laser => {
      const lifeRatio = laser.age / laser.maxAge;
      const alpha = 1 - lifeRatio;

      // Parse hex color
      const r = parseInt(laser.color.slice(1, 3), 16);
      const g = parseInt(laser.color.slice(3, 5), 16);
      const b = parseInt(laser.color.slice(5, 7), 16);

      // Draw outer glow
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(laser.x1, laser.y1);
      ctx.lineTo(laser.x2, laser.y2);
      ctx.stroke();

      // Draw middle beam
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.7})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(laser.x1, laser.y1);
      ctx.lineTo(laser.x2, laser.y2);
      ctx.stroke();

      // Draw core
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(laser.x1, laser.y1);
      ctx.lineTo(laser.x2, laser.y2);
      ctx.stroke();

      // Draw impact particles
      laser.particles.forEach(particle => {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particle.alpha})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Particle glow
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 1, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  };

  const drawWeaponControls = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const controls = [
      { key: 'SPACE / CLICK', action: 'Fire Lasers', color: shipData.weaponColors.laser, enabled: shipData.weapons.lasers > 0 },
      { key: 'M', action: 'Fire Missiles', color: shipData.weaponColors.missile, enabled: shipData.weapons.missiles > 0 }
    ];

    ctx.font = '10px monospace';
    ctx.textAlign = 'right';

    controls.forEach((control, i) => {
      if (!control.enabled) return;

      const y = height - 10 - (controls.length - 1 - i) * 15;

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(width - 180, y - 10, 175, 12);

      // Key indicator
      const r = parseInt(control.color.slice(1, 3), 16);
      const g = parseInt(control.color.slice(3, 5), 16);
      const b = parseInt(control.color.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
      ctx.fillRect(width - 175, y - 8, 8, 8);

      // Text
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
      ctx.fillText(`${control.key}: ${control.action}`, width - 10, y);
    });
  };

  const drawStarfield = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw subtle grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;

    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw stars
    const starSeed = 12345;
    for (let i = 0; i < 100; i++) {
      const x = ((starSeed + i * 7919) % 10000) / 10000 * width;
      const y = ((starSeed + i * 4211) % 10000) / 10000 * height;
      const size = ((i % 3) + 1) * 0.5;
      const twinkle = Math.sin(time * 2 + i) * 0.3 + 0.7;

      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.6})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawShield = (
    ctx: CanvasRenderingContext2D,
    data: ShipData,
    time: number
  ) => {
    const points = data.components.hull.points;
    const size = data.components.hull.size;
    const shieldRadius = size * 1.3;
    const shieldStrength = data.defense.shield / 100;
    const pulse = Math.sin(time * 2) * 0.1 + 0.9;

    // Shield bubble
    const gradient = ctx.createRadialGradient(0, 0, shieldRadius * 0.7, 0, 0, shieldRadius);
    gradient.addColorStop(0, `rgba(59, 130, 246, 0)`);
    gradient.addColorStop(0.8, `rgba(59, 130, 246, ${shieldStrength * pulse * 0.3})`);
    gradient.addColorStop(1, `rgba(14, 165, 233, ${shieldStrength * pulse * 0.5})`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
    ctx.fill();

    // Shield hexagon pattern
    ctx.strokeStyle = `rgba(59, 130, 246, ${shieldStrength * pulse * 0.4})`;
    ctx.lineWidth = 1.5;
    const hexCount = 6;
    for (let i = 0; i < hexCount; i++) {
      const angle = (i / hexCount) * Math.PI * 2 + time;
      const hexRadius = shieldRadius * 0.3;
      const hexX = Math.cos(angle) * shieldRadius * 0.7;
      const hexY = Math.sin(angle) * shieldRadius * 0.7;

      ctx.beginPath();
      for (let j = 0; j <= 6; j++) {
        const hexAngle = (j / 6) * Math.PI * 2;
        const x = hexX + Math.cos(hexAngle) * hexRadius;
        const y = hexY + Math.sin(hexAngle) * hexRadius;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  };

  const drawEngineGlow = (
    ctx: CanvasRenderingContext2D,
    data: ShipData,
    time: number
  ) => {
    const points = data.components.hull.points;
    const backLeft = points[1];
    const backRight = points[2];
    const backCenterX = (backLeft.x + backRight.x) / 2;
    const backCenterY = (backLeft.y + backRight.y) / 2;

    const glowIntensity = data.components.engine.glowIntensity;
    const pulse = Math.sin(time * 8) * 0.2 + 0.8;

    // Main engine glow
    const gradient = ctx.createRadialGradient(
      backCenterX,
      backCenterY,
      0,
      backCenterX,
      backCenterY,
      30
    );

    gradient.addColorStop(0, `${data.color.glow}${Math.floor(glowIntensity * pulse * 180).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(0.5, `${data.color.glow}${Math.floor(glowIntensity * pulse * 100).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(1, `${data.color.glow}00`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(backCenterX, backCenterY, 30, 0, Math.PI * 2);
    ctx.fill();

    // Engine particles
    for (let i = 0; i < 3; i++) {
      const particleOffset = (time * 60 + i * 10) % 40;
      const particleX = backCenterX;
      const particleY = backCenterY + particleOffset;
      const particleAlpha = (1 - particleOffset / 40) * glowIntensity * pulse;

      ctx.fillStyle = `${data.color.glow}${Math.floor(particleAlpha * 150).toString(16).padStart(2, '0')}`;
      ctx.beginPath();
      ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawPearlyHull = (
    ctx: CanvasRenderingContext2D,
    data: ShipData,
    time: number
  ) => {
    const points = data.components.hull.points;

    // Calculate bounds for gradient
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));

    // Create pearly gradient effect
    const gradient = ctx.createLinearGradient(0, minY, 0, maxY);
    gradient.addColorStop(0, data.color.primary);
    gradient.addColorStop(0.3, data.color.secondary);
    gradient.addColorStop(0.6, data.color.accent);
    gradient.addColorStop(1, data.color.secondary);

    // Draw filled hull
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Add shimmer effect
    const shimmer = Math.sin(time * 3) * 0.15 + 0.15;
    ctx.fillStyle = `rgba(255, 255, 255, ${shimmer})`;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Add inner glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = data.color.glow;
    ctx.strokeStyle = `${data.color.accent}80`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;
  };

  const drawArmor = (
    ctx: CanvasRenderingContext2D,
    data: ShipData
  ) => {
    const points = data.components.hull.points;
    const armorStrength = data.defense.armor / 150;

    // Armor plating on edges
    ctx.strokeStyle = `rgba(251, 191, 36, ${armorStrength * 0.6})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Armor segments
    for (let i = 0; i < points.length; i++) {
      const nextI = (i + 1) % points.length;
      const midX = (points[i].x + points[nextI].x) / 2;
      const midY = (points[i].y + points[nextI].y) / 2;

      ctx.fillStyle = `rgba(234, 179, 8, ${armorStrength * 0.5})`;
      ctx.beginPath();
      ctx.arc(midX, midY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawWeapons = (
    ctx: CanvasRenderingContext2D,
    data: ShipData,
    time: number
  ) => {
    const points = data.components.hull.points;
    const nose = points[0];
    const leftWing = points[1];
    const rightWing = points[2];

    // Draw laser cannons on wings
    for (let i = 0; i < data.weapons.lasers; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const wingPoint = side === 1 ? rightWing : leftWing;
      const offsetY = Math.floor(i / 2) * 8;
      const laserX = wingPoint.x * 0.7;
      const laserY = wingPoint.y - offsetY;

      // Laser cannon body
      ctx.fillStyle = data.weaponColors.laser;
      ctx.fillRect(laserX - 2, laserY - 4, 4, 8);

      // Laser glow
      const pulse = Math.sin(time * 10 + i) * 0.3 + 0.7;
      // Convert hex to rgba for transparency
      const r = parseInt(data.weaponColors.laser.slice(1, 3), 16);
      const g = parseInt(data.weaponColors.laser.slice(3, 5), 16);
      const b = parseInt(data.weaponColors.laser.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulse * 0.6})`;
      ctx.beginPath();
      ctx.arc(laserX, laserY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw missile launchers
    for (let i = 0; i < Math.min(data.weapons.missiles, 4); i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const wingPoint = side === 1 ? rightWing : leftWing;
      const offsetX = side * (10 + Math.floor(i / 2) * 10);
      const missileX = offsetX;
      const missileY = wingPoint.y - 5;

      // Missile rack
      ctx.fillStyle = data.weaponColors.missile;
      ctx.fillRect(missileX - 3, missileY - 2, 6, 4);

      // Missile tip (darker shade)
      const r = parseInt(data.weaponColors.missile.slice(1, 3), 16);
      const g = parseInt(data.weaponColors.missile.slice(3, 5), 16);
      const b = parseInt(data.weaponColors.missile.slice(5, 7), 16);
      ctx.fillStyle = `rgb(${Math.floor(r * 0.8)}, ${Math.floor(g * 0.8)}, ${Math.floor(b * 0.8)})`;
      ctx.beginPath();
      ctx.moveTo(missileX, missileY - 5);
      ctx.lineTo(missileX - 2, missileY - 2);
      ctx.lineTo(missileX + 2, missileY - 2);
      ctx.closePath();
      ctx.fill();
    }

    // Draw mine indicators (small icons near the back)
    if (data.weapons.mines > 0) {
      const mineY = (leftWing.y + rightWing.y) / 2;
      for (let i = 0; i < Math.min(data.weapons.mines, 3); i++) {
        const mineX = (i - 1) * 10;
        const mineSize = 3;

        // Mine body
        ctx.strokeStyle = data.weaponColors.mine;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mineX, mineY, mineSize, 0, Math.PI * 2);
        ctx.stroke();

        // Mine spikes
        for (let j = 0; j < 4; j++) {
          const angle = (j / 4) * Math.PI * 2;
          const x1 = mineX + Math.cos(angle) * mineSize;
          const y1 = mineY + Math.sin(angle) * mineSize;
          const x2 = mineX + Math.cos(angle) * (mineSize + 3);
          const y2 = mineY + Math.sin(angle) * (mineSize + 3);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    }
  };

  const drawShipOutline = (
    ctx: CanvasRenderingContext2D,
    data: ShipData
  ) => {
    const points = data.components.hull.points;

    // Draw bright outline
    ctx.strokeStyle = data.color.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw vertex highlights
    ctx.fillStyle = data.color.primary;
    for (const point of points) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawCrosshair = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
  ) => {
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 1;

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(x - 20, y);
    ctx.lineTo(x - 5, y);
    ctx.moveTo(x + 5, y);
    ctx.lineTo(x + 20, y);
    ctx.stroke();

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x, y - 5);
    ctx.moveTo(x, y + 5);
    ctx.lineTo(x, y + 20);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawStatsOverlay = (
    ctx: CanvasRenderingContext2D,
    data: ShipData,
    width: number,
    height: number
  ) => {
    // Ship name at top
    ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(data.name, width / 2, 20);

    // Quick stats in corner
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    const stats = [
      `H:${data.defense.hull} A:${data.defense.armor} S:${data.defense.shield}`,
      `L:${data.weapons.lasers} M:${data.weapons.missiles} X:${data.weapons.mines}`
    ];

    stats.forEach((stat, i) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(8, height - 40 + (i * 15), 120, 12);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
      ctx.fillText(stat, 10, height - 32 + (i * 15));
    });
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[50vh] min-h-[400px] max-h-[600px]"
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
}
