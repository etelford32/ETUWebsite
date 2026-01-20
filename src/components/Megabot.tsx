"use client";

import { useEffect, useRef } from "react";

export type QualityLevel = "low" | "medium" | "high";

declare global {
  interface Window {
    THREE: any;
  }
}

interface MegabotProps {
  quality?: QualityLevel;
  trackingTarget?: { x: number; y: number } | null;
  buttonBounds?: DOMRect | null;
  isButtonClicked?: boolean;
  onLaserUpdate?: (data: {
    leftStart: { x: number; y: number } | null;
    leftEnd: { x: number; y: number } | null;
    rightStart: { x: number; y: number } | null;
    rightEnd: { x: number; y: number } | null;
    visible: boolean;
  }) => void;
  onGameStateUpdate?: (state: {
    score: number;
    health: number;
    shipCount: number;
    missileCount: number;
  }) => void;
}

export default function Megabot({
  quality = "medium",
  trackingTarget = null,
  buttonBounds = null,
  isButtonClicked = false,
  onLaserUpdate = undefined,
  onGameStateUpdate = undefined
}: MegabotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const megabotRef = useRef<any>(null);

  useEffect(() => {
    // Load Three.js dynamically
    const threeScript = document.createElement("script");
    threeScript.src = "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js";
    threeScript.async = true;

    threeScript.onload = () => {
      if (containerRef.current && window.THREE) {
        megabotRef.current = new MegabotScene(containerRef.current, quality, onLaserUpdate, onGameStateUpdate);
      }
    };

    threeScript.onerror = () => {
      console.error('❌ Failed to load Three.js library from CDN');
      // Fallback: Could show a static image or retry with a different CDN
    };

    document.head.appendChild(threeScript);

    return () => {
      if (megabotRef.current && megabotRef.current.destroy) {
        megabotRef.current.destroy();
      }
      // Clean up script
      const existingThree = document.querySelector(`script[src="${threeScript.src}"]`);
      if (existingThree) document.head.removeChild(existingThree);
    };
  }, []);

  // Update quality when it changes
  useEffect(() => {
    if (megabotRef.current && megabotRef.current.updateQuality) {
      megabotRef.current.updateQuality(quality);
    }
  }, [quality]);

  // Update tracking target when buttons are hovered
  useEffect(() => {
    if (megabotRef.current && megabotRef.current.setTrackingTarget) {
      megabotRef.current.setTrackingTarget(trackingTarget);
    }
  }, [trackingTarget]);

  // Update button bounds for laser border tracing
  useEffect(() => {
    if (megabotRef.current && megabotRef.current.setButtonBounds) {
      megabotRef.current.setButtonBounds(buttonBounds);
    }
  }, [buttonBounds]);

  // Trigger blast effect when button is clicked
  useEffect(() => {
    if (megabotRef.current && megabotRef.current.triggerBlast && isButtonClicked) {
      megabotRef.current.triggerBlast();
    }
  }, [isButtonClicked]);

  return (
    <div
      ref={containerRef}
      id="hero-megabot"
      className="absolute inset-0 z-0"
      aria-hidden="true"
    />
  );
}

class MegabotScene {
  container: HTMLDivElement;
  scene: any;
  camera: any;
  renderer: any;
  time: number = 0;
  settings: any;
  animationFrameId: number | null = null;

  // Megabot components
  mainMegabot: any;
  megabotParts: any[] = [];
  satellites: any[] = [];
  energyParticles: any[] = [];
  starField: any;
  headGroup: any = null; // Reference to head for tracking
  leftEye: any = null; // Reference to left eye
  rightEye: any = null; // Reference to right eye
  leftLaser: any = null; // Reference to left laser
  rightLaser: any = null; // Reference to right laser
  targetPosition3D: any = null; // 3D position of the button target

  // Camera controls
  mouse: any = { x: 0, y: 0 };
  cameraAngle: number = 0;
  cameraDistance: number = 1400; // Increased for building-sized mecha

  // Mouse tracking for button hover effects
  trackingTarget: { x: number; y: number } | null = null;
  targetRotation: { x: number; y: number } = { x: 0, y: 0 };
  currentRotation: { x: number; y: number } = { x: 0, y: 0 };

  // Button border tracking for laser effects
  buttonBounds: DOMRect | null = null;
  borderLasers: any[] = [];
  scanProgress: number = 0;
  isScanning: boolean = false;
  blastParticles: any[] = [];
  isBlasting: boolean = false;
  blastTime: number = 0;

  // Laser spark particles for continuous hover effect
  sparkParticles: any[] = [];
  sparkSpawnTimer: number = 0;

  // Laser update callback for game integration
  onLaserUpdate?: (data: {
    leftStart: { x: number; y: number } | null;
    leftEnd: { x: number; y: number } | null;
    rightStart: { x: number; y: number } | null;
    rightEnd: { x: number; y: number } | null;
    visible: boolean;
  }) => void;

  // 3D Combat System
  enemyShips: any[] = []; // 3D ship objects
  missiles3D: any[] = []; // 3D missile objects
  explosions3D: any[] = []; // 3D explosion effects
  lastShipSpawnTime: number = 0;

  // Game state
  gameScore: number = 0;
  megabotHealth: number = 10000;
  onGameStateUpdate?: (state: { score: number; health: number; shipCount: number; missileCount: number }) => void;

  // Megabot constants - BUILDING SIZED!
  readonly MAIN_SIZE = 350; // Increased for massive scale
  readonly SATELLITE_COUNT_LOW = 3;
  readonly SATELLITE_COUNT_MED = 6;
  readonly SATELLITE_COUNT_HIGH = 12;
  readonly PARTICLE_COUNT_LOW = 500;
  readonly PARTICLE_COUNT_MED = 2000;
  readonly PARTICLE_COUNT_HIGH = 5000;

  // 3D Combat constants
  readonly MAX_SHIPS_3D = 15;
  readonly MAX_MISSILES_3D = 50;
  readonly MAX_EXPLOSIONS_3D = 30;
  readonly SHIP_SPAWN_INTERVAL = 2000; // ms
  readonly SHIP_SPEED_MIN = 200;
  readonly SHIP_SPEED_MAX = 400;
  readonly MISSILE_SPEED_3D = 800;
  readonly SHIP_SPAWN_RADIUS = 2000; // Distance from megabot where ships spawn

  constructor(
    container: HTMLDivElement,
    quality: QualityLevel = "medium",
    onLaserUpdate?: (data: {
      leftStart: { x: number; y: number } | null;
      leftEnd: { x: number; y: number } | null;
      rightStart: { x: number; y: number } | null;
      rightEnd: { x: number; y: number } | null;
      visible: boolean;
    }) => void,
    onGameStateUpdate?: (state: {
      score: number;
      health: number;
      shipCount: number;
      missileCount: number;
    }) => void
  ) {
    this.container = container;
    this.onLaserUpdate = onLaserUpdate;
    this.onGameStateUpdate = onGameStateUpdate;
    if (!this.container) {
      console.warn("Container not found");
      return;
    }

    this.settings = this.detectCapabilities(quality);

    if (!this.isWebGLAvailable()) {
      this.showFallback();
      return;
    }

    this.init();
    this.createStarField();
    this.createMainMegabot();
    this.createSatellites();
    this.createEnergyParticles();
    this.addEventListeners();
    this.animate();

    console.log("🤖 Megabot scene initialized!");
  }

  detectCapabilities(quality: QualityLevel = "medium") {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      return {
        satelliteCount: 2,
        particleCount: 100,
        enableGlow: false,
        starCount: 1000
      };
    }

