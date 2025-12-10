"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    THREE: any;
  }
}

export default function BlackHole() {
  const containerRef = useRef<HTMLDivElement>(null);
  const blackHoleRef = useRef<any>(null);

  useEffect(() => {
    // Load Three.js dynamically
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js";
    script.async = true;
    script.onload = () => {
      if (containerRef.current && window.THREE) {
        blackHoleRef.current = new BlackHoleEffect(containerRef.current);
      }
    };
    document.head.appendChild(script);

    return () => {
      if (blackHoleRef.current && blackHoleRef.current.destroy) {
        blackHoleRef.current.destroy();
      }
      // Clean up script
      const existingScript = document.querySelector(`script[src="${script.src}"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="hero-black-hole"
      className="absolute inset-0 z-0"
      aria-hidden="true"
    />
  );
}

class BlackHoleEffect {
  container: HTMLDivElement;
  mouse: any = { x: 0, y: 0, targetX: 0, targetY: 0 };
  time: number = 0;
  scene: any;
  camera: any;
  renderer: any;
  blackHole: any;
  accretionDisk: any;
  starField: any;
  particles: any[] = [];
  particleTrails: any[] = [];
  photonSphere: any;
  outerBoundary: any;
  photonRing: any; // NEW: Separate photon ring visualization
  settings: any;

  // ============================================================================
  // PHASE 1: ADVANCED PHYSICS CONSTANTS
  // ============================================================================

  // Schwarzschild Geometry Constants
  readonly SCHWARZSCHILD_RADIUS = 60; // Event horizon radius (Rs)
  readonly PHOTON_SPHERE_RADIUS = 90; // 1.5 * Rs - unstable photon orbits
  readonly ISCO_RADIUS = 180; // Innermost stable circular orbit (3 * Rs)
  readonly TORUS_MAJOR_RADIUS = 400; // Major radius of torus
  readonly TORUS_MINOR_RADIUS = 150; // Minor radius of torus (tube thickness)

  // Gravitational Constants
  G_BASE = 25000; // Base gravitational constant - tuned for stable orbits
  G = 25000; // Gravitational constant (adjustable via UI)
  readonly FRAME_DRAGGING_STRENGTH = 0.045; // Lense-Thirring effect strength

  // PHASE 1: RELATIVISTIC PHYSICS CONSTANTS
  readonly SPEED_OF_LIGHT = 30.0; // Normalized speed of light for visualization
  readonly DOPPLER_STRENGTH = 1.2; // Doppler shift intensity (artistic enhancement)
  readonly BEAMING_POWER = 3.0; // Relativistic beaming exponent
  readonly GRAVITATIONAL_REDSHIFT_STRENGTH = 0.8; // Intensity of gravitational redshift

  // PHASE 2: KERR METRIC (ROTATING BLACK HOLE) CONSTANTS
  readonly SPIN_PARAMETER = 0.9; // Black hole spin (0 = Schwarzschild, 1 = extremal Kerr)
  readonly ERGOSPHERE_RADIUS = 120; // Rs + sqrt(Rs^2 - a^2) for equatorial plane
  readonly KERR_FRAME_DRAGGING = 0.12; // Enhanced frame dragging for rotating BH
  readonly PROGRADE_BOOST = 1.3; // Velocity boost for prograde orbits (with rotation)
  readonly RETROGRADE_PENALTY = 0.7; // Velocity penalty for retrograde orbits (against rotation)

  // PHASE 2: GRAVITATIONAL LENSING CONSTANTS
  readonly LENSING_STRENGTH = 0.5; // Strength of light bending effect
  readonly EINSTEIN_RING_RADIUS = 85; // Radius where lensing creates Einstein rings

  // Rendering Quality Settings
  readonly MAX_TRAIL_LENGTH = 20; // Trail history length (optimized for performance)
  readonly TRAIL_FADE_RATE = 0.08; // How quickly trails fade (exponential)
  readonly ENABLE_VOLUMETRIC_DISK = true; // Toggle 3D volumetric disk rendering

  constructor(container: HTMLDivElement) {
    this.container = container;
    if (!this.container) {
      console.warn("Container not found");
      return;
    }

    this.settings = this.detectCapabilities();

    if (!this.isWebGLAvailable()) {
      this.showFallback();
      return;
    }

    this.init();
    this.createStarField();
    this.createBlackHole();
    this.createPhotonSphere();
    this.createPhotonRing(); // PHASE 1: Separate photon ring visualization
    this.createAccretionDisk();
    this.createOuterBoundary();
    this.createParticles();
    this.addEventListeners();
    this.animate();
  }

  detectCapabilities() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      return { particleCount: 50, photonCount: 300, enableParallax: false, enableTrails: false };
    } else if (isMobile) {
      return { particleCount: 150, photonCount: 500, enableParallax: true, enableTrails: true };
    } else {
      return { particleCount: 300, photonCount: 800, enableParallax: true, enableTrails: true };
    }
  }

  isWebGLAvailable() {
    try {
      const canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  }

  showFallback() {
    console.log("WebGL not available, using fallback background");
    this.container.style.background =
      "radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a14 100%)";
  }

  // ============================================================================
  // PHASE 1: RELATIVISTIC PHYSICS HELPER FUNCTIONS
  // ============================================================================

  /**
   * Calculate Doppler shift factor based on velocity toward/away from observer
   * Returns a value from 0 (redshift) to 1 (blueshift)
   *
   * Formula: Observed frequency shifts based on relative velocity
   * - Approaching (v < 0): Blueshift (higher frequency, bluer color)
   * - Receding (v > 0): Redshift (lower frequency, redder color)
   */
  calculateDopplerShift(velocity: any, position: any): number {
    const THREE = window.THREE;

    // Vector from particle to camera
    const toCamera = new THREE.Vector3()
      .subVectors(this.camera.position, position)
      .normalize();

    // Velocity component toward camera (negative = approaching, positive = receding)
    const velocityTowardCamera = velocity.dot(toCamera);

    // Normalize by speed of light and apply artistic enhancement
    const beta = velocityTowardCamera / this.SPEED_OF_LIGHT;

    // Doppler factor: 0 = max redshift, 0.5 = no shift, 1 = max blueshift
    const dopplerFactor = 0.5 - (beta * this.DOPPLER_STRENGTH * 0.5);

    // Clamp to valid range
    return Math.max(0, Math.min(1, dopplerFactor));
  }

  /**
   * Calculate relativistic beaming (brightness enhancement)
   * Particles moving toward observer appear MUCH brighter
   *
   * Formula: Brightness ∝ (1 + β·cos(θ))^n where n = beaming power
   * This simulates the "headlight effect" in special relativity
   */
  calculateRelativisticBeaming(velocity: any, position: any): number {
    const THREE = window.THREE;

    // Vector from particle to camera
    const toCamera = new THREE.Vector3()
      .subVectors(this.camera.position, position)
      .normalize();

    // Velocity component toward camera
    const velocityTowardCamera = velocity.dot(toCamera);
    const beta = velocityTowardCamera / this.SPEED_OF_LIGHT;

    // Beaming factor: particles moving toward us are brighter
    // Using power law for dramatic effect
    const beaming = Math.pow(Math.max(0, 1.0 + beta), this.BEAMING_POWER);

    // Normalize to reasonable range (0.2 to 3.0)
    return Math.max(0.2, Math.min(3.0, beaming));
  }

  /**
   * Calculate gravitational redshift based on distance from black hole
   * Light loses energy climbing out of gravity well
   *
   * Formula: 1 + z = 1/√(1 - Rs/r)
   * Closer to event horizon = more redshift
   */
  calculateGravitationalRedshift(r: number): number {
    // Avoid division by zero near event horizon
    const safeR = Math.max(r, this.SCHWARZSCHILD_RADIUS * 1.01);

    // Gravitational redshift factor
    const rs_over_r = this.SCHWARZSCHILD_RADIUS / safeR;
    const redshiftFactor = 1.0 / Math.sqrt(1.0 - rs_over_r);

    // Convert to 0-1 range (0 = no redshift, 1 = maximum redshift)
    const normalized = (redshiftFactor - 1.0) * this.GRAVITATIONAL_REDSHIFT_STRENGTH;

    return Math.max(0, Math.min(1, normalized));
  }

  /**
   * Combine all relativistic color effects
   * Returns HSL color values [hue, saturation, lightness]
   */
  calculateRelativisticColor(velocity: any, position: any, r: number): {
    hue: number;
    saturation: number;
    lightness: number;
    brightness: number;
  } {
    // Doppler shift (affects hue)
    const dopplerShift = this.calculateDopplerShift(velocity, position);

    // Gravitational redshift (affects hue toward red)
    const gravRedshift = this.calculateGravitationalRedshift(r);

    // Relativistic beaming (affects brightness)
    const beaming = this.calculateRelativisticBeaming(velocity, position);

    // Base hue from temperature (inner = hotter = bluer)
    const heatFactor = 1 - Math.max(0, (r - this.SCHWARZSCHILD_RADIUS) / 200);
    const baseHue = 0.15 - heatFactor * 0.15; // Orange to yellow

    // Apply Doppler shift to hue
    // dopplerShift: 0 = red (receding), 0.5 = neutral, 1 = blue (approaching)
    const dopplerHueShift = (dopplerShift - 0.5) * 0.4; // -0.2 to +0.2
    const finalHue = baseHue + dopplerHueShift - gravRedshift * 0.1;

    // Saturation (always high for vivid colors)
    const saturation = 1.0;

    // Lightness affected by heat and Doppler
    const lightness = 0.5 + heatFactor * 0.3 + (dopplerShift - 0.5) * 0.2;

    return {
      hue: finalHue,
      saturation: saturation,
      lightness: Math.max(0.2, Math.min(0.9, lightness)),
      brightness: beaming
    };
  }

  init() {
    const THREE = window.THREE;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0002);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.offsetWidth / this.container.offsetHeight,
      0.1,
      3000
    );
    this.camera.position.set(0, 200, 600);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.top = "0";
    this.renderer.domElement.style.left = "0";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.zIndex = "1";
    this.container.appendChild(this.renderer.domElement);
  }

  createStarField() {
    const THREE = window.THREE;
    const starCount = 5000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Distribute stars in a sphere
      const radius = 1500 + Math.random() * 1000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Star colors (white to blue-white)
      const color = 0.8 + Math.random() * 0.2;
      colors[i * 3] = color;
      colors[i * 3 + 1] = color;
      colors[i * 3 + 2] = 1;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // ========================================================================
    // PHASE 2: ADVANCED GRAVITATIONAL LENSING SHADER
    // ========================================================================
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        blackHolePos: { value: new THREE.Vector3(0, 0, 0) },
        lensStrength: { value: this.LENSING_STRENGTH },
        schwarzschildRadius: { value: this.SCHWARZSCHILD_RADIUS },
        einsteinRingRadius: { value: this.EINSTEIN_RING_RADIUS },
      },
      vertexShader: `
        uniform float time;
        uniform vec3 blackHolePos;
        uniform float lensStrength;
        uniform float schwarzschildRadius;
        uniform float einsteinRingRadius;

        attribute vec3 color;
        varying vec3 vColor;
        varying float vLensEffect;
        varying float vEinsteinRing;

        void main() {
          vColor = color;

          // ===== PHASE 2: ADVANCED GRAVITATIONAL LENSING =====

          // Calculate distance to black hole
          vec3 worldPos = position;
          float dist = distance(worldPos, blackHolePos);

          // Schwarzschild deflection angle: θ ≈ 4GM/rc² ≈ 2Rs/r
          // Stronger near event horizon, creates Einstein rings
          float deflectionFactor = schwarzschildRadius / max(dist, schwarzschildRadius * 1.5);

          // Direction from black hole to star
          vec3 toBH = normalize(blackHolePos - worldPos);

          // Apply gravitational lensing (light bending)
          // Stars directly behind BH get bent into rings
          float lensingAmount = lensStrength * deflectionFactor * 1500.0;
          vec3 bentPos = worldPos + toBH * lensingAmount;

          // Einstein ring detection (stars at specific radius get MUCH brighter)
          float distFromEinsteinRing = abs(dist - einsteinRingRadius);
          float einsteinRingEffect = exp(-distFromEinsteinRing * distFromEinsteinRing * 0.002);
          vEinsteinRing = einsteinRingEffect;

          // Magnification from lensing (brighter when strongly bent)
          // μ = (u² + 2)/(u√(u² + 4)) where u = impact parameter
          float magnification = 1.0 + deflectionFactor * 3.0 + einsteinRingEffect * 4.0;
          vLensEffect = magnification;

          // Transform to screen space
          vec4 mvPosition = modelViewMatrix * vec4(bentPos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Twinkle effect (subtle)
          float twinkle = sin(time * 2.0 + position.x * 0.1) * 0.3 + 0.7;

          // Size increases with lensing (stars appear bigger when magnified)
          gl_PointSize = 2.0 * twinkle * (1.0 + deflectionFactor * 2.0 + einsteinRingEffect * 3.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vLensEffect;
        varying float vEinsteinRing;

        void main() {
          // Circular point with soft edges
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          // Gaussian falloff for soft glow
          float alpha = exp(-dist * dist * 4.0);

          // Base color with lensing magnification
          vec3 color = vColor * vLensEffect;

          // Einstein ring stars are BRILLIANT blue-white (gravitational focusing)
          if (vEinsteinRing > 0.1) {
            color = mix(color, vec3(1.0, 1.0, 1.2), vEinsteinRing * 0.8);
          }

          // Enhanced opacity for Einstein ring
          float finalAlpha = alpha * (0.6 + vEinsteinRing * 0.4);

          gl_FragColor = vec4(color, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  createBlackHole() {
    const THREE = window.THREE;

    // Event horizon (black sphere with enhanced shader)
    const eventHorizonGeometry = new THREE.SphereGeometry(this.SCHWARZSCHILD_RADIUS, 64, 64);
    const eventHorizonMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vViewPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vViewPosition;

        void main() {
          // Enhanced event horizon with subtle distortion
          vec3 viewDirection = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 3.0);

          // Subtle gravitational distortion pattern
          float distortion = sin(vPosition.x * 0.1 + time) *
                           cos(vPosition.y * 0.1 - time) * 0.5 + 0.5;

          // Deep purple/blue edge glow (Hawking radiation)
          vec3 edgeGlow = vec3(0.2, 0.1, 0.4) * fresnel * (0.3 + distortion * 0.2);

          gl_FragColor = vec4(edgeGlow, 1.0);
        }
      `,
    });

    this.blackHole = new THREE.Mesh(eventHorizonGeometry, eventHorizonMaterial);
    this.scene.add(this.blackHole);
  }

  createPhotonSphere() {
    const THREE = window.THREE;
    const photonCount = this.settings.photonCount;

    // Create instanced mesh for thousands of photons
    const photonGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const photonMesh = new THREE.InstancedMesh(
      photonGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      }),
      photonCount
    );

    // Initialize photon positions and orbital data
    const photonData = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < photonCount; i++) {
      // Distribute photons in multiple orbital rings at different inclinations
      const orbitIndex = Math.floor(Math.random() * 5); // 5 different orbital planes
      const inclination = (orbitIndex * Math.PI) / 5;
      const angle = Math.random() * Math.PI * 2;

      // Vary radius slightly around photon sphere
      const radiusVariation = this.PHOTON_SPHERE_RADIUS + (Math.random() - 0.5) * 10;

      // Calculate 3D position with inclination
      const x = radiusVariation * Math.cos(angle) * Math.cos(inclination);
      const y = radiusVariation * Math.sin(inclination);
      const z = radiusVariation * Math.sin(angle) * Math.cos(inclination);

      dummy.position.set(x, y, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      photonMesh.setMatrixAt(i, dummy.matrix);

      // Store orbital parameters
      photonData.push({
        angle: angle,
        inclination: inclination,
        radius: radiusVariation,
        speed: 0.02 + Math.random() * 0.02, // Orbital speed
        phase: Math.random() * Math.PI * 2, // For pulsing effect
      });
    }

    photonMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(photonMesh);

    // Store for animation
    this.photonSphere = {
      mesh: photonMesh,
      data: photonData,
      dummy: dummy,
    };
  }

  // ============================================================================
  // PHASE 1: PHOTON RING - THE ICONIC BLACK HOLE FEATURE
  // ============================================================================
  createPhotonRing() {
    const THREE = window.THREE;

    // Create a thin, bright ring at exactly 1.5 * Schwarzschild radius
    // This is where photons can orbit the black hole in unstable circular orbits
    const ringGeometry = new THREE.RingGeometry(
      this.PHOTON_SPHERE_RADIUS - 2,  // Inner radius (slightly inside)
      this.PHOTON_SPHERE_RADIUS + 2,  // Outer radius (slightly outside)
      128,  // High segment count for smooth circle
      1     // Only 1 radial segment (thin ring)
    );

    // Advanced shader for realistic photon ring glow
    const ringMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        glowIntensity: { value: 2.5 },
        ringColor: { value: new THREE.Color(0.4, 0.7, 1.0) }, // Bright cyan-blue
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float glowIntensity;
        uniform vec3 ringColor;

        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;

        void main() {
          // Distance from center of ring (0 = inner edge, 1 = outer edge)
          float radialDist = abs(vUv.x - 0.5) * 2.0;

          // Soft edges with Gaussian-like falloff
          float edgeFalloff = exp(-radialDist * radialDist * 8.0);

          // Pulsing glow effect (subtle breathing)
          float pulse = 0.8 + sin(time * 2.0) * 0.2;

          // Shimmering effect (photons orbiting at different speeds)
          float angle = atan(vPosition.z, vPosition.x);
          float shimmer = sin(angle * 20.0 - time * 5.0) * 0.15 + 0.85;

          // Final color with intense glow
          vec3 finalColor = ringColor * glowIntensity * pulse * shimmer;

          // Opacity with soft edges
          float opacity = edgeFalloff * 0.9;

          gl_FragColor = vec4(finalColor, opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.photonRing = new THREE.Mesh(ringGeometry, ringMaterial);

    // Orient ring to match accretion disk tilt
    this.photonRing.rotation.x = -Math.PI / 2.5;

    this.scene.add(this.photonRing);
  }

  // ============================================================================
  // PHASE 1: PHOTOREALISTIC ACCRETION DISK WITH DOPPLER SHIFT
  // ============================================================================
  createAccretionDisk() {
    const THREE = window.THREE;

    const diskGeometry = new THREE.RingGeometry(this.ISCO_RADIUS, 250, 128);
    const diskMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        cameraPosition: { value: new THREE.Vector3() },
        rotationSpeed: { value: 0.02 }, // Disk rotation for Doppler calculation
        schwarzschildRadius: { value: this.SCHWARZSCHILD_RADIUS },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        void main() {
          vUv = uv;
          vPosition = position;

          // World position for velocity calculations
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 cameraPosition;
        uniform float rotationSpeed;
        uniform float schwarzschildRadius;

        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center) * 2.0;

          // ===== PHASE 1: DOPPLER SHIFT & RELATIVISTIC BEAMING =====

          // Calculate angle and radius in world space
          float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
          float radius = length(vWorldPosition.xz);

          // Orbital velocity (Keplerian) - decreases with radius
          // v ∝ 1/sqrt(r) for Keplerian orbits
          float orbitalVelocity = rotationSpeed * 200.0 / sqrt(radius + 1.0);

          // Velocity vector (tangent to orbit)
          vec3 velocityDirection = normalize(vec3(-sin(angle + time * rotationSpeed), 0.0, cos(angle + time * rotationSpeed)));
          vec3 velocity = velocityDirection * orbitalVelocity;

          // Vector from disk to camera
          vec3 toCamera = normalize(cameraPosition - vWorldPosition);

          // Doppler factor: velocity component toward camera
          float velocityTowardCamera = dot(velocity, toCamera);
          float beta = velocityTowardCamera / 30.0; // Normalized by speed of light

          // Doppler shift: approaching = blue, receding = red
          // dopplerFactor: 0 = max redshift, 0.5 = no shift, 1 = max blueshift
          float dopplerFactor = 0.5 - beta * 1.2; // Artistic enhancement
          dopplerFactor = clamp(dopplerFactor, 0.0, 1.0);

          // Relativistic beaming: approaching side is MUCH brighter
          float beaming = pow(max(0.0, 1.0 + beta), 3.0);
          beaming = clamp(beaming, 0.2, 3.0);

          // ===== TEMPERATURE GRADIENT WITH DOPPLER SHIFT =====

          // Base temperature colors (inner = hotter)
          vec3 innerColor = vec3(0.6, 0.8, 1.0);  // Hot blue-white
          vec3 midColor = vec3(1.0, 0.9, 0.6);    // Yellow
          vec3 outerColor = vec3(1.0, 0.3, 0.1);  // Cool red-orange

          // Temperature gradient by distance
          vec3 tempColor = mix(innerColor, midColor, smoothstep(0.0, 0.5, dist));
          tempColor = mix(tempColor, outerColor, smoothstep(0.5, 1.0, dist));

          // Apply Doppler shift to color
          vec3 blueShift = vec3(0.3, 0.7, 1.0);   // Bluer (approaching)
          vec3 redShift = vec3(1.0, 0.4, 0.1);    // Redder (receding)

          vec3 dopplerColor = mix(redShift, blueShift, dopplerFactor);
          vec3 finalColor = mix(tempColor, dopplerColor, 0.5); // Blend temperature + Doppler

          // ===== TURBULENCE & STRUCTURE =====

          // Spiral pattern
          float spiral = sin(angle * 8.0 - dist * 5.0 + time * 2.0);
          float turbulence = sin(angle * 20.0 + time * 3.0) * cos(dist * 15.0 - time * 2.0);

          // Add turbulence variation
          finalColor += vec3(spiral * 0.15 + turbulence * 0.08);

          // ===== RELATIVISTIC BEAMING (BRIGHTNESS) =====

          // Approaching side appears MUCH brighter (like real black hole images!)
          finalColor *= beaming;

          // ===== OPACITY =====

          // Opacity decreases with distance and varies with turbulence
          float opacity = (1.0 - dist) * 0.7;
          opacity *= (0.5 + spiral * 0.2 + abs(turbulence) * 0.2);

          // Brighter regions (beaming) are more visible
          opacity *= (0.5 + beaming * 0.5);

          gl_FragColor = vec4(finalColor, opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
    this.accretionDisk.rotation.x = -Math.PI / 2.5; // Tilt for better view
    this.scene.add(this.accretionDisk);
  }

  createOuterBoundary() {
    const THREE = window.THREE;

    // Create a torus boundary (donut shape) - particles orbit within this structure
    const boundaryGeometry = new THREE.TorusGeometry(
      this.TORUS_MAJOR_RADIUS,  // Major radius
      this.TORUS_MINOR_RADIUS,  // Minor radius (tube thickness)
      32,  // Radial segments
      64   // Tubular segments
    );

    const boundaryMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        void main() {
          // Create flowing energy patterns around the torus
          float angle = atan(vWorldPosition.z, vWorldPosition.x);
          float flow = sin(angle * 8.0 + time * 2.0) * 0.5 + 0.5;

          // Pulsing grid along the tube
          float tubePattern = sin(vPosition.y * 0.1 + time) *
                             cos(angle * 4.0 - time * 1.5) * 0.5 + 0.5;

          // Dark matter purple/blue with flowing energy
          vec3 boundaryColor = mix(
            vec3(0.3, 0.1, 0.7),  // Deep purple
            vec3(0.5, 0.3, 0.9),  // Lighter purple
            flow
          );

          // Fresnel effect for ethereal glow
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 2.5);

          // Combine effects
          float alpha = fresnel * 0.2 + tubePattern * 0.08 + flow * 0.05;

          gl_FragColor = vec4(boundaryColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.outerBoundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    // Rotate torus to align with accretion disk
    this.outerBoundary.rotation.x = Math.PI / 2;
    this.scene.add(this.outerBoundary);
  }

  createParticles() {
    const THREE = window.THREE;
    const particleCount = this.settings.particleCount;

    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(1.5, 4, 4); // Minimal geometry for performance
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.1 + Math.random() * 0.1, 1, 0.6),
        transparent: true,
        opacity: 0.8,
      });

      const particle = new THREE.Mesh(geometry, material);

      // PROPER 3D SPHERICAL COORDINATES for black hole physics
      const r = this.ISCO_RADIUS + Math.random() * 120; // radial distance
      const theta = Math.acos(2 * Math.random() - 1); // polar angle (0 to PI) - fully 3D!
      const phi = Math.random() * Math.PI * 2; // azimuthal angle (0 to 2PI)

      // Most particles in disk, but some in inclined orbits for 3D effect
      const diskBias = Math.random();
      const finalTheta = diskBias < 0.7
        ? Math.PI / 2 + (Math.random() - 0.5) * 0.3  // 70% near equatorial plane
        : theta; // 30% in fully 3D orbits

      // Convert spherical to Cartesian
      particle.position.set(
        r * Math.sin(finalTheta) * Math.cos(phi),
        r * Math.cos(finalTheta),
        r * Math.sin(finalTheta) * Math.sin(phi)
      );

      // Calculate orbital velocity for circular orbit (Kepler) - PROPER orbital mechanics!
      const orbitalSpeed = Math.sqrt(this.G / r) * 0.9; // 90% of perfect circular orbit for stable spin!

      // Store 3D spherical orbital data
      particle.userData = {
        r: r,                    // radial distance
        theta: finalTheta,       // polar angle
        phi: phi,                // azimuthal angle
        vr: (Math.random() - 0.5) * 0.1,  // Minimal radial motion for stability
        vtheta: (Math.random() - 0.5) * 0.01, // Minimal polar motion
        vphi: orbitalSpeed / r,  // angular velocity (circular orbit) - PROPER!
        L: r * orbitalSpeed,     // angular momentum (conserved) - STABLE!
        lastPositions: [],       // For trails
      };

      this.particles.push(particle);
      this.scene.add(particle);

      // ========================================================================
      // PHASE 1: GPU-ACCELERATED TRAIL SYSTEM
      // ========================================================================
      if (this.settings.enableTrails) {
        const trailGeometry = new THREE.BufferGeometry();

        // Custom shader material for advanced trail effects
        const trailMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            trailColor: { value: new THREE.Color(0x66ccff) },
            opacity: { value: 1.0 },
            brightness: { value: 1.0 }, // Relativistic beaming
          },
          vertexShader: `
            // Trail vertex shader with motion blur
            attribute float trailAge; // Age of each trail segment (0 = newest, 1 = oldest)

            varying float vAge;
            varying vec3 vPosition;

            void main() {
              vAge = trailAge;
              vPosition = position;

              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            // Trail fragment shader with exponential fade and glow
            uniform vec3 trailColor;
            uniform float opacity;
            uniform float brightness;

            varying float vAge;
            varying vec3 vPosition;

            void main() {
              // Exponential fade with age (newer segments brighter)
              float ageFade = exp(-vAge * 5.0); // Faster fade for dramatic effect

              // Apply brightness from relativistic beaming
              vec3 finalColor = trailColor * brightness;

              // Soft glow effect (volumetric appearance)
              float glowIntensity = ageFade * 0.8;

              // Final opacity with fade
              float finalOpacity = opacity * ageFade;

              gl_FragColor = vec4(finalColor, finalOpacity);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          linewidth: 2,
        });

        const trail = new THREE.Line(trailGeometry, trailMaterial);
        this.particleTrails.push(trail);
        this.scene.add(trail);
      }
    }
  }

  updateParticlePhysics(particle: any, deltaTime: number) {
    const data = particle.userData;
    const THREE = window.THREE;

    // PROPER 3D SPHERICAL PHYSICS FOR BLACK HOLES
    const r = data.r;
    const theta = data.theta;
    const phi = data.phi;

    // Gravitational acceleration (inverse square law)
    let ar = -this.G / (r * r) + (data.L * data.L) / (r * r * r); // includes centrifugal term

    // Check orbital zones
    const inPhotonSphere = Math.abs(r - this.PHOTON_SPHERE_RADIUS) < 15;
    const inPlungeZone = r < this.ISCO_RADIUS;

    // 3D ATTRACTION TO ISCO BOUNDARY (Inner Accretion Disk)
    // GENTLE attraction towards ISCO for disk formation
    const distanceFromISCO = r - this.ISCO_RADIUS;
    const iscoAttractionStrength = 500; // Very gentle for stable orbits
    const iscoAttraction = -iscoAttractionStrength * distanceFromISCO / (r * r);
    ar += iscoAttraction;

    // ========================================================================
    // PHASE 2: KERR METRIC - ROTATING BLACK HOLE PHYSICS
    // ========================================================================

    // Detect if particle is in ergosphere (region where spacetime itself rotates)
    const inErgosphere = r < this.ERGOSPHERE_RADIUS;

    // Determine if orbit is prograde (with rotation) or retrograde (against rotation)
    // BH rotates counterclockwise (positive phi direction), so positive vphi = prograde
    const isPrograde = data.vphi > 0;

    // ENHANCED FRAME DRAGGING for Kerr black holes
    // Frame dragging is MUCH stronger in Kerr metric, especially in ergosphere
    const frameDraggingRadius = this.ERGOSPHERE_RADIUS * 1.5;
    if (r < frameDraggingRadius) {
      const frameDragFactor = 1.0 - (r / frameDraggingRadius);

      // Kerr frame dragging is stronger than Schwarzschild
      const kerrFrameDragAccel = this.KERR_FRAME_DRAGGING * frameDragFactor / (r * 0.5);

      // Inside ergosphere, ALL particles must co-rotate (cannot stand still!)
      if (inErgosphere) {
        // Force co-rotation - particles MUST move with the black hole
        const minimumRotation = 0.02 * (1.0 - r / this.ERGOSPHERE_RADIUS);
        if (data.vphi < minimumRotation) {
          data.vphi = minimumRotation; // Can't move slower than spacetime itself!
        }
        // Extra strong frame dragging in ergosphere
        data.vphi += kerrFrameDragAccel * deltaTime * 2.0;
      } else {
        // Normal frame dragging outside ergosphere
        data.vphi += kerrFrameDragAccel * deltaTime;
      }
    }

    // PROGRADE VS RETROGRADE ORBITAL DYNAMICS
    // Prograde orbits (with rotation) are faster and more stable (Penrose process)
    // Retrograde orbits (against rotation) are slower and less stable
    if (isPrograde) {
      // Prograde boost: orbital velocity increases slightly
      data.vphi *= this.PROGRADE_BOOST * (1.0 + frameDragFactor * 0.1);

      // Prograde particles can orbit closer (inner edge moves inward)
      // This simulates the prograde ISCO being at 1 Rs vs 9 Rs for retrograde
    } else {
      // Retrograde penalty: orbital velocity decreases
      data.vphi *= this.RETROGRADE_PENALTY;

      // Retrograde orbits are less stable - add wobble
      data.vr += (Math.random() - 0.5) * 0.05 * frameDragFactor;
    }

    // Store orbital type for rendering
    data.isPrograde = isPrograde;
    data.inErgosphere = inErgosphere;

    // TORUS BOUNDARY REPULSION
    // Calculate distance from particle to nearest point on torus surface
    // Torus is in XZ plane (y=0), major radius from origin, minor radius is tube thickness
    const torusDistXZ = Math.sqrt(data.r * data.r * Math.sin(data.theta) * Math.sin(data.theta));
    const distanceFromTorusCenter = torusDistXZ - this.TORUS_MAJOR_RADIUS;
    const heightAbovePlane = data.r * Math.cos(data.theta);

    // Distance from particle to torus surface
    const distToTorusSurface = Math.sqrt(
      distanceFromTorusCenter * distanceFromTorusCenter +
      heightAbovePlane * heightAbovePlane
    ) - this.TORUS_MINOR_RADIUS;

    // Apply repulsion when approaching or outside torus boundary
    if (distToTorusSurface > -this.TORUS_MINOR_RADIUS * 0.3) {
      const repulsionStrength = 12000;
      const repulsionFactor = Math.max(0, distToTorusSurface + this.TORUS_MINOR_RADIUS * 0.3);

      // Push particle back toward safe zone (torus interior)
      if (distToTorusSurface > 0) {
        // Outside torus - strong repulsion
        const repulsion = -repulsionStrength * repulsionFactor * 2.0 / (r * r);
        ar += repulsion;
      } else {
        // Approaching boundary - gentle push
        const gentleRepulsion = -repulsionStrength * repulsionFactor * 0.5 / (r * r);
        ar += gentleRepulsion;
      }
    }

    // Update velocities
    if (inPhotonSphere) {
      // Photon sphere - highly unstable
      data.vr += ar * deltaTime * 3 + (Math.random() - 0.5) * 0.3;
      data.inPhotonSphere = true;
    } else if (inPlungeZone) {
      // Inside ISCO - rapid infall
      data.vr += ar * deltaTime * 2;
      data.inPhotonSphere = false;
    } else {
      // Stable zone - VERY gradual changes for stable orbits
      data.vr += ar * deltaTime * 0.02; // Reduced from 0.08 for stability
      data.inPhotonSphere = false;
    }

    // Update positions in spherical coordinates
    data.r += data.vr * deltaTime;
    data.theta += data.vtheta * deltaTime;
    data.phi += data.vphi * deltaTime;

    // Conservation of angular momentum: L = r² * vphi
    data.vphi = data.L / (data.r * data.r);

    // Damping for radial velocity to help settle into circular orbits
    if (!inPhotonSphere && !inPlungeZone) {
      data.vr *= 0.98; // Slowly damp radial velocity in stable zone
    }

    // Gravitational precession - particles in disk tend toward equator
    if (Math.abs(data.theta - Math.PI / 2) > 0.01) {
      const toEquator = (Math.PI / 2 - data.theta) * 0.02;
      data.vtheta = toEquator;
    } else {
      data.vtheta *= 0.95; // damping
    }

    // Convert spherical to Cartesian for rendering
    const sinTheta = Math.sin(data.theta);
    const cosTheta = Math.cos(data.theta);
    const sinPhi = Math.sin(data.phi);
    const cosPhi = Math.cos(data.phi);

    const newPos = new THREE.Vector3(
      data.r * sinTheta * cosPhi,
      data.r * cosTheta,
      data.r * sinTheta * sinPhi
    );

    particle.position.copy(newPos);

    // Track positions for trails
    if (!data.lastPositions) data.lastPositions = [];
    data.lastPositions.push(newPos.clone());
    if (data.lastPositions.length > this.MAX_TRAIL_LENGTH) {
      data.lastPositions.shift(); // Keep last N positions for performance
    }

    // ========================================================================
    // PHASE 1: ADVANCED RELATIVISTIC COLOR & BRIGHTNESS EFFECTS
    // ========================================================================

    // Calculate velocity vector in Cartesian coordinates
    const velocityCartesian = new THREE.Vector3(
      data.vr * sinTheta * cosPhi - data.r * data.vtheta * cosTheta * cosPhi - data.r * sinTheta * data.vphi * sinPhi,
      data.vr * cosTheta + data.r * data.vtheta * sinTheta,
      data.vr * sinTheta * sinPhi - data.r * data.vtheta * cosTheta * sinPhi + data.r * sinTheta * data.vphi * cosPhi
    );

    // Calculate total velocity magnitude for reference
    const vTotal = velocityCartesian.length();
    const speedFactor = Math.min(vTotal / this.SPEED_OF_LIGHT, 1.0);

    // Check orbital zones
    if (data.inPhotonSphere) {
      // ===== PHOTON SPHERE - SPECIAL CASE =====
      // Photons orbit at exactly c - intense blueshift and brightness
      particle.material.color.setHSL(0.55, 1.0, 0.85);
      particle.material.opacity = 0.98;
      particle.scale.set(2.5, 2.5, 2.5);
    } else {
      // ===== NORMAL PARTICLES - FULL RELATIVISTIC TREATMENT =====

      // Calculate all relativistic effects
      const relativisticColor = this.calculateRelativisticColor(
        velocityCartesian,
        newPos,
        data.r
      );

      // ===== PHASE 2: KERR METRIC VISUAL EFFECTS =====
      let finalHue = relativisticColor.hue;
      let finalLightness = relativisticColor.lightness;
      let finalBrightness = relativisticColor.brightness;

      // ERGOSPHERE PARTICLES - Distinctive purple/magenta glow
      if (data.inErgosphere) {
        // Ergosphere particles have purple tint (spacetime is being dragged!)
        finalHue = 0.8 + (finalHue - 0.8) * 0.3; // Shift toward magenta
        finalLightness = Math.min(0.9, finalLightness * 1.2); // Brighter
        finalBrightness *= 1.5; // Extra bright in ergosphere
      }

      // PROGRADE VS RETROGRADE COLOR DISTINCTION
      if (data.isPrograde) {
        // Prograde orbits: shift slightly bluer (efficient energy extraction)
        finalHue += 0.05;
      } else {
        // Retrograde orbits: shift slightly redder (less efficient)
        finalHue -= 0.05;
      }

      // Apply HSL color with all effects
      particle.material.color.setHSL(
        finalHue,
        relativisticColor.saturation,
        finalLightness
      );

      // Apply relativistic beaming to opacity (brighter when moving toward us)
      const baseOpacity = 0.5 + (1 - Math.max(0, (data.r - this.SCHWARZSCHILD_RADIUS) / 200)) * 0.4;
      particle.material.opacity = Math.min(1.0, baseOpacity * finalBrightness);

      // Scale based on velocity, beaming, and ergosphere
      let scaleMultiplier = 1.0 + speedFactor * 0.5 + (finalBrightness - 1.0) * 0.3;
      if (data.inErgosphere) {
        scaleMultiplier *= 1.3; // Ergosphere particles appear larger
      }
      particle.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier);

      // Store velocity for trail rendering
      data.velocity = velocityCartesian.clone();
      data.relativisticBrightness = finalBrightness;
    }

    // Recycle particles that cross event horizon
    if (data.r < this.SCHWARZSCHILD_RADIUS + 10) {
      data.r = this.ISCO_RADIUS + 50 + Math.random() * 100;
      data.phi = Math.random() * Math.PI * 2;

      // Mix of disk and 3D orbits
      const diskBias = Math.random();
      if (diskBias < 0.7) {
        data.theta = Math.PI / 2 + (Math.random() - 0.5) * 0.3; // disk
      } else {
        data.theta = Math.acos(2 * Math.random() - 1); // 3D
      }

      data.vr = (Math.random() - 0.5) * 0.1; // Minimal radial velocity for stability
      data.vtheta = (Math.random() - 0.5) * 0.01; // Minimal polar motion
      const orbitalSpeed = Math.sqrt(this.G / data.r) * 0.9; // Match initial orbital speed!
      data.vphi = orbitalSpeed / data.r;
      data.L = data.r * orbitalSpeed;
      data.lastPositions = []; // Reset trail
    }
  }

  // ============================================================================
  // PHASE 1: ENHANCED TRAIL RENDERING WITH MOTION BLUR & RELATIVISTIC EFFECTS
  // ============================================================================
  updateParticleTrail(particle: any, trailIndex: number) {
    const THREE = window.THREE;
    const trail = this.particleTrails[trailIndex];
    if (!trail) return;

    const positions = particle.userData.lastPositions;
    if (!positions || positions.length < 2) return;

    const data = particle.userData;

    // Convert positions to Vector3 array
    const points = positions.map((pos: any) => new THREE.Vector3(pos.x, pos.y, pos.z));

    // Create age attribute for each trail segment (0 = newest, 1 = oldest)
    const numPoints = points.length;
    const ages = new Float32Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
      ages[i] = i / (numPoints - 1); // 0 at newest, 1 at oldest
    }

    // Update geometry with positions and ages
    trail.geometry.setFromPoints(points);
    trail.geometry.setAttribute('trailAge', new THREE.BufferAttribute(ages, 1));
    trail.geometry.attributes.position.needsUpdate = true;

    // ===== PHASE 1: RELATIVISTIC TRAIL COLOR =====
    // Use stored velocity and brightness from particle
    const velocity = data.velocity || new THREE.Vector3();
    const brightness = data.relativisticBrightness || 1.0;

    // Calculate Doppler-shifted trail color
    const dopplerShift = this.calculateDopplerShift(velocity, particle.position);

    // Trail color based on Doppler shift
    // Approaching = blue, receding = orange-red
    const hue = 0.05 + dopplerShift * 0.5; // 0.05 (red-orange) to 0.55 (cyan-blue)
    const saturation = 1.0;
    const lightness = 0.5 + (dopplerShift - 0.5) * 0.3;

    const trailColor = new THREE.Color().setHSL(hue, saturation, lightness);

    // Update shader uniforms
    if (trail.material.uniforms) {
      trail.material.uniforms.trailColor.value = trailColor;
      trail.material.uniforms.brightness.value = brightness;
      trail.material.uniforms.opacity.value = 0.7 + (brightness - 1.0) * 0.2; // Brighter trails from beaming
      trail.material.uniforms.time.value = this.time;
    }
  }

  addEventListeners() {
    if (this.settings.enableParallax) {
      const handleMouseMove = (e: MouseEvent) => {
        this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
        this.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      document.addEventListener("mousemove", handleMouseMove);
    }

    const handleResize = () => this.onWindowResize();
    window.addEventListener("resize", handleResize, false);

    if ("ontouchstart" in window) {
      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) {
          this.mouse.targetX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
          this.mouse.targetY = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
        }
      };
      document.addEventListener("touchmove", handleTouchMove, { passive: true });
    }
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const deltaTime = 0.016;
    this.time += deltaTime;

    // Smooth mouse interpolation
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    // Camera parallax
    if (this.settings.enableParallax) {
      this.camera.position.x += (this.mouse.x * 100 - this.camera.position.x) * 0.05;
      this.camera.position.y += (-this.mouse.y * 100 + 200 - this.camera.position.y) * 0.05;
      this.camera.lookAt(0, 0, 0);
    }

    // Rotate black hole slowly (frame dragging effect)
    if (this.blackHole) {
      this.blackHole.rotation.y += 0.001;

      // Update shader uniforms
      if (this.blackHole.material.uniforms) {
        this.blackHole.material.uniforms.time.value = this.time;
      }
    }

    // Animate photon sphere
    if (this.photonSphere) {
      const { mesh, data, dummy } = this.photonSphere;
      const THREE = window.THREE;

      for (let i = 0; i < data.length; i++) {
        const photon = data[i];

        // Update orbital position
        photon.angle += photon.speed;
        photon.phase += 0.05;

        // Calculate 3D position with slight wobble
        const wobble = Math.sin(photon.phase) * 2;
        const x = (photon.radius + wobble) * Math.cos(photon.angle) * Math.cos(photon.inclination);
        const y = (photon.radius + wobble) * Math.sin(photon.inclination);
        const z = (photon.radius + wobble) * Math.sin(photon.angle) * Math.cos(photon.inclination);

        dummy.position.set(x, y, z);

        // Pulsing scale effect
        const pulse = 0.8 + Math.sin(photon.phase) * 0.4;
        dummy.scale.set(pulse, pulse, pulse);

        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
    }

    // PHASE 1: Animate photon ring
    if (this.photonRing && this.photonRing.material.uniforms) {
      // Slowly rotate the shimmer effect
      this.photonRing.material.uniforms.time.value = this.time;
      // Very slow counter-rotation for visual interest
      this.photonRing.rotation.z += 0.0008;
    }

    // Rotate accretion disk (differential rotation - inner faster than outer)
    if (this.accretionDisk) {
      this.accretionDisk.rotation.z += 0.003;
      if (this.accretionDisk.material.uniforms) {
        this.accretionDisk.material.uniforms.time.value = this.time;
        // PHASE 1: Update camera position for Doppler shift calculation
        this.accretionDisk.material.uniforms.cameraPosition.value.copy(this.camera.position);
      }
    }

    // Update outer boundary shader
    if (this.outerBoundary) {
      this.outerBoundary.rotation.y += 0.0005; // Slow rotation
      if (this.outerBoundary.material.uniforms) {
        this.outerBoundary.material.uniforms.time.value = this.time;
      }
    }

    // Update star field with gravitational lensing
    if (this.starField && this.starField.material.uniforms) {
      this.starField.material.uniforms.time.value = this.time;
    }

    // Animate particles with realistic physics
    this.particles.forEach((particle, index) => {
      this.updateParticlePhysics(particle, deltaTime);

      if (this.settings.enableTrails && this.particleTrails[index]) {
        this.updateParticleTrail(particle, index);
      }
    });

    // Gentle star field rotation
    if (this.starField) {
      this.starField.rotation.y += 0.0001;
    }

    this.renderer.render(this.scene, this.camera);
  }

  setGravity(value: number) {
    // Value from 0-100, map to 0.2x - 2x of base gravity
    this.G = this.G_BASE * (0.2 + (value / 100) * 1.8);
  }

  destroy() {
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container && this.renderer.domElement) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
  }
}
