'use client';

import React, { useEffect, useRef, useState } from 'react';

// Camera class for zoom and pan controls
class Camera {
  x: number = 0;
  y: number = 0;
  zoom: number = 1;
  minZoom: number = 0.5;
  maxZoom: number = 3;

  // Pan the camera
  pan(dx: number, dy: number) {
    this.x += dx;
    this.y += dy;
  }

  // Zoom the camera
  zoomBy(delta: number, focusX: number, focusY: number) {
    const oldZoom = this.zoom;
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta));

    // Adjust position to zoom toward mouse position
    const zoomChange = this.zoom / oldZoom;
    this.x = focusX - (focusX - this.x) * zoomChange;
    this.y = focusY - (focusY - this.y) * zoomChange;
  }

  // Reset camera to default
  reset() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
  }

  // Apply camera transform to canvas context
  applyTransform(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.translate(width / 2 + this.x, height / 2 + this.y);
    ctx.scale(this.zoom, this.zoom);
  }
}

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
      style: 'dual' | 'single' | 'quad' | 'ring' | 'plasma';
    };
    cockpit: {
      enabled: boolean;
      style: 'bubble' | 'angular' | 'sleek' | 'armored' | 'windowed' | 'minimal';
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

  // Camera state
  const cameraRef = useRef<Camera>(new Camera());
  const [cameraState, setCameraState] = useState({ zoom: 1 }); // For UI updates
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Weapon firing state
  const [missiles, setMissiles] = useState<Missile[]>([]);
  const [laserBeams, setLaserBeams] = useState<LaserBeam[]>([]);
  const missileIdRef = useRef(0);
  const laserIdRef = useRef(0);
  const keysPressed = useRef<Set<string>>(new Set());

  // Refs for animation loop (to avoid re-renders)
  const missilesRef = useRef<Missile[]>([]);
  const lasersRef = useRef<LaserBeam[]>([]);

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

    // Use world coordinates (0,0 is at ship center)
    const angle = (shipData.rotation - 90) * (Math.PI / 180); // Ship points up initially
    const range = 400;
    const startOffset = shipData.components.hull.size * shipData.scale;

    const x1 = Math.cos(angle) * startOffset;
    const y1 = Math.sin(angle) * startOffset;
    const x2 = Math.cos(angle) * range;
    const y2 = Math.sin(angle) * range;

    // Create impact particles
    const particles = [];
    for (let i = 0; i < 10; i++) {
      const spreadAngle = angle + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 1.5 + 1; // Slower particles
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

    // Use world coordinates (0,0 is at ship center)
    const angle = (shipData.rotation - 90) * (Math.PI / 180);
    const startOffset = shipData.components.hull.size * shipData.scale;
    const speed = 3; // Slower missiles (was 8)

    const newMissile: Missile = {
      id: missileIdRef.current++,
      x: Math.cos(angle) * startOffset,
      y: Math.sin(angle) * startOffset,
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
      } else if (e.code === 'KeyR') {
        // Reset camera
        cameraRef.current.reset();
        setCameraState({ zoom: 1 });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [shipData]);

  // Camera mouse controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Zoom toward mouse position
      const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
      cameraRef.current.zoomBy(zoomDelta, mouseX - rect.width / 2, mouseY - rect.height / 2);
      setCameraState({ zoom: cameraRef.current.zoom });
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Right click or middle click for panning
      if (e.button === 1 || e.button === 2) {
        e.preventDefault();
        isDragging.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
      } else if (e.button === 0) {
        // Left click for laser (only if not dragging)
        fireLaser();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        cameraRef.current.pan(dx, dy);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1 || e.button === 2) {
        isDragging.current = false;
        canvas.style.cursor = 'default';
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent context menu on right click
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('mouseup', handleMouseUp); // Catch mouseup outside canvas

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [shipData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Performance: disable alpha
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
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = Math.min(currentTime - lastTime, 32); // Cap at 32ms for stability
      lastTime = currentTime;
      animTime += deltaTime / 1000;

      // Update missiles (using ref for performance)
      missilesRef.current = missilesRef.current
        .map(m => {
          // Update trail (only keep last 15 for performance)
          const newTrail = [{ x: m.x, y: m.y, alpha: 1 }, ...m.trail]
            .slice(0, 15)
            .map((t, i) => ({ ...t, alpha: 1 - i / 15 }));

          return {
            ...m,
            x: m.x + m.vx,
            y: m.y + m.vy,
            trail: newTrail,
            age: m.age + deltaTime
          };
        })
        .filter(m => {
          // Use world coordinates - missiles centered at 0,0 (ship position)
          // Remove missiles that are too far from ship or too old
          const distanceFromShip = Math.sqrt(m.x * m.x + m.y * m.y);
          return distanceFromShip < 1000 && m.age < 10000;
        });

      // Update laser beams
      lasersRef.current = lasersRef.current
        .map(l => {
          const newParticles = l.particles
            .map(p => ({
              x: p.x + p.vx,
              y: p.y + p.vy,
              vx: p.vx * 0.95, // Faster decay for performance
              vy: p.vy * 0.95,
              alpha: p.alpha - 0.03
            }))
            .filter(p => p.alpha > 0);

          return {
            ...l,
            age: l.age + deltaTime,
            particles: newParticles
          };
        })
        .filter(l => l.age < l.maxAge);

      drawShip(ctx, canvas, shipData, animTime, missilesRef.current, lasersRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [shipData]);

  // Sync React state with refs when new missiles/lasers are fired
  useEffect(() => {
    missilesRef.current = missiles;
    lasersRef.current = laserBeams;
  }, [missiles, laserBeams]);

  const drawShip = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    data: ShipData,
    time: number,
    currentMissiles: Missile[],
    currentLasers: LaserBeam[]
  ) => {
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw starfield background (not affected by camera)
    drawStarfield(ctx, width, height, time);

    // Save context for camera transform
    ctx.save();

    // Apply camera transform (translates to center and applies zoom/pan)
    cameraRef.current.applyTransform(ctx, width, height);

    // Now (0,0) is at the center of the canvas in world space
    // Save context for ship rotation/scale
    ctx.save();
    ctx.rotate((data.rotation * Math.PI) / 180);
    ctx.scale(data.scale, data.scale);

    // Draw shield (outermost layer)
    if (data.defense.shield > 0) {
      drawShield(ctx, data, time);
    }

    // Draw engine glow (behind ship)
    if (data.components.engine.enabled) {
      drawThruster(ctx, data, time);
    }

    // Draw ship hull with pearly effect
    drawPearlyHull(ctx, data, time);

    // Draw cockpit (on top of hull)
    if (data.components.cockpit.enabled) {
      drawCockpit(ctx, data);
    }

    // Draw armor plating
    if (data.defense.armor > 0) {
      drawArmor(ctx, data);
    }

    // Draw weapons
    drawWeapons(ctx, data, time);

    // Draw ship outline
    drawShipOutline(ctx, data);

    // Restore context from ship rotation/scale
    ctx.restore();

    // Draw missiles and lasers (in world space, affected by camera)
    drawMissiles(ctx, currentMissiles);
    drawLasers(ctx, currentLasers);

    // Restore context from camera transform
    ctx.restore();

    // Draw UI overlays (not affected by camera)
    drawCrosshair(ctx, width / 2, height / 2);
    drawStatsOverlay(ctx, data, width, height);
    drawWeaponControls(ctx, width, height);
    drawCameraControls(ctx, width, height, cameraRef.current.zoom);
  };

  const drawMissiles = (ctx: CanvasRenderingContext2D, missilesToDraw: Missile[]) => {
    missilesToDraw.forEach(missile => {
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

  const drawLasers = (ctx: CanvasRenderingContext2D, lasersToDraw: LaserBeam[]) => {
    lasersToDraw.forEach(laser => {
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

  const drawCameraControls = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    zoom: number
  ) => {
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';

    const controls = [
      { key: 'WHEEL', action: 'Zoom' },
      { key: 'RIGHT DRAG', action: 'Pan' },
      { key: 'R', action: 'Reset Camera' }
    ];

    controls.forEach((control, i) => {
      const y = 15 + i * 15;

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(5, y - 10, 140, 12);

      // Key indicator
      ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
      ctx.fillRect(10, y - 8, 8, 8);

      // Text
      ctx.fillStyle = 'rgba(100, 200, 255, 0.9)';
      ctx.fillText(`${control.key}: ${control.action}`, 25, y);
    });

    // Zoom level display
    const zoomY = 15 + controls.length * 15;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(5, zoomY - 10, 140, 12);
    ctx.fillStyle = 'rgba(100, 200, 255, 0.9)';
    ctx.fillText(`Zoom: ${(zoom * 100).toFixed(0)}%`, 10, zoomY);
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

  const drawThruster = (
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

    switch (data.components.engine.style) {
      case 'dual':
        // Two side thrusters
        drawThrusterGlow(ctx, backLeft.x + 5, backLeft.y, data.color.glow, glowIntensity * pulse, time);
        drawThrusterGlow(ctx, backRight.x - 5, backRight.y, data.color.glow, glowIntensity * pulse, time);
        break;

      case 'single':
        // Single center thruster
        drawThrusterGlow(ctx, backCenterX, backCenterY, data.color.glow, glowIntensity * pulse * 1.5, time);
        break;

      case 'quad':
        // Four thrusters in a square pattern
        const offset = 8;
        drawThrusterGlow(ctx, backLeft.x + 5, backLeft.y - 5, data.color.glow, glowIntensity * pulse * 0.7, time);
        drawThrusterGlow(ctx, backLeft.x + 5, backLeft.y + 5, data.color.glow, glowIntensity * pulse * 0.7, time);
        drawThrusterGlow(ctx, backRight.x - 5, backRight.y - 5, data.color.glow, glowIntensity * pulse * 0.7, time);
        drawThrusterGlow(ctx, backRight.x - 5, backRight.y + 5, data.color.glow, glowIntensity * pulse * 0.7, time);
        break;

      case 'ring':
        // Ring thruster effect
        ctx.strokeStyle = `${data.color.glow}${Math.floor(glowIntensity * pulse * 150).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(backCenterX, backCenterY, 15, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glow
        const ringGradient = ctx.createRadialGradient(backCenterX, backCenterY, 10, backCenterX, backCenterY, 20);
        ringGradient.addColorStop(0, `${data.color.glow}00`);
        ringGradient.addColorStop(0.5, `${data.color.glow}${Math.floor(glowIntensity * pulse * 100).toString(16).padStart(2, '0')}`);
        ringGradient.addColorStop(1, `${data.color.glow}00`);
        ctx.fillStyle = ringGradient;
        ctx.beginPath();
        ctx.arc(backCenterX, backCenterY, 20, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'plasma':
        // Plasma drive with unstable energy
        for (let i = 0; i < 5; i++) {
          const angle = (time * 4 + i * (Math.PI * 2 / 5)) % (Math.PI * 2);
          const radius = 12 + Math.sin(time * 10 + i) * 3;
          const px = backCenterX + Math.cos(angle) * radius;
          const py = backCenterY + Math.sin(angle) * radius;

          const plasmaGradient = ctx.createRadialGradient(px, py, 0, px, py, 8);
          plasmaGradient.addColorStop(0, `${data.color.glow}${Math.floor(glowIntensity * 200).toString(16).padStart(2, '0')}`);
          plasmaGradient.addColorStop(1, `${data.color.glow}00`);
          ctx.fillStyle = plasmaGradient;
          ctx.beginPath();
          ctx.arc(px, py, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
  };

  const drawThrusterGlow = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    intensity: number,
    time: number
  ) => {
    // Main glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
    gradient.addColorStop(0, `${color}${Math.floor(intensity * 180).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(0.5, `${color}${Math.floor(intensity * 100).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(1, `${color}00`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Particles
    for (let i = 0; i < 2; i++) {
      const particleOffset = (time * 60 + i * 15) % 35;
      const particleX = x;
      const particleY = y + particleOffset;
      const particleAlpha = (1 - particleOffset / 35) * intensity;

      ctx.fillStyle = `${color}${Math.floor(particleAlpha * 150).toString(16).padStart(2, '0')}`;
      ctx.beginPath();
      ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawCockpit = (
    ctx: CanvasRenderingContext2D,
    data: ShipData
  ) => {
    const points = data.components.hull.points;
    const nose = points[0];
    const size = data.components.hull.size;

    // Calculate cockpit position (near the front)
    const cockpitY = nose.y + size * 0.3;

    switch (data.components.cockpit.style) {
      case 'bubble':
        // Bubble canopy
        ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, cockpitY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(-2, cockpitY - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'angular':
        // Angular cockpit
        ctx.fillStyle = 'rgba(80, 180, 255, 0.3)';
        ctx.strokeStyle = 'rgba(80, 180, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, cockpitY - 8);
        ctx.lineTo(-6, cockpitY + 4);
        ctx.lineTo(6, cockpitY + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'sleek':
        // Sleek low-profile
        ctx.fillStyle = 'rgba(60, 160, 240, 0.25)';
        ctx.strokeStyle = 'rgba(60, 160, 240, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, cockpitY, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'armored':
        // Armored with viewports
        ctx.fillStyle = 'rgba(150, 150, 150, 0.4)';
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.7)';
        ctx.lineWidth = 2;
        ctx.fillRect(-8, cockpitY - 6, 16, 12);
        ctx.strokeRect(-8, cockpitY - 6, 16, 12);

        // Viewport
        ctx.fillStyle = 'rgba(100, 200, 255, 0.4)';
        ctx.fillRect(-5, cockpitY - 3, 10, 6);
        break;

      case 'windowed':
        // Multiple windows
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.7)';
        ctx.lineWidth = 1.5;
        for (let i = -1; i <= 1; i++) {
          ctx.fillStyle = 'rgba(100, 200, 255, 0.25)';
          ctx.beginPath();
          ctx.arc(i * 5, cockpitY, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        break;

      case 'minimal':
        // Minimal single viewport
        ctx.fillStyle = 'rgba(100, 200, 255, 0.2)';
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.fillRect(-4, cockpitY - 2, 8, 4);
        ctx.strokeRect(-4, cockpitY - 2, 8, 4);
        break;
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