    switch (quality) {
      case "low":
        return {
          satelliteCount: this.SATELLITE_COUNT_LOW,
          particleCount: this.PARTICLE_COUNT_LOW,
          enableGlow: true,
          starCount: 2000
        };
      case "medium":
        return {
          satelliteCount: this.SATELLITE_COUNT_MED,
          particleCount: this.PARTICLE_COUNT_MED,
          enableGlow: true,
          starCount: 5000
        };
      case "high":
        return {
          satelliteCount: this.SATELLITE_COUNT_HIGH,
          particleCount: this.PARTICLE_COUNT_HIGH,
          enableGlow: true,
          starCount: 8000
        };
      default:
        return {
          satelliteCount: this.SATELLITE_COUNT_MED,
          particleCount: this.PARTICLE_COUNT_MED,
          enableGlow: true,
          starCount: 5000
        };
    }
  }

  updateQuality(quality: QualityLevel) {
    console.log(`🎨 Quality change requested: ${quality}`);
    this.destroy();
    this.settings = this.detectCapabilities(quality);

    if (!this.isWebGLAvailable()) {
      this.showFallback();
      return;
    }

    try {
      this.init();
      this.createStarField();
      this.createMainMegabot();
      this.createSatellites();
      this.createEnergyParticles();
      this.addEventListeners();
      this.animate();
      console.log(`✅ Scene recreated with ${quality} quality`);
    } catch (error) {
      console.error("❌ Error recreating scene:", error);
      this.showFallback();
    }
  }

  setTrackingTarget(target: { x: number; y: number } | null) {
    const THREE = window.THREE;
    if (!THREE) return;

    this.trackingTarget = target;

    if (target && this.camera && this.headGroup) {
      // Convert 2D screen coordinates to 3D position using raycasting
      const mouse = new THREE.Vector2();
      mouse.x = (target.x / window.innerWidth) * 2 - 1;
      mouse.y = -(target.y / window.innerHeight) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);

      // Project onto a plane in front of the camera at a reasonable UI depth
      // Use the camera's view direction to create a plane perpendicular to camera
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDirection);

      // Create a plane at a fixed distance from camera (where UI elements appear to be)
      const planeDistance = 800; // Closer distance for UI targeting
      const planePoint = this.camera.position.clone().add(cameraDirection.multiplyScalar(planeDistance));
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(cameraDirection.clone().negate(), planePoint);

      // Intersect ray with plane
      const targetPos = new THREE.Vector3();
      const intersection = raycaster.ray.intersectPlane(plane, targetPos);

      if (intersection) {
        this.targetPosition3D = targetPos;

        // Calculate proper head and body rotation to look at the target
        // Get megabot's world position
        const megabotWorldPos = new THREE.Vector3();
        this.mainMegabot.getWorldPosition(megabotWorldPos);

        // Calculate direction from megabot to target
        const directionToTarget = new THREE.Vector3().subVectors(targetPos, megabotWorldPos);

        // Calculate rotation angles (Euler angles in Y-X-Z order)
        // Y-axis rotation (yaw - horizontal turn)
        const targetYaw = Math.atan2(directionToTarget.x, directionToTarget.z);

        // X-axis rotation (pitch - vertical tilt)
        const horizontalDistance = Math.sqrt(directionToTarget.x * directionToTarget.x + directionToTarget.z * directionToTarget.z);
        const targetPitch = -Math.atan2(directionToTarget.y, horizontalDistance);

        // Store target rotations (limited for natural movement)
        this.targetRotation.y = THREE.MathUtils.clamp(targetYaw, -0.5, 0.5); // Limit horizontal turn
        this.targetRotation.x = THREE.MathUtils.clamp(targetPitch, -0.3, 0.3); // Limit vertical tilt

        console.log('🎯 Tracking target set:', {
          screen: `(${target.x}, ${target.y})`,
          world3D: `(${targetPos.x.toFixed(0)}, ${targetPos.y.toFixed(0)}, ${targetPos.z.toFixed(0)})`,
          rotation: `yaw: ${(targetYaw * 180 / Math.PI).toFixed(1)}°, pitch: ${(targetPitch * 180 / Math.PI).toFixed(1)}°`,
          hasLasers: !!(this.leftLaser && this.rightLaser)
        });
      } else {
        console.warn('⚠️ Ray-plane intersection failed, falling back to scanning mode');
        this.targetPosition3D = null;
        this.targetRotation.x = 0;
        this.targetRotation.y = 0;
      }
    } else {
      // Return to neutral position
      this.targetRotation.x = 0;
      this.targetRotation.y = 0;
      this.targetPosition3D = null;
      console.log('🎯 Tracking target cleared');
    }
  }

  setButtonBounds(bounds: DOMRect | null) {
    this.buttonBounds = bounds;
    if (bounds) {
      this.isScanning = true;
      this.scanProgress = 0;
      this.createBorderLasers();
    } else {
      this.isScanning = false;
      this.clearBorderLasers();
    }
  }

  triggerBlast() {
    this.isBlasting = true;
    this.blastTime = 0;
    this.createBlastEffect();
  }

  createBorderLasers() {
    const THREE = window.THREE;
    if (!THREE || !this.buttonBounds || !this.scene) return;

    // Clear existing border lasers
    this.clearBorderLasers();

    // Create laser beams that trace the button border
    // We'll create multiple segments for the border outline
    const laserMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        scanProgress: { value: 0 },
        beamColor: { value: new THREE.Color(1.0, 0.1, 0.1) },
        intensity: { value: 4.0 },
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
        uniform float scanProgress;
        uniform vec3 beamColor;
        uniform float intensity;
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          // Beam intensity from center to edge
          float distFromCenter = abs(vUv.x - 0.5) * 2.0;
          float beamIntensity = 1.0 - distFromCenter;
          beamIntensity = pow(beamIntensity, 1.5);

          // Scanning wave effect
          float scanWave = smoothstep(scanProgress - 0.2, scanProgress, vUv.y) *
                          smoothstep(scanProgress + 0.2, scanProgress, vUv.y);

          // Pulsing energy
          float pulse = 0.7 + sin(time * 8.0 + vUv.y * 20.0) * 0.3;

          // Only show laser where scan has reached
          float visibility = step(0.0, scanProgress - vUv.y) * 0.7 + scanWave;

          vec3 finalColor = beamColor * intensity * beamIntensity * pulse;
          float alpha = beamIntensity * visibility * 0.95;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Store material for cleanup
    this.borderLasers.push({ material: laserMaterial, meshes: [] });
  }

  clearBorderLasers() {
    this.borderLasers.forEach(laser => {
      if (laser.material) laser.material.dispose();
      if (laser.meshes) {
        laser.meshes.forEach((mesh: any) => {
          if (this.scene) this.scene.remove(mesh);
          if (mesh.geometry) mesh.geometry.dispose();
        });
      }
    });
    this.borderLasers = [];
  }

  createLaserSparks() {
    const THREE = window.THREE;
    if (!THREE || !this.targetPosition3D || !this.scene) return;

    // Create small spark bursts at laser impact point
    const particleCount = 15; // Smaller bursts for continuous effect
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: number[] = [];
    const colors = new Float32Array(particleCount * 3);

    // Sparks originate from target position
    const worldPos = this.targetPosition3D.clone();

    for (let i = 0; i < particleCount; i++) {
      // Start at impact point with slight randomness
      positions[i * 3] = worldPos.x + (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = worldPos.y + (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = worldPos.z + (Math.random() - 0.5) * 20;

      // Random velocities for spark spray
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 10;
      const elevation = (Math.random() - 0.5) * Math.PI * 0.3;

      velocities.push(Math.cos(angle) * Math.cos(elevation) * speed);
      velocities.push(Math.sin(elevation) * speed);
      velocities.push(Math.sin(angle) * Math.cos(elevation) * speed);

      // Bright red/orange/yellow sparks
      const colorChoice = Math.random();
      if (colorChoice < 0.4) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.0;
        colors[i * 3 + 2] = 0.0;
      } else if (colorChoice < 0.7) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.3;
        colors[i * 3 + 2] = 0.0;
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 0.2;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    this.sparkParticles.push({
      system: particles,
      velocities: velocities,
      age: 0,
      maxAge: 0.8 // Short-lived sparks
    });
  }

  createBlastEffect() {
    const THREE = window.THREE;
    if (!THREE || !this.buttonBounds || !this.scene) return;

    // Create explosive particle effect
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: number[] = [];
    const colors = new Float32Array(particleCount * 3);

    // Get button center in 3D space
    const centerX = this.buttonBounds.left + this.buttonBounds.width / 2;
    const centerY = this.buttonBounds.top + this.buttonBounds.height / 2;

    // Convert screen to world coordinates
    const vector = new THREE.Vector3(
      (centerX / window.innerWidth) * 2 - 1,
      -(centerY / window.innerHeight) * 2 + 1,
      0.5
    );
    vector.unproject(this.camera);
    const dir = vector.sub(this.camera.position).normalize();
    const distance = 500;
    const worldPos = this.camera.position.clone().add(dir.multiplyScalar(distance));

    for (let i = 0; i < particleCount; i++) {
      // Start at explosion center
      positions[i * 3] = worldPos.x;
      positions[i * 3 + 1] = worldPos.y;
      positions[i * 3 + 2] = worldPos.z;

      // Random explosion velocities
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 5 + Math.random() * 10;

      velocities.push(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      // Explosion colors (red, orange, yellow)
      const colorChoice = Math.random();
      if (colorChoice < 0.33) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.0;
        colors[i * 3 + 2] = 0.0;
      } else if (colorChoice < 0.66) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.5;
        colors[i * 3 + 2] = 0.0;
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 0.0;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 8,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    this.blastParticles.push({
      system: particles,
      velocities: velocities,
      age: 0,
      maxAge: 2.0
    });
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
    console.log("WebGL not available, using fallback");
    this.container.innerHTML = `
      <div style="
        position: absolute;
        width: 100%;
        height: 100%;
        background: radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a14 100%);
      ">
        <div style="
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          color: rgba(255, 255, 255, 0.3);
          font-size: 11px;
          text-align: center;
          font-family: sans-serif;
        ">
          WebGL not supported. Using simplified visualization.
        </div>
      </div>
    `;
  }

  init() {
    const THREE = window.THREE;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0001);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.offsetWidth / this.container.offsetHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 300, 800);
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
    const starCount = this.settings.starCount || 5000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 2000 + Math.random() * 1000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = 0.7 + Math.random() * 0.3;
      colors[i * 3] = color;
      colors[i * 3 + 1] = color;
      colors[i * 3 + 2] = 1;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  createMainMegabot() {
    const THREE = window.THREE;
    this.mainMegabot = new THREE.Group();

    // METALLIC ARMOR MATERIAL with advanced PBR shading - ULTRA EVIL VERSION
    const mechaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color(0.01, 0.005, 0.01) }, // DARKER evil black metallic
        metalness: { value: 0.99 }, // Ultra metallic for glossy finish
        roughness: { value: 0.06 }, // Even shinier, menacing reflective armor
        envIntensity: { value: 1.4 }, // STRONGER reflections for menacing appearance
        emissiveColor: { value: new THREE.Color(1.0, 0.05, 0.05) }, // INTENSE evil red glow
        emissiveIntensity: { value: 0.9 }, // MAXIMUM EVIL intensity
        panelLineColor: { value: new THREE.Color(0.01, 0.0, 0.02) }, // DEEPER evil panel lines
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying vec3 vViewPosition;
        varying vec2 vUv;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;

          // Create UV coordinates from position
          vUv = vec2(position.x * 0.05, position.y * 0.05);

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 baseColor;
        uniform float metalness;
        uniform float roughness;
        uniform float envIntensity;
        uniform vec3 emissiveColor;
        uniform float emissiveIntensity;
        uniform vec3 panelLineColor;

        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying vec3 vViewPosition;
        varying vec2 vUv;

        // Advanced noise functions
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));

          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        // Procedural normal mapping
        vec3 perturbNormal(vec3 normal, vec2 uv) {
          float scale = 2.0;
          float strength = 0.3;

          // Panel line bumps
          float bumpX = smoothstep(0.48, 0.5, fract(uv.x * 5.0)) - smoothstep(0.5, 0.52, fract(uv.x * 5.0));
          float bumpY = smoothstep(0.48, 0.5, fract(uv.y * 5.0)) - smoothstep(0.5, 0.52, fract(uv.y * 5.0));

          // Micro detail
          float microDetail = noise(uv * 100.0) * 0.1;

          vec3 perturbation = vec3(
            (bumpX + microDetail) * strength,
            (bumpY + microDetail) * strength,
            1.0
          );

          return normalize(normal + perturbation);
        }

        // Fresnel (Schlick approximation)
        float fresnel(vec3 viewDir, vec3 normal, float power) {
          return pow(1.0 - max(dot(viewDir, normal), 0.0), power);
        }

        // GGX specular distribution
        float ggx(vec3 normal, vec3 halfVector, float roughness) {
          float a = roughness * roughness;
          float a2 = a * a;
          float NdotH = max(dot(normal, halfVector), 0.0);
          float NdotH2 = NdotH * NdotH;

          float denom = (NdotH2 * (a2 - 1.0) + 1.0);
          return a2 / (3.14159 * denom * denom);
        }

        void main() {
          vec3 viewDir = normalize(vViewPosition);
          vec3 normal = normalize(vNormal);

          // Perturb normal for surface detail
          normal = perturbNormal(normal, vUv);

          // Panel lines (deep recessed lines)
          float panelX = fract(vUv.x * 5.0);
          float panelY = fract(vUv.y * 5.0);
          float panelLines = smoothstep(0.47, 0.5, panelX) * smoothstep(0.5, 0.53, panelX);
          panelLines += smoothstep(0.47, 0.5, panelY) * smoothstep(0.5, 0.53, panelY);
          panelLines = clamp(panelLines, 0.0, 1.0);

          // Rivets and mechanical details
          vec2 rivetUv = fract(vUv * 2.5);
          float rivetDist = length(rivetUv - 0.5);
          float rivets = smoothstep(0.08, 0.06, rivetDist) * 0.3;

          // Battle damage and scratches
          float scratches = noise(vUv * 80.0);
          scratches = smoothstep(0.75, 0.85, scratches) * 0.2;

          // Wear on edges (lighter metal showing through)
          float wear = noise(vUv * 30.0) * fresnel(viewDir, normal, 2.0);
          wear = smoothstep(0.6, 0.8, wear) * 0.15;

          // Base metal color
          vec3 albedo = baseColor;

          // Darken panel lines
          albedo = mix(albedo, panelLineColor, panelLines);

          // Add rivets (slightly lighter)
          albedo += vec3(0.1) * rivets;

          // Add wear (exposed lighter metal)
          albedo = mix(albedo, vec3(0.35, 0.36, 0.4), wear);

          // Scratches (lighter streaks)
          albedo = mix(albedo, vec3(0.4, 0.42, 0.45), scratches);

          // Lighting setup (dramatic, high-contrast lighting for menacing look)
          vec3 lightDir1 = normalize(vec3(1.0, 1.0, 1.0));
          vec3 lightDir2 = normalize(vec3(-0.5, 0.3, 0.5));
          vec3 lightDir3 = normalize(vec3(0.0, -1.0, 0.2));

          vec3 lightColor1 = vec3(1.0, 0.98, 0.95) * 1.8; // Brighter key light
          vec3 lightColor2 = vec3(0.5, 0.6, 1.0) * 0.7; // Stronger fill
          vec3 lightColor3 = vec3(0.8, 0.2, 0.2) * 0.4; // Evil red rim light

          // Calculate lighting
          float NdotL1 = max(dot(normal, lightDir1), 0.0);
          float NdotL2 = max(dot(normal, lightDir2), 0.0);
          float NdotL3 = max(dot(normal, lightDir3), 0.0);

          // Diffuse component
          vec3 diffuse = albedo * (
            lightColor1 * NdotL1 +
            lightColor2 * NdotL2 +
            lightColor3 * NdotL3
          );

          // Specular highlights (metallic reflection) - more intense and sharp
          vec3 halfVector1 = normalize(lightDir1 + viewDir);
          vec3 halfVector2 = normalize(lightDir2 + viewDir);

          float spec1 = ggx(normal, halfVector1, roughness) * NdotL1;
          float spec2 = ggx(normal, halfVector2, roughness * 1.1) * NdotL2;

          vec3 specular = (spec1 * lightColor1 * 1.5 + spec2 * lightColor2 * 1.3) * metalness;

          // Fake environment reflection (simulate sky/ground)
          float upFacing = normal.y * 0.5 + 0.5;
          vec3 skyColor = vec3(0.3, 0.5, 0.8);
          vec3 groundColor = vec3(0.1, 0.12, 0.15);
          vec3 envReflection = mix(groundColor, skyColor, upFacing) * envIntensity * metalness;

          // Fresnel rim lighting - evil red glow
          float rim = fresnel(viewDir, normal, 3.0);
          vec3 rimLight = vec3(1.0, 0.15, 0.15) * rim * 0.8; // Menacing red rim

          // Energy flow lines (subtle tech detail)
          float energyFlow = sin(vUv.y * 8.0 + time * 1.5) * 0.5 + 0.5;
          energyFlow *= smoothstep(0.0, 0.15, fract(vUv.y * 2.0)) * smoothstep(1.0, 0.85, fract(vUv.y * 2.0));
          vec3 energy = emissiveColor * energyFlow * emissiveIntensity * 0.2;

          // Ambient occlusion
          float ao = smoothstep(-0.3, 0.7, normal.y) * 0.4 + 0.6;
          ao *= (1.0 - panelLines * 0.5); // Darken panel lines more

          // Final color composition
          vec3 finalColor = diffuse * ao + specular + envReflection + rimLight + energy;

          // Tone mapping (simple Reinhard)
          finalColor = finalColor / (finalColor + vec3(1.0));

          // Gamma correction
          finalColor = pow(finalColor, vec3(1.0 / 2.2));

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      lights: false,
    });

    // METALLIC ACCENT MATERIAL with tech details - more menacing
    const accentMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color(0.05, 0.05, 0.06) }, // Charcoal black accent
        metalness: { value: 0.98 }, // Very metallic
        roughness: { value: 0.12 }, // Glossy finish
        glowColor: { value: new THREE.Color(0.9, 0.1, 0.1) }, // Evil red glow
        glowIntensity: { value: 0.8 }, // More intense
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying vec3 vViewPosition;
        varying vec2 vUv;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          vUv = vec2(position.x * 0.05, position.y * 0.05);

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 baseColor;
        uniform float metalness;
        uniform float roughness;
        uniform vec3 glowColor;
        uniform float glowIntensity;

        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying vec3 vViewPosition;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        float fresnel(vec3 viewDir, vec3 normal, float power) {
          return pow(1.0 - max(dot(viewDir, normal), 0.0), power);
        }

        float ggx(vec3 normal, vec3 halfVector, float roughness) {
          float a = roughness * roughness;
          float a2 = a * a;
          float NdotH = max(dot(normal, halfVector), 0.0);
          float NdotH2 = NdotH * NdotH;
          float denom = (NdotH2 * (a2 - 1.0) + 1.0);
          return a2 / (3.14159 * denom * denom);
        }

        void main() {
          vec3 viewDir = normalize(vViewPosition);
          vec3 normal = normalize(vNormal);

          // Tech circuit pattern
          float circuitX = smoothstep(0.48, 0.5, fract(vUv.x * 10.0));
          float circuitY = smoothstep(0.48, 0.5, fract(vUv.y * 10.0));
          float circuit = max(circuitX, circuitY) * 0.2;

          // Animated tech pattern
          float techPattern = sin(vUv.x * 15.0 + time * 0.5) * cos(vUv.y * 15.0 - time * 0.5) * 0.5 + 0.5;
          techPattern = smoothstep(0.4, 0.6, techPattern) * 0.15;

          // Pulsing glow
          float pulse = 0.85 + sin(time * 1.5) * 0.15;

          // Base albedo with tech patterns
          vec3 albedo = baseColor;
          albedo += vec3(0.05) * circuit;
          albedo += glowColor * techPattern * pulse * 0.3;

          // Lighting
          vec3 lightDir1 = normalize(vec3(1.0, 1.0, 1.0));
          vec3 lightDir2 = normalize(vec3(-0.5, 0.3, 0.5));

          vec3 lightColor1 = vec3(1.0, 0.98, 0.95) * 1.2;
          vec3 lightColor2 = vec3(0.6, 0.7, 1.0) * 0.5;

          float NdotL1 = max(dot(normal, lightDir1), 0.0);
          float NdotL2 = max(dot(normal, lightDir2), 0.0);

          vec3 diffuse = albedo * (lightColor1 * NdotL1 + lightColor2 * NdotL2);

          // Specular
          vec3 halfVector1 = normalize(lightDir1 + viewDir);
          vec3 halfVector2 = normalize(lightDir2 + viewDir);

          float spec1 = ggx(normal, halfVector1, roughness) * NdotL1;
          float spec2 = ggx(normal, halfVector2, roughness * 1.1) * NdotL2;

          vec3 specular = (spec1 * lightColor1 + spec2 * lightColor2) * metalness;

          // Environment reflection
          float upFacing = normal.y * 0.5 + 0.5;
          vec3 envReflection = mix(vec3(0.1, 0.12, 0.15), vec3(0.3, 0.5, 0.8), upFacing) * 0.7 * metalness;

          // Fresnel rim with tech glow
          float rim = fresnel(viewDir, normal, 3.0);
          vec3 rimLight = glowColor * rim * glowIntensity * pulse;

          // Ambient occlusion
          float ao = smoothstep(-0.3, 0.7, normal.y) * 0.4 + 0.6;

          // Final composition
          vec3 finalColor = diffuse * ao + specular + envReflection + rimLight;

          // Tone mapping
          finalColor = finalColor / (finalColor + vec3(1.0));

          // Gamma correction
          finalColor = pow(finalColor, vec3(1.0 / 2.2));

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      lights: false,
    });

    // ==================== HEAD - MENACING AND VILLAINOUS ====================
    const headGroup = new THREE.Group();

    // Main head - angular and aggressive
    const headGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.45, this.MAIN_SIZE * 0.5, this.MAIN_SIZE * 0.38);
    const head = new THREE.Mesh(headGeometry, mechaMaterial);
    headGroup.add(head);

    // HEAD-MOUNTED WEAPON ARRAYS - side turrets
    for (let side = -1; side <= 1; side += 2) {
      // Turret housing
      const turretHousingGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.12, this.MAIN_SIZE * 0.15, this.MAIN_SIZE * 0.12);
      const turretHousing = new THREE.Mesh(turretHousingGeometry, accentMaterial);
      turretHousing.position.set(side * this.MAIN_SIZE * 0.26, this.MAIN_SIZE * 0.15, 0);
      headGroup.add(turretHousing);

      // Dual gatling cannons
      for (let cannon = 0; cannon < 2; cannon++) {
        const cannonGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.02, this.MAIN_SIZE * 0.025, this.MAIN_SIZE * 0.25, 8);
        const cannonMesh = new THREE.Mesh(cannonGeometry, mechaMaterial);
        cannonMesh.rotation.z = Math.PI / 2;
        cannonMesh.position.set(
          side * this.MAIN_SIZE * 0.36,
          this.MAIN_SIZE * (0.15 + (cannon - 0.5) * 0.06),
          this.MAIN_SIZE * 0.05
        );
        headGroup.add(cannonMesh);

        // Cannon barrel details
        const barrelTipGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.015, this.MAIN_SIZE * 0.02, this.MAIN_SIZE * 0.05, 8);
        const barrelTip = new THREE.Mesh(barrelTipGeometry, accentMaterial);
        barrelTip.rotation.z = Math.PI / 2;
        barrelTip.position.set(
          side * this.MAIN_SIZE * 0.48,
          this.MAIN_SIZE * (0.15 + (cannon - 0.5) * 0.06),
          this.MAIN_SIZE * 0.05
        );
        headGroup.add(barrelTip);
      }

      // Sensor array / targeting system
      const sensorGeometry = new THREE.SphereGeometry(this.MAIN_SIZE * 0.04, 16, 16);
      const sensor = new THREE.Mesh(sensorGeometry, new THREE.MeshStandardMaterial({
        color: 0xff3300,
        emissive: new THREE.Color(0xff3300),
        emissiveIntensity: 0.8,
        metalness: 0.9,
        roughness: 0.1,
      }));
      sensor.position.set(side * this.MAIN_SIZE * 0.26, this.MAIN_SIZE * 0.28, this.MAIN_SIZE * 0.08);
      headGroup.add(sensor);
    }

    // Face plate - angular and menacing
    const facePlateGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.46, this.MAIN_SIZE * 0.3, this.MAIN_SIZE * 0.06);
    const facePlate = new THREE.Mesh(facePlateGeometry, accentMaterial);
    facePlate.position.z = this.MAIN_SIZE * 0.22;
    headGroup.add(facePlate);

    // CHIN MOUNTED WEAPON POD - forward firepower
    const chinWeaponHousingGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.25, this.MAIN_SIZE * 0.12, this.MAIN_SIZE * 0.15);
    const chinWeaponHousing = new THREE.Mesh(chinWeaponHousingGeometry, accentMaterial);
    chinWeaponHousing.position.set(0, -this.MAIN_SIZE * 0.22, this.MAIN_SIZE * 0.22);
    headGroup.add(chinWeaponHousing);

    // Triple barrel under-chin cannons
    for (let barrel = 0; barrel < 3; barrel++) {
      const underChinCannonGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.025, this.MAIN_SIZE * 0.03, this.MAIN_SIZE * 0.18, 8);
      const underChinCannon = new THREE.Mesh(underChinCannonGeometry, mechaMaterial);
      underChinCannon.rotation.x = Math.PI / 2;
      underChinCannon.position.set(
        this.MAIN_SIZE * (-0.08 + barrel * 0.08),
        -this.MAIN_SIZE * 0.22,
        this.MAIN_SIZE * 0.32
      );
      headGroup.add(underChinCannon);
    }

    // Additional face armor layer - more angular
    const facePlate2Geometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.4, this.MAIN_SIZE * 0.2, this.MAIN_SIZE * 0.05);
    const facePlate2 = new THREE.Mesh(facePlate2Geometry, mechaMaterial);
    facePlate2.position.z = this.MAIN_SIZE * 0.25;
    facePlate2.position.y = -this.MAIN_SIZE * 0.05;
    headGroup.add(facePlate2);

    // Cheek armor plates - reinforced protection
    for (let side = -1; side <= 1; side += 2) {
      const cheekArmorGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.09, this.MAIN_SIZE * 0.28, this.MAIN_SIZE * 0.14);
      const cheekArmor = new THREE.Mesh(cheekArmorGeometry, accentMaterial);
      cheekArmor.position.set(side * this.MAIN_SIZE * 0.24, -this.MAIN_SIZE * 0.05, this.MAIN_SIZE * 0.25);
      cheekArmor.rotation.y = side * 0.15;
      headGroup.add(cheekArmor);
    }

    // V-Fin sensor crest - Menacing black blade with red energy
    const vFinGeometry = new THREE.ConeGeometry(this.MAIN_SIZE * 0.18, this.MAIN_SIZE * 0.5, 3); // Sharp aggressive blade
    const vFinMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color(0.05, 0.05, 0.08) }, // Dark metallic black
        glowColor: { value: new THREE.Color(1.0, 0.1, 0.0) }, // Menacing red energy
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 baseColor;
        uniform vec3 glowColor;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;

        void main() {
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - max(dot(viewDirection, vNormal), 0.0), 2.0);

          // Energy sweep effect
          float sweep = sin(vPosition.y * 5.0 + time * 3.0) * 0.5 + 0.5;

          // Pulsing glow
          float pulse = 0.8 + sin(time * 4.0) * 0.2;

          vec3 color = baseColor * (0.8 + sweep * 0.4);
          color += glowColor * fresnel * 1.5;
          color *= pulse;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });

    const vFin = new THREE.Mesh(vFinGeometry, vFinMaterial);
    vFin.rotation.x = Math.PI;
    vFin.position.y = this.MAIN_SIZE * 0.3;
    vFin.position.z = this.MAIN_SIZE * 0.05;
    headGroup.add(vFin);
    this.megabotParts.push({ mesh: vFin, type: 'vfin' });

    // EVIL LASER EYES with intense glow effect
    const eyeGeometry = new THREE.SphereGeometry(this.MAIN_SIZE * 0.06, 16, 16);
    const eyeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        eyeColor: { value: new THREE.Color(1.0, 0.05, 0.0) }, // Intense evil red
        glowIntensity: { value: 8.0 }, // Much brighter!
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
        uniform float time;
        uniform vec3 eyeColor;
        uniform float glowIntensity;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 2.5);

          // Evil pulsing effect - more intense
          float pulse = 0.9 + sin(time * 5.0) * 0.1;
          float slowPulse = 0.85 + sin(time * 2.0) * 0.15;

          // Intense core with dramatic outer glow
          float core = 1.0 - fresnel * 0.2;
          vec3 finalColor = eyeColor * glowIntensity * pulse * slowPulse * (core * 1.5 + fresnel * 3.0);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: false,
      blending: THREE.AdditiveBlending,
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-this.MAIN_SIZE * 0.1, this.MAIN_SIZE * 0.05, this.MAIN_SIZE * 0.2);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
    rightEye.position.set(this.MAIN_SIZE * 0.1, this.MAIN_SIZE * 0.05, this.MAIN_SIZE * 0.2);
    headGroup.add(rightEye);

    // Store references to eyes
    this.leftEye = leftEye;
    this.rightEye = rightEye;

    this.megabotParts.push({ mesh: leftEye, type: 'leftEye' });
    this.megabotParts.push({ mesh: rightEye, type: 'rightEye' });

    // Laser beam effects from eyes - INTENSE and menacing
    const laserGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.018, this.MAIN_SIZE * 0.01, 1, 8);
    const laserMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        beamColor: { value: new THREE.Color(1.0, 0.08, 0.0) }, // More intense red
        intensity: { value: 6.0 }, // Double the brightness!
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
        uniform vec3 beamColor;
        uniform float intensity;
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          // Beam intensity from center to edge - sharper falloff
          float distFromCenter = length(vec2(vUv.x - 0.5, 0.0)) * 2.0;
          float beamIntensity = 1.0 - distFromCenter;
          beamIntensity = pow(beamIntensity, 2.5); // Sharper beam

          // Pulsing energy - faster and more intense
          float pulse = 0.85 + sin(time * 10.0 + vUv.y * 20.0) * 0.15;

          // Traveling energy waves - more dramatic
          float wave = sin(vUv.y * 40.0 - time * 20.0) * 0.3 + 0.7;

          // Core beam is MUCH brighter
          float coreBrightness = smoothstep(0.4, 0.0, distFromCenter);

          vec3 finalColor = beamColor * intensity * (beamIntensity * pulse * wave + coreBrightness * 4.0);
          float alpha = beamIntensity * 0.98;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const leftLaser = new THREE.Mesh(laserGeometry, laserMaterial);
    leftLaser.position.copy(leftEye.position);
    leftLaser.visible = false; // Start hidden
    headGroup.add(leftLaser);

    const rightLaser = new THREE.Mesh(laserGeometry, laserMaterial.clone());
    rightLaser.position.copy(rightEye.position);
    rightLaser.visible = false; // Start hidden
    headGroup.add(rightLaser);

    // Store references to lasers
    this.leftLaser = leftLaser;
    this.rightLaser = rightLaser;

    this.megabotParts.push({ mesh: leftLaser, type: 'leftLaser' });
    this.megabotParts.push({ mesh: rightLaser, type: 'rightLaser' });

    console.log('🔴 Lasers created at eye positions:', {
      leftEyePos: leftEye.position,
      rightEyePos: rightEye.position
    });

    // Eye glow lights - ULTRA INTENSE EVIL red glow
    const leftEyeLight = new THREE.PointLight(0xff0000, 15, 800); // EVIL INTENSITY - Much brighter and wider range
    leftEyeLight.position.copy(leftEye.position);
    headGroup.add(leftEyeLight);

    const rightEyeLight = new THREE.PointLight(0xff0000, 15, 800); // EVIL INTENSITY - Much brighter and wider range
    rightEyeLight.position.copy(rightEye.position);
    headGroup.add(rightEyeLight);

    // Add additional evil ambient red glow around head
    const evilHeadGlow = new THREE.PointLight(0xaa0000, 6, 400);
    evilHeadGlow.position.set(0, this.MAIN_SIZE * 0.05, this.MAIN_SIZE * 0.15);
    headGroup.add(evilHeadGlow);

    headGroup.position.y = this.MAIN_SIZE * 1.3;
    this.mainMegabot.add(headGroup);
    this.megabotParts.push({ mesh: headGroup, type: 'head' });

    // Store reference to head for tracking
    this.headGroup = headGroup;

    // ==================== TORSO - BUILDING SIZED ====================
    const torsoGroup = new THREE.Group();

    // Main chest - MASSIVE and layered
    const chestGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.75, this.MAIN_SIZE * 1.0, this.MAIN_SIZE * 0.5);
    const chest = new THREE.Mesh(chestGeometry, mechaMaterial);
    torsoGroup.add(chest);

    // Multi-layer armor plating system
    for (let layer = 0; layer < 3; layer++) {
      const plateWidth = this.MAIN_SIZE * (0.6 - layer * 0.05);
      const plateHeight = this.MAIN_SIZE * (0.35 - layer * 0.05);
      const chestPlateGeometry = new THREE.BoxGeometry(plateWidth, plateHeight, this.MAIN_SIZE * 0.06);
      const chestPlate = new THREE.Mesh(chestPlateGeometry, accentMaterial);
      chestPlate.position.z = this.MAIN_SIZE * (0.28 + layer * 0.03);
      chestPlate.position.y = this.MAIN_SIZE * (0.2 - layer * 0.05);
      torsoGroup.add(chestPlate);
    }

    // CHEST-MOUNTED WEAPON ARRAYS - dual heavy cannons
    for (let side = -1; side <= 1; side += 2) {
      // Chest cannon housing
      const chestCannonHousingGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.15, this.MAIN_SIZE * 0.2, this.MAIN_SIZE * 0.12);
      const chestCannonHousing = new THREE.Mesh(chestCannonHousingGeometry, accentMaterial);
      chestCannonHousing.position.set(side * this.MAIN_SIZE * 0.22, this.MAIN_SIZE * 0.35, this.MAIN_SIZE * 0.32);
      torsoGroup.add(chestCannonHousing);

      // Heavy cannon barrel
      const heavyCannonGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.04, this.MAIN_SIZE * 0.05, this.MAIN_SIZE * 0.35, 12);
      const heavyCannon = new THREE.Mesh(heavyCannonGeometry, mechaMaterial);
      heavyCannon.rotation.x = Math.PI / 2;
      heavyCannon.position.set(side * this.MAIN_SIZE * 0.22, this.MAIN_SIZE * 0.35, this.MAIN_SIZE * 0.5);
      torsoGroup.add(heavyCannon);
    }

    // Massive shoulder armor panels with weapon mounts
    for (let side = -1; side <= 1; side += 2) {
      const shoulderPlateGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.28, this.MAIN_SIZE * 0.45, this.MAIN_SIZE * 0.12);
      const shoulderPlate = new THREE.Mesh(shoulderPlateGeometry, accentMaterial);
      shoulderPlate.position.set(side * this.MAIN_SIZE * 0.45, this.MAIN_SIZE * 0.35, this.MAIN_SIZE * 0.08);
      shoulderPlate.rotation.y = side * 0.12;
      torsoGroup.add(shoulderPlate);

      // SHOULDER-MOUNTED MISSILE LAUNCHER POD - MASSIVE AND MENACING
      const missileLauncherGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.25, this.MAIN_SIZE * 0.35, this.MAIN_SIZE * 0.20);
      const missileLauncher = new THREE.Mesh(missileLauncherGeometry, mechaMaterial);
      missileLauncher.position.set(side * this.MAIN_SIZE * 0.48, this.MAIN_SIZE * 0.58, this.MAIN_SIZE * 0.05);
      torsoGroup.add(missileLauncher);

      // Missile launcher support frame
      const launcherFrameGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.22, this.MAIN_SIZE * 0.08, this.MAIN_SIZE * 0.18);
      const launcherFrame = new THREE.Mesh(launcherFrameGeometry, accentMaterial);
      launcherFrame.position.set(side * this.MAIN_SIZE * 0.48, this.MAIN_SIZE * 0.45, this.MAIN_SIZE * 0.05);
      torsoGroup.add(launcherFrame);

      // Missile tubes (8 per shoulder in 2x4 grid - more firepower!)
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) {
          const missileTubeGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.028, this.MAIN_SIZE * 0.028, this.MAIN_SIZE * 0.22, 8);
          const missileTube = new THREE.Mesh(missileTubeGeometry, new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            metalness: 0.95,
            roughness: 0.2,
          }));
          missileTube.rotation.x = -Math.PI * 0.12; // Angle upward menacingly
          missileTube.position.set(
            side * this.MAIN_SIZE * (0.40 + col * 0.045),
            this.MAIN_SIZE * (0.64 + row * -0.10),
            this.MAIN_SIZE * 0.14
          );
          torsoGroup.add(missileTube);

          // Missile warheads visible in tubes (red tips)
          const warheadGeometry = new THREE.ConeGeometry(this.MAIN_SIZE * 0.022, this.MAIN_SIZE * 0.04, 6);
          const warhead = new THREE.Mesh(warheadGeometry, new THREE.MeshStandardMaterial({
            color: 0xcc0000,
            emissive: new THREE.Color(0xcc0000),
            emissiveIntensity: 0.6,
            metalness: 0.8,
          }));
          warhead.rotation.x = -Math.PI * 0.12;
          warhead.position.set(
            side * this.MAIN_SIZE * (0.40 + col * 0.045),
            this.MAIN_SIZE * (0.64 + row * -0.10),
            this.MAIN_SIZE * 0.24
          );
          torsoGroup.add(warhead);
        }
      }
    }

    // Core reactor array (multiple glowing reactors)
    const reactorMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        coreColor: { value: new THREE.Color(0.3, 0.8, 1.0) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 coreColor;
        varying vec3 vNormal;
        varying vec2 vUv;

        void main() {
          float pulse = 0.8 + sin(time * 3.0) * 0.2;
          float pattern = sin(vUv.y * 20.0 + time * 2.0) * 0.3 + 0.7;

          vec3 finalColor = coreColor * 2.0 * pulse * pattern;
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: false,
    });

    // Main central reactor - HUGE
    const mainReactorGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.18, this.MAIN_SIZE * 0.18, this.MAIN_SIZE * 0.15, 24);
    const mainReactor = new THREE.Mesh(mainReactorGeometry, reactorMaterial);
    mainReactor.rotation.z = Math.PI / 2;
    mainReactor.position.z = this.MAIN_SIZE * 0.35;
    mainReactor.position.y = -this.MAIN_SIZE * 0.05;
    torsoGroup.add(mainReactor);
    this.megabotParts.push({ mesh: mainReactor, type: 'reactor' });

    // Auxiliary reactors (twin reactors)
    for (let i = 0; i < 2; i++) {
      const auxReactorGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.1, this.MAIN_SIZE * 0.1, this.MAIN_SIZE * 0.12, 16);
      const auxReactor = new THREE.Mesh(auxReactorGeometry, reactorMaterial.clone());
      auxReactor.rotation.z = Math.PI / 2;
      const yOffset = i === 0 ? 0.25 : -0.25;
      auxReactor.position.set(0, this.MAIN_SIZE * yOffset, this.MAIN_SIZE * 0.32);
      torsoGroup.add(auxReactor);
      this.megabotParts.push({ mesh: auxReactor, type: 'auxReactor' });
    }

    // Reactor lights
    const reactorLight = new THREE.PointLight(0x4a90e2, 6, 1000);
    reactorLight.position.copy(mainReactor.position);
    torsoGroup.add(reactorLight);

    // Mechanical vents (heat dissipation)
    for (let side = -1; side <= 1; side += 2) {
      for (let vent = 0; vent < 4; vent++) {
        const ventGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.08, this.MAIN_SIZE * 0.06, this.MAIN_SIZE * 0.03);
        const ventMaterial = new THREE.MeshStandardMaterial({
          color: 0x1a1a2e,
          emissive: new THREE.Color(0.8, 0.3, 0.0),
          emissiveIntensity: 0.5,
          metalness: 0.9,
          roughness: 0.2,
        });
        const ventMesh = new THREE.Mesh(ventGeometry, ventMaterial);
        ventMesh.position.set(
          side * this.MAIN_SIZE * 0.35,
          this.MAIN_SIZE * (0.3 - vent * 0.15),
          this.MAIN_SIZE * 0.22
        );
        torsoGroup.add(ventMesh);
      }
    }

    // Abdomen - multi-segmented
    const abdomenLayers = 3;
    for (let layer = 0; layer < abdomenLayers; layer++) {
      const abdomenGeometry = new THREE.BoxGeometry(
        this.MAIN_SIZE * (0.55 - layer * 0.03),
        this.MAIN_SIZE * 0.15,
        this.MAIN_SIZE * (0.45 - layer * 0.03)
      );
      const abdomen = new THREE.Mesh(abdomenGeometry, mechaMaterial);
      abdomen.position.y = -this.MAIN_SIZE * (0.55 + layer * 0.18);
      torsoGroup.add(abdomen);

      // Segment detail lines
      const segmentLineGeometry = new THREE.BoxGeometry(
        this.MAIN_SIZE * 0.6,
        this.MAIN_SIZE * 0.02,
        this.MAIN_SIZE * 0.48
      );
      const segmentLine = new THREE.Mesh(segmentLineGeometry, accentMaterial);
      segmentLine.position.y = -this.MAIN_SIZE * (0.48 + layer * 0.18);
      torsoGroup.add(segmentLine);
    }

    // Back thrusters/boosters
    for (let side = -1; side <= 1; side += 2) {
      const thrusterHousingGeometry = new THREE.BoxGeometry(
        this.MAIN_SIZE * 0.2,
        this.MAIN_SIZE * 0.6,
        this.MAIN_SIZE * 0.3
      );
      const thrusterHousing = new THREE.Mesh(thrusterHousingGeometry, accentMaterial);
      thrusterHousing.position.set(side * this.MAIN_SIZE * 0.25, this.MAIN_SIZE * 0.1, -this.MAIN_SIZE * 0.35);
      torsoGroup.add(thrusterHousing);

      // Thruster nozzles
      for (let nozzle = 0; nozzle < 2; nozzle++) {
        const nozzleGeometry = new THREE.CylinderGeometry(
          this.MAIN_SIZE * 0.06,
          this.MAIN_SIZE * 0.08,
          this.MAIN_SIZE * 0.2,
          16
        );

        // Create emissive color separately to avoid TypeScript inference issues
        const emissiveColor = nozzle === 0
          ? new THREE.Color(0.3, 0.0, 0.0)  // Dark red
          : new THREE.Color(0.2, 0.0, 0.3); // Purple

        const nozzleMaterial = new THREE.MeshStandardMaterial({
          color: nozzle === 0 ? 0x8B0000 : 0x4B0082, // Dark red and purple
          metalness: 0.95,
          roughness: 0.1,
          emissive: emissiveColor,
          emissiveIntensity: 0.5,
        });
        const nozzleMesh = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
        nozzleMesh.rotation.x = Math.PI / 2;
        nozzleMesh.position.set(
          side * this.MAIN_SIZE * 0.25,
          this.MAIN_SIZE * (0.2 + nozzle * -0.2),
          -this.MAIN_SIZE * 0.5
        );
        torsoGroup.add(nozzleMesh);
      }
    }

    torsoGroup.position.y = this.MAIN_SIZE * 0.4;
    this.mainMegabot.add(torsoGroup);
    this.megabotParts.push({ mesh: torsoGroup, type: 'torso' });

    // ==================== ARMS - MASSIVE MECHA LIMBS ====================
    for (let side = -1; side <= 1; side += 2) {
      const armGroup = new THREE.Group();

      // Massive shoulder armor (multi-layered)
      const shoulderMainGeometry = new THREE.SphereGeometry(this.MAIN_SIZE * 0.35, 24, 24);
      const shoulderMain = new THREE.Mesh(shoulderMainGeometry, accentMaterial);
      armGroup.add(shoulderMain);

      // Shoulder pauldron (extra armor)
      const pauldronGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.4, this.MAIN_SIZE * 0.35, this.MAIN_SIZE * 0.3);
      const pauldron = new THREE.Mesh(pauldronGeometry, mechaMaterial);
      pauldron.position.y = this.MAIN_SIZE * 0.1;
      pauldron.rotation.x = -0.2;
      armGroup.add(pauldron);

      // AGGRESSIVE SHOULDER SPIKES - menacing armor
      for (let spike = 0; spike < 3; spike++) {
        const shoulderSpikeGeometry = new THREE.ConeGeometry(this.MAIN_SIZE * 0.06, this.MAIN_SIZE * 0.25, 4);
        const shoulderSpike = new THREE.Mesh(shoulderSpikeGeometry, accentMaterial);
        shoulderSpike.position.set(
          side * this.MAIN_SIZE * 0.15,
          this.MAIN_SIZE * (0.2 - spike * 0.12),
          -this.MAIN_SIZE * 0.15
        );
        shoulderSpike.rotation.z = side * Math.PI * 0.3;
        shoulderSpike.rotation.x = -0.3;
        armGroup.add(shoulderSpike);
      }

      // Shoulder blade spikes
      for (let blade = 0; blade < 4; blade++) {
        const bladeGeometry = new THREE.ConeGeometry(this.MAIN_SIZE * 0.04, this.MAIN_SIZE * 0.18, 3);
        const bladeMesh = new THREE.Mesh(bladeGeometry, mechaMaterial);
        bladeMesh.position.set(
          side * this.MAIN_SIZE * 0.25,
          this.MAIN_SIZE * (0.25 - blade * 0.08),
          this.MAIN_SIZE * 0.05
        );
        bladeMesh.rotation.y = side * Math.PI * 0.15;
        armGroup.add(bladeMesh);
      }

      // Shoulder cannon mount (weaponry)
      if (side === 1) { // Right shoulder only
        const cannonMountGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.15, this.MAIN_SIZE * 0.3, this.MAIN_SIZE * 0.15);
        const cannonMount = new THREE.Mesh(cannonMountGeometry, accentMaterial);
        cannonMount.position.set(side * this.MAIN_SIZE * 0.1, this.MAIN_SIZE * 0.25, 0);
        armGroup.add(cannonMount);

        // Cannon barrel
        const cannonGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.04, this.MAIN_SIZE * 0.06, this.MAIN_SIZE * 0.5, 16);
        const cannon = new THREE.Mesh(cannonGeometry, mechaMaterial);
        cannon.rotation.x = Math.PI / 2;
        cannon.rotation.z = -Math.PI / 4;
        cannon.position.set(side * this.MAIN_SIZE * 0.1, this.MAIN_SIZE * 0.35, this.MAIN_SIZE * 0.3);
        armGroup.add(cannon);
      }

      // Upper arm - thick and segmented
      const upperArmSegments = 3;
      for (let seg = 0; seg < upperArmSegments; seg++) {
        const segmentGeometry = new THREE.CylinderGeometry(
          this.MAIN_SIZE * 0.15,
          this.MAIN_SIZE * 0.14,
          this.MAIN_SIZE * 0.3,
          16
        );
        const segment = new THREE.Mesh(segmentGeometry, mechaMaterial);
        segment.position.y = -this.MAIN_SIZE * (0.35 + seg * 0.28);
        armGroup.add(segment);

        // Joint connector
        if (seg < upperArmSegments - 1) {
          const jointGeometry = new THREE.SphereGeometry(this.MAIN_SIZE * 0.12, 16, 16);
          const joint = new THREE.Mesh(jointGeometry, accentMaterial);
          joint.position.y = -this.MAIN_SIZE * (0.5 + seg * 0.28);
          armGroup.add(joint);
        }
      }

      // Elbow joint - massive and detailed
      const elbowGeometry = new THREE.SphereGeometry(this.MAIN_SIZE * 0.16, 20, 20);
      const elbow = new THREE.Mesh(elbowGeometry, accentMaterial);
      elbow.position.y = -this.MAIN_SIZE * 1.15;
      armGroup.add(elbow);

      // ELBOW SPIKES - aggressive and sharp
      for (let elbowSpike = 0; elbowSpike < 3; elbowSpike++) {
        const elbowSpikeGeometry = new THREE.ConeGeometry(this.MAIN_SIZE * 0.05, this.MAIN_SIZE * 0.2, 4);
        const elbowSpikeMesh = new THREE.Mesh(elbowSpikeGeometry, accentMaterial);
        const angle = (elbowSpike / 3) * Math.PI * 2;
        elbowSpikeMesh.position.set(
          Math.cos(angle) * this.MAIN_SIZE * 0.12,
          -this.MAIN_SIZE * 1.15,
          Math.sin(angle) * this.MAIN_SIZE * 0.12 - this.MAIN_SIZE * 0.08
        );
        elbowSpikeMesh.rotation.x = Math.PI * 0.5;
        elbowSpikeMesh.rotation.z = angle;
        armGroup.add(elbowSpikeMesh);
      }

      // Hydraulic pistons for elbow
      for (let piston = 0; piston < 2; piston++) {
        const pistonGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.03, this.MAIN_SIZE * 0.03, this.MAIN_SIZE * 0.35, 8);
        const pistonMesh = new THREE.Mesh(pistonGeometry, new THREE.MeshStandardMaterial({
          color: piston === 0 ? 0x8B0000 : 0x4B0082, // Dark red and purple
          metalness: 0.95,
          roughness: 0.15,
        }));
        pistonMesh.position.set(
          side * this.MAIN_SIZE * 0.05 * (piston === 0 ? 1 : -1),
          -this.MAIN_SIZE * 0.95,
          this.MAIN_SIZE * 0.1
        );
        pistonMesh.rotation.z = side * (piston === 0 ? 0.3 : -0.3);
        armGroup.add(pistonMesh);
      }

      // Lower arm/forearm - armored and powerful
      const forearmSegments = 2;
      for (let seg = 0; seg < forearmSegments; seg++) {
        const forearmGeometry = new THREE.CylinderGeometry(
          this.MAIN_SIZE * 0.13,
          this.MAIN_SIZE * 0.11,
          this.MAIN_SIZE * 0.4,
          16
        );
        const forearm = new THREE.Mesh(forearmGeometry, mechaMaterial);
        forearm.position.y = -this.MAIN_SIZE * (1.35 + seg * 0.38);
        armGroup.add(forearm);

        // Forearm armor plates
        const armorPlateGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.18, this.MAIN_SIZE * 0.35, this.MAIN_SIZE * 0.08);
        const armorPlate = new THREE.Mesh(armorPlateGeometry, accentMaterial);
        armorPlate.position.set(0, -this.MAIN_SIZE * (1.35 + seg * 0.38), this.MAIN_SIZE * 0.08);
        armGroup.add(armorPlate);

        // FOREARM BLADE SPIKES - aggressive edge
        for (let bladeSeg = 0; bladeSeg < 2; bladeSeg++) {
          const forearmBladeGeometry = new THREE.ConeGeometry(this.MAIN_SIZE * 0.03, this.MAIN_SIZE * 0.12, 3);
          const forearmBlade = new THREE.Mesh(forearmBladeGeometry, mechaMaterial);
          forearmBlade.position.set(
            0,
            -this.MAIN_SIZE * (1.28 + seg * 0.38 + bladeSeg * 0.15),
            this.MAIN_SIZE * 0.14
          );
          forearmBlade.rotation.x = -Math.PI * 0.3;
          armGroup.add(forearmBlade);
        }
      }

      // Wrist joint
      const wristGeometry = new THREE.SphereGeometry(this.MAIN_SIZE * 0.12, 16, 16);
      const wrist = new THREE.Mesh(wristGeometry, accentMaterial);
      wrist.position.y = -this.MAIN_SIZE * 1.95;
      armGroup.add(wrist);

      // Hand/Fist - MASSIVE and MENACING
      const handMainGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.24, this.MAIN_SIZE * 0.32, this.MAIN_SIZE * 0.24);
      const handMain = new THREE.Mesh(handMainGeometry, mechaMaterial);
      handMain.position.y = -this.MAIN_SIZE * 2.2;
      armGroup.add(handMain);

      // Knuckle guards - spiked and aggressive
      const knuckleGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.26, this.MAIN_SIZE * 0.12, this.MAIN_SIZE * 0.26);
      const knuckles = new THREE.Mesh(knuckleGeometry, accentMaterial);
      knuckles.position.y = -this.MAIN_SIZE * 2.05;
      knuckles.position.z = this.MAIN_SIZE * 0.05;
      armGroup.add(knuckles);

      // Knuckle spikes - one per finger
      for (let spike = 0; spike < 4; spike++) {
        const knuckleSpikeGeometry = new THREE.ConeGeometry(this.MAIN_SIZE * 0.03, this.MAIN_SIZE * 0.1, 4);
        const knuckleSpike = new THREE.Mesh(knuckleSpikeGeometry, accentMaterial);
        knuckleSpike.position.set(
          this.MAIN_SIZE * (-0.08 + spike * 0.055),
          -this.MAIN_SIZE * 2.0,
          this.MAIN_SIZE * 0.13
        );
        knuckleSpike.rotation.x = -Math.PI * 0.4;
        armGroup.add(knuckleSpike);
      }

      // Fingers - claw-like with multiple segments
      for (let finger = 0; finger < 4; finger++) {
        // First finger segment (thicker)
        const finger1Geometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.045, this.MAIN_SIZE * 0.12, this.MAIN_SIZE * 0.045);
        const finger1 = new THREE.Mesh(finger1Geometry, mechaMaterial);
        finger1.position.set(
          this.MAIN_SIZE * (-0.08 + finger * 0.055),
          -this.MAIN_SIZE * 2.35,
          this.MAIN_SIZE * 0.1
        );
        finger1.rotation.x = 0.4;
        armGroup.add(finger1);

        // Second finger segment (thinner)
        const finger2Geometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.04, this.MAIN_SIZE * 0.1, this.MAIN_SIZE * 0.04);
        const finger2 = new THREE.Mesh(finger2Geometry, mechaMaterial);
        finger2.position.set(
          this.MAIN_SIZE * (-0.08 + finger * 0.055),
          -this.MAIN_SIZE * 2.45,
          this.MAIN_SIZE * 0.15
        );
        finger2.rotation.x = 0.5;
        armGroup.add(finger2);

        // SHARP TALON - menacing claw tip
        const talonGeometry = new THREE.ConeGeometry(this.MAIN_SIZE * 0.025, this.MAIN_SIZE * 0.12, 4);
        const talon = new THREE.Mesh(talonGeometry, accentMaterial);
        talon.position.set(
          this.MAIN_SIZE * (-0.08 + finger * 0.055),
          -this.MAIN_SIZE * 2.54,
          this.MAIN_SIZE * 0.2
        );
        talon.rotation.x = Math.PI * 0.4; // Point forward menacingly
        armGroup.add(talon);
      }

      // Thumb claw - larger and more aggressive
      const thumbMainGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.06, this.MAIN_SIZE * 0.15, this.MAIN_SIZE * 0.06);
      const thumbMain = new THREE.Mesh(thumbMainGeometry, mechaMaterial);
      thumbMain.position.set(
        side * this.MAIN_SIZE * 0.13,
        -this.MAIN_SIZE * 2.3,
        this.MAIN_SIZE * 0.05
      );
      thumbMain.rotation.z = side * 0.5;
      thumbMain.rotation.x = 0.3;
      armGroup.add(thumbMain);

      // Thumb talon
      const thumbTalonGeometry = new THREE.ConeGeometry(this.MAIN_SIZE * 0.035, this.MAIN_SIZE * 0.15, 4);
      const thumbTalon = new THREE.Mesh(thumbTalonGeometry, accentMaterial);
      thumbTalon.position.set(
        side * this.MAIN_SIZE * 0.15,
        -this.MAIN_SIZE * 2.42,
        this.MAIN_SIZE * 0.12
      );
      thumbTalon.rotation.z = side * 0.5;
      thumbTalon.rotation.x = Math.PI * 0.4;
      armGroup.add(thumbTalon);

      armGroup.position.set(side * this.MAIN_SIZE * 0.55, this.MAIN_SIZE * 0.7, 0);
      this.mainMegabot.add(armGroup);
      this.megabotParts.push({
        mesh: armGroup,
        type: 'arm',
        side: side,
        rotationSpeed: 0.0005
      });
    }

    // ==================== LEGS - MASSIVE SUPPORT STRUCTURES ====================
    for (let side = -1; side <= 1; side += 2) {
      const legGroup = new THREE.Group();

      // Hip armor - heavy duty
      const hipMainGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.35, this.MAIN_SIZE * 0.4, this.MAIN_SIZE * 0.4);
      const hipMain = new THREE.Mesh(hipMainGeometry, accentMaterial);
      legGroup.add(hipMain);

      // Hip side armor plates
      const hipPlateGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.3, this.MAIN_SIZE * 0.25, this.MAIN_SIZE * 0.1);
      const hipPlate = new THREE.Mesh(hipPlateGeometry, mechaMaterial);
      hipPlate.position.set(side * this.MAIN_SIZE * 0.15, -this.MAIN_SIZE * 0.1, 0);
      hipPlate.rotation.y = side * 0.2;
      legGroup.add(hipPlate);

      // Upper leg/thigh - thick and segmented
      const thighSegments = 3;
      for (let seg = 0; seg < thighSegments; seg++) {
        const thighGeometry = new THREE.CylinderGeometry(
          this.MAIN_SIZE * 0.18,
          this.MAIN_SIZE * 0.17,
          this.MAIN_SIZE * 0.35,
          16
        );
        const thigh = new THREE.Mesh(thighGeometry, mechaMaterial);
        thigh.position.y = -this.MAIN_SIZE * (0.35 + seg * 0.33);
        legGroup.add(thigh);

        // Thigh armor panels
        const thighArmorGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.22, this.MAIN_SIZE * 0.3, this.MAIN_SIZE * 0.1);
        const thighArmor = new THREE.Mesh(thighArmorGeometry, accentMaterial);
        thighArmor.position.set(0, -this.MAIN_SIZE * (0.35 + seg * 0.33), this.MAIN_SIZE * 0.12);
        legGroup.add(thighArmor);
      }

      // Hydraulic systems for thigh
      for (let hyd = 0; hyd < 3; hyd++) {
        const hydraulicGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.025, this.MAIN_SIZE * 0.025, this.MAIN_SIZE * 0.4, 8);
        const hydraulic = new THREE.Mesh(hydraulicGeometry, new THREE.MeshStandardMaterial({
          color: hyd % 2 === 0 ? 0x8B0000 : 0x4B0082, // Alternating dark red and purple
          metalness: 0.95,
          roughness: 0.15,
        }));
        const angle = (hyd / 3) * Math.PI * 2;
        hydraulic.position.set(
          Math.cos(angle) * this.MAIN_SIZE * 0.14,
          -this.MAIN_SIZE * 0.6,
          Math.sin(angle) * this.MAIN_SIZE * 0.14
        );
        hydraulic.rotation.z = angle;
        legGroup.add(hydraulic);
      }

      // Knee - MASSIVE joint
      const kneeGeometry = new THREE.SphereGeometry(this.MAIN_SIZE * 0.2, 24, 24);
      const knee = new THREE.Mesh(kneeGeometry, accentMaterial);
      knee.position.y = -this.MAIN_SIZE * 1.25;
      legGroup.add(knee);

      // Knee guard armor - aggressive
      const kneeGuardGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.25, this.MAIN_SIZE * 0.2, this.MAIN_SIZE * 0.15);
      const kneeGuard = new THREE.Mesh(kneeGuardGeometry, mechaMaterial);
      kneeGuard.position.y = -this.MAIN_SIZE * 1.25;
      kneeGuard.position.z = this.MAIN_SIZE * 0.15;
      legGroup.add(kneeGuard);

      // KNEE SPIKE - menacing forward blade
      const kneeSpikeGeometry = new THREE.ConeGeometry(this.MAIN_SIZE * 0.08, this.MAIN_SIZE * 0.3, 4);
      const kneeSpike = new THREE.Mesh(kneeSpikeGeometry, accentMaterial);
      kneeSpike.position.y = -this.MAIN_SIZE * 1.25;
      kneeSpike.position.z = this.MAIN_SIZE * 0.25;
      kneeSpike.rotation.x = -Math.PI * 0.4;
      legGroup.add(kneeSpike);

      // Knee hydraulics
      for (let piston = 0; piston < 2; piston++) {
        const kneePistonGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.04, this.MAIN_SIZE * 0.04, this.MAIN_SIZE * 0.3, 8);
        const kneePiston = new THREE.Mesh(kneePistonGeometry, new THREE.MeshStandardMaterial({
          color: piston === 0 ? 0x8B0000 : 0x4B0082, // Dark red and purple
          metalness: 0.95,
          roughness: 0.15,
        }));
        kneePiston.position.set(
          side * this.MAIN_SIZE * 0.08 * (piston === 0 ? 1 : -1),
          -this.MAIN_SIZE * 1.1,
          -this.MAIN_SIZE * 0.08
        );
        kneePiston.rotation.x = 0.5;
        legGroup.add(kneePiston);
      }

      // Lower leg/shin - reinforced
      const shinSegments = 2;
      for (let seg = 0; seg < shinSegments; seg++) {
        const shinGeometry = new THREE.CylinderGeometry(
          this.MAIN_SIZE * 0.16,
          this.MAIN_SIZE * 0.18,
          this.MAIN_SIZE * 0.45,
          16
        );
        const shin = new THREE.Mesh(shinGeometry, mechaMaterial);
        shin.position.y = -this.MAIN_SIZE * (1.5 + seg * 0.43);
        legGroup.add(shin);

        // Shin armor plates
        const shinArmorGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.24, this.MAIN_SIZE * 0.4, this.MAIN_SIZE * 0.12);
        const shinArmor = new THREE.Mesh(shinArmorGeometry, accentMaterial);
        shinArmor.position.set(0, -this.MAIN_SIZE * (1.5 + seg * 0.43), this.MAIN_SIZE * 0.14);
        legGroup.add(shinArmor);

        // SHIN BLADE SPIKES - aggressive frontal armor
        for (let shinBlade = 0; shinBlade < 3; shinBlade++) {
          const shinBladeGeometry = new THREE.ConeGeometry(this.MAIN_SIZE * 0.035, this.MAIN_SIZE * 0.15, 3);
          const shinBladeMesh = new THREE.Mesh(shinBladeGeometry, mechaMaterial);
          shinBladeMesh.position.set(
            0,
            -this.MAIN_SIZE * (1.42 + seg * 0.43 + shinBlade * 0.12),
            this.MAIN_SIZE * 0.2
          );
          shinBladeMesh.rotation.x = -Math.PI * 0.35;
          legGroup.add(shinBladeMesh);
        }
      }

      // Ankle joint
      const ankleGeometry = new THREE.SphereGeometry(this.MAIN_SIZE * 0.15, 16, 16);
      const ankle = new THREE.Mesh(ankleGeometry, accentMaterial);
      ankle.position.y = -this.MAIN_SIZE * 2.15;
      legGroup.add(ankle);

      // Foot - MASSIVE and stable
      const footMainGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.28, this.MAIN_SIZE * 0.2, this.MAIN_SIZE * 0.5);
      const footMain = new THREE.Mesh(footMainGeometry, accentMaterial);
      footMain.position.y = -this.MAIN_SIZE * 2.35;
      footMain.position.z = this.MAIN_SIZE * 0.08;
      legGroup.add(footMain);

      // Foot armor top plate
      const footTopGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.3, this.MAIN_SIZE * 0.08, this.MAIN_SIZE * 0.52);
      const footTop = new THREE.Mesh(footTopGeometry, mechaMaterial);
      footTop.position.y = -this.MAIN_SIZE * 2.2;
      footTop.position.z = this.MAIN_SIZE * 0.08;
      legGroup.add(footTop);

      // Toe guards
      const toeGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.3, this.MAIN_SIZE * 0.15, this.MAIN_SIZE * 0.12);
      const toe = new THREE.Mesh(toeGeometry, mechaMaterial);
      toe.position.y = -this.MAIN_SIZE * 2.35;
      toe.position.z = this.MAIN_SIZE * 0.28;
      toe.rotation.x = 0.15;
      legGroup.add(toe);

      // Thruster array (for mobility)
      for (let thruster = 0; thruster < 3; thruster++) {
        const thrusterGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.06, this.MAIN_SIZE * 0.08, this.MAIN_SIZE * 0.25, 12);
        const thrusterMaterial = new THREE.MeshStandardMaterial({
          color: thruster % 2 === 0 ? 0x8B0000 : 0x4B0082, // Alternating dark red and purple
          metalness: 0.95,
          roughness: 0.1,
          emissive: new THREE.Color(thruster % 2 === 0 ? 0.3 : 0.2, 0.0, thruster % 2 === 0 ? 0.0 : 0.3),
          emissiveIntensity: 0.5,
        });
        const thrusterMesh = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
        thrusterMesh.position.set(
          (thruster - 1) * this.MAIN_SIZE * 0.08,
          -this.MAIN_SIZE * 2.15,
          -this.MAIN_SIZE * 0.2
        );
        thrusterMesh.rotation.x = -0.3;
        legGroup.add(thrusterMesh);
      }

      legGroup.position.set(side * this.MAIN_SIZE * 0.25, -this.MAIN_SIZE * 0.25, 0);
      this.mainMegabot.add(legGroup);
      this.megabotParts.push({
        mesh: legGroup,
        type: 'leg',
        side: side
      });
    }

    // ==================== HOLOGRAPHIC SCANNING EFFECT ====================
    // Scanning rings that travel up and down the mecha
    for (let i = 0; i < 3; i++) {
      const scanRingGeometry = new THREE.RingGeometry(
        this.MAIN_SIZE * 1.2,
        this.MAIN_SIZE * 1.3,
        64
      );
      const scanRingMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          scanColor: { value: new THREE.Color(0.3, 0.7, 1.0) },
          scanSpeed: { value: 0.5 + i * 0.3 },
          offset: { value: i * 2.0 },
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
          uniform vec3 scanColor;
          uniform float scanSpeed;
          uniform float offset;
          varying vec2 vUv;
          varying vec3 vPosition;

          void main() {
            // Radial distance from center
            float dist = length(vUv - vec2(0.5));

            // Pulsing effect
            float pulse = sin(time * scanSpeed * 3.0 + offset) * 0.5 + 0.5;

            // Scanline pattern
            float scanlines = sin(dist * 50.0 + time * 2.0) * 0.5 + 0.5;

            // Fade at edges
            float fade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);

            vec3 color = scanColor * (pulse * 0.5 + 0.5);
            float alpha = fade * scanlines * pulse * 0.4;

            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const scanRing = new THREE.Mesh(scanRingGeometry, scanRingMaterial);
      scanRing.rotation.x = -Math.PI / 2;
      this.mainMegabot.add(scanRing);
      this.megabotParts.push({
        mesh: scanRing,
        type: 'scanRing',
        baseY: -this.MAIN_SIZE * 1.5,
        scanSpeed: 0.5 + i * 0.2,
        offset: i * Math.PI * 0.66
      });
    }

    // Add ambient lighting
    const ambientLight = new THREE.AmbientLight(0x404060, 1);
    this.scene.add(ambientLight);

    // Dramatic key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(500, 500, 500);
    this.scene.add(keyLight);

    // Back rim light
    const rimLight = new THREE.DirectionalLight(0x4a90e2, 0.8);
    rimLight.position.set(-300, 200, -300);
    this.scene.add(rimLight);

    this.scene.add(this.mainMegabot);
    console.log("🤖 Gundam-style Megabot created with evil laser eyes!");
  }

  createSatellites() {
    const THREE = window.THREE;
    const count = this.settings.satelliteCount;

    for (let i = 0; i < count; i++) {
      const satellite = new THREE.Group();
      const size = this.MAIN_SIZE * 0.2;

      // Satellite core
      const coreGeometry = new THREE.OctahedronGeometry(size);
      const coreMaterial = new THREE.MeshStandardMaterial({
        color: 0x2e2e4e,
        metalness: 0.8,
        roughness: 0.3,
        emissive: new THREE.Color(0.3, 0.5, 0.9),
        emissiveIntensity: 0.6,
      });

      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      satellite.add(core);

      // Satellite energy rings
      for (let j = 0; j < 2; j++) {
        const ringGeometry = new THREE.TorusGeometry(size * 1.2, size * 0.05, 8, 32);
        const ringMaterial = new THREE.MeshStandardMaterial({
          color: 0x4a90e2,
          metalness: 1.0,
          roughness: 0.1,
          emissive: new THREE.Color(0.2, 0.4, 0.8),
          emissiveIntensity: 1.0,
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = j === 0 ? 0 : Math.PI / 2;
        satellite.add(ring);
      }

      // Position satellites in orbit
      const angle = (i / count) * Math.PI * 2;
      const orbitRadius = this.MAIN_SIZE * 3;
      const yOffset = (Math.random() - 0.5) * this.MAIN_SIZE * 2;

      satellite.position.set(
        Math.cos(angle) * orbitRadius,
        yOffset,
        Math.sin(angle) * orbitRadius
      );

      this.satellites.push({
        group: satellite,
        orbitAngle: angle,
        orbitRadius: orbitRadius,
        orbitSpeed: 0.0008 + Math.random() * 0.001, // 2.5x faster orbit speed for EVIL menacing movement
        yOffset: yOffset,
        rotationSpeed: 0.025 + Math.random() * 0.025, // 2.5x faster rotation for aggressive appearance
      });

      this.scene.add(satellite);
    }
  }

  createEnergyParticles() {
    const THREE = window.THREE;
    const particleCount = this.settings.particleCount;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities: Float32Array[] = [];

    for (let i = 0; i < particleCount; i++) {
      // Start particles around the main Megabot
      const radius = this.MAIN_SIZE * (1 + Math.random() * 3);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Energy colors (blue to cyan)
      const hue = 0.5 + Math.random() * 0.2;
      const color = new THREE.Color().setHSL(hue, 1, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 2 + Math.random() * 3;

      // Random velocities
      velocities.push(new Float32Array([
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
      ]));
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Distance-based sizing
          float dist = length(mvPosition.xyz);
          gl_PointSize = size * (800.0 / max(dist, 1.0));

          // Fade based on distance from center
          float distFromCenter = length(position);
          vAlpha = 1.0 - smoothstep(400.0, 800.0, distFromCenter);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float glow = 1.0 - (dist * 2.0);
          glow = pow(glow, 2.0);

          gl_FragColor = vec4(vColor, vAlpha * glow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(geometry, material);
    this.energyParticles.push({
      system: particleSystem,
      velocities: velocities,
    });

    this.scene.add(particleSystem);
  }

  // Create 3D ship geometry
  create3DShipGeometry(type: 'fighter' | 'bomber' | 'interceptor') {
    const THREE = window.THREE;
    const group = new THREE.Group();

    let size, health, color;
    switch (type) {
      case 'fighter':
        size = 20;
        health = 1;
        color = 0xff4444;
        break;
      case 'bomber':
        size = 35;
        health = 3;
        color = 0xff8800;
        break;
      case 'interceptor':
        size = 25;
        health = 2;
        color = 0xffff00;
        break;
    }

    // Ship body (elongated tetrahedron for aggressive look)
    const bodyGeometry = new THREE.ConeGeometry(size * 0.6, size * 1.5, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.8,
      roughness: 0.2,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2; // Point forward
    group.add(body);

    // Wings
    const wingGeometry = new THREE.BoxGeometry(size * 1.2, size * 0.1, size * 0.4);
    const wing = new THREE.Mesh(wingGeometry, bodyMaterial);
    wing.position.z = -size * 0.3;
    group.add(wing);

    // Engine glow
    const engineGeometry = new THREE.SphereGeometry(size * 0.15, 8, 8);
    const engineMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
    });
    const leftEngine = new THREE.Mesh(engineGeometry, engineMaterial);
    leftEngine.position.set(-size * 0.4, 0, -size * 0.5);
    group.add(leftEngine);

    const rightEngine = new THREE.Mesh(engineGeometry, engineMaterial);
    rightEngine.position.set(size * 0.4, 0, -size * 0.5);
    group.add(rightEngine);

    // Add point light for ship glow
    const shipLight = new THREE.PointLight(color, 2, size * 3);
    shipLight.position.set(0, 0, 0);
    group.add(shipLight);

    return { group, size, health, maxHealth: health, type, hitFlash: 0 };
  }

  // Spawn enemy ship from random direction
  spawn3DShip() {
    const THREE = window.THREE;

    if (this.enemyShips.length >= this.MAX_SHIPS_3D) return;

    // Random ship type
    const types: Array<'fighter' | 'bomber' | 'interceptor'> = ['fighter', 'bomber', 'interceptor'];
    const type = types[Math.floor(Math.random() * types.length)];

    const ship = this.create3DShipGeometry(type);

    // Spawn in spherical coordinates around megabot
    const theta = Math.random() * Math.PI * 2; // Azimuthal angle
    const phi = Math.random() * Math.PI; // Polar angle (full sphere)

    const spawnX = this.SHIP_SPAWN_RADIUS * Math.sin(phi) * Math.cos(theta);
    const spawnY = this.SHIP_SPAWN_RADIUS * Math.sin(phi) * Math.sin(theta);
    const spawnZ = this.SHIP_SPAWN_RADIUS * Math.cos(phi);

    ship.group.position.set(spawnX, spawnY, spawnZ);

    // Calculate velocity toward megabot (at origin)
    const dirX = -spawnX;
    const dirY = -spawnY;
    const dirZ = -spawnZ;
    const distance = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
    const speed = this.SHIP_SPEED_MIN + Math.random() * (this.SHIP_SPEED_MAX - this.SHIP_SPEED_MIN);

    const velocity = new THREE.Vector3(
      (dirX / distance) * speed,
      (dirY / distance) * speed,
      (dirZ / distance) * speed
    );

    // Point ship in direction of travel
    ship.group.lookAt(0, 0, 0);

    this.enemyShips.push({
      ...ship,
      velocity,
      active: true,
    });

    this.scene.add(ship.group);
  }

  // Create 3D missile
  create3DMissile(startPos: any, targetPos: any) {
    const THREE = window.THREE;

    if (this.missiles3D.length >= this.MAX_MISSILES_3D) return;

    const group = new THREE.Group();

    // Missile body (cylinder)
    const bodyGeometry = new THREE.CylinderGeometry(3, 3, 15, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a90e2,
      metalness: 0.9,
      roughness: 0.1,
      emissive: new THREE.Color(0x4a90e2),
      emissiveIntensity: 0.5,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    group.add(body);

    // Missile nose cone
    const noseGeometry = new THREE.ConeGeometry(3, 8, 8);
    const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 7.5 + 4;
    group.add(nose);

    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(8, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    // Point light
    const missileLight = new THREE.PointLight(0x4a90e2, 3, 100);
    group.add(missileLight);

    group.position.copy(startPos);

    // Calculate velocity
    const direction = new THREE.Vector3().subVectors(targetPos, startPos).normalize();
    const velocity = direction.multiplyScalar(this.MISSILE_SPEED_3D);

    // Point missile toward target
    group.lookAt(targetPos);

    const missile = {
      group,
      velocity,
      lifetime: 0,
      maxLifetime: 3,
      active: true,
      startPos: startPos.clone(),
      trail: [] as any[],
    };

    this.missiles3D.push(missile);
    this.scene.add(group);

    return missile;
  }

  // Launch missile from megabot toward target
  launch3DMissileFromMegabot(targetScreenPos: { x: number; y: number }) {
    if (!this.mainMegabot) return;

    const THREE = window.THREE;

    // Get megabot shoulder position (launch point)
    const launchOffset = new THREE.Vector3(0, this.MAIN_SIZE * 0.7, this.MAIN_SIZE * 0.2);
    launchOffset.applyQuaternion(this.mainMegabot.quaternion);
    const launchPos = new THREE.Vector3().addVectors(this.mainMegabot.position, launchOffset);

    // Convert screen position to 3D world position
    const vector = new THREE.Vector3(
      (targetScreenPos.x / this.container.offsetWidth) * 2 - 1,
      -(targetScreenPos.y / this.container.offsetHeight) * 2 + 1,
      0.5
    );

    vector.unproject(this.camera);
    const dir = vector.sub(this.camera.position).normalize();
    const distance = 2000;
    const targetPos = this.camera.position.clone().add(dir.multiplyScalar(distance));

    this.create3DMissile(launchPos, targetPos);
  }

  // 3D collision detection (sphere-sphere)
  check3DCollision(pos1: any, radius1: number, pos2: any, radius2: number): boolean {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    const distSquared = dx * dx + dy * dy + dz * dz;
    const radiusSum = radius1 + radius2;
    return distSquared < radiusSum * radiusSum;
  }

  // Create 3D explosion effect
  create3DExplosion(position: any, size: number) {
    const THREE = window.THREE;

    if (this.explosions3D.length >= this.MAX_EXPLOSIONS_3D) return;

    // Create expanding sphere with particles
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: any[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      // Random outward velocity
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * size * 2,
        (Math.random() - 0.5) * size * 2,
        (Math.random() - 0.5) * size * 2
      );
      velocities.push(vel);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xff6600,
      size: size * 0.5,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    // Add bright flash
    const flashLight = new THREE.PointLight(0xff6600, 20, size * 5);
    flashLight.position.copy(position);
    this.scene.add(flashLight);

    this.explosions3D.push({
      particles,
      velocities,
      light: flashLight,
      lifetime: 0,
      maxLifetime: 0.5,
      active: true,
      size,
    });
  }

  // Update 3D combat system
  update3DCombat(deltaTime: number) {
    const THREE = window.THREE;
    const dt = deltaTime;

    // Spawn ships periodically
    const currentTime = this.time * 1000;
    if (currentTime - this.lastShipSpawnTime > this.SHIP_SPAWN_INTERVAL) {
      this.spawn3DShip();
      this.lastShipSpawnTime = currentTime;
    }

    // Update enemy ships
    for (let i = this.enemyShips.length - 1; i >= 0; i--) {
      const ship = this.enemyShips[i];
      if (!ship.active) continue;

      // Update position
      ship.group.position.x += ship.velocity.x * dt;
      ship.group.position.y += ship.velocity.y * dt;
      ship.group.position.z += ship.velocity.z * dt;

      // Rotate ship slightly for visual effect
      ship.group.rotation.z += dt * 2;

      // Fade hit flash
      if (ship.hitFlash > 0) {
        ship.hitFlash -= dt * 3;
        if (ship.hitFlash < 0) ship.hitFlash = 0;

        // Apply flash to material
        const material = ship.group.children[0].material as any;
        if (material && ship.hitFlash > 0) {
          material.emissiveIntensity = 0.3 + ship.hitFlash * 0.7;
        }
      }

      // Check collision with megabot
      const distToMegabot = ship.group.position.length();
      if (distToMegabot < this.MAIN_SIZE + ship.size) {
        // Hit megabot
        this.megabotHealth = Math.max(0, this.megabotHealth - 10);
        this.create3DExplosion(ship.group.position, ship.size * 2);
        this.scene.remove(ship.group);
        this.enemyShips.splice(i, 1);
        continue;
      }

      // Check collision with lasers (ray-sphere intersection)
      if (this.leftLaser && this.rightLaser && this.leftLaser.visible) {
        const leftEyePos = new THREE.Vector3();
        this.leftEye.getWorldPosition(leftEyePos);

        // Simple sphere check (approximate - within laser cone)
        const distToLeftEye = new THREE.Vector3().subVectors(ship.group.position, leftEyePos).length();
        if (distToLeftEye < 500) { // Within laser range
          // Check if ship is roughly in laser direction
          const laserDir = new THREE.Vector3(0, 1, 0);
          laserDir.applyQuaternion(this.leftLaser.getWorldQuaternion(new THREE.Quaternion()));
          const toShip = new THREE.Vector3().subVectors(ship.group.position, leftEyePos).normalize();
          const angle = laserDir.dot(toShip);

          if (angle > 0.95) { // Within ~18 degree cone
            ship.health -= 5 * dt;
            ship.hitFlash = 1.0;

            if (ship.health <= 0) {
              this.gameScore += ship.maxHealth * 100;
              this.create3DExplosion(ship.group.position, ship.size * 2);
              this.scene.remove(ship.group);
              this.enemyShips.splice(i, 1);
              continue;
            }
          }
        }

        // Check right laser too
        const rightEyePos = new THREE.Vector3();
        this.rightEye.getWorldPosition(rightEyePos);
        const distToRightEye = new THREE.Vector3().subVectors(ship.group.position, rightEyePos).length();
        if (distToRightEye < 500) {
          const laserDir = new THREE.Vector3(0, 1, 0);
          laserDir.applyQuaternion(this.rightLaser.getWorldQuaternion(new THREE.Quaternion()));
          const toShip = new THREE.Vector3().subVectors(ship.group.position, rightEyePos).normalize();
          const angle = laserDir.dot(toShip);

          if (angle > 0.95) {
            ship.health -= 5 * dt;
            ship.hitFlash = 1.0;

            if (ship.health <= 0) {
              this.gameScore += ship.maxHealth * 100;
              this.create3DExplosion(ship.group.position, ship.size * 2);
              this.scene.remove(ship.group);
              this.enemyShips.splice(i, 1);
              continue;
            }
          }
        }
      }

      // Remove if too far
      if (distToMegabot > this.SHIP_SPAWN_RADIUS * 2) {
        this.scene.remove(ship.group);
        this.enemyShips.splice(i, 1);
      }
    }

    // Update missiles
    for (let i = this.missiles3D.length - 1; i >= 0; i--) {
      const missile = this.missiles3D[i];
      if (!missile.active) continue;

      // Update position
      missile.group.position.x += missile.velocity.x * dt;
      missile.group.position.y += missile.velocity.y * dt;
      missile.group.position.z += missile.velocity.z * dt;

      // Update lifetime
      missile.lifetime += dt;
      if (missile.lifetime > missile.maxLifetime) {
        this.scene.remove(missile.group);
        this.missiles3D.splice(i, 1);
        continue;
      }

      // Check collision with ships
      let hitShip = false;
      for (let j = 0; j < this.enemyShips.length; j++) {
        const ship = this.enemyShips[j];
        if (!ship.active) continue;

        if (this.check3DCollision(missile.group.position, 5, ship.group.position, ship.size)) {
          ship.health--;
          ship.hitFlash = 1.0;
          hitShip = true;

          if (ship.health <= 0) {
            this.gameScore += ship.maxHealth * 100;
            this.create3DExplosion(ship.group.position, ship.size * 2);
            this.scene.remove(ship.group);
            this.enemyShips.splice(j, 1);
          } else {
            this.create3DExplosion(missile.group.position, 10);
          }

          this.scene.remove(missile.group);
          this.missiles3D.splice(i, 1);
          break;
        }
      }

      if (hitShip) continue;

      // Remove if out of range
      if (missile.group.position.length() > 3000) {
        this.scene.remove(missile.group);
        this.missiles3D.splice(i, 1);
      }
    }

    // Update explosions
    for (let i = this.explosions3D.length - 1; i >= 0; i--) {
      const explosion = this.explosions3D[i];
      if (!explosion.active) continue;

      explosion.lifetime += dt;

      if (explosion.lifetime >= explosion.maxLifetime) {
        this.scene.remove(explosion.particles);
        this.scene.remove(explosion.light);
        this.explosions3D.splice(i, 1);
        continue;
      }

      // Update particles
      const positions = explosion.particles.geometry.attributes.position.array as Float32Array;
      for (let j = 0; j < explosion.velocities.length; j++) {
        positions[j * 3] += explosion.velocities[j].x * dt;
        positions[j * 3 + 1] += explosion.velocities[j].y * dt;
        positions[j * 3 + 2] += explosion.velocities[j].z * dt;
      }
      explosion.particles.geometry.attributes.position.needsUpdate = true;

      // Fade out
      const progress = explosion.lifetime / explosion.maxLifetime;
      explosion.particles.material.opacity = 1 - progress;
      explosion.light.intensity = 20 * (1 - progress);
    }

    // Update game state callback
    if (this.onGameStateUpdate) {
      this.onGameStateUpdate({
        score: this.gameScore,
        health: this.megabotHealth,
        shipCount: this.enemyShips.filter(s => s.active).length,
        missileCount: this.missiles3D.filter(m => m.active).length,
      });
    }
  }

  addEventListeners() {
    // Mouse movement for parallax
    document.addEventListener("mousemove", (e) => {
      this.mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // Click to launch 3D missiles
    this.container.addEventListener("click", (e) => {
      const rect = this.container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.launch3DMissileFromMegabot({ x, y });
    });

    // Window resize
    window.addEventListener("resize", () => this.onWindowResize(), false);
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
  }

  animate() {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const deltaTime = 0.016;
    this.time += deltaTime;

    // Update 3D combat system
    this.update3DCombat(deltaTime);

    // Smooth camera movement based on mouse
    this.cameraAngle += this.mouse.x * 0.001;
    const targetCameraY = 300 + this.mouse.y * 100;
    this.camera.position.y += (targetCameraY - this.camera.position.y) * 0.05;

    this.camera.position.x = Math.sin(this.cameraAngle) * this.cameraDistance;
    this.camera.position.z = Math.cos(this.cameraAngle) * this.cameraDistance;
    this.camera.lookAt(0, 0, 0);

    // Animate main Megabot
    if (this.mainMegabot) {
      // Body rotation - track target or idle rotation
      if (this.trackingTarget && this.targetPosition3D) {
        // TRACKING MODE: EVIL AI body turns aggressively to face the target!
        const lerpSpeed = 0.14; // FASTER - Evil tech AI moves with terrifying speed

        // Smoothly rotate body toward target
        this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * lerpSpeed;
        this.mainMegabot.rotation.y = this.currentRotation.y;
      } else {
        // IDLE MODE: Slow menacing rotation
        // Smoothly return to neutral rotation when not tracking
        const returnSpeed = 0.05;
        this.currentRotation.y += (0 - this.currentRotation.y) * returnSpeed;
        this.currentRotation.x += (0 - this.currentRotation.x) * returnSpeed;

        // Apply slow idle rotation on top of neutral position
        this.mainMegabot.rotation.y += 0.001;
      }

      // Animate individual parts
      this.megabotParts.forEach((part) => {
        // Animate evil laser eyes - FASTER and MORE INTENSE
        if (part.type === 'leftEye' || part.type === 'rightEye') {
          if (part.mesh.material.uniforms) {
            part.mesh.material.uniforms.time.value = this.time;
            // Intensify the glow periodically - EVIL PULSING (faster and stronger)
            const intensity = 5.0 + Math.sin(this.time * 4.0) * 2.0; // Doubled speed and intensity
            part.mesh.material.uniforms.glowIntensity.value = intensity;
          }
        }

        // Animate laser beams with 3D raytracing
        if (part.type === 'leftLaser' || part.type === 'rightLaser') {
          if (part.mesh.material.uniforms) {
            part.mesh.material.uniforms.time.value = this.time;
            // Pulsing beam intensity - extra intense when tracking
            const baseIntensity = this.trackingTarget ? 3.5 : 2.0;
            const intensity = baseIntensity + Math.sin(this.time * 3.0) * 0.5;
            part.mesh.material.uniforms.intensity.value = intensity;
          }
        }

        // Animate energy reactor
        if (part.type === 'reactor' && part.mesh.material.uniforms) {
          part.mesh.material.uniforms.time.value = this.time;
          // Rotate the reactor
          part.mesh.rotation.z += 0.02;
        }

        // Animate auxiliary reactors
        if (part.type === 'auxReactor' && part.mesh.material.uniforms) {
          part.mesh.material.uniforms.time.value = this.time;
          // Counter-rotate for visual interest
          part.mesh.rotation.z -= 0.015;
        }

        // Head movement (menacing scan or tracking)
        if (part.type === 'head') {
          if (this.trackingTarget && this.targetPosition3D) {
            // TRACKING MODE: ULTRA EVIL Head tilts to aim precisely at target
            const headLerpSpeed = 0.22; // MUCH FASTER - Evil AI precision tracking!

            // Head pitch (X rotation) - vertical tilt
            this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * headLerpSpeed;
            part.mesh.rotation.x = this.currentRotation.x;

            // Head is already pointing forward due to body rotation, so minimal Y adjustment
            part.mesh.rotation.y = 0;

            // Intensify eye glow when tracking - ULTRA EVIL LOCK-ON
            this.megabotParts.forEach((eyePart) => {
              if ((eyePart.type === 'leftEye' || eyePart.type === 'rightEye') && eyePart.mesh.material.uniforms) {
                eyePart.mesh.material.uniforms.glowIntensity.value = 10.0; // ULTRA EVIL MAXIMUM INTENSITY when locked on!
              }
            });
          } else {
            // IDLE MODE: Default menacing scan when not tracking
            // Smoothly lerp back to scanning pattern
            const scanY = Math.sin(this.time * 0.3) * 0.2;
            const scanX = Math.sin(this.time * 0.5) * 0.1;

            const returnSpeed = 0.08;
            this.currentRotation.x += (scanX - this.currentRotation.x) * returnSpeed;
            this.currentRotation.y += (scanY - this.currentRotation.y) * returnSpeed;

            part.mesh.rotation.y = this.currentRotation.y;
            part.mesh.rotation.x = this.currentRotation.x;
          }
        }

        // Torso breathing effect
        if (part.type === 'torso') {
          const breathe = 1.0 + Math.sin(this.time * 1.5) * 0.02;
          part.mesh.scale.set(breathe, 1.0 + Math.sin(this.time * 1.5) * 0.01, breathe);
        }

        // Arms movement (menacing idle animation)
        if (part.type === 'arm') {
          const sway = Math.sin(this.time * 0.8 + part.side) * 0.05;
          part.mesh.rotation.z = part.side * 0.1 + sway;
          part.mesh.rotation.x = Math.sin(this.time * 0.6) * 0.08;
        }

        // Legs subtle stance adjustment
        if (part.type === 'leg') {
          const stance = Math.sin(this.time * 0.7 + part.side) * 0.03;
          part.mesh.rotation.x = stance;
        }

        // Animate holographic scan rings (moving up and down)
        if (part.type === 'scanRing') {
          const travelRange = this.MAIN_SIZE * 3;
          const yPos = part.baseY + Math.sin(this.time * part.scanSpeed + part.offset) * travelRange;
          part.mesh.position.y = yPos;

          // Update shader time
          if (part.mesh.material.uniforms) {
            part.mesh.material.uniforms.time.value = this.time;
          }
        }

        // Animate V-fin
        if (part.type === 'vfin' && part.mesh.material.uniforms) {
          part.mesh.material.uniforms.time.value = this.time;
        }

        // Update shader uniforms for enhanced materials
        if (part.mesh && part.mesh.material) {
          if (part.mesh.material.uniforms && part.mesh.material.uniforms.time) {
            part.mesh.material.uniforms.time.value = this.time;
          }
        }

        // Update children materials (for groups like arms, legs, torso)
        if (part.mesh && part.mesh.children) {
          part.mesh.children.forEach((child: any) => {
            if (child.material && child.material.uniforms && child.material.uniforms.time) {
              child.material.uniforms.time.value = this.time;
            }
          });
        }
      });
    }

    // Animate satellites
    this.satellites.forEach((satellite) => {
      satellite.orbitAngle += satellite.orbitSpeed;

      satellite.group.position.x = Math.cos(satellite.orbitAngle) * satellite.orbitRadius;
      satellite.group.position.z = Math.sin(satellite.orbitAngle) * satellite.orbitRadius;
      satellite.group.position.y = satellite.yOffset + Math.sin(this.time + satellite.orbitAngle) * 30;

      satellite.group.rotation.x += satellite.rotationSpeed;
      satellite.group.rotation.y += satellite.rotationSpeed * 0.7;
    });

    // Animate energy particles
    this.energyParticles.forEach((particleData) => {
      const positions = particleData.system.geometry.attributes.position.array as Float32Array;
      const velocities = particleData.velocities;

      for (let i = 0; i < positions.length / 3; i++) {
        // Apply velocities
        positions[i * 3] += velocities[i][0];
        positions[i * 3 + 1] += velocities[i][1];
        positions[i * 3 + 2] += velocities[i][2];

        // Attraction to center
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        const dist = Math.sqrt(x * x + y * y + z * z);

        if (dist > this.MAIN_SIZE * 0.5) {
          velocities[i][0] -= (x / dist) * 0.01;
          velocities[i][1] -= (y / dist) * 0.01;
          velocities[i][2] -= (z / dist) * 0.01;
        }

        // Orbital motion
        const orbital = 0.005;
        velocities[i][0] += -y * orbital;
        velocities[i][1] += x * orbital;

        // Damping
        velocities[i][0] *= 0.99;
        velocities[i][1] *= 0.99;
        velocities[i][2] *= 0.99;

        // Respawn if too far
        if (dist > 1000) {
          const radius = this.MAIN_SIZE * (1 + Math.random() * 2);
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;

          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[i * 3 + 2] = radius * Math.cos(phi);

          velocities[i][0] = (Math.random() - 0.5) * 0.5;
          velocities[i][1] = (Math.random() - 0.5) * 0.5;
          velocities[i][2] = (Math.random() - 0.5) * 0.5;
        }
      }

      particleData.system.geometry.attributes.position.needsUpdate = true;

      if (particleData.system.material.uniforms) {
        particleData.system.material.uniforms.time.value = this.time;
      }
    });

    // Gentle star field rotation
    if (this.starField) {
      this.starField.rotation.y += 0.0001;
      this.starField.rotation.x += 0.00005;
    }

    // Update border laser scanning animation
    if (this.isScanning) {
      this.scanProgress += deltaTime * 0.5; // Scan speed
      if (this.scanProgress > 1.0) {
        this.scanProgress = 0; // Loop the scan
      }

      // Update shader uniforms for border lasers
      this.borderLasers.forEach(laser => {
        if (laser.material && laser.material.uniforms) {
          laser.material.uniforms.time.value = this.time;
          laser.material.uniforms.scanProgress.value = this.scanProgress;
        }
      });
    }

    // Update blast particles
    if (this.blastParticles.length > 0) {
      this.blastParticles = this.blastParticles.filter(blast => {
        blast.age += deltaTime;

        if (blast.age >= blast.maxAge) {
          // Remove expired blast
          if (this.scene) this.scene.remove(blast.system);
          if (blast.system.geometry) blast.system.geometry.dispose();
          if (blast.system.material) blast.system.material.dispose();
          return false;
        }

        // Update particle positions
        const positions = blast.system.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length / 3; i++) {
          positions[i * 3] += blast.velocities[i * 3];
          positions[i * 3 + 1] += blast.velocities[i * 3 + 1];
          positions[i * 3 + 2] += blast.velocities[i * 3 + 2];

          // Apply gravity
          blast.velocities[i * 3 + 1] -= 0.5;

          // Damping
          blast.velocities[i * 3] *= 0.98;
          blast.velocities[i * 3 + 1] *= 0.98;
          blast.velocities[i * 3 + 2] *= 0.98;
        }
        blast.system.geometry.attributes.position.needsUpdate = true;

        // Fade out
        const fadeProgress = blast.age / blast.maxAge;
        blast.system.material.opacity = 1.0 - fadeProgress;

        return true;
      });

      if (this.blastParticles.length === 0) {
        this.isBlasting = false;
      }
    }

    // Generate and update laser spark particles
    if (this.targetPosition3D && this.trackingTarget) {
      // Spawn sparks periodically when tracking
      this.sparkSpawnTimer += deltaTime;
      if (this.sparkSpawnTimer >= 0.05) { // Spawn every 50ms
        this.createLaserSparks();
        this.sparkSpawnTimer = 0;
      }
    }

    // Update existing spark particles
    if (this.sparkParticles.length > 0) {
      this.sparkParticles = this.sparkParticles.filter(spark => {
        spark.age += deltaTime;

        if (spark.age >= spark.maxAge) {
          // Remove expired sparks
          if (this.scene) this.scene.remove(spark.system);
          if (spark.system.geometry) spark.system.geometry.dispose();
          if (spark.system.material) spark.system.material.dispose();
          return false;
        }

        // Update particle positions
        const positions = spark.system.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length / 3; i++) {
          positions[i * 3] += spark.velocities[i * 3];
          positions[i * 3 + 1] += spark.velocities[i * 3 + 1];
          positions[i * 3 + 2] += spark.velocities[i * 3 + 2];

          // Apply gravity to sparks
          spark.velocities[i * 3 + 1] -= 0.8;

          // Air resistance
          spark.velocities[i * 3] *= 0.95;
          spark.velocities[i * 3 + 1] *= 0.95;
          spark.velocities[i * 3 + 2] *= 0.95;
        }
        spark.system.geometry.attributes.position.needsUpdate = true;

        // Fade out
        const fadeProgress = spark.age / spark.maxAge;
        spark.system.material.opacity = 1.0 - fadeProgress;

        return true;
      });
    }

    // Update laser raycasting to target the button
    if (this.leftLaser && this.rightLaser && this.leftEye && this.rightEye && this.headGroup) {
      const THREE = window.THREE;

      if (this.trackingTarget && this.targetPosition3D) {
        // TRACKING MODE: Aim lasers at button (only if plane intersection succeeded)
        this.leftLaser.visible = true;
        this.rightLaser.visible = true;

        // Get world positions of the eyes
        const leftEyeWorldPos = new THREE.Vector3();
        const rightEyeWorldPos = new THREE.Vector3();
        this.leftEye.getWorldPosition(leftEyeWorldPos);
        this.rightEye.getWorldPosition(rightEyeWorldPos);

        // Calculate direction from each eye to target
        const leftDirection = new THREE.Vector3().subVectors(this.targetPosition3D, leftEyeWorldPos);
        const rightDirection = new THREE.Vector3().subVectors(this.targetPosition3D, rightEyeWorldPos);

        // Calculate distance to target
        const leftDistance = leftDirection.length();
        const rightDistance = rightDirection.length();

        // Normalize directions
        leftDirection.normalize();
        rightDirection.normalize();

        // Update laser scale to match distance (cylinder height is 1, so scale.y = actual distance)
        this.leftLaser.scale.y = leftDistance;
        this.rightLaser.scale.y = rightDistance;

        // Position lasers at eye positions
        this.leftLaser.position.copy(this.leftEye.position);
        this.rightLaser.position.copy(this.rightEye.position);

        // Convert target from world space to head local space for lookAt
        const headWorldPos = new THREE.Vector3();
        const headWorldQuat = new THREE.Quaternion();
        const headWorldScale = new THREE.Vector3();
        this.headGroup.matrixWorld.decompose(headWorldPos, headWorldQuat, headWorldScale);

        const targetLocal = new THREE.Vector3().copy(this.targetPosition3D);
        targetLocal.sub(headWorldPos);
        targetLocal.applyQuaternion(headWorldQuat.clone().invert());

        // Point lasers at target (cylinder's Y axis points along length)
        const upVector = new THREE.Vector3(0, 1, 0);

        // For left laser
        const leftQuaternion = new THREE.Quaternion();
        leftQuaternion.setFromUnitVectors(upVector, leftDirection.clone().applyQuaternion(headWorldQuat.clone().invert()).normalize());
        this.leftLaser.quaternion.copy(leftQuaternion);

        // For right laser
        const rightQuaternion = new THREE.Quaternion();
        rightQuaternion.setFromUnitVectors(upVector, rightDirection.clone().applyQuaternion(headWorldQuat.clone().invert()).normalize());
        this.rightLaser.quaternion.copy(rightQuaternion);

        // Move laser origin to eye center (cylinder's center is at origin, we want base at eye)
        // Offset by half the laser length in the direction it's pointing (local space)
        const leftLocalDirection = leftDirection.clone().applyQuaternion(headWorldQuat.clone().invert()).normalize();
        this.leftLaser.position.add(leftLocalDirection.multiplyScalar(leftDistance / 2));

        const rightLocalDirection = rightDirection.clone().applyQuaternion(headWorldQuat.clone().invert()).normalize();
        this.rightLaser.position.add(rightLocalDirection.multiplyScalar(rightDistance / 2));

      } else {
        // SCANNING MODE: Lasers sweep the area menacingly
        this.leftLaser.visible = true;
        this.rightLaser.visible = true;

        // Position at eyes
        this.leftLaser.position.copy(this.leftEye.position);
        this.rightLaser.position.copy(this.rightEye.position);

        // Scanning pattern - figure-8 sweep
        const scanSpeed = 0.3;
        const scanAngleY = Math.sin(this.time * scanSpeed) * 0.4; // Horizontal sweep
        const scanAngleX = Math.sin(this.time * scanSpeed * 2) * 0.3; // Vertical sweep

        // Left laser scans in a pattern
        const leftScanDirection = new THREE.Vector3(
          Math.sin(scanAngleY - 0.2),
          Math.sin(scanAngleX),
          1
        ).normalize();

        const leftQuaternion = new THREE.Quaternion();
        leftQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), leftScanDirection);
        this.leftLaser.quaternion.copy(leftQuaternion);
        this.leftLaser.scale.y = this.MAIN_SIZE * 3; // Medium range for scanning

        // Right laser scans in opposite pattern
        const rightScanDirection = new THREE.Vector3(
          Math.sin(scanAngleY + 0.2),
          Math.sin(scanAngleX),
          1
        ).normalize();

        const rightQuaternion = new THREE.Quaternion();
        rightQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rightScanDirection);
        this.rightLaser.quaternion.copy(rightQuaternion);
        this.rightLaser.scale.y = this.MAIN_SIZE * 3;

        // Offset position so laser starts at eye
        this.leftLaser.position.add(leftScanDirection.clone().multiplyScalar(this.MAIN_SIZE * 1.5));
        this.rightLaser.position.add(rightScanDirection.clone().multiplyScalar(this.MAIN_SIZE * 1.5));
      }

      // Update laser data for game collision detection
      if (this.onLaserUpdate) {
        const leftEyeWorldPos = new THREE.Vector3();
        const rightEyeWorldPos = new THREE.Vector3();
        this.leftEye.getWorldPosition(leftEyeWorldPos);
        this.rightEye.getWorldPosition(rightEyeWorldPos);

        // Project 3D world positions to 2D screen coordinates
        const project3DToScreen = (pos: any) => {
          const vector = pos.clone().project(this.camera);
          const x = (vector.x * 0.5 + 0.5) * this.container.offsetWidth;
          const y = (-(vector.y * 0.5) + 0.5) * this.container.offsetHeight;
          return { x, y };
        };

        // Calculate laser end points based on current mode
        let leftEndWorldPos, rightEndWorldPos;

        if (this.trackingTarget && this.targetPosition3D) {
          // In tracking mode, endpoint is the target
          leftEndWorldPos = this.targetPosition3D.clone();
          rightEndWorldPos = this.targetPosition3D.clone();
        } else {
          // In scanning mode, calculate endpoint from direction and length
          const headWorldQuat = new THREE.Quaternion();
          this.headGroup.getWorldQuaternion(headWorldQuat);

          const leftLaserWorldQuat = new THREE.Quaternion();
          this.leftLaser.getWorldQuaternion(leftLaserWorldQuat);
          const leftLaserDir = new THREE.Vector3(0, 1, 0).applyQuaternion(leftLaserWorldQuat);
          leftEndWorldPos = leftEyeWorldPos.clone().add(leftLaserDir.multiplyScalar(this.MAIN_SIZE * 3));

          const rightLaserWorldQuat = new THREE.Quaternion();
          this.rightLaser.getWorldQuaternion(rightLaserWorldQuat);
          const rightLaserDir = new THREE.Vector3(0, 1, 0).applyQuaternion(rightLaserWorldQuat);
          rightEndWorldPos = rightEyeWorldPos.clone().add(rightLaserDir.multiplyScalar(this.MAIN_SIZE * 3));
        }

        const leftStart = project3DToScreen(leftEyeWorldPos);
        const leftEnd = project3DToScreen(leftEndWorldPos);
        const rightStart = project3DToScreen(rightEyeWorldPos);
        const rightEnd = project3DToScreen(rightEndWorldPos);

        this.onLaserUpdate({
          leftStart,
          leftEnd,
          rightStart,
          rightEnd,
          visible: this.leftLaser.visible && this.rightLaser.visible
        });
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.container && this.renderer.domElement && this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
      }
    }

    if (this.scene) {
      this.scene.traverse((object: any) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material: any) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }

    if (this.scene) {
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.mainMegabot = null;
    this.megabotParts = [];
    this.satellites = [];
    this.energyParticles = [];
    this.starField = null;

    console.log("✅ Megabot scene destroyed and cleaned up");
  }
}
