"use client";

import { useEffect, useRef } from "react";
import * as THREE from 'three';

export default function StarMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const starMapRef = useRef<any>(null);

  useEffect(() => {
    // Initialize StarMap with Three.js ES modules
    if (containerRef.current) {
      starMapRef.current = new StarMapHero(containerRef.current);
    }

    return () => {
      if (starMapRef.current && starMapRef.current.destroy) {
        starMapRef.current.destroy();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="hero-star-map"
      className="absolute inset-0 z-0"
      aria-hidden="true"
    />
  );
}

class StarMapHero {
  THREE: typeof THREE;
  container: HTMLDivElement;
  settings: any;
  mouse: any = { x: 0, y: 0, targetX: 0, targetY: 0 };
  autoRotate: boolean = true;
  autoRotateSpeed: number = 0.0002;
  time: number = 0;
  scene: any;
  camera: any;
  renderer: any;
  starField: any;
  starData: any[] = [];
  nebulaClouds: any[] = [];
  shootingStars: any[] = [];

  constructor(container: HTMLDivElement) {
    this.THREE = THREE;
    this.container = container;
    if (!this.container) {
      console.warn("Container not found");
      return;
    }

    // Performance settings based on device capability
    this.settings = this.detectCapabilities();

    // Check WebGL support
    if (!this.isWebGLAvailable()) {
      this.showFallback();
      return;
    }

    this.init();
    this.createStars();
    this.createNebulaClouds();
    this.addEventListeners();
    this.animate();
  }

  detectCapabilities() {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    const isLowEnd =
      navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Adjust settings based on device
    if (prefersReducedMotion) {
      return {
        starCount: 2000,
        nebulaCount: 0,
        enableParallax: false,
        enableAutoRotate: false,
      };
    } else if (isMobile || isLowEnd) {
      return {
        starCount: 5000,
        nebulaCount: 2,
        enableParallax: true,
        enableAutoRotate: true,
      };
    } else {
      return {
        starCount: 15000,
        nebulaCount: 4,
        enableParallax: true,
        enableAutoRotate: true,
      };
    }
  }

  isWebGLAvailable() {
    try {
      const canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  }

  showFallback() {
    // Keep the existing static background as fallback
    console.log("WebGL not available, using fallback background");
    this.container.style.background =
      "radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a14 100%)";
  }

  init() {
    const THREE = this.THREE;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.00015);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.offsetWidth / this.container.offsetHeight,
      0.1,
      2000
    );
    this.camera.position.z = 500;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false, // Disable for performance
      powerPreference: "high-performance",
    });
    this.renderer.setSize(
      this.container.offsetWidth,
      this.container.offsetHeight
    );
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
    this.renderer.setClearColor(0x000000, 0);

    // Add canvas to container
    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.top = "0";
    this.renderer.domElement.style.left = "0";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.zIndex = "1";
    this.container.appendChild(this.renderer.domElement);
  }

  createStars() {
    const THREE = this.THREE;
    const starCount = this.settings.starCount;

    // Create geometry for a single star (point)
    const starGeometry = new THREE.SphereGeometry(0.5, 4, 4);

    // Create material
    const starMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });

    // Use InstancedMesh for massive performance boost
    this.starField = new THREE.InstancedMesh(
      starGeometry,
      starMaterial,
      starCount
    );

    // Position stars in a spherical distribution
    const dummy = new THREE.Object3D();
    const colors = [
      new THREE.Color(0xffffff), // White
      new THREE.Color(0xaaaaff), // Blue-white
      new THREE.Color(0xffddaa), // Yellow-white
      new THREE.Color(0xffaaaa), // Red-tint
      new THREE.Color(0xaaffff), // Cyan-tint
    ];

    for (let i = 0; i < starCount; i++) {
      // Spherical distribution
      const radius = 400 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi) - 300; // Offset back

      dummy.position.set(x, y, z);

      // Random size
      const size = 0.5 + Math.random() * 1.5;
      dummy.scale.set(size, size, size);

      dummy.updateMatrix();
      this.starField.setMatrixAt(i, dummy.matrix);

      // Store data for animations
      this.starData.push({
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
        baseOpacity: 0.5 + Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });

      // Set color
      this.starField.setColorAt(i, this.starData[i].color);
    }

    this.starField.instanceMatrix.needsUpdate = true;
    if (this.starField.instanceColor) {
      this.starField.instanceColor.needsUpdate = true;
    }

    this.scene.add(this.starField);
  }

  createNebulaClouds() {
    const THREE = this.THREE;
    if (this.settings.nebulaCount === 0) return;

    const nebulaColors = [
      { start: 0xff6b35, end: 0xff8e53 }, // Orange
      { start: 0x4a90e2, end: 0x7fb3f5 }, // Blue
      { start: 0xa855f7, end: 0xc084fc }, // Purple
      { start: 0xfbbf24, end: 0xfcd34d }, // Gold
    ];

    for (let i = 0; i < this.settings.nebulaCount; i++) {
      const geometry = new THREE.SphereGeometry(150, 32, 32);
      const colorPair = nebulaColors[i % nebulaColors.length];

      const material = new THREE.MeshBasicMaterial({
        color: colorPair.start,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });

      const nebula = new THREE.Mesh(geometry, material);

      // Position nebulae
      const angle = (i / this.settings.nebulaCount) * Math.PI * 2;
      const distance = 600 + Math.random() * 300;
      nebula.position.x = Math.cos(angle) * distance;
      nebula.position.y = (Math.random() - 0.5) * 400;
      nebula.position.z = Math.sin(angle) * distance - 500;

      nebula.rotation.x = Math.random() * Math.PI;
      nebula.rotation.y = Math.random() * Math.PI;

      this.nebulaClouds.push({
        mesh: nebula,
        rotationSpeed: 0.0001 + Math.random() * 0.0002,
        pulseSpeed: 0.5 + Math.random(),
        pulseOffset: Math.random() * Math.PI * 2,
      });

      this.scene.add(nebula);
    }
  }

  addEventListeners() {
    // Mouse move for parallax
    if (this.settings.enableParallax) {
      const handleMouseMove = (e: MouseEvent) => {
        this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
        this.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
        this.autoRotate = false; // Stop auto-rotate on interaction
      };
      document.addEventListener("mousemove", handleMouseMove);

      // Reset auto-rotate after inactivity
      let inactivityTimer: NodeJS.Timeout;
      const resetAutoRotate = () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
          this.autoRotate = true;
        }, 5000);
      };
      document.addEventListener("mousemove", resetAutoRotate);
    }

    // Handle resize
    const handleResize = () => this.onWindowResize();
    window.addEventListener("resize", handleResize, false);

    // Touch support for mobile
    if ("ontouchstart" in window) {
      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) {
          this.mouse.targetX =
            (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
          this.mouse.targetY =
            (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
        }
      };
      document.addEventListener("touchmove", handleTouchMove, { passive: true });
    }

    // Click to create shooting stars
    const handleClick = (e: MouseEvent) => {
      this.createShootingStar(e.clientX, e.clientY);
    };
    this.container.addEventListener("click", handleClick);
  }

  createShootingStar(clickX: number, clickY: number) {
    const THREE = this.THREE;
    if (!THREE) return;

    // Convert screen coordinates to 3D space
    const x = (clickX / window.innerWidth) * 2 - 1;
    const y = -(clickY / window.innerHeight) * 2 + 1;

    // Create shooting star trail
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(100 * 3); // 100 points for the trail
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const trail = new THREE.Line(geometry, material);

    // Calculate start and end positions
    const startX = x * 800;
    const startY = y * 800;
    const startZ = -200;

    const angle = Math.random() * Math.PI * 2;
    const distance = 1000 + Math.random() * 500;
    const endX = startX + Math.cos(angle) * distance;
    const endY = startY + Math.sin(angle) * distance;
    const endZ = startZ - 800;

    // Initialize trail positions
    const posArray = geometry.attributes.position.array;
    for (let i = 0; i < 100; i++) {
      const t = i / 100;
      posArray[i * 3] = startX;
      posArray[i * 3 + 1] = startY;
      posArray[i * 3 + 2] = startZ;
    }

    this.scene.add(trail);

    // Store shooting star data
    this.shootingStars.push({
      trail,
      startX,
      startY,
      startZ,
      endX,
      endY,
      endZ,
      progress: 0,
      speed: 0.02 + Math.random() * 0.03,
      lifetime: 0
    });
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect =
      this.container.offsetWidth / this.container.offsetHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(
      this.container.offsetWidth,
      this.container.offsetHeight
    );
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.time += 0.01;

    // Smooth mouse interpolation
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    // Camera movement
    if (this.settings.enableParallax) {
      this.camera.position.x +=
        (this.mouse.x * 50 - this.camera.position.x) * 0.05;
      this.camera.position.y +=
        (-this.mouse.y * 50 - this.camera.position.y) * 0.05;
    }

    // Auto-rotate when idle
    if (this.autoRotate && this.settings.enableAutoRotate) {
      this.camera.position.x = Math.sin(this.time * this.autoRotateSpeed) * 100;
      this.camera.position.y =
        Math.cos(this.time * this.autoRotateSpeed * 0.5) * 50;
    }

    this.camera.lookAt(0, 0, -500);

    // Animate star field rotation
    if (this.starField) {
      this.starField.rotation.y += 0.0001;
    }

    // Animate nebula clouds
    if (this.nebulaClouds) {
      this.nebulaClouds.forEach((cloud) => {
        cloud.mesh.rotation.x += cloud.rotationSpeed;
        cloud.mesh.rotation.y += cloud.rotationSpeed * 0.5;

        // Pulse opacity
        const pulse = Math.sin(this.time * cloud.pulseSpeed + cloud.pulseOffset);
        cloud.mesh.material.opacity = 0.05 + pulse * 0.03;
      });
    }

    // Animate shooting stars
    if (this.shootingStars.length > 0) {
      this.shootingStars = this.shootingStars.filter((star) => {
        star.progress += star.speed;
        star.lifetime += 0.016; // Approximate frame time

        if (star.progress >= 1 || star.lifetime > 2) {
          // Remove shooting star
          this.scene.remove(star.trail);
          star.trail.geometry.dispose();
          star.trail.material.dispose();
          return false;
        }

        // Update trail positions
        const posArray = star.trail.geometry.attributes.position.array;
        for (let i = 0; i < 100; i++) {
          const t = (i / 100) * star.progress;
          posArray[i * 3] = star.startX + (star.endX - star.startX) * t;
          posArray[i * 3 + 1] = star.startY + (star.endY - star.startY) * t;
          posArray[i * 3 + 2] = star.startZ + (star.endZ - star.startZ) * t;
        }
        star.trail.geometry.attributes.position.needsUpdate = true;

        // Fade out
        star.trail.material.opacity = 0.8 * (1 - star.progress);

        return true;
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  // Public method to clean up
  destroy() {
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container && this.renderer.domElement) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
  }
}
