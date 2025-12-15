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
    const threeScript = document.createElement("script");
    threeScript.src = "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js";
    threeScript.async = true;

    threeScript.onload = () => {
      if (containerRef.current && window.THREE) {
        blackHoleRef.current = new BlackHoleEffect(containerRef.current);
      }
    };

    document.head.appendChild(threeScript);

    return () => {
      if (blackHoleRef.current && blackHoleRef.current.destroy) {
        blackHoleRef.current.destroy();
      }
      // Clean up script
      const existingThree = document.querySelector(`script[src="${threeScript.src}"]`);
      if (existingThree) document.head.removeChild(existingThree);
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
  controls: any; // Custom camera controls
  raycaster: any; // For click detection
  settings: any;

  // Interactive mode settings
  interactiveMode: boolean = true;
  enableParticleSpawning: boolean = true;

  // Camera control state
  cameraState: any = {
    isDragging: false,
    isRightDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    azimuth: 0, // Horizontal rotation
    elevation: Math.PI / 4, // Vertical angle
    distance: 600, // Distance from center
    targetAzimuth: 0,
    targetElevation: Math.PI / 4,
    targetDistance: 600,
  };

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

  // ENHANCED PHYSICS CONSTANTS
  readonly PARTICLE_COUNT = 10000; // Dense accretion disk
  readonly COAGULATION_RADIUS = 8.0; // Distance at which particles begin to clump
  readonly COAGULATION_STRENGTH = 0.15; // How strongly particles attract each other
  readonly TURBULENCE_SCALE = 0.3; // Amplitude of turbulent eddies
  readonly TURBULENCE_FREQUENCY = 0.5; // Frequency of turbulent variations
  readonly VISCOSITY = 0.98; // Momentum dissipation (0.98 = 2% loss per frame)
  readonly MIN_SAFE_RADIUS = 65; // Minimum safe distance (1.08 * Rs) - avoids singularity
  readonly MAX_GRAVITATIONAL_FORCE = 500; // Clamp maximum force to avoid infinities

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
    this.setupInteractiveControls();
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

    // Setup raycaster for click detection
    this.raycaster = new THREE.Raycaster();
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

    // Create instanced mesh for thousands of photons with ENHANCED SHADER
    const photonGeometry = new THREE.SphereGeometry(0.8, 12, 12); // Slightly larger, higher quality

    // Custom shader material for photons with realistic light behavior
    const photonMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        photonSphereRadius: { value: this.PHOTON_SPHERE_RADIUS },
      },
      vertexShader: `
        uniform float time;
        uniform float photonSphereRadius;

        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vSpeed; // Orbital speed affects color
        varying float vGlow;  // Glow intensity

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;

          // Calculate position in world space to determine orbital speed
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          float distFromCenter = length(worldPos.xyz);

          // Photons at photon sphere orbit at speed of light (c)
          // Slight variations create interesting visual effects
          float orbitalPhase = atan(worldPos.z, worldPos.x) + time * 0.5;
          vSpeed = 0.5 + sin(orbitalPhase * 10.0) * 0.5; // 0 to 1

          // Glow varies with position in orbit (simulates brightness variation)
          float heightFactor = abs(worldPos.y) / photonSphereRadius;
          vGlow = 1.0 + sin(orbitalPhase * 5.0 + time * 2.0) * 0.3 + heightFactor * 0.2;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vSpeed;
        varying float vGlow;

        void main() {
          // View direction for Fresnel glow
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 2.5);

          // Color shift based on speed (Doppler-like effect)
          // Fast = blue, slow = cyan-white
          vec3 baseColor = mix(
            vec3(0.4, 0.8, 1.0),  // Cyan (slower)
            vec3(0.6, 0.9, 1.0),  // Bright cyan-white (faster)
            vSpeed
          );

          // Add intense glow at edges (photons are pure light!)
          vec3 glowColor = baseColor * (1.0 + fresnel * 3.0);

          // Apply glow variation from orbit position
          glowColor *= vGlow;

          // Core brightness with edge glow
          float coreBrightness = 0.6 + fresnel * 0.4;
          vec3 finalColor = glowColor * (coreBrightness + vSpeed * 0.3);

          // Opacity: bright core with glowing edges
          float alpha = 0.7 + fresnel * 0.3;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const photonMesh = new THREE.InstancedMesh(
      photonGeometry,
      photonMaterial,
      photonCount
    );

    // Initialize photon positions and orbital data
    const photonData = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < photonCount; i++) {
      // ENHANCED: Create multiple "families" of photon orbits
      // Each family has its own orbital plane, creating beautiful 3D structure
      const familyCount = 8; // 8 distinct orbital families
      const familyId = i % familyCount;

      // Base inclination for this family
      const familyInclination = (familyId * Math.PI) / familyCount;

      // Add variation within family for more natural look
      const inclinationVariation = (Math.random() - 0.5) * 0.2;
      const inclination = familyInclination + inclinationVariation;

      // Angle around the orbit
      const angle = Math.random() * Math.PI * 2;

      // Vary radius slightly around photon sphere (unstable orbits have small variations)
      const radiusVariation = this.PHOTON_SPHERE_RADIUS + (Math.random() - 0.5) * 5;

      // Calculate 3D position using spherical coordinates
      // This creates proper 3D orbital rings
      const theta = Math.PI / 2 + Math.sin(inclination) * (Math.PI / 3); // Polar angle
      const phi = angle; // Azimuthal angle

      const x = radiusVariation * Math.sin(theta) * Math.cos(phi);
      const y = radiusVariation * Math.cos(theta);
      const z = radiusVariation * Math.sin(theta) * Math.sin(phi);

      dummy.position.set(x, y, z);

      // Scale varies slightly for visual interest
      const scaleVariation = 0.8 + Math.random() * 0.4;
      dummy.scale.set(scaleVariation, scaleVariation, scaleVariation);

      dummy.updateMatrix();
      photonMesh.setMatrixAt(i, dummy.matrix);

      // Store orbital parameters with enhanced data
      photonData.push({
        angle: angle,
        theta: theta,
        phi: phi,
        inclination: inclination,
        familyId: familyId,
        radius: radiusVariation,
        speed: 0.015 + Math.random() * 0.025, // Orbital speed (near speed of light!)
        phase: Math.random() * Math.PI * 2, // For pulsing effect
        shimmerPhase: Math.random() * Math.PI * 2, // Independent shimmer
        wobbleAmplitude: 1.0 + Math.random() * 2.0, // How much wobble
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

        void main() {
          vUv = uv;
          vPosition = position;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float glowIntensity;
        uniform vec3 ringColor;

        varying vec2 vUv;
        varying vec3 vPosition;

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
        // cameraPosition is built-in to Three.js - don't redefine it!
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
        // cameraPosition is built-in to Three.js shaders
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
        varying vec3 vWorldPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          // Create flowing energy patterns around the torus
          float angle = atan(vWorldPosition.z, vWorldPosition.x);
          float flow = sin(angle * 8.0 + time * 2.0) * 0.5 + 0.5;

          // Pulsing grid along the tube (using world position y-component)
          float tubePattern = sin(vWorldPosition.y * 0.1 + time) *
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
    const particleCount = this.PARTICLE_COUNT; // 10,000 particles!

    console.log(`🌌 Creating ${particleCount} particles for accretion disk...`);

    // ========================================================================
    // EFFICIENT BUFFER GEOMETRY FOR 10,000 1PX PARTICLES
    // ========================================================================
    const geometry = new THREE.BufferGeometry();

    // Typed arrays for particle attributes (much faster than objects)
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);

    // Particle physics data (stored separately for fast updates)
    const particleData = {
      // Spherical coordinates
      r: new Float32Array(particleCount),
      theta: new Float32Array(particleCount),
      phi: new Float32Array(particleCount),
      vr: new Float32Array(particleCount),
      vtheta: new Float32Array(particleCount),
      vphi: new Float32Array(particleCount),

      // Cartesian coordinates
      x: new Float32Array(particleCount),
      y: new Float32Array(particleCount),
      z: new Float32Array(particleCount),
      vx: new Float32Array(particleCount),
      vy: new Float32Array(particleCount),
      vz: new Float32Array(particleCount),

      // Physics properties
      L: new Float32Array(particleCount), // Angular momentum
      mass: new Float32Array(particleCount), // Particle mass (for coagulation)
      temperature: new Float32Array(particleCount), // Temperature (affects color)
      age: new Float32Array(particleCount), // Lifetime tracking
      lifetime: new Float32Array(particleCount),

      // Orbital classification
      orbitType: new Uint8Array(particleCount), // 0=equatorial, 1=inclined, 2=polar
    };

    // Initialize all particles
    for (let i = 0; i < particleCount; i++) {
      // ========================================================================
      // INITIAL POSITION: Primarily in accretion disk
      // ========================================================================
      const r = this.ISCO_RADIUS + Math.random() * 100;

      // 90% in disk, 10% in inclined orbits for 3D effect
      const orbitType = Math.random();
      let theta;
      if (orbitType < 0.9) {
        // Thin disk
        theta = Math.PI / 2 + (Math.random() - 0.5) * 0.15;
        particleData.orbitType[i] = 0; // equatorial
      } else {
        // Inclined orbits
        theta = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        particleData.orbitType[i] = 1; // inclined
      }

      const phi = Math.random() * Math.PI * 2;

      // Cartesian position
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = r * sinTheta * cosPhi;
      const y = r * cosTheta;
      const z = r * sinTheta * sinPhi;

      // ========================================================================
      // INITIAL VELOCITY: Keplerian orbits with small perturbations
      // ========================================================================
      const orbitalSpeed = Math.sqrt(this.G / r);
      const vr = (Math.random() - 0.5) * 0.002; // Minimal radial motion
      const vtheta = (Math.random() - 0.5) * 0.0002; // Minimal polar motion
      const vphi = orbitalSpeed / r;

      // Cartesian velocity
      const vx = vr * sinTheta * cosPhi - r * vtheta * cosTheta * cosPhi - r * sinTheta * vphi * sinPhi;
      const vy = vr * cosTheta + r * vtheta * sinTheta;
      const vz = vr * sinTheta * sinPhi - r * vtheta * cosTheta * sinPhi + r * sinTheta * vphi * cosPhi;

      // Store in typed arrays
      particleData.r[i] = r;
      particleData.theta[i] = theta;
      particleData.phi[i] = phi;
      particleData.vr[i] = vr;
      particleData.vtheta[i] = vtheta;
      particleData.vphi[i] = vphi;

      particleData.x[i] = x;
      particleData.y[i] = y;
      particleData.z[i] = z;
      particleData.vx[i] = vx;
      particleData.vy[i] = vy;
      particleData.vz[i] = vz;

      particleData.L[i] = r * orbitalSpeed; // Angular momentum
      particleData.mass[i] = 1.0 + Math.random() * 0.5; // Slight mass variation
      particleData.age[i] = 0;
      particleData.lifetime[i] = 10 + Math.random() * 15; // 10-25 seconds

      // Temperature based on distance (inner = hotter)
      particleData.temperature[i] = 1.0 - (r - this.ISCO_RADIUS) / 150;

      // Set buffer positions
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color based on temperature (hot = blue-white, cool = red-orange)
      const temp = particleData.temperature[i];
      colors[i * 3] = 0.8 + temp * 0.2;     // R
      colors[i * 3 + 1] = 0.6 + temp * 0.4; // G
      colors[i * 3 + 2] = 0.3 + temp * 0.7; // B

      // Size (2-4px for visibility)
      sizes[i] = 2.0 + Math.random() * 2.0;

      // Alpha (brighter for visibility)
      alphas[i] = 0.8 + Math.random() * 0.2;
    }

    // Set buffer attributes
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    // ========================================================================
    // CUSTOM SHADER FOR 1PX PARTICLES WITH GLOW
    // ========================================================================
    const material = new THREE.ShaderMaterial({
      uniforms: {
        // No uniforms needed for static particles
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        attribute vec3 color;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = color;
          vAlpha = alpha;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Size attenuation with distance (increased for visibility)
          gl_PointSize = size * (800.0 / max(-mvPosition.z, 1.0));
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          // Circular particle with soft edge
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          // Soft glow
          float glow = 1.0 - (dist * 2.0);
          glow = pow(glow, 1.5);

          gl_FragColor = vec4(vColor, vAlpha * glow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Create Points mesh
    const particleSystem = new THREE.Points(geometry, material);
    this.scene.add(particleSystem);

    console.log(`✅ Particle system created and added to scene!`);
    console.log(`   - Particle count: ${particleCount}`);
    console.log(`   - Position buffer size: ${positions.length}`);
    console.log(`   - First particle at: (${positions[0].toFixed(1)}, ${positions[1].toFixed(1)}, ${positions[2].toFixed(1)})`);

    // Store reference for updates
    this.particles = [{
      system: particleSystem,
      data: particleData,
      geometry: geometry,
      material: material,
    }];
  }

  // ============================================================================
  // ENHANCED PARTICLE PHYSICS UPDATE WITH COAGULATION & TURBULENCE
  // ============================================================================
  updateAllParticlesPhysics(deltaTime: number) {
    if (!this.particles[0]) return;

    const { data, geometry } = this.particles[0];
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;
    const alphas = geometry.attributes.alpha.array as Float32Array;
    const particleCount = data.r.length;

    // Update each particle with physics
    for (let i = 0; i < particleCount; i++) {
      // ========================================================================
      // SAFETY: CLAMP RADIUS TO AVOID SINGULARITIES
      // ========================================================================
      const r = Math.max(data.r[i], this.MIN_SAFE_RADIUS);
      data.r[i] = r;

      const theta = data.theta[i];
      const phi = data.phi[i];

      // ========================================================================
      // GRAVITATIONAL FORCE WITH CLAMPING - PROPER CIRCULAR ORBIT BALANCE
      // ========================================================================
      const rSq = r * r;
      const rCubed = rSq * r;

      // For stable circular orbits: centrifugal = gravity
      // L²/r³ = G/r² → L² = G*r
      // So if L is conserved correctly, ar should be ≈ 0
      let ar = -this.G / rSq + (data.L[i] * data.L[i]) / rCubed;
      ar = Math.max(-this.MAX_GRAVITATIONAL_FORCE, Math.min(this.MAX_GRAVITATIONAL_FORCE, ar));

      // ========================================================================
      // TURBULENCE: Apply ONLY to radial motion (don't disrupt tangential orbit!)
      // ========================================================================
      const turbulenceR = Math.sin(phi * 3.0 + this.time * this.TURBULENCE_FREQUENCY) * this.TURBULENCE_SCALE * 0.1;
      const turbulenceTheta = Math.cos(theta * 5.0 + this.time * this.TURBULENCE_FREQUENCY * 1.3) * this.TURBULENCE_SCALE * 0.05;

      // Apply turbulence only to non-orbital components
      data.vr[i] += turbulenceR * deltaTime;
      data.vtheta[i] += turbulenceTheta * deltaTime;

      // ========================================================================
      // COAGULATION: DISABLED - Was disrupting orbits
      // In a real accretion disk, coagulation happens over much longer timescales
      // ========================================================================
      // (Commented out for stable orbits)

      // ========================================================================
      // VISCOSITY: Only damp radial and polar velocities (not tangential!)
      // This allows particles to settle into circular orbits
      // ========================================================================
      data.vr[i] *= 0.95; // Damp radial oscillations
      data.vtheta[i] *= 0.98; // Damp polar oscillations
      // DON'T touch vphi or L - they must stay conserved for stable orbits!

      // ========================================================================
      // UPDATE VELOCITIES AND POSITIONS
      // ========================================================================
      // Update radial velocity from acceleration (very gentle to avoid spiral-in)
      data.vr[i] += ar * deltaTime * 0.01; // Reduced from 0.05 to 0.01

      // Update positions
      data.r[i] += data.vr[i] * deltaTime;
      data.theta[i] += data.vtheta[i] * deltaTime;
      data.phi[i] += data.vphi[i] * deltaTime;

      // ========================================================================
      // ANGULAR MOMENTUM CONSERVATION - THE KEY TO STABLE ORBITS!
      // ========================================================================
      // Recalculate angular velocity from conserved angular momentum
      data.vphi[i] = data.L[i] / (data.r[i] * data.r[i]);

      // Gentle drift toward equator (disk formation)
      if (data.orbitType[i] === 0) { // equatorial
        const distFromEquator = Math.abs(data.theta[i] - Math.PI / 2);
        if (distFromEquator > 0.01) {
          data.vtheta[i] += (Math.PI / 2 - data.theta[i]) * 0.005 * deltaTime;
        }
      }

      // ========================================================================
      // CONVERT TO CARTESIAN FOR RENDERING
      // ========================================================================
      const sinTheta = Math.sin(data.theta[i]);
      const cosTheta = Math.cos(data.theta[i]);
      const sinPhi = Math.sin(data.phi[i]);
      const cosPhi = Math.cos(data.phi[i]);

      data.x[i] = data.r[i] * sinTheta * cosPhi;
      data.y[i] = data.r[i] * cosTheta;
      data.z[i] = data.r[i] * sinTheta * sinPhi;

      // Update Cartesian velocities for consistency (not used in physics, just for reference)
      data.vx[i] = data.vr[i] * sinTheta * cosPhi
                   - data.r[i] * data.vtheta[i] * cosTheta * cosPhi
                   - data.r[i] * sinTheta * data.vphi[i] * sinPhi;
      data.vy[i] = data.vr[i] * cosTheta + data.r[i] * data.vtheta[i] * sinTheta;
      data.vz[i] = data.vr[i] * sinTheta * sinPhi
                   - data.r[i] * data.vtheta[i] * cosTheta * sinPhi
                   + data.r[i] * sinTheta * data.vphi[i] * cosPhi;

      // Update buffer positions
      positions[i * 3] = data.x[i];
      positions[i * 3 + 1] = data.y[i];
      positions[i * 3 + 2] = data.z[i];

      // ========================================================================
      // UPDATE TEMPERATURE AND COLOR
      // ========================================================================
      data.temperature[i] = Math.max(0, Math.min(1, 1.0 - (data.r[i] - this.ISCO_RADIUS) / 150));

      const temp = data.temperature[i];
      colors[i * 3] = 0.8 + temp * 0.2;     // R
      colors[i * 3 + 1] = 0.6 + temp * 0.4; // G
      colors[i * 3 + 2] = 0.3 + temp * 0.7; // B

      // ========================================================================
      // LIFETIME AND RECYCLING
      // ========================================================================
      data.age[i] += deltaTime;

      // Fade in/out based on age
      let alpha = 1.0;
      if (data.age[i] < 1.0) {
        alpha = data.age[i]; // Fade in
      } else if (data.age[i] > data.lifetime[i] - 2.0) {
        alpha = (data.lifetime[i] - data.age[i]) / 2.0; // Fade out
      }
      alphas[i] = Math.max(0, Math.min(1, alpha * 0.9)); // Increased from 0.7 to 0.9 for brightness

      // Recycle particle if too old or fell into black hole
      if (data.age[i] >= data.lifetime[i] || data.r[i] < this.SCHWARZSCHILD_RADIUS + 15) {
        // Respawn at outer edge with PROPER circular orbit conditions
        const newR = this.ISCO_RADIUS + 30 + Math.random() * 80;
        const newTheta = Math.PI / 2 + (Math.random() - 0.5) * 0.15;
        const newPhi = Math.random() * Math.PI * 2;

        data.r[i] = newR;
        data.theta[i] = newTheta;
        data.phi[i] = newPhi;

        // CRITICAL: Set proper circular orbit velocity
        const orbitalSpeed = Math.sqrt(this.G / newR);
        data.vr[i] = 0; // NO radial velocity for circular orbit
        data.vtheta[i] = 0; // NO polar velocity for circular orbit
        data.vphi[i] = orbitalSpeed / newR; // Angular velocity
        data.L[i] = newR * orbitalSpeed; // Angular momentum L = r*v

        data.age[i] = 0;
        data.lifetime[i] = 10 + Math.random() * 15;
      }
    }

    // Mark buffers as needing update
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.alpha.needsUpdate = true;
  }

  // OLD SYSTEM COMPAT: Keep old function signature but redirect to new system
  updateParticlePhysics(particle: any, deltaTime: number) {
    // Legacy function - now handled by updateAllParticlesPhysics
    // Keeping for compatibility with old code that might call this
    return;
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

  // ============================================================================
  // CUSTOM INTERACTIVE CAMERA CONTROLS
  // ============================================================================
  setupInteractiveControls() {
    console.log("✨ Interactive controls enabled! Drag to rotate, scroll to zoom, right-click to pan, double-click to spawn particles");
  }

  updateCameraFromState() {
    const state = this.cameraState;

    // Smooth interpolation towards target
    state.azimuth += (state.targetAzimuth - state.azimuth) * 0.1;
    state.elevation += (state.targetElevation - state.elevation) * 0.1;
    state.distance += (state.targetDistance - state.distance) * 0.1;

    // Clamp elevation to prevent flipping
    state.elevation = Math.max(0.1, Math.min(Math.PI - 0.1, state.elevation));

    // Clamp distance
    state.distance = Math.max(100, Math.min(1500, state.distance));

    // Convert spherical to Cartesian coordinates
    const x = state.distance * Math.sin(state.elevation) * Math.cos(state.azimuth);
    const z = state.distance * Math.sin(state.elevation) * Math.sin(state.azimuth);
    const y = state.distance * Math.cos(state.elevation);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  // ============================================================================
  // PARTICLE SPAWNING ON DOUBLE-CLICK
  // ============================================================================
  spawnParticleAtPosition(x: number, y: number, z: number) {
    const THREE = window.THREE;

    // Create new particle with glow shader
    const geometry = new THREE.SphereGeometry(2, 8, 8); // Slightly larger for spawned particles
    const material = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color().setHSL(Math.random(), 1, 0.7) }, // Random bright color
        opacity: { value: 0.9 },
        glowStrength: { value: 3.0 }, // Extra bright spawn!
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float opacity;
        uniform float glowStrength;

        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 2.0);
          float core = 1.0 - fresnel * 0.5;
          vec3 finalColor = glowColor * glowStrength * (core + fresnel * 2.0);
          float alpha = opacity * (core + fresnel * 0.5);
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const particle = new THREE.Mesh(geometry, material);
    particle.position.set(x, y, z);

    // Calculate spherical coordinates from Cartesian
    const r = Math.sqrt(x * x + y * y + z * z);
    const theta = Math.acos(y / r);
    const phi = Math.atan2(z, x);

    // Calculate orbital velocity for this position
    const orbitalSpeed = Math.sqrt(this.G / r) * 1.0;

    // Initialize full particle data
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    const vr = (Math.random() - 0.5) * 0.005;
    const vtheta = (Math.random() - 0.5) * 0.0005;
    const vphi = orbitalSpeed / r;

    particle.userData = {
      r, theta, phi, vr, vtheta, vphi,
      x, y, z,
      vx: vr * sinTheta * cosPhi - r * vtheta * cosTheta * cosPhi - r * sinTheta * vphi * sinPhi,
      vy: vr * cosTheta + r * vtheta * sinTheta,
      vz: vr * sinTheta * sinPhi - r * vtheta * cosTheta * sinPhi + r * sinTheta * vphi * cosPhi,
      ax: 0, ay: 0, az: 0, ar: 0,
      dx: 0, dy: 0, dz: 0,
      L: r * orbitalSpeed,
      speed: orbitalSpeed,
      speedSq: orbitalSpeed * orbitalSpeed,
      lastPositions: [],
      color: { h: Math.random(), s: 1, l: 0.7 },
      age: 0,
      lifetime: 15 + Math.random() * 10,
      birthTime: this.time,
      fadeInDuration: 1.0,
      fadeOutDuration: 2.0,
      inPhotonSphere: false,
      inErgosphere: false,
      isPrograde: true,
      collidedWithBoundary: false,
    };

    this.particles.push(particle);
    this.scene.add(particle);

    // Add trail for spawned particle
    if (this.settings.enableTrails) {
      const trailGeometry = new THREE.BufferGeometry();
      const trailMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          trailColor: { value: new THREE.Color(0x66ccff) },
          opacity: { value: 1.0 },
          brightness: { value: 1.0 },
        },
        vertexShader: `
          attribute float trailAge;
          varying float vAge;
          varying vec3 vPosition;

          void main() {
            vAge = trailAge;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 trailColor;
          uniform float opacity;
          uniform float brightness;
          varying float vAge;
          varying vec3 vPosition;

          void main() {
            float ageFade = exp(-vAge * 5.0);
            vec3 finalColor = trailColor * brightness;
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

    console.log(`✨ Spawned particle at (${x.toFixed(0)}, ${y.toFixed(0)}, ${z.toFixed(0)})`);
  }

  addEventListeners() {
    // Mouse tracking for raycasting
    const handleMouseMove = (e: MouseEvent) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      // Handle camera rotation during drag
      if (this.cameraState.isDragging) {
        const deltaX = e.clientX - this.cameraState.lastMouseX;
        const deltaY = e.clientY - this.cameraState.lastMouseY;

        this.cameraState.targetAzimuth -= deltaX * 0.005;
        this.cameraState.targetElevation += deltaY * 0.005;

        this.cameraState.lastMouseX = e.clientX;
        this.cameraState.lastMouseY = e.clientY;
      }
    };
    document.addEventListener("mousemove", handleMouseMove);

    // Mouse down - start dragging
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left click
        this.cameraState.isDragging = true;
        this.cameraState.lastMouseX = e.clientX;
        this.cameraState.lastMouseY = e.clientY;
        this.renderer.domElement.style.cursor = 'grabbing';
      }
    };
    this.renderer.domElement.addEventListener("mousedown", handleMouseDown);

    // Mouse up - stop dragging
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        this.cameraState.isDragging = false;
        this.renderer.domElement.style.cursor = 'grab';
      }
    };
    document.addEventListener("mouseup", handleMouseUp);

    // Mouse wheel - zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.cameraState.targetDistance += e.deltaY * 0.5;
    };
    this.renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });

    // Double-click to spawn particles
    const handleDoubleClick = (e: MouseEvent) => {
      if (!this.enableParticleSpawning) return;

      const THREE = window.THREE;

      // Update raycaster with mouse position
      this.raycaster.setFromCamera(
        new THREE.Vector2(this.mouse.x, this.mouse.y),
        this.camera
      );

      // Spawn particle at a distance in front of camera
      const spawnDistance = 300; // Distance from camera
      const spawnPoint = new THREE.Vector3();
      this.raycaster.ray.at(spawnDistance, spawnPoint);

      this.spawnParticleAtPosition(spawnPoint.x, spawnPoint.y, spawnPoint.z);
    };
    this.renderer.domElement.addEventListener("dblclick", handleDoubleClick);

    // Set cursor style
    this.renderer.domElement.style.cursor = 'grab';

    // Window resize
    const handleResize = () => this.onWindowResize();
    window.addEventListener("resize", handleResize, false);

    // Touch support for mobile
    if ("ontouchstart" in window) {
      let lastTap = 0;
      let touchStartX = 0;
      let touchStartY = 0;

      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          this.cameraState.lastMouseX = touchStartX;
          this.cameraState.lastMouseY = touchStartY;
          this.cameraState.isDragging = true;
        }
      };
      this.renderer.domElement.addEventListener("touchstart", handleTouchStart);

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1 && this.cameraState.isDragging) {
          const deltaX = e.touches[0].clientX - this.cameraState.lastMouseX;
          const deltaY = e.touches[0].clientY - this.cameraState.lastMouseY;

          this.cameraState.targetAzimuth -= deltaX * 0.005;
          this.cameraState.targetElevation += deltaY * 0.005;

          this.cameraState.lastMouseX = e.touches[0].clientX;
          this.cameraState.lastMouseY = e.touches[0].clientY;
        }
      };
      this.renderer.domElement.addEventListener("touchmove", handleTouchMove);

      const handleTouchEnd = (e: TouchEvent) => {
        this.cameraState.isDragging = false;

        // Double tap detection
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
          const touch = e.changedTouches[0];
          this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
          this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
          handleDoubleClick(e as any);
        }
        lastTap = currentTime;
      };
      this.renderer.domElement.addEventListener("touchend", handleTouchEnd);
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

    // Update interactive camera controls
    this.updateCameraFromState();

    // Rotate black hole slowly (frame dragging effect)
    if (this.blackHole) {
      this.blackHole.rotation.y += 0.001;

      // Update shader uniforms
      if (this.blackHole.material.uniforms) {
        this.blackHole.material.uniforms.time.value = this.time;
      }
    }

    // Animate photon sphere with ENHANCED 3D orbital mechanics
    if (this.photonSphere) {
      const { mesh, data, dummy } = this.photonSphere;
      const THREE = window.THREE;

      // Update shader uniforms for time-based effects
      if (mesh.material.uniforms) {
        mesh.material.uniforms.time.value = this.time;
      }

      for (let i = 0; i < data.length; i++) {
        const photon = data[i];

        // Update orbital position (photons orbit at near-light speed!)
        photon.phi += photon.speed * deltaTime;
        photon.phase += 0.05;
        photon.shimmerPhase += 0.08;

        // ENHANCED: 3D orbital motion with proper spherical coordinates
        // Wobble simulates the instability of photon sphere orbits
        const wobble = Math.sin(photon.phase) * photon.wobbleAmplitude;
        const radialWobble = photon.radius + wobble;

        // Calculate position in 3D using spherical coordinates
        // This maintains the orbital plane while allowing precession
        const x = radialWobble * Math.sin(photon.theta) * Math.cos(photon.phi);
        const y = radialWobble * Math.cos(photon.theta);
        const z = radialWobble * Math.sin(photon.theta) * Math.sin(photon.phi);

        dummy.position.set(x, y, z);

        // ENHANCED: Dynamic scale with multiple effects
        // 1. Base pulsing from orbital phase
        const basePulse = 0.7 + Math.sin(photon.phase) * 0.3;
        // 2. Shimmer effect (faster variation)
        const shimmer = 1.0 + Math.sin(photon.shimmerPhase) * 0.2;
        // 3. Family-based variation (photons in same family pulse together)
        const familyPulse = 1.0 + Math.sin(this.time * 2.0 + photon.familyId * 0.5) * 0.15;

        const finalScale = basePulse * shimmer * familyPulse;
        dummy.scale.set(finalScale, finalScale, finalScale);

        // Optional: Add slight rotation for more dynamic feel
        dummy.rotation.set(
          photon.phase * 0.1,
          photon.shimmerPhase * 0.15,
          photon.phi * 0.05
        );

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
        // cameraPosition is automatically updated by Three.js
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

    // Animate particles with enhanced physics (coagulation + turbulence)
    this.updateAllParticlesPhysics(deltaTime);

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
