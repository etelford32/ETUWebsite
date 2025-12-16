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

export default function ShipCanvas({ shipData }: ShipCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [time, setTime] = useState(0);

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
      animTime += 0.016; // ~60fps
      setTime(animTime);
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
  }, [shipData]);

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

    // Draw engine glow (behind ship)
    if (data.components.engine.enabled) {
      drawEngineGlow(ctx, data, time);
    }

    // Draw ship hull with pearly effect
    drawPearlyHull(ctx, data, time);

    // Draw ship outline
    drawShipOutline(ctx, data);

    // Restore context
    ctx.restore();

    // Draw crosshair
    drawCrosshair(ctx, centerX, centerY);
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

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[600px] rounded-lg"
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
}
